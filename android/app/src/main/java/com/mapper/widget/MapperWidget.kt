package com.mapper.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.action.actionStartActivity
import com.mapper.MainActivity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Home screen widget viết bằng **Jetpack Glance** (Compose → RemoteViews).
 *
 * Vì sao Glance chứ không phải RemoteViews thuần hay lib JSX:
 *   - Glance là API chính thức của Google cho AppWidget từ 2023, hỗ trợ
 *     Material3, dark mode, và kích thước động (SizeMode.Exact)
 *   - RemoteViews thuần: phải viết XML cho từng cỡ, không có state
 *   - lib render JSX ra RemoteViews: thêm một tầng dịch, khó debug, và vẫn bị
 *     mọi giới hạn của RemoteViews
 *
 * ⚠️ Không có React Native ở đây. Widget chạy trong process của launcher.
 */
class MapperWidget : GlanceAppWidget() {

  companion object {
    /**
     * Route gửi kèm khi mở app từ widget. MainActivity đọc extra này ra và
     * MapperWidgetModule.getInitialRoute() trả cho JS để điều hướng.
     */
    val ROUTE_KEY = ActionParameters.Key<String>("deeplinkRoute")
  }

  override val sizeMode = SizeMode.Exact

  private fun routeParams(route: String) = actionParametersOf(ROUTE_KEY to route)

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val snapshot = WidgetSnapshotStore.read(context)

    provideContent {
      GlanceTheme {
        if (snapshot.loggedIn) {
          LoggedInContent(snapshot)
        } else {
          LoginRequiredContent()
        }
      }
    }
  }

  /**
   * Chưa đăng nhập: CHỈ hiện lời mời đăng nhập.
   *
   * Không hiện số liệu mờ mờ, không hiện placeholder trông giống dữ liệu thật.
   * OS không cho phép ẩn widget khỏi gallery theo điều kiện runtime, nên đây là
   * cách duy nhất để "chưa login thì không xem được" (docs/05 mục 5).
   */
  @Composable
  private fun LoginRequiredContent() {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.widgetBackground)
            .cornerRadius(16.dp)
            .padding(16.dp)
            .clickable(actionStartActivity<MainActivity>(routeParams("login"))),
        verticalAlignment = Alignment.Vertical.CenterVertically,
        horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
    ) {
      Text(
          text = "Mapper",
          style = TextStyle(
              fontSize = 15.sp,
              fontWeight = FontWeight.Bold,
              color = GlanceTheme.colors.onSurface,
          ),
      )
      Spacer(GlanceModifier.height(6.dp))
      Text(
          text = "Đăng nhập để xem thông tin",
          style = TextStyle(fontSize = 13.sp, color = GlanceTheme.colors.onSurfaceVariant),
      )
      Spacer(GlanceModifier.height(10.dp))
      Text(
          text = "Mở ứng dụng →",
          style = TextStyle(
              fontSize = 13.sp,
              fontWeight = FontWeight.Medium,
              color = GlanceTheme.colors.primary,
          ),
      )
    }
  }

  @Composable
  private fun LoggedInContent(snapshot: WidgetSnapshotStore.Snapshot) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(GlanceTheme.colors.widgetBackground)
            .cornerRadius(16.dp)
            .padding(14.dp)
            .clickable(actionStartActivity<MainActivity>(routeParams("home"))),
    ) {
      Text(
          text = snapshot.title.ifBlank { "Mapper" },
          style = TextStyle(
              fontSize = 13.sp,
              fontWeight = FontWeight.Medium,
              color = GlanceTheme.colors.onSurfaceVariant,
          ),
      )
      Spacer(GlanceModifier.height(6.dp))
      Text(
          text = snapshot.primaryValue.ifBlank { "—" },
          style = TextStyle(
              fontSize = 26.sp,
              fontWeight = FontWeight.Bold,
              color = GlanceTheme.colors.onSurface,
          ),
      )
      if (snapshot.secondaryValue.isNotBlank()) {
        Spacer(GlanceModifier.height(2.dp))
        Text(
            text = snapshot.secondaryValue,
            style = TextStyle(fontSize = 13.sp, color = GlanceTheme.colors.onSurfaceVariant),
        )
      }

      Spacer(GlanceModifier.height(8.dp))

      Row(
          modifier = GlanceModifier.fillMaxWidth(),
          verticalAlignment = Alignment.Vertical.CenterVertically,
      ) {
        // Mốc "Cập nhật lúc HH:mm" là BẮT BUỘC: người dùng phải biết dữ liệu cũ
        // tới đâu thay vì tin nhầm nó đang realtime.
        Text(
            text = "Cập nhật ${formatTime(snapshot.updatedAtMs)}",
            style = TextStyle(fontSize = 11.sp, color = GlanceTheme.colors.onSurfaceVariant),
        )
      }
    }
  }

  private fun formatTime(epochMs: Long): String =
      if (epochMs <= 0L) "—"
      else SimpleDateFormat("HH:mm", Locale("vi")).format(Date(epochMs))
}
