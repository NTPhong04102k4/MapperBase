package com.mapper.widget

import android.content.Context
import androidx.glance.appwidget.updateAll
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.mapper.BuildConfig
import java.util.concurrent.TimeUnit

/**
 * Nhịp làm mới widget.
 *
 * ⚠️ ĐỌC KỸ TRƯỚC KHI SỬA SỐ PHÚT:
 *
 *   - `updatePeriodMillis` trong appwidget-provider: mọi giá trị < 30 phút bị
 *     hệ thống làm tròn lên 30 phút.
 *   - `PeriodicWorkRequest`: chu kỳ tối thiểu là **15 phút**. Truyền 5 phút thì
 *     WorkManager tự nâng lên 15, im lặng.
 *   - `AlarmManager` đặt được 5 phút nhưng vào Doze là bị gom/hoãn, và alarm
 *     chính xác cần quyền bị Play kiểm duyệt gắt.
 *
 * ⇒ Không có cách nào "làm mới dữ liệu server mỗi 5 phút" trên Android. Nhịp
 * 5 phút chỉ đạt được cho phần **suy ra từ thời gian** (đếm ngược, tiến độ) —
 * phần đó không cần worker, xem `countdownTargetMs` trong WidgetSnapshotStore.
 *
 * Worker này chỉ làm một việc: vẽ lại widget để mốc "Cập nhật lúc" và các giá
 * trị phụ thuộc thời gian không bị đứng. Dữ liệu mới đến từ:
 *   1. app vào foreground  -> MapperWidgetModule.writeSnapshot()
 *   2. push sự kiện từ server -> background handler ghi snapshot rồi reload
 */
class WidgetRefreshWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {

  override suspend fun doWork(): Result = try {
    MapperWidget().updateAll(applicationContext)
    Result.success()
  } catch (_: Exception) {
    Result.retry()
  }

  companion object {
    private const val WORK_NAME = "mapper_widget_refresh"

    /** Sàn cứng của WorkManager. Đặt thấp hơn cũng vô ích. */
    private const val MIN_PERIOD_MINUTES = 15L

    fun schedule(context: Context) {
      val desired = BuildConfig.WIDGET_REFRESH_MINUTES.toLong()
      val period = maxOf(desired, MIN_PERIOD_MINUTES)

      val request = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(period, TimeUnit.MINUTES)
          .setConstraints(
              Constraints.Builder()
                  // Chỉ cần mạng khi snapshot có phần dữ liệu server. Nếu widget
                  // của bạn thuần đếm ngược, đổi thành NetworkType.NOT_REQUIRED.
                  .setRequiredNetworkType(NetworkType.CONNECTED)
                  .build(),
          )
          .build()

      WorkManager.getInstance(context).enqueueUniquePeriodicWork(
          WORK_NAME,
          ExistingPeriodicWorkPolicy.UPDATE,
          request,
      )
    }

    fun cancel(context: Context) {
      WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
    }
  }
}
