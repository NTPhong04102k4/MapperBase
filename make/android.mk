##@ Android

.PHONY: android
android: guard-env guard-java ## Build + install Android debug theo ENV
	npx react-native run-android --mode=$(ANDROID_VARIANT) --appId $(APP_ID)

.PHONY: apk
apk: guard-env guard-java ## APK release theo ENV -> android/app/build/outputs/apk
	cd android && $(GRADLE) assemble$(GRADLE_FLAVOR)Release
	@echo "→ android/app/build/outputs/apk/$(ENV)/release/"

.PHONY: aab
aab: guard-env guard-java ## AAB release theo ENV (upload Play Console)
	cd android && $(GRADLE) bundle$(GRADLE_FLAVOR)Release
	@echo "→ android/app/build/outputs/bundle/$(ENV)Release/"

.PHONY: log-android
log-android: ## logcat lọc theo RN/Mapper
	adb logcat -v color ReactNative:V ReactNativeJS:V Mapper:V '*:S'

.PHONY: uninstall
uninstall: guard-env ## Gỡ app khỏi device Android (ENV)
	adb uninstall $(APP_ID) || true

.PHONY: clean-android
clean-android: guard-java ## gradlew clean + xoá build/
	cd android && $(GRADLE) clean
	rm -rf android/app/build android/build
