import {useCallback, useState} from 'react';

/**
 * Trạng thái mở/đóng cho modal cục bộ trong một màn hình.
 *
 * Dùng cái này khi modal chỉ thuộc về một màn hình. Chỉ đưa modal lên Redux
 * (`ModalHost`) khi nó cần mở được từ **ngoài** cây React — ví dụ saga muốn hỏi
 * xác nhận, hoặc deep link mở thẳng một modal.
 */
export function useModal(initial = false) {
  const [visible, setVisible] = useState(initial);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => setVisible(v => !v), []);

  return {visible, open, close, toggle};
}

/**
 * Biến thể trả kèm dữ liệu: mở modal cho một bản ghi cụ thể.
 *
 * ```ts
 * const orderModal = useModalWith<Order>();
 * <Pressable onPress={() => orderModal.open(order)} />
 * <BottomModal visible={orderModal.visible} onClose={orderModal.close}>
 *   {orderModal.data ? <OrderDetail order={orderModal.data} /> : null}
 * </BottomModal>
 * ```
 *
 * `data` KHÔNG bị xoá ngay khi close: nếu xoá, nội dung biến mất trước khi
 * animation đóng chạy xong và người dùng thấy modal rỗng nháy một cái.
 */
export function useModalWith<T>() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((value: T) => {
    setData(value);
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  /** Gọi sau khi animation đóng xong nếu cần giải phóng bộ nhớ. */
  const clear = useCallback(() => setData(null), []);

  return {visible, data, open, close, clear};
}
