/**
 * API công khai của feature auth. Ngoài feature chỉ nên import từ đây.
 *
 * KHÔNG export reducer/saga ở barrel này: `store/rootReducer.ts` và
 * `store/rootSaga.ts` import thẳng file slice/saga. Nếu chúng đi qua barrel thì
 * barrel kéo theo cả screen -> screen import store/hooks -> store/index ->
 * rootReducer -> quay lại barrel: vòng import lúc chạy.
 */
export {AuthProvider, useAuth} from './contexts/AuthContext';
export {LoginScreen} from './screens/LoginScreen';
export {UnlockScreen} from './screens/UnlockScreen';
export {
  selectAuth,
  selectAuthStatus,
  selectCurrentUser,
  selectIsAuthenticated,
  selectIsBooting,
  selectIsLocked,
  selectLoginPending,
  selectPermissionState,
  selectPermissionsReady,
} from './store/selectors';
export type {AuthStatus, AuthUser, SessionProfile, SocialProvider} from './services/types';

/**
 * Barrel này KHÔNG export authApi/getDeviceId, dù payment cần chúng để ký giao dịch.
 *
 * Barrel kéo theo AuthContext (React) -> store/hooks -> store/index -> rootSaga
 * -> paymentSaga -> quay lại barrel: vòng import lúc chạy, biểu hiện thành
 * `Cannot access '...' before initialization` ở một file ngẫu nhiên.
 *
 * Nên feature này có HAI cửa vào:
 *   '@/features/auth'          UI + selector, cho màn hình và provider
 *   '@/features/auth/services' API domain thuần, cho saga/service feature khác
 */
