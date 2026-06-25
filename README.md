## Mapper – Ghi chú cài đặt & tương thích (RN 0.79, New Arch/Fabric)

Project dùng `react-native@0.79.0` với New Architecture (Fabric) và các lib:

- `react-native-reanimated@4.1.0`
- `react-native-worklets@0.5.1`
- `react-native-mmkv@4.x` (nitro)
- `@react-navigation/native`, `@react-navigation/native-stack`
- `react-native-screens@4.14.0` (bản 4.x hỗ trợ RN 0.79)
- `react-native-gesture-handler`, `react-native-safe-area-context`

### 1. Yêu cầu môi trường

- **Node**: `>=18` (theo `package.json`).
- Đã cài đủ Android SDK, JDK, trình giả lập như hướng dẫn chính thức React Native.
- Sử dụng **Yarn** (khuyến nghị) cho đồng bộ dependency.

### 2. Cài dependency từ đầu

```bash
yarn install
```

### 2.1. Lúc nào cần clean?

- Sau khi đổi version dependency có native (ví dụ `react-native-screens`, `react-native-mmkv`, `react-native-reanimated`, `react-native-worklets`)
- Hoặc sau khi bạn gặp lỗi build Kotlin/Gradle

## TutorialBase / Scripts (PowerShell)

> Các lệnh dưới đây dùng cho Windows PowerShell, chạy từ `d:\user\Projects\Mapper` (root project).

### A. Reset Metro cache (khi đổi babel)

```powershell
yarn start --reset-cache
```

### B. Clean Android build nhanh (Gradle only)

```powershell
cd android
.\gradlew.bat clean
cd ..
```

### C. Xóa build artifacts Android (khi lỗi compile/native)

```powershell
Remove-Item -Recurse -Force "android/app/.cxx" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android/app/build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android/build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android/.gradle" -ErrorAction SilentlyContinue

cd android
.\gradlew.bat clean
cd ..
```

### D. Reset JS deps (khi nghi node_modules bị lẫn)

```powershell
Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
yarn install
```

### E. Reset “nặng” (xóa cả `yarn.lock`) khi nào?

Chỉ dùng khi bạn muốn regen lock hoàn toàn (hoặc lockfile có vẻ mâu thuẫn).

```powershell
Remove-Item -Force "yarn.lock" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
yarn cache clean
yarn install
```

### F. Lỗi Kotlin daemon/cache (Gradle) bị kẹt

Đây là lỗi kiểu “Could not close/delete incremental caches …”.

```powershell
cd android
.\gradlew.bat --stop
cd ..

Remove-Item -Recurse -Force "node_modules\@react-native\gradle-plugin\shared\build\kotlin" -ErrorAction SilentlyContinue

cd android
.\gradlew.bat clean
cd ..
```

### 3. Bật New Architecture (Fabric) cho Android

Mở `android/gradle.properties` và đảm bảo:

```properties
newArchEnabled=true
hermesEnabled=true
```

Sau khi bật New Arch:

```powershell
cd android
.\gradlew.bat clean
cd ..
yarn android
```

### 4. Cấu hình Reanimated 4.x + react-native-worklets (New Architecture bắt buộc)

Theo tài liệu chính thức:

- **Reanimated 4.x chỉ chạy trên React Native New Architecture (Fabric)**.
- Reanimated 4.x **phụ thuộc** vào `react-native-worklets`:
  - Reanimated 3 **không hoạt động** nếu cài `react-native-worklets`.
  - Reanimated 4 **bắt buộc phải có** `react-native-worklets` đúng version.

#### 4.1. Version tương thích (đang dùng trong project)

- `react-native`: **0.79.0**
- `react-native-reanimated`: **4.1.x** → theo bảng hỗ trợ:

  | Reanimated 4.x | RN 0.78 | RN 0.79 |
  |----------------|---------|---------|
  | **4.0.x**      | yes     | yes     |
  | **4.1.x**      | yes     | yes     |
  | 4.2.x          | no      | no      |
  | 4.3.x          | no      | no      |

- `react-native-worklets`: **0.5.x** → theo bảng hỗ trợ:

  | Reanimated 4.x | 0.4.x | **0.5.x** | 0.6.x | 0.7.x | 0.8.x |
  |----------------|-------|-----------|-------|-------|-------|
  | **4.1.x**      | no    | **yes**   | yes   | yes   | yes   |

=> Combo trong `package.json` (`react-native-reanimated@4.1.0` + `react-native-worklets@0.5.1`) **đã đúng với RN 0.79.0**.

#### 4.2. Cấu hình Babel

Với React Native Community CLI (dự án này), cần thêm plugin `react-native-worklets/plugin` **cuối cùng** trong `babel.config.js`:

```js
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    // ... các plugin khác
    '@babel/plugin-proposal-export-namespace-from', // nếu build web (tùy chọn)
    'react-native-worklets/plugin', // PHẢI ở cuối
  ],
};
```

Lưu ý:

- **Không** thêm plugin `'react-native-reanimated/plugin'` nữa, vì với Reanimated 4, worklets được tách sang `react-native-worklets/plugin`.
- Sau khi đổi Babel, luôn **xoá cache Metro**:

```bash
yarn start --reset-cache
```

#### 4.3. Ghi chú về “worklets”

- Từ Reanimated 4:
  - Worklet runtime được cung cấp bởi **`react-native-worklets`** (tách khỏi package Reanimated).
  - Mọi animation/gesture “kiểu mới” đều là **worklet** chạy trên UI thread.
- Khi viết hàm custom worklet, vẫn dùng `"worklet";` đầu hàm như Reanimated 2/3.

### 5. Cấu hình React Navigation + react-native-screens

1. Đảm bảo đã cài các package (được khai báo trong `package.json`):

   - `@react-navigation/native`
   - `@react-navigation/native-stack`
   - `react-native-gesture-handler`
   - `react-native-screens`
   - `react-native-safe-area-context`

2. Bật `react-native-screens`:

```ts
// App.tsx
import { enableScreens } from 'react-native-screens';

enableScreens();
```

3. (Tuỳ chọn) Bật thử nghiệm `react-freeze` để tối ưu hiệu năng (yêu cầu RN >= 0.68, `react-native-screens` >= 3.9.0):

```ts
import { enableFreeze } from 'react-native-screens';

enableFreeze(true);
```

4. Bọc app bằng `NavigationContainer` và `GestureHandlerRootView`:

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

5. Ghi chú tương thích `react-native-screens` 4.x và RN:

- Với RN 0.79.0, theo bảng tương thích chính thức:
  - **Fabric** (New Architecture) được hỗ trợ từ:

    | `react-native-screens` | `react-native` |
    |------------------------|----------------|
    | `4.14.0+`             | `0.79.0+`      |

  - **Legacy (Paper)**:

    | `react-native-screens` | `react-native` (legacy) |
    |------------------------|-------------------------|
    | `4.14.0+`             | `0.79.0+`               |

=> Dự án này dùng RN 0.79 nên cần tối thiểu `react-native-screens@4.14.0`.

### 5.2. Static navigation vs “dynamic navigation”

Trong Mapper, **navigation được thiết kế static**:

- Toàn bộ cây navigator (`Stack`, `Tab`, `Drawer`) được **khai báo tĩnh trong code** với TypeScript (`RootStackParamList`, v.v.).
- Route name & params đều được type-safe, IDE hỗ trợ tốt.

**Ưu điểm static navigation** (cách mà Mapper chọn):

- **Type-safe & dễ maintain**: sai route/param báo lỗi compile thay vì crash runtime.
- **Dễ tối ưu performance**: biết rõ trước số screen, dễ cấu hình `detachInactiveScreens`, `freezeOnBlur`, Reanimated transitions.
- **Code rõ ràng**: một vài file navigator mô tả toàn bộ flow, dễ review và refactor.

**Dynamic navigation** (ít dùng trong app này):

- Navigator tree sinh từ dữ liệu runtime (JSON config, role, feature flag…).
- Linh hoạt cho white-label/B2B, nhưng:
  - Khó type-safe, nhiều string literal.
  - Debug khó, logic phức tạp hơn (đặc biệt với Fabric + nhiều lib native).

Với RN 0.79 + Fabric + Reanimated 4 + `react-native-screens`, **static navigation** là lựa chọn mặc định để giữ code đơn giản, ổn định nhưng vẫn đủ mạnh cho hầu hết use case.

### 5.1. Ghi chú MainActivity cho Android (tránh crash khi Activity restart)

Theo tài liệu `react-native-screens`, trên Android state của `View` có thể không được khôi phục nhất quán khi Activity restart, dễ dẫn đến crash. Khuyến nghị **override** method `onCreate` trong `MainActivity` và gọi `super.onCreate(null)` để bỏ state cũ.

#### Kotlin (`MainActivity.kt`)

```kotlin
import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    // react-native-screens override (theo docs)
    super.onCreate(null)
  }
}
```

Lưu ý:

- Đặt override `onCreate` **trong `MainActivity`**, **không** đặt trong `MainActivityDelegate`.

### 6. Cấu hình react-native-mmkv (Nitro + New Arch)

`react-native-mmkv@4` đã hỗ trợ New Arch và `react-native-nitro-modules`, nên trên Android hầu như **không cần** cấu hình manual.

Ví dụ store đơn giản:

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

Khi build lần đầu sau khi thêm MMKV:

```powershell
cd android
.\gradlew.bat clean
cd ..
yarn android
```

### 7. Ghi chú tương thích & lỗi `react-native-screens` (Android)

Lỗi bạn gặp:

```text
Class 'BottomSheetDialogRootView' is not abstract and does not implement abstract member 'onChildStartedNativeGesture'
... 'onChildStartedNativeGesture' overrides nothing
... 'getPointerEvents' overrides nothing
```

**Nguyên nhân**: API gesture/pointer bên React Native Android (từ 0.78/0.79) đã thay đổi, trong khi version `react-native-screens` bạn đang dùng (`"react-native-screens": "4.3.0"`) vẫn dùng API cũ (`onChildStartedNativeGesture`, `getPointerEvents` cũ), dẫn tới Kotlin báo class không implement/override đúng method.

**Cách khắc phục**:

- Nâng `react-native-screens` lên bản 4.x mới hơn đã hỗ trợ RN 0.79 (ví dụ):

```json
"react-native-screens": "4.14.0"
```

- Sau đó chạy lại:

```powershell
yarn install
cd android
.\gradlew.bat clean
cd ..
yarn android
```

Nếu vẫn lỗi, hãy đảm bảo:

- Không còn bản cũ của `react-native-screens` bị cache trong `android/.gradle` hoặc `android/app/build`.
- Toàn bộ node_modules được cài lại bằng `yarn install` (không trộn `npm` và `yarn`).

### 8. Quy trình build chuẩn cho Android (RN 0.79 + New Arch)

```bash
yarn install
yarn start --reset-cache   # tab 1

cd android
.\gradlew.bat clean            # khi đổi version lib native
cd ..

yarn android               # tab 2
```

Nếu gặp lỗi Gradle/Kotlin:

- Đọc kỹ phần `:react-native-screens:compileDebugKotlin` hoặc lib nào đang fail.
- Kiểm tra lại version lib đó có support RN 0.79/New Arch chưa, update lên bản mới nhất 4.x/5.x tương thích.
