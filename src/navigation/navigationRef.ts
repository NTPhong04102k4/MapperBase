import {createNavigationContainerRef} from '@react-navigation/native';
import type {RootStackParamList} from './types';

/**
 * Điều hướng từ ngoài cây React (saga, handler push, deep link từ widget).
 *
 * Dùng rất tiết kiệm. Trong component luôn ưu tiên `useNavigation()`: ref bỏ
 * qua toàn bộ kiểm tra ngữ cảnh của React Navigation, nên dễ điều hướng tới
 * màn không tồn tại trong navigator đang hoạt động và nhận lỗi khó hiểu.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateWhenReady<Name extends keyof RootStackParamList>(
  ...args: undefined extends RootStackParamList[Name]
    ? [screen: Name] | [screen: Name, params: RootStackParamList[Name]]
    : [screen: Name, params: RootStackParamList[Name]]
): void {
  if (!navigationRef.isReady()) {
    // Navigator chưa dựng xong (app vừa mở từ deep link). Bên gọi nên đẩy vào
    // `ui.pendingDeepLink` thay vì gọi thẳng hàm này.
    console.warn('[navigationRef] Navigator chưa sẵn sàng, bỏ qua điều hướng.');
    return;
  }
  // @ts-expect-error — chữ ký biến thiên của React Navigation không diễn đạt được ở đây
  navigationRef.navigate(...args);
}
