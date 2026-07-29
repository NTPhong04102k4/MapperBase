# Firebase config — flavor `prod`

Đặt `google-services.json` của Firebase project `mapper-prod` vào thư mục này.

Package name trong Firebase console: **`com.mapper`** (không suffix).

⚠️ Với prod, **bắt buộc** khai cả SHA-1 của *Play App Signing key* (Play Console →
Setup → App integrity), không chỉ upload key. Thiếu là Google Sign-In fail trên
bản tải từ store dù bản cài tay vẫn chạy.

Chi tiết: xem `android/app/src/dev/README.md`.
