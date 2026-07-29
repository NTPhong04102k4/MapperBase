##@ Dọn dẹp
# clean-metro / clean-android / clean-ios nằm ở metro.mk, android.mk, ios.mk.

.PHONY: clean
clean: clean-metro clean-android clean-ios ## Dọn tất cả

.PHONY: nuke
nuke: clean ## clean + xoá node_modules và cài lại từ đầu
	rm -rf node_modules
	$(MAKE) setup
