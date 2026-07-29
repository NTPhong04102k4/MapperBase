import type {PermissionRule} from '@/shared/permissions';

export type SocialProvider = 'google' | 'facebook' | 'apple';

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  /** Vai trò chỉ để hiển thị. Quyền thật nằm ở `permissions` (CASL). */
  roles: string[];
};

export type SessionProfile = {
  user: AuthUser;
  permissions: PermissionRule[];
  permissionVersion?: string;
};

/** Payload gửi lên POST /auth/social sau khi lấy được token từ SDK của IdP. */
export type SocialLoginPayload = {
  provider: SocialProvider;
  /** Google/Apple trả idToken; Facebook trả accessToken. */
  idToken?: string;
  accessToken?: string;
  /** Bắt buộc với Apple để backend chống replay. */
  nonce?: string;
  /** Apple chỉ trả tên/email ĐÚNG MỘT LẦN, ở lần cấp quyền đầu tiên. */
  fullName?: string | null;
  email?: string | null;
  deviceId: string;
  platform: 'ios' | 'android';
};

export type AuthStatus =
  | 'booting' // đang khôi phục phiên
  | 'unauthenticated'
  | 'locked' // có phiên nhưng cần mở khoá bằng sinh trắc học
  | 'authenticated';

// ── Biometric mức 3 ─────────────────────────────────────────────────────────

export type BiometricEnrollRequest = {
  publicKey: string;
  algorithm: 'EC-P256';
  format: 'X.509';
  deviceId: string;
  platform: 'ios' | 'android';
  strongBoxBacked: boolean;
};

export type TransactionChallenge = {
  txId: string;
  /**
   * ⚠️ PHẢI chứa hash nội dung giao dịch, không chỉ nonce.
   * Ký nonce suông chỉ chứng minh "có người chạm vân tay", không chứng minh
   * "đồng ý với đúng giao dịch này". Xem docs/05 mục 6.
   */
  challenge: string;
  expiresAt: string;
};
