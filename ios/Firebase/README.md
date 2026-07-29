# Firebase config iOS theo flavor

```
ios/Firebase/
  dev/GoogleService-Info.plist       <- Firebase project mapper-dev,     bundle com.mapper.dev
  staging/GoogleService-Info.plist   <- Firebase project mapper-staging, bundle com.mapper.staging
  prod/GoogleService-Info.plist      <- Firebase project mapper-prod,    bundle com.mapper
```

**Không** kéo `GoogleService-Info.plist` vào Xcode như một resource bình thường —
làm vậy chỉ có một file duy nhất cho cả 3 flavor. Thay vào đó Run Script phase
`Scripts/select-firebase-config.sh` copy đúng file vào `.app` lúc build, dựa trên
biến `FIREBASE_CONFIG_DIR` khai trong `ios/Config/<Flavor>.xcconfig`.

Ba file này nằm trong `.gitignore` (chứa API key). Chia sẻ qua kho secret của team.

## Sau khi thêm file, phải làm thêm 1 bước tay

Mở từng file, copy giá trị `REVERSED_CLIENT_ID` và dán vào `Info.plist` →
`CFBundleURLTypes` → mục `vn.ttmedic.mapper.google`, thay chỗ
`REPLACE_WITH_REVERSED_CLIENT_ID`.

Vì giá trị này khác nhau giữa 3 flavor mà `Info.plist` chỉ có một, nên nếu cần
Google Sign-In trên **cả 3** flavor thì đưa nó thành biến xcconfig:

```
// Dev.xcconfig
GOOGLE_REVERSED_CLIENT_ID = com.googleusercontent.apps.1234-abcdef
```

rồi trong `Info.plist` dùng `$(GOOGLE_REVERSED_CLIENT_ID)`.
