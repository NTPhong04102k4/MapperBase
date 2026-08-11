# project-profile.md

Bản đồ kiến trúc của **Mapper**, sinh bởi skill `learn-project` (skillrunner) — đọc file này để định
hướng trước khi implement, thay vì quét lại toàn bộ `src/`.

> **Cách dùng:** tin file này để **định hướng**, nhưng trước khi dựa vào một path/symbol cụ thể thì
> xác nhận nó còn tồn tại (một lệnh `Read`/`Grep` là đủ). Chỉ dựng lại file này khi người dùng yêu
> cầu rõ ràng (`learn-project` lần nữa) — không tự làm mới.
>
> Tài liệu bổ sung: `CLAUDE.md` (lệnh + bẫy), `docs/00-TONG-QUAN.md` (index docs 01–10),
> `docs/08-BASE-HUONG-DAN.md` (quy ước viết code), `docs/09` (tầng JS↔native),
> `docs/10` (hướng dẫn viết native module).

---

## 1. Nhận dạng

| Hạng mục | Giá trị |
|---|---|
| Loại | App React Native, 3 flavor `dev · staging · prod` (mỗi flavor là một app record riêng trên store) |
| RN / React | `react-native` **0.79.0**, `react` **19.0.0** — New Architecture (bridgeless + Fabric + Hermes) |
| Ngôn ngữ | TypeScript **5.0.4**, `strict: true` (xem §7 về `tsconfig.base.json` chưa được extends) |
| Native | Android Kotlin (`android/app/src/main/java/com/mapper/`), iOS Swift + ObjC bridge (`ios/Mapper/Native/`) |
| State | Redux Toolkit 2 + redux-saga 1.5 (**thunk đã tắt**) · TanStack Query 5 cho server state |
| Điều hướng | React Navigation 7 (native-stack + bottom-tabs + drawer) |
| UI/animation | Reanimated **4.1** + `react-native-worklets` 0.5 · gesture-handler 2 · safe-area-context 5 |
| Lưu trữ | `react-native-mmkv` **4.x (Nitro)** · `react-native-keychain` 10 cho secret |
| Phân quyền | CASL `@casl/ability` 7 |
| i18n | i18next + react-i18next, `vi` (mặc định) + `en` |
| Ngôn ngữ code/comment | **Tiếng Việt** — giữ nguyên phong cách khi thêm code |
| Máy dev hiện tại | Windows → dùng `yarn ...` / VS Code tasks, `make` là macOS-only |

Đã có trong `package.json` nhưng **chưa dùng ở `src/`**: `zustand`, `@react-native-firebase/*`,
`@notifee/react-native`, `react-hook-form`. Khối notification theo `docs/03` chưa dựng.

---

## 2. Tầng và cách chúng nối vào nhau

```
index.js → App.tsx → src/app/providers.tsx → src/navigation/RootNavigator
                            │
     ┌──────────────────────┼───────────────────────┐
     ▼                      ▼                       ▼
  src/store/           src/features/<X>/        src/shared/
  (lắp ghép)           (nghiệp vụ)              (hạ tầng, không biết feature)
```

Chia theo **feature**, không theo loại file. Luật import được **test canh** trong
`__tests__/architecture.test.ts` — vi phạm là test đỏ:

| Từ | Được import | Không được |
|---|---|---|
| `shared/` | `shared/` | `features/` `store/` `app/` `navigation/` |
| `features/X` | `shared/` `store/` · `features/Y` qua **cửa vào công khai** | `app/` · ruột của `features/Y` |
| `store/` `navigation/` `app/` | tất cả (đây là chỗ lắp ghép) | — |

Cùng module → đường dẫn relative. Khác module → alias `@/` (khai khớp ở **ba** nơi:
`babel.config.js`, `tsconfig.json`, `jest.config.js`).

### Vòng import lúc chạy — đã xử lý, đừng "dọn cho gọn"

Biểu hiện nếu phá: `Cannot access '...' before initialization` ở một file ngẫu nhiên.

- `features/auth` có **hai** cửa vào: `@/features/auth` (UI + selector) và `@/features/auth/services`
  (API domain thuần). Saga/service của feature khác **phải** dùng cửa thứ hai — barrel UI kéo theo
  `AuthContext` → `store/hooks` → `store/index` → `rootSaga` → quay lại barrel.
  Bằng chứng: `features/payment/store/paymentSaga.ts:17` import từ `@/features/auth/services`.
- `store/rootReducer.ts` và `store/rootSaga.ts` import **thẳng** file slice/saga, không qua barrel.
- `shared/services/http/client.ts` không import store; store đăng ký callback hết phiên qua
  `setSessionExpiredHandler()` trong `store/index.ts`.
- `shared/components/modals/ids.ts` tách khỏi `app/modals/registry.tsx` vì registry phải import
  feature; id chỉ là hằng chuỗi nên sống ở `shared/` được.

### Provider order (`src/app/providers.tsx`)

Thứ tự có ý: `GestureHandlerRootView` phải là **gốc tuyệt đối**; `ModalHost`/`ToastHost` phải **cuối**
(để nằm trên mọi thứ). Mỗi tầng có comment giải thích — đừng sắp xếp lại.

---

## 3. Các luồng chính

### 3.1 Khởi động + auth (ForgeRock, 3 mức xác thực)

`AuthProvider` (`features/auth/contexts/AuthContext.tsx:60`) dispatch `bootstrapRequested` **một
lần** → `bootstrapSaga` (`features/auth/store/authSaga.ts:71`) theo thứ tự có chủ ý:

1. `bootstrapAuth()` — cấu hình SDK (thiếu bước này mọi lệnh sau đều ném)
2. `restoreCachedPermissions()` — UI có nút ngay, không "trắng quyền"
3. `ForgeRock.isAuthenticated()` — còn phiên không
4. bật sinh trắc học → `status = 'locked'`, **không** tự vào Home

`status: 'booting' | 'authenticated' | 'locked' | ...` quyết định navigator nào được render
(`RootNavigator.tsx:73`). Splash chỉ ẩn khi **đã biết đi đâu** (`status !== 'booting'` +
`requestAnimationFrame`) — native có watchdog 8s làm lưới an toàn.

Ba mức sinh trắc học, đừng lẫn:

| Mức | Việc | Nơi |
|---|---|---|
| 2 | Mở khoá app — secret `${userId}:${deviceId}` giữ trong Keychain, giá trị không quan trọng, quan trọng là OS gác | `enableBiometricSaga` (`authSaga.ts:180`) |
| 3 | **Ký giao dịch** — khoá trong TEE/Secure Enclave, enroll public key lên backend | `enrollTransactionKeySaga` (`authSaga.ts:196`) |
| — | Xác nhận giao dịch: challenge từ backend → ký → backend verify. **Không** tự sinh challenge ở client | `confirmWithBiometricSaga` (`paymentSaga.ts:175`) |

`AuthContext` là **API bề mặt** của feature (component gọi `signInWithSocial('google')`, không tự
`dispatch`). Redux giữ state; Context giữ hành vi.

**Logout** (`features/auth/services/session.ts:135` + `logoutSaga`): xoá snapshot widget là bước
**ĐẦU TIÊN** và phải `await` — đảo thứ tự = dữ liệu người dùng cũ còn trên màn hình chính của người
tiếp theo (`docs/05` xếp là hạng mục chặn phát hành).

### 3.2 HTTP

`shared/services/http/` — luôn dùng helper `api.get/post/...` (`client.ts:106`), **không** gọi axios
trong component. Ba điểm không được bỏ:

- Refresh 401 **single-flight** (`authTokens.ts`) — với refresh token rotate, gọi song song sẽ làm
  hỏng phiên của các request còn lại.
- Lỗi chuẩn hoá thành `ApiError` (`errors.ts:23`) với `kind`, `i18nKey`, `isRetryable`.
- Hết phiên: `setSessionExpiredHandler()` — client không biết store.

**Token không bao giờ vào MMKV**: access token trong bộ nhớ SDK, refresh token + khoá ký ở
Keychain/Keystore.

### 3.3 Phân quyền

Backend trả rule CASL **thô** qua `GET /auth/permissions`; client **không** suy quyền từ `role`.

- `assertCan(action, subject)` **trước** khi gọi API (`shared/permissions/guard.ts:77`)
- `sift() / siftOne() / maskFields()` **sau** khi API trả
- UI: `useCan('pay', 'Payment')` hoặc `<Can do="pay" on="Payment">` (`AbilityContext.tsx`)
- Ví dụ thật: tab Payment bị ẩn hẳn khi không có quyền (`navigation/BottomTabs.tsx:67`) — ẩn thay vì
  cho bấm rồi nhận 403

`Action`: `manage read create update delete approve export pay refund`.
`Subject`: `all Order Payment Invoice Employee Department Report Setting Widget`
(`shared/permissions/types.ts` — đây là **hợp đồng với backend**, đổi phải đồng bộ hai bên).

Đây là tầng UX/tầng phòng thủ thứ hai, **không phải** bảo mật.

### 3.4 Thanh toán SePay

`features/payment/store/paymentSaga.ts` — ba quyết định đã chốt, ghi rõ trong comment đầu file:

1. **Poll backend, không poll SePay** — nguồn sự thật là webhook đã ghi vào DB của bạn.
2. **Poll, không dùng silent push làm đồng hồ** — push có thể không được giao (iOS force-quit, Doze).
3. **Có timeout** 15 phút (bằng hạn QR); hết hạn thì nói "có thể vẫn được ghi nhận sau",
   **không** kết luận thất bại.

`watchPolling` (`:129`) dùng `fork` + `race` + `cancel` — không có `cancel` thì vòng lặp cũ ghi đè
trạng thái đơn mới. Idempotency key = `${deviceId}:${orderRef}` ⇒ bấm hai lần chỉ tạo một đơn.

### 3.5 Widget

**Widget không gọi API.** App ghi snapshot, widget chỉ đọc và vẽ (`features/widget/store/widgetSaga.ts`).
Ba nguồn kích hoạt ghi: app vào foreground · push sự kiện · dữ liệu nghiệp vụ đổi. **Không** ghi theo
nhịp cố định từ JS. Kiểm `isInstalled()` trước khi ghi — không có widget trên home thì ghi vô ích.

### 3.6 Điều hướng + deep link

`RootStack` (Auth | Main) → `AppDrawer` (Tabs, Playground, Settings, About) → `BottomTabs`
(Home, Discover, Payment*, Profile) → `PaymentStack` (Checkout, PaymentResult, PaymentHistory).
Param list ở `navigation/types.ts`, có `declare global` cho `ReactNavigation.RootParamList` nên
`useNavigation()` không cần generic.

Scheme deep link **khác nhau theo flavor** (`mapper://`, `mapperstg://`, `mapperdev://`) để 3 app cài
song song không giành link. Host tách bằng regex vì `URL` polyfill của RN chưa có `.host` —
`new URL().host` chạy trên debugger rồi `undefined` trên máy thật.

Điều hướng từ **ngoài** cây React: `navigateWhenReady()` (`navigation/navigationRef.ts`).

### 3.7 Server state (TanStack Query)

Query key khai **tập trung** ở `shared/services/query/keys.ts` — viết `['orders', id]` rải rác là cách
chắc nhất để `invalidateQueries` trượt im lặng. `queryClient` đã tuỳ biến cho mobile:
`refetchOnMount: false`, không retry 4xx, mutation **không** retry. `focusManager`/`onlineManager`
phải nối tay: `App.tsx` gọi `bindAppStateToQueryFocus()` + `bindNetworkToQuery()`.

---

## 4. Cấu hình, token, hằng số

### 4.1 Nguồn cấu hình = flavor, **không có `.env`**

```
productFlavor (Android BuildConfig) / xcconfig (iOS Info.plist)
        → native module MapperAppEnv
        → src/shared/native/AppEnv.ts   (có FALLBACK trỏ dev — xem §7)
        → src/shared/config/env.ts      (cửa duy nhất cho phần còn lại của app)
```

Cố ý không dùng `react-native-config`: một giá trị chỉ được có một nguồn. Hai file `.env`/`.env.prod`
ở root là **rác 0 byte**, đừng bắt đầu dùng. Thêm biến mới = thêm ở **cả bốn**: Android BuildConfig +
iOS xcconfig + `NativeAppEnv` (`shared/native/types.ts`) + `env.ts`.

`env` (`shared/config/env.ts`) gom: `flavor/isDev/isProd`, `apiBaseUrl`, `apiTimeoutMs: 30s`,
`forgeRock.{url,realm,clientId,redirectUri,scope,loginJourney}`,
`sePay.{env,basePath,pollIntervalMs: 3s,pollTimeoutMs: 15min}`, `widget.refreshMinutes`,
`app.{name,applicationId,scheme}`, `build.{version,number,gitSha,label}`.

### 4.2 Version / build number

**Nguồn sự thật duy nhất là `package.json`**: `version` chung + `buildNumbers` tách theo flavor.
`android/app/build.gradle` đọc thẳng `package.json`; `scripts/bump.js` sinh
`ios/Config/Version.xcconfig` + `src/shared/config/buildInfo.json`. **Không** sửa
versionCode/versionName trong Gradle/Xcode — dùng `yarn bump:*` / `yarn release:*` / `yarn version:sync`
(`postinstall` tự chạy `bump.js sync`).

### 4.3 Ba kho MMKV + Keychain

`shared/services/storage/mmkv.ts` — `mapper.app` / `mapper.session` / `mapper.cache` tách biệt để
logout xoá đúng phần người dùng mà **không mất theme/ngôn ngữ**. `clearSession()` xoá session+cache.
API là **MMKV v4 (Nitro)**: `createMMKV({id})`, `remove()` — không phải `new MMKV()` / `delete()`.

`StorageKey`: `theme.mode` · `app.language` · `app.onboardingSeen` · `session.lastUserId` ·
`session.biometricEnabled` · `session.permissionRules`.

### 4.4 Design token

Bảng màu gốc từ `design-system/mapperbase/MASTER.md`. **Component không viết mã màu trực tiếp** —
thêm token vào `shared/theme/colors.ts` cho **cả** `lightColors` và `darkColors` (`darkColors` bị
`ThemeColors` ép đủ key).

| Nhóm | Token |
|---|---|
| Thương hiệu | `primary primarySoft secondary cta` |
| Nền | `background surface surfaceAlt elevated` |
| Chữ | `text textMuted textInverse` |
| Đường kẻ | `border divider` |
| Ngữ nghĩa | `success/successSoft warning/warningSoft danger/dangerSoft info/infoSoft` |
| Khác | `overlay` (sau modal) `skeleton skeletonHighlight` |

`spacing`: `xs 4 · sm 8 · md 16 · lg 24 · xl 32 · 2xl 48 · 3xl 64` — `radius`: `sm 8 · md 12 · lg 16`
— `duration`: `fast 150 · normal 250 · slow 400` — `shadow.{sm,md,lg}` (khai **cả** `shadow*` cho iOS
và `elevation` cho Android) — `typography`: `h1 h2 h3 body caption button` (font Inter là đích, hiện
fallback system font).

### 4.5 i18n

Thêm chuỗi vào `shared/i18n/locales/vi.ts` **trước**; `en.ts` bị `TranslationSchema = typeof vi` ép
phải đủ key (thiếu key = lỗi TS). Ngôn ngữ hệ thống đọc thẳng từ native, cố ý không thêm
`react-native-localize`. Saga thường gửi **`i18nKey`** thay vì chuỗi đã dịch (saga không biết ngôn
ngữ hiện tại) — `ToastHost` ưu tiên `i18nKey` rồi mới `message`.

---

## 5. Catalog: thứ có sẵn, dùng lại đừng viết mới

### 5.1 UI primitive

| Thứ | Path | Dùng khi |
|---|---|---|
| `Screen` | `shared/components/layout/Screen.tsx` | **Khung mọi màn mới.** Props: `scroll` `edges` `padded` `avoidKeyboard` `contentStyle`. Gói sẵn 3 thứ hay quên: nền theo theme, SafeAreaView, KeyboardAvoidingView (`behavior` đã đúng theo nền tảng). Màn có `FlatList` → `scroll={false}` |
| `Button` | `shared/components/Button.tsx` | variant `primary \| secondary \| ghost \| danger`, có `loading` (tự chặn nhấn ⇒ không tạo hai đơn), `leading`, minHeight 48, accessibility đủ |
| `Card` | `shared/components/layout/Card.tsx` | Khối nội dung có `title`/`subtitle`; `flat` khi nằm trong list dài (bóng đổ tốn fill-rate) |
| `Row` | `shared/components/layout/Card.tsx:44` | Dòng label–value; `mono` cho số tài khoản/mã giao dịch (tabular-nums, không nhảy cột) |

### 5.2 Modal — **một component, năm hướng**

`shared/components/modals/` · `AppModal` + 5 alias `BottomModal CenterModal HeaderModal LeftModal
RightModal`. Đã xử lý sẵn: `GestureHandlerRootView` **riêng bên trong** `RNModal` (Android tạo cây
view native riêng, gesture không xuyên qua), `BackHandler` cho nút back cứng, animation chạy xong rồi
mới unmount (`runOnJS`). Ngưỡng vuốt: 90px hoặc 800px/s.

| Nhu cầu | Cách làm |
|---|---|
| Modal của **một màn** | `useModal()` / `useModalWith<T>()` ngay trong màn đó |
| Modal mở từ **ngoài cây React** (saga, deep link, push) | Thêm id vào `shared/components/modals/ids.ts` + component vào `app/modals/registry.tsx`, mở bằng `uiActions.modalOpened` |

Đang có 2 modal toàn cục: `confirmSignOut`, `permissionDenied`.

### 5.3 Hook & tiện ích

| Thứ | Path | Ghi chú |
|---|---|---|
| `useTheme()` | `shared/contexts/ThemeContext.tsx:69` | token của theme hiện tại |
| `useThemeMode()` | `:74` | `mode/resolved/setMode/toggle`, dùng ở Settings; StatusBar đổi tập trung ở provider |
| `makeStyles(theme => ({...}))` | `shared/theme/makeStyles.ts` | vẫn là `StyleSheet.create` thật, memo theo theme |
| `useLanguage()` / `useTranslation()` | `shared/contexts/LanguageContext.tsx` | re-export `useTranslation` để đổi lib i18n chỉ sửa một chỗ |
| `useCan()` / `<Can>` / `useAbility()` | `shared/permissions/AbilityContext.tsx` | |
| `useAuth()` | `features/auth` (barrel) | API bề mặt của auth |
| `useAppDispatch/useAppSelector/useAppStore` | `store/hooks.ts` | `withTypes` — **không** dùng `useDispatch` trần |
| `useCountdown(target)` | `features/payment/hooks/useCountdown.ts` | đếm ngược hạn QR |
| `formatVnd formatNumber formatDateTime formatTime formatDuration maskAccountNumber` | `shared/utils/format.ts` | có test ở `__tests__/format.test.ts` |

### 5.4 Wrapper native (`shared/native/`)

Wrapper **có kiểu** cho 5 module tự viết — chỉ tầng này được chạm `NativeModules`:

| Wrapper | Native module | Việc |
|---|---|---|
| `AppEnv` | `MapperAppEnv` | flavor, apiBaseUrl, forgeRock*, sePayEnv, widgetRefreshMinutes, version/build |
| `SplashScreen` | `MapperSplashScreen` | `hide()` (watchdog native 8s) |
| `ForgeRock` | `MapperForgeRock` | `loginWithCredentials`, `isAuthenticated`, token |
| `Biometric` | `MapperBiometric` | mức 2 (mở khoá) + mức 3 (`createTransactionKeys`/`signChallenge`) |
| `WidgetBridge` | `MapperWidget` | `isInstalled`, `writeSnapshot`, `clearSnapshot` |

Thêm module mới → **phải thêm mock vào `jest.setup.js`**, không thì mọi test import tới đó chết ngay
dòng import. Cách viết/migrate: `docs/10-VIET-NATIVE-MODULE.md`.

### 5.5 Store

`rootReducer`: `auth · permission · payment · widget · ui`. `uiSlice` giữ toast + modal toàn cục +
`pendingDeepLink`. Slice/saga sống trong `features/X/store/`, chỉ phần **lắp** ở `src/store/`.
`rootSaga` dùng `spawn` + vòng lặp khởi động lại — đổi sang `fork` = một exception giết toàn bộ saga,
im lặng, app vẫn render nhưng không nút nào có tác dụng.

Selector: mỗi feature có `store/selectors.ts`; `store/uiSelectors.ts` cho ui.

### 5.6 Playground

`features/playground/screens/{AnimationDemos,GestureDemos}.tsx` — ví dụ Reanimated/gesture chạy được,
copy pattern từ đây trước khi tự viết.

---

## 6. Quy ước viết code

Toàn bộ đã có trong `docs/08-BASE-HUONG-DAN.md` và `docs/10` §3–5. Bản rút gọn:

- **Screen → hook → service**: màn hình giữ vai trình bày; side-effect **luôn** qua saga (thunk đã tắt
  nên không có đường khác), server state qua TanStack Query.
- Functional component + hook, không class. `StyleSheet.create`/`makeStyles`, **không** tạo object
  style trong render. List dài → `FlatList` + `keyExtractor` (đừng `map` vào `ScrollView`).
- Chỉ `shared/native/` được import `NativeModules`/`TurboModuleRegistry`. Gộp payload thay vì gọi
  native nhiều lần (>~10 call cho cùng một việc thì gộp).
- Lỗi native → `ApiError` với `kind` + `i18nKey`; đừng để chuỗi lỗi thô lên UI.
- Touch target ≥ 44pt, có `accessibilityLabel`. Dùng `useWindowDimensions`, tránh layout pixel cứng.
- Cổng trước commit/PR: `yarn lint && yarn tsc && yarn test` (tương đương `make verify`).
  Một test: `npx jest __tests__/permissions.test.ts` hoặc `npx jest -t "tên case"`.

---

## 7. Chỗ dễ sai — đọc trước khi sửa

**Lệch giữa rule chung của pack `rn` và repo này** (repo thắng, đừng "sửa" theo pack):

| Pack nói | Repo thật |
|---|---|
| "app state via zustand/context — không phải mọi thứ trong Redux" | Redux Toolkit + **saga** là lựa chọn có chủ ý; `zustand` có trong deps nhưng **chưa dùng**. Đừng chuyển state sang zustand |
| "AsyncStorage" là lib lưu trữ thường dùng | Dùng **MMKV v4 (Nitro)**, ba kho tách biệt; không có AsyncStorage |

**Bẫy kỹ thuật:**

- **Interop layer không bật mặc định trên Android RN 0.79** — 5 module tự viết là legacy bridge
  module; `useTurboModuleInterop` default `false` ở bộ override Stable ⇒ `NativeModules.MapperAppEnv`
  rất có thể `null` trên Android, và `AppEnv.ts` âm thầm rơi về FALLBACK **cấu hình dev** (bản prod
  gọi API dev). iOS bật sẵn nên bug lệch nền tảng. Chuỗi bằng chứng + cách kiểm chứng + 3 cách sửa:
  `docs/09` §12. **Chưa kiểm chứng trên device.**
- `react-native-worklets/plugin` **phải nằm cuối** `babel.config.js` — sai chỗ = worklet im lặng chạy
  trên JS thread, animation giật mà không có lỗi. Đổi babel/alias → `yarn start --reset-cache`.
- Hai config ESLint: `eslint.config.js` (flat, **đang có hiệu lực**) và `.eslintrc.js` (legacy, chết).
- `tsconfig.base.json` strict hơn (`noUncheckedIndexedAccess`, `noUnusedLocals`…) nhưng **chưa được**
  `tsconfig.json` extends — chỉ `strict: true` đang chạy.
- `jest.config.js` liệt kê tay package cần Babel transform trong `transformIgnorePatterns`; lib RN
  publish ESM báo `Unexpected token 'export'` thì bổ sung vào đó.
- Docs 01–05 là phân tích **trước** khi code; lệch nhau thì **docs 05 thắng**. Đường dẫn trong docs
  còn theo cây cũ (`src/services/auth/...`, `src/config/env.ts`) — cây thật là
  `src/features/<feature>/services/...` và `src/shared/config/env.ts`.
- Hàm render icon của tab khai ở **tầng module**, không trong thân component — khai bên trong tạo
  component type mới mỗi lần render ⇒ React huỷ cả cây con của tab (mất state, mất vị trí cuộn).

---

## 8. Kiểm thử

4 test file: `architecture.test.ts` (canh luật import), `format.test.ts`, `httpErrors.test.ts`,
`permissions.test.ts`. `jest.setup.js` mock toàn bộ native module.

Đề xuất **chưa apply** (nằm ở `docs/10` §3): thêm vào `architecture.test.ts` một case chặn
`NativeModules`/`TurboModuleRegistry` bị import ngoài `shared/native/`.
