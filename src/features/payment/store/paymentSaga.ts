import type {SagaIterator, Task} from 'redux-saga';
import {
  all,
  call,
  cancel,
  delay,
  fork,
  put,
  race,
  select,
  take,
  takeLatest,
} from 'redux-saga/effects';
import {env} from '@/shared/config/env';
import {Biometric} from '@/shared/native';
import {ApiError} from '@/shared/services/http/errors';
import {authApi, getDeviceId, type TransactionChallenge} from '@/features/auth/services';
import {sepayApi} from '../services/sepayApi';
import type {PaymentStatusResponse, SePayOrder} from '../services/types';
import {paymentActions} from './paymentSlice';
import {uiActions} from '@/store/uiSlice';
import type {RootState} from '@/store/rootReducer';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Luồng thanh toán SePay
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   ┌──────────┐  createOrder   ┌─────────┐   webhook SePay   ┌──────────┐
 *   │   App    │ ─────────────► │ Backend │ ◄──────────────── │  SePay   │
 *   └──────────┘                └─────────┘                   └──────────┘
 *        │  hiện QR + nội dung CK                                   ▲
 *        │  poll GET /status  ◄──── backend đọc DB                  │
 *        │                                              người dùng ─┘
 *        │                                              chuyển khoản
 *
 *  Ba điểm quyết định:
 *
 *  1. **Poll backend, không poll SePay.** Nguồn sự thật là webhook đã ghi vào
 *     DB của bạn. Client hỏi thẳng SePay là mở đường cho giả mạo (chặn response
 *     là "thành công") và làm lộ API key.
 *
 *  2. **Poll, không dùng silent push làm đồng hồ.** Push có thể không được giao
 *     (iOS force-quit, Doze trên Android) và bị throttle. Người dùng đang nhìn
 *     màn hình chờ thì poll 3 giây là đúng và rẻ; đóng app thì webhook +
 *     notification lo phần còn lại.
 *
 *  3. **Có timeout.** Poll mãi sẽ đốt pin và giữ màn hình chờ vĩnh viễn. Hết
 *     15 phút (bằng hạn của QR) thì dừng và nói rõ đơn có thể vẫn được ghi nhận
 *     sau — KHÔNG kết luận là thất bại.
 */

const selectCurrentOrderId = (state: RootState): string | undefined => state.payment.order?.orderId;

function idempotencyKey(orderRef: string): string {
  // Cùng orderRef + cùng thiết bị = cùng key ⇒ bấm hai lần chỉ tạo một đơn.
  return `${getDeviceId()}:${orderRef}`;
}

function* createOrderSaga(
  action: ReturnType<typeof paymentActions.createOrderRequested>,
): SagaIterator {
  try {
    const order: SePayOrder = yield call(sepayApi.createOrder, {
      ...action.payload,
      idempotencyKey: idempotencyKey(action.payload.orderRef),
    });

    yield put(paymentActions.createOrderSucceeded(order));

    if (order.status === 'pending') {
      yield put(paymentActions.pollingStarted());
    }
  } catch (error) {
    const apiError = error instanceof ApiError ? error : null;
    yield put(
      paymentActions.createOrderFailed({
        message: apiError?.message ?? String(error),
        i18nKey: apiError?.i18nKey,
      }),
    );
  }
}

/** Vòng lặp hỏi trạng thái. Dừng ngay khi có kết quả cuối. */
function* pollLoop(orderId: string): SagaIterator {
  const deadline = Date.now() + env.sePay.pollTimeoutMs;

  while (Date.now() < deadline) {
    try {
      const result: PaymentStatusResponse = yield call(sepayApi.getStatus, orderId);

      yield put(
        paymentActions.pollTicked({
          status: result.status,
          bankTransactionId: result.bankTransactionId,
          receivedAmount: result.receivedAmount,
        }),
      );

      if (result.status !== 'pending') {
        yield put(paymentActions.pollingStopped());
        if (result.status === 'paid') {
          yield put(
            uiActions.toastShown({kind: 'success', message: '', i18nKey: 'payment.paidTitle'}),
          );
        }
        return;
      }
    } catch (error) {
      // Một lần hỏi lỗi không có nghĩa là thanh toán hỏng — rất có thể chỉ là
      // mạng chớp tắt. Cứ tiếp tục cho tới deadline.
      if (error instanceof ApiError && !error.isRetryable) {
        yield put(paymentActions.pollingStopped());
        return;
      }
    }

    yield delay(env.sePay.pollIntervalMs);
  }

  yield put(paymentActions.pollingTimedOut());
}

/**
 * Chạy pollLoop nhưng huỷ được: người dùng rời màn hình, huỷ đơn, hoặc tạo đơn
 * mới. Không có `cancel` thì vòng lặp cũ vẫn chạy nền và ghi đè trạng thái của
 * đơn mới — bug rất khó lần.
 */
function* watchPolling(): SagaIterator {
  while (true) {
    yield take(paymentActions.pollingStarted.type);

    const orderId: string | undefined = yield select(selectCurrentOrderId);
    if (!orderId) {
      continue;
    }

    const task: Task = yield fork(pollLoop, orderId);

    yield race({
      cancelled: take(paymentActions.cancelOrderRequested.type),
      reset: take(paymentActions.reset.type),
      stopped: take(paymentActions.pollingStopped.type),
      timedOut: take(paymentActions.pollingTimedOut.type),
      restarted: take(paymentActions.createOrderRequested.type),
    });

    if (task.isRunning()) {
      yield cancel(task);
    }
  }
}

function* cancelOrderSaga(): SagaIterator {
  const orderId: string | undefined = yield select(selectCurrentOrderId);
  if (!orderId) {
    return;
  }
  try {
    const order: SePayOrder = yield call(sepayApi.cancelOrder, orderId);
    yield put(paymentActions.createOrderSucceeded(order));
  } catch {
    // Huỷ hỏng thì thôi — đơn sẽ tự hết hạn.
  }
}

// ── Xác nhận giao dịch bằng sinh trắc học (mức 3) ───────────────────────────

/**
 * Ba bước, không được rút gọn:
 *
 *   1. xin challenge từ backend  — challenge PHẢI chứa hash nội dung giao dịch
 *   2. ký bằng khoá trong TEE/Secure Enclave — OS tự hiện prompt vân tay
 *   3. gửi chữ ký lên backend verify bằng public key đã enroll
 *
 * Nếu bỏ bước 1 và tự sinh challenge ở client thì chữ ký chẳng chứng minh được
 * gì: client tự hỏi, tự trả lời.
 */
function* confirmWithBiometricSaga(
  action: ReturnType<typeof paymentActions.confirmWithBiometricRequested>,
): SagaIterator {
  const {txId, summary} = action.payload;
  try {
    const challenge: TransactionChallenge = yield call(authApi.requestChallenge, txId);

    const signed: Awaited<ReturnType<typeof Biometric.signChallenge>> = yield call(
      [Biometric, Biometric.signChallenge],
      challenge.challenge,
      'Xác nhận giao dịch',
      summary,
      'Huỷ',
    );

    yield call(authApi.confirmTransaction, txId, signed.signature);
    yield put(paymentActions.confirmSucceeded());
  } catch (error) {
    const code = (error as {code?: string})?.code;

    if (code === 'E_BIOMETRIC_CANCELLED') {
      yield put(paymentActions.confirmCancelled());
      return;
    }

    // Khoá bị huỷ vì user đổi danh sách sinh trắc học. Đây KHÔNG phải "lỗi hệ
    // thống" — phải đưa người dùng đi enroll lại, kèm xác thực bằng OTP/mật khẩu.
    if (code === 'E_KEY_INVALIDATED') {
      yield put(paymentActions.confirmFailed({message: '', i18nKey: 'biometric.keyInvalidated'}));
      return;
    }

    const apiError = error instanceof ApiError ? error : null;
    yield put(
      paymentActions.confirmFailed({
        message: apiError?.message ?? String(error),
        i18nKey: apiError?.i18nKey,
      }),
    );
  }
}

export function* paymentSaga(): SagaIterator {
  yield all([
    takeLatest(paymentActions.createOrderRequested.type, createOrderSaga),
    takeLatest(paymentActions.cancelOrderRequested.type, cancelOrderSaga),
    takeLatest(paymentActions.confirmWithBiometricRequested.type, confirmWithBiometricSaga),
    fork(watchPolling),
  ]);
}
