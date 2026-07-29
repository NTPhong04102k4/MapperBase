import {combineReducers} from '@reduxjs/toolkit';
import {authReducer} from '@/features/auth/store/authSlice';
import {paymentReducer} from '@/features/payment/store/paymentSlice';
import {permissionReducer} from '@/features/auth/store/permissionSlice';
import {uiReducer} from './uiSlice';
import {widgetReducer} from '@/features/widget/store/widgetSlice';

export const rootReducer = combineReducers({
  auth: authReducer,
  permission: permissionReducer,
  payment: paymentReducer,
  ui: uiReducer,
  widget: widgetReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
