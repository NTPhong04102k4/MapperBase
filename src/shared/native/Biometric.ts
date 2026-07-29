import {NativeModules} from 'react-native';
import type {BiometricStatus, TransactionKeyInfo, TransactionSignature} from './types';

type BiometricNative = {
  getStatus(): Promise<BiometricStatus>;
  unlockSession(title: string, subtitle: string, cancelLabel: string): Promise<boolean>;
  createTransactionKeys(): Promise<TransactionKeyInfo>;
  hasTransactionKeys(): Promise<boolean>;
  deleteTransactionKeys(): Promise<boolean>;
  signChallenge(
    challenge: string,
    title: string,
    subtitle: string,
    cancelLabel: string,
  ): Promise<TransactionSignature>;
};

const native = NativeModules.MapperBiometric as BiometricNative | undefined;

function requireNative(): BiometricNative {
  if (!native) {
    throw new Error('[Biometric] Native module MapperBiometric không tồn tại.');
  }
  return native;
}

/** Mã lỗi native trả về — dùng để phân nhánh xử lý, đừng so sánh chuỗi message. */
export const BiometricError = {
  /** User bấm huỷ. KHÔNG hiện toast lỗi — đây là hành động cố ý. */
  CANCELLED: 'E_BIOMETRIC_CANCELLED',
  UNAVAILABLE: 'E_BIOMETRIC_UNAVAILABLE',
  FAILED: 'E_BIOMETRIC_FAILED',
  /**
   * Khoá mức 3 bị huỷ vì danh sách sinh trắc học của máy thay đổi
   * (user thêm vân tay mới). PHẢI bắt riêng: hiện màn "đăng ký lại xác thực"
   * kèm OTP/mật khẩu, tuyệt đối không báo "lỗi hệ thống".
   */
  KEY_INVALIDATED: 'E_KEY_INVALIDATED',
  NO_ACTIVITY: 'E_NO_ACTIVITY',
} as const;

export const Biometric = {
  getStatus(): Promise<BiometricStatus> {
    return native
      ? native.getStatus()
      : Promise.resolve({
          status: 'NO_HARDWARE',
          available: false,
          biometryType: 'NONE',
          hasTransactionKey: false,
        });
  },

  /** MỨC 2 — mở phiên. Kết quả chỉ thiết bị biết, không gửi lên server. */
  unlockSession(title: string, subtitle = '', cancelLabel = 'Huỷ'): Promise<boolean> {
    return requireNative().unlockSession(title, subtitle, cancelLabel);
  },

  /** MỨC 3 — sinh cặp khoá trong TEE/Secure Enclave, trả public key để enroll. */
  createTransactionKeys(): Promise<TransactionKeyInfo> {
    return requireNative().createTransactionKeys();
  },

  hasTransactionKeys(): Promise<boolean> {
    return native ? native.hasTransactionKeys() : Promise.resolve(false);
  },

  deleteTransactionKeys(): Promise<boolean> {
    return native ? native.deleteTransactionKeys() : Promise.resolve(true);
  },

  /**
   * MỨC 3 — ký challenge của backend.
   *
   * ⚠️ `challenge` phải do SERVER sinh và phải chứa hash nội dung giao dịch.
   * Ký một nonce ngẫu nhiên suông chỉ chứng minh "có người chạm vân tay",
   * không chứng minh "đồng ý với đúng giao dịch này" — kẻ tấn công tráo được
   * nội dung. Xem docs/05 mục 6.
   */
  signChallenge(
    challenge: string,
    title: string,
    subtitle = '',
    cancelLabel = 'Huỷ',
  ): Promise<TransactionSignature> {
    return requireNative().signChallenge(challenge, title, subtitle, cancelLabel);
  },
};
