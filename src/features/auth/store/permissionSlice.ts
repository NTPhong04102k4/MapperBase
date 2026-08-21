import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {PermissionRule} from '@/shared/permissions';

export type PermissionState = {
  rules: PermissionRule[];
  version: string | null;
  loading: boolean;
  /** Đang dùng rule cache từ lần chạy trước, chưa xác nhận với server. */
  stale: boolean;
  error: string | null;
  lastSyncedAt: number | null;
};

const initialState: PermissionState = {
  rules: [],
  version: null,
  loading: false,
  stale: false,
  error: null,
  lastSyncedAt: null,
};

/**
 * Redux giữ rule để UI biết trạng thái tải; CASL ability là instance riêng
 * (`permissions/ability.ts`) vì saga và service cần kiểm tra quyền ngoài React.
 * Saga chịu trách nhiệm giữ hai bên đồng bộ — chỉ ở đúng một chỗ:
 * `permissionSaga`.
 */
const permissionSlice = createSlice({
  name: 'permission',
  initialState,
  reducers: {
    syncRequested: state => {
      state.loading = true;
      state.error = null;
    },

    /** Nạp rule đã cache lúc khởi động, để UI không bị "trắng quyền" 1–2 giây. */
    restoredFromCache: (state, action: PayloadAction<PermissionRule[]>) => {
      state.rules = action.payload;
      state.stale = true;
    },

    syncSucceeded: (state, action: PayloadAction<{rules: PermissionRule[]; version?: string}>) => {
      state.rules = action.payload.rules;
      state.version = action.payload.version ?? null;
      state.loading = false;
      state.stale = false;
      state.error = null;
      state.lastSyncedAt = Date.now();
    },

    syncFailed: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      // Giữ nguyên rule cũ: mất mạng không có nghĩa là mất quyền.
    },

    cleared: () => initialState,
  },
});

export const permissionActions = permissionSlice.actions;
export const permissionReducer = permissionSlice.reducer;
