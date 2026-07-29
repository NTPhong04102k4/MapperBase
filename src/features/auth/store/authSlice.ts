import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {AuthStatus, AuthUser, SocialProvider} from '../services';

export type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  /** Đang chạy lệnh đăng nhập nào — để disable đúng nút, không disable cả form. */
  pendingProvider: SocialProvider | 'credentials' | 'biometric' | null;
  error: string | null;
  /** i18n key, để UI hiện đúng ngôn ngữ đang chọn. */
  errorKey: string | null;
  biometricEnabled: boolean;
  /** Đã enroll khoá ký giao dịch (mức 3) chưa. */
  transactionKeyEnrolled: boolean;
};

const initialState: AuthState = {
  status: 'booting',
  user: null,
  pendingProvider: null,
  error: null,
  errorKey: null,
  biometricEnabled: false,
  transactionKeyEnrolled: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Saga khởi động: khôi phục phiên nếu có. */
    bootstrapRequested: state => {
      state.status = 'booting';
    },
    /** Có phiên nhưng bật khoá sinh trắc học -> chờ mở khoá. */
    sessionLocked: state => {
      state.status = 'locked';
      state.pendingProvider = null;
    },

    loginWithCredentialsRequested: {
      reducer: state => {
        state.pendingProvider = 'credentials';
        state.error = null;
        state.errorKey = null;
      },
      prepare: (payload: {username: string; password: string}) => ({payload}),
    },

    loginWithSocialRequested: {
      reducer: (state, action: PayloadAction<{provider: SocialProvider}>) => {
        state.pendingProvider = action.payload.provider;
        state.error = null;
        state.errorKey = null;
      },
      prepare: (payload: {provider: SocialProvider}) => ({payload}),
    },

    unlockWithBiometricsRequested: state => {
      state.pendingProvider = 'biometric';
      state.error = null;
      state.errorKey = null;
    },

    loginSucceeded: (state, action: PayloadAction<{user: AuthUser}>) => {
      state.status = 'authenticated';
      state.user = action.payload.user;
      state.pendingProvider = null;
      state.error = null;
      state.errorKey = null;
    },

    loginFailed: (state, action: PayloadAction<{message: string; i18nKey?: string}>) => {
      state.status = state.user ? state.status : 'unauthenticated';
      state.pendingProvider = null;
      state.error = action.payload.message;
      state.errorKey = action.payload.i18nKey ?? null;
    },

    /** User bấm Huỷ ở prompt sinh trắc học / màn OAuth. Không phải lỗi. */
    loginCancelled: state => {
      state.pendingProvider = null;
      state.error = null;
      state.errorKey = null;
    },

    profileRefreshed: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
    },

    biometricPreferenceChanged: (state, action: PayloadAction<boolean>) => {
      state.biometricEnabled = action.payload;
    },

    transactionKeyEnrolledChanged: (state, action: PayloadAction<boolean>) => {
      state.transactionKeyEnrolled = action.payload;
    },

    /**
     * Interceptor báo refresh token đã hỏng. KHÁC với `logoutRequested`:
     * đây là bị đá ra, cần hiện thông báo "phiên hết hạn".
     */
    sessionExpired: state => {
      state.status = 'unauthenticated';
      state.user = null;
      state.pendingProvider = null;
      state.errorKey = 'auth.sessionExpired';
      state.error = null;
    },

    logoutRequested: state => {
      state.pendingProvider = null;
    },

    logoutFinished: () => ({...initialState, status: 'unauthenticated' as const}),
  },
});

export const authActions = authSlice.actions;
export const authReducer = authSlice.reducer;
