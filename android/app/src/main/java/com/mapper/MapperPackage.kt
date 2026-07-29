package com.mapper

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.mapper.auth.BiometricModule
import com.mapper.auth.ForgeRockAuthModule
import com.mapper.env.AppEnvModule
import com.mapper.splash.SplashScreenModule
import com.mapper.widget.MapperWidgetModule

/**
 * Đăng ký toàn bộ native module tự viết.
 *
 * Đây là **legacy bridge module**, không phải TurboModule có codegen. Lý do:
 * dưới New Architecture (bridgeless) RN 0.79 vẫn chạy chúng qua interop layer,
 * trong khi viết codegen spec cho 5 module × 2 nền tảng làm tăng đáng kể chi phí
 * bảo trì mà không đem lại lợi ích đo được ở đây (các call này đều thưa và
 * bất đồng bộ, không nằm trên hot path render).
 *
 * Khi nào nên chuyển sang TurboModule: nếu sau này có API được gọi đồng bộ hoặc
 * gọi hàng chục lần mỗi giây.
 */
class MapperPackage : ReactPackage {

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
      listOf(
          AppEnvModule(reactContext),
          SplashScreenModule(reactContext),
          ForgeRockAuthModule(reactContext),
          BiometricModule(reactContext),
          MapperWidgetModule(reactContext),
      )

  override fun createViewManagers(
      reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> = emptyList()
}
