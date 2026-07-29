# 08 – Hướng dẫn dùng base & danh sách việc còn phải làm

> File này mô tả **những gì đã có trong repo** sau khi dựng nền, và **những gì
> bạn phải điền/làm tay** trước khi chạy được thật. Đọc mục 3 trước khi build
> lần đầu, nếu không sẽ mất thời gian với các lỗi cấu hình khó hiểu.

---

## 1. Bản đồ thư mục

Cây `src/` chia theo **feature**, không theo loại file. Một nghiệp vụ nằm gọn
trong một thư mục (màn hình + service + slice + saga), thay vì rải ở
`screens/`, `services/`, `store/`.

```
src/
├── app/             lắp app lại với nhau (được phép import mọi tầng)
│   ├── providers.tsx    AppProviders — thứ tự provider có ý, đừng sắp lại
│   ├── modals/          ModalHost + registry modal toàn cục
│   └── feedback/        ToastHost
├── features/        mỗi thư mục = 1 nghiệp vụ, có index.ts làm cửa vào
│   ├── auth/            screens · services (ForgeRock, Google/FB/Apple,
│   │                    session) · store (authSlice+Saga,
│   │                    permissionSlice+Saga) · contexts/AuthContext
│   ├── payment/         screens (Checkout/History/Result) · services/sepay ·
│   │                    store · hooks/useCountdown
│   ├── widget/          hợp đồng dữ liệu app ↔ widget + store (không có màn hình)
│   ├── home/ discover/ profile/ settings/ about/     1 màn hình mỗi cái
│   └── playground/      demo gesture + animation
├── navigation/      Root → Drawer → BottomTabs → PaymentStack + deep link
├── store/           chỉ phần lắp store: configureStore, rootReducer,
│                    rootSaga, hooks có kiểu, uiSlice + uiSelectors
└── shared/          dùng chung, KHÔNG được import features/store/app/navigation
    ├── config/          env theo flavor (đọc từ native, KHÔNG có .env)
    ├── native/          wrapper có kiểu cho native module tự viết
    │   ├── AppEnv.ts        cấu hình theo flavor
    │   ├── SplashScreen.ts  splash native
    │   ├── ForgeRock.ts     journey / token / logout
    │   ├── Biometric.ts     mức 2 (mở phiên) + mức 3 (ký giao dịch)
    │   └── WidgetBridge.ts  ghi/xoá snapshot widget
    ├── services/
    │   ├── http/        axios + interceptor refresh single-flight + ApiError
    │   ├── query/       TanStack Query client + query key tập trung
    │   └── storage/     3 kho MMKV (app / session / cache)
    ├── permissions/     CASL: ability, Can, sift/assertCan
    ├── contexts/        ThemeContext · LanguageContext
    ├── theme/           token sáng/tối + makeStyles (StyleSheet thuần)
    ├── i18n/            i18next vi/en, en bị TypeScript ép phải đủ key
    ├── components/      Button · layout (Screen, Card) · modals (AppModal 5
    │                    hướng, useModal, MODAL_IDS)
    └── utils/           format tiền/thời gian
```

**Luật import** (có `__tests__/architecture.test.ts` canh, sai là test đỏ):

| Từ | Được import | Không được |
|---|---|---|
| `shared/` | `shared/` | `features/` `store/` `app/` `navigation/` |
| `features/X` | `shared/` `store/` `features/Y` (qua cửa vào) | `app/` · ruột của `features/Y` |
| `store/` `navigation/` `app/` | tất cả | — |

- Cùng module thì dùng đường dẫn relative (`./`, `../`), khác module dùng `@/`.
- Feature `auth` có **hai** cửa vào: `@/features/auth` (UI + selector) và
  `@/features/auth/services` (API domain thuần). Saga/service của feature khác
  phải dùng cửa thứ hai — đi qua barrel UI sẽ kéo theo AuthContext và tạo vòng
  `store → rootSaga → paymentSaga → barrel → AuthContext → store/hooks`.
- `rootReducer.ts`/`rootSaga.ts` import **thẳng** file slice/saga, không qua
  barrel của feature, cùng lý do trên.

android/app/src/main/java/com/mapper/
├── MapperPackage.kt         đăng ký native module
├── env/AppEnvModule.kt
├── splash/                  SplashGate + SplashScreenModule
├── auth/                    ForgeRockAuthModule + BiometricModule
└── widget/                  Glance widget + receiver + worker + snapshot store

ios/
├── Config/                  Base/Dev/Staging/Prod/Version xcconfig
├── Mapper/Native/           5 native module (Swift + .m)
├── MapperWidget/            WidgetKit extension (SwiftUI)
├── Firebase/{dev,staging,prod}/
└── Scripts/select-firebase-config.sh
```

---

## 2. Lệnh hằng ngày

```bash
# chạy
yarn android:dev        yarn android:staging      yarn android:prod
yarn ios:dev            yarn ios:staging          yarn ios:prod

# đóng gói
yarn apk:dev            # APK  (gửi tay)
yarn aab:dev            # AAB  (Play Internal)

# version
yarn bump:dev           # dev +1 build
yarn release:patch      # 1.2.3 -> 1.2.4, cả 3 flavor +1 build
yarn version:print

# chất lượng
yarn tsc                yarn lint                 yarn test
```

---

## 3. ⚠️ Phải điền trước khi chạy thật

Base cố tình để giá trị `REPLACE_...` thay vì số giả trông-như-thật. Số giả sẽ
chạy được tới lúc gặp lỗi ở nơi khác hẳn và tốn hàng giờ để lần ra.

| # | Việc | File | Hậu quả nếu bỏ qua |
|---|---|---|---|
| 1 | `google-services.json` cho 3 flavor | `android/app/src/{dev,staging,prod}/` | Không có FCM/Analytics |
| 2 | `GoogleService-Info.plist` cho 3 flavor | `ios/Firebase/{dev,staging,prod}/` | Như trên, iOS |
| 3 | Google `webClientId` (**OAuth client loại Web**) | `src/services/auth/bootstrap.ts` | `idToken` trả `null`, hoặc `DEVELOPER_ERROR` |
| 4 | Facebook App ID + Client Token | `bootstrap.ts` + `Info.plist` + `gradle.properties` | FB Login treo im lặng |
| 5 | ForgeRock `oauthClientId` + tên journey | `src/config/env.ts` | Login luôn lỗi |
| 6 | SHA‑1/SHA‑256 (debug, upload, **và Play App Signing**) | Firebase console | Google Sign‑In chạy bản cài tay, fail bản tải Play |
| 7 | Upload keystore | `android/keystore.properties` | Release ký bằng debug key → không lên store được |
| 8 | Dựng flavor iOS trong Xcode | xem `07-IOS-FLAVOR-XCODE.md` | Chỉ build được một cấu hình |
| 9 | Tạo target WidgetKit + App Group | `07-IOS-FLAVOR-XCODE.md` bước 7 | Widget iOS không có |
| 10 | Đối chiếu API ForgeRock SDK với AAR/pod thật | `ForgeRockAuthModule.kt`, `ForgeRockModule.swift` | Xem mục 5 |

Facebook trên Android đọc từ `gradle.properties` (không commit):

```properties
FACEBOOK_APP_ID_DEV=123456789
FACEBOOK_CLIENT_TOKEN_DEV=abcdef
FACEBOOK_APP_ID_STAGING=...
FACEBOOK_CLIENT_TOKEN_STAGING=...
FACEBOOK_APP_ID_PROD=...
FACEBOOK_CLIENT_TOKEN_PROD=...
```

---

## 4. Việc phía Backend (chặn FE)

Ngoài danh sách ở `00-TONG-QUAN.md` mục 5, base này còn cần:

| Endpoint | Ghi chú |
|---|---|
| `GET /auth/permissions` | Trả **rule CASL thô**. Xem `src/permissions/types.ts` để biết hình dạng và ví dụ. Client KHÔNG tự suy quyền từ `role`. |
| `POST /transactions/{id}/challenge` | `challenge` **phải chứa hash nội dung giao dịch**, hết hạn 30–60s, giới hạn số lần thử. |
| `POST /transactions/{id}/confirm` | Verify chữ ký ECDSA P‑256 (SHA256withECDSA) bằng public key đã enroll. |
| `POST /biometric/enroll` | Public key gửi lên ở định dạng **X.509/SPKI base64** — iOS đã được bọc sẵn cho khớp Android, backend chỉ xử lý một định dạng. |
| `POST /payments/sepay/orders` | Nhận `idempotencyKey`, trả **đúng đơn cũ** nếu key trùng. |
| `GET  /payments/sepay/orders/{id}/status` | Bị poll 3 giây/lần → chỉ đọc DB, **không** gọi ngược sang SePay. |
| Webhook SePay | Nguồn sự thật duy nhất của "đã trả tiền". App không bao giờ tự kết luận. |

---

## 5. Những chỗ cần kiểm chứng lại (không nên tin tuyệt đối vào code hiện tại)

Theo "Nguyên tắc vàng" trong `TurioldBase.md`: sau khi cài, đọc docs/source của
đúng phiên bản đã cài, không copy docs bản mới hơn.

1. **ForgeRock SDK** — `forgerock-auth:4.8.1` (Android) và `FRAuth ~> 4.8.0`
   (iOS) chưa được build thử trong môi trường này. Chỗ hay lệch giữa các minor
   version: khởi tạo `FROptions`/`FROptionsBuilder`, chữ ký `Node.next()`, và
   package của các Callback. Sau lần sync Gradle / `pod install` đầu tiên, mở
   thư viện ra đối chiếu rồi sửa nếu cần — hai file đã đánh dấu ⚠️ ở đầu.

2. **Firebase 25 + iOS deployment target** — `Base.xcconfig` đang để 15.1 và
   Podfile ép mọi pod về 15.1. Nếu Firebase 25 yêu cầu cao hơn, nâng cả hai chỗ
   cùng lúc (nâng một chỗ sẽ gặp lỗi link rất khó đọc).

3. **Glance 1.1 + Kotlin 2.0.21** — cần Compose compiler plugin (đã khai trong
   `android/build.gradle`). Nếu bản Glance đổi API `GlanceTheme.colors`, sửa
   trong `MapperWidget.kt`.

---

## 6. Quy ước khi viết thêm code

| Việc | Cách làm | Vì sao |
|---|---|---|
| Thêm màu | Thêm token vào `theme/colors.ts` cho **cả** light và dark | Viết mã màu trực tiếp là cách chắc chắn nhất để hỏng dark mode ở chỗ không ai kiểm tra |
| Thêm style | `makeStyles(theme => ({...}))` | Vẫn là `StyleSheet.create` thật, nhưng memo theo theme |
| Thêm chuỗi | Thêm vào `i18n/locales/vi.ts` **rồi** `en.ts` | `TranslationSchema` ép TS báo lỗi nếu thiếu bản dịch |
| Gọi API | Thêm hàm vào `services/<domain>/`, không gọi axios trong component | Tầng phân quyền và xử lý lỗi nằm ở service |
| Lọc theo quyền | `sift()` sau khi API trả về, `assertCan()` trước khi gọi | Tầng thứ hai; backend vẫn phải kiểm |
| Tác dụng phụ | Saga, **không** thunk (đã tắt thunk) | Một chỗ duy nhất để tìm logic bất đồng bộ |
| Modal của một màn | `useModal()` ngay trong màn đó | Chỉ modal mở từ ngoài React mới lên `ModalHost` |
| Giá trị chuyển động | `useSharedValue`, không `useState` | State = render lại mỗi frame = tụt fps trên máy yếu |
| Đổi build number | `yarn bump:*`, không sửa Gradle/Xcode | Sửa tay = tạo nguồn sự thật thứ hai |

---

## 7. Ba chỗ dễ hỏng nhất, đã xử lý sẵn — đừng "dọn dẹp" mất

1. **Thứ tự trong `performLogout()`** (`services/auth/session.ts`) — xoá
   snapshot widget phải là bước ĐẦU TIÊN và phải `await`. Đảo thứ tự = dữ liệu
   người dùng cũ nằm trên màn hình chính của người tiếp theo. `docs/05` mục 5
   xếp đây là hạng mục chặn phát hành.

2. **Single-flight refresh** (`services/http/authTokens.ts`) — 5 request cùng
   401 chỉ được tạo 1 lần refresh. Bỏ cơ chế này thì với refresh token rotate,
   4 request còn lại làm hỏng phiên và app đá người dùng ra màn Login.

3. **`spawn` + vòng lặp khởi động lại trong `rootSaga`** — đổi sang `fork` thì
   một exception ở bất kỳ saga con nào sẽ giết toàn bộ saga của app, im lặng.
   App vẫn render nhưng không nút nào còn tác dụng.
