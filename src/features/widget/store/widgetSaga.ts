import type {SagaIterator} from 'redux-saga';
import {all, call, put, takeLatest} from 'redux-saga/effects';
import {WidgetBridge} from '@/shared/native';
import type {WidgetInstallInfo} from '@/shared/native/types';
import {widgetActions} from './widgetSlice';

/**
 * Ghi snapshot cho widget.
 *
 * Nhắc lại nguyên tắc (docs/05 mục 4 & 8bis): **widget không gọi API**. App
 * ghi snapshot, widget chỉ đọc và vẽ. Ba nguồn kích hoạt ghi:
 *
 *   1. app vào foreground   → luôn ghi, đảm bảo đúng khi người dùng nhìn
 *   2. push sự kiện từ server → background handler ghi rồi reload
 *   3. sau khi dữ liệu nghiệp vụ đổi trong app
 *
 * KHÔNG ghi theo nhịp cố định từ JS: app không sống liên tục, và nhịp đó không
 * đáng tin bằng ba nguồn trên.
 */
function* syncSnapshotSaga(action: ReturnType<typeof widgetActions.syncRequested>): SagaIterator {
  try {
    const info: WidgetInstallInfo = yield call([WidgetBridge, WidgetBridge.isInstalled]);
    yield put(widgetActions.installStatusChecked(info));

    // Không có widget nào trên màn hình chính thì ghi cũng vô ích.
    if (!info.installed) {
      return;
    }

    yield call([WidgetBridge, WidgetBridge.writeSnapshot], action.payload);
    yield put(widgetActions.syncSucceeded(action.payload));
  } catch (error) {
    yield put(widgetActions.syncFailed(error instanceof Error ? error.message : String(error)));
  }
}

function* checkInstallSaga(): SagaIterator {
  try {
    const info: WidgetInstallInfo = yield call([WidgetBridge, WidgetBridge.isInstalled]);
    yield put(widgetActions.installStatusChecked(info));
  } catch {
    // Không lấy được trạng thái widget không phải lỗi đáng báo cho người dùng.
  }
}

export function* widgetSaga(): SagaIterator {
  yield all([
    takeLatest(widgetActions.syncRequested.type, syncSnapshotSaga),
    takeLatest('widget/checkInstallRequested', checkInstallSaga),
  ]);
}

export const widgetSideEffects = {
  checkInstallRequested: () => ({type: 'widget/checkInstallRequested'} as const),
};
