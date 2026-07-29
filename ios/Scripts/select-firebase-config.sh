#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
#  Chọn GoogleService-Info.plist theo flavor đang build.
#
#  Thêm vào Xcode: target Mapper → Build Phases → "+" → New Run Script Phase,
#  đặt tên "Select Firebase config", kéo lên TRƯỚC phase "Copy Bundle Resources"
#  (nếu chạy sau, file copy vào .app sẽ là bản cũ), rồi dán:
#
#      "${SRCROOT}/Scripts/select-firebase-config.sh"
#
#  Bỏ tick "Based on dependency analysis" để nó chạy mỗi lần build.
#
#  FIREBASE_CONFIG_DIR đến từ ios/Config/<Flavor>.xcconfig (dev|staging|prod).
# ─────────────────────────────────────────────────────────────────────────────
set -e

if [ -z "${FIREBASE_CONFIG_DIR}" ]; then
  echo "error: FIREBASE_CONFIG_DIR chưa được set. Configuration hiện tại chưa gán xcconfig của flavor nào."
  exit 1
fi

SRC="${SRCROOT}/Firebase/${FIREBASE_CONFIG_DIR}/GoogleService-Info.plist"
DEST="${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/GoogleService-Info.plist"

if [ ! -f "${SRC}" ]; then
  echo "warning: Không tìm thấy ${SRC} — bỏ qua Firebase cho flavor '${FIREBASE_CONFIG_DIR}'."
  echo "warning: Push/Analytics sẽ không hoạt động cho tới khi thêm file này."
  exit 0
fi

echo "Firebase config: ${FIREBASE_CONFIG_DIR}"
cp -v "${SRC}" "${DEST}"
