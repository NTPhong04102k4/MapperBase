import FRAuth
import FRCore
import Foundation
import React

/**
 ═══════════════════════════════════════════════════════════════════════════
  ForgeRock IAM — native module iOS
 ═══════════════════════════════════════════════════════════════════════════

 Đối xứng 1-1 với `ForgeRockAuthModule.kt`: cùng tên module `MapperForgeRock`,
 cùng tên method, cùng hình dạng payload — nên `src/services/auth/forgerock.ts`
 không cần một dòng `Platform.select` nào.

 Kiến trúc journey/node: xem phần giải thích dài ở đầu file Kotlin. Tóm tắt:
 ForgeRock AM điều khiển luồng xác thực ở server; nếu native chỉ có
 `login(user, pass)` thì mỗi lần admin thêm một node (OTP, điều khoản, chọn
 IdP) là phải phát hành app mới.

 ⚠️ KIỂM CHỨNG BẮT BUỘC: API của FRAuth iOS 4.8.x phải đối chiếu lại với pod
 thật sau `pod install` (Pods/FRAuth/…). Chỗ hay lệch giữa các minor version là
 khởi tạo `FROptions` và chữ ký của `Node.next`.
 */
@objc(MapperForgeRock)
class MapperForgeRock: RCTEventEmitter {

  private static let eventNode = "forgerock:node"

  private var pendingNode: Node?
  private var pendingResolve: RCTPromiseResolveBlock?
  private var pendingReject: RCTPromiseRejectBlock?
  private var started = false
  private var hasListeners = false

  // MARK: - RCTEventEmitter

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! { [MapperForgeRock.eventNode] }

  override func startObserving() { hasListeners = true }

  override func stopObserving() { hasListeners = false }

  // MARK: - Cấu hình

  @objc(configure:resolver:rejecter:)
  func configure(_ config: NSDictionary,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    let info = Bundle.main.infoDictionary ?? [:]
    let frHost = (info["ForgeRockHost"] as? String) ?? ""
    let bundleId = Bundle.main.bundleIdentifier ?? ""

    let url = (config["url"] as? String) ?? "https://\(frHost)/am"
    let realm = (config["realm"] as? String) ?? (info["ForgeRockRealm"] as? String) ?? "alpha"
    let cookieName = (config["cookieName"] as? String) ?? "iPlanetDirectoryPro"
    let clientId = (config["oauthClientId"] as? String) ?? ""
    let redirectUri = (config["oauthRedirectUri"] as? String) ?? "\(bundleId):/oauth2redirect"
    let scope = (config["oauthScope"] as? String) ?? "openid profile email offline_access"
    let journey = (config["authServiceName"] as? String) ?? "Login"
    let registration = (config["registrationServiceName"] as? String) ?? "Registration"

    let options = FROptions(
      url: url,
      realm: realm,
      enableCookie: true,
      cookieName: cookieName,
      timeout: "30",
      authServiceName: journey,
      registrationServiceName: registration,
      oauthThreshold: "60",
      oauthClientId: clientId,
      oauthRedirectUri: redirectUri,
      oauthScope: scope
    )

    do {
      try FRAuth.start(options: options)
      started = true
      resolve(true)
    } catch {
      reject("E_FR_CONFIG", "Không cấu hình được ForgeRock SDK: \(error.localizedDescription)", error)
    }
  }

  // MARK: - Journey

  @objc(startJourney:rejecter:)
  func startJourney(_ resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard started else {
      reject("E_FR_NOT_STARTED", "Chưa gọi configure() trước khi login.", nil)
      return
    }
    guard pendingResolve == nil else {
      reject("E_FR_BUSY", "Đang có một journey khác chạy dở. Gọi cancelJourney() trước.", nil)
      return
    }

    pendingResolve = resolve
    pendingReject = reject
    pendingNode = nil

    FRUser.login { [weak self] (user: FRUser?, node: Node?, error: Error?) in
      self?.handleJourneyStep(user: user, node: node, error: error)
    }
  }

  /// `values`: map { "callbackIndex": "giá trị" } — xem doc bên Kotlin.
  @objc(submitNode:resolver:rejecter:)
  func submitNode(_ values: NSDictionary,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let node = pendingNode else {
      reject("E_FR_NO_NODE", "Không có node nào đang chờ. Gọi startJourney() trước.", nil)
      return
    }

    apply(values: values, to: node)

    // Resolve ngay; kết quả cuối cùng của journey đi qua promise của startJourney.
    resolve(true)

    node.next { [weak self] (user: FRUser?, next: Node?, error: Error?) in
      self?.handleJourneyStep(user: user, node: next, error: error)
    }
  }

  @objc(cancelJourney:rejecter:)
  func cancelJourney(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    pendingNode = nil
    pendingReject?("E_FR_CANCELLED", "Journey bị huỷ.", nil)
    pendingResolve = nil
    pendingReject = nil
    resolve(true)
  }

  /// Luồng rút gọn username + password. Gặp callback lạ thì reject, không đoán bừa.
  @objc(loginWithCredentials:password:resolver:rejecter:)
  func loginWithCredentials(_ username: String,
                            password: String,
                            resolver resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard started else {
      reject("E_FR_NOT_STARTED", "Chưa gọi configure() trước khi login.", nil)
      return
    }
    guard pendingResolve == nil else {
      reject("E_FR_BUSY", "Đang có một journey khác chạy dở.", nil)
      return
    }

    pendingResolve = resolve
    pendingReject = reject

    func step(user: FRUser?, node: Node?, error: Error?) {
      if let error = error {
        self.finish(error: ("E_FR_AUTH", error.localizedDescription))
        return
      }
      if user != nil {
        self.emitTokens()
        return
      }
      guard let node = node else {
        self.finish(error: ("E_FR_AUTH", "Journey kết thúc bất thường."))
        return
      }

      var unsupported: [String] = []
      for callback in node.callbacks {
        switch callback {
        case let cb as NameCallback:
          cb.setValue(username)
        case let cb as PasswordCallback:
          cb.setValue(password)
        case is TextOutputCallback:
          break  // chỉ là thông báo
        default:
          unsupported.append(String(describing: type(of: callback)))
        }
      }

      if !unsupported.isEmpty {
        self.finish(error: (
          "E_FR_UNSUPPORTED_NODE",
          "Journey trả về callback chưa hỗ trợ ở luồng rút gọn: \(unsupported.joined(separator: ", ")). "
            + "Dùng startJourney()/submitNode() để xử lý động."
        ))
        return
      }

      node.next { (u: FRUser?, n: Node?, e: Error?) in step(user: u, node: n, error: e) }
    }

    FRUser.login { (user: FRUser?, node: Node?, error: Error?) in
      step(user: user, node: node, error: error)
    }
  }

  // MARK: - Token

  @objc(getAccessToken:rejecter:)
  func getAccessToken(_ resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let user = FRUser.currentUser else {
      reject("E_FR_NO_SESSION", "Chưa đăng nhập.", nil)
      return
    }
    user.getAccessToken { (updated: FRUser?, error: Error?) in
      if let error = error {
        reject("E_FR_TOKEN", error.localizedDescription, error)
        return
      }
      guard let token = updated?.token else {
        reject("E_FR_TOKEN", "Không có access token.", nil)
        return
      }
      resolve(MapperForgeRock.serialize(token))
    }
  }

  /// Ép refresh, bỏ qua token còn hạn trong cache — dùng khi API trả 401 dù
  /// token chưa hết hạn (server thu hồi sớm).
  @objc(refreshToken:rejecter:)
  func refreshToken(_ resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let user = FRUser.currentUser else {
      reject("E_FR_NO_SESSION", "Chưa đăng nhập.", nil)
      return
    }
    user.refresh { (updated: FRUser?, error: Error?) in
      if let error = error {
        reject("E_FR_REFRESH", error.localizedDescription, error)
        return
      }
      guard let token = updated?.token else {
        reject("E_FR_REFRESH", "Refresh xong nhưng không có token.", nil)
        return
      }
      resolve(MapperForgeRock.serialize(token))
    }
  }

  @objc(getUserInfo:rejecter:)
  func getUserInfo(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let user = FRUser.currentUser else {
      reject("E_FR_NO_SESSION", "Chưa đăng nhập.", nil)
      return
    }
    user.getUserInfo { (info: UserInfo?, error: Error?) in
      if let error = error {
        reject("E_FR_USERINFO", error.localizedDescription, error)
        return
      }
      resolve([
        "sub": info?.sub ?? "",
        "name": info?.name ?? "",
        "email": info?.email ?? "",
        "familyName": info?.familyName ?? "",
        "givenName": info?.givenName ?? "",
      ])
    }
  }

  @objc(isAuthenticated:rejecter:)
  func isAuthenticated(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(FRUser.currentUser != nil)
  }

  /// ⚠️ JS phải xoá snapshot widget TRƯỚC khi điều hướng về Login (docs/05 mục 5).
  @objc(logout:rejecter:)
  func logout(_ resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
    FRUser.currentUser?.logout()
    resolve(true)
  }

  // MARK: - Nội bộ

  private func handleJourneyStep(user: FRUser?, node: Node?, error: Error?) {
    if let error = error {
      pendingNode = nil
      finish(error: ("E_FR_AUTH", error.localizedDescription))
      return
    }
    if user != nil {
      pendingNode = nil
      emitTokens()
      return
    }
    guard let node = node else {
      finish(error: ("E_FR_AUTH", "Journey kết thúc bất thường."))
      return
    }
    pendingNode = node
    if hasListeners {
      sendEvent(withName: MapperForgeRock.eventNode, body: MapperForgeRock.serialize(node))
    }
  }

  private func emitTokens() {
    guard let user = FRUser.currentUser else {
      finish(error: ("E_FR_NO_SESSION", "Journey báo thành công nhưng không có session."))
      return
    }
    user.getAccessToken { [weak self] (updated: FRUser?, error: Error?) in
      guard let self = self else { return }
      if let error = error {
        self.finish(error: ("E_FR_TOKEN", error.localizedDescription))
        return
      }
      guard let token = updated?.token else {
        self.finish(error: ("E_FR_TOKEN", "Không lấy được token sau khi login."))
        return
      }
      self.pendingResolve?(MapperForgeRock.serialize(token))
      self.pendingResolve = nil
      self.pendingReject = nil
    }
  }

  private func finish(error: (code: String, message: String)) {
    pendingNode = nil
    pendingReject?(error.code, error.message, nil)
    pendingResolve = nil
    pendingReject = nil
  }

  private func apply(values: NSDictionary, to node: Node) {
    for (index, callback) in node.callbacks.enumerated() {
      guard let raw = values["\(index)"] as? String else { continue }
      switch callback {
      case let cb as NameCallback: cb.setValue(raw)
      case let cb as PasswordCallback: cb.setValue(raw)
      case let cb as ChoiceCallback: cb.setValue(Int(raw) ?? cb.defaultChoice)
      case let cb as ConfirmationCallback: cb.setValue(Int(raw) ?? 0)
      default: break
      }
    }
  }

  private static func serialize(_ token: AccessToken) -> [String: Any] {
    [
      "accessToken": token.value,
      "refreshToken": token.refreshToken ?? NSNull(),
      "idToken": token.idToken ?? NSNull(),
      "tokenType": token.tokenType ?? "Bearer",
      "scope": token.scope ?? NSNull(),
      "expiresIn": token.expiresIn,
    ]
  }

  /// Chỉ map các callback đang thật sự dùng. Callback lạ vẫn trả về với
  /// `supported: false` để JS hiện thông báo tử tế thay vì màn trắng.
  private static func serialize(_ node: Node) -> [String: Any] {
    var callbacks: [[String: Any]] = []

    for (index, callback) in node.callbacks.enumerated() {
      var item: [String: Any] = [
        "index": index,
        "type": String(describing: type(of: callback)),
        "supported": true,
      ]

      switch callback {
      case let cb as NameCallback:
        item["prompt"] = cb.prompt ?? ""
      case let cb as PasswordCallback:
        item["prompt"] = cb.prompt ?? ""
        item["secure"] = true
      case let cb as TextOutputCallback:
        item["message"] = cb.message
        item["messageType"] = cb.messageType.rawValue
      case let cb as ChoiceCallback:
        item["prompt"] = cb.prompt ?? ""
        item["choices"] = cb.choices
        item["defaultChoice"] = cb.defaultChoice
      case let cb as ConfirmationCallback:
        item["prompt"] = cb.prompt ?? ""
        item["options"] = cb.options ?? []
      default:
        item["supported"] = false
      }

      callbacks.append(item)
    }

    return [
      "stage": node.stage ?? NSNull(),
      "header": node.pageHeader ?? NSNull(),
      "description": node.pageDescription ?? NSNull(),
      "callbacks": callbacks,
    ]
  }
}
