import dayjs from 'dayjs';

/**
 * Định dạng tiền VND.
 *
 * `Intl.NumberFormat` với Hermes: từ RN 0.73 Hermes đã bật `intl` mặc định trên
 * cả hai nền tảng, nên dùng được. Vẫn có fallback tự ghép vì nếu ai đó đổi sang
 * JSC bản không có ICU thì `Intl` biến mất và mọi chỗ hiện tiền sẽ crash.
 */
export function formatVnd(amount: number): string {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;
  }
}

export function formatNumber(value: number): string {
  try {
    return new Intl.NumberFormat('vi-VN').format(value);
  } catch {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}

export function formatDateTime(value: string | number | Date): string {
  return dayjs(value).format('HH:mm · DD/MM/YYYY');
}

export function formatTime(value: string | number | Date): string {
  return dayjs(value).format('HH:mm');
}

/** mm:ss cho đồng hồ đếm ngược. */
export function formatDuration(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Che bớt số tài khoản khi hiện ở chỗ công khai: 1903 **** 5678 */
export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 8) {
    return accountNumber;
  }
  const head = accountNumber.slice(0, 4);
  const tail = accountNumber.slice(-4);
  return `${head} **** ${tail}`;
}
