package com.mapper.splash

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

/**
 * Splash screen native.
 *
 * Android 12+ có SplashScreen API ở tầng hệ điều hành; androidx.core:core-splashscreen
 * backport nó về API 21. Ưu điểm so với cách cũ (một Activity splash riêng + ảnh nền):
 *   - không có frame trắng giữa launcher và app
 *   - icon animate được, tự theo dark mode
 *   - không tốn thêm một Activity trong back stack
 *
 * JS gọi hide() khi đã sẵn sàng (đã rehydrate token, đã biết đi Login hay Home).
 */
@ReactModule(name = SplashScreenModule.NAME)
class SplashScreenModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "MapperSplashScreen"
  }

  override fun getName(): String = NAME

  override fun initialize() {
    super.initialize()
    SplashGate.armWatchdog()
  }

  @ReactMethod
  fun hide(promise: Promise) {
    SplashGate.hide()
    promise.resolve(true)
  }

  @ReactMethod
  fun show(promise: Promise) {
    SplashGate.show()
    promise.resolve(true)
  }

  /** Cần cho NativeEventEmitter contract, không dùng nhưng RN cảnh báo nếu thiếu. */
  @ReactMethod fun addListener(eventName: String) = Unit

  @ReactMethod fun removeListeners(count: Int) = Unit
}
