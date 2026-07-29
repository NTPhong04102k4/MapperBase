##@ iOS
# Cần đã tạo đủ 6 build configuration + 3 scheme theo docs/07-IOS-FLAVOR-XCODE.md.

.PHONY: ios
ios: guard-env ## Build + install iOS debug theo ENV (simulator)
	npx react-native run-ios --scheme "$(IOS_SCHEME)" --mode "$(IOS_MODE)"

.PHONY: ios-device
ios-device: guard-env ## Như trên nhưng chạy trên device thật đang cắm
	npx react-native run-ios --device --scheme "$(IOS_SCHEME)" --mode "$(IOS_MODE)"

.PHONY: ipa
ipa: guard-env ## Archive iOS release theo ENV (xcodebuild)
	cd ios && xcodebuild -workspace Mapper.xcworkspace \
		-scheme "$(IOS_SCHEME)" \
		-configuration "Release $(GRADLE_FLAVOR)" \
		-archivePath build/Mapper-$(ENV).xcarchive archive

.PHONY: log-ios
log-ios: ## Log simulator iOS
	xcrun simctl spawn booted log stream --level debug --predicate 'processImagePath CONTAINS "Mapper"'

.PHONY: clean-ios
clean-ios: ## Xoá Pods + build iOS rồi pod install lại
	cd ios && rm -rf build Pods Podfile.lock && bundle exec pod install
