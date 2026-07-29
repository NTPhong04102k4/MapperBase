package com.mapper.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.mapper.BuildConfig
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Cầu JS ↔ widget.
 *
 * Ba API, đúng ba việc:
 *   writeSnapshot  – app ghi dữ liệu cho widget đọc
 *   clearSnapshot  – logout: XOÁ TRƯỚC khi điều hướng về Login
 *   reload         – vẽ lại ngay (dùng khi app vào foreground / nhận push)
 */
@ReactModule(name = MapperWidgetModule.NAME)
class MapperWidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "MapperWidget"
  }

  override fun getName(): String = NAME

  private val scope = CoroutineScope(Dispatchers.Default)

  @ReactMethod
  fun writeSnapshot(payloadJson: String, promise: Promise) {
    try {
      val ctx = reactApplicationContext.applicationContext
      WidgetSnapshotStore.write(
          context = ctx,
          payloadJson = payloadJson,
          loggedIn = true,
          refreshMinutes = BuildConfig.WIDGET_REFRESH_MINUTES,
      )
      WidgetRefreshWorker.schedule(ctx)
      scope.launch { MapperWidget().updateAll(ctx) }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_WIDGET_WRITE", e.message, e)
    }
  }

  /**
   * Phải await ở JS **trước khi** chuyển về màn Login. Nếu điều hướng trước rồi
   * mới xoá, có một khoảng thời gian widget còn hiện dữ liệu người dùng cũ.
   */
  @ReactMethod
  fun clearSnapshot(promise: Promise) {
    try {
      val ctx = reactApplicationContext.applicationContext
      WidgetSnapshotStore.clear(ctx)
      scope.launch {
        MapperWidget().updateAll(ctx)
        promise.resolve(true)
      }
    } catch (e: Exception) {
      promise.reject("E_WIDGET_CLEAR", e.message, e)
    }
  }

  @ReactMethod
  fun reload(promise: Promise) {
    val ctx = reactApplicationContext.applicationContext
    scope.launch {
      try {
        MapperWidget().updateAll(ctx)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("E_WIDGET_RELOAD", e.message, e)
      }
    }
  }

  /** Có widget nào đang nằm trên màn hình chính không — để app khỏi ghi thừa. */
  @ReactMethod
  fun isInstalled(promise: Promise) {
    val ctx = reactApplicationContext.applicationContext
    val ids = AppWidgetManager.getInstance(ctx)
        .getAppWidgetIds(ComponentName(ctx, MapperWidgetReceiver::class.java))
    promise.resolve(Arguments.createMap().apply {
      putBoolean("installed", ids.isNotEmpty())
      putInt("count", ids.size)
      putInt("refreshMinutes", BuildConfig.WIDGET_REFRESH_MINUTES)
    })
  }
}
