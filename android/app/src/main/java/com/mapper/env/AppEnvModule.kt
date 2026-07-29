package com.mapper.env

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.module.annotations.ReactModule
import com.mapper.BuildConfig
import com.mapper.R

/**
 * Đưa cấu hình theo flavor từ BuildConfig sang JS.
 *
 * Vì sao không dùng react-native-config: lib đó phải đọc .env lúc build, thêm
 * một nguồn sự thật nữa, và là lib có rủi ro New Architecture cao nhất trong
 * danh sách ở docs/00 mục 3. BuildConfig đã có sẵn giá trị theo flavor, chỉ cần
 * một module ~30 dòng để đọc ra — không thêm dependency nào.
 *
 * Giá trị trả về là CONSTANT (getConstants) nên JS đọc đồng bộ ngay lúc import,
 * không cần await, không có race lúc khởi động.
 */
@ReactModule(name = AppEnvModule.NAME)
class AppEnvModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "MapperAppEnv"
  }

  override fun getName(): String = NAME

  override fun getConstants(): Map<String, Any> {
    val ctx = reactApplicationContext
    return mapOf(
        "flavor" to BuildConfig.FLAVOR_ENV,
        "apiBaseUrl" to BuildConfig.API_BASE_URL,
        "forgeRockUrl" to BuildConfig.FORGEROCK_URL,
        "forgeRockRealm" to BuildConfig.FORGEROCK_REALM,
        "sePayEnv" to BuildConfig.SEPAY_ENV,
        "widgetRefreshMinutes" to BuildConfig.WIDGET_REFRESH_MINUTES,
        "applicationId" to BuildConfig.APPLICATION_ID,
        "versionName" to BuildConfig.VERSION_NAME,
        "buildNumber" to BuildConfig.VERSION_CODE,
        "isDebug" to BuildConfig.DEBUG,
        "appName" to ctx.getString(R.string.app_name),
    )
  }
}
