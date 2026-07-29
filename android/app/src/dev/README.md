# Firebase config — flavor `dev`

Đặt file **`google-services.json`** của Firebase project `mapper-dev` vào đúng thư mục này
(`android/app/src/dev/google-services.json`).

Package name khai trong Firebase console phải là **`com.mapper.dev`** (đã tính cả
`applicationIdSuffix ".dev"`). Nếu khai `com.mapper` thì build sẽ fail với
`No matching client found for package name`.

Gradle tự chọn file theo variant đang build — **không** cần đổi tên, không cần script copy.
Thứ tự ưu tiên của plugin `google-services`:

```
src/<flavor><BuildType>/  ->  src/<buildType>/  ->  src/<flavor>/  ->  src/main/
```

Nên đặt ở `src/<flavor>/` để cả debug lẫn release của flavor đó dùng chung.

`android/app/build.gradle` chỉ `apply plugin: "com.google.gms.google-services"` khi
có ít nhất một file config, nên repo vẫn build được lúc chưa tải file về.

## SHA-1 / SHA-256 phải khai trong Firebase console

Bắt buộc cho Google Sign-In. Mỗi (flavor × keystore) là một fingerprint:

```bash
# debug
keytool -list -v -alias androiddebugkey -keystore android/app/debug.keystore \
  -storepass android -keypass android

# release (upload key)
keytool -list -v -alias <alias> -keystore <path-to-release.keystore>
```

Nếu bật **Play App Signing**, phải khai thêm SHA-1 của *app signing key* lấy từ
Play Console → Setup → App integrity. Thiếu cái này thì Google Sign-In chạy
được ở bản cài tay nhưng **fail ở bản tải từ Play**.
