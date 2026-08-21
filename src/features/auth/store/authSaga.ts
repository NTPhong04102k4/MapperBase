import type {SagaIterator} from 'redux-saga';
import {all, call, put, select, takeLatest} from 'redux-saga/effects';
import {Biometric, ForgeRock} from '@/shared/native';
import {resetAbility} from '@/shared/permissions';
import {ApiError} from '@/shared/services/http/errors';
import {
  SocialAuthCancelled,
  authApi,
  bootstrapAuth,
  devicePlatform,
  enableBiometricUnlock,
  getDeviceId,
  isBiometricUnlockEnabled,
  performLogout,
  persistSessionProfile,
  restoreCachedPermissions,
  signInWithApple,
  signInWithFacebook,
  signInWithGoogle,
  unlockWithBiometrics,
  type AuthUser,
  type SessionProfile,
  type SocialLoginPayload,
} from '../services';
import {authActions} from './authSlice';
import {permissionActions} from './permissionSlice';
import {uiActions} from '@/store/uiSlice';
import {widgetActions} from '@/features/widget';
import type {RootState} from '@/store/rootReducer';

/**
 * Lỗi → thông báo cho người dùng.
 *
 * Gom một chỗ vì cùng một lỗi có thể đến từ 4 luồng đăng nhập khác nhau; để mỗi
 * luồng tự dịch thì thông báo sẽ không đồng nhất.
 */
function describeError(error: unknown): {message: string; i18nKey?: string} {
  if (error instanceof ApiError) {
    return {message: error.message, i18nKey: error.i18nKey};
  }
  const code = (error as {code?: string})?.code;
  if (code === 'E_KEY_INVALIDATED') {
    return {message: '', i18nKey: 'biometric.keyInvalidated'};
  }
  if (code === 'E_FR_UNSUPPORTED_NODE') {
    return {message: '', i18nKey: 'auth.unsupportedJourneyStep'};
  }
  if (code === 'E_FR_AUTH') {
    return {message: '', i18nKey: 'auth.invalidCredentials'};
  }
  return {
    message: error instanceof Error ? error.message : String(error),
    i18nKey: 'error.unknown',
  };
}

function isCancellation(error: unknown): boolean {
  if (error instanceof SocialAuthCancelled) {
    return true;
  }
  const code = (error as {code?: string})?.code;
  return code === 'E_BIOMETRIC_CANCELLED' || code === 'E_FR_CANCELLED';
}

// ── Khởi động ───────────────────────────────────────────────────────────────

/**
 * Khôi phục phiên lúc mở app.
 *
 * Thứ tự có chủ ý:
 *   1. cấu hình SDK (không có bước này thì mọi lệnh sau đều ném lỗi)
 *   2. nạp quyền từ cache -> UI có nút ngay, không bị "trắng quyền"
 *   3. hỏi SDK còn phiên không
 *   4. nếu bật khoá sinh trắc học -> vào trạng thái `locked`, KHÔNG tự vào Home
 */
function* bootstrapSaga(): SagaIterator {
  try {
    yield call(bootstrapAuth);

    const hadCache: boolean = yield call(restoreCachedPermissions);
    if (hadCache) {
      yield put(permissionActions.restoredFromCache([]));
    }

    const authenticated: boolean = yield call([ForgeRock, ForgeRock.isAuthenticated]);
    if (!authenticated) {
      yield put(authActions.logoutFinished());
      return;
    }

    if (isBiometricUnlockEnabled()) {
      yield put(authActions.biometricPreferenceChanged(true));
      yield put(authActions.sessionLocked());
      return;
    }

    yield call(loadProfileAndPermissions);
  } catch (error) {
    // Khởi động hỏng thì coi như chưa đăng nhập — kẹt ở màn splash tệ hơn nhiều.
    console.warn('[authSaga] bootstrap thất bại', error);
    yield put(authActions.logoutFinished());
  }
}

/** Tải hồ sơ + quyền, rồi chuyển sang `authenticated`. */
function* loadProfileAndPermissions(): SagaIterator {
  const user: AuthUser = yield call(authApi.me);
  yield put(authActions.loginSucceeded({user}));
  yield put(permissionActions.syncRequested());

  const hasKey: boolean = yield call([Biometric, Biometric.hasTransactionKeys]);
  yield put(authActions.transactionKeyEnrolledChanged(hasKey));
}

// ── Đăng nhập ───────────────────────────────────────────────────────────────

function* loginWithCredentialsSaga(
  action: ReturnType<typeof authActions.loginWithCredentialsRequested>,
): SagaIterator {
  try {
    const {username, password} = action.payload;
    yield call([ForgeRock, ForgeRock.loginWithCredentials], username, password);
    yield call(loadProfileAndPermissions);
  } catch (error) {
    if (isCancellation(error)) {
      yield put(authActions.loginCancelled());
      return;
    }
    yield put(authActions.loginFailed(describeError(error)));
  }
}

function* loginWithSocialSaga(
  action: ReturnType<typeof authActions.loginWithSocialRequested>,
): SagaIterator {
  try {
    const {provider} = action.payload;

    // SDK của IdP chỉ cho ta token; backend mới là bên verify chữ ký token đó.
    let payload: SocialLoginPayload;
    switch (provider) {
      case 'google':
        payload = yield call(signInWithGoogle);
        break;
      case 'facebook':
        payload = yield call(signInWithFacebook);
        break;
      case 'apple':
        payload = yield call(signInWithApple);
        break;
    }

    const profile: SessionProfile = yield call(authApi.socialLogin, payload);
    yield call(persistSessionProfile, profile);

    yield put(authActions.loginSucceeded({user: profile.user}));
    yield put(
      permissionActions.syncSucceeded({
        rules: profile.permissions,
        version: profile.permissionVersion,
      }),
    );
  } catch (error) {
    if (isCancellation(error)) {
      yield put(authActions.loginCancelled());
      return;
    }
    yield put(authActions.loginFailed(describeError(error)));
  }
}

function* unlockSaga(): SagaIterator {
  try {
    const secret: string | null = yield call(unlockWithBiometrics, 'Xác thực để mở khoá Mapper');
    if (!secret) {
      yield put(authActions.loginCancelled());
      return;
    }
    yield call(loadProfileAndPermissions);
  } catch (error) {
    yield put(authActions.loginFailed(describeError(error)));
  }
}

// ── Bật sinh trắc học sau khi đã đăng nhập ──────────────────────────────────

function* enableBiometricSaga(): SagaIterator {
  const user: AuthUser | null = yield select((state: RootState) => state.auth.user);
  if (!user) {
    return;
  }

  // Secret chỉ là "vật để OS gác" — giá trị của nó không quan trọng, quan trọng
  // là chỉ lấy ra được khi đã xác thực sinh trắc học.
  const secret = `${user.id}:${getDeviceId()}`;
  const ok: boolean = yield call(enableBiometricUnlock, secret);
  yield put(authActions.biometricPreferenceChanged(ok));

  if (!ok) {
    yield put(
      uiActions.toastShown({kind: 'warning', message: '', i18nKey: 'biometric.notEnrolled'}),
    );
  }
}

/** Enroll khoá mức 3 (ký giao dịch). Khác hoàn toàn với mức 2 ở trên. */
function* enrollTransactionKeySaga(): SagaIterator {
  try {
    const keyInfo: Awaited<ReturnType<typeof Biometric.createTransactionKeys>> = yield call([
      Biometric,
      Biometric.createTransactionKeys,
    ]);

    yield call(authApi.enrollBiometric, {
      publicKey: keyInfo.publicKey,
      algorithm: keyInfo.algorithm,
      format: keyInfo.format,
      deviceId: getDeviceId(),
      platform: devicePlatform,
      strongBoxBacked: keyInfo.strongBoxBacked,
    });

    yield put(authActions.transactionKeyEnrolledChanged(true));
  } catch (error) {
    yield put(authActions.transactionKeyEnrolledChanged(false));
    if (isCancellation(error)) {
      return;
    }
    yield put(uiActions.toastShown({kind: 'error', ...describeError(error)}));
  }
}

// ── Đăng xuất ───────────────────────────────────────────────────────────────

function* logoutSaga(): SagaIterator {
  // `performLogout` xoá snapshot widget TRƯỚC TIÊN — xem session.ts.
  // Saga await nó xong mới dispatch `logoutFinished`, nên UI chỉ điều hướng về
  // Login sau khi snapshot đã sạch. Đảo thứ tự = lộ dữ liệu người dùng cũ.
  yield put(uiActions.allModalsClosed());
  try {
    yield call(performLogout);
  } finally {
    yield put(widgetActions.cleared());
    yield put(permissionActions.cleared());
    yield call(resetAbility);
    yield put(authActions.logoutFinished());
  }
}

function* sessionExpiredSaga(): SagaIterator {
  yield call(performLogout);
  yield put(permissionActions.cleared());
  yield put(widgetActions.cleared());
}

export function* authSaga(): SagaIterator {
  yield all([
    takeLatest(authActions.bootstrapRequested.type, bootstrapSaga),
    takeLatest(authActions.loginWithCredentialsRequested.type, loginWithCredentialsSaga),
    takeLatest(authActions.loginWithSocialRequested.type, loginWithSocialSaga),
    takeLatest(authActions.unlockWithBiometricsRequested.type, unlockSaga),
    takeLatest(authActions.logoutRequested.type, logoutSaga),
    takeLatest(authActions.sessionExpired.type, sessionExpiredSaga),
    takeLatest('auth/enableBiometricRequested', enableBiometricSaga),
    takeLatest('auth/enrollTransactionKeyRequested', enrollTransactionKeySaga),
  ]);
}

/**
 * Hai action không nằm trong slice vì chúng chỉ có tác dụng phụ, không đổi
 * state ngay. Khai ở đây để component vẫn có API gõ đúng kiểu.
 */
export const authSideEffects = {
  enableBiometricRequested: () => ({type: 'auth/enableBiometricRequested'} as const),
  enrollTransactionKeyRequested: () => ({type: 'auth/enrollTransactionKeyRequested'} as const),
};
