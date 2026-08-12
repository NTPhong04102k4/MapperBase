import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactNativePlugin from 'eslint-plugin-react-native';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Global của môi trường Node, dùng cho file cấu hình và script build.
 * Khai tay thay vì kéo thêm gói `globals` — chỉ cần đúng chừng này.
 */
const nodeGlobals = {
  module: 'writable',
  require: 'readonly',
  process: 'readonly',
  console: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  exports: 'writable',
};

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Không lint output build, thư mục native và node_modules.
    // `.gitnexus/` là file do tool sinh (CommonJS): flat config KHÔNG tự đọc .gitignore,
    // nên phải liệt kê ở đây, nếu không `yarn lint` đỏ vì code không phải của app.
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      'coverage/**',
      '**/*.jsbundle',
      '.gitnexus/**',
    ],
  },
  {
    // File cấu hình + script chạy bằng Node, không phải code app.
    files: ['*.config.js', 'jest.setup.js', '.eslintrc.js', '.prettierrc.js', 'scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {...nodeGlobals, jest: 'readonly'},
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-native': reactNativePlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      // Không khai thì eslint-plugin-react cảnh báo mỗi lần chạy.
      react: {version: 'detect'},
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {jsx: true},
      },
      globals: {
        __DEV__: 'readonly',
        console: 'readonly',
        requestAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    // ---- NƠI THIẾT LẬP RULES ----
    rules: {
      // 1. React Native Rules
      /**
       * Cảnh báo khi viết style trực tiếp (inline) trong component.
       * Lý do: Ép viết style bằng StyleSheet.create để tối ưu hiệu năng render của Native tầng dưới.
       */
      // Cảnh báo inline style (bật 'error' nếu muốn nghiêm khắc)
      'react-native/no-inline-styles': 'warn',
      /**
       * Báo lỗi nếu khai báo một class style trong StyleSheet nhưng không dùng ở phần giao diện.
       * Lý do: Giúp dọn dẹp code rác, giữ cho file code luôn sạch sẽ.
       */
      'react-native/no-unused-styles': 'error', // Lỗi nếu thừa style không dùng

      /**
       * Báo lỗi nếu viết chữ (string) khơi khơi mà không bọc trong thẻ <Text>.
       * Lý do: Tránh làm ứng dụng bị crash (sập) lập tức trên thiết bị Android và iOS.
       */
      'react-native/no-raw-text': 'error', // Lỗi nếu viết chữ không bọc trong thẻ <Text>
      /**
       * Cảnh báo nếu truyền một mảng style nhưng thực chất chỉ chứa đúng 1 phần tử.
       * Ví dụ sai: style={[styles.box]}. Đúng: style={styles.box}.
       * Lý do: Tránh việc cấp phát mảng thừa thãi, làm tăng chi phí tính toán khi render.
       */
      'react-native/no-single-element-style-arrays': 'warn', //  Tránh mảng style thừa

      /**
       * Báo lỗi nếu dùng sai component đặc thù của nền tảng này sang nền tảng khác.
       * Ví dụ: Dụng cụ chỉnh ngày dạng iOS (DatePickerIOS) trên thiết bị Android.
       */
      'react-native/split-platform-components': 'error', //  Tránh dùng sai component nền tảng
      // 2. React Hooks Rules
      /**
       * Báo lỗi nặng nếu vi phạm các quy tắc cơ bản của React Hooks.
       * Ví dụ: Gọi useState/useEffect bên trong vòng lặp 'for' hoặc câu lệnh rẽ nhánh 'if'.
       */
      'react-hooks/rules-of-hooks': 'error', // Sai luật Hook = Lỗi đỏ

      /**
       * Cảnh báo khi danh sách phụ thuộc (dependency array) của useEffect/useCallback bị thiếu biến.
       * Lý do: Tránh lỗi app sử dụng dữ liệu cũ (stale data) hoặc gây ra vòng lặp vô hạn.
       */
      'react-hooks/exhaustive-deps': 'warn', // Cảnh báo thiếu dependency

      // 3. Clean Code & Tối ưu hóa

      // ==========================================
      // 3. TỐI ƯU HÓA REACT COMPONENT (UI/UX)
      // ==========================================

      /**
       * Tắt quy tắc bắt buộc phải 'import React from "react"' ở đầu mọi file chứa JSX.
       * Lý do: Từ phiên bản React mới, trình biên dịch đã tự xử lý, việc import thủ công là dư thừa.
       */
      'react/react-in-jsx-scope': 'off',

      /**
       * Nghiêm cấm việc khai báo một Component mới ngay BÊN TRONG hàm render của một Component khác.
       * Lý do: Đây là nguyên nhân hàng đầu gây lỗi mất focus bàn phím và ép app re-render liên tục gây giật lag.
       */
      'react/no-unstable-nested-components': 'error',

      /**
       * Báo lỗi nếu truyền hai thuộc tính (props) trùng tên nhau vào cùng một thẻ component.
       * Ví dụ sai: <View style={s1} style={s2} />.
       */
      'react/jsx-no-duplicate-props': 'error',

      /**
       * Bắt buộc các thẻ component không có nội dung con (children) bên trong phải tự đóng thẻ bằng dấu '/>'.
       * Ví dụ đúng: <Image />. Sai: <Image></Image>.
       */
      'react/self-closing-comp': 'error',

      // ==========================================
      // 4. CHẤT LƯỢNG CODE & LOGIC HỆ THỐNG
      // ==========================================

      /**
       * Ngăn chặn việc lạm dụng console.log bừa bãi trong dự án.
       * Lý do: Khi đóng gói ứng dụng chạy thực tế, quá nhiều lệnh log chạy ngầm sẽ làm thắt nút cổ chai hiệu năng.
       * Chỉ cho phép dùng console.warn và console.error để báo cáo sự cố quan trọng.
       */
      'no-console': ['warn', {allow: ['warn', 'error']}],

      /**
       * Báo lỗi nếu khai báo biến, nhận tham số hoặc import thư viện về nhưng bỏ không, không dùng đến.
       * Lý do: Giữ cho bộ nhớ RAM nhẹ hơn và code không bị rối mắt.
       */
      '@typescript-eslint/no-unused-vars': 'error',

      /**
       * Bắt buộc phải sử dụng phép so sánh tuyệt đối '===' và '!==' thay vì phép so sánh tương đối '==' và '!='.
       * Lý do: Tránh lỗi logic nghiêm trọng do JavaScript tự động ép kiểu sai (Ví dụ: [] == false là true).
       */
      eqeqeq: ['error', 'always'],

      /**
       * Nghiêm cấm việc viết nhiều dòng import từ cùng một thư viện độc lập.
       * Lý do: Gom gọn code gọn gàng trên một dòng duy nhất.
       */
      'no-duplicate-imports': 'error',

      /**
       * Bắt buộc tất cả các khối lệnh rẽ nhánh hoặc vòng lặp (if, else, for, while) đều phải được bọc trong cặp dấu ngoặc nhọn '{}'.
       * Lý do: Tránh lỗi hiểu lầm logic khi viết code thẳng hàng nhưng thực chất không nằm trong điều kiện.
       */
      curly: 'error',

      /**
       * Nghiêm cấm việc gán lại trực tiếp giá trị mới cho tham số đầu vào của một hàm.
       * Lý do: Giữ vững tính chất bất biến (immutability) của dữ liệu, tránh gây lỗi không thể kiểm soát ở các file khác.
       */
      'no-param-reassign': 'error',

      /**
       * Cảnh báo khi lạm dụng viết toán tử ba ngôi lồng nhau nhiều tầng (Ví dụ: a ? b : c ? d : e).
       * Lý do: Giảm tải độ phức tạp về mặt thị giác, ép lập trình viên nên chuyển sang cấu trúc if/else rõ ràng hơn.
       */
      'no-nested-ternary': 'warn',
    },
  },
];
