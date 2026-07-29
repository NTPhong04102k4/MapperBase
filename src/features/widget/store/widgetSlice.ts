import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {WidgetSnapshot} from '../types';

export type WidgetState = {
  installed: boolean;
  count: number;
  refreshMinutes: number;
  lastSnapshot: WidgetSnapshot | null;
  lastWrittenAt: number | null;
  error: string | null;
};

const initialState: WidgetState = {
  installed: false,
  count: 0,
  refreshMinutes: 5,
  lastSnapshot: null,
  lastWrittenAt: null,
  error: null,
};

const widgetSlice = createSlice({
  name: 'widget',
  initialState,
  reducers: {
    installStatusChecked: (
      state,
      action: PayloadAction<{installed: boolean; count: number; refreshMinutes: number}>,
    ) => {
      state.installed = action.payload.installed;
      state.count = action.payload.count;
      state.refreshMinutes = action.payload.refreshMinutes;
    },

    /** Yêu cầu saga ghi snapshot xuống App Group / SharedPreferences. */
    syncRequested: {
      reducer: state => {
        state.error = null;
      },
      prepare: (payload: WidgetSnapshot) => ({payload}),
    },

    syncSucceeded: (state, action: PayloadAction<WidgetSnapshot>) => {
      state.lastSnapshot = action.payload;
      state.lastWrittenAt = Date.now();
    },

    syncFailed: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },

    /** Logout. Xem services/auth/session.ts để biết vì sao thứ tự quan trọng. */
    cleared: state => {
      state.lastSnapshot = null;
      state.lastWrittenAt = null;
    },
  },
});

export const widgetActions = widgetSlice.actions;
export const widgetReducer = widgetSlice.reducer;
