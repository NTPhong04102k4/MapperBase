# ==============================================================================
#  Mapper — Makefile
#  Wrapper cho các script trong package.json + việc tay hay quên (adb reverse,
#  pods, log, gỡ app...). Mọi target đều chạy từ thư mục gốc repo.
#
#      make            -> danh sách target
#      make android            (= ENV=dev)
#      make android ENV=staging
#      make apk ENV=prod
#
#  File này chỉ giữ khai báo chung + help. Target thật nằm trong make/*.mk,
#  chia theo domain — thêm nhóm mới thì tạo file .mk rồi khai báo ở include dưới.
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

MAKE_DIR := make

# Thứ tự include có nghĩa: config.mk phải đầu tiên (biến + guard), và thứ tự này
# cũng là thứ tự các nhóm hiện ra trong `make help`.
include $(MAKE_DIR)/config.mk
include $(MAKE_DIR)/setup.mk
include $(MAKE_DIR)/metro.mk
include $(MAKE_DIR)/android.mk
include $(MAKE_DIR)/ios.mk
include $(MAKE_DIR)/quality.mk
include $(MAKE_DIR)/version.mk
include $(MAKE_DIR)/clean.mk

# ------------------------------------------------------------------------------
#  Help — đọc chú thích `## ...` sau tên target và tiêu đề nhóm `##@ ...`
#  trong toàn bộ MAKEFILE_LIST (gồm cả các file make/*.mk vừa include).
# ------------------------------------------------------------------------------
.PHONY: help
help: ## Danh sách target
	@echo ""
	@echo "  Mapper — make targets   (ENV=dev|staging|prod, mặc định dev)"
	@awk 'BEGIN {FS = ":.*## "} \
		/^##@/ { printf "\n  \033[1m%s\033[0m\n", substr($$0, 5); next } \
		/^[a-zA-Z_-]+:.*## / { printf "    \033[36m%-16s\033[0m %s\n", $$1, $$2 }' \
		$(MAKEFILE_LIST)
	@echo ""
	@echo "  Ví dụ:  make android ENV=staging      make apk ENV=prod"
	@echo ""
