# ==============================================================================
#  config.mk — biến dùng chung + guard. Include đầu tiên, không chứa target thật.
# ==============================================================================

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

.PHONY: guard-env
guard-env:
	@if [ -z "$(ANDROID_VARIANT)" ]; then \
		echo "✖ ENV='$(ENV)' không hợp lệ. Dùng dev | staging | prod."; exit 1; \
	fi

.PHONY: guard-java
guard-java:
	@if [ -z "$(JAVA_HOME)" ]; then \
		echo "✖ Không tìm thấy JDK 17–21. Cài Temurin 17 (brew install --cask temurin@17)"; \
		echo "  hoặc cài Android Studio, hoặc chạy: make android JAVA_HOME=/duong/dan/jdk"; exit 1; \
	fi
	@echo "→ JAVA_HOME=$(JAVA_HOME)"
