import * as Keychain from 'react-native-keychain';
import {Biometric, ForgeRock, WidgetBridge} from '@/shared/native';
import {resetAbility, setAbilityRules} from '@/shared/permissions';
import {StorageKey, clearSession, sessionStorage} from '@/shared/services/storage/mmkv';
import {queryClient} from '@/shared/services/query/queryClient';
import {authApi} from './authApi';
import {signOutFromSocialProviders} from './social';
import type {SessionProfile} from './types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Vòng đời phiên
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Bốn thứ, bốn nơi lưu, bốn cơ chế bảo vệ:
 *
 *  ┌──────────────────┬───────────────────────────┬──────────────────────────┐
 *  │ Thứ              │ Nằm ở đâu                 │ Ai gác                   │
 *  ├──────────────────┼───────────────────────────┼──────────────────────────┤
 *  │ access token     │ bộ nhớ của ForgeRock SDK  │ vòng đời process         │
 *  │ refresh token    │ SDK + Keychain/Keystore   │ sinh trắc học (mức 2)    │
 *  │ khoá ký giao dịch│ Secure Enclave / TEE      │ sinh trắc học (mức 3)    │
 *  │ hồ sơ + quyền    │ MMKV kho `session`        │ xoá sạch khi logout      │
 *  └──────────────────┴───────────────────────────┴──────────────────────────┘
 *
 *  Access token **không bao giờ** được ghi xuống đĩa ở tầng JS.
 */

const BIOMETRIC_GATE_SERVICE = 'vn.ttmedic.mapper.session-gate';

// ── Mức 2: cổng sinh trắc học để mở phiên ───────────────────────────────────

/**
 * Bật "đăng nhập bằng sinh trắc học".
 *
 * Cơ chế: lưu một secret ngẫu nhiên vào Keychain với
 * `accessControl: BIOMETRY_CURRENT_SET`. Hệ điều hành **không trả secret ra**
 * nếu chưa xác thực sinh trắc học — việc gác do OS làm, không phải app tự kiểm.
 *
 * `BIOMETRY_CURRENT_SET` (chứ không phải `BIOMETRY_ANY`) là chủ ý: thêm vân tay
 * mới vào máy sẽ **huỷ** mục Keychain này. Nếu dùng `BIOMETRY_ANY`, người khác
 * chỉ cần thêm vân tay của họ vào máy bạn là mở được phiên của bạn.
 */
export async function enableBiometricUnlock(secret: string): Promise<boolean> {
  const status = await Biometric.getStatus();
  if (!status.available) {return false;}

  await Keychain.setGenericPassword('mapper', secret, {
    service: BIOMETRIC_GATE_SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
  });

  sessionStorage.set(StorageKey.biometricEnabled, true);
  return true;
}

export function isBiometricUnlockEnabled(): boolean {
  return sessionStorage.getBoolean(StorageKey.biometricEnabled) ?? false;
}

/**
 * Mở khoá phiên. Trả `null` khi người dùng huỷ hoặc khoá đã bị vô hiệu.
 *
 * Không ném lỗi cho trường hợp huỷ: bấm Huỷ là hành động cố ý, không phải sự cố.
 */
export async function unlockWithBiometrics(promptTitle: string): Promise<string | null> {
  if (!isBiometricUnlockEnabled()) {return null;}

  try {
    const credentials = await Keychain.getGenericPassword({
      service: BIOMETRIC_GATE_SERVICE,
      authenticationPrompt: {title: promptTitle},
    });
    return credentials ? credentials.password : null;
  } catch {
    // Bị huỷ, hoặc mục Keychain đã bị OS huỷ do danh sách sinh trắc học đổi.
    return null;
  }
}

export async function disableBiometricUnlock(): Promise<void> {
  await Keychain.resetGenericPassword({service: BIOMETRIC_GATE_SERVICE});
  sessionStorage.remove(StorageKey.biometricEnabled);
}

// ── Hồ sơ + quyền ───────────────────────────────────────────────────────────

/**
 * Ghi hồ sơ phiên xuống MMKV và nạp rule vào CASL.
 *
 * Cache rule để lần mở app sau có quyền dùng ngay trong lúc chờ
 * `GET /auth/permissions`. Không cache thì mọi nút bị ẩn trong 1–2 giây đầu,
 * nhìn như app hỏng.
 */
export function persistSessionProfile(profile: SessionProfile): void {
  sessionStorage.set(StorageKey.lastUserId, profile.user.id);
  sessionStorage.set(StorageKey.permissionRules, JSON.stringify(profile.permissions));
  setAbilityRules(profile.permissions);
}

export function restoreCachedPermissions(): boolean {
  const raw = sessionStorage.getString(StorageKey.permissionRules);
  if (!raw) {return false;}
  try {
    setAbilityRules(JSON.parse(raw));
    return true;
  } catch {
    sessionStorage.remove(StorageKey.permissionRules);
    return false;
  }
}

// ── Logout ──────────────────────────────────────────────────────────────────

/**
 * ⚠️ THỨ TỰ Ở ĐÂY LÀ BẮT BUỘC, ĐỪNG SẮP XẾP LẠI.
 *
 *  1. **Xoá snapshot widget TRƯỚC TIÊN.** Hạng mục chặn phát hành ở docs/05
 *     mục 5: logout xong mà quên xoá thì dữ liệu của người dùng cũ nằm nguyên
 *     trên màn hình chính cho người cầm máy tiếp theo nhìn thấy. Phải `await`,
 *     và phải xong trước khi UI điều hướng đi đâu cả.
 *  2. Báo server thu hồi token — cho phép thất bại (mất mạng vẫn phải logout
 *     được ở máy).
 *  3. Xoá session cục bộ: SDK, Keychain, MMKV, cache query, CASL.
 *  4. Đăng xuất khỏi SDK Google/Facebook, nếu không lần sau nó tự chọn lại
 *     tài khoản cũ.
 *
 * Khoá ký giao dịch (mức 3) **không** bị xoá: nó gắn với thiết bị, không gắn
 * với phiên. Đăng nhập lại cùng tài khoản là dùng tiếp được, khỏi enroll lại.
 * Muốn xoá hẳn thì gọi `Biometric.deleteTransactionKeys()` trong luồng
 * "gỡ thiết bị khỏi tài khoản".
 */
export async function performLogout(): Promise<void> {
  await WidgetBridge.clearSnapshot();

  await Promise.allSettled([authApi.logout()]);

  await Promise.allSettled([
    ForgeRock.logout(),
    disableBiometricUnlock(),
    signOutFromSocialProviders(),
  ]);

  clearSession();
  queryClient.clear();
  resetAbility();
}
