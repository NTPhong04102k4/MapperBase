import Foundation
import LocalAuthentication
import React
import Security

/**
 ═══════════════════════════════════════════════════════════════════════════
  Biometric iOS — HAI mức, HAI cặp khoá, KHÔNG dùng lẫn
 ═══════════════════════════════════════════════════════════════════════════

  MỨC 2 — mở phiên (`unlockSession`)
      LAContext.evaluatePolicy → boolean. Chỉ thiết bị biết. Dùng để mở khoá
      refresh token trong Keychain.

  MỨC 3 — xác nhận giao dịch (`signChallenge`)
      Khoá EC P-256 sinh **trong Secure Enclave**, không trích xuất được.
      Backend verify chữ ký bằng public key đã enroll.

  Vì sao mức 2 không thay được mức 3: `evaluatePolicy` trả `true` từ chính app.
  Client bị can thiệp trả `true` mà không cần vân tay nào. Chữ ký Secure Enclave
  thì phải khớp public key trên server — không giả được.

  ⚠️ `challenge` PHẢI chứa hash nội dung giao dịch. Ký nonce suông chỉ chứng
  minh "có người chạm Face ID", không chứng minh "đồng ý chuyển 10 triệu cho A".

  Định dạng public key: iOS xuất EC key ở dạng ANSI X9.63 thô (04‖X‖Y) còn
  Android xuất X.509/SPKI. Ở đây ta **bọc thêm header SPKI** cho iOS để backend
  chỉ phải xử lý MỘT định dạng. Đây là chỗ rất hay gây lỗi "verify signature
  failed" mà không ai hiểu vì sao.
 */
@objc(MapperBiometric)
class MapperBiometric: NSObject {

  /// Tag khoá mức 3. Gắn bundleId nên 3 flavor không đụng nhau trên cùng máy.
  private var txKeyTag: Data {
    "\(Bundle.main.bundleIdentifier ?? "com.mapper").tx.signing.v1".data(using: .utf8)!
  }

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

  // MARK: - Khả dụng

  @objc(getStatus:rejecter:)
  func getStatus(_ resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    let context = LAContext()
    var error: NSError?
    let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                                                error: &error)

    var status = "AVAILABLE"
    if !canEvaluate {
      switch LAError.Code(rawValue: error?.code ?? -1) {
      case .biometryNotEnrolled: status = "NONE_ENROLLED"
      case .biometryNotAvailable: status = "NO_HARDWARE"
      case .biometryLockout: status = "LOCKED_OUT"
      default: status = "UNKNOWN"
      }
    }

    let biometryType: String
    switch context.biometryType {
    case .faceID: biometryType = "FACE_ID"
    case .touchID: biometryType = "TOUCH_ID"
    case .opticID: biometryType = "OPTIC_ID"
    default: biometryType = "NONE"
    }

    resolve([
      "status": status,
      "available": canEvaluate,
      "biometryType": biometryType,
      "hasTransactionKey": loadTxPrivateKey(context: nil) != nil,
    ])
  }

  // MARK: - Mức 2

  @objc(unlockSession:subtitle:cancelLabel:resolver:rejecter:)
  func unlockSession(_ title: String,
                     subtitle: String,
                     cancelLabel: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    let context = LAContext()
    context.localizedCancelTitle = cancelLabel
    // iOS chỉ có MỘT dòng chữ (localizedReason), không có title + subtitle như
    // Android. Ghép lại để nội dung không bị mất.
    let reason = subtitle.isEmpty ? title : "\(title)\n\(subtitle)"

    context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                           localizedReason: reason) { success, error in
      DispatchQueue.main.async {
        if success {
          resolve(true)
          return
        }
        let code = LAError.Code(rawValue: (error as NSError?)?.code ?? -1)
        if code == .userCancel || code == .appCancel || code == .systemCancel {
          reject("E_BIOMETRIC_CANCELLED", "Người dùng huỷ.", error)
        } else {
          reject("E_BIOMETRIC_FAILED", error?.localizedDescription ?? "Xác thực thất bại", error)
        }
      }
    }
  }

  // MARK: - Mức 3

  /**
   Sinh cặp khoá EC P-256 trong Secure Enclave.

   `.biometryCurrentSet` là đối trọng của `setInvalidatedByBiometricEnrollment`
   bên Android: user thêm/xoá Face ID hay vân tay ⇒ khoá **tự huỷ** ⇒ ký thất
   bại ⇒ app phải bắt enroll lại. Đây là tính năng bảo mật, không phải phiền toái.
   */
  @objc(createTransactionKeys:rejecter:)
  func createTransactionKeys(_ resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
    deleteTxKeyQuietly()

    var accessError: Unmanaged<CFError>?
    guard let access = SecAccessControlCreateWithFlags(
      kCFAllocatorDefault,
      kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
      [.privateKeyUsage, .biometryCurrentSet],
      &accessError
    ) else {
      reject("E_KEYGEN", "Không tạo được access control: \(accessError.debugDescription)", nil)
      return
    }

    let attributes: [String: Any] = [
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
      kSecAttrKeySizeInBits as String: 256,
      kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
      kSecPrivateKeyAttrs as String: [
        kSecAttrIsPermanent as String: true,
        kSecAttrApplicationTag as String: txKeyTag,
        kSecAttrAccessControl as String: access,
      ],
    ]

    var error: Unmanaged<CFError>?
    guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
      // Simulator không có Secure Enclave — báo rõ để dev không mất thời gian.
      reject("E_KEYGEN",
             "Không tạo được khoá Secure Enclave. Simulator không hỗ trợ, hãy chạy máy thật. "
               + "(\(error.debugDescription))",
             nil)
      return
    }

    guard let publicKey = SecKeyCopyPublicKey(privateKey),
          let raw = SecKeyCopyExternalRepresentation(publicKey, &error) as Data? else {
      reject("E_KEYGEN", "Không xuất được public key.", nil)
      return
    }

    let spki = MapperBiometric.wrapP256IntoSPKI(raw)
    resolve([
      "publicKey": spki.base64EncodedString(),
      "format": "X.509",
      "algorithm": "EC-P256",
      "keyAlias": String(data: txKeyTag, encoding: .utf8) ?? "",
      "strongBoxBacked": true,  // Secure Enclave, tương đương StrongBox
    ])
  }

  @objc(hasTransactionKeys:rejecter:)
  func hasTransactionKeys(_ resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(loadTxPrivateKey(context: nil) != nil)
  }

  @objc(deleteTransactionKeys:rejecter:)
  func deleteTransactionKeys(_ resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
    deleteTxKeyQuietly()
    resolve(true)
  }

  @objc(signChallenge:title:subtitle:cancelLabel:resolver:rejecter:)
  func signChallenge(_ challenge: String,
                     title: String,
                     subtitle: String,
                     cancelLabel: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    let context = LAContext()
    context.localizedCancelTitle = cancelLabel
    context.localizedReason = subtitle.isEmpty ? title : "\(title)\n\(subtitle)"

    // Prompt sinh trắc học do CHÍNH Secure Enclave bắt buộc khi dùng khoá —
    // không phải do app tự vẽ, nên không bypass được bằng cách patch app.
    guard let privateKey = loadTxPrivateKey(context: context) else {
      reject("E_KEY_INVALIDATED",
             "Không có khoá ký hợp lệ. Danh sách sinh trắc học có thể đã thay đổi — cần enroll lại.",
             nil)
      return
    }

    guard let payload = challenge.data(using: .utf8) else {
      reject("E_SIGN", "Challenge không phải UTF-8.", nil)
      return
    }

    DispatchQueue.global(qos: .userInitiated).async {
      var error: Unmanaged<CFError>?
      guard let signature = SecKeyCreateSignature(
        privateKey,
        .ecdsaSignatureMessageX962SHA256,
        payload as CFData,
        &error
      ) as Data? else {
        let nsError = error?.takeRetainedValue() as Error?
        let code = (nsError as NSError?)?.code ?? 0
        DispatchQueue.main.async {
          if code == errSecUserCanceled || code == LAError.userCancel.rawValue {
            reject("E_BIOMETRIC_CANCELLED", "Người dùng huỷ.", nsError)
          } else {
            reject("E_SIGN", nsError?.localizedDescription ?? "Ký thất bại", nsError)
          }
        }
        return
      }

      DispatchQueue.main.async {
        resolve([
          "signature": signature.base64EncodedString(),
          // X9.62 DER — trùng với SHA256withECDSA của Android. Backend dùng
          // chung một đoạn verify cho cả hai nền tảng.
          "algorithm": "SHA256withECDSA",
          "keyAlias": String(data: self.txKeyTag, encoding: .utf8) ?? "",
        ])
      }
    }
  }

  // MARK: - Keychain helper

  private func loadTxPrivateKey(context: LAContext?) -> SecKey? {
    var query: [String: Any] = [
      kSecClass as String: kSecClassKey,
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
      kSecAttrApplicationTag as String: txKeyTag,
      kSecReturnRef as String: true,
    ]
    if let context = context {
      query[kSecUseAuthenticationContext as String] = context
    } else {
      // Chỉ kiểm tra sự tồn tại — không kích hoạt prompt sinh trắc học.
      query[kSecUseAuthenticationUI as String] = kSecUseAuthenticationUIFail
    }

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)

    // errSecInteractionNotAllowed = khoá CÓ tồn tại nhưng cần xác thực.
    if status == errSecInteractionNotAllowed { return nil }
    guard status == errSecSuccess else { return nil }
    return (item as! SecKey)
  }

  private func deleteTxKeyQuietly() {
    let query: [String: Any] = [
      kSecClass as String: kSecClassKey,
      kSecAttrApplicationTag as String: txKeyTag,
    ]
    SecItemDelete(query as CFDictionary)
  }

  /// Bọc public key EC P-256 thô (ANSI X9.63, 65 byte bắt đầu bằng 0x04) vào
  /// SubjectPublicKeyInfo DER, để khớp định dạng Android trả về.
  ///
  /// Header 26 byte dưới đây là phần ASN.1 cố định cho id-ecPublicKey +
  /// prime256v1 — với P-256 nó không bao giờ đổi nên hardcode được.
  private static func wrapP256IntoSPKI(_ raw: Data) -> Data {
    let header: [UInt8] = [
      0x30, 0x59,                                             // SEQUENCE, 89 byte
      0x30, 0x13,                                             // SEQUENCE, 19 byte
      0x06, 0x07, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x02, 0x01,   // OID id-ecPublicKey
      0x06, 0x08, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07, // OID prime256v1
      0x03, 0x42, 0x00,                                       // BIT STRING, 66 byte, 0 bit thừa
    ]
    var out = Data(header)
    out.append(raw)
    return out
  }
}
