/* eslint-disable no-undef */
/**
 * Mock các module native.
 *
 * Native module chỉ tồn tại khi có app thật chạy. Trong Jest chúng không có,
 * nên phải thay bằng bản giả — nếu không mọi test chạm tới `NativeModules` đều
 * chết ở dòng import, kể cả test của logic thuần.
 */

// ── MMKV ─────────────────────────────────────────────────────────────────────
// Bản giả bằng Map: giữ đúng ngữ nghĩa (đọc lại được thứ vừa ghi) nên test của
// tầng lưu trữ vẫn có ý nghĩa, không chỉ là no-op.
jest.mock('react-native-mmkv', () => {
  class FakeMMKV {
    constructor(config) {
      this.id = config?.id ?? 'default';
      this.store = new Map();
    }
    set(key, value) {
      this.store.set(key, value);
    }
    getString(key) {
      const value = this.store.get(key);
      return typeof value === 'string' ? value : undefined;
    }
    getNumber(key) {
      const value = this.store.get(key);
      return typeof value === 'number' ? value : undefined;
    }
    getBoolean(key) {
      const value = this.store.get(key);
      return typeof value === 'boolean' ? value : undefined;
    }
    contains(key) {
      return this.store.has(key);
    }
    remove(key) {
      return this.store.delete(key);
    }
    clearAll() {
      this.store.clear();
    }
    getAllKeys() {
      return [...this.store.keys()];
    }
  }
  return {createMMKV: config => new FakeMMKV(config)};
});

// ── Native module tự viết ────────────────────────────────────────────────────
jest.mock('react-native/Libraries/BatchedBridge/NativeModules', () => ({
  MapperAppEnv: {
    flavor: 'dev',
    apiBaseUrl: 'https://dev.hrapi.ttmedic.vn',
    forgeRockUrl: 'https://dev.hrapi.ttmedic.vn/am',
    forgeRockRealm: 'alpha',
    sePayEnv: 'sandbox',
    widgetRefreshMinutes: 1,
    applicationId: 'com.mapper.dev',
    versionName: '1.0.0',
    buildNumber: 1,
    isDebug: true,
    appName: 'Mapper Dev',
  },
  MapperSplashScreen: {hide: jest.fn(), show: jest.fn()},
  MapperForgeRock: {
    configure: jest.fn(),
    isAuthenticated: jest.fn(() => Promise.resolve(false)),
    logout: jest.fn(),
  },
  MapperBiometric: {
    getStatus: jest.fn(() =>
      Promise.resolve({
        status: 'AVAILABLE',
        available: true,
        biometryType: 'BIOMETRIC',
        hasTransactionKey: false,
      }),
    ),
  },
  MapperWidget: {
    writeSnapshot: jest.fn(() => Promise.resolve(true)),
    clearSnapshot: jest.fn(() => Promise.resolve(true)),
    reload: jest.fn(() => Promise.resolve(true)),
    isInstalled: jest.fn(() => Promise.resolve({installed: false, count: 0, refreshMinutes: 1})),
  },
  SettingsManager: {settings: {AppleLocale: 'vi_VN'}},
  I18nManager: {localeIdentifier: 'vi_VN'},
}));

// ── Thư viện bên thứ ba ──────────────────────────────────────────────────────
jest.mock('react-native-keychain', () => ({
  ACCESS_CONTROL: {BIOMETRY_CURRENT_SET: 'BiometryCurrentSet'},
  ACCESSIBLE: {WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly'},
  SECURITY_LEVEL: {SECURE_HARDWARE: 'SECURE_HARDWARE'},
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    hasPlayServices: jest.fn(),
  },
  statusCodes: {SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED'},
}));

jest.mock('react-native-fbsdk-next', () => ({
  AccessToken: {getCurrentAccessToken: jest.fn()},
  LoginManager: {logInWithPermissions: jest.fn(), logOut: jest.fn()},
  Settings: {
    setAppID: jest.fn(),
    setClientToken: jest.fn(),
    setAdvertiserTrackingEnabled: jest.fn(),
    initializeSDK: jest.fn(),
  },
}));

jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {isSupported: false, Operation: {}, Scope: {}, State: {}},
  appleAuthAndroid: {configure: jest.fn(), Scope: {}, ResponseType: {}},
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
}));

// Reanimated có sẵn bản mock chính thức; thiếu nó thì mọi component dùng
// Animated đều ném lỗi worklet.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
