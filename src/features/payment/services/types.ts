export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'cancelled';

export type CreateOrderRequest = {
  /** VND, số nguyên. SePay không nhận số lẻ. */
  amount: number;
  description: string;
  /** Mã đơn phía nghiệp vụ, để đối soát. */
  orderRef: string;
  /**
   * Chống tạo trùng đơn khi người dùng bấm hai lần hoặc mạng chập chờn khiến
   * client gửi lại. Backend phải trả về ĐÚNG đơn cũ nếu key đã tồn tại.
   */
  idempotencyKey: string;
};

export type SePayOrder = {
  orderId: string;
  orderRef: string;
  amount: number;
  status: PaymentStatus;

  /** Thông tin để người dùng chuyển khoản tay nếu không quét được QR. */
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;

  /**
   * ⚠️ Nội dung chuyển khoản là **khoá đối soát duy nhất** của SePay.
   * Người dùng sửa nội dung này thì webhook không map được về đơn, tiền vào
   * tài khoản nhưng đơn vẫn "pending". UI phải nhấn mạnh không được sửa, và
   * nên cho copy sẵn.
   */
  transferContent: string;

  /** Ảnh QR do backend dựng (qr.sepay.vn hoặc VietQR). Đã kèm số tiền + nội dung. */
  qrImageUrl: string;

  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
};

export type PaymentStatusResponse = {
  orderId: string;
  status: PaymentStatus;
  paidAt: string | null;
  /** Mã giao dịch ngân hàng, hiện ở màn kết quả để người dùng đối chiếu. */
  bankTransactionId: string | null;
  /** Số tiền thực nhận — có thể LỆCH với số tiền đơn. */
  receivedAmount: number | null;
};
