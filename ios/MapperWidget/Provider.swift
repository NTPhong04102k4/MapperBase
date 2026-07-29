import WidgetKit

struct MapperEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot
}

/**
 ═══════════════════════════════════════════════════════════════════════════
  Vì sao pre-compute timeline chứ không "reload mỗi 5 phút"
 ═══════════════════════════════════════════════════════════════════════════

  iOS cấp cho mỗi widget một **ngân sách ~40–70 lần reload/ngày** (≈ 20–35
  phút/lần). Xin `.after(5 phút)` chỉ là ĐỀ NGHỊ — hệ thống sẽ bỏ qua. 5 phút ×
  24h = 288 lần/ngày, vượt ngân sách khoảng 5 lần.

  Nhưng: `getTimeline` trả về **một MẢNG entry có mốc thời gian tương lai**.
  WidgetKit render sẵn tất cả và tự đổi sang entry kế tiếp đúng giờ.
  **Chuyển entry KHÔNG tốn ngân sách** — chỉ *nạp lại timeline* mới tốn.

      reloadTimeline (tốn 1 budget) ──> sinh 12 entry: T+0, T+5', ..., T+55'
                                        └─> widget đổi hình mỗi 5 phút trong 1 giờ

  ⇒ Phần dữ liệu **suy ra được từ thời gian** (đếm ngược, ETA, tiến độ) đổi
    đúng mỗi 5 phút, chạy cả khi app đã bị kill.
  ⇒ Phần dữ liệu **từ server** thì không: nó chỉ mới lại khi app ghi snapshot
    (mở app / nhận push sự kiện). Mốc "Cập nhật lúc HH:mm" trên widget là để
    người dùng biết điều đó thay vì tin nhầm là realtime.

  docs/05-CHOT-QUYET-DINH.md mục 4 & 8bis.
 */
struct MapperProvider: TimelineProvider {

  /// Đọc từ Info.plist của extension — giá trị đến từ xcconfig theo flavor.
  private var appGroupId: String {
    (Bundle.main.object(forInfoDictionaryKey: "AppGroupId") as? String) ?? ""
  }

  private var refreshMinutes: Int {
    let raw = (Bundle.main.object(forInfoDictionaryKey: "WidgetRefreshMinutes") as? String) ?? "5"
    return max(Int(raw) ?? 5, 1)
  }

  /// Khung xương hiện trong widget gallery. Không được chứa dữ liệu thật.
  func placeholder(in context: Context) -> MapperEntry {
    MapperEntry(date: Date(), snapshot: .loggedOut)
  }

  func getSnapshot(in context: Context, completion: @escaping (MapperEntry) -> Void) {
    completion(MapperEntry(date: Date(), snapshot: WidgetSnapshot.load(appGroupId: appGroupId)))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<MapperEntry>) -> Void) {
    let snapshot = WidgetSnapshot.load(appGroupId: appGroupId)
    let now = Date()

    // Chưa login: một entry duy nhất, không cần nhịp gì cả.
    guard snapshot.loggedIn else {
      let timeline = Timeline(
        entries: [MapperEntry(date: now, snapshot: snapshot)],
        policy: .after(now.addingTimeInterval(60 * 60))
      )
      completion(timeline)
      return
    }

    // Sinh sẵn entry cho 1 giờ tới, mỗi `refreshMinutes` phút một entry.
    let step = TimeInterval(refreshMinutes * 60)
    let count = max(Int(3600 / step), 1)
    let entries = (0..<count).map { index in
      MapperEntry(date: now.addingTimeInterval(step * Double(index)), snapshot: snapshot)
    }

    // Hết 1 giờ thì xin nạp lại timeline. Đây là lần DUY NHẤT tốn ngân sách.
    completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(3600))))
  }
}
