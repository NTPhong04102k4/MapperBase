/**
 * Id của modal toàn cục.
 *
 * Tách khỏi `src/app/modals/registry.tsx` (nơi khai báo component thật) vì
 * registry phải import feature để dựng nội dung modal — nếu feature lại import
 * ngược registry để lấy id thì thành vòng feature ↔ app. Id chỉ là hằng số
 * chuỗi, không phụ thuộc gì, nên sống ở shared được và ai cũng dùng được.
 */
export const MODAL_IDS = {
  confirmSignOut: 'confirmSignOut',
  permissionDenied: 'permissionDenied',
} as const;

export type ModalId = (typeof MODAL_IDS)[keyof typeof MODAL_IDS];
