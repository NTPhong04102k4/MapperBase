import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {CreateOrderRequest, PaymentStatus, SePayOrder} from '../services/types';

export type PaymentState = {
  order: SePayOrder | null;
  status: PaymentStatus | null;
  creating: boolean;
  /** Saga đang poll trạng thái. */
  polling: boolean;
  /** Số lần đã hỏi — hiện ở dev để kiểm chứng nhịp poll. */
  pollCount: number;
  bankTransactionId: string | null;
  receivedAmount: number | null;
  error: string | null;
  errorKey: string | null;
  /** Đang chờ người dùng chạm vân tay để xác nhận (mức 3). */
  confirming: boolean;
};

const initialState: PaymentState = {
  order: null,
  status: null,
  creating: false,
  polling: false,
  pollCount: 0,
  bankTransactionId: null,
  receivedAmount: null,
  error: null,
  errorKey: null,
  confirming: false,
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    createOrderRequested: {
      reducer: state => {
        state.creating = true;
        state.error = null;
        state.errorKey = null;
        state.order = null;
        state.status = null;
        state.pollCount = 0;
      },
      prepare: (payload: Omit<CreateOrderRequest, 'idempotencyKey'>) => ({payload}),
    },

    createOrderSucceeded: (state, action: PayloadAction<SePayOrder>) => {
      state.creating = false;
      state.order = action.payload;
      state.status = action.payload.status;
    },

    createOrderFailed: (state, action: PayloadAction<{message: string; i18nKey?: string}>) => {
      state.creating = false;
      state.error = action.payload.message;
      state.errorKey = action.payload.i18nKey ?? null;
    },

    pollingStarted: state => {
      state.polling = true;
    },

    pollTicked: (
      state,
      action: PayloadAction<{
        status: PaymentStatus;
        bankTransactionId: string | null;
        receivedAmount: number | null;
      }>,
    ) => {
      state.pollCount += 1;
      state.status = action.payload.status;
      state.bankTransactionId = action.payload.bankTransactionId;
      state.receivedAmount = action.payload.receivedAmount;
      if (state.order) {
        state.order.status = action.payload.status;
      }
    },

    pollingStopped: state => {
      state.polling = false;
    },

    /** Hết thời gian chờ mà tiền chưa về. Đơn có thể vẫn được trả sau. */
    pollingTimedOut: state => {
      state.polling = false;
      if (state.status === 'pending') {
        state.status = 'expired';
      }
    },

    cancelOrderRequested: state => {
      state.polling = false;
    },

    // ── Biometric mức 3 ─────────────────────────────────────────────────────

    confirmWithBiometricRequested: {
      reducer: state => {
        state.confirming = true;
        state.error = null;
        state.errorKey = null;
      },
      prepare: (payload: {txId: string; summary: string}) => ({payload}),
    },

    confirmSucceeded: state => {
      state.confirming = false;
    },

    confirmFailed: (state, action: PayloadAction<{message: string; i18nKey?: string}>) => {
      state.confirming = false;
      state.error = action.payload.message;
      state.errorKey = action.payload.i18nKey ?? null;
    },

    confirmCancelled: state => {
      state.confirming = false;
    },

    reset: () => initialState,
  },
});

export const paymentActions = paymentSlice.actions;
export const paymentReducer = paymentSlice.reducer;
