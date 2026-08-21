import {createMMKV, type MMKV} from 'react-native-mmkv';

/**
 * Ba kho tách biệt, cố ý:
 *
 *  app      – cấu hình không nhạy cảm (theme, ngôn ngữ, deviceId)
 *  session  – dữ liệu gắn với người dùng đang đăng nhập. XOÁ SẠCH khi logout.
 *  cache    – cache offline. Xoá được bất cứ lúc nào.
 *
 * Vì sao không nhét chung một kho: logout phải xoá được đúng phần của người
 * dùng mà không làm mất theme/ngôn ngữ họ đã chọn. Gộp chung thì hoặc xoá quá
 * tay, hoặc quên xoá thứ cần xoá — cả hai đều đã xảy ra ở nhiều dự án.
 *
 * ⚠️ MMKV KHÔNG phải nơi để access/refresh token. Token đi vào Keychain/
 * Keystore qua react-native-keychain (services/auth/session.ts).
 *
 * API của react-native-mmkv v4 (Nitro): dùng `createMMKV({id})`, không phải
 * `new MMKV()` như v2/v3. Xoá một key là `remove()`, không phải `delete()`.
 */
export const appStorage: MMKV = createMMKV({id: 'mapper.app'});
export const sessionStorage: MMKV = createMMKV({id: 'mapper.session'});
export const cacheStorage: MMKV = createMMKV({id: 'mapper.cache'});

export const StorageKey = {
  themeMode: 'theme.mode',
  language: 'app.language',
  onboardingSeen: 'app.onboardingSeen',
  lastUserId: 'session.lastUserId',
  biometricEnabled: 'session.biometricEnabled',
  permissionRules: 'session.permissionRules',
} as const;

/** Xoá đúng phần của người dùng. Gọi trong luồng logout. */
export function clearSession(): void {
  sessionStorage.clearAll();
  cacheStorage.clearAll();
}

export function readJSON<T>(storage: MMKV, key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Dữ liệu hỏng: bỏ đi, đừng để một lần ghi lỗi làm app hỏng mãi mãi.
    storage.remove(key);
    return null;
  }
}

export function writeJSON(storage: MMKV, key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
