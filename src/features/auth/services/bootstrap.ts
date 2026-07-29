import {env, type Flavor} from '@/shared/config/env';
import {ForgeRock} from '@/shared/native';
import {configureFacebook, configureGoogleSignIn} from './social';

/**
 * Khởi tạo mọi SDK xác thực. Gọi MỘT LẦN, càng sớm càng tốt (trước khi render
 * màn Login) và trước mọi lệnh đăng nhập.
 *
 * Các giá trị dưới đây khác nhau theo flavor. Chúng **không phải secret**
 * (public OAuth client) nên để trong code được — nhưng phải khớp đúng console
 * tương ứng của từng flavor, nếu không sẽ nhận lỗi rất mơ hồ
 * ("DEVELOPER_ERROR" của Google là ví dụ kinh điển).
 */

type SocialClientIds = {
  googleWebClientId: string;
  googleIosClientId?: string;
  facebookAppId: string;
  facebookClientToken: string;
};

/**
 * TODO(setup): điền giá trị thật cho từng flavor.
 *
 *  - googleWebClientId  : Google Cloud Console → Credentials → OAuth client
 *                         loại **Web** (không phải Android/iOS)
 *  - googleIosClientId  : CLIENT_ID trong GoogleService-Info.plist của flavor
 *  - facebookAppId      : Meta for Developers → App → Settings → Basic
 *  - facebookClientToken: cùng trang, mục Advanced
 */
const SOCIAL_CLIENTS: Record<Flavor, SocialClientIds> = {
  dev: {
    googleWebClientId: 'REPLACE_DEV.apps.googleusercontent.com',
    googleIosClientId: 'REPLACE_DEV_IOS.apps.googleusercontent.com',
    facebookAppId: 'REPLACE_DEV_FB_APP_ID',
    facebookClientToken: 'REPLACE_DEV_FB_CLIENT_TOKEN',
  },
  staging: {
    googleWebClientId: 'REPLACE_STAGING.apps.googleusercontent.com',
    googleIosClientId: 'REPLACE_STAGING_IOS.apps.googleusercontent.com',
    facebookAppId: 'REPLACE_STAGING_FB_APP_ID',
    facebookClientToken: 'REPLACE_STAGING_FB_CLIENT_TOKEN',
  },
  prod: {
    googleWebClientId: 'REPLACE_PROD.apps.googleusercontent.com',
    googleIosClientId: 'REPLACE_PROD_IOS.apps.googleusercontent.com',
    facebookAppId: 'REPLACE_PROD_FB_APP_ID',
    facebookClientToken: 'REPLACE_PROD_FB_CLIENT_TOKEN',
  },
};

let bootstrapped = false;

export async function bootstrapAuth(): Promise<void> {
  if (bootstrapped) {return;}
  bootstrapped = true;

  const clients = SOCIAL_CLIENTS[env.flavor];

  // ForgeRock: bắt buộc xong trước mọi lệnh login.
  await ForgeRock.configure({
    url: env.forgeRock.url,
    realm: env.forgeRock.realm,
    oauthClientId: env.forgeRock.clientId,
    oauthRedirectUri: env.forgeRock.redirectUri,
    oauthScope: env.forgeRock.scope,
    authServiceName: env.forgeRock.loginJourney,
  });

  // Google/Facebook: cấu hình đồng bộ, rẻ, không cần await.
  configureGoogleSignIn(clients.googleWebClientId, clients.googleIosClientId);
  configureFacebook(clients.facebookAppId, clients.facebookClientToken);

  // Apple không cần cấu hình trên iOS (capability là đủ); Android cấu hình
  // ngay tại chỗ gọi vì redirectUri phụ thuộc luồng.
}

/** Cho test và cho hot-reload lúc dev. */
export function resetAuthBootstrap(): void {
  bootstrapped = false;
}
