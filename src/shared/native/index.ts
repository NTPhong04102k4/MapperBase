/**
 * Điểm vào duy nhất cho mọi native module tự viết.
 *
 * Quy tắc: **không** file nào ngoài thư mục này được `import {NativeModules}`.
 * Lý do là các module này có thể vắng mặt (chạy Jest, chạy trên máy chưa build
 * lại native) — gom vào một chỗ thì chỉ phải xử lý trường hợp thiếu một lần,
 * thay vì rải `?.` khắp codebase.
 */
export {AppEnv} from './AppEnv';
export {SplashScreen} from './SplashScreen';
export {ForgeRock} from './ForgeRock';
export {Biometric} from './Biometric';
export {WidgetBridge} from './WidgetBridge';
export type {
  BiometricStatus,
  BiometryType,
  ForgeRockNode,
  ForgeRockCallback,
  ForgeRockTokens,
  NativeAppEnv,
  TransactionKeyInfo,
  TransactionSignature,
} from './types';
