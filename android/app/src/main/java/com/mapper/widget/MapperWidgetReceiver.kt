package com.mapper.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * Cầu nối giữa hệ thống AppWidget và Glance.
 *
 * Khai trong AndroidManifest với <meta-data android:name="android.appwidget.provider">
 * trỏ tới res/xml/mapper_widget_info.xml.
 */
class MapperWidgetReceiver : GlanceAppWidgetReceiver() {

  override val glanceAppWidget: GlanceAppWidget = MapperWidget()

  override fun onEnabled(context: Context) {
    super.onEnabled(context)
    // User vừa kéo widget đầu tiên ra màn hình -> bắt đầu lịch làm mới.
    WidgetRefreshWorker.schedule(context)
  }

  override fun onDisabled(context: Context) {
    super.onDisabled(context)
    // Không còn widget nào -> huỷ lịch, đừng đốt pin vô ích.
    WidgetRefreshWorker.cancel(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
      // Reboot xoá sạch lịch WorkManager một chiều ở một số OEM -> đặt lại.
      WidgetRefreshWorker.schedule(context)
    }
  }

  @Suppress("unused")
  fun forceUpdate(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    manager.getAppWidgetIds(android.content.ComponentName(context, MapperWidgetReceiver::class.java))
  }
}
