# 06 – Flavor & Build number: hai mô hình, code đầy đủ cho cả hai

> Base **đang chạy mô hình A (tách build number theo flavor)**.
> Mục 4 của file này là **code đầy đủ để chuyển sang mô hình B (dùng chung một build number)** — copy–paste là chạy, không phải tự suy.

---

## 1. Ba flavor × hai buildType = sáu variant

| Flavor | applicationId (Android) | bundleId (iOS) | Tên hiển thị | API host |
|---|---|---|---|---|
| `dev` | `com.mapper.dev` | `com.mapper.dev` | Mapper Dev | `dev.hrapi.ttmedic.vn` |
| `staging` | `com.mapper.staging` | `com.mapper.staging` | Mapper Staging | `staging.hrapi.ttmedic.vn` |
| `prod` | `com.mapper` | `com.mapper` | Mapper | `hrapi.ttmedic.vn` |

Mỗi flavor có đúng **2 dạng build**:

| Dạng | Android | iOS | Dùng để |
|---|---|---|---|
| **Debug** (bundle từ Metro) | `assemble<Flavor>Debug` | configuration `Debug <Flavor>` | Dev máy thật/emulator, JS lấy từ Metro, có dev menu |
| **Release** (bundle nhúng trong gói) | `assemble<Flavor>Release` (APK) / `bundle<Flavor>Release` (AAB) | configuration `Release <Flavor>` | QA, TestFlight, Play Internal, Production |

```bash
yarn android:dev          # devDebug     -> cài lên máy, chạy với Metro
yarn apk:dev              # devRelease   -> APK gửi tay
yarn aab:dev              # devRelease   -> AAB upload Play Internal
yarn android:staging      # stagingDebug
yarn aab:staging
yarn android:prod
yarn aab:prod             # AAB lên Production
```

> `debuggableVariants = ["devDebug", "stagingDebug", "prodDebug"]` trong khối `react { }`
> là **bắt buộc** khi có flavor. Thiếu dòng này, bản debug vẫn cố nhúng JS bundle
> → build chậm gấp 3 và sửa code không hot-reload.

---

## 2. Mô hình A — **build number TÁCH theo flavor** (đang dùng)

### Vì sao

Mỗi flavor là **một app record riêng** trên Play Console và App Store Connect
(chốt ở `05-CHOT-QUYET-DINH.md` mục 2). Ba app record ⇒ **ba không gian build
number hoàn toàn độc lập**. Bắn 30 bản dev một tuần không ảnh hưởng gì tới số
của prod.

### Nguồn sự thật

```jsonc
// package.json
{
  "version": "1.2.3",
  "buildNumbers": { "dev": 46, "staging": 12, "prod": 5 }
}
```

`version` (marketing version) **chung cho cả ba** — cùng một commit thì cùng một
`1.2.3`, chỉ số build khác nhau.

### Lệnh hằng ngày

```bash
yarn bump:dev        # dev 46 -> 47      (staging, prod giữ nguyên)
yarn bump:staging    # staging 12 -> 13
yarn bump:prod       # prod 5 -> 6
yarn bump:all        # cả ba +1
yarn release:patch   # 1.2.3 -> 1.2.4 và cả ba +1
yarn version:print   # in bảng hiện tại
```

### Ưu / nhược

| Ưu | Nhược |
|---|---|
| Số prod nhỏ, sạch, đọc release note dễ | 3 con số phải theo dõi |
| Bắn dev thoải mái không "đốt" số prod | `1.2.3 (5)` ở prod và `1.2.3 (47)` ở dev **không phải cùng một build** — phải nhìn cả env |
| Đúng bản chất "3 app record độc lập" | Khi 3 flavor cùng lên bản, phải nhớ `bump:all` |

---

## 3. Mô hình B — **dùng chung MỘT build number** cho cả 3 flavor

### Vì sao có người chọn cách này

Một con số duy nhất ⇒ **`build 46` xác định duy nhất một commit** trên cả 6 gói
(3 flavor × 2 nền tảng). QA nói "bản 46 bị lỗi" là không cần hỏi lại flavor nào.
Số bị **nhảy cách** (dev đốt 46, 47 thì prod đi tiếp từ 48) — điều này **hoàn
toàn hợp lệ** với cả Play lẫn App Store: luật chỉ là *tăng dần / không trùng*,
không bắt buộc liên tiếp.

### Ưu / nhược so với A

| | Mô hình A (tách) | Mô hình B (chung) |
|---|---|---|
| Truy vết commit từ build number | Cần biết cả flavor | ✅ Chỉ cần số |
| Số của prod | Nhỏ, đẹp | Lớn và nhảy cách (48, 53, 61…) |
| Rủi ro upload trùng | Thấp | Thấp (một counter duy nhất, luôn tăng) |
| Số biến phải quản | 3 | 1 |
| Quên bump 1 flavor | Có thể xảy ra | Không thể |

**Cả hai đều đúng.** Chọn B nếu team hay phải map ngược từ build number về commit;
chọn A nếu muốn số prod đẹp khi lên store.

---

## 4. Code đầy đủ để chuyển sang mô hình B

Ba file phải sửa. Dán đè nguyên khối.

### 4.1 `package.json`

Thay `buildNumbers` object bằng một số:

```jsonc
{
  "name": "Mapper",
  "version": "1.2.3",
  "buildNumber": 46,          // <- MỘT counter duy nhất cho cả 3 flavor
  "scripts": {
    "bump": "node scripts/bump.js build",
    "release:patch": "node scripts/bump.js patch",
    "release:minor": "node scripts/bump.js minor",
    "release:major": "node scripts/bump.js major",
    "version:print": "node scripts/bump.js print",
    "version:sync": "node scripts/bump.js sync",
    "postinstall": "node scripts/bump.js sync"
  }
}
```

### 4.2 `scripts/bump.js` — bản dùng chung

```js
#!/usr/bin/env node
/**
 * Mô hình B: MỘT build number dùng chung cho dev / staging / prod × iOS / Android.
 *
 *   node scripts/bump.js build   -> 1.2.3 (46) -> 1.2.3 (47)
 *   node scripts/bump.js patch   -> 1.2.3 (46) -> 1.2.4 (47)
 *   node scripts/bump.js minor   -> 1.2.3 (46) -> 1.3.0 (47)
 *   node scripts/bump.js major   -> 1.2.3 (46) -> 2.0.0 (47)
 *   node scripts/bump.js print   -> chỉ in
 *   node scripts/bump.js sync    -> ghi lại file sinh ra, không đổi số
 */
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const XCCONFIG_PATH = path.join(ROOT, 'ios', 'Config', 'Version.xcconfig');
const BUILD_INFO_PATH = path.join(ROOT, 'src', 'config', 'buildInfo.json');

const MODES = ['build', 'patch', 'minor', 'major', 'print', 'sync'];

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return 'nogit';
  }
}

function bumpSemver(version, mode) {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(n => parseInt(n, 10) || 0);
  if (mode === 'major') return `${major + 1}.0.0`;
  if (mode === 'minor') return `${major}.${minor + 1}.0`;
  if (mode === 'patch') return `${major}.${minor}.${patch + 1}`;
  return version;
}

function writeFileEnsured(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, content);
}

function main() {
  const mode = process.argv[2] || 'build';
  if (!MODES.includes(mode)) {
    console.error(`Mode không hợp lệ: "${mode}". Dùng: ${MODES.join(' | ')}`);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  let version = pkg.version || '0.0.1';
  let buildNumber = parseInt(pkg.buildNumber, 10) || 1;

  if (mode === 'print') {
    console.log(`${version} (${buildNumber}) ${gitSha()}`);
    return;
  }

  if (mode !== 'sync') {
    version = bumpSemver(version, mode);
    buildNumber += 1;
    pkg.version = version;
    pkg.buildNumber = buildNumber;
    fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
  }

  // MỘT giá trị CURRENT_PROJECT_VERSION cho mọi configuration.
  // Dev/Staging/Prod.xcconfig KHÔNG cần khai CURRENT_PROJECT_VERSION nữa —
  // xoá dòng đó khỏi cả ba file, nếu không nó sẽ ghi đè giá trị ở đây.
  writeFileEnsured(
    XCCONFIG_PATH,
    [
      '// TỰ ĐỘNG SINH RA bởi scripts/bump.js — ĐỪNG sửa tay.',
      '// Mô hình B: một build number dùng chung cho cả 3 flavor.',
      '',
      `MARKETING_VERSION = ${version}`,
      `CURRENT_PROJECT_VERSION = ${buildNumber}`,
      '',
    ].join('\n'),
  );

  writeFileEnsured(
    BUILD_INFO_PATH,
    JSON.stringify({version, buildNumber, gitSha: gitSha()}, null, 2) + '\n',
  );

  console.log(`${version} (${buildNumber}) ${gitSha()}`);
  console.log('  ios/Config/Version.xcconfig  đã ghi');
  console.log('  src/config/buildInfo.json    đã ghi');
  console.log('  android                      không cần sửa (Gradle đọc package.json)');
}

main();
```

### 4.3 `android/app/build.gradle` — bản dùng chung

Thay khối đọc version và bỏ `versionCode` khỏi từng flavor:

```groovy
import groovy.json.JsonSlurper

/* --- Mô hình B: MỘT build number cho cả 3 flavor --- */
def appPkg = new JsonSlurper().parseText(file("../../package.json").text)
def appVersionName  = appPkg.version as String
def appBuildNumber  = (appPkg.buildNumber ?: 1) as Integer

android {
    defaultConfig {
        applicationId "com.mapper"
        minSdkVersion    rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion

        // Set MỘT LẦN ở đây, cả 3 flavor kế thừa.
        versionCode appBuildNumber
        versionName appVersionName

        resValue "string", "build_number", "${appBuildNumber}"
        resValue "string", "app_version",  "${appVersionName}"
    }

    flavorDimensions += "env"
    productFlavors {
        dev {
            dimension "env"
            applicationIdSuffix ".dev"
            // KHÔNG khai versionCode ở đây nữa
            resValue "string", "app_name", "Mapper Dev"
            buildConfigField "String", "FLAVOR_ENV",   '"dev"'
            buildConfigField "String", "API_BASE_URL", '"https://dev.hrapi.ttmedic.vn:443"'
        }
        staging {
            dimension "env"
            applicationIdSuffix ".staging"
            resValue "string", "app_name", "Mapper Staging"
            buildConfigField "String", "FLAVOR_ENV",   '"staging"'
            buildConfigField "String", "API_BASE_URL", '"https://staging.hrapi.ttmedic.vn:443"'
        }
        prod {
            dimension "env"
            resValue "string", "app_name", "Mapper"
            buildConfigField "String", "FLAVOR_ENV",   '"prod"'
            buildConfigField "String", "API_BASE_URL", '"https://hrapi.ttmedic.vn:443"'
        }
    }

    applicationVariants.configureEach { variant ->
        variant.outputs.configureEach { output ->
            if (output.hasProperty("outputFileName") && output.outputFileName.endsWith(".apk")) {
                output.outputFileName =
                    "Mapper-${variant.flavorName}-${appVersionName}-${appBuildNumber}-${variant.buildType.name}.apk"
            }
        }
    }
}
```

### 4.4 `ios/Config/{Dev,Staging,Prod}.xcconfig`

**Xoá** dòng này khỏi cả ba file:

```diff
- CURRENT_PROJECT_VERSION = $(BUILD_NUMBER_DEV)
```

`Base.xcconfig` đã `#include "Version.xcconfig"`, mà file đó giờ khai thẳng
`CURRENT_PROJECT_VERSION` — mọi configuration nhận cùng một số.

### 4.5 Kiểm tra sau khi chuyển

```bash
yarn version:sync
yarn version:print                                  # 1.2.3 (46)
grep CURRENT_PROJECT_VERSION ios/Config/*.xcconfig  # chỉ Version.xcconfig có
cd android && ./gradlew :app:assembleDevDebug --dry-run
```

Và kiểm tra thật trên gói đã build:

```bash
# Android
aapt2 dump badging android/app/build/outputs/apk/dev/release/*.apk | grep versionCode

# iOS (sau khi archive)
/usr/libexec/PlistBuddy -c "Print CFBundleVersion" \
  "<đường dẫn>/Mapper.app/Info.plist"
```

---

## 5. Quy tắc chung cho **cả hai mô hình**

### 5.1 Cấm ghi đè build number — không có ngoại lệ

| Kênh | Luật |
|---|---|
| TestFlight | Cặp (`CFBundleShortVersionString`, `CFBundleVersion`) phải **duy nhất**. Upload trùng bị từ chối ở bước processing — mất ~15 phút mới biết |
| Play Internal testing | `versionCode` phải **lớn hơn mọi bản đã từng upload**, kể cả bản đã archive/xoá |

Mỗi lần đưa bản cho QA là một build number mới, kể cả khi chỉ sửa một dòng.

### 5.2 Quy trình phát hành thủ công (chưa có CI)

```
1. yarn bump:dev                      # hoặc release:patch nếu là bản release
2. git commit -am "build dev 47" && git tag dev-47
3. yarn aab:dev                       # -> AAB -> upload Play Internal (app dev)
4. Xcode: scheme "Mapper Dev" -> Archive -> Distribute -> TestFlight
5. Dán "1.2.3 (47) · <sha>" vào release note cho QA
```

### 5.3 Màn About là bắt buộc

`src/config/buildInfo.json` được `scripts/bump.js` ghi ra, chứa `version`,
`buildNumbers`/`buildNumber` và `gitSha`. Màn About phải hiện:

```
Mapper Dev · 1.2.3 (47) · a1b2c3d
```

Không có dòng này, QA báo bug mà không ai biết đang test bản nào — với nhịp
build dày của TestFlight thì đây là vấn đề thật.

### 5.4 Không bao giờ sửa số ở Gradle hay Xcode

| Nơi | Đọc số từ đâu |
|---|---|
| `android/app/build.gradle` | `JsonSlurper` đọc thẳng `package.json` |
| Xcode | `ios/Config/Version.xcconfig` (do `bump.js` ghi) |
| JS (màn About) | `src/config/buildInfo.json` (do `bump.js` ghi) |

Sửa tay ở Gradle/Xcode = tạo nguồn sự thật thứ hai = chắc chắn lệch.
`postinstall` chạy `version:sync` nên checkout mới về là các file sinh ra tự có.
