// Khai báo module cho asset ảnh.
//
// RN 0.79 KHÔNG ship sẵn `declare module '*.png'` (không có trong
// react-native/types lẫn @react-native/typescript-config), nên nếu thiếu file này
// thì `import logo from '@/assets/images/logo.png'` sẽ đỏ TS2307 dù Metro chạy
// bình thường — đúng kiểu "tsc đỏ mà app vẫn chạy".
//
// Kiểu là `number` vì module do Metro sinh ra là
// `module.exports = registerAsset({...})`, và registerAsset trả về index trong
// mảng asset (@react-native/assets-registry/registry.js). `ImageSourcePropType`
// chấp nhận number nên `<Image source={logo} />` type-check được.
declare module '*.png' {
  const value: number;
  export default value;
}

declare module '*.jpg' {
  const value: number;
  export default value;
}

declare module '*.jpeg' {
  const value: number;
  export default value;
}

declare module '*.gif' {
  const value: number;
  export default value;
}

declare module '*.webp' {
  const value: number;
  export default value;
}

// CỐ Ý không khai '*.svg'. RN không render SVG qua <Image> trên Android; muốn dùng
// SVG thì cài react-native-svg + react-native-svg-transformer, lúc đó module trả về
// một COMPONENT chứ không phải number, và khai báo ở đây phải đổi theo.
