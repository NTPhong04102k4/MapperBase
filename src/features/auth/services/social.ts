import {Platform} from 'react-native';
import {appleAuth, appleAuthAndroid} from '@invertase/react-native-apple-authentication';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import {AccessToken, LoginManager, Settings} from 'react-native-fbsdk-next';
import {env} from '@/shared/config/env';
import {devicePlatform, getDeviceId} from './deviceId';
import type {SocialLoginPayload} from './types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  OAuth2 qua IdP: Google · Facebook · Apple
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Vai trò của tầng này: **chỉ lấy token từ SDK của IdP**, rồi trả payload cho
 *  backend đổi lấy phiên (`POST /auth/social`).
 *
 *  App KHÔNG tự tin vào token của IdP. Backend phải verify chữ ký với Google/
 *  Apple/Facebook — nếu không, ai cũng có thể gửi lên một idToken giả và đăng
 *  nhập thành người khác.
 */

export class SocialAuthCancelled extends Error {
  constructor(provider: string) {
    super(`Người dùng huỷ đăng nhập ${provider}`);
    this.name = 'SocialAuthCancelled';
  }
}

// ── Google ──────────────────────────────────────────────────────────────────

let googleConfigured = false;

/**
 * `webClientId` là **OAuth client loại Web** trong Google Cloud Console, không
 * phải client Android/iOS. Đây là nhầm lẫn phổ biến nhất khi tích hợp: khai
 * client Android vào đây thì `idToken` luôn trả `null` mà không báo lỗi gì.
 *
 * Từ bản ≥13, thư viện dùng Credential Manager trên Android nên `webClientId`
 * là bắt buộc, không còn tuỳ chọn.
 */
export function configureGoogleSignIn(webClientId: string, iosClientId?: string): void {
  if (googleConfigured) {
    return;
  }
  GoogleSignin.configure({
    webClientId,
    iosClientId,
    offlineAccess: false,
    scopes: ['profile', 'email'],
  });
  googleConfigured = true;
}

export async function signInWithGoogle(): Promise<SocialLoginPayload> {
  try {
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
    const result = await GoogleSignin.signIn();

    const idToken = result.data?.idToken;
    if (!idToken) {
      throw new Error(
        'Google không trả idToken. Kiểm tra webClientId (phải là OAuth client loại Web) ' +
          'và SHA-1 đã khai trong Firebase console cho đúng flavor.',
      );
    }

    return {
      provider: 'google',
      idToken,
      email: result.data?.user?.email ?? null,
      fullName: result.data?.user?.name ?? null,
      deviceId: getDeviceId(),
      platform: devicePlatform,
    };
  } catch (error) {
    if ((error as {code?: string})?.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new SocialAuthCancelled('Google');
    }
    throw error;
  }
}

// ── Facebook ────────────────────────────────────────────────────────────────

export async function configureFacebook(appId: string, clientToken: string): Promise<void> {
  Settings.setAppID(appId);
  Settings.setClientToken(clientToken);
  // iOS 14+: phải xin App Tracking Transparency trước khi bật tracking. Ta
  // không dùng quảng cáo nên tắt hẳn — bật mà không xin quyền là lý do bị từ
  // chối review.
  //
  // `setAdvertiserTrackingEnabled` trả Promise<boolean> (xem FBSettings.d.ts),
  // phải await TRƯỚC `initializeSDK()`: không await thì SDK có thể khởi tạo khi
  // cờ tracking chưa kịp tắt.
  await Settings.setAdvertiserTrackingEnabled(false);
  Settings.initializeSDK();
}

export async function signInWithFacebook(): Promise<SocialLoginPayload> {
  const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
  if (result.isCancelled) {
    throw new SocialAuthCancelled('Facebook');
  }

  const token = await AccessToken.getCurrentAccessToken();
  if (!token) {
    throw new Error('Facebook không trả access token.');
  }

  return {
    provider: 'facebook',
    // Facebook trả accessToken (không phải idToken) — backend verify bằng
    // debug_token của Graph API.
    accessToken: token.accessToken,
    deviceId: getDeviceId(),
    platform: devicePlatform,
  };
}

// ── Apple ───────────────────────────────────────────────────────────────────

/**
 * Sign in with Apple.
 *
 * Hai điểm bắt buộc nhớ:
 *
 *  1. Apple chỉ trả **tên và email đúng MỘT LẦN**, ở lần cấp quyền đầu tiên.
 *     Từ lần đăng nhập thứ hai hai trường này là `null`. Phải gửi lên backend
 *     ngay lần đầu; không lưu được thì mất vĩnh viễn (trừ khi user vào Settings
 *     gỡ app khỏi Apple ID rồi làm lại).
 *
 *  2. Có Sign in with Apple thì **bắt buộc** phải có chức năng xoá tài khoản
 *     kèm revoke Apple token (App Store 5.1.1(v)).
 */
export async function signInWithApple(): Promise<SocialLoginPayload> {
  if (Platform.OS === 'ios') {
    if (!appleAuth.isSupported) {
      throw new Error('Thiết bị này không hỗ trợ Sign in with Apple (cần iOS 13+).');
    }

    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });

    const state = await appleAuth.getCredentialStateForUser(response.user);
    if (state !== appleAuth.State.AUTHORIZED) {
      throw new SocialAuthCancelled('Apple');
    }
    if (!response.identityToken) {
      throw new Error('Apple không trả identityToken.');
    }

    const fullName = [response.fullName?.givenName, response.fullName?.familyName]
      .filter(Boolean)
      .join(' ');

    return {
      provider: 'apple',
      idToken: response.identityToken,
      // `nonce` để backend chống replay — phải khớp nonce trong identityToken.
      nonce: response.nonce,
      fullName: fullName || null,
      email: response.email ?? null,
      deviceId: getDeviceId(),
      platform: devicePlatform,
    };
  }

  // Android: không có API native, phải chạy web flow.
  appleAuthAndroid.configure({
    clientId: env.app.applicationId,
    redirectUri: `${env.apiBaseUrl}/auth/apple/callback`,
    scope: appleAuthAndroid.Scope.ALL,
    responseType: appleAuthAndroid.ResponseType.ALL,
  });

  const response = await appleAuthAndroid.signIn();
  if (!response.id_token) {
    throw new SocialAuthCancelled('Apple');
  }

  const androidName = [response.user?.name?.firstName, response.user?.name?.lastName]
    .filter(Boolean)
    .join(' ');

  return {
    provider: 'apple',
    idToken: response.id_token,
    nonce: response.nonce,
    fullName: androidName || null,
    email: response.user?.email ?? null,
    deviceId: getDeviceId(),
    platform: devicePlatform,
  };
}

// ── Dọn dẹp khi logout ──────────────────────────────────────────────────────

/**
 * Đăng xuất khỏi SDK của IdP.
 *
 * Bỏ bước này thì lần đăng nhập sau Google/Facebook tự chọn lại tài khoản cũ mà
 * không hỏi — người dùng muốn đổi tài khoản sẽ không đổi được.
 */
export async function signOutFromSocialProviders(): Promise<void> {
  // `LoginManager.logOut()` trả về void, KHÔNG phải Promise (FBLoginManager.d.ts).
  // Nhét nó vào Promise.allSettled không sai lúc chạy nhưng che mất sự thật đó —
  // gọi thẳng cho đúng bản chất.
  LoginManager.logOut();
  // allSettled: một provider lỗi không được chặn provider kia, và hàm này không
  // bao giờ được throw (nó chạy trong luồng logout).
  await Promise.allSettled([googleConfigured ? GoogleSignin.signOut() : Promise.resolve()]);
}
