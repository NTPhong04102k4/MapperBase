import {ForgeRock} from '../../native';

/**
 * Nguồn access token cho interceptor.
 *
 * Tách khỏi `client.ts` để:
 *   1. tránh import vòng (client ← saga ← service ← client)
 *   2. test được interceptor bằng cách thay provider giả
 *   3. có MỘT chỗ duy nhất giữ cơ chế **single-flight** cho refresh
 */

type TokenProvider = {
  getAccessToken(): Promise<string | null>;
  refresh(): Promise<string | null>;
};

/**
 * Mặc định: hỏi ForgeRock SDK. SDK đã tự lưu token trong storage mã hoá và tự
 * refresh khi sắp hết hạn, nên app KHÔNG giữ bản sao access token ở JS.
 */
const forgeRockProvider: TokenProvider = {
  async getAccessToken() {
    try {
      const tokens = await ForgeRock.getAccessToken();
      return tokens.accessToken;
    } catch {
      return null;
    }
  },
  async refresh() {
    const tokens = await ForgeRock.refreshToken();
    return tokens.accessToken;
  },
};

let provider: TokenProvider = forgeRockProvider;

/** Dùng trong test hoặc khi tạm chuyển sang IdP khác. */
export function setTokenProvider(next: TokenProvider): void {
  provider = next;
}

export function getAccessToken(): Promise<string | null> {
  return provider.getAccessToken();
}

// ─── Single-flight refresh ───────────────────────────────────────────────────

let inFlightRefresh: Promise<string | null> | null = null;

/**
 * Chỉ cho phép MỘT lần refresh chạy tại một thời điểm.
 *
 * Kịch bản không có cơ chế này: màn hình mở 5 request song song, cả 5 cùng nhận
 * 401, cả 5 cùng gọi refresh. Với refresh token **rotate** (ForgeRock mặc định
 * bật), lần refresh đầu làm token cũ vô hiệu ⇒ 4 lần còn lại thất bại ⇒ app đá
 * người dùng ra màn Login dù phiên vẫn hợp lệ. Đây là bug rất khó tái hiện vì
 * nó chỉ xảy ra khi nhiều request trùng thời điểm.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = provider
    .refresh()
    .catch(() => null)
    .finally(() => {
      inFlightRefresh = null;
    });

  return inFlightRefresh;
}

/** Có lần refresh nào đang chạy không — hữu ích cho log/debug. */
export function isRefreshing(): boolean {
  return inFlightRefresh !== null;
}
