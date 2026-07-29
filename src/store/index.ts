import {configureStore} from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import {env} from '@/shared/config/env';
import {setSessionExpiredHandler} from '@/shared/services/http/client';
import {rootReducer, type RootState} from './rootReducer';
import {rootSaga} from './rootSaga';
import {authActions} from '@/features/auth/store/authSlice';

const sagaMiddleware = createSagaMiddleware({
  onError: error => {
    // rootSaga đã tự dựng lại saga chết; đây là chỗ cuối cùng để ghi log/gửi
    // crash report trước khi lỗi biến mất.
    console.error('[saga] lỗi không bắt được', error);
  },
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      // Không dùng thunk: mọi tác dụng phụ đi qua saga. Để cả hai thì logic bất
      // đồng bộ sẽ nằm rải ở hai chỗ và không ai biết phải tìm ở đâu.
      thunk: false,
      serializableCheck: {
        // Action side-effect không mang payload; state không chứa Date/Map.
        ignoredActions: [],
      },
      immutableCheck: env.isDebugBuild,
    }).concat(sagaMiddleware),
  devTools: env.isDebugBuild,
});

sagaMiddleware.run(rootSaga);

/**
 * Nối interceptor axios vào store SAU khi store đã dựng.
 *
 * Không import store trong `http/client.ts` để tránh vòng
 * store → saga → service → client → store. Vòng đó biểu hiện thành
 * `Cannot access 'store' before initialization` ở một file ngẫu nhiên, rất
 * khó lần ra nguyên nhân.
 */
setSessionExpiredHandler(() => {
  store.dispatch(authActions.sessionExpired());
});

export type AppStore = typeof store;
export type AppDispatch = AppStore['dispatch'];
export type {RootState};
export {rootReducer};
