##@ Version / build number  (scripts/bump.js)

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
