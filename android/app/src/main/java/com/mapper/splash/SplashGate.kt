package com.mapper.splash

import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * Cờ chia sẻ giữa MainActivity (điều kiện giữ splash) và SplashScreenModule
 * (JS gọi hide). Là object singleton vì Activity có thể bị dựng lại.
 */
object SplashGate {

  /** Timeout an toàn: JS crash trước khi kịp gọi hide() thì cũng không kẹt splash mãi. */
  private const val AUTO_HIDE_AFTER_MS = 8_000L

  @Volatile
  var isVisible: Boolean = true
    private set

  private val mainHandler = Handler(Looper.getMainLooper())
  private var watchdogArmed = false

  fun armWatchdog() {
    if (watchdogArmed) return
    watchdogArmed = true
    mainHandler.postDelayed({
      if (isVisible) {
        Log.w("SplashGate", "JS chưa gọi SplashScreen.hide() sau ${AUTO_HIDE_AFTER_MS}ms — tự ẩn.")
        hide()
      }
    }, AUTO_HIDE_AFTER_MS)
  }

  fun hide() {
    isVisible = false
  }

  /** Chỉ dùng khi muốn hiện lại splash lúc hot-reload trong dev. */
  fun show() {
    isVisible = true
  }
}
