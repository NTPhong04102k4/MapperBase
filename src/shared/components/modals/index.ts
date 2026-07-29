// Chỉ phần modal dùng chung, không biết gì về modal cụ thể của app.
// `ModalHost` + `modalRegistry` nằm ở '@/app/modals' vì chúng phải biết feature.
export {AppModal} from './AppModal';
export type {AppModalProps, ModalVariant} from './AppModal';
export {BottomModal, CenterModal, HeaderModal, LeftModal, RightModal} from './variants';
export {MODAL_IDS} from './ids';
export type {ModalId} from './ids';
export {useModal, useModalWith} from './useModal';
