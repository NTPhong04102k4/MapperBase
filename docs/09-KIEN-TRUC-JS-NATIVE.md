# 09 – Kiến trúc tầng framework: Hermes · JSI · TurboModule · Nitro · Fabric · Worklets · Metro

> Mục đích: giải thích **cơ chế**, không phải liệt kê thuật ngữ. Mỗi mục trả lời một câu hỏi cụ thể,
> và chỗ nào nói về hành vi của React Native thì có **dẫn nguồn tới file trong `node_modules`** của
> đúng version repo đang dùng (`react-native@0.79.0`) để bạn tự kiểm chứng được — đúng nguyên tắc
> vàng ở `TurioldBase.md`.
>
> Mục 12 là **một phát hiện có thật trong repo này**, không phải lý thuyết. Đọc mục đó trước nếu bạn
> chỉ có 5 phút.

## Mục lục

| # | Nội dung |
|---|---|
| 0 | Sáu hiểu nhầm cần sửa trước |
| 1 | Engine JS, và R8/ProGuard **không phải** engine |
| 2 | Hermes: bytecode, GC, TTI, vì sao không JIT |
| 3 | JIT bị chặn trên mobile như thế nào |
| 4 | JSI: JS ↔ C++ ánh xạ ra sao (cơ chế thật) |
| 5 | Ba cách viết native module + trace một lệnh gọi thật |
| 6 | TurboModule vs Nitro: vì sao là đối thủ |
| 7 | Fabric: render → commit → mount |
| 8 | Các luồng trong app và ai chạy ở đâu |
| 9 | Một biến đổi → pixel: hai con đường |
| 10 | Worklets: mobile khác web thế nào |
| 11 | Metro & autolinking: làm gì, không làm gì |
| 12 | ⚠️ Codegen, Interop layer, và lỗ hổng trong repo này |
| A | **Phụ lục A — Bridge vs JSI: hai kiến trúc thực thi, từng bước** |
| 13 | Bảng thuật ngữ |

> Muốn viết native module hoặc code gọi xuống native: đọc `docs/10-VIET-NATIVE-MODULE.md`.
> File này giải thích **cơ chế**, file 10 là **hướng dẫn viết code + checklist**.

---

## 0. Sáu hiểu nhầm cần sửa trước

| Bạn nghĩ | Thực tế |
|---|---|
| "R8/ProGuard là engine JS như V8" | R8/D8/ProGuard là công cụ của **Java/Kotlin** trên Android: D8 dịch bytecode Java → DEX, R8 rút gọn + obfuscate (thay ProGuard). Chúng **không bao giờ chạm tới JS**. Engine JS là V8, JavaScriptCore (JSC), Hermes, SpiderMonkey, QuickJS. |
| "Fabric là hot reload cho UI" | Fabric là **renderer** (biến React element thành view native). Hot reload / Fast Refresh là việc của **Metro + react-refresh**, không liên quan renderer. Fabric vẫn hoạt động y hệt trong bản release không có Metro. |
| "Worklet ra lệnh xuống UI thread mà không qua engine" | Worklet **vẫn chạy trong một engine JS** — cụ thể là **một runtime Hermes thứ hai** do `react-native-worklets` tạo, đặt trên UI thread. Cái nó bỏ qua là **JS thread**, không phải engine. |
| "JIT không dùng được trên mobile vì OS" | Đúng một nửa. Trên **iOS** bị chặn bởi chính sách nền tảng (không được cấp bộ nhớ vừa ghi vừa thực thi). Trên **Android JIT chạy được bình thường** (V8 vẫn dùng được với `react-native-v8`) — RN không chọn nó vì đánh đổi RAM và thời gian khởi động, không phải vì bị cấm. |
| "Metro giúp build nhanh hơn (build cả thư viện ngoài)" | Metro **chỉ lo phần JS/asset**. Nó không compile Kotlin/Swift, không cài pod, không tạo APK. Phần native do Gradle/CocoaPods build. Repo này cũng **không có** script `yarn build`. |
| "GC là của engine chứ không phải OS" | Đúng — nhưng chưa đủ. Engine quản heap **bên trong** phần bộ nhớ ảo mà OS cấp; OS không dọn rác hộ, nhưng OS **giết cả app** khi RSS quá cao (Android LMK, iOS jetsam). Và view/ảnh native **không nằm trên JS heap** — GC của Hermes không cứu được leak ảnh. |

---

## 1. Engine JS, và những thứ hay bị nhầm là engine

| Tên | Là gì | Dùng ở đâu |
|---|---|---|
| **V8** | Engine JS có JIT (TurboFan/Maglev) | Chrome, Node, Electron, Android WebView |
| **JavaScriptCore (JSC)** | Engine JS của Apple | Safari; RN mặc định **trước** 0.70; iOS app nhúng JSC chạy **không JIT** |
| **Hermes** | Engine JS Meta viết riêng cho RN, **AOT ra bytecode, không JIT** | RN mặc định từ 0.70; repo này: `hermesEnabled=true` |
| **SpiderMonkey / QuickJS** | Engine của Firefox / engine nhúng siêu nhỏ | Không dùng trong RN |
| **D8** | Dịch bytecode Java/Kotlin → DEX | Android build, tầng native |
| **R8** | Rút gọn + tối ưu + obfuscate DEX (thay ProGuard) | `minifyEnabled` trong `android/app/build.gradle` |
| **Metro minifier (Terser)** | Rút gọn **JS** | Bước bundle của Metro |

Nhớ một câu: **R8 làm gọn code Kotlin, Terser làm gọn code JS, Hermes dịch code JS thành bytecode.** Ba việc khác nhau ở ba tầng khác nhau, tình cờ đều mang nghĩa "tối ưu".

---

## 2. Hermes: bytecode, GC, TTI

### 2.1. Pipeline lúc build (bản release)

```
src/**/*.ts(x)
   │  babel (metro-transformer): TS → JS, JSX → createElement,
   │                             module-resolver: '@/...' → './src/...',
   │                             react-native-worklets/plugin: cắt hàm worklet
   ▼
nhiều file JS đã transform  ──metro serializer──▶  một file bundle JS + source map
   │
   │  hermesc -O -emit-binary       ← Gradle task bundleReleaseJsAndAssets (Android)
   │                                  hoặc build phase "Bundle React Native code" (iOS)
   ▼
index.android.bundle  = **Hermes bytecode (.hbc)**, không còn là text JS
   │
   ▼
nhúng vào APK/AAB/IPA  →  app khởi động: mmap file bytecode rồi chạy ngay
```

**Lúc dev thì khác hẳn**: Metro serve **JS dạng text** qua HTTP, Hermes biên dịch trong bộ nhớ, biên
dịch lười theo hàm. Đó là lý do **không được kết luận về hiệu năng từ bản debug** — bản release chạy
bytecode đã tối ưu sẵn, còn bản debug tốn thêm cả bước biên dịch lúc chạy.

### 2.2. Hermes bytecode (.hbc) là gì

Là một file **binary có cấu trúc** để nạp không cần parse:

- header (magic + **version của format**), string table, function table, bảng hằng số, rồi phần lệnh;
- lệnh là dạng **register-based** (không phải stack-based như JVM), gần với một máy ảo có thanh ghi;
- file được **mmap** → OS nạp trang theo nhu cầu, không phải đọc hết vào RAM;
- **debug info tách riêng** → bản release không mang theo, nên stack trace là địa chỉ bytecode →
  phải có **source map** mới đọc được tên hàm/dòng.

Hệ quả thực tế bạn sẽ gặp: **version của .hbc bị khoá theo version Hermes đi kèm RN**. Nếu bundle
được biên dịch bằng hermesc của RN khác với engine trong app → app chết ngay lúc khởi động với lỗi
kiểu "Bytecode version mismatch". Đây là một trong những lý do không được trộn bundle giữa hai bản build.

### 2.3. Vì sao không JIT — và đánh đổi

| | JIT (V8) | AOT bytecode (Hermes) |
|---|---|---|
| Khởi động | Phải parse + biên dịch JS lúc chạy | Nạp bytecode, chạy ngay → **TTI thấp** |
| Code chạy lặp nhiều | Nóng lên → biên dịch ra machine code → **rất nhanh** | Vẫn thông dịch → **chậm hơn rõ rệt** |
| RAM | Cao (heap + code cache + IR) | Thấp |
| Kích thước app | Không phát sinh | Bytecode có thể lớn hơn JS text nhưng bù bằng không cần parse |

**TTI (Time To Interactive)** = từ lúc chạm icon tới lúc màn đầu tiên nhận được tương tác. Đây là chỉ
số Hermes tối ưu, và là chỉ số người dùng cảm nhận. Đổi lại, **JS tính toán nặng chạy chậm hơn V8** —
nên nguyên tắc trong repo này là: việc nặng đẩy xuống native hoặc worklet, đừng cố "viết JS thông minh hơn".

> **Static Hermes** là bản thử nghiệm đang phát triển: biên dịch JS **có kiểu** thẳng ra machine code
> AOT. Chưa dùng cho production. Biết để đọc changelog, không phải để bật hôm nay.

### 2.4. GC: của engine, trong hạn mức của OS

Hermes dùng **Hades** — GC generational, phần già chạy **đồng thời** (concurrent) với JS trên 64-bit,
để tránh dừng lâu gây rơi frame.

Ranh giới trách nhiệm:

```
OS: cấp/thu trang bộ nhớ ảo (mmap), đặt trần RSS, giết process khi vượt (LMK / jetsam)
        │
Engine: quản heap JS trong đó — cấp phát object, đánh dấu, dọn, nén
        │
Không thuộc GC của JS:  view native, bitmap ảnh, buffer của SQLite/MMKV,
                        object Kotlin/Swift do native module giữ
```

Vì vậy: một app RN có thể bị OS giết vì tràn RAM **trong khi JS heap vẫn còn rỗng** — thủ phạm gần
như luôn là ảnh hoặc native module giữ tham chiếu. Đọc thêm mục 5.4 (long-lived object) để hiểu chỗ
JSI dễ giữ tham chiếu lâu hơn dự định.

---

## 3. JIT bị chặn trên mobile như thế nào

JIT cần một vùng bộ nhớ **vừa ghi được vừa thực thi được** (viết machine code rồi nhảy vào chạy).

- **iOS**: sandbox chỉ cho phép thực thi code đã được ký. Việc cấp trang `PROT_EXEC` động cần
  entitlement `dynamic-codesigning`, và Apple **chỉ cấp cho process WebContent của WebKit**. App bên
  thứ ba nhúng JSC → chạy chế độ thông dịch. Đây là **chính sách nền tảng**, không phải giới hạn kỹ thuật.
- **Android**: không có rào đó. V8 có JIT chạy bình thường trong app (`react-native-v8` là bằng chứng).
- Vậy vì sao RN vẫn chọn Hermes cho cả hai? Vì (a) muốn **một engine giống nhau trên hai nền tảng** để
  hành vi và bug giống nhau, (b) trên iOS JIT vốn không có nên JSC không hơn gì, (c) trên Android tầm
  trung, RAM và TTI quan trọng hơn tốc độ vòng lặp số học.

Câu trả lời gọn cho câu hỏi của bạn: **không phải "OS không cho JIT nên phải build trước"**, mà là
"iOS cấm JIT + mobile quý RAM/TTI ⇒ AOT là đánh đổi đúng".

---

## 4. JSI: JS ↔ C++ ánh xạ ra sao

JSI **không phải** một file khai báo. Nó là một **API C++** (`jsi::Runtime`, `jsi::Value`,
`jsi::Object`, `jsi::Function`, `jsi::HostObject`, `jsi::HostFunction`) mà mọi engine đều hiện thực.
Ý tưởng: cho phép **object C++ đóng vai một object JS**.

### 4.1. Hai viên gạch

| Khái niệm | Nghĩa | Dùng để |
|---|---|---|
| `HostObject` | object C++ được JS thấy như object thường; JS đọc `obj.foo` → engine gọi `HostObject::get(runtime, "foo")` bằng C++ | `NativeModules`, instance MMKV, UIManager |
| `HostFunction` | một lambda C++ được JS thấy như function | mỗi method của native module |

### 4.2. Lúc khởi tạo runtime, native "cắm" biến toàn cục vào JS

```cpp
// TurboModuleBinding.cpp:131-141 (rút gọn)
defineReadOnlyGlobal(runtime, "nativeModuleProxy",
    jsi::Object::createFromHostObject(runtime,
        std::make_shared<BridgelessNativeModuleProxy>(...)));
```

Sau dòng đó, trong JS `global.nativeModuleProxy` **là** một object C++.

### 4.3. Đường đi khi JS đọc một property

```
JS:      NativeModules.MapperWidget
          │   (NativeModules.js:180 →  NativeModules = global.nativeModuleProxy)
          ▼
Engine:  thấy đây là HostObject → gọi C++ BridgelessNativeModuleProxy::get(rt, "MapperWidget")
          ▼
C++:     hỏi turboModuleProvider("MapperWidget")
          ├─ có → trả jsi::Object gói TurboModule đó
          └─ không → thử legacyModuleProvider (nếu interop bật) → không nữa thì trả **null**
```

### 4.4. Đường đi khi JS gọi một method

```
JS:   widget.writeSnapshot(json)
       ▼
Engine: property "writeSnapshot" là HostFunction → gọi C++ với const jsi::Value* args
       ▼
C++:  đọc args[0] thành std::string (không JSON, không serialize)
       │
       ├── TurboModule Java: JNI → Kotlin writeSnapshot(String, Promise)
       │        └ promise.resolve(true) → **CallInvoker** đưa việc resolve về **đúng JS thread**
       │
       └── Nitro/C++ thuần: gọi thẳng hàm C++, có thể **đồng bộ**, trả về ngay trong cùng dòng JS
```

Ba thứ **bắt buộc** phải hiểu vì chúng là nguồn của phần lớn crash khó hiểu:

1. **`jsi::Runtime` không thread-safe.** Chỉ được chạm vào JS trên đúng thread sở hữu runtime.
2. **`CallInvoker`** là cơ chế hợp lệ duy nhất để từ thread khác quay về JS thread (resolve promise,
   gọi callback). Gọi thẳng = crash ngẫu nhiên, thường ở chỗ không liên quan.
3. **Long-lived object**: callback/promise mà JS giao cho C++ phải được giữ sống có kiểm soát
   (`LongLivedObjectCollection`) — giữ sai thì hoặc dùng object đã bị GC, hoặc leak vĩnh viễn.

Trả lời trực tiếp câu "JSI là cấu trúc khai báo trừu tượng ánh xạ vào C++?" — **không**, JSI là lớp
API C++ *thật* để JS giữ tham chiếu tới C++. Thứ mang tính "khai báo trừu tượng" là **spec TypeScript
của Codegen** (mục 12) — đó là cái sinh ra code keo, còn JSI là nơi code keo cắm vào.

---

## 5. Ba cách viết native module + trace lệnh gọi thật

### 5.1. Bảng so sánh ba con đường

| | ① Legacy bridge module | ② TurboModule | ③ Nitro module |
|---|---|---|---|
| Bạn viết | Kotlin/Swift + `@ReactMethod` / `RCT_EXPORT_METHOD` | Spec TS + Kotlin/Swift/C++ hiện thực spec | Spec TS + C++/Swift/Kotlin dạng HybridObject |
| File trung gian | **Không có** — RN dò method bằng **reflection** lúc chạy | **Có** — Codegen sinh `NativeXxxSpec` (Java/ObjC/C++) lúc build | **Có** — `nitrogen` sinh binding C++ lúc build |
| Kiểm kiểu | Không (sai tên method → `undefined is not a function` lúc chạy) | Có, lúc build cả hai phía | Có, lúc build cả hai phía |
| Gọi đồng bộ | Gần như không (trừ `getConstants`) | Được | Được, là mặc định |
| Chi phí mỗi lần gọi | Cao nhất (reflection + chuyển đổi kiểu) | Thấp | Thấp nhất |
| Kiểu dữ liệu | number/string/bool/map/array/callback/Promise | như trên + typed | + variant/tuple/`ArrayBuffer`/HybridObject khác/enum |
| Nhiều instance có state | Không (module là singleton) | Không (singleton) | **Có** (mỗi HybridObject là một instance) |
| Ai bảo trì | RN core (đường cũ, còn hỗ trợ qua interop) | RN core (đường chính thức) | Thư viện cộng đồng (`react-native-nitro-modules`) |
| Trong repo này | 5 module tự viết (`MapperPackage.kt`) | chưa dùng | `react-native-mmkv@4` dùng |

### 5.2. Trace `WidgetBridge.clearSnapshot()` theo con đường ① (đang dùng)

```
src/features/auth/services/session.ts  →  performLogout()
  └ src/shared/native/WidgetBridge.ts   →  native?.clearSnapshot()
      └ NativeModules.MapperWidget       →  global.nativeModuleProxy (HostObject C++)
          └ [bridgeless] legacy provider →  JavaInteropTurboModule bọc module cũ
              └ reflection: tìm method có @ReactMethod tên "clearSnapshot"
                  └ Kotlin: MapperWidgetModule.clearSnapshot(promise)   (android/.../widget/)
                      └ WidgetSnapshotStore.clear() + MapperWidget().updateAll(ctx)
                          └ promise.resolve(true) → CallInvoker → JS thread → Promise resolve
```

**Kiến trúc cũ (bridge)** thì đoạn giữa khác hoàn toàn: JS gọi
`MessageQueue.enqueueNativeCall(moduleID, methodID, args)` → args bị **serialize JSON** → xếp batch →
native đọc batch → tra bảng module/method theo **số thứ tự** → reflection → gọi. Không có cách nào
đồng bộ, và mọi tham số bị copy hai lần. Đây chính là "parse lại JSON" bạn nhắc trong câu hỏi — nó
**đã không còn** ở New Architecture.

### 5.3. Trace theo con đường ② (nếu chuyển sang TurboModule)

```
JS:  NativeMapperWidget.clearSnapshot()          ← import từ spec đã codegen
      └ TurboModuleRegistry.getEnforcing('MapperWidget')
          └ global.__turboModuleProxy('MapperWidget')   (hoặc nativeModuleProxy ở bridgeless)
              └ TurboModuleManager.getModule (Java) → delegate.getModule → NativeMapperWidgetSpec
                  └ JavaTurboModule::invokeJavaMethod  ← **JNI có signature sẵn, không reflection**
                      └ Kotlin: clearSnapshot(promise)
```

Khác biệt đáng giá không nằm ở tốc độ (call này thưa), mà ở chỗ **sai lệch giữa JS và Kotlin bị bắt
lúc build** thay vì thành `undefined` lúc chạy.

### 5.4. Trace theo con đường ③ (MMKV trong repo)

```
JS:  createMMKV({id: 'mapper.session'})
      └ HybridObject factory (C++)  →  tạo một instance C++ HybridMMKV, trả về như object JS
JS:  sessionStorage.set('k', 'v')
      └ HostFunction → C++ → gọi thẳng thư viện MMKV (bản thân MMKV là C++)  → **đồng bộ, xong luôn**
```

Vì sao MMKV chọn Nitro thì rõ: lõi MMKV vốn là C++, việc gọi nó **không cần bén mảng sang Java/ObjC**.
Con đường ② vẫn phải qua JNI. Và MMKV cần **nhiều instance có state** (repo này có 3 kho:
`app`/`session`/`cache`) — đúng mô hình HybridObject, sai mô hình module singleton.

---

## 6. TurboModule vs Nitro: vì sao là "đối thủ"

Chúng cạnh tranh vì **giải cùng một bài toán ở cùng một chỗ**: sinh code keo để JS gọi native qua JSI.
Một thư viện chỉ chọn một trong hai, không dùng cả hai cho cùng một API.

| Trục | TurboModule | Nitro |
|---|---|---|
| Vị thế | Chuẩn chính thức của RN | Bên thứ ba, đi trước về hiệu năng và kiểu dữ liệu |
| Rủi ro version | RN nâng thì nó nâng theo | Phải khớp version với RN **và** `react-native-nitro-modules`; RN đổi nội bộ có thể vỡ |
| Sức biểu đạt | Đủ cho API dạng "gọi hàm, chờ kết quả" | Cần thiết cho API dạng "đối tượng có state, gọi liên tục" |
| Điểm mạnh thật | Ổn định, không thêm dependency | Overhead thấp nhất; theo benchmark của chính lib thì nhanh hơn TurboModule nhiều lần ở call trống |

**Bạn không chọn giữa hai cái này khi viết app.** Bạn gặp chúng vì thư viện đã chọn sẵn. Cụ thể trong
repo: `react-native-nitro-modules@0.35` nằm trong `package.json` **vì `react-native-mmkv@4` yêu cầu**,
không phải vì code của bạn dùng Nitro trực tiếp.

Khi nào bạn thật sự phải chọn: lúc **tự viết** một module. Quy tắc thực dụng:

- API thưa, bất đồng bộ, dạng "làm giúp tôi việc này" → **TurboModule** (hoặc cứ để legacy nếu đã có).
- API gọi hàng trăm–hàng nghìn lần/giây, hoặc cần object có state, hoặc truyền buffer nhị phân
  (ảnh, audio, frame camera) → **Nitro**.

---

## 7. Fabric: render → commit → mount

Fabric **không phải** hot reload. Nó là renderer: nhận cây React và biến thành view native. Ba pha:

```
① RENDER  (JS thread)
   React reconciler so sánh cây element (thứ hay gọi là "DOM ảo")
   → qua UIManagerBinding (một HostObject JSI) tạo cây **ShadowNode** BẤT BIẾN trong C++
        │
② COMMIT  (background thread)
   Yoga tính layout trên cây mới  →  diff cây cũ vs cây mới  →  danh sách mutation
   →  đổi con trỏ "cây hiện tại" sang cây mới (atomic)
        │
③ MOUNT   (main/UI thread)
   Mounting layer áp mutation lên View của Android / UIView của iOS
```

Vì ShadowNode **bất biến**, mỗi lần render là dựng "cây tiếp theo" trong khi "cây hiện tại" vẫn đang
trên màn hình — tức **double buffering**. Đó là điều kiện để React concurrent (ngắt giữa render, bỏ
render cũ, `useTransition`, Suspense) hoạt động thật, và để layout chạy được ở thread khác.

**So với web**: "DOM ảo" là của **React**, không phải của renderer. Trên web reconciler commit xuống
DOM; ở đây commit xuống ShadowTree rồi tới view native. Cùng một React, hai host khác nhau.

**So với kiến trúc cũ (Paper/UIManager)**: cây view chỉ tồn tại bên Java/ObjC, JS gửi lệnh tạo/sửa
view **bất đồng bộ qua bridge**. Hệ quả kinh điển: đo kích thước phải `measure(callback)` bất đồng bộ,
và cảnh "nội dung nhảy một frame" khi scroll nhanh. Fabric giữ cây trong C++ nên JS **đọc layout đồng
bộ được**, và event có mức ưu tiên (discrete vs continuous).

**Yoga** = engine layout flexbox viết bằng C++, chạy ở pha ②. `flex`, `padding`, `alignItems`… mà bạn
viết trong `makeStyles` được Yoga dịch thành toạ độ/kích thước tuyệt đối. Nó không biết gì về màu sắc
hay text — chỉ hình học.

**Hot reload thì thuộc về đâu**: Metro phát hiện file đổi → gửi patch qua WebSocket → runtime
`react-refresh` thay thế implementation của component và **giữ state** → React render lại → Fabric
commit/mount như bình thường. Không có bước nào của chuỗi này là "tính năng của Fabric".

---

## 8. Các luồng trong app và ai chạy ở đâu

Bạn nhớ "3 luồng: main, JS, UI" — thực tế **main và UI là một**, và có nhiều hơn 3:

| Luồng | Ai chạy ở đó |
|---|---|
| **Main / UI** | Vẽ view, nhận touch, pha ③ mount của Fabric, **và runtime worklet** |
| **JS** | Runtime Hermes chính: React render, Redux + saga, axios callback, TanStack Query |
| **Background (commit)** | Pha ② của Fabric: Yoga layout + diff + commit |
| **Queue của từng native module** | iOS: mỗi module có method queue riêng; Android: executor/coroutine của module (ví dụ `MapperWidgetModule` dùng `Dispatchers.Default`) |
| **UI runtime của worklets** | Runtime Hermes **thứ hai**, nằm trên UI thread (Reanimated, Gesture Handler) |

Ánh xạ vào repo này:

| Code | Chạy ở |
|---|---|
| `store/rootSaga.ts`, `features/*/store/*Saga.ts` | JS thread |
| `shared/services/http/client.ts` (axios) | JS thread; phần I/O do native network thread làm |
| `sessionStorage.set(...)` (MMKV/Nitro) | **Đồng bộ trên thread gọi** — thường là JS thread |
| Gesture + animation trong `features/playground` | UI runtime (worklet) |
| `WidgetBridge.*` | JS thread → queue của module → resolve về JS thread |

Ý nghĩa thực dụng: **JS thread là tài nguyên khan hiếm nhất**. Một `JSON.parse` 5MB trong saga sẽ làm
đứng cả chuỗi render → commit → mount, dù UI thread đang rảnh. Ngân sách một frame là **16.6ms** ở
60Hz (8.3ms ở 120Hz).

---

## 9. Một biến đổi → pixel: hai con đường

### Con đường A — state của React (đi qua JS thread)

```
dispatch / setState
   → JS thread: reducer + selector + React render          ← bị hoãn nếu JS thread đang bận
   → ShadowTree mới (C++)
   → background: Yoga layout + diff + commit
   → UI thread: mount, áp mutation lên view
```

Phù hợp cho: dữ liệu, danh sách, điều hướng, hiện/ẩn. Không phù hợp cho thứ đổi **mỗi frame**.

### Con đường B — shared value (không đi qua JS thread)

```
ngón tay chạm màn hình
   → UI thread: Gesture Handler → worklet onUpdate  (runtime thứ hai, ngay trong frame đó)
   → sharedValue.value = x        ← ô nhớ nằm ở C++, cả hai runtime cùng thấy
   → Reanimated ghi thẳng prop vào view trên UI thread
```

JS thread **không tham gia**. Đây là lý do quy ước ở `docs/08` mục 6: *giá trị chuyển động dùng
`useSharedValue`, không `useState`*. Dùng `useState` cho một giá trị đổi mỗi frame nghĩa là bắt cả con
đường A chạy 60 lần/giây.

Lưu ý một nửa sự thật thường bị bỏ qua: prop **không ảnh hưởng layout** (transform, opacity) thì
Reanimated ghi trực tiếp được; prop **ảnh hưởng layout** (width, flex) vẫn phải qua commit của Fabric —
nên animate `transform` thay vì `width` không phải mê tín thẩm mỹ mà là chọn con đường ngắn hơn.

---

## 10. Worklets: mobile khác web thế nào

| | Web | React Native (worklets) |
|---|---|---|
| Cơ chế tương đương | Web Worker · AudioWorklet · Houdini Paint Worklet | Runtime Hermes thứ hai do `react-native-worklets` tạo |
| Ai cấp môi trường | **Browser** cấp realm sẵn, bạn chỉ nạp script | **Thư viện** tạo runtime; Babel plugin chuẩn bị hàm |
| Chạy ở đâu | Thread riêng (worker) / thread audio / thread render | **UI thread của app** |
| Chia sẻ dữ liệu | `postMessage` — copy (structured clone); `SharedArrayBuffer` là ngoại lệ | **Shared value** nằm ở C++ — cả hai runtime đọc/ghi cùng ô nhớ |
| Chạm được UI? | Worker **không** thấy DOM | Worklet **ghi được prop của view** (qua Reanimated) — đây là khác biệt lớn nhất |
| Cách khai báo | file riêng / Blob URL | `"worklet";` đầu hàm, plugin Babel cắt hàm ra và mang closure sang |

Giống nhau ở điểm cốt lõi: **là một realm JS khác, không dùng chung heap object.** Nên biến bạn
"capture" trong worklet là **bản copy** ở lần tạo; muốn dữ liệu sống hai chiều thì phải là shared value.
Và hàm gọi từ trong worklet cũng phải là worklet, nếu không sẽ lỗi lúc chạy.

Đây cũng là câu trả lời cho "vì sao plugin phải nằm cuối `babel.config.js`": plugin cần thấy code
**sau khi** các plugin khác biến đổi xong, mới cắt đúng thân hàm và closure. Đặt sai chỗ thì hàm vẫn
chạy — nhưng chạy trên JS thread, tức là im lặng rơi về con đường A.

---

## 11. Metro & autolinking

### 11.1. Metro làm gì

| Việc | Chi tiết |
|---|---|
| Resolution | Giải `import` → đường dẫn file (theo `node_modules`, `platform.ts`/`.ios.ts`, và alias từ `babel-plugin-module-resolver`) |
| Transform | Chạy Babel **từng file**, song song nhiều worker, **cache theo nội dung file** |
| Serialize | Gộp thành một bundle + source map |
| Dev server | HTTP serve bundle + WebSocket cho HMR/Fast Refresh |
| Symbolication | Dịch stack trace của bundle về file/dòng gốc |
| Asset | Đăng ký ảnh `@2x/@3x`, sinh asset registry |

**"Nhanh hơn" nghĩa là gì**: nhanh ở vòng lặp **sửa–xem**, không phải ở lần build đầu. Cơ chế:
transform theo file + cache theo hash → sửa một file thì chỉ transform lại file đó, rồi **gửi patch
HMR** thay vì dựng lại toàn bộ bundle.

**Metro không làm**: compile Kotlin/Swift, cài pod, chạy autolinking, gọi `hermesc` (bước đó do
Gradle task / Xcode build phase), tạo APK. `metro.config.js` của repo này gần như rỗng — chỉ merge
default config, đúng nghĩa "không cần can thiệp".

**`--reset-cache` khi nào**: đổi `babel.config.js`, đổi alias, thêm loại asset mới, hoặc `node_modules`
vừa bị thay bằng tay. Đây là lý do README nhắc reset sau khi sửa Babel.

### 11.2. Autolinking chạy thế nào (và vì sao ngày xưa phải khai tay)

**Trước RN 0.60**: `react-native link` **ghi thẳng vào file dự án của bạn** — `settings.gradle`,
`build.gradle`, `MainApplication.java`, `Podfile`, `.xcodeproj`. Gỡ lib thì phải sửa ngược lại. Sai một
chỗ là lỗi link khó đọc, và mọi lần upgrade RN đều tạo conflict ở đúng những file đó.

**Từ RN 0.60**: không ghi vào code của bạn nữa, mà **sinh ra lúc build**:

```
package.json (dependencies)  +  <mỗi lib>/react-native.config.js
        │  @react-native-community/cli đọc và dựng "config"
        ▼
Android: android/app/build/generated/autolinking/  →  autolinking.json + PackageList.java
         settings.gradle include các module qua react.settings.gradle
iOS:     Podfile gọi use_native_modules!  →  thêm pod tương ứng
New Arch: cùng danh sách này được Codegen dùng để sinh spec cho từng lib
```

Trả lời trực tiếp: **không phải "liên tục cắt sâu để chèn liên kết"**. Nó chỉ quét **dependency trực
tiếp** trong `package.json` cộng với quy ước thư mục `android/`, `ios/` của từng package — một lần,
lúc build. Chính vì chỉ quét dependency trực tiếp mà một peer dep như `react-native-nitro-modules`
**phải có mặt trong `package.json` của app**, không thể nằm ẩn dưới `react-native-mmkv`.

Và đây là lý do `MainApplication.kt` của repo vẫn có một dòng khai tay:

```kotlin
PackageList(this).packages.apply {   // ← autolinking sinh ra: 30+ lib trong node_modules
  add(MapperPackage())               // ← module tự viết KHÔNG nằm trong node_modules → không được autolink
}
```

Không có gì sai ở đây: autolinking chỉ biết về npm package. Code native trong
`android/app/src/main/java/com/mapper/` là của app, phải tự đăng ký.

---

## 12. ⚠️ Codegen, Interop layer, và một lỗ hổng có thật trong repo này

### 12.1. Codegen là gì

Trả lời câu hỏi cuối của bạn: **đúng**, ý tưởng chính là "một file trung gian mô tả cấu trúc API".
Chính xác hơn:

```
Bạn viết SPEC (TypeScript)                    ← nguồn sự thật duy nhất
   src/specs/NativeMapperAppEnv.ts
        │  Codegen chạy lúc build (Gradle task / Xcode phase), theo codegenConfig trong package.json
        ▼
Sinh CODE KEO (build artifact, không commit)
   android/app/build/generated/source/codegen/java/.../NativeMapperAppEnvSpec.java
   ios/build/generated/ios/NativeMapperAppEnvSpec.h/.mm  +  ...JSI-generated.cpp
        │
        ▼
Bạn hiện thực spec đó bằng Kotlin/Swift/C++:  class AppEnvModule : NativeMapperAppEnvSpec()
```

Ba hệ quả: (a) JS và native **không thể lệch nhau** mà build vẫn xanh; (b) không cần reflection lúc
chạy; (c) chi phí là bạn phải bảo trì spec, và mỗi lần đổi spec phải build lại native.

Con đường ① (legacy) không có bước này: RN dò `@ReactMethod` bằng reflection lúc chạy. Rẻ để viết,
đắt mỗi lần gọi, và không có kiểm kiểu.

### 12.2. Interop layer là gì

Là lớp cho phép **module/view kiểu cũ chạy được trong bridgeless**. Cụ thể: khi JS đọc
`NativeModules.Xxx` mà không tìm thấy TurboModule tên đó, proxy sẽ hỏi tiếp "legacy provider" — lớp
này bọc module cũ lại và dò method bằng reflection, y như bridge từng làm, nhưng đi qua JSI.

`MapperPackage.kt` đang dựa vào chính lớp này, và comment trong file nói đúng nguyên tắc. **Nhưng có
một chi tiết version-specific mà comment không nói**, và nó quan trọng.

### 12.3. Phát hiện: trên Android, interop layer **không** bật mặc định ở RN 0.79

Chuỗi bằng chứng, tất cả trong `node_modules` của repo:

| Bước | Nguồn |
|---|---|
| `MainApplication.kt` gọi `load()` → mặc định bật turboModules + fabric + **bridgeless** | `.../defaults/DefaultNewArchitectureEntryPoint.kt:37-40` |
| `load()` áp bộ override "Stable", bộ này chỉ set `enableFabricRenderer` và `useTurboModules` | `.../featureflags/ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android.kt:17-19` |
| `useTurboModuleInterop` **không** được set → giữ default **`false`** | `.../featureflags/ReactNativeFeatureFlagsDefaults.kt:108` |
| Interop chỉ bật khi `enableBridgelessArchitecture() && useTurboModuleInterop()` | `.../ReactPackageTurboModuleManagerDelegate.java:38-40` |
| Cờ đó quyết định có truyền `legacyModuleProvider` vào JSI hay không | `.../jni/react/turbomodule/ReactCommon/TurboModuleManager.cpp:321-338` |
| Không có legacy provider → proxy trả **`null`** cho tên module không phải TurboModule | `.../nativemodule/core/ReactCommon/TurboModuleBinding.cpp:58-71` |
| `BaseJavaModule` **không** implement `TurboModule`, nên module của bạn bị coi là legacy | `.../bridge/BaseJavaModule.java:52` + `.../module/model/ReactModuleInfo.kt:48` |

Trong khi đó **iOS thì bật sẵn**: `RCTRootViewFactory.mm:139-143` gọi `RCTEnableTurboModuleInterop(YES)`
với comment "Enable TurboModule interop by default in Bridgeless mode".

**Suy ra**: trên Android với `newArchEnabled=true`, `NativeModules.MapperAppEnv` (và 4 module còn lại)
rất có thể là `null`. iOS thì chạy bình thường → **bug lệch nền tảng**, loại khó tin nhất khi gặp.

### 12.4. Vì sao bug này lại khó thấy

Vì `src/shared/native/AppEnv.ts` có FALLBACK **trỏ đúng cấu hình dev**:

- Bản **dev**: fallback trùng giá trị thật → app chạy như không có gì sai. Chỉ có splash/ForgeRock/
  biometric/widget **im lặng không làm gì** (`WidgetBridge` trả `Promise.resolve(false)`).
- Bản **prod Android**: `env.flavor` thành `'dev'`, `apiBaseUrl` thành URL dev → **bản prod bắn request
  sang backend dev**. Đúng thứ mà comment trong `AppEnv.ts` gọi là "kịch bản tệ nhất có thể".

### 12.5. Kiểm chứng trong 2 phút

```ts
// tạm thêm vào App.tsx
import {NativeModules} from 'react-native';
console.warn('[check] MapperAppEnv =', NativeModules.MapperAppEnv);
console.warn('[check] flavor =', NativeModules.MapperAppEnv?.flavor);
```

```powershell
yarn android:dev
adb logcat -v color ReactNativeJS:V *:S
```

`null`/`undefined` → xác nhận. Có object với `flavor: 'dev'` → interop đang chạy và mục này chỉ là
lý thuyết (khi đó ghi lại kết quả vào đây).

### 12.6. Ba cách sửa

| Cách | Làm gì | Đánh đổi |
|---|---|---|
| **A. Bật interop (nhanh)** | Trong `MainApplication.onCreate`, **trước** `load()`: `DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.CANARY` — bộ Canary set `useTurboModuleInterop = true` và cả `useFabricInterop = true` (`...Overrides_RNOSS_Canary_Android.kt:26-36`) | Kéo theo vài cờ thử nghiệm khác; phải đọc lại file đó mỗi lần nâng RN |
| **B. Override cờ thủ công** | Tự gọi `ReactNativeFeatureFlags.override(...)` với provider set 4 cờ (bridgeless, fabric, turboModules, turboModuleInterop) | ⚠️ Không được để bị override hai lần: `override()` **ném lỗi nếu cờ đã bị đọc** (`ReactNativeFeatureFlagsLocalAccessor.kt:501-508`) → phải thay `load()` chứ không gọi thêm |
| **C. Chuyển sang TurboModule (bền)** | Viết spec cho 5 module, để chúng extends `Native*Spec` | Tốn công một lần, đúng hướng đi của RN, và bắt được lệch JS↔native lúc build |

Bất kể chọn cách nào, nên **thêm một guard cứng**: nếu là bản release mà `NativeModules.MapperAppEnv`
không tồn tại thì **crash cố ý** thay vì rơi về fallback dev. Một bản prod chết ngay lúc khởi động
trong tay QA tốt hơn nhiều một bản prod im lặng gọi API dev.

> Ghi chú thêm: `useFabricInterop` (dành cho **view manager** kiểu cũ) cũng đang là `false` ở bộ
> Stable. Repo hiện chỉ dùng view của `react-native-screens` (đã có `codegenConfig`, tức Fabric
> native) nên chưa ảnh hưởng — nhưng nếu sau này dùng `GoogleSigninButton` hay bất kỳ view của lib
> chưa lên Fabric thì sẽ gặp đúng dạng lỗi này ở tầng view.

---

## Phụ lục A — Bridge vs JSI: hai kiến trúc thực thi, từng bước

Câu bạn hỏi: *"JSI nhanh hơn vì không phải gom rồi đẩy qua bridge, tránh bottleneck — nhưng hai kiểu
này thực thi thế nào cho rõ ràng?"*. Mục này trả lời bằng **cấu trúc dữ liệu và thứ tự thực thi thật**,
kèm dẫn nguồn. Kết luận đặt trước cho khỏi hiểu lệch:

> **JSI không làm cho lệnh gọi trở thành đồng bộ, và cũng không "nhanh hơn" ở mọi trục.** Nó bỏ
> **hàng đợi trung gian** và bước **copy toàn bộ payload**, đồng thời **mở khả năng** gọi đồng bộ khi
> method có giá trị trả về. Một method trả `Promise` trong TurboModule **vẫn** nhảy thread như xưa.

### A.1. Kiến trúc bridge: "gom rồi đẩy" cụ thể là gì

**Cấu trúc dữ liệu** — không phải một danh sách lệnh, mà **ba mảng song song + một số đếm**:

```js
// MessageQueue.js:44,60
_queue = [
  [moduleID, moduleID, ...],   // MODULE_IDS  – module là SỐ, không phải tên
  [methodID, methodID, ...],   // METHOD_IDS  – method cũng là SỐ
  [params,   params,   ...],   // PARAMS      – mảng tham số của từng call
  callID,                      // số đếm để ghép callback
];
```

Bảng "số ↔ tên" (`remoteModuleConfig`) được native gửi sang JS **một lần lúc khởi động**
(`NativeModules.js:180-200`). Vì vậy mọi lệnh gọi sau đó chỉ là cặp số — nhanh để truyền, nhưng
**không có gì kiểm được** rằng số đó ứng với method bạn nghĩ.

**Thứ tự thực thi một lệnh gọi:**

```
① JS gọi   NativeModules.MapperWidget.writeSnapshot(json, onOk)
     │      hàm này do genMethod() sinh sẵn lúc khởi động (NativeModules.js:98-160)
     ▼
② processCallbacks (MessageQueue.js:188-227)
     │  cấp một callID; nhét ID callback vào cuối params:
     │      onFail → callID << 1        onSucc → (callID << 1) | 1
     │  lưu hàm thật vào _successCallbacks / _failureCallbacks (Map)
     ▼
③ push vào ba mảng.  **CHƯA GỬI GÌ CẢ.**
     ▼
④ FLUSH — xảy ra ở một trong hai thời điểm:
     (a) ngay giữa batch, nếu  now - _lastFlush >= 5ms   (MIN_TIME_BETWEEN_FLUSHES_MS,
         MessageQueue.js:35,315-321) → gọi global.nativeFlushQueueImmediate(queue)
     (b) cuối "lượt làm việc": native gọi vào JS bằng callFunctionReturnFlushedQueue(),
         và JS **trả cả queue về** như giá trị trả về (MessageQueue.js:108-137)
     ▼
⑤ C++ JSIExecutor::callNativeModules (JSIExecutor.cpp:387-400)
     │  dynamicFromValue(runtime, queue)  ← **duyệt và COPY SÂU toàn bộ queue** sang folly::dynamic
     ▼
⑥ Instance::callNativeModules → ModuleRegistry::callNativeMethod(moduleId, methodId, params)
     │      (ModuleRegistry.cpp:214)
     │  Android: JavaModuleWrapper → **reflection** → method Kotlin
     │  iOS:     RCTModuleMethod   → NSInvocation
     ▼
⑦ Native xong → gọi callback bằng callbackID → JS tra Map → chạy callback trên JS thread
     ▼
⑧ Nếu là cuối batch (isEndOfBatch) → onBatchComplete()  (NativeToJsBridge.cpp:72-78)
        → UIManager của kiến trúc cũ MỚI áp toàn bộ thao tác view đã gom
```

**Bottleneck nằm ở đâu, chính xác** (không phải "bridge chậm" chung chung):

| Nguồn | Bản chất |
|---|---|
| Bước ⑤ | Copy sâu **toàn bộ payload**, chi phí tỉ lệ kích thước dữ liệu. Truyền list 5.000 dòng = copy 5.000 dòng, hai lần (JS→dynamic, dynamic→Java/ObjC) |
| Bước ④ | **Độ trễ theo batch**: giữa lúc push và lúc flush có một khoảng chờ. Không phải 0 |
| Một hàng đợi cho **mọi** module | Head-of-line blocking: một call nặng làm chậm mọi call sau nó |
| Không có back-pressure | JS đẩy nhanh hơn native tiêu thụ → queue và Map callback phình. RN cảnh báo khi callback chờ > 500 (`MessageQueue.js:201-217`) |
| Không có đường đồng bộ | Mọi thứ cần "hỏi rồi dùng ngay" (đo layout, đọc config) phải lách bằng cách khác — `getConstants` được nhồi sẵn lúc khởi tạo chính là một cách lách, và repo này đang dùng nó ở `AppEnvModule.kt` |
| Bước ⑧ | View chỉ được áp ở **cuối batch** → hiện tượng "trễ một frame" kinh điển |

Ghi chú cho đúng sự thật: mô tả phổ biến "bridge serialize thành **JSON**" đúng về **bản chất** (chuyển
đổi + copy) nhưng không còn đúng về **định dạng** — từ khi RN chuyển bridge sang chạy trên JSIExecutor,
queue được chuyển thành `folly::dynamic` chứ không phải chuỗi JSON. Chi phí vẫn là chi phí copy.

### A.2. Kiến trúc JSI: không có queue, không có bảng số

```
① Lúc dựng runtime, C++ cắm biến toàn cục là HostObject:
      defineReadOnlyGlobal(runtime, "nativeModuleProxy", ...)   (TurboModuleBinding.cpp:131-141)
      (và "__turboModuleProxy" ở chế độ không bridgeless)
     ▼
② JS đọc  NativeModules.MapperWidget  →  engine gọi C++ ::get(rt, "MapperWidget")
      → tạo object đại diện module **một lần**, rồi cache
     ▼
③ JS gọi  widget.writeSnapshot(json)
      → property đó là HostFunction → engine đặt tham số thành const jsi::Value* **trên stack**
      → gọi thẳng lambda C++.  Không có ID, không có queue, không có copy toàn cục.
     ▼
④ Phân nhánh theo KIỂU TRẢ VỀ  (JavaTurboModule.cpp:525)
      │
      ├─ method TRẢ GIÁ TRỊ (sync):  chạy **ngay trên JS thread**, JNI call có signature
      │     sinh sẵn, trả jsi::Value về cho JS trong **cùng biểu thức**
      │
      └─ method void / trả Promise:  nativeMethodCallInvoker_->invokeAsync(...)
            (JavaTurboModule.cpp:808, 916) → chạy trên **queue riêng của module đó**
            → xong thì dùng jsInvoker_ (CallInvoker) để resolve **trên JS thread**
```

Không có `onBatchComplete`, không có `_queue`, không có `remoteModuleConfig`. Việc gom — nếu cần — do
từng lớp tự quyết theo ngữ nghĩa của nó (Fabric gom mutation theo **commit**, không theo timer 5ms).

### A.3. Đối chiếu theo trục

| Trục | Bridge | TurboModule (JSI) | Nitro (JSI) |
|---|---|---|---|
| Định danh module | số (moduleID/methodID) + bảng tra | tên → HostObject, cache sau lần đầu | tên → object JS thường + **prototype cache theo runtime** |
| Truyền tham số | copy sâu cả queue → `folly::dynamic` → Java/ObjC | chuyển đổi **từng tham số** khi C++ đọc | như trên; `ArrayBuffer` **không copy** |
| Tra method | reflection lúc chạy | JNI/ObjC signature do codegen sinh | con trỏ hàm C++ đăng ký trên prototype |
| Gọi đồng bộ | không (trừ `nativeCallSyncHook`, dùng rất hạn chế — `MessageQueue.js:184`) | được, nếu method có giá trị trả về | mặc định |
| Gom batch | 5ms hoặc cuối lượt | không | không |
| Truy cập property | qua bảng dựng sẵn | `HostObject::get` **trap vào C++ mỗi lần** | prototype **thật** → engine inline-cache được (`HybridObjectPrototype.hpp:27-46`) |
| Kiểm kiểu JS↔native | không | lúc build | lúc build |
| Nhiều instance có state | không | không | có (`HybridObject : jsi::NativeState`) |

Dòng "truy cập property" là lý do kỹ thuật thật đằng sau con số benchmark của Nitro: nó **không** bắt
engine gọi vào C++ để tra tên method (như HostObject làm), mà đặt method lên một prototype JS thật rồi
gắn instance C++ vào object bằng `NativeState` — engine tối ưu được như gọi method JS thường.

### A.4. "Gom rồi đẩy" vẫn tồn tại — và đó là điều tốt

Đừng rút ra kết luận "gom là xấu". Cái xấu là **gom theo đồng hồ, cho mọi thứ, ở một hàng đợi chung**.
Gom theo ngữ nghĩa thì vẫn còn và vẫn cần:

| Chỗ vẫn gom | Gom theo cái gì |
|---|---|
| Fabric commit | Theo **cây**: mọi mutation của một commit được áp một lần trên UI thread |
| Event liên tục (scroll) | Coalesce theo **frame** — không ai cần 300 event scroll/giây |
| Code của bạn | Theo **nghiệp vụ**: một call mang payload gộp |

Ví dụ trong repo này: `WidgetBridge.writeSnapshot(payload)` gửi **một** chuỗi JSON cho cả snapshot,
thay vì set từng field một. Kể cả trên JSI, mỗi lệnh gọi vẫn tốn một lần vượt biên JNI/ObjC — nên
"1 call × payload lớn" gần như luôn thắng "200 call × payload nhỏ". Xem `docs/10` mục 3 để biết ngưỡng.

### A.5. Cách tự quan sát

| Muốn xem | Cách |
|---|---|
| Hàng đợi bridge (chỉ kiến trúc cũ) | `require('react-native/Libraries/BatchedBridge/MessageQueue').spy(true)` — ở bridgeless **không có gì để spy**, đó là dấu hiệu bạn đang chạy JSI |
| Thời gian JS thread | Hermes sampling profiler (DevTools → Profiler) |
| Thời gian mount/commit/UI | Perfetto (Android) / Instruments (iOS); Systrace counter `pending_js_to_native_queue` chỉ có ở kiến trúc cũ (`MessageQueue.js:323`) |
| Một module có thật là TurboModule? | `console.log(global.__turboModuleProxy != null)` và kiểm `NativeModules.X` có `!= null` — xem mục 12.5 |

---

## 13. Bảng thuật ngữ

| Từ | Nghĩa gọn |
|---|---|
| **AOT / JIT** | Biên dịch trước lúc chạy / biên dịch trong lúc chạy |
| **Autolinking** | Bước build tự tìm native dep trong `node_modules` và nối vào Gradle/Podfile |
| **Bridge** | Kênh JS↔native cũ: bất đồng bộ, JSON, xếp batch |
| **Bridgeless** | Chế độ không còn bridge; mặc định của New Arch từ RN 0.74 |
| **Codegen** | Sinh code keo C++/Java/ObjC từ spec TypeScript, lúc build |
| **CallInvoker** | Cơ chế hợp lệ để từ thread khác quay về JS thread |
| **D8 / R8 / ProGuard** | Công cụ DEX/rút gọn của **Java-Kotlin**, không liên quan JS |
| **Fabric** | Renderer mới: ShadowTree C++, layout ở background, mount ở UI thread |
| **Fast Refresh** | Nạp lại code giữ state; của Metro + react-refresh, không phải Fabric |
| **hbc** | Hermes bytecode; version khoá theo RN, mmap được |
| **Hades** | GC của Hermes: generational, phần già chạy đồng thời |
| **Hermes** | Engine JS của RN: AOT bytecode, không JIT |
| **HostObject / HostFunction** | Object/function C++ được JS thấy như object/function thường |
| **Interop layer** | Lớp cho module/view kiểu cũ chạy được trong bridgeless (xem mục 12) |
| **JNI** | Cầu Java ↔ C++ trên Android |
| **JSI** | API C++ để JS giữ tham chiếu tới C++; nền của toàn bộ New Arch |
| **Metro** | Bundler + dev server cho JS/asset; không dính native |
| **Mount phase** | Pha áp mutation lên view thật, trên UI thread |
| **Nitro / nitrogen** | Cách viết native module của cộng đồng + tool codegen của nó |
| **Paper** | Tên renderer cũ (UIManager) |
| **ShadowNode / ShadowTree** | Cây view bản C++ bất biến trong Fabric |
| **Spec** | File TS mô tả API native, đầu vào của Codegen |
| **Static Hermes** | Bản thử nghiệm: JS có kiểu → machine code AOT |
| **TTI** | Time To Interactive — chỉ số Hermes tối ưu |
| **TurboModule** | Native module chính thức của New Arch, có Codegen |
| **Worklet** | Hàm chạy trong runtime JS thứ hai (UI thread) |
| **Yoga** | Engine layout flexbox C++, chạy ở pha commit |

---

## Liên quan

- `docs/08-BASE-HUONG-DAN.md` — bản đồ thư mục, luật import, quy ước viết code
- `TurioldBase.md` — nguyên tắc đọc docs đúng version; bảng tương thích Reanimated/worklets/screens
- `README.md` — lệnh clean/reset khi build native hỏng
- `CLAUDE.md` — bản rút gọn cho agent, có nhắc lại phát hiện ở mục 12
