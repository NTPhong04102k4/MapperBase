import type {RootState} from '@/store/rootReducer';

/** Selector của feature payment. `import type` để không tạo vòng với rootReducer. */
export const selectPayment = (state: RootState) => state.payment;
export const selectCurrentOrder = (state: RootState) => state.payment.order;
export const selectPaymentStatus = (state: RootState) => state.payment.status;
export const selectIsPolling = (state: RootState) => state.payment.polling;
