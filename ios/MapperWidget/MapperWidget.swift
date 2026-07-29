import SwiftUI
import WidgetKit

@main
struct MapperWidgetBundle: WidgetBundle {
  var body: some Widget {
    MapperWidget()
  }
}

struct MapperWidget: Widget {
  private let kind = "MapperWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MapperProvider()) { entry in
      MapperWidgetView(entry: entry)
        .containerBackground(for: .widget) { Color(.systemBackground) }
    }
    .configurationDisplayName("Mapper")
    .description("Xem nhanh thông tin Mapper ngay trên màn hình chính.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct MapperWidgetView: View {
  let entry: MapperEntry

  var body: some View {
    if entry.snapshot.loggedIn {
      loggedInBody
    } else {
      loginRequiredBody
    }
  }

  /// Chưa đăng nhập: CHỈ hiện lời mời.
  ///
  /// Hệ điều hành không cho ẩn widget khỏi gallery theo điều kiện runtime —
  /// widget luôn xuất hiện ngay khi app được cài. Nên đây là cách duy nhất để
  /// thực thi "chưa login thì không xem được" (docs/05 mục 5).
  /// Không hiện số liệu mờ, không hiện placeholder trông giống dữ liệu thật.
  private var loginRequiredBody: some View {
    VStack(spacing: 6) {
      Text("Mapper")
        .font(.system(size: 15, weight: .bold))
      Text("Đăng nhập để xem thông tin")
        .font(.system(size: 13))
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
      Text("Mở ứng dụng →")
        .font(.system(size: 13, weight: .medium))
        .foregroundStyle(.tint)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .widgetURL(URL(string: "\(appScheme)://login"))
  }

  private var loggedInBody: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(entry.snapshot.title.isEmpty ? "Mapper" : entry.snapshot.title)
        .font(.system(size: 13, weight: .medium))
        .foregroundStyle(.secondary)

      // .privacySensitive() để iOS tự che khi màn hình khoá và khi chụp
      // snapshot cho widget gallery.
      Text(entry.snapshot.primaryValue.isEmpty ? "—" : entry.snapshot.primaryValue)
        .font(.system(size: 26, weight: .bold))
        .privacySensitive()

      if !entry.snapshot.secondaryValue.isEmpty {
        Text(entry.snapshot.secondaryValue)
          .font(.system(size: 13))
          .foregroundStyle(.secondary)
          .privacySensitive()
      }

      // Phần đếm ngược: WidgetKit tự render lại theo đồng hồ hệ thống, không
      // tốn ngân sách reload và chạy cả khi app đã bị kill.
      if let target = entry.snapshot.countdownTarget, target > entry.date {
        Text(target, style: .timer)
          .font(.system(size: 15, weight: .semibold, design: .rounded))
          .monospacedDigit()
      }

      Spacer(minLength: 4)

      // Mốc "Cập nhật lúc" là BẮT BUỘC: dữ liệu server chỉ mới lại khi app ghi
      // snapshot, người dùng phải biết nó cũ tới đâu.
      Text("Cập nhật \(entry.snapshot.updatedAt, format: .dateTime.hour().minute())")
        .font(.system(size: 11))
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetURL(URL(string: "\(appScheme)://home"))
  }

  private var appScheme: String {
    (Bundle.main.object(forInfoDictionaryKey: "AppScheme") as? String) ?? "mapper"
  }
}
