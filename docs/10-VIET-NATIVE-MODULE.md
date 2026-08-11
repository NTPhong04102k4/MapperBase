# 10 – Hướng dẫn viết code ở tầng JS ↔ native

> `docs/09` giải thích **cơ chế** (Hermes, JSI, TurboModule, Nitro, Fabric). File này là **hướng dẫn
> viết code + checklist**: chọn con đường nào, viết từng bước ra sao, quy ước gì bắt buộc, và review
> cái gì trước khi merge.
>
> Mọi đoạn code dưới đây theo đúng quy ước của repo: tiếng Việt, comment giải thích **vì sao** chứ
> không mô tả lại code, alias `@/`, và không phá luật import ở `docs/08` mục 1.

## Mục lục

| # | Nội dung |
|---|---|
| 1 | Chọn con đường: legacy / TurboModule / Nitro |
| 2 | Viết TurboModule trong repo này — 8 bước |
| 3 | Quy ước gọi native từ JS (phần hay làm sai nhất) |
| 4 | Quy ước viết native (Kotlin / Swift) |
| 5 | Worklet: viết gì được, viết gì không |
| 6 | Nitro: khi nào mới cần |
| 7 | Checklist thêm/sửa một native module |
| 8 | Checklist review PR có code native |
| 9 | Đo và debug |

---

## 1. Chọn con đường

Trả lời ba câu hỏi theo thứ tự, dừng ở câu đầu tiên trả lời "có":

```
① API này có được gọi ĐỒNG BỘ không? (JS cần giá trị ngay trong cùng biểu thức)
     có → TurboModule (hoặc Nitro)          không → tiếp
② Gọi bao nhiêu lần mỗi giây? > ~50, hoặc truyền buffer nhị phân (ảnh/audio/frame)?
     có → Nitro                              không → tiếp
③ Có nhiều instance mang state riêng không? (kiểu "3 kho storage")
     có → Nitro                              không → TurboModule
```

Không có nhánh nào dẫn tới "viết legacy bridge module mới". Lý do không phải thẩm mỹ:

| | Legacy | TurboModule |
|---|---|---|
| Sai tên method | `undefined is not a function` **lúc chạy**, trên máy QA | Lỗi **lúc build** |
| Sai kiểu tham số | Chuyển đổi im lặng hoặc crash ở native | Lỗi lúc build |
| Trên Android bridgeless RN 0.79 | **Không có binding nếu interop chưa bật** — xem `docs/09` mục 12 | Chạy, không cần cờ nào |

Năm module hiện có trong `MapperPackage.kt` là legacy vì lý do lịch sử. **Code mới thì không thêm vào
danh sách đó nữa**, và khi sửa một module cũ thì cân nhắc chuyển luôn (mục 2).

---

## 2. Viết TurboModule trong repo này — 8 bước

Ví dụ dùng xuyên suốt: chuyển `MapperAppEnv` (module đang có thật, và đang là mắt yếu theo `docs/09`
mục 12) từ legacy sang TurboModule.

### Bước 1 — Viết spec TypeScript

Đây là **nguồn sự thật duy nhất** của API. Đặt tại `src/shared/native/specs/NativeMapperAppEnv.ts`
(tên file **phải** bắt đầu bằng `Native`, codegen dò theo quy ước này):

```ts
import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

/**
 * Spec cho native module MapperAppEnv.
 *
 * Codegen đọc file này lúc build để sinh lớp trừu tượng cho Kotlin/ObjC. Sửa file này mà không build
 * lại native thì Kotlin sẽ không compile — đó là điều MONG MUỐN: nó chặn việc JS và native lệch nhau.
 *
 * Giới hạn kiểu của codegen (không phải giới hạn của TypeScript):
 *   dùng được: boolean | number | string | object literal | mảng của các kiểu đó | Promise | void
 *   KHÔNG dùng được: union kiểu 'dev' | 'staging' | 'prod', enum, Date, Map, kiểu generic
 * Nên `flavor` khai là string ở đây, và thu hẹp lại thành Flavor ở tầng
 * `src/shared/config/env.ts` — chỗ đã có validate.
 */
export interface Spec extends TurboModule {
  getConstants(): {
    flavor: string;
    apiBaseUrl: string;
    forgeRockUrl: string;
    forgeRockRealm: string;
    sePayEnv: string;
    widgetRefreshMinutes: number;
    applicationId: string;
    versionName: string;
    buildNumber: number;
    isDebug: boolean;
    appName: string;
  };
}

export default TurboModuleRegistry.getEnforcing<Spec>('MapperAppEnv');
```

`getEnforcing` (thay vì `get`) là chủ ý: thiếu module thì **ném lỗi ngay**, không trả `null` để rồi
im lặng rơi về fallback — đúng bài học ở `docs/09` mục 12.4.

### Bước 2 — Khai `codegenConfig` trong `package.json`

```json
"codegenConfig": {
  "name": "MapperSpecs",
  "type": "modules",
  "jsSrcsDir": "src/shared/native/specs",
  "android": {
    "javaPackageName": "com.mapper.specs"
  }
}
```

`type: "modules"` = chỉ có native module, không có Fabric component. Nếu sau này tự viết view native
thì đổi thành `"all"`.

### Bước 3 — Chạy codegen và **đọc** output

Gradle/Xcode tự chạy bước này lúc build, nhưng lần đầu nên chạy tay để xem nó sinh ra cái gì:

```powershell
node node_modules/react-native/scripts/generate-codegen-artifacts.js -p . -t android -o "$env:TEMP\codegen-preview"
```

Mở file `.../NativeMapperAppEnvSpec.java` vừa sinh và **copy chính xác signature** của các method trừu
tượng vào Kotlin. Đừng đoán tên — với module có `getConstants`, codegen sinh ra một method trừu tượng
riêng cho phần constant, và tên method này thay đổi giữa các version RN. Đây chính là "nguyên tắc
vàng" ở `TurioldBase.md`: đọc đúng version đã cài, đừng copy từ blog.

Output thật lúc build nằm ở (không commit, đã trong `.gitignore` của thư mục build):

```
android/app/build/generated/source/codegen/java/com/mapper/specs/...
ios/build/generated/ios/...
```

### Bước 4 — Kotlin: hiện thực spec

```kotlin
package com.mapper.env

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.mapper.BuildConfig
import com.mapper.R
import com.mapper.specs.NativeMapperAppEnvSpec   // ← do codegen sinh, không phải file bạn viết

@ReactModule(name = AppEnvModule.NAME)
class AppEnvModule(reactContext: ReactApplicationContext) :
    NativeMapperAppEnvSpec(reactContext) {

  companion object {
    const val NAME = "MapperAppEnv"   // PHẢI trùng tên trong getEnforcing() ở spec
  }

  override fun getName(): String = NAME

  // Tên method này lấy từ file codegen ở Bước 3, không phải nhớ theo trí nhớ.
  override fun getTypedExportedConstants(): MutableMap<String, Any> =
      mutableMapOf(
          "flavor" to BuildConfig.FLAVOR_ENV,
          // ... giữ nguyên danh sách như bản legacy
          "appName" to reactApplicationContext.getString(R.string.app_name),
      )
}
```

### Bước 5 — iOS: hiện thực spec

Codegen sinh protocol ObjC `NativeMapperAppEnvSpec` + lớp C++ `NativeMapperAppEnvSpecJSI`. Hai cách:

- **ObjC/ObjC++** (`.mm`): khai `@interface AppEnvModule : NSObject <NativeMapperAppEnvSpec>` và thêm
  `- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params`.
- **Swift**: Swift không thấy được protocol C++/ObjC sinh ra một cách trực tiếp → viết một lớp
  ObjC++ mỏng làm cầu, phần logic để trong Swift. Repo đã có tiền lệ ở `ios/Mapper/Native/`.

⚠️ Trên iOS, legacy module **vẫn chạy** trong bridgeless (interop bật sẵn), nên rất dễ chuyển Android
xong rồi quên iOS. Chuyển thì chuyển cả hai, nếu không sẽ có hai đường code cho cùng một API.

### Bước 6 — Đăng ký module

`MapperPackage.kt` hiện là `ReactPackage` thuần. Sau khi module là TurboModule thật thì nó chạy được
ngay (delegate của RN đọc annotation `@ReactModule` và nhận ra lớp implement `TurboModule`), **nhưng**
mọi module bị khởi tạo sớm. Muốn khởi tạo lười (đúng lợi ích của TurboModule) thì chuyển sang
`BaseReactPackage`:

```kotlin
class MapperPackage : BaseReactPackage() {

  override fun getModule(name: String, ctx: ReactApplicationContext): NativeModule? =
      when (name) {
        AppEnvModule.NAME -> AppEnvModule(ctx)
        // ... các module khác
        else -> null
      }

  /**
   * Bảng mô tả để RN biết module nào có, thuộc kiểu gì, mà KHÔNG cần khởi tạo chúng.
   * Đây chính là chỗ tạo ra tính "lazy": module chỉ được new khi JS gọi tới lần đầu.
   */
  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    mapOf(
        AppEnvModule.NAME to ReactModuleInfo(
            /* name = */ AppEnvModule.NAME,
            /* className = */ AppEnvModule::class.java.name,
            /* canOverrideExistingModule = */ false,
            /* needsEagerInit = */ false,
            /* isCxxModule = */ false,
            /* isTurboModule = */ true,
        ),
    )
  }
}
```

### Bước 7 — Sửa wrapper JS, và bỏ fallback im lặng

Phần còn lại của app **không được** biết chuyện này thay đổi — wrapper trong `src/shared/native/` giữ
nguyên API. Nhưng nhân dịp này sửa luôn cái bẫy ở `AppEnv.ts`:

```ts
import NativeMapperAppEnv from './specs/NativeMapperAppEnv';

const constants = NativeMapperAppEnv.getConstants();

/**
 * KHÔNG fallback cấu hình nữa.
 *
 * Bản cũ rơi về FALLBACK trỏ dev khi thiếu native module. Hệ quả: một bản prod thiếu module sẽ chạy
 * bình thường nhưng bắn request sang backend dev — sai âm thầm, và chỉ phát hiện được khi đã phát hành.
 * Chết ngay lúc khởi động trong tay QA rẻ hơn nhiều.
 */
export const AppEnv = constants;
```

Nguyên tắc chung: **fallback được phép cho thứ chỉ ảnh hưởng trải nghiệm** (widget chưa cài, splash
không ẩn được), **không được phép cho thứ quyết định đúng/sai** (URL backend, flavor, quyền).

### Bước 8 — Cập nhật mock Jest, rồi chạy đủ ba cổng

`jest.setup.js` đang mock `NativeModules`. TurboModule đọc qua `TurboModuleRegistry`, nên phải mock
thêm đường đó:

```js
// jest.setup.js — thêm cạnh mock NativeModules hiện có
jest.mock('react-native/Libraries/TurboModuleRegistry', () => {
  const modules = {
    MapperAppEnv: {
      getConstants: () => ({flavor: 'dev', apiBaseUrl: 'https://dev.hrapi.ttmedic.vn', /* ... */}),
    },
  };
  return {
    get: name => modules[name] ?? null,
    // getEnforcing phải NÉM khi thiếu, giống hành vi thật — nếu trả null thì test sẽ xanh
    // trong khi app thật crash.
    getEnforcing: name => {
      if (!modules[name]) {throw new Error(`TurboModule '${name}' chưa được mock trong jest.setup.js`);}
      return modules[name];
    },
  };
});
```

Rồi:

```powershell
yarn tsc ; yarn lint ; yarn test      # ba cổng bắt buộc
yarn android:dev                       # xác nhận trên máy thật
adb logcat -v color ReactNativeJS:V *:S
```

---

## 3. Quy ước gọi native từ JS

| Quy ước | Vì sao |
|---|---|
| **Một call mang payload gộp**, không N call nhỏ | Mỗi call vẫn vượt biên JNI/ObjC và chuyển đổi tham số. Ngưỡng thực dụng: > ~10 call cho **cùng một việc** thì gộp lại. Xem `WidgetBridge.writeSnapshot` — một JSON cho cả snapshot |
| **Không gọi native trong thân render** | Method sync chạy trên JS thread ngay lúc render; method async tạo promise mới mỗi lần render. Gọi trong `useEffect`, saga, hoặc event handler |
| **Chỉ `src/shared/native/` được import `NativeModules`/`TurboModuleRegistry`** | Phần còn lại dùng wrapper có kiểu. Không có wrapper thì mỗi chỗ gọi tự đoán kiểu, và mock test phải sửa ở N chỗ |
| **Lỗi native → `ApiError`** | UI chỉ cần một nhánh xử lý lỗi. Dùng `kind` + `i18nKey` như `shared/services/http/errors.ts` đã làm |
| **Không giữ callback dài hạn không có chỗ huỷ** | Native giữ callback = giữ luôn cả closure JS. Đăng ký ở đâu thì huỷ ở đó (`useEffect` trả cleanup) |
| **Không `await` trong vòng lặp cho N phần tử** | N lần vượt biên tuần tự. Gộp thành một call nhận mảng, hoặc `Promise.all` nếu native thật sự chạy song song |
| **Không dùng native làm nơi lưu state của UI** | State ở Redux/Query. Native chỉ là cửa ra thiết bị |

Thêm một luật nên **được test canh** (đề xuất, chưa có trong repo). Bổ sung vào
`__tests__/architecture.test.ts`:

```ts
it('chỉ shared/native được import NativeModules / TurboModuleRegistry', () => {
  const viol = files
    .filter(f => !f.rel.startsWith('shared/native/'))
    .filter(f => /NativeModules|TurboModuleRegistry/.test(fs.readFileSync(path.join(SRC, f.rel), 'utf8')))
    .map(f => f.rel);
  expect(viol).toEqual([]);
});
```

Lý do đặt ở tầng test chứ không phải review: một dòng `import {NativeModules}` lọt vào một screen sẽ
không làm gì đỏ, và sáu tháng sau thì mock Jest phải mock cho nửa số màn hình.

---

## 4. Quy ước viết native (Kotlin / Swift)

| Quy ước | Vì sao |
|---|---|
| **Method trả giá trị (sync) phải rẻ: < 1ms, không I/O, không mạng, không disk** | Nó chạy **trên JS thread** (`JavaTurboModule.cpp:525`). Một `File.read` trong method sync = đóng băng UI |
| **Việc nặng → method trả `Promise`** | Promise/void được đưa sang queue riêng của module (`JavaTurboModule.cpp:808,916`), không chặn JS |
| **Luôn `resolve` hoặc `reject`, đúng một lần, trên mọi nhánh** | Bỏ sót một nhánh = promise treo mãi mãi ở JS, biểu hiện thành "bấm nút không có gì xảy ra" |
| **Mã lỗi có tiền tố module** | `promise.reject("E_WIDGET_WRITE", ...)` như `MapperWidgetModule.kt` đang làm — tra log ra ngay module nào |
| **Không giữ `ReactApplicationContext` trong biến static** | Leak cả Activity. Dùng `reactApplicationContext.applicationContext` khi cần context sống lâu (module widget đã làm đúng) |
| **Không chạm runtime JS từ thread khác** | Muốn đẩy dữ liệu sang JS thì qua `Promise`/event, không tự gọi vào runtime |
| **Coroutine scope phải huỷ được** | `CoroutineScope(Dispatchers.Default)` cấp module (như `MapperWidgetModule`) thì phải cancel trong `invalidate()`, nếu không job sống qua cả reload |
| **`@ReactModule(name = ...)` và constant `NAME` phải trùng tên trong spec** | Lệch tên = module tồn tại nhưng JS không thấy, và không có lỗi build nào |

---

## 5. Worklet: viết gì được, viết gì không

Worklet chạy ở **runtime JS thứ hai** (`docs/09` mục 10). Hệ quả trực tiếp lên cách viết code:

| Được | Không được |
|---|---|
| Đọc/ghi `useSharedValue` | Đọc state của React, gọi `dispatch` trực tiếp |
| Gọi worklet khác | Gọi hàm thường (phải là worklet, hoặc `runOnJS`) |
| Tính toán thuần, `Math`, thao tác object cục bộ | `NativeModules.X.foo()` — binding native cài trên runtime JS chính, **không có** ở runtime UI |
| `runOnJS(fn)(args)` để quay về JS thread | `await`/promise trong worklet |

Nên quy ước như sau:

```ts
const onEnd = () => {
  'worklet';
  // Chạm native/redux thì PHẢI qua runOnJS: worklet không thấy binding native,
  // và store chỉ được chạm từ JS thread.
  runOnJS(dispatch)(paymentActions.gestureConfirmed());
};
```

Và nhớ luật ở `docs/08` mục 6: giá trị chuyển động dùng `useSharedValue`, không `useState` — lý do cơ
chế nằm ở `docs/09` mục 9.

---

## 6. Nitro: khi nào mới cần

Repo **đang có** `react-native-nitro-modules` (peer dep của `react-native-mmkv@4`) nhưng chưa tự viết
module Nitro nào. Chỉ mở con đường này khi câu ② hoặc ③ ở mục 1 trả lời "có". Cụ thể là các loại API:

- xử lý ảnh/audio/frame camera (cần `ArrayBuffer` không copy);
- API bị gọi trong vòng lặp animation hoặc mỗi lần scroll;
- API dạng "mở một đối tượng, giữ state, gọi nhiều lần" — ví dụ một kết nối BLE, một session mã hoá.

Chi phí phải biết trước: thêm một dependency bên thứ ba vào **đường build** (nitrogen sinh code C++),
và mỗi lần nâng RN phải kiểm cả bảng tương thích của Nitro — đúng thủ tục ở `TurioldBase.md` mục 1.

---

## 7. Checklist thêm/sửa một native module

```
[ ] Chọn con đường theo mục 1 (mặc định: TurboModule)
[ ] Spec TS trong src/shared/native/specs/Native<Ten>.ts, tên module khớp getEnforcing()
[ ] codegenConfig trong package.json còn đúng (jsSrcsDir bao được file mới)
[ ] Chạy codegen tay một lần, ĐỌC signature sinh ra rồi mới viết Kotlin/ObjC
[ ] Kotlin: extends Native<Ten>Spec, @ReactModule(name) trùng NAME
[ ] iOS: hiện thực cùng spec — KHÔNG để một bên legacy, một bên turbo
[ ] Đăng ký trong MapperPackage.kt (module tự viết không được autolink)
[ ] Wrapper có kiểu trong src/shared/native/<Ten>.ts + export ở index.ts
[ ] Quyết định rõ: thiếu module thì crash hay fallback? (cấu hình → crash)
[ ] Mock trong jest.setup.js cho CẢ NativeModules và TurboModuleRegistry nếu dùng
[ ] yarn tsc && yarn lint && yarn test
[ ] Chạy thật trên Android VÀ iOS, xác nhận module không null
[ ] Cập nhật docs/08 mục 1 (bản đồ thư mục) nếu thêm file mới ở shared/native
```

---

## 8. Checklist review PR có code native

| Kiểm | Dấu hiệu xấu |
|---|---|
| Có method sync nào làm I/O? | `File`, `SharedPreferences`, network trong method trả giá trị |
| Promise có nhánh nào không resolve/reject? | `try` không có `catch`, hoặc `if` trả về sớm |
| Có fallback im lặng cho cấu hình? | `?? FALLBACK`, `?.` trên đường đọc URL/flavor/quyền |
| Có gọi native trong render? | `NativeModules` xuất hiện trong thân component |
| Tên module có ba chỗ khớp nhau? | spec `getEnforcing('X')` · `@ReactModule(name = "X")` · `const NAME = "X"` |
| Mock Jest đã cập nhật? | Test xanh nhưng chỉ vì mock trả `undefined` |
| Chuyển sang TurboModule mà chỉ làm một nền tảng? | Android có spec, iOS còn `RCT_EXPORT_METHOD` |
| Có giữ context/callback dài hạn? | `companion object` giữ `ReactApplicationContext` hoặc `Callback` |

---

## 9. Đo và debug

| Việc | Lệnh / cách |
|---|---|
| Module có tồn tại không | `console.warn(!!NativeModules.X)` hoặc bọc `getEnforcing` trong try/catch, rồi `adb logcat -v color ReactNativeJS:V *:S` |
| Xem codegen sinh ra gì | `node node_modules/react-native/scripts/generate-codegen-artifacts.js -p . -t android -o <dir>` |
| JS thread đang bận vì gì | Hermes sampling profiler (DevTools → Profiler) |
| Mount/commit/UI thread | Perfetto (Android), Instruments (iOS) |
| Sau khi đổi spec mà Kotlin không thấy | Xoá `android/app/build/generated/source/codegen` rồi build lại; nếu vẫn lệch thì `make clean-android` (macOS) hoặc `.\gradlew.bat clean` |
| Đổi babel/alias mà JS không đổi | `yarn start --reset-cache` |
| App chết ngay khởi động sau khi đổi bundle | Nhiều khả năng lệch version Hermes bytecode — xem `docs/09` mục 2.2 |

---

## Liên quan

- `docs/09-KIEN-TRUC-JS-NATIVE.md` — cơ chế; **mục 12** (interop layer trên Android) và **Phụ lục A**
  (bridge vs JSI từng bước) là nền của mọi quy ước ở đây
- `docs/08-BASE-HUONG-DAN.md` mục 1 (luật import) và mục 6 (quy ước viết code chung)
- `TurioldBase.md` mục 1 — nguyên tắc đọc docs/source đúng version đã cài
