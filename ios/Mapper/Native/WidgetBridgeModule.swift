import Foundation
import React
import WidgetKit

/**
 Cầu JS ↔ WidgetKit.

 Dữ liệu đi qua **App Group** — đây là kênh duy nhất app và widget extension
 chia sẻ được, vì chúng là hai process khác nhau với sandbox riêng.

 Ba API, đối xứng với `MapperWidgetModule.kt`:
   writeSnapshot  – app ghi dữ liệu cho widget đọc
   clearSnapshot  – logout: XOÁ TRƯỚC khi điều hướng về Login
   reload         – nạp lại timeline ngay
 */
@objc(MapperWidget)
class MapperWidgetBridge: NSObject {

  static let snapshotKey = "mapper.widget.snapshot"
  static let updatedAtKey = "mapper.widget.updatedAt"
  static let loggedInKey = "mapper.widget.loggedIn"

  private var appGroupId: String {
    (Bundle.main.object(forInfoDictionaryKey: "AppGroupId") as? String) ?? ""
  }

  private var sharedDefaults: UserDefaults? {
    UserDefaults(suiteName: appGroupId)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

  @objc(writeSnapshot:resolver:rejecter:)
  func writeSnapshot(_ payloadJson: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let defaults = sharedDefaults else {
      reject("E_WIDGET_WRITE",
             "Không mở được App Group '\(appGroupId)'. Kiểm tra capability App Groups "
               + "trên CẢ target Mapper lẫn MapperWidgetExtension.",
             nil)
      return
    }
    defaults.set(payloadJson, forKey: Self.snapshotKey)
    defaults.set(Date().timeIntervalSince1970, forKey: Self.updatedAtKey)
    defaults.set(true, forKey: Self.loggedInKey)

    WidgetCenter.shared.reloadAllTimelines()
    resolve(true)
  }

  /**
   Phải await ở JS **trước khi** chuyển về màn Login.

   Nếu điều hướng trước rồi mới xoá, có một khoảng thời gian widget còn hiện
   dữ liệu của người dùng cũ ngay trên màn hình chính. docs/05 mục 5 xếp đây là
   hạng mục CHẶN PHÁT HÀNH.
   */
  @objc(clearSnapshot:rejecter:)
  func clearSnapshot(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let defaults = sharedDefaults else {
      // Không mở được App Group thì cũng không có gì để lộ — nhưng vẫn báo
      // thành công để luồng logout không bị kẹt.
      resolve(true)
      return
    }
    defaults.removeObject(forKey: Self.snapshotKey)
    defaults.removeObject(forKey: Self.updatedAtKey)
    defaults.set(false, forKey: Self.loggedInKey)

    WidgetCenter.shared.reloadAllTimelines()
    resolve(true)
  }

  @objc(reload:rejecter:)
  func reload(_ resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
    WidgetCenter.shared.reloadAllTimelines()
    resolve(true)
  }

  /// Có widget nào đang nằm trên màn hình chính không.
  @objc(isInstalled:rejecter:)
  func isInstalled(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    let refreshMinutes = Int(
      (Bundle.main.object(forInfoDictionaryKey: "WidgetRefreshMinutes") as? String) ?? "5"
    ) ?? 5

    WidgetCenter.shared.getCurrentConfigurations { result in
      switch result {
      case .success(let infos):
        resolve([
          "installed": !infos.isEmpty,
          "count": infos.count,
          "refreshMinutes": refreshMinutes,
        ])
      case .failure:
        resolve(["installed": false, "count": 0, "refreshMinutes": refreshMinutes])
      }
    }
  }
}
