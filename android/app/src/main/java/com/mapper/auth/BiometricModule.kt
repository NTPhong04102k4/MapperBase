package com.mapper.auth

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Biometric — HAI mức, HAI cặp khoá, KHÔNG dùng lẫn
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  MỨC 2 — mở phiên (unlockSession)
 *      Chỉ hỏi "đúng chủ máy không". Kết quả là boolean, chỉ thiết bị biết.
 *      Dùng để mở khoá refresh token đang nằm trong Keychain/Keystore
 *      (phần lưu trữ do react-native-keychain lo bên JS).
 *
 *  MỨC 3 — xác nhận giao dịch (signChallenge)
 *      Ký một challenge do BACKEND sinh ra, bằng khoá riêng nằm trong TEE/
 *      StrongBox, không trích xuất được. Backend verify bằng public key đã
 *      enroll. Chứng minh được: đúng người + đúng nội dung + không replay.
 *
 *  Vì sao mức 2 KHÔNG thay được mức 3: mức 2 trả về `true` từ chính app —
 *  một client bị can thiệp có thể trả `true` mà không cần vân tay nào. Mức 3
 *  thì chữ ký phải khớp public key trên server, client không giả được.
 *
 *  ⚠️ challenge PHẢI chứa hash nội dung giao dịch, không chỉ nonce ngẫu nhiên.
 *  Ký nonce suông chỉ chứng minh "có người chạm vân tay", không chứng minh
 *  "đồng ý chuyển 10 triệu cho A" — kẻ tấn công tráo nội dung được.
 *  (docs/05 mục 6)
 */
@ReactModule(name = BiometricModule.NAME)
class BiometricModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "MapperBiometric"

    private const val KEYSTORE = "AndroidKeyStore"

    /** Khoá mức 3. Tên có tiền tố applicationId nên 3 flavor không đụng nhau. */
    private const val TX_KEY_ALIAS = "mapper.tx.signing.v1"

    private const val E_NO_ACTIVITY = "E_NO_ACTIVITY"
    private const val E_UNAVAILABLE = "E_BIOMETRIC_UNAVAILABLE"
    private const val E_CANCELLED = "E_BIOMETRIC_CANCELLED"
    private const val E_FAILED = "E_BIOMETRIC_FAILED"

    /** Khoá bị huỷ vì user thêm/xoá vân tay -> BẮT BUỘC enroll lại. */
    const val E_KEY_INVALIDATED = "E_KEY_INVALIDATED"

    private const val AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_STRONG
  }

  override fun getName(): String = NAME

  // ────────────────────────────────────────────────────────── khả dụng ──

  /**
   * Trạng thái sinh trắc học của máy.
   *
   * Trả về đủ chi tiết để UI nói đúng việc phải làm, thay vì "lỗi hệ thống":
   *   - NONE_ENROLLED  -> mời user vào Settings đăng ký vân tay
   *   - NO_HARDWARE    -> ẩn hẳn tính năng, chuyển sang OTP/mật khẩu giao dịch
   *   - SECURITY_UPDATE_REQUIRED -> mời user cập nhật hệ thống
   */
  @ReactMethod
  fun getStatus(promise: Promise) {
    val manager = BiometricManager.from(reactApplicationContext)
    val code = manager.canAuthenticate(AUTHENTICATORS)

    val status = when (code) {
      BiometricManager.BIOMETRIC_SUCCESS -> "AVAILABLE"
      BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> "NO_HARDWARE"
      BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> "HW_UNAVAILABLE"
      BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> "NONE_ENROLLED"
      BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> "SECURITY_UPDATE_REQUIRED"
      BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED -> "UNSUPPORTED"
      else -> "UNKNOWN"
    }

    promise.resolve(Arguments.createMap().apply {
      putString("status", status)
      putBoolean("available", code == BiometricManager.BIOMETRIC_SUCCESS)
      // Android không cho biết là vân tay hay khuôn mặt ở tầng BiometricPrompt;
      // đừng cố đoán để hiện chữ "Face ID" như iOS.
      putString("biometryType", "BIOMETRIC")
      putBoolean("hasTransactionKey", keyStoreHasTxKey())
    })
  }

  // ─────────────────────────────────────────────────── mức 2: mở phiên ──

  @ReactMethod
  fun unlockSession(title: String, subtitle: String, cancelLabel: String, promise: Promise) {
    val activity = currentFragmentActivity()
    if (activity == null) {
      promise.reject(E_NO_ACTIVITY, "Không có Activity đang hiển thị.")
      return
    }
    if (BiometricManager.from(reactApplicationContext).canAuthenticate(AUTHENTICATORS)
        != BiometricManager.BIOMETRIC_SUCCESS) {
      promise.reject(E_UNAVAILABLE, "Thiết bị chưa sẵn sàng cho sinh trắc học.")
      return
    }

    activity.runOnUiThread {
      val prompt = BiometricPrompt(
          activity,
          ContextCompat.getMainExecutor(activity),
          object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
              promise.resolve(true)
            }
            override fun onAuthenticationError(code: Int, message: CharSequence) {
              if (code == BiometricPrompt.ERROR_USER_CANCELED ||
                  code == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                  code == BiometricPrompt.ERROR_CANCELED) {
                promise.reject(E_CANCELLED, message.toString())
              } else {
                promise.reject(E_FAILED, "[$code] $message")
              }
            }
            // onAuthenticationFailed = quét sai một lần; prompt vẫn mở, không
            // reject ở đây nếu không JS sẽ báo lỗi trong khi user còn đang thử.
          },
      )
      prompt.authenticate(promptInfo(title, subtitle, cancelLabel))
    }
  }

  // ───────────────────────────────────── mức 3: khoá ký + ký challenge ──

  /**
   * Sinh cặp khoá EC P-256 trong AndroidKeyStore và trả public key (X.509/SPKI,
   * base64) để gửi lên `POST /biometric/enroll`.
   *
   * Hai thuộc tính quan trọng:
   *   setUserAuthenticationRequired(true)      -> mỗi lần ký đều phải xác thực
   *   setInvalidatedByBiometricEnrollment(true)-> user thêm vân tay mới thì khoá
   *                                               tự huỷ. Đây là TÍNH NĂNG, không
   *                                               phải phiền toái: nó chặn người
   *                                               khác thêm vân tay của họ rồi ký
   *                                               thay chủ máy.
   */
  @ReactMethod
  fun createTransactionKeys(promise: Promise) {
    try {
      deleteTxKeyQuietly()

      val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, KEYSTORE)
      val builder = KeyGenParameterSpec.Builder(TX_KEY_ALIAS, KeyProperties.PURPOSE_SIGN)
          .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
          .setDigests(KeyProperties.DIGEST_SHA256)
          .setUserAuthenticationRequired(true)

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        builder.setInvalidatedByBiometricEnrollment(true)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        // Ưu tiên StrongBox (secure element rời) nếu máy có.
        try {
          builder.setIsStrongBoxBacked(true)
          generator.initialize(builder.build())
          val pair = generator.generateKeyPair()
          promise.resolve(publicKeyPayload(pair.public.encoded, strongBox = true))
          return
        } catch (_: Exception) {
          builder.setIsStrongBoxBacked(false)
        }
      }

      generator.initialize(builder.build())
      val pair = generator.generateKeyPair()
      promise.resolve(publicKeyPayload(pair.public.encoded, strongBox = false))
    } catch (e: Exception) {
      promise.reject("E_KEYGEN", "Không tạo được khoá ký giao dịch: ${e.message}", e)
    }
  }

  @ReactMethod
  fun hasTransactionKeys(promise: Promise) {
    promise.resolve(keyStoreHasTxKey())
  }

  @ReactMethod
  fun deleteTransactionKeys(promise: Promise) {
    deleteTxKeyQuietly()
    promise.resolve(true)
  }

  /**
   * Ký challenge của backend. Prompt sinh trắc học do CHÍNH Keystore bắt buộc
   * (CryptoObject), không phải do app tự vẽ — nên không bypass được bằng cách
   * patch app.
   *
   * Lỗi [E_KEY_INVALIDATED] phải được JS xử lý riêng: hiện màn "đăng ký lại
   * xác thực sinh trắc học" kèm xác thực OTP/mật khẩu, KHÔNG báo "lỗi hệ thống".
   */
  @ReactMethod
  fun signChallenge(
      challenge: String,
      title: String,
      subtitle: String,
      cancelLabel: String,
      promise: Promise,
  ) {
    val activity = currentFragmentActivity()
    if (activity == null) {
      promise.reject(E_NO_ACTIVITY, "Không có Activity đang hiển thị.")
      return
    }

    val signature: Signature
    try {
      val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
      val privateKey = keyStore.getKey(TX_KEY_ALIAS, null)
      if (privateKey == null) {
        promise.reject(E_KEY_INVALIDATED, "Chưa có khoá ký giao dịch. Cần enroll lại.")
        return
      }
      signature = Signature.getInstance("SHA256withECDSA").apply {
        initSign(privateKey as java.security.PrivateKey)
      }
    } catch (e: KeyPermanentlyInvalidatedException) {
      deleteTxKeyQuietly()
      promise.reject(
          E_KEY_INVALIDATED,
          "Khoá đã bị huỷ do danh sách sinh trắc học của thiết bị thay đổi. Cần enroll lại.",
          e,
      )
      return
    } catch (e: Exception) {
      promise.reject("E_SIGN_INIT", "Không khởi tạo được chữ ký: ${e.message}", e)
      return
    }

    activity.runOnUiThread {
      val prompt = BiometricPrompt(
          activity,
          ContextCompat.getMainExecutor(activity),
          object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
              try {
                val sig = result.cryptoObject?.signature
                    ?: throw IllegalStateException("CryptoObject rỗng")
                sig.update(challenge.toByteArray(Charsets.UTF_8))
                val signed = sig.sign()
                promise.resolve(Arguments.createMap().apply {
                  putString("signature", Base64.encodeToString(signed, Base64.NO_WRAP))
                  putString("algorithm", "SHA256withECDSA")
                  putString("keyAlias", TX_KEY_ALIAS)
                })
              } catch (e: Exception) {
                promise.reject("E_SIGN", "Ký thất bại: ${e.message}", e)
              }
            }

            override fun onAuthenticationError(code: Int, message: CharSequence) {
              if (code == BiometricPrompt.ERROR_USER_CANCELED ||
                  code == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                  code == BiometricPrompt.ERROR_CANCELED) {
                promise.reject(E_CANCELLED, message.toString())
              } else {
                promise.reject(E_FAILED, "[$code] $message")
              }
            }
          },
      )
      prompt.authenticate(
          promptInfo(title, subtitle, cancelLabel),
          BiometricPrompt.CryptoObject(signature),
      )
    }
  }

  // ────────────────────────────────────────────────────────────── helper ──

  private fun promptInfo(title: String, subtitle: String, cancelLabel: String) =
      BiometricPrompt.PromptInfo.Builder()
          .setTitle(title)
          .setSubtitle(subtitle)
          .setNegativeButtonText(cancelLabel)
          .setAllowedAuthenticators(AUTHENTICATORS)
          .setConfirmationRequired(true)
          .build()

  private fun publicKeyPayload(encoded: ByteArray, strongBox: Boolean) =
      Arguments.createMap().apply {
        putString("publicKey", Base64.encodeToString(encoded, Base64.NO_WRAP))
        putString("format", "X.509")
        putString("algorithm", "EC-P256")
        putString("keyAlias", TX_KEY_ALIAS)
        putBoolean("strongBoxBacked", strongBox)
      }

  private fun keyStoreHasTxKey(): Boolean = try {
    KeyStore.getInstance(KEYSTORE).apply { load(null) }.containsAlias(TX_KEY_ALIAS)
  } catch (_: Exception) {
    false
  }

  private fun deleteTxKeyQuietly() {
    try {
      KeyStore.getInstance(KEYSTORE).apply { load(null) }.deleteEntry(TX_KEY_ALIAS)
    } catch (_: Exception) {
      // không có khoá thì thôi
    }
  }

  private fun currentFragmentActivity(): FragmentActivity? =
      currentActivity as? FragmentActivity
}
