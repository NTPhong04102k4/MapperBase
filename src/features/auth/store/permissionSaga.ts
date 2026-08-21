import type {SagaIterator} from 'redux-saga';
import {all, call, put, takeLatest} from 'redux-saga/effects';
import {setAbilityRules, type PermissionPayload} from '@/shared/permissions';
import {authApi} from '../services';
import {StorageKey, sessionStorage} from '@/shared/services/storage/mmkv';
import {permissionActions} from './permissionSlice';

/**
 * Đồng bộ quyền từ backend.
 *
 * Đây là chỗ DUY NHẤT được phép gọi `setAbilityRules`. Nếu để nhiều nơi cùng
 * ghi vào ability, sẽ có lúc UI hiện quyền của bộ rule này còn saga kiểm tra
 * theo bộ rule khác — loại bug gần như không thể tái hiện.
 */
function* syncPermissionsSaga(): SagaIterator {
  try {
    const payload: PermissionPayload = yield call(authApi.permissions);

    // CASL trước, Redux sau: nếu ngược lại thì component render với rule mới
    // trong khi ability vẫn còn rule cũ, gây nháy nút.
    yield call(setAbilityRules, payload.rules);
    sessionStorage.set(StorageKey.permissionRules, JSON.stringify(payload.rules));

    yield put(permissionActions.syncSucceeded({rules: payload.rules, version: payload.version}));
  } catch (error) {
    // Giữ nguyên rule cũ. Mất mạng không đồng nghĩa với mất quyền — xoá sạch
    // quyền lúc này sẽ làm cả app trông như hỏng.
    yield put(permissionActions.syncFailed(error instanceof Error ? error.message : String(error)));
  }
}

export function* permissionSaga(): SagaIterator {
  yield all([takeLatest(permissionActions.syncRequested.type, syncPermissionsSaga)]);
}
