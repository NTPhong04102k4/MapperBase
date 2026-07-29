import {AppState, type AppStateStatus} from 'react-native';
import {QueryClient, focusManager, onlineManager} from '@tanstack/react-query';
import {ApiError} from '../http/errors';

/**
 * TanStack Query cấu hình cho môi trường mobile.
 *
 * Ba khác biệt so với mặc định (vốn viết cho web):
 *   1. `refetchOnWindowFocus` không tồn tại trên RN -> phải nối tay với AppState
 *   2. mạng di động chập chờn -> retry có backoff, nhưng KHÔNG retry lỗi 4xx
 *   3. người dùng mở app lại sau vài giờ -> staleTime ngắn hơn web
 */

const RETRY_MAX = 3;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30 giây: đủ để chuyển tab qua lại không gọi lại API, đủ ngắn để dữ liệu
      // không cũ tới mức gây hiểu nhầm.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (failureCount >= RETRY_MAX) {return false;}
        // Retry 401/403/404 là vô nghĩa và làm chậm màn hình lỗi.
        if (error instanceof ApiError) {return error.isRetryable;}
        return true;
      },
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnReconnect: true,
      // Mobile: mỗi lần mount lại màn hình mà gọi API là tốn data của người dùng.
      refetchOnMount: false,
    },
    mutations: {
      // Mutation KHÔNG tự retry: gửi lại một lệnh tạo đơn/thanh toán có thể tạo
      // hai bản ghi. Muốn retry thì phải có idempotency key và làm rõ ràng.
      retry: false,
    },
  },
});

/**
 * `focusManager` mặc định nghe sự kiện `visibilitychange` của DOM — trên RN
 * không có. Không nối tay thì `refetchOnWindowFocus` im lặng không bao giờ chạy.
 */
export function bindAppStateToQueryFocus(): () => void {
  const handler = (state: AppStateStatus) => {
    focusManager.setFocused(state === 'active');
  };
  const subscription = AppState.addEventListener('change', handler);
  return () => subscription.remove();
}

/**
 * Nối trạng thái mạng vào onlineManager.
 *
 * Base chưa cài `@react-native-community/netinfo` (một native dep nữa). Không
 * có nó, `onlineManager` luôn coi là online — hệ quả là query vẫn chạy và fail
 * bằng lỗi network thay vì bị pause. Chấp nhận được cho bản đầu.
 *
 * Khi cần chính xác:
 *   import NetInfo from '@react-native-community/netinfo';
 *   onlineManager.setEventListener(setOnline =>
 *     NetInfo.addEventListener(state => setOnline(!!state.isConnected)),
 *   );
 */
export function bindNetworkToQuery(): void {
  onlineManager.setOnline(true);
}
