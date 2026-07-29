package com.mapper.widget

import android.content.Context
import org.json.JSONObject

/**
 * Kho snapshot cho widget.
 *
 * Nguyên tắc (docs/05 mục 4 & 8bis): **widget KHÔNG gọi API**. App ghi ra một
 * snapshot JSON, widget chỉ đọc và vẽ. Lý do:
 *   - widget chạy trong process của launcher, bị giới hạn bộ nhớ và thời gian
 *   - gọi mạng trong AppWidget là nguồn ANR kinh điển
 *   - không có chỗ nào an toàn để widget cầm access token
 *
 * Dùng SharedPreferences (không phải DataStore) vì Glance đọc đồng bộ trong
 * `provideGlance` và ta cần một API đơn giản gọi được từ cả worker lẫn RN module.
 */
object WidgetSnapshotStore {

  private const val PREFS = "mapper_widget_snapshot"
  private const val KEY_PAYLOAD = "payload"
  private const val KEY_UPDATED_AT = "updatedAt"
  private const val KEY_LOGGED_IN = "loggedIn"
  private const val KEY_REFRESH_MINUTES = "refreshMinutes"

  data class Snapshot(
      val loggedIn: Boolean,
      val title: String,
      val primaryValue: String,
      val secondaryValue: String,
      /** Mốc epoch ms để widget đếm ngược bằng Chronometer — không cần app sống. */
      val countdownTargetMs: Long?,
      val updatedAtMs: Long,
      val refreshMinutes: Int,
  )

  private fun prefs(context: Context) =
      context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /**
   * @param payloadJson JSON do JS ghi xuống, hình dạng khai ở
   *        src/features/widget/types.ts (WidgetSnapshot).
   */
  fun write(context: Context, payloadJson: String, loggedIn: Boolean, refreshMinutes: Int) {
    prefs(context).edit()
        .putString(KEY_PAYLOAD, payloadJson)
        .putBoolean(KEY_LOGGED_IN, loggedIn)
        .putInt(KEY_REFRESH_MINUTES, refreshMinutes)
        .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
        .apply()
  }

  /**
   * Xoá sạch. GỌI KHI LOGOUT, **trước** khi điều hướng về màn Login.
   *
   * Quên bước này = dữ liệu của người dùng cũ nằm chình ình trên màn hình chính
   * cho người cầm máy tiếp theo nhìn thấy. docs/05 mục 5 xếp đây là hạng mục
   * CHẶN PHÁT HÀNH.
   */
  fun clear(context: Context) {
    prefs(context).edit().clear().apply()
  }

  fun read(context: Context): Snapshot {
    val p = prefs(context)
    val loggedIn = p.getBoolean(KEY_LOGGED_IN, false)
    val updatedAt = p.getLong(KEY_UPDATED_AT, 0L)
    val refreshMinutes = p.getInt(KEY_REFRESH_MINUTES, 5)
    val raw = p.getString(KEY_PAYLOAD, null)

    if (!loggedIn || raw.isNullOrBlank()) {
      return Snapshot(
          loggedIn = false,
          title = "",
          primaryValue = "",
          secondaryValue = "",
          countdownTargetMs = null,
          updatedAtMs = updatedAt,
          refreshMinutes = refreshMinutes,
      )
    }

    return try {
      val json = JSONObject(raw)
      Snapshot(
          loggedIn = true,
          title = json.optString("title"),
          primaryValue = json.optString("primaryValue"),
          secondaryValue = json.optString("secondaryValue"),
          countdownTargetMs = json.optLong("countdownTargetMs", 0L).takeIf { it > 0L },
          updatedAtMs = updatedAt,
          refreshMinutes = refreshMinutes,
      )
    } catch (_: Exception) {
      // JSON hỏng: coi như chưa có dữ liệu, KHÔNG hiện dữ liệu cũ một nửa.
      Snapshot(false, "", "", "", null, updatedAt, refreshMinutes)
    }
  }
}
