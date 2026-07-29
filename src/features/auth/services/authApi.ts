import {api} from '@/shared/services/http/client';
import type {PermissionPayload} from '@/shared/permissions';
import type {
  AuthUser,
  BiometricEnrollRequest,
  SessionProfile,
  SocialLoginPayload,
  TransactionChallenge,
} from './types';

/**
 * Hợp đồng với backend.
 *
 * Chỉ khai đúng những endpoint đã chốt ở `docs/00-TONG-QUAN.md` mục 5 — không
 * đoán thêm. Endpoint nào backend chưa làm thì lộ ra rõ ràng ở đây, thay vì bị
 * giấu trong component.
 */
export const authApi = {
  /**
   * Đổi token của IdP lấy phiên của hệ thống.
   * Backend verify chữ ký token với Google/Apple/Facebook rồi mới cấp phiên.
   */
  socialLogin: (payload: SocialLoginPayload) =>
    api.post<SessionProfile>('/auth/social', payload, {skipAuth: true}),

  me: () => api.get<AuthUser>('/auth/me'),

  /**
   * Bộ rule CASL của người dùng hiện tại.
   *
   * Tách khỏi /auth/me vì quyền đổi thường xuyên hơn hồ sơ, và cần refetch
   * riêng sau khi admin đổi vai trò mà không phải tải lại toàn bộ hồ sơ.
   */
  permissions: () => api.get<PermissionPayload>('/auth/permissions'),

  /** Thu hồi token phía server. Vẫn phải gọi dù SDK đã xoá session cục bộ. */
  logout: () => api.post<void>('/auth/logout'),

  /**
   * Xoá tài khoản. Với người đăng nhập bằng Apple, backend BẮT BUỘC phải revoke
   * Apple token — yêu cầu 5.1.1(v) của App Store, thiếu là bị từ chối review.
   */
  deleteAccount: () => api.delete<void>('/auth/account'),

  // ── Biometric mức 3 ───────────────────────────────────────────────────────

  enrollBiometric: (payload: BiometricEnrollRequest) =>
    api.post<{enrolled: boolean}>('/biometric/enroll', payload),

  revokeBiometric: (deviceId: string) =>
    api.delete<void>(`/biometric/enroll/${encodeURIComponent(deviceId)}`),

  /** Xin challenge cho một giao dịch cụ thể. Hết hạn sau 30–60 giây. */
  requestChallenge: (txId: string) =>
    api.post<TransactionChallenge>(`/transactions/${encodeURIComponent(txId)}/challenge`),

  /** Gửi chữ ký để backend verify bằng public key đã enroll. */
  confirmTransaction: (txId: string, signature: string) =>
    api.post<{confirmed: boolean}>(`/transactions/${encodeURIComponent(txId)}/confirm`, {
      signature,
    }),

  // ── Push token ────────────────────────────────────────────────────────────

  /**
   * Gắn FCM/APNs token theo **deviceId**, không theo user.
   * Gắn theo user thì logout trên máy A sẽ xoá nhầm đăng ký của máy B.
   */
  registerPushToken: (deviceId: string, token: string, platform: 'ios' | 'android') =>
    api.post<void>('/devices/push-token', {deviceId, token, platform}),

  unregisterPushToken: (deviceId: string) =>
    api.delete<void>(`/devices/push-token/${encodeURIComponent(deviceId)}`),
};
