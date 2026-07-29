import React from 'react';
import {AppModal, type AppModalProps} from './AppModal';

/**
 * Năm biến thể có sẵn. Tất cả chỉ là `AppModal` với `variant` cố định — mục
 * đích là chỗ gọi đọc được ngay ý định (`<RightModal>` rõ hơn
 * `<AppModal variant="right">`), và tránh gõ nhầm chuỗi variant.
 */

type VariantProps = Omit<AppModalProps, 'variant'>;

/** Trượt lên từ đáy. Mặc định cho danh sách lựa chọn, form ngắn, chi tiết. */
export function BottomModal(props: VariantProps) {
  return <AppModal {...props} variant="bottom" />;
}

/** Hộp thoại giữa màn hình. Dùng cho xác nhận — KHÔNG vuốt đóng được, có chủ ý. */
export function CenterModal(props: VariantProps) {
  return <AppModal {...props} variant="center" dismissOnSwipe={false} />;
}

/**
 * Đổ xuống từ đỉnh. Hợp với bộ lọc, thông báo, chuyển ngữ cảnh.
 * Nội dung phải ngắn: nó che phần trên cùng — nơi người dùng đang nhìn.
 */
export function HeaderModal(props: VariantProps) {
  return <AppModal {...props} variant="header" />;
}

/** Panel trượt từ trái. Quy ước là điều hướng/menu. */
export function LeftModal(props: VariantProps) {
  return <AppModal {...props} variant="left" />;
}

/** Panel trượt từ phải. Quy ước là bộ lọc/chi tiết/thao tác phụ. */
export function RightModal(props: VariantProps) {
  return <AppModal {...props} variant="right" />;
}
