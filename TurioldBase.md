## Mapper – Tutorial Base (RN 0.79, New Arch, Reanimated 4, Screens 4.14)

Tài liệu này tổng hợp **kinh nghiệm cấu hình base từ đầu** cho dự án này, để sau này nâng cấp hay khởi tạo dự án mới không lặp lại lỗi.

---

### 1. Nguyên tắc vàng: luôn làm việc theo đúng phiên bản đang dùng

- **Bước 1 – Xác định version thật**:
  - Xem trong `package.json`, ví dụ:
    - `react-native`: `0.79.0`
    - `react-native-reanimated`: `4.1.0`
    - `react-native-worklets`: `0.5.1`
    - `react-native-screens`: `4.14.0`
  - Nếu nghi ngờ, mở thêm:
    - `node_modules/<tên-lib>/package.json` → trường `"version"`.

- **Bước 2 – Đọc README đi kèm trong `node_modules`**:
  - Ví dụ:
    - `node_modules/react-native-screens/README.md`
    - `node_modules/react-native-reanimated/README.md`
  - Đây là docs **đúng với version bạn đã cài**, luôn ưu tiên nó hơn so với docs trên `main` branch.

- **Bước 3 – Nếu phải đọc docs trên GitHub/web**:
  - Chọn **tag/branch** trùng với version:
    - Ví dụ: dùng `react-native-screens@4.14.0` → trên GitHub chọn tag `v4.14.0`.
  - Không copy hướng dẫn của bản mới hơn (vì API/class có thể đã đổi).

- **Bước 4 – Khi copy code mẫu, luôn kiểm tra lại trong `node_modules`**:
  - Nếu docs bảo import `SomeClass` mà trong:
    - `node_modules/<lib>/android/src/main/java/...` **không tìm thấy file/class đó** → docs không khớp version.
  - Tránh import các class “ảo” kiểu:
    - `RNScreensFragmentFactory` (không tồn tại trong `react-native-screens@4.14.0`).

---

### 2. Profile base của dự án Mapper

- **React / React Native**:
  - `react`: `19.0.0`
  - `react-native`: `0.79.0` (New Architecture, Fabric)

- **Navigation & UI**:
  - `@react-navigation/native`: `^7.2.2`
  - `@react-navigation/native-stack`: `^7.14.10`
  - `react-native-screens`: `4.14.0` (RN 0.79 + Fabric)
  - `react-native-gesture-handler`: `^2.20.0`
  - `react-native-safe-area-context`: `^5.7.0`

- **State & storage**:
  - `zustand`: `^5.0.12`
  - `react-native-mmkv`: `^4.3.0` (Nitro + New Arch)
  - `react-native-nitro-modules`: `^0.35.2`

- **Animations & worklets**:
  - `react-native-reanimated`: `4.1.0`
  - `react-native-worklets`: `0.5.1`

---

### 3. Reanimated 4.x + react-native-worklets + New Architecture

- **Sự thật quan trọng**:
  - Reanimated **4.x**:
    - Chỉ chạy với **New Architecture (Fabric)**.
    - **Phụ thuộc** vào `react-native-worklets` – worklet runtime được tách riêng.
  - Reanimated **3.x**:
    - Không chạy được nếu cài `react-native-worklets`.

- **Bảng tương thích chính (đã rút gọn theo case này)**:

  - Reanimated vs React Native:

    | Reanimated 4.x | RN 0.78 | RN 0.79 |
    |----------------|---------|---------|
    | 4.0.x          | yes     | yes     |
    | 4.1.x          | yes     | yes     |
    | 4.2.x          | no      | no      |
    | 4.3.x          | no      | no      |

  - Reanimated vs `react-native-worklets`:

    | Reanimated 4.x | 0.4.x | **0.5.x** | 0.6.x | 0.7.x | 0.8.x |
    |----------------|-------|-----------|-------|-------|-------|
    | 4.1.x          | no    | **yes**   | yes   | yes   | yes   |

- **Kết luận cho Mapper**:
  - `react-native@0.79.0`
  - `react-native-reanimated@4.1.0`
  - `react-native-worklets@0.5.1`
  - → Combo **hợp lệ** và tương thích.

- **Cấu hình Babel chuẩn cho Reanimated 4**:

  `babel.config.js`:

  ```js
  // babel.config.js
  module.exports = {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      // react-native-worklets/plugin bắt buộc cho Reanimated 4 – để cuối cùng
      'react-native-worklets/plugin',
    ],
  };
  ```

  - Reanimated 4 đã chuyển plugin Babel sang `react-native-worklets/plugin`.
  - Không dùng lại `'react-native-reanimated/plugin'` cho Reanimated 4.

---

### 4. react-native-screens 4.14.0 + React Navigation + MainActivity

#### 4.1. Version phù hợp với RN 0.79

- Theo README của `react-native-screens`:

  | library version | react-native version |
  |----------------|----------------------|
  | **4.14.0+**    | **0.79.0+**          |

- Trong Mapper:
  - Pin `"react-native-screens": "4.14.0"` (không dùng `^` để tránh bay lên bản 4.24+ mới, có thể sinh thêm issue).

#### 4.2. Cấu hình cơ bản

- Import và bật `enableScreens` trong `App.tsx`:

  ```ts
  import { enableScreens } from 'react-native-screens';

  enableScreens();
  ```

- Bọc app với `NavigationContainer` + `GestureHandlerRootView`:

  ```tsx
  import React from 'react';
  import { NavigationContainer } from '@react-navigation/native';
  import { createNativeStackNavigator } from '@react-navigation/native-stack';
  import { GestureHandlerRootView } from 'react-native-gesture-handler';

  const Stack = createNativeStackNavigator();

  export default function App() {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator>
            {/* screens */}
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    );
  }
  ```

#### 4.3. MainActivity – tránh crash Activity restart

- Docs **đúng version 4.14.0** chỉ yêu cầu:

  ```kotlin
  import android.os.Bundle
  import com.facebook.react.ReactActivity

  class MainActivity : ReactActivity() {
    // ... code khác

    // react-native-screens override
    override fun onCreate(savedInstanceState: Bundle?) {
      super.onCreate(null)
    }
  }
  ```

- Lý do:
  - Khi Activity bị system kill & recreate, Android sẽ cố phục hồi state view cũ.
  - Gọi `super.onCreate(null)` thay vì `savedInstanceState` giúp **bỏ state cũ**, tránh crash/inconsistency khi dùng `react-native-screens`.
- Sai lầm đã gặp:
  - Copy docs cũ có `RNScreensFragmentFactory`:
    - `import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory`
  - Trong `4.14.0` **không còn class/package này**, nên Kotlin báo:
    - `Unresolved reference 'fragment'`
    - `Unresolved reference 'RNScreensFragmentFactory'`
  - Bài học: **luôn kiểm tra lại class thực sự có trong `node_modules`**.

---

### 5. Static navigation vs “dynamic navigation”

- **Static navigation (Mapper đang dùng)**:
  - Toàn bộ `Stack`, `Tab`, `Drawer` được khai báo tĩnh trong code:
    - Có `RootStackParamList`, `AppStackParamList`, v.v.
  - Mọi route name/params đều type-safe.

- **Ưu điểm**:
  - Dễ maintain, dễ refactor.
  - Dễ tối ưu hiệu năng với `react-native-screens` + Reanimated.
  - Dễ đọc code, phù hợp app không cần thay đổi cấu trúc navigation “theo JSON server”.

- **Dynamic navigation**:
  - Cây navigator sinh từ data (JSON config, role, feature flag).
  - Linh hoạt nhưng:
    - Khó type-safe.
    - Logic phức tạp hơn, debug nặng hơn – nhất là với Fabric + nhiều lib native.

**Kết luận**: với RN 0.79 + Fabric + `react-native-screens` + Reanimated 4, **static navigation** là lựa chọn ưu tiên cho sự ổn định.

---

### 6. MMKV + Nitro + New Architecture

- **Lib**: `react-native-mmkv@4.x` + `react-native-nitro-modules`.
- Với New Arch:
  - Hầu như **không cần** config thủ công trên Android/iOS, chỉ:
    - `yarn install`
    - `cd android && .\gradlew.bat clean && cd .. && yarn android`

- Ví dụ wrapper đơn giản:

```ts
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

export function setString(key: string, value: string) {
  storage.set(key, value);
}

export function getString(key: string) {
  return storage.getString(key);
}
```

---

### 7. Scripts & “clean flow” (PowerShell – Windows)

Chạy từ root project: `d:\user\Projects\Mapper`.

#### 7.1. Reset Metro cache (khi đổi Babel / plugin)

```powershell
yarn start --reset-cache
```

#### 7.2. Clean Android build nhanh (Gradle only)

```powershell
cd android
.\gradlew.bat clean
cd ..
```

#### 7.3. Xoá build artifacts Android (khi lỗi native/Kotlin/C++)

```powershell
Remove-Item -Recurse -Force "android/app/.cxx" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android/app/build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android/build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android/.gradle" -ErrorAction SilentlyContinue

cd android
.\gradlew.bat clean
cd ..
```

#### 7.4. Reset JS deps (node_modules) khi nghi bị “lẫn”

```powershell
Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
yarn install
```

#### 7.5. Reset mạnh (xoá cả `yarn.lock`) – dùng hạn chế

Chỉ khi lockfile có vẻ hỏng hoặc muốn regen toàn bộ dependency tree.

```powershell
Remove-Item -Force "yarn.lock" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
yarn cache clean
yarn install
```

#### 7.6. Lỗi Kotlin daemon / incremental cache bị kẹt

Ví dụ lỗi kiểu:

- `Could not close incremental caches...`
- `Storage ... is already registered`

Cách xử lý:

```powershell
cd android
.\gradlew.bat --stop
cd ..

Remove-Item -Recurse -Force "node_modules\@react-native\gradle-plugin\shared\build\kotlin" -ErrorAction SilentlyContinue

cd android
.\gradlew.bat clean
cd ..
```

---

### 8. Quy trình build chuẩn cho Android (Mapper base)

```powershell
yarn install
yarn start --reset-cache   # Terminal 1 (Metro)

cd android
.\gradlew.bat clean        # khi vừa đổi version lib native
cd ..

yarn android               # Terminal 2
```

Nếu có lỗi:

- Đọc kỹ xem task nào fail:
  - `:react-native-screens:compileDebugKotlin`
  - `:react-native-mmkv:compileDebugKotlin`
  - `:app:compileDebugKotlin`
- So sánh lại:
  - Version trong `package.json` ↔ `node_modules/*/package.json`.
  - Hướng dẫn trong `node_modules/<lib>/README.md` đã làm **đúng version** chưa.

---

### 9. Checklist khi thêm / nâng một thư viện native

1. **Cài lib**:
   - Cập nhật `package.json` → `yarn install`.
2. **Đọc README trong `node_modules/<lib>/README.md`**:
   - Kiểm tra phần:
     - New Architecture / Fabric support.
     - Android/iOS setup.
     - Babel plugin nếu có.
3. **Kiểm tra version compatibility table (nếu có)**:
   - Đảm bảo React Native version đang dùng nằm trong bảng.
4. **Chạy flow build chuẩn** (mục 8).
5. Nếu lỗi:
   - Đọc log, xác định lib nào fail.
   - So lại version + tài liệu đúng version.
   - Chỉ làm theo hướng dẫn đúng tag/version, không copy code của bản mới hơn nếu class không tồn tại trong `node_modules`.

