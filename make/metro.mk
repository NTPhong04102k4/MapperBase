##@ Metro

.PHONY: start
start: ## Metro bundler
	$(YARN) start

.PHONY: start-reset
start-reset: ## Metro + reset cache (khi đổi babel/alias/asset)
	$(YARN) start --reset-cache

.PHONY: reverse
reverse: ## adb reverse tcp:8081 — cần khi chạy device Android thật
	adb reverse tcp:8081 tcp:8081

.PHONY: clean-metro
clean-metro: ## Xoá cache Metro/Haste/watchman
	watchman watch-del-all 2>/dev/null || true
	rm -rf $${TMPDIR:-/tmp}/metro-* $${TMPDIR:-/tmp}/haste-map-*
	rm -rf node_modules/.cache
