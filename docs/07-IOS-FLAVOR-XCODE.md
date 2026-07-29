# 07 – Dựng flavor iOS trong Xcode (việc tay, ~30 phút, làm 1 lần)

> Android flavor là **code** (`productFlavors` trong Gradle) nên đã xong hoàn toàn.
> iOS flavor sống trong `project.pbxproj` — file này là danh sách thao tác tay
> chính xác, làm đúng thứ tự. Mọi file cấu hình cần thiết đã có sẵn trong repo.

Đã có sẵn:

```
ios/Config/Base.xcconfig       Version.xcconfig (auto-gen)
ios/Config/Dev.xcconfig        Staging.xcconfig   Prod.xcconfig
ios/Mapper/Mapper.entitlements
ios/Scripts/select-firebase-config.sh
ios/Firebase/{dev,staging,prod}/   <- bỏ GoogleService-Info.plist vào
```

---

## Bước 1 — Tạo 6 build configuration

Xcode → chọn **project** `Mapper` (dòng trên cùng) → tab **Info** → **Configurations**.

Đang có `Debug` và `Release`. Duplicate ra đủ 6 và đổi tên thành **đúng** các
chuỗi sau (khớp với `Podfile` và `package.json`, sai một ký tự là hỏng):

```
Debug Dev        Debug Staging        Debug Prod
Release Dev      Release Staging      Release Prod
```

Xoá `Debug` và `Release` gốc sau khi đã có 6 cái trên.

## Bước 2 — Gán xcconfig cho từng configuration

Vẫn ở màn **Configurations**, mở rộng từng dòng, cột **Mapper** (project level):

| Configuration | Set to |
|---|---|
| Debug Dev / Release Dev | `Config/Dev.xcconfig` |
| Debug Staging / Release Staging | `Config/Staging.xcconfig` |
| Debug Prod / Release Prod | `Config/Prod.xcconfig` |

> Gán ở **project level**, không phải target level. Target level để CocoaPods dùng.

Sau `pod install`, CocoaPods sẽ tự chèn `#include "Pods-Mapper.debug dev.xcconfig"`
vào target-level config. Nếu Xcode báo *"target overrides the ... build setting"*,
vào **target Mapper → Build Settings**, tìm setting bị cảnh báo, nhấn **Delete**
để nó quay về giá trị kế thừa từ xcconfig.

## Bước 3 — Xoá giá trị hardcode ở Build Settings

Target `Mapper` → **Build Settings** → gõ tìm và **xoá** (phím Delete) các dòng
đang set cứng, để chúng nhận giá trị từ xcconfig:

- `PRODUCT_BUNDLE_IDENTIFIER`
- `MARKETING_VERSION`
- `CURRENT_PROJECT_VERSION`
- `IPHONEOS_DEPLOYMENT_TARGET`
- `CODE_SIGN_ENTITLEMENTS`

Kiểm tra: chọn configuration `Debug Dev`, `PRODUCT_BUNDLE_IDENTIFIER` phải hiện
`com.mapper.dev` màu xám (kế thừa), không phải màu đen (override).

## Bước 4 — Tạo 3 scheme

Product → Scheme → Manage Schemes.

| Scheme | Run | Test | Profile | Analyze | Archive |
|---|---|---|---|---|---|
| **Mapper Dev** | Debug Dev | Debug Dev | Release Dev | Debug Dev | Release Dev |
| **Mapper Staging** | Debug Staging | Debug Staging | Release Staging | Debug Staging | Release Staging |
| **Mapper** | Debug Prod | Debug Prod | Release Prod | Debug Prod | Release Prod |

Tick **Shared** cho cả 3 (nếu không, scheme nằm trong `xcuserdata` và
`.gitignore` sẽ nuốt mất → máy đồng nghiệp không thấy scheme nào).

## Bước 5 — Run Script chọn Firebase config

Target `Mapper` → **Build Phases** → `+` → **New Run Script Phase**.

- Đổi tên: `Select Firebase config`
- Kéo lên **trước** `Copy Bundle Resources`
- Bỏ tick *Based on dependency analysis*
- Nội dung:

```sh
"${SRCROOT}/Scripts/select-firebase-config.sh"
```

```bash
chmod +x ios/Scripts/select-firebase-config.sh
```

## Bước 6 — Entitlements & Capabilities

Target `Mapper` → **Signing & Capabilities**. Với **mỗi** configuration, thêm:

- **Sign in with Apple**
- **Push Notifications**
- **App Groups** → `group.com.mapper.dev` / `.staging` / `group.com.mapper`
- **Keychain Sharing**

Xcode ghi vào `Mapper/Mapper.entitlements` — file đã có sẵn trong repo và dùng
`$(APP_GROUP)` nên tự đúng theo flavor. Nếu Xcode ghi đè bằng giá trị cứng thì
sửa lại thành `$(APP_GROUP)`.

⚠️ **Apple Developer portal**: phải tạo trước 3 App ID (`com.mapper`,
`com.mapper.dev`, `com.mapper.staging`), 3 App Group, và bật Sign in with Apple +
Push cho từng cái. Automatic signing không tự tạo App Group.

## Bước 7 — Widget extension

File → New → Target → **Widget Extension**, tên `MapperWidgetExtension`,
**bỏ tick** "Include Configuration App Intent" (bản đầu chưa cần widget cấu hình được).

Sau khi Xcode tạo target:

1. Xoá file Swift mẫu Xcode sinh ra, thêm các file đã có sẵn trong repo:
   `ios/MapperWidget/MapperWidget.swift`, `WidgetSnapshot.swift`, `Provider.swift`
2. Bundle id của extension: dùng `$(WIDGET_BUNDLE_ID)` từ xcconfig
   → gán cả 3 xcconfig cho target extension y như bước 2
3. Extension cũng cần **App Groups** với đúng group của flavor
4. `Podfile` đã khai `target 'MapperWidgetExtension' do inherit! :none end`

## Bước 8 — Chạy thử

```bash
yarn version:sync
yarn pods
yarn ios:dev
```

Kiểm tra nhanh trong app: màn **About** phải hiện `Mapper Dev · 1.0.0 (1) · <sha>`,
và `env.API_BASE_URL` phải là `https://dev.hrapi.ttmedic.vn`.

---

## Bảng đối chiếu nhanh Android ↔ iOS

| Khái niệm | Android | iOS |
|---|---|---|
| Flavor | `productFlavors { dev {} }` | Build configuration + scheme |
| Định danh | `applicationId` + `applicationIdSuffix` | `PRODUCT_BUNDLE_IDENTIFIER` trong xcconfig |
| Biến theo flavor | `buildConfigField` → `BuildConfig.X` | xcconfig → `Info.plist` → `Bundle.main.object(forInfoDictionaryKey:)` |
| Firebase config | thư mục `src/<flavor>/google-services.json` | Run Script copy từ `ios/Firebase/<flavor>/` |
| Version | Gradle đọc `package.json` | `Version.xcconfig` do `bump.js` ghi |
| Build number | `versionCode` mỗi flavor | `CURRENT_PROJECT_VERSION` mỗi xcconfig |
| Tên app | `resValue "string", "app_name"` | `DISPLAY_NAME` → `CFBundleDisplayName` |
| Deep link scheme | `manifestPlaceholders.appScheme` | `APP_SCHEME` → `CFBundleURLTypes` |

---

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| `Unable to open base configuration reference file` | Chưa `pod install` sau khi đổi tên configuration | `yarn pods` |
| Bản Debug không có dev menu, không nối được Metro | Configuration mới chưa khai trong `project '...'` ở Podfile | Kiểm tra map `'Debug Dev' => :debug` |
| `CFBundleDisplayName` hiện `$(DISPLAY_NAME)` | Configuration chưa gán xcconfig | Bước 2 |
| Build number không đổi dù đã `yarn bump:dev` | Target còn override `CURRENT_PROJECT_VERSION` | Bước 3 |
| App Group không lưu được, widget rỗng | App ID chưa bật App Group trên portal, hoặc app và extension khác group | Bước 6 + 7 |
| `No matching client found for package name` (Android) | `google-services.json` khai sai package (quên `.dev`) | `android/app/src/dev/README.md` |
