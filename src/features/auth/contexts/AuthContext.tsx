import React, {createContext, useCallback, useContext, useEffect, useMemo} from 'react';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {authActions} from '../store/authSlice';
import {authSideEffects} from '../store/authSaga';
import {
  selectAuthStatus,
  selectCurrentUser,
  selectLoginPending,
} from '../store/selectors';
import type {AuthStatus, AuthUser, SocialProvider} from '../services';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBooting: boolean;
  isLocked: boolean;
  /** Provider đang chạy — dùng để chỉ disable đúng nút đang bấm. */
  pending: SocialProvider | 'credentials' | 'biometric' | null;
  error: string | null;
  errorKey: string | null;
  biometricEnabled: boolean;
  transactionKeyEnrolled: boolean;

  signInWithCredentials: (username: string, password: string) => void;
  signInWithSocial: (provider: SocialProvider) => void;
  unlockWithBiometrics: () => void;
  enableBiometricUnlock: () => void;
  enrollTransactionKey: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Vì sao có Context khi đã có Redux?
 *
 * Redux giữ *state*. Context này là **API bề mặt** của tính năng auth: component
 * gọi `signInWithSocial('google')` chứ không phải
 * `dispatch(authActions.loginWithSocialRequested({provider: 'google'}))`.
 *
 * Lợi ích thật, không phải cho đẹp:
 *   - màn hình không cần biết tên action, nên đổi cấu trúc store không phải sửa UI
 *   - chỗ nào cũng chỉ có một cách đăng xuất — không ai tự dispatch nửa vời
 *   - viết test component chỉ cần bọc một provider giả
 *
 * ⚠️ Phải đặt BÊN TRONG `<Provider store={store}>`.
 */
export function AuthProvider({children}: {children: React.ReactNode}) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);
  const user = useAppSelector(selectCurrentUser);
  const pending = useAppSelector(selectLoginPending);
  const error = useAppSelector(state => state.auth.error);
  const errorKey = useAppSelector(state => state.auth.errorKey);
  const biometricEnabled = useAppSelector(state => state.auth.biometricEnabled);
  const transactionKeyEnrolled = useAppSelector(state => state.auth.transactionKeyEnrolled);

  // Khôi phục phiên đúng một lần khi app khởi động.
  useEffect(() => {
    dispatch(authActions.bootstrapRequested());
  }, [dispatch]);

  const signInWithCredentials = useCallback(
    (username: string, password: string) => {
      dispatch(authActions.loginWithCredentialsRequested({username, password}));
    },
    [dispatch],
  );

  const signInWithSocial = useCallback(
    (provider: SocialProvider) => {
      dispatch(authActions.loginWithSocialRequested({provider}));
    },
    [dispatch],
  );

  const unlockWithBiometrics = useCallback(() => {
    dispatch(authActions.unlockWithBiometricsRequested());
  }, [dispatch]);

  const enableBiometricUnlock = useCallback(() => {
    dispatch(authSideEffects.enableBiometricRequested());
  }, [dispatch]);

  const enrollTransactionKey = useCallback(() => {
    dispatch(authSideEffects.enrollTransactionKeyRequested());
  }, [dispatch]);

  const signOut = useCallback(() => {
    dispatch(authActions.logoutRequested());
  }, [dispatch]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === 'authenticated',
      isBooting: status === 'booting',
      isLocked: status === 'locked',
      pending,
      error,
      errorKey,
      biometricEnabled,
      transactionKeyEnrolled,
      signInWithCredentials,
      signInWithSocial,
      unlockWithBiometrics,
      enableBiometricUnlock,
      enrollTransactionKey,
      signOut,
    }),
    [
      status,
      user,
      pending,
      error,
      errorKey,
      biometricEnabled,
      transactionKeyEnrolled,
      signInWithCredentials,
      signInWithSocial,
      unlockWithBiometrics,
      enableBiometricUnlock,
      enrollTransactionKey,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth phải nằm trong <AuthProvider>.');
  }
  return value;
}
