import {createSlice, type PayloadAction} from '@reduxjs/toolkit';

export type ModalVariant = 'bottom' | 'center' | 'header' | 'left' | 'right';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export type ToastPayload = {
  id: string;
  kind: ToastKind;
  message: string;
  /** i18n key được ưu tiên hơn `message` nếu có. */
  i18nKey?: string;
  durationMs: number;
};

export type UiState = {
  /** Ngăn xếp modal đang mở. Là mảng vì modal có thể chồng nhau. */
  modals: Array<{id: string; variant: ModalVariant}>;
  toasts: ToastPayload[];
  /** Overlay chặn thao tác toàn màn hình — dùng rất tiết kiệm. */
  blockingTask: string | null;
  /** Route mà widget/deep link yêu cầu mở sau khi app sẵn sàng. */
  pendingDeepLink: string | null;
};

const initialState: UiState = {
  modals: [],
  toasts: [],
  blockingTask: null,
  pendingDeepLink: null,
};

let toastSeq = 0;

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    modalOpened: (state, action: PayloadAction<{id: string; variant: ModalVariant}>) => {
      // Mở lại modal đang mở thì đưa lên trên cùng thay vì nhân đôi.
      state.modals = state.modals.filter(m => m.id !== action.payload.id);
      state.modals.push(action.payload);
    },

    modalClosed: (state, action: PayloadAction<string>) => {
      state.modals = state.modals.filter(m => m.id !== action.payload);
    },

    allModalsClosed: state => {
      state.modals = [];
    },

    toastShown: {
      reducer: (state, action: PayloadAction<ToastPayload>) => {
        // Giữ tối đa 3: nhiều hơn là che hết màn hình và không ai đọc kịp.
        state.toasts = [...state.toasts.slice(-2), action.payload];
      },
      prepare: (input: {
        kind: ToastKind;
        message: string;
        i18nKey?: string;
        durationMs?: number;
      }) => ({
        payload: {
          id: `toast-${++toastSeq}`,
          kind: input.kind,
          message: input.message,
          i18nKey: input.i18nKey,
          durationMs: input.durationMs ?? 3000,
        },
      }),
    },

    toastDismissed: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },

    blockingTaskStarted: (state, action: PayloadAction<string>) => {
      state.blockingTask = action.payload;
    },

    blockingTaskFinished: state => {
      state.blockingTask = null;
    },

    /**
     * Deep link đến trước khi navigator sẵn sàng (app bị kill, user bấm widget).
     * Lưu lại rồi RootNavigator tiêu thụ sau — không có bước này thì cú bấm đầu
     * tiên vào widget luôn bị nuốt.
     */
    deepLinkReceived: (state, action: PayloadAction<string>) => {
      state.pendingDeepLink = action.payload;
    },

    deepLinkConsumed: state => {
      state.pendingDeepLink = null;
    },
  },
});

export const uiActions = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
