import {NativeModules, Platform} from 'react-native';
import type {NativeAppEnv} from './types';

/**
 * Fallback khi native module chưa có (Jest, hoặc chưa build lại sau khi thêm
 * MapperPackage). Cố tình trỏ về dev để một cấu hình thiếu không âm thầm bắn
 * request lên production.
 */
const FALLBACK: NativeAppEnv = {
  flavor: 'dev',
  apiBaseUrl: 'https://dev.hrapi.ttmedic.vn',
  forgeRockUrl: 'https://dev.hrapi.ttmedic.vn/am',
  forgeRockRealm: 'alpha',
  sePayEnv: 'sandbox',
  widgetRefreshMinutes: 5,
  applicationId: 'com.mapper.dev',
  versionName: '0.0.0',
  buildNumber: 0,
  isDebug: true,
  appName: 'Mapper Dev',
};

const native = NativeModules.MapperAppEnv as Partial<NativeAppEnv> | undefined;

if (!native && !__DEV__) {
  // Ở bản release mà thiếu module này nghĩa là MapperPackage chưa được đăng ký
  // — im lặng dùng fallback dev là kịch bản tệ nhất có thể.
  console.error(
    '[AppEnv] Native module MapperAppEnv không tồn tại. ' +
      'Kiểm tra MainApplication.kt (add MapperPackage) và AppEnvModule.m.',
  );
}

export const AppEnv: NativeAppEnv = {
  ...FALLBACK,
  ...(native ?? {}),
} as NativeAppEnv;

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
