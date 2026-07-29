import {NativeEventEmitter, NativeModules} from 'react-native';
import {AppEnv} from './AppEnv';
import type {ForgeRockNode, ForgeRockTokens} from './types';

type ForgeRockNative = {
  configure(config: Record<string, string>): Promise<boolean>;
  startJourney(): Promise<ForgeRockTokens>;
  submitNode(values: Record<string, string>): Promise<boolean>;
  cancelJourney(): Promise<boolean>;
  loginWithCredentials(username: string, password: string): Promise<ForgeRockTokens>;
  getAccessToken(): Promise<ForgeRockTokens>;
  refreshToken(): Promise<ForgeRockTokens>;
  getUserInfo(): Promise<Record<string, string>>;
  isAuthenticated(): Promise<boolean>;
  logout(): Promise<unknown>;
};

const native = NativeModules.MapperForgeRock as ForgeRockNative | undefined;

function requireNative(): ForgeRockNative {
  if (!native) {
    throw new Error(
      '[ForgeRock] Native module MapperForgeRock không tồn tại. ' +
        'Android: kiểm tra MapperPackage. iOS: kiểm tra ForgeRockModule.m và `pod install`.',
    );
  }
  return native;
}

const emitter = native ? new NativeEventEmitter(NativeModules.MapperForgeRock) : null;

export type ForgeRockConfig = {
  /** OAuth2 client id đã đăng ký trong AM. Bắt buộc. */
  oauthClientId: string;
  /** Mặc định `<applicationId>:/oauth2redirect`. */
  oauthRedirectUri?: string;
  oauthScope?: string;
  /** Tên journey đăng nhập trong AM. Mặc định "Login". */
  authServiceName?: string;
  registrationServiceName?: string;
  url?: string;
  realm?: string;
  cookieName?: string;
};

export const ForgeRock = {
  /**
   * Gọi MỘT LẦN lúc app khởi động, trước mọi lệnh login.
   * url/realm mặc định lấy theo flavor từ BuildConfig/Info.plist.
   */
  configure(config: ForgeRockConfig): Promise<boolean> {
    return requireNative().configure({
      url: config.url ?? AppEnv.forgeRockUrl,
      realm: config.realm ?? AppEnv.forgeRockRealm,
      cookieName: config.cookieName ?? 'iPlanetDirectoryPro',
      oauthClientId: config.oauthClientId,
      oauthRedirectUri: config.oauthRedirectUri ?? `${AppEnv.applicationId}:/oauth2redirect`,
      oauthScope: config.oauthScope ?? 'openid profile email offline_access',
      authServiceName: config.authServiceName ?? 'Login',
      registrationServiceName: config.registrationServiceName ?? 'Registration',
    });
  },

  /**
   * Bắt đầu journey động.
   *
   * Promise trả về resolve khi journey KẾT THÚC. Các node trung gian đến qua
   * [onNode] — dùng khi journey ở server có thể thay đổi (thêm OTP, điều
   * khoản, chọn IdP) mà không cần phát hành app mới.
   */
  startJourney(): Promise<ForgeRockTokens> {
    return requireNative().startJourney();
  },

  /** `values`: { "<callbackIndex>": "giá trị" }. */
  submitNode(values: Record<string, string>): Promise<boolean> {
    return requireNative().submitNode(values);
  },

  cancelJourney(): Promise<boolean> {
    return requireNative().cancelJourney();
  },

  onNode(listener: (node: ForgeRockNode) => void): () => void {
    const subscription = emitter?.addListener('forgerock:node', listener);
    return () => subscription?.remove();
  },

  /**
   * Luồng rút gọn username + password.
   * Reject với `E_FR_UNSUPPORTED_NODE` nếu journey có callback lạ — lúc đó phải
   * chuyển sang startJourney/submitNode.
   */
  loginWithCredentials(username: string, password: string): Promise<ForgeRockTokens> {
    return requireNative().loginWithCredentials(username, password);
  },

  /** SDK tự refresh khi token sắp hết hạn. */
  getAccessToken(): Promise<ForgeRockTokens> {
    return requireNative().getAccessToken();
  },

  /** Ép refresh, bỏ qua cache — dùng khi API trả 401 dù token chưa hết hạn. */
  refreshToken(): Promise<ForgeRockTokens> {
    return requireNative().refreshToken();
  },

  getUserInfo(): Promise<Record<string, string>> {
    return requireNative().getUserInfo();
  },

  isAuthenticated(): Promise<boolean> {
    return native ? native.isAuthenticated() : Promise.resolve(false);
  },

  /** ⚠️ Xoá snapshot widget TRƯỚC khi gọi hàm này. Xem services/auth/session.ts. */
  logout(): Promise<unknown> {
    return native ? native.logout() : Promise.resolve(true);
  },
};
