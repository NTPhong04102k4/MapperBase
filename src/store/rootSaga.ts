import {all, call, spawn} from 'redux-saga/effects';
import {authSaga} from '@/features/auth/store/authSaga';
import {paymentSaga} from '@/features/payment/store/paymentSaga';
import {permissionSaga} from '@/features/auth/store/permissionSaga';
import {widgetSaga} from '@/features/widget/store/widgetSaga';

const sagas = [authSaga, permissionSaga, paymentSaga, widgetSaga];

/**
 * `spawn` + vòng lặp khởi động lại, thay vì `all([fork(...)])`.
 *
 * Với `fork`, một exception không bắt được trong bất kỳ saga con nào sẽ giết
 * saga cha — và từ đó **toàn bộ** saga của app ngừng chạy, im lặng. App vẫn
 * render bình thường nhưng không nút nào còn tác dụng. Đây là chế độ hỏng tệ
 * nhất có thể vì nó trông không giống crash.
 *
 * `spawn` cô lập từng saga, vòng `while` dựng lại saga đã chết.
 */
export function* rootSaga() {
  yield all(
    sagas.map(saga =>
      spawn(function* restartable() {
        while (true) {
          try {
            yield call(saga);
            break; // saga kết thúc bình thường — không dựng lại
          } catch (error) {
            console.error(`[rootSaga] ${saga.name} chết, đang khởi động lại`, error);
          }
        }
      }),
    ),
  );
}
