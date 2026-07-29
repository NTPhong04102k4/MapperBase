/**
 * Hợp đồng dữ liệu giữa app và widget.
 *
 * Phải khớp CHÍNH XÁC với:
 *   - `WidgetSnapshotStore.Snapshot`   (Kotlin, đọc từ SharedPreferences)
 *   - `WidgetSnapshot`                 (Swift, đọc từ App Group UserDefaults)
 *
 * Đổi shape ở đây mà quên đổi hai file kia thì widget im lặng hiện dữ liệu
 * rỗng — không có lỗi nào được ném ra, vì cả hai bên đều dùng `optString`/
 * `as? String` với giá trị mặc định.
 */
export type WidgetSnapshot = {
  /** Nhãn nhỏ phía trên, ví dụ "Ca làm hôm nay". */
  title: string;
  /** Con số/chuỗi lớn ở giữa. */
  primaryValue: string;
  /** Dòng phụ bên dưới. */
  secondaryValue: string;
  /**
   * Epoch ms của mốc cần đếm ngược tới.
   *
   * Đây là trường quan trọng nhất về mặt kỹ thuật: nó cho phép widget đổi hiển
   * thị **mỗi 5 phút mà không cần app sống và không tốn ngân sách reload**.
   *   - iOS: `Text(date, style: .timer)` — WidgetKit tự vẽ lại
   *   - Android: pre-compute entry / Chronometer trong process của launcher
   *
   * Đặt `0` hoặc bỏ trống nếu widget không có phần đếm ngược.
   */
  countdownTargetMs?: number;
};

export const EMPTY_SNAPSHOT: WidgetSnapshot = {
  title: '',
  primaryValue: '',
  secondaryValue: '',
  countdownTargetMs: 0,
};
