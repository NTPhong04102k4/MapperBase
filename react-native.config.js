// react-native.config.js
//
// Cấu hình cho @react-native-community/cli. Ở repo này nó phục vụ đúng MỘT việc:
// khai chỗ chứa font để copy sang native. Ảnh không cần khai ở đây.
//
// Vì sao ảnh và font đi hai đường khác nhau:
//
//   - ẢNH đi qua Metro. `require('@/assets/images/logo.png')` bị thay bằng một
//     module sinh tại chỗ gọi `registerAsset({...})` (metro/src/Bundler/util.js)
//     và trả về một SỐ NGUYÊN — bundle JS chỉ chứa metadata + số đó, không chứa
//     bytes ảnh. File thật được copy lúc build release sang
//     `res/drawable-<dpi>/` (Android, tên bị mangle theo đường dẫn) hoặc vào
//     trong `.app` (iOS). Không phải khai gì thêm.
//
//   - FONT thì KHÔNG BAO GIỜ được import trong JS. Ta chỉ viết
//     `fontFamily: 'Inter-Bold'` — một chuỗi. Android phân giải chuỗi đó bằng
//     AssetManager tại đường dẫn `fonts/` (ReactFontManager.kt: FONTS_ASSET_PATH),
//     iOS đọc danh sách `UIAppFonts` trong Info.plist. Metro không dính vào đường
//     này, nên phải có một bước copy riêng — đó là lý do file này tồn tại.
//
// CLI 18 đã bỏ lệnh `react-native link`, nên công cụ đọc key `assets` dưới đây là
// package riêng `react-native-asset` (đã khai ở devDependencies).
// Chạy `yarn assets:link` MỖI KHI thêm / xoá / đổi tên file font, rồi rebuild
// native (Metro reload không đủ — đây là resource native, không phải JS).
//
// Nó ghi ra hai chỗ, đều là artifact sinh ra, ĐỪNG sửa tay:
//     android/app/src/main/assets/fonts/<Ten-Font>.ttf
//     ios/  -> Copy Bundle Resources + khoá UIAppFonts trong Info.plist
//
// BẪY: `createAssetTypeface()` tra `fonts/<fontFamily><variant>.ttf`; không tìm
// thấy thì nó KHÔNG báo lỗi mà lặng lẽ `Typeface.create(fontFamilyName, style)`
// — tức rơi về font hệ thống. Sai tên font = chữ vẫn hiện, chỉ là sai mặt chữ.
// Thêm nữa Android tra theo TÊN FILE còn iOS tra theo POSTSCRIPT NAME của font;
// đặt hai thứ đó trùng nhau để không lệch nền tảng.
module.exports = {
  assets: ['./src/assets/fonts'],
};
