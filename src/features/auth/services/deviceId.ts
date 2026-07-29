import {Platform} from 'react-native';
import {appStorage} from '@/shared/services/storage/mmkv';

const KEY = 'device.id';

/**
 * Định danh thiết bị bền vững ở mức "một lần cài đặt app".
 *
 * Cố ý KHÔNG dùng IDFV/ANDROID_ID:
 *   - IDFV đổi khi user gỡ hết app của cùng nhà phát hành
 *   - ANDROID_ID đổi theo signing key và theo user profile
 *   - cả hai là định danh thiết bị, phải khai trong privacy manifest và dễ
 *     vướng chính sách store
 *
 * UUID tự sinh, lưu trong MMKV kho `app` (không bị xoá khi logout) là đủ cho
 * mục đích của ta: gắn push token và gắn khoá sinh trắc học theo thiết bị.
 * Gỡ app rồi cài lại = thiết bị mới, và điều đó **đúng** — khoá trong
 * Keystore/Secure Enclave cũng mất theo nên phải enroll lại.
 */
function uuidV4(): string {
  // Hermes chưa có `crypto.randomUUID`. Không kéo thêm gói `uuid` chỉ vì 4 dòng.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getDeviceId(): string {
  const existing = appStorage.getString(KEY);
  if (existing) {return existing;}

  const generated = `${Platform.OS}-${uuidV4()}`;
  appStorage.set(KEY, generated);
  return generated;
}

export const devicePlatform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
