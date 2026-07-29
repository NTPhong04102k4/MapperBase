package com.mapper.auth

import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.mapper.BuildConfig
import org.forgerock.android.auth.AccessToken
import org.forgerock.android.auth.FRAuth
import org.forgerock.android.auth.FRListener
import org.forgerock.android.auth.FROptionsBuilder
import org.forgerock.android.auth.FRUser
import org.forgerock.android.auth.Node
import org.forgerock.android.auth.NodeListener
import org.forgerock.android.auth.callback.Callback
import org.forgerock.android.auth.callback.ChoiceCallback
import org.forgerock.android.auth.callback.ConfirmationCallback
import org.forgerock.android.auth.callback.NameCallback
import org.forgerock.android.auth.callback.PasswordCallback
import org.forgerock.android.auth.callback.TextOutputCallback
import java.util.concurrent.atomic.AtomicReference

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ForgeRock IAM — native module Android
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Vì sao expose luồng "journey/node" ra JS thay vì chỉ có login(user, pass):
 *
 *  ForgeRock AM điều khiển luồng xác thực bằng **journey** cấu hình ở server.
 *  Hôm nay journey là username+password; ngày mai admin thêm node OTP, node
 *  chấp nhận điều khoản, node chọn IdP — mà không ai đụng vào app. Nếu native
 *  module chỉ có `login(u, p)` thì mỗi lần journey đổi là phải phát hành app mới.
 *
 *  Kiến trúc ở đây:
 *      JS  startJourney("Login")  ->  native trả về NODE (danh sách callback)
 *      JS  render UI theo callback  ->  submitNode(values)  ->  node kế tiếp
 *      ... lặp tới khi onSuccess -> trả token
 *
 *  Token: SDK tự lưu trong SharedPreferences có mã hoá (Android Keystore).
 *  App KHÔNG tự lưu access token; refresh token được gác thêm một lớp sinh trắc
 *  học ở BiometricModule (mức 2).
 *
 *  ⚠️ KIỂM CHỨNG BẮT BUỘC (nguyên tắc vàng trong TurioldBase.md):
 *  API surface của forgerock-auth 4.8.x phải được đối chiếu lại với AAR thật
 *  sau lần sync Gradle đầu tiên (Android Studio → External Libraries →
 *  forgerock-auth → decompile). Các điểm hay lệch giữa các minor version:
 *  tên `FROptionsBuilder`, chữ ký `Node.next()`, và package của các Callback.
 */
@ReactModule(name = ForgeRockAuthModule.NAME)
class ForgeRockAuthModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "MapperForgeRock"

    /** Bắn ra JS khi SDK trả về một node mới trong lúc journey đang chạy. */
    const val EVENT_NODE = "forgerock:node"

    private const val E_NOT_STARTED = "E_FR_NOT_STARTED"
    private const val E_NO_NODE = "E_FR_NO_NODE"
    private const val E_AUTH = "E_FR_AUTH"
    private const val E_NO_SESSION = "E_FR_NO_SESSION"
  }

  override fun getName(): String = NAME

  /** Node đang chờ JS trả lời. Chỉ có tối đa một journey chạy cùng lúc. */
  private val pendingNode = AtomicReference<Node?>(null)

  /** Promise của lệnh startJourney/submitNode đang chờ kết quả cuối cùng. */
  private val pendingPromise = AtomicReference<Promise?>(null)

  @Volatile private var started = false

  // ───────────────────────────────────────────────────────────── khởi tạo ──

  /**
   * Cấu hình SDK. Gọi một lần lúc app khởi động (src/services/auth/forgerock.ts).
   *
   * Các giá trị mặc định lấy từ BuildConfig theo flavor, JS chỉ cần truyền
   * clientId / redirectUri / scope là những thứ phụ thuộc OAuth2 client.
   */
  @ReactMethod
  fun configure(config: ReadableMap, promise: Promise) {
    try {
      val serverUrl = config.getStringOr("url", BuildConfig.FORGEROCK_URL)
      val realmName = config.getStringOr("realm", BuildConfig.FORGEROCK_REALM)
      val cookie = config.getStringOr("cookieName", "iPlanetDirectoryPro")
      val clientId = config.getStringOr("oauthClientId", "")
      val redirect = config.getStringOr("oauthRedirectUri", "${BuildConfig.APPLICATION_ID}:/oauth2redirect")
      val scopes = config.getStringOr("oauthScope", "openid profile email offline_access")
      val journey = config.getStringOr("authServiceName", "Login")
      val registration = config.getStringOr("registrationServiceName", "Registration")

      val options = FROptionsBuilder.build {
        server {
          url = serverUrl
          realm = realmName
          cookieName = cookie
          timeout = 30
        }
        oauth {
          oauthClientId = clientId
          oauthRedirectUri = redirect
          oauthScope = scopes
          // Thời gian coi access token là "sắp hết hạn" -> refresh sớm.
          oauthThresholdSeconds = 60
        }
        service {
          authServiceName = journey
          registrationServiceName = registration
        }
      }

      FRAuth.start(reactApplicationContext.applicationContext, options)
      started = true
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_FR_CONFIG", "Không cấu hình được ForgeRock SDK: ${e.message}", e)
    }
  }

  // ─────────────────────────────────────────────────────────────── journey ──

  /**
   * Bắt đầu journey đăng nhập.
   *
   * Resolve khi journey KẾT THÚC (thành công) với payload token.
   * Trong lúc chạy, mỗi node trung gian được bắn qua event [EVENT_NODE];
   * JS lắng nghe event đó để render form rồi gọi [submitNode].
   */
  @ReactMethod
  fun startJourney(promise: Promise) {
    if (!started) {
      promise.reject(E_NOT_STARTED, "Chưa gọi configure() trước khi login.")
      return
    }
    if (!pendingPromise.compareAndSet(null, promise)) {
      promise.reject("E_FR_BUSY", "Đang có một journey khác chạy dở. Gọi cancelJourney() trước.")
      return
    }
    pendingNode.set(null)

    FRUser.login(reactApplicationContext.applicationContext, journeyListener())
  }

  /**
   * Trả lời node hiện tại.
   *
   * @param values map { callbackIndex -> giá trị }. Ví dụ:
   *        { "0": "phong@ttmedic.vn", "1": "mật khẩu" }
   *        Với ChoiceCallback giá trị là index (số) dạng chuỗi.
   */
  @ReactMethod
  fun submitNode(values: ReadableMap, promise: Promise) {
    val node = pendingNode.get()
    if (node == null) {
      promise.reject(E_NO_NODE, "Không có node nào đang chờ. Gọi startJourney() trước.")
      return
    }
    try {
      applyValues(node, values)
      // promise của submitNode resolve ngay; kết quả cuối cùng đi qua promise
      // của startJourney. Tách như vậy để JS không phải giữ 2 luồng chờ.
      promise.resolve(true)
      node.next(reactApplicationContext.applicationContext, journeyListener())
    } catch (e: Exception) {
      promise.reject(E_AUTH, "Không gửi được node: ${e.message}", e)
    }
  }

  @ReactMethod
  fun cancelJourney(promise: Promise) {
    pendingNode.set(null)
    pendingPromise.getAndSet(null)?.reject("E_FR_CANCELLED", "Journey bị huỷ.")
    promise.resolve(true)
  }

  /**
   * Tiện ích cho journey username+password chuẩn: tự điền NameCallback và
   * PasswordCallback, không cần JS render form động.
   *
   * Nếu server trả về node có callback lạ (OTP, chấp nhận điều khoản...), hàm
   * này sẽ **reject** kèm danh sách callback — lúc đó phải dùng
   * startJourney/submitNode. Cố tình không "đoán bừa" ở đây.
   */
  @ReactMethod
  fun loginWithCredentials(username: String, password: String, promise: Promise) {
    if (!started) {
      promise.reject(E_NOT_STARTED, "Chưa gọi configure() trước khi login.")
      return
    }
    if (!pendingPromise.compareAndSet(null, promise)) {
      promise.reject("E_FR_BUSY", "Đang có một journey khác chạy dở.")
      return
    }

    val listener = object : NodeListener<FRUser> {
      override fun onCallbackReceived(node: Node) {
        var handled = 0
        node.callbacks.forEach { cb ->
          when (cb) {
            is NameCallback -> { cb.setName(username); handled++ }
            is PasswordCallback -> { cb.setPassword(password.toCharArray()); handled++ }
            is TextOutputCallback -> handled++   // chỉ là thông báo, bỏ qua được
            else -> Unit
          }
        }
        if (handled < node.callbacks.size) {
          val unsupported = node.callbacks
              .filterNot { it is NameCallback || it is PasswordCallback || it is TextOutputCallback }
              .joinToString(", ") { it.javaClass.simpleName }
          finishWithError(
              "E_FR_UNSUPPORTED_NODE",
              "Journey trả về callback chưa hỗ trợ ở luồng rút gọn: $unsupported. " +
                  "Dùng startJourney()/submitNode() để xử lý động.",
          )
          return
        }
        node.next(reactApplicationContext.applicationContext, this)
      }

      override fun onSuccess(result: FRUser) = emitTokens()

      override fun onException(e: Exception) =
          finishWithError(E_AUTH, e.message ?: "Đăng nhập thất bại")
    }

    FRUser.login(reactApplicationContext.applicationContext, listener)
  }

  private fun journeyListener() = object : NodeListener<FRUser> {
    override fun onCallbackReceived(node: Node) {
      pendingNode.set(node)
      emit(EVENT_NODE, serializeNode(node))
    }

    override fun onSuccess(result: FRUser) {
      pendingNode.set(null)
      emitTokens()
    }

    override fun onException(e: Exception) {
      pendingNode.set(null)
      finishWithError(E_AUTH, e.message ?: "Đăng nhập thất bại")
    }
  }

  // ───────────────────────────────────────────────────────────────── token ──

  /**
   * Lấy access token hiện tại. SDK tự refresh khi token sắp hết hạn
   * (ngưỡng oauthThresholdSeconds khai ở configure).
   */
  @ReactMethod
  fun getAccessToken(promise: Promise) {
    val user = FRUser.getCurrentUser()
    if (user == null) {
      promise.reject(E_NO_SESSION, "Chưa đăng nhập.")
      return
    }
    user.getAccessToken(object : FRListener<AccessToken> {
      override fun onSuccess(result: AccessToken) = promise.resolve(serializeToken(result))
      override fun onException(e: Exception) =
          promise.reject("E_FR_TOKEN", e.message ?: "Không lấy được access token", e)
    })
  }

  /**
   * Ép refresh, bỏ qua token còn hạn trong cache.
   * Dùng khi API trả 401 dù token trong tay chưa hết hạn (server thu hồi sớm).
   */
  @ReactMethod
  fun refreshToken(promise: Promise) {
    val user = FRUser.getCurrentUser()
    if (user == null) {
      promise.reject(E_NO_SESSION, "Chưa đăng nhập.")
      return
    }
    user.refresh(object : FRListener<AccessToken> {
      override fun onSuccess(result: AccessToken) = promise.resolve(serializeToken(result))
      override fun onException(e: Exception) =
          promise.reject("E_FR_REFRESH", e.message ?: "Refresh token thất bại", e)
    })
  }

  @ReactMethod
  fun getUserInfo(promise: Promise) {
    val user = FRUser.getCurrentUser()
    if (user == null) {
      promise.reject(E_NO_SESSION, "Chưa đăng nhập.")
      return
    }
    user.getUserInfo(object : FRListener<org.forgerock.android.auth.UserInfo> {
      override fun onSuccess(result: org.forgerock.android.auth.UserInfo) {
        val map = Arguments.createMap().apply {
          putString("sub", result.sub)
          putString("name", result.name)
          putString("email", result.email)
          putString("familyName", result.familyName)
          putString("givenName", result.givenName)
          putString("raw", result.raw?.toString())
        }
        promise.resolve(map)
      }
      override fun onException(e: Exception) =
          promise.reject("E_FR_USERINFO", e.message ?: "Không lấy được userinfo", e)
    })
  }

  @ReactMethod
  fun isAuthenticated(promise: Promise) {
    promise.resolve(FRUser.getCurrentUser() != null)
  }

  /**
   * Logout: thu hồi token ở AM + xoá session cục bộ.
   *
   * ⚠️ Bên JS PHẢI xoá snapshot widget TRƯỚC khi điều hướng về Login
   * (docs/05 mục 5 — hạng mục chặn phát hành). Native không tự làm việc đó ở
   * đây vì thứ tự phải do luồng logout ở JS quyết định.
   */
  @ReactMethod
  fun logout(promise: Promise) {
    val user = FRUser.getCurrentUser()
    if (user == null) {
      promise.resolve(true)
      return
    }
    try {
      user.logout()
      promise.resolve(true)
    } catch (e: Exception) {
      // logout() của SDK là fire-and-forget với network; session cục bộ vẫn bị
      // xoá. Coi là thành công nhưng báo cảnh báo lên JS.
      promise.resolve(Arguments.createMap().apply {
        putBoolean("localOnly", true)
        putString("warning", e.message)
      })
    }
  }

  // ───────────────────────────────────────────────────────── serialization ──

  private fun serializeToken(token: AccessToken): WritableMap = Arguments.createMap().apply {
    putString("accessToken", token.value)
    putString("refreshToken", token.refreshToken)
    putString("idToken", token.idToken)
    putString("tokenType", token.tokenType)
    putString("scope", token.scope?.joinToString(" "))
    putDouble("expiresIn", token.expiresIn.toDouble())
  }

  /**
   * Chuyển Node của SDK thành JSON để JS render form.
   *
   * Chỉ map các callback thật sự đang dùng. Callback lạ vẫn được trả về với
   * `type` + `supported: false` để JS hiện thông báo tử tế thay vì crash —
   * im lặng bỏ qua một node là cách chắc chắn nhất để user kẹt ở màn trắng.
   */
  private fun serializeNode(node: Node): WritableMap {
    val callbacks: WritableArray = Arguments.createArray()

    node.callbacks.forEachIndexed { index, cb ->
      val item = Arguments.createMap().apply {
        putInt("index", index)
        putString("type", cb.javaClass.simpleName)
        putBoolean("supported", true)
      }
      when (cb) {
        is NameCallback -> item.putString("prompt", cb.prompt)
        is PasswordCallback -> {
          item.putString("prompt", cb.prompt)
          item.putBoolean("secure", true)
        }
        is TextOutputCallback -> {
          item.putString("message", cb.message)
          item.putInt("messageType", cb.messageType)
        }
        is ChoiceCallback -> {
          item.putString("prompt", cb.prompt)
          item.putInt("defaultChoice", cb.defaultChoice)
          val choices = Arguments.createArray()
          cb.choices.forEach { choices.pushString(it) }
          item.putArray("choices", choices)
        }
        is ConfirmationCallback -> {
          item.putString("prompt", cb.prompt)
          val options = Arguments.createArray()
          cb.options?.forEach { options.pushString(it) }
          item.putArray("options", options)
        }
        else -> item.putBoolean("supported", false)
      }
      callbacks.pushMap(item)
    }

    return Arguments.createMap().apply {
      putString("stage", node.stage)
      putString("header", node.header)
      putString("description", node.description)
      putArray("callbacks", callbacks)
    }
  }

  private fun applyValues(node: Node, values: ReadableMap) {
    node.callbacks.forEachIndexed { index, cb ->
      val key = index.toString()
      if (!values.hasKey(key)) return@forEachIndexed
      val raw = values.getString(key) ?: return@forEachIndexed
      when (cb) {
        is NameCallback -> cb.setName(raw)
        is PasswordCallback -> cb.setPassword(raw.toCharArray())
        is ChoiceCallback -> cb.setSelectedIndex(raw.toIntOrNull() ?: cb.defaultChoice)
        is ConfirmationCallback -> cb.setSelectedIndex(raw.toIntOrNull() ?: 0)
        else -> Unit
      }
    }
  }

  // ────────────────────────────────────────────────────────────────── util ──

  private fun emitTokens() {
    val user = FRUser.getCurrentUser()
    if (user == null) {
      finishWithError(E_NO_SESSION, "Journey báo thành công nhưng không có session.")
      return
    }
    user.getAccessToken(object : FRListener<AccessToken> {
      override fun onSuccess(result: AccessToken) {
        pendingPromise.getAndSet(null)?.resolve(serializeToken(result))
      }
      override fun onException(e: Exception) {
        finishWithError("E_FR_TOKEN", e.message ?: "Không lấy được token sau khi login")
      }
    })
  }

  private fun finishWithError(code: String, message: String) {
    pendingNode.set(null)
    pendingPromise.getAndSet(null)?.reject(code, message)
  }

  private fun emit(event: String, payload: WritableMap) {
    reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(event, payload)
  }

  private fun ReadableMap.getStringOr(key: String, fallback: String): String =
      if (hasKey(key) && !isNull(key)) getString(key) ?: fallback else fallback

  @ReactMethod fun addListener(eventName: String) = Unit

  @ReactMethod fun removeListeners(count: Int) = Unit
}
