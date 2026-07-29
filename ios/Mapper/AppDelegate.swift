import FBSDKCoreKit
import GoogleSignIn
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Facebook SDK phải khởi tạo TRƯỚC mọi luồng đăng nhập.
    ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "Mapper",
      in: window,
      launchOptions: launchOptions
    )

    // Phủ LaunchScreen lên rootView và giữ tới khi JS gọi SplashScreen.hide().
    // Không có bước này thì có một khoảng trắng giữa lúc iOS gỡ launch screen
    // và lúc RN vẽ được frame đầu tiên.
    if let window = window {
      MapperSplashScreen.present(on: window)
    }

    return true
  }

  /// Chuyển tiếp URL cho các SDK đăng nhập.
  ///
  /// ⚠️ RN 0.79 dùng AppDelegate viết bằng **Swift**, còn hầu hết tài liệu của
  /// Facebook/Google vẫn viết cho Objective-C. Thiếu hàm này thì luồng OAuth mở
  /// Safari xong quay lại app và **treo im lặng** — không log lỗi nào, rất tốn
  /// thời gian để lần ra.
  ///
  /// Thứ tự quan trọng: hỏi từng SDK, SDK nào nhận thì dừng. RCTLinkingManager
  /// để cuối cho deep link của chính app (widget, SePay return).
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if ApplicationDelegate.shared.application(app, open: url, options: options) {
      return true
    }
    if GIDSignIn.sharedInstance.handle(url) {
      return true
    }
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  /// Universal Links (nếu sau này bật associated domains).
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
