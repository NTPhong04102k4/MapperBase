import {createSelector} from '@reduxjs/toolkit';
import type {RootState} from './rootReducer';

/**
 * Selector cho state UI dùng chung (toast, modal toàn cục, deep link đang chờ).
 *
 * Selector của từng feature nằm trong feature đó
 * (`features/<tên>/store/selectors.ts`); ở đây chỉ giữ phần không thuộc feature nào.
 *
 * Viết `useAppSelector(s => s.ui.toasts)` thì ổn, nhưng bất kỳ selector nào tạo
 * giá trị MỚI mỗi lần chạy (map/filter/spread) sẽ làm component re-render vô
 * hạn dù dữ liệu không đổi — đó là lý do dùng `createSelector`.
 */
export const selectUi = (state: RootState) => state.ui;
export const selectToasts = (state: RootState) => state.ui.toasts;
export const selectPendingDeepLink = (state: RootState) => state.ui.pendingDeepLink;
export const selectOpenModals = (state: RootState) => state.ui.modals;

/** Modal có đang mở không — dùng để chặn back hoặc chặn hiện toast chồng lên. */
export const selectHasOpenModal = createSelector([selectOpenModals], modals => modals.length > 0);
