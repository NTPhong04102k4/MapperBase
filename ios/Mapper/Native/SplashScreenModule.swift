import Foundation
import React
import UIKit

/// Splash screen native cho iOS.
///
/// iOS chỉ hiện `LaunchScreen.storyboard` tới khi window có root view controller
/// — tức là **trước khi** React Native kịp nạp bundle. Kết quả là người dùng
/// thấy một khoảng trắng giữa splash và màn hình đầu tiên.
///
/// Cách xử lý: lúc khởi động, dựng lại đúng LaunchScreen đó thành một UIView
/// phủ lên trên rootView, rồi gỡ ra khi JS gọi `hide()`. Không dùng ảnh PNG
/// riêng vì như vậy phải bảo trì hai bản thiết kế và dễ lệch nhau.
@objc(MapperSplashScreen)
class MapperSplashScreen: NSObject {

  /// Timeout an toàn: JS crash trước khi kịp gọi hide() thì cũng không kẹt.
  private static let autoHideAfter: TimeInterval = 8.0

  private static weak var splashView: UIView?
  private static var didHide = false

  /// Gọi từ AppDelegate ngay sau khi startReactNative.
  @objc
  static func present(on window: UIWindow) {
    guard let root = window.rootViewController?.view else { return }

    let storyboard = UIStoryboard(name: "LaunchScreen", bundle: nil)
    guard let launchVC = storyboard.instantiateInitialViewController(),
          let launchView = launchVC.view else { return }

    launchView.frame = root.bounds
    launchView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    root.addSubview(launchView)
    splashView = launchView
    didHide = false

    DispatchQueue.main.asyncAfter(deadline: .now() + autoHideAfter) {
      if !didHide {
        NSLog("[MapperSplashScreen] JS chưa gọi hide() sau \(autoHideAfter)s — tự ẩn.")
        hideNow(animated: true)
      }
    }
  }

  private static func hideNow(animated: Bool) {
    guard let view = splashView else { return }
    didHide = true
    guard animated else {
      view.removeFromSuperview()
      splashView = nil
      return
    }
    UIView.animate(
      withDuration: 0.25,
      animations: { view.alpha = 0 },
      completion: { _ in
        view.removeFromSuperview()
        splashView = nil
      }
    )
  }

  @objc(hide:rejecter:)
  func hide(_ resolve: @escaping RCTPromiseResolveBlock,
            rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      MapperSplashScreen.hideNow(animated: true)
      resolve(true)
    }
  }

  @objc(show:rejecter:)
  func show(_ resolve: @escaping RCTPromiseResolveBlock,
            rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if let window = UIApplication.shared.connectedScenes
        .compactMap({ ($0 as? UIWindowScene)?.keyWindow })
        .first {
        MapperSplashScreen.present(on: window)
      }
      resolve(true)
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool { true }
}
