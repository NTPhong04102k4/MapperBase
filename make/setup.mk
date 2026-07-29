##@ Cài đặt & chẩn đoán

.PHONY: setup
setup: ## Cài node_modules + pods (chạy 1 lần sau khi clone)
	$(YARN) install
	$(MAKE) pods

.PHONY: pods
pods: ## pod install (ios/)
	cd ios && bundle install && bundle exec pod install

.PHONY: doctor
doctor: ## react-native doctor + JDK/SDK đang dùng
	@echo "JAVA_HOME    = $(JAVA_HOME)"
	@[ -n "$(JAVA_HOME)" ] && "$(JAVA_HOME)/bin/java" -version 2>&1 | head -1 || true
	@echo "ANDROID_HOME = $$ANDROID_HOME"
	npx react-native doctor

.PHONY: devices
devices: ## Liệt kê thiết bị Android + simulator iOS đang bật
	@echo "── Android ──"; adb devices -l || true
	@echo "── iOS ──"; xcrun simctl list devices booted || true
