# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

App React Native 0.79 (New Architecture / Fabric + Hermes), TypeScript strict, 3 flavor `dev | staging | prod`.
Code và comment trong repo viết bằng tiếng Việt — giữ nguyên phong cách đó khi thêm code.

Tài liệu nền: `docs/08-BASE-HUONG-DAN.md` (bản đồ thư mục, danh sách giá trị `REPLACE_...` phải điền
trước khi build thật, quy ước viết code), `docs/00-TONG-QUAN.md` (index của docs 01–10),
`docs/09-KIEN-TRUC-JS-NATIVE.md` (cơ chế tầng framework: Hermes/JSI/TurboModule/Nitro/Fabric),
`docs/10-VIET-NATIVE-MODULE.md` (hướng dẫn viết code + checklist khi chạm tầng native),
`TurioldBase.md` (nguyên tắc: luôn đọc docs/source **đúng version đã cài** trong `node_modules`).

## Lệnh

```bash
yarn install                 # postinstall tự chạy `bump.js sync`
yarn start                   # Metro (một Metro phục vụ cả 3 flavor)
yarn start --reset-cache     # bắt buộc sau khi đổi babel.config.js / alias

yarn android:dev             # :staging  :prod   (variant devDebug/stagingDebug/prodDebug)
yarn ios:dev                 # :staging  :prod   (scheme "Mapper Dev"/"Mapper Staging"/"Mapper")
yarn apk:dev | aab:dev       # release artifact
yarn pods                    # bundle exec pod install

yarn lint                    # ESLint
yarn tsc                     # tsc --noEmit
yarn test                    # Jest
```

Một test / một case:

```bash
npx jest __tests__/permissions.test.ts
npx jest -t "shared/ không import features"
npx jest --watch
```

Cổng trước commit/PR = `yarn lint && yarn tsc && yarn test` (tương đương `make verify`).

**Makefile là macOS-only** — `SHELL=/bin/bash`, dò JDK bằng `/usr/libexec/java_home`, fallback
`/Applications/Android Studio.app`; trên Windows `guard-java` fail ngay. Máy dev hiện tại là Windows,
nên dùng `yarn ...` / VS Code tasks (`.vscode/tasks.json`, đã có `windows` override cho các target
Gradle) thay vì `make`. Target thật nằm trong `make/*.mk` chia theo domain, `make` không tham số in help.

## Nguồn cấu hình: flavor, không phải .env

Chuỗi: productFlavor (Android `BuildConfig`) / xcconfig (iOS `Info.plist`) → native module
`MapperAppEnv` → `src/shared/native/AppEnv.ts` (có FALLBACK trỏ dev) → `src/shared/config/env.ts`.

Cố ý **không có `.env`** và không dùng `react-native-config` — một giá trị chỉ được có một nguồn.
Hai file `.env`/`.env.prod` ở root là rác 0 byte, đừng bắt đầu dùng chúng. Thêm biến cấu hình mới =
thêm ở cả Android BuildConfig + iOS xcconfig + `NativeAppEnv` + `env.ts`.

Version/build number: **nguồn sự thật duy nhất là `package.json`** (`version` chung + `buildNumbers`
tách theo flavor, vì mỗi flavor là một app record riêng trên store). `android/app/build.gradle` đọc
thẳng `package.json`; `scripts/bump.js` sinh ra `ios/Config/Version.xcconfig` và
`src/shared/config/buildInfo.json`. Không sửa versionCode/versionName trong Gradle/Xcode — dùng
`yarn bump:*` / `yarn release:*` / `yarn version:sync`.

## Kiến trúc `src/`

Chia theo feature, không theo loại file. Luật import được **test canh** trong
`__tests__/architecture.test.ts` (sai là test đỏ, không phải warning):

| Từ | Được import | Không được |
|---|---|---|
| `shared/` | `shared/` | `features/` `store/` `app/` `navigation/` |
| `features/X` | `shared/` `store/` `features/Y` qua cửa vào công khai | `app/` · ruột của `features/Y` |
| `store/` `navigation/` `app/` | tất cả (đây là chỗ lắp ghép) | — |

Cùng module dùng đường dẫn relative, khác module dùng alias `@/`.

Hai chỗ dễ tạo **vòng import lúc chạy** (biểu hiện: `Cannot access '...' before initialization` ở một
file ngẫu nhiên) — đã xử lý sẵn, đừng "dọn lại cho gọn":

- Feature `auth` có **hai** cửa vào: `@/features/auth` (UI + selector) và `@/features/auth/services`
  (API domain thuần). Saga/service của feature khác phải dùng cửa thứ hai; barrel UI kéo theo
  `AuthContext` → `store/hooks` → `store/index` → `rootSaga` → quay lại barrel.
- `store/rootReducer.ts` và `store/rootSaga.ts` import **thẳng** file slice/saga, không qua barrel.
- `shared/services/http/client.ts` không import store; store tự đăng ký callback hết phiên qua
  `setSessionExpiredHandler()` trong `store/index.ts`.

Thứ tự provider trong `src/app/providers.tsx` là có ý (GestureHandlerRootView phải là gốc tuyệt đối;
ModalHost/ToastHost phải cuối) — mỗi tầng có comment giải thích, đừng sắp xếp lại.

## Các tầng

- **State đồng bộ/side-effect**: Redux Toolkit + redux-saga. **Thunk đã tắt** — mọi tác dụng phụ đi
  qua saga để chỉ có một chỗ tìm logic bất đồng bộ. `rootSaga` dùng `spawn` + vòng lặp khởi động lại
  (đổi sang `fork` = một exception giết toàn bộ saga của app, im lặng, app vẫn render nhưng không nút
  nào có tác dụng). Slice/saga sống trong `features/X/store/`, chỉ phần lắp ở `src/store/`.
- **State server**: TanStack Query. Query key khai tập trung ở `shared/services/query/keys.ts` (viết
  key rải rác làm `invalidateQueries` trượt im lặng). `queryClient` đã tùy biến cho mobile:
  `refetchOnMount: false`, không retry 4xx, mutation **không** retry. `focusManager`/`onlineManager`
  phải nối tay với `AppState` — `App.tsx` gọi `bindAppStateToQueryFocus()` + `bindNetworkToQuery()`.
- **HTTP**: `shared/services/http` — dùng helper `api.get/post/...`, không gọi axios trong component.
  Interceptor refresh 401 **single-flight** (bỏ cơ chế này thì với refresh token rotate, các request
  còn lại làm hỏng phiên). Lỗi luôn được chuẩn hoá thành `ApiError` (`kind`, `i18nKey`, `isRetryable`).
- **Phân quyền**: CASL trong `shared/permissions`. Backend trả rule CASL thô qua
  `GET /auth/permissions`; client **không** suy quyền từ `role`. `assertCan()` trước khi gọi API,
  `sift()/siftOne()/maskFields()` sau khi API trả. Đây là tầng UX/tầng thứ hai, không phải bảo mật.
- **Lưu trữ**: ba kho MMKV tách biệt (`app` / `session` / `cache`) để logout xoá đúng phần của người
  dùng mà không mất theme/ngôn ngữ. API là MMKV v4 (Nitro): `createMMKV({id})`, `remove()` —
  không phải `new MMKV()` / `delete()`. **Token không bao giờ vào MMKV**: access token nằm trong bộ
  nhớ SDK, refresh token + khoá ký giao dịch nằm ở Keychain/Keystore
  (`features/auth/services/session.ts`).
- **Native module tự viết**: `shared/native/` là wrapper có kiểu cho `MapperAppEnv`,
  `MapperSplashScreen`, `MapperForgeRock`, `MapperBiometric`, `MapperWidget`. Thêm module mới thì
  **phải thêm mock vào `jest.setup.js`**, nếu không mọi test import tới đó chết ngay dòng import.
- **Theme / i18n**: `makeStyles(theme => ({...}))` (vẫn là `StyleSheet.create` thật, memo theo theme)
  — không viết mã màu trực tiếp, thêm token vào `theme/colors.ts` cho **cả** light và dark. Chuỗi
  thêm vào `i18n/locales/vi.ts` trước, `en.ts` bị `TranslationSchema` ép phải đủ key.
- **Modal**: modal của một màn thì `useModal()` ngay trong màn đó; chỉ modal mở được từ **ngoài cây
  React** (saga, deep link, push handler) mới đăng ký vào `app/modals/registry.tsx` + `ModalHost`.

## Bẫy đã biết

- **Interop layer không bật mặc định trên Android RN 0.79.** 5 native module tự viết là legacy bridge
  module; `MapperPackage.kt` giả định bridgeless chạy chúng qua interop, nhưng cờ `useTurboModuleInterop`
  giữ default `false` ở bộ override Stable → `NativeModules.MapperAppEnv` rất có thể là `null` trên
  Android, và `AppEnv.ts` âm thầm rơi về FALLBACK **cấu hình dev** (bản prod gọi API dev). iOS thì bật
  sẵn (`RCTRootViewFactory.mm`) nên bug lệch nền tảng. Chuỗi bằng chứng + cách kiểm chứng + 3 cách sửa:
  `docs/09-KIEN-TRUC-JS-NATIVE.md` mục 12. Chưa kiểm chứng trên device.

- `react-native-worklets/plugin` **phải nằm cuối** `babel.config.js` (Reanimated 4 tách worklet sang
  package này; đặt sai chỗ = worklet im lặng chạy trên JS thread, animation giật mà không có lỗi).
  Alias `@/` phải khai khớp nhau ở **ba** nơi: `babel.config.js`, `tsconfig.json`, `jest.config.js`.
- Có hai config ESLint: `eslint.config.js` (flat, **đang có hiệu lực** — chứa rule react-native/
  react-hooks kèm giải thích) và `.eslintrc.js` (legacy, không được dùng nữa).
- `jest.config.js` liệt kê tay các package cần Babel transform trong `transformIgnorePatterns`; thêm
  lib RN publish ESM mà test báo `Unexpected token 'export'` thì bổ sung vào danh sách đó.
- `tsconfig.base.json` (strict hơn: `noUncheckedIndexedAccess`, `noUnusedLocals`…) hiện **chưa được
  `tsconfig.json` extends** — chỉ có `strict: true` đang chạy.
- Docs 01–05 là phân tích trước khi code; chỗ nào lệch nhau thì **docs 05 thắng**. Đường dẫn trong
  docs còn theo cây cũ (`src/services/auth/...`, `src/config/env.ts`) — cây thật đã chuyển sang
  `src/features/<feature>/services/...` và `src/shared/config/env.ts`.
- `zustand`, `@react-native-firebase/*`, `@notifee/react-native`, `react-hook-form` đã có trong
  `package.json` nhưng chưa được dùng ở `src/` (khối notification theo `docs/03` chưa dựng).
- Thứ tự trong `performLogout()` (`features/auth/services/session.ts`): xoá snapshot widget là bước
  ĐẦU TIÊN và phải `await` — đảo thứ tự = dữ liệu người dùng cũ còn trên màn hình chính của người tiếp
  theo (`docs/05` xếp là hạng mục chặn phát hành).

<!-- skillrunner:begin (managed by `sr bootstrap` — do not edit inside) -->
## skillrunner (`sr`) — use it every session

This project (stack: **rn**) is served by `sr` (aka `skillrunner`), a central
skill dispatcher on your PATH. It detects the stack and prints "marching orders"
(rules + steps) for YOU (Claude) to execute — it never reasons and never rewrites your
source. `emit` only appends to `.skillrunner/ledger.json`; `pull`/`fetch`/`apply-base` write
generated files (types / markdown / base config). Nothing else in the repo is touched.

When a request matches a skill:
1. `sr status` — stack + whether docs/project-profile.md and docs/module-registry.md are cached.
   A cached doc marked `STALE` has fallen behind the source: still use it to orient, but confirm any
   file/symbol still exists before relying on it, and ask the user before rebuilding it.
2. `sr list` — skills with one-line descriptions; map the task to the right one.
3. `sr emit <skill>` — print the marching orders, then READ and FOLLOW the "Rules you MUST follow" section.
4. A skill tagged `[needs approval]` → only propose a plan/goal and STOP for the user; do not edit files first.
5. First task in a project with no docs/project-profile.md → run `learn-project` before implementing.

If a task clearly matches a skill, prefer `sr emit <skill>` over improvising.

Beyond skills, two deterministic 0-token bridges — use them instead of reading raw
sources yourself: `sr pull` (OpenAPI → types + hooks + digest) and `sr fetch`
(Confluence / Google Sheet → clean markdown + digest).
<!-- skillrunner:end -->

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **MapperBase** (1628 symbols, 2879 relationships, 89 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/MapperBase/context` | Codebase overview, check index freshness |
| `gitnexus://repo/MapperBase/clusters` | All functional areas |
| `gitnexus://repo/MapperBase/processes` | All execution flows |
| `gitnexus://repo/MapperBase/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
