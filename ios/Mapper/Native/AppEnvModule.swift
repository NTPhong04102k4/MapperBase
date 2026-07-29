import Foundation

/// Đưa cấu hình theo flavor từ Info.plist (đến từ xcconfig) sang JS.
///
/// Đối xứng với `AppEnvModule.kt` bên Android: cùng tên module `MapperAppEnv`,
/// cùng bộ key, nên `src/config/env.ts` không cần `Platform.select`.
///
/// Dùng `constantsToExport` để JS đọc đồng bộ ngay lúc import — không có race
/// lúc khởi động, không cần await.
@objc(MapperAppEnv)
class MapperAppEnv: NSObject {

  private func str(_ key: String, _ fallback: String = "") -> String {
    (Bundle.main.object(forInfoDictionaryKey: key) as? String) ?? fallback
  }

  @objc
  func constantsToExport() -> [AnyHashable: Any]! {
    let host = str("ApiHost")
    let frHost = str("ForgeRockHost")
    let refreshMinutes = Int(str("WidgetRefreshMinutes", "5")) ?? 5

    return [
      "flavor": str("FlavorEnv", "prod"),
      // Cổng 443 là mặc định của https — ghi ":443" vào URL chỉ làm rối log và
      // dễ gây lệch khi so origin. Giữ nguyên dạng chuẩn.
      "apiBaseUrl": "https://\(host)",
      "forgeRockUrl": "https://\(frHost)/am",
      "forgeRockRealm": str("ForgeRockRealm", "alpha"),
      "sePayEnv": str("SePayEnv", "production"),
      "widgetRefreshMinutes": refreshMinutes,
      "applicationId": Bundle.main.bundleIdentifier ?? "",
      "versionName": str("CFBundleShortVersionString", "0.0.0"),
      "buildNumber": Int(str("CFBundleVersion", "0")) ?? 0,
      "isDebug": MapperAppEnv.isDebugBuild,
      "appName": str("CFBundleDisplayName", "Mapper"),
      "appGroupId": str("AppGroupId"),
      "appScheme": str("AppScheme"),
    ]
  }

  private static var isDebugBuild: Bool {
    #if DEBUG
      return true
    #else
      return false
    #endif
  }

  @objc
  static func requiresMainQueueSetup() -> Bool { false }
}
