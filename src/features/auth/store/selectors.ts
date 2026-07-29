import {createSelector} from '@reduxjs/toolkit';
import type {RootState} from '@/store/rootReducer';

/**
 * Selector của feature auth (gồm cả quyền, vì quyền là thuộc tính của phiên).
 *
 * `import type` cho RootState là CỐ Ý: rootReducer import slice của feature này,
 * nên import giá trị thật sẽ tạo vòng lúc chạy. Type bị xoá khi build nên không.
 */
export const selectAuth = (state: RootState) => state.auth;
export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.status === 'authenticated';
export const selectIsBooting = (state: RootState) => state.auth.status === 'booting';
export const selectIsLocked = (state: RootState) => state.auth.status === 'locked';
export const selectLoginPending = (state: RootState) => state.auth.pendingProvider;

export const selectPermissionState = (state: RootState) => state.permission;
export const selectPermissionsReady = createSelector(
  [selectPermissionState],
  permission => permission.rules.length > 0 && !permission.loading,
);
