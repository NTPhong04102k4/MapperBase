import {AppEnv} from '../native';
import buildInfo from './buildInfo.json';

/**
 * Cấu hình runtime của app.
 *
 * Nguồn: BuildConfig (Android) / Info.plist (iOS), do productFlavor và xcconfig
 * quyết định — KHÔNG có file .env, không có react-native-config.
 *
 * Vì sao: một giá trị cấu hình chỉ nên có đúng một nguồn. Flavor đã quyết định
 * mọi thứ ở tầng build rồi; thêm .env là tạo nguồn thứ hai, và chắc chắn sẽ có
 * lúc hai nguồn lệch nhau (điển hình: build prod nhưng .env còn trỏ dev).
 */

export type Flavor = 'dev' | 'staging' | 'prod';

export const env = {
  flavor: AppEnv.flavor as Flavor,
  isDev: AppEnv.flavor === 'dev',
  isStaging: AppEnv.flavor === 'staging',
  isProd: AppEnv.flavor === 'prod',
  isDebugBuild: AppEnv.isDebug,

  /** Cổng 443 là mặc định của https — không ghi ':443' vào URL. */
  apiBaseUrl: AppEnv.apiBaseUrl,
  apiTimeoutMs: 30_000,

  forgeRock: {
    url: AppEnv.forgeRockUrl,
    realm: AppEnv.forgeRockRealm,
    /**
     * OAuth2 client id đăng ký trong AM — khác nhau theo flavor.
     * Không phải secret (public client + PKCE) nên để trong code được.
     */
    clientId:
      AppEnv.flavor === 'prod'
        ? 'mapper-mobile'
        : AppEnv.flavor === 'staging'
        ? 'mapper-mobile-staging'
        : 'mapper-mobile-dev',
    redirectUri: `${AppEnv.applicationId}:/oauth2redirect`,
    scope: 'openid profile email offline_access',
    loginJourney: 'Login',
  },

  sePay: {
    env: AppEnv.sePayEnv,
    /** Backend của bạn đứng trước SePay — app không gọi thẳng SePay. */
    basePath: '/payments/sepay',
    /** Chu kỳ hỏi trạng thái đơn khi chờ chuyển khoản. */
    pollIntervalMs: 3_000,
    /** Ngừng hỏi sau ngần này; QR VietQR thường hết hạn 15 phút. */
    pollTimeoutMs: 15 * 60_000,
  },

  widget: {
    /** Hằng số đổi được theo bản build (docs/05 mục 4). dev = 1 phút để test nhanh. */
    refreshMinutes: AppEnv.widgetRefreshMinutes,
  },

  app: {
    name: AppEnv.appName,
    applicationId: AppEnv.applicationId,
    scheme:
      AppEnv.appScheme ??
      (AppEnv.flavor === 'prod'
        ? 'mapper'
        : AppEnv.flavor === 'staging'
        ? 'mapperstg'
        : 'mapperdev'),
  },

  /**
   * Cho màn About. `buildInfo.json` do scripts/bump.js sinh ra; số từ native là
   * số THẬT trong gói đã build nên ưu tiên nó khi hai bên lệch (thường là do
   * quên chạy bump trước khi build).
   */
  build: {
    version: AppEnv.versionName || buildInfo.version,
    number: AppEnv.buildNumber || 0,
    gitSha: buildInfo.gitSha,
    label: `${AppEnv.versionName} (${AppEnv.buildNumber}) · ${buildInfo.gitSha}`,
  },
} as const;

/** Bật log chi tiết ở dev/staging, tắt hẳn ở prod. */
export const isVerboseLogging = env.flavor !== 'prod';
