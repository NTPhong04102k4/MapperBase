package com.mapper

import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.mapper.splash.SplashGate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "Mapper"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    // installSplashScreen() PHẢI gọi TRƯỚC super.onCreate(): sau đó window đã
    // dựng bằng theme cũ và splash sẽ không hiện.
    val splashScreen = installSplashScreen()

    // Giữ splash cho tới khi JS gọi SplashScreen.hide(). Thiếu bước này thì
    // splash tắt ngay khi Activity dựng xong và người dùng thấy một khoảng
    // trắng trong lúc RN còn đang nạp bundle.
    splashScreen.setKeepOnScreenCondition { SplashGate.isVisible }

    // react-native-screens: truyền null để tránh Activity restart lệch state.
    super.onCreate(null)
  }
}
