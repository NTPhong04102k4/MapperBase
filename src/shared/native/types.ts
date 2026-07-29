export type Flavor = 'dev' | 'staging' | 'prod';

/** Hằng số do MapperAppEnv (Kotlin/Swift) export ra. Hai nền tảng cùng shape. */
export type NativeAppEnv = {
  flavor: Flavor;
  apiBaseUrl: string;
  forgeRockUrl: string;
  forgeRockRealm: string;
  sePayEnv: 'sandbox' | 'production';
  widgetRefreshMinutes: number;
  applicationId: string;
  versionName: string;
  buildNumber: number;
  isDebug: boolean;
  appName: string;
  /** Chỉ có trên iOS. */
  appGroupId?: string;
  appScheme?: string;
};

// ── ForgeRock ───────────────────────────────────────────────────────────────

export type ForgeRockTokens = {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  tokenType: string;
  scope: string | null;
  /** Giây còn lại tới khi hết hạn, tại thời điểm nhận. */
  expiresIn: number;
};

export type ForgeRockCallback = {
  index: number;
  /** Tên class callback của SDK: NameCallback, PasswordCallback, … */
  type: string;
  /** false = callback này chưa được map; UI phải báo "chưa hỗ trợ", không im lặng. */
  supported: boolean;
  prompt?: string;
  secure?: boolean;
  message?: string;
  messageType?: number;
  choices?: string[];
  defaultChoice?: number;
  options?: string[];
};

export type ForgeRockNode = {
  stage: string | null;
  header: string | null;
  description: string | null;
  callbacks: ForgeRockCallback[];
};

// ── Biometric ───────────────────────────────────────────────────────────────

export type BiometryType = 'FACE_ID' | 'TOUCH_ID' | 'OPTIC_ID' | 'BIOMETRIC' | 'NONE';

export type BiometricStatusCode =
  | 'AVAILABLE'
  | 'NONE_ENROLLED'
  | 'NO_HARDWARE'
  | 'HW_UNAVAILABLE'
  | 'LOCKED_OUT'
  | 'SECURITY_UPDATE_REQUIRED'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

export type BiometricStatus = {
  status: BiometricStatusCode;
  available: boolean;
  biometryType: BiometryType;
  /** Đã enroll khoá mức 3 (ký giao dịch) chưa. */
  hasTransactionKey: boolean;
};

export type TransactionKeyInfo = {
  /** X.509/SPKI base64 — gửi lên POST /biometric/enroll. */
  publicKey: string;
  format: 'X.509';
  algorithm: 'EC-P256';
  keyAlias: string;
  /** Android StrongBox hoặc iOS Secure Enclave. */
  strongBoxBacked: boolean;
};

export type TransactionSignature = {
  /** DER X9.62, base64. */
  signature: string;
  algorithm: 'SHA256withECDSA';
  keyAlias: string;
};

// ── Widget ──────────────────────────────────────────────────────────────────

export type WidgetInstallInfo = {
  installed: boolean;
  count: number;
  refreshMinutes: number;
};
