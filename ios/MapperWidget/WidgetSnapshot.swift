import Foundation

/// Hình dạng dữ liệu app ghi vào App Group cho widget đọc.
/// Phải khớp `src/features/widget/types.ts` (WidgetSnapshot) và
/// `WidgetSnapshotStore.Snapshot` bên Android.
struct WidgetSnapshot {
  let loggedIn: Bool
  let title: String
  let primaryValue: String
  let secondaryValue: String
  /// Mốc thời gian đích để đếm ngược. Nhờ nó widget đổi mỗi 5 phút mà KHÔNG
  /// tốn ngân sách reload — xem `Provider.swift`.
  let countdownTarget: Date?
  let updatedAt: Date

  static let loggedOut = WidgetSnapshot(
    loggedIn: false,
    title: "",
    primaryValue: "",
    secondaryValue: "",
    countdownTarget: nil,
    updatedAt: Date(timeIntervalSince1970: 0)
  )

  /// Đọc từ App Group. Trả `loggedOut` khi thiếu dữ liệu hoặc JSON hỏng —
  /// tuyệt đối không hiện dữ liệu cũ một nửa.
  static func load(appGroupId: String) -> WidgetSnapshot {
    guard let defaults = UserDefaults(suiteName: appGroupId),
          defaults.bool(forKey: "mapper.widget.loggedIn"),
          let raw = defaults.string(forKey: "mapper.widget.snapshot"),
          let data = raw.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      return .loggedOut
    }

    let updatedAtEpoch = defaults.double(forKey: "mapper.widget.updatedAt")
    let countdownMs = json["countdownTargetMs"] as? Double ?? 0

    return WidgetSnapshot(
      loggedIn: true,
      title: json["title"] as? String ?? "",
      primaryValue: json["primaryValue"] as? String ?? "",
      secondaryValue: json["secondaryValue"] as? String ?? "",
      countdownTarget: countdownMs > 0 ? Date(timeIntervalSince1970: countdownMs / 1000) : nil,
      updatedAt: Date(timeIntervalSince1970: updatedAtEpoch)
    )
  }
}
