import {env} from '@/shared/config/env';
import {assertCan} from '@/shared/permissions';
import {api} from '@/shared/services/http/client';
import type {CreateOrderRequest, PaymentStatusResponse, SePayOrder} from './types';

const base = env.sePay.basePath; // '/payments/sepay'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SePay — app KHÔNG gọi thẳng SePay
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Toàn bộ luồng đi qua backend của bạn. Lý do không thương lượng:
 *
 *   1. API key của SePay không được nằm trong app. App bị dịch ngược trong
 *      vài phút, và key đó cho phép đọc lịch sử giao dịch của cả tài khoản.
 *   2. Nguồn sự thật của "đã trả tiền chưa" là **webhook SePay → backend**.
 *      Client tự hỏi SePay rồi tự kết luận là mở đường cho giả mạo: chỉ cần
 *      chặn response là "thanh toán thành công".
 *   3. Đối soát, hoàn tiền, xử lý số tiền lệch — đều là việc của backend.
 *
 *  Client chỉ làm hai việc: hiện QR, và **hỏi backend** trạng thái.
 */
export const sepayApi = {
  createOrder: (payload: CreateOrderRequest) => {
    // Tầng phân quyền client: chặn ngay thay vì để người dùng điền xong form
    // rồi mới nhận 403.
    assertCan('pay', 'Payment');
    return api.post<SePayOrder>(`${base}/orders`, payload);
  },

  getOrder: (orderId: string) =>
    api.get<SePayOrder>(`${base}/orders/${encodeURIComponent(orderId)}`),

  /**
   * Hỏi trạng thái. Đây là endpoint được poll, nên nó phải rẻ ở phía backend —
   * chỉ đọc một dòng trong DB, không gọi ngược sang SePay.
   */
  getStatus: (orderId: string) =>
    api.get<PaymentStatusResponse>(`${base}/orders/${encodeURIComponent(orderId)}/status`),

  cancelOrder: (orderId: string) =>
    api.post<SePayOrder>(`${base}/orders/${encodeURIComponent(orderId)}/cancel`),

  history: (params?: {page?: number; size?: number; status?: string}) =>
    api.get<{items: SePayOrder[]; total: number}>(`${base}/orders`, {params}),
};

/**
 * Dựng URL ảnh QR ở client.
 *
 * Chỉ dùng khi backend **không** trả `qrImageUrl` (fallback). Bình thường hãy
 * dùng URL backend trả về: nội dung chuyển khoản do backend sinh mới là cái
 * webhook đối soát được, client tự ghép là sai lệch ngay.
 */
export function buildSePayQrUrl(
  order: Pick<SePayOrder, 'accountNumber' | 'bankCode' | 'amount' | 'transferContent'>,
): string {
  const params = new URLSearchParams({
    acc: order.accountNumber,
    bank: order.bankCode,
    amount: String(order.amount),
    des: order.transferContent,
    template: 'compact',
  });
  return `https://qr.sepay.vn/img?${params.toString()}`;
}
