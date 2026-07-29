# ==============================================================================
#  Mapper — Makefile
#  Wrapper cho các script trong package.json + việc tay hay quên (adb reverse,
#  pods, log, gỡ app...). Mọi target đều chạy từ thư mục gốc repo.
#
#      make            -> danh sách target
#      make android            (= ENV=dev)
#      make android ENV=staging
#      make apk ENV=prod
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# ENV chọn flavor: dev | staging | prod
ENV ?= dev

# Suy ra tên variant/scheme/appId từ ENV. Sai ENV thì fail sớm ở guard-env.
ANDROID_VARIANT_dev     := devDebug
ANDROID_VARIANT_staging := stagingDebug
ANDROID_VARIANT_prod    := prodDebug
APP_ID_dev              := com.mapper.dev
APP_ID_staging          := com.mapper.staging
APP_ID_prod             := com.mapper
IOS_SCHEME_dev          := Mapper Dev
IOS_SCHEME_staging      := Mapper Staging
IOS_SCHEME_prod         := Mapper
IOS_MODE_dev            := Debug Dev
IOS_MODE_staging        := Debug Staging
IOS_MODE_prod           := Debug Prod
GRADLE_FLAVOR_dev       := Dev
GRADLE_FLAVOR_staging   := Staging
GRADLE_FLAVOR_prod      := Prod

ANDROID_VARIANT := $(ANDROID_VARIANT_$(ENV))
APP_ID          := $(APP_ID_$(ENV))
IOS_SCHEME      := $(IOS_SCHEME_$(ENV))
IOS_MODE        := $(IOS_MODE_$(ENV))
GRADLE_FLAVOR   := $(GRADLE_FLAVOR_$(ENV))

YARN   := yarn
GRADLE := ./gradlew

# JDK — AGP 8.x đòi Java 17+ ("requires Java 17 to run"), còn Gradle 8.13 chưa
# hỗ trợ Java 24+. Máy dev hay để JAVA_HOME trỏ JDK 11/25 cho việc khác, nên
# Makefile tự chọn JDK trong dải 17–21 thay vì bắt sửa biến môi trường toàn máy.
#
# KHÔNG dùng `java_home -v 17`: nó trả về JDK mới nhất >= 17 (máy có JDK 25 thì
# ra 25 -> Gradle chết). Phải tự lọc theo major version từ `java_home -V`.
# Không có JDK 17–21 nào thì lấy JBR đi kèm Android Studio (JDK 21).
ANDROID_STUDIO_JBR := /Applications/Android Studio.app/Contents/jbr/Contents/Home
JAVA_HOME := $(shell /usr/libexec/java_home -V 2>&1 \
	| awk '/^[[:space:]]+[0-9]/ { split($$1,v,"."); m=v[1]+0; if (m>=17 && m<=21) { print $$NF; exit } }')
ifeq ($(strip $(JAVA_HOME)),)
JAVA_HOME := $(shell [ -x "$(ANDROID_STUDIO_JBR)/bin/java" ] && echo "$(ANDROID_STUDIO_JBR)")
endif
export JAVA_HOME

.PHONY: guard-java
guard-java:
	@if [ -z "$(JAVA_HOME)" ]; then \
		echo "✖ Không tìm thấy JDK 17–21. Cài Temurin 17 (brew install --cask temurin@17)"; \
		echo "  hoặc cài Android Studio, hoặc chạy: make android JAVA_HOME=/duong/dan/jdk"; exit 1; \
	fi
	@echo "→ JAVA_HOME=$(JAVA_HOME)"

# ------------------------------------------------------------------------------
#  Help
# ------------------------------------------------------------------------------
.PHONY: help
help: ## Danh sách target
	@echo ""
	@echo "  Mapper — make targets   (ENV=dev|staging|prod, mặc định dev)"
	@echo ""
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "  Ví dụ:  make android ENV=staging      make apk ENV=prod"
	@echo ""

.PHONY: guard-env
guard-env:
	@if [ -z "$(ANDROID_VARIANT)" ]; then \
		echo "✖ ENV='$(ENV)' không hợp lệ. Dùng dev | staging | prod."; exit 1; \
	fi

# ------------------------------------------------------------------------------
#  Cài đặt & chẩn đoán
# ------------------------------------------------------------------------------
.PHONY: setup
setup: ## Cài node_modules + pods (chạy 1 lần sau khi clone)
	$(YARN) install
	$(MAKE) pods

.PHONY: pods
pods: ## pod install (ios/)
	cd ios && bundle install && bundle exec pod install

.PHONY: doctor
doctor: ## react-native doctor + JDK/SDK đang dùng
	@echo "JAVA_HOME  = $(JAVA_HOME)"
	@[ -n "$(JAVA_HOME)" ] && "$(JAVA_HOME)/bin/java" -version 2>&1 | head -1 || true
	@echo "ANDROID_HOME = $$ANDROID_HOME"
	npx react-native doctor

.PHONY: devices
devices: ## Liệt kê thiết bị Android + simulator iOS đang bật
	@echo "── Android ──"; adb devices -l || true
	@echo "── iOS ──"; xcrun simctl list devices booted || true

# ------------------------------------------------------------------------------
#  Metro
# ------------------------------------------------------------------------------
.PHONY: start
start: ## Metro bundler
	$(YARN) start

.PHONY: start-reset
start-reset: ## Metro + reset cache (khi đổi babel/alias/asset)
	$(YARN) start --reset-cache

.PHONY: reverse
reverse: ## adb reverse tcp:8081 — cần khi chạy device Android thật
	adb reverse tcp:8081 tcp:8081

# ------------------------------------------------------------------------------
#  Chạy app (debug)
# ------------------------------------------------------------------------------
.PHONY: android
android: guard-env guard-java ## Build + install Android debug theo ENV
	npx react-native run-android --mode=$(ANDROID_VARIANT) --appId $(APP_ID)

.PHONY: ios
ios: guard-env ## Build + install iOS debug theo ENV (simulator)
	npx react-native run-ios --scheme "$(IOS_SCHEME)" --mode "$(IOS_MODE)"

.PHONY: ios-device
ios-device: guard-env ## Như trên nhưng chạy trên device thật đang cắm
	npx react-native run-ios --device --scheme "$(IOS_SCHEME)" --mode "$(IOS_MODE)"

# ------------------------------------------------------------------------------
#  Đóng gói release
# ------------------------------------------------------------------------------
.PHONY: apk
apk: guard-env guard-java ## APK release theo ENV -> android/app/build/outputs/apk
	cd android && $(GRADLE) assemble$(GRADLE_FLAVOR)Release
	@echo "→ android/app/build/outputs/apk/$(ENV)/release/"

.PHONY: aab
aab: guard-env guard-java ## AAB release theo ENV (upload Play Console)
	cd android && $(GRADLE) bundle$(GRADLE_FLAVOR)Release
	@echo "→ android/app/build/outputs/bundle/$(ENV)Release/"

.PHONY: ipa
ipa: guard-env ## Archive iOS release theo ENV (xcodebuild)
	cd ios && xcodebuild -workspace Mapper.xcworkspace \
		-scheme "$(IOS_SCHEME)" \
		-configuration "Release $(GRADLE_FLAVOR)" \
		-archivePath build/Mapper-$(ENV).xcarchive archive

# ------------------------------------------------------------------------------
#  Chất lượng code
# ------------------------------------------------------------------------------
.PHONY: lint
lint: ## ESLint
	$(YARN) lint

.PHONY: lint-fix
lint-fix: ## ESLint --fix
	npx eslint . --fix

.PHONY: tsc
tsc: ## TypeScript type-check
	$(YARN) tsc

.PHONY: test
test: ## Jest
	$(YARN) test

.PHONY: test-watch
test-watch: ## Jest --watch
	npx jest --watch

.PHONY: coverage
coverage: ## Jest + coverage
	npx jest --coverage

.PHONY: verify
verify: lint tsc test ## Cổng kiểm tra trước khi commit/PR

# ------------------------------------------------------------------------------
#  Version / build number  (scripts/bump.js)
# ------------------------------------------------------------------------------
.PHONY: version
version: ## In version + build number hiện tại
	$(YARN) version:print

.PHONY: version-sync
version-sync: ## Đồng bộ version xuống android/ios
	$(YARN) version:sync

.PHONY: bump
bump: guard-env ## +1 build number cho ENV
	node scripts/bump.js build $(ENV)

.PHONY: bump-all
bump-all: ## +1 build number cho cả 3 flavor
	$(YARN) bump:all

.PHONY: release-patch
release-patch: ## x.y.Z+1 cho cả 3 flavor
	$(YARN) release:patch

.PHONY: release-minor
release-minor: ## x.Y+1.0
	$(YARN) release:minor

.PHONY: release-major
release-major: ## X+1.0.0
	$(YARN) release:major

# ------------------------------------------------------------------------------
#  Log & tiện ích thiết bị
# ------------------------------------------------------------------------------
.PHONY: log-android
log-android: ## logcat lọc theo RN/Mapper
	adb logcat -v color ReactNative:V ReactNativeJS:V Mapper:V '*:S'

.PHONY: log-ios
log-ios: ## Log simulator iOS
	xcrun simctl spawn booted log stream --level debug --predicate 'processImagePath CONTAINS "Mapper"'

.PHONY: uninstall
uninstall: guard-env ## Gỡ app khỏi device Android (ENV)
	adb uninstall $(APP_ID) || true

# ------------------------------------------------------------------------------
#  Dọn dẹp
# ------------------------------------------------------------------------------
.PHONY: clean
clean: clean-metro clean-android clean-ios ## Dọn tất cả

.PHONY: clean-metro
clean-metro: ## Xoá cache Metro/Haste/watchman
	watchman watch-del-all 2>/dev/null || true
	rm -rf $${TMPDIR:-/tmp}/metro-* $${TMPDIR:-/tmp}/haste-map-*
	rm -rf node_modules/.cache

.PHONY: clean-android
clean-android: guard-java ## gradlew clean + xoá build/
	cd android && $(GRADLE) clean
	rm -rf android/app/build android/build

.PHONY: clean-ios
clean-ios: ## Xoá Pods + build iOS rồi pod install lại
	cd ios && rm -rf build Pods Podfile.lock && bundle exec pod install

.PHONY: nuke
nuke: clean ## clean + xoá node_modules và cài lại từ đầu
	rm -rf node_modules
	$(MAKE) setup
