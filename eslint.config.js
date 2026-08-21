import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactNativePlugin from 'eslint-plugin-react-native';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

/**
 * NGUYÊN TẮC CỦA FILE NÀY
 *
 * ESLint lo LOGIC. Prettier lo ĐỊNH DẠNG. Không chồng lấn.
 *
 * Trước đây file này bật `indent`, `object-curly-newline` và
 * `object-property-newline` — ba rule định dạng — trong khi `.prettierrc.js` quy
 * định ngược lại. Hệ quả đo được: 101/101 file trong `src/` trượt
 * `prettier --check` mà `eslint .` vẫn xanh; và vì .vscode đặt ESLint làm
 * formatter, `--fix` bẻ dòng xong không thụt lề lại, sinh ra code kiểu
 * `const styles=StyleSheet.create({\n  container:\n    {\nflex: 1,`.
 *
 * `prettierConfig` ở CUỐI mảng tắt mọi rule đụng định dạng. Đừng thêm rule định
 * dạng vào đây nữa — muốn đổi code trông ra sao thì sửa `.prettierrc.js`.
 */

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
    // `.gitnexus/` là file do tool sinh (CommonJS): flat config KHÔNG tự đọc
    // .gitignore, nên phải liệt kê ở đây, nếu không `yarn lint` đỏ vì code không
    // phải của app.
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
    //
    // Liệt kê ĐÍCH DANH thay vì `*.config.js`: pattern đó cũng khớp chính
    // eslint.config.js — file này là ES module, gán `sourceType: 'commonjs'` cho
    // nó là khai sai.
    files: [
      'babel.config.js',
      'metro.config.js',
      'jest.config.js',
      'react-native.config.js',
      'jest.setup.js',
      '.prettierrc.js',
      'scripts/**/*.js',
    ],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...nodeGlobals,
        jest: 'readonly',
      },
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
      parserOptions: {ecmaFeatures: {jsx: true}},
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
    rules: {
      // ======================================================
      // 1. REACT NATIVE
      // ======================================================

      /** Ép style qua StyleSheet.create thay vì object inline mỗi lần render. */
      'react-native/no-inline-styles': 'warn',

      /**
       * Style khai mà không dùng.
       *
       * ĐỂ 'warn' CÓ CHỦ Ý: rule chỉ nhìn thấy `StyleSheet.create({...})` viết
       * trực tiếp. Với `makeStyles(theme => ({...}))` — pattern chính của repo —
       * nó mù hoàn toàn (đã kiểm: style thừa trong makeStyles không bị bắt, cùng
       * file thì style thừa trong StyleSheet.create lại bị bắt). Để 'error' chỉ
       * tạo cảm giác an toàn giả.
       */
      'react-native/no-unused-styles': 'warn',

      /**
       * Chuỗi không bọc trong <Text> làm app crash trên thiết bị.
       *
       * LƯU Ý: rule báo nhầm với mọi component chữ tự viết — `<AppText>Xin
       * chào</AppText>` bị coi là raw text (đã kiểm). Khi dựng design-system có
       * component chữ riêng, thêm tên nó vào `skip` chứ đừng tắt rule.
       */
      'react-native/no-raw-text': ['error', {skip: []}],

      /** style={[styles.box]} -> style={styles.box}. Bớt một lần cấp phát mảng. */
      'react-native/no-single-element-style-arrays': 'warn',

      /** Dùng component đặc thù nền tảng này trên nền tảng kia. */
      'react-native/split-platform-components': 'error',

      // ======================================================
      // 2. REACT HOOKS — hai rule giá trị nhất trong file này
      // ======================================================

      /** Gọi hook trong if/for = state lệch giữa các lần render. Không thương lượng. */
      'react-hooks/rules-of-hooks': 'error',

      /** Thiếu dependency = đọc dữ liệu cũ, hoặc effect chạy vô hạn. */
      'react-hooks/exhaustive-deps': 'warn',

      // ======================================================
      // 3. REACT
      // ======================================================

      /** React 17+ tự inject JSX runtime, không cần import React. */
      'react/react-in-jsx-scope': 'off',

      /**
       * Khai component bên trong render của component khác: mỗi lần cha render là
       * một type mới -> React unmount/mount lại cả cây con, mất focus bàn phím,
       * mất state. Nguyên nhân bug UI hàng đầu.
       */
      'react/no-unstable-nested-components': 'error',

      'react/jsx-no-duplicate-props': 'error',
      'react/self-closing-comp': 'error',

      // ======================================================
      // 4. LOGIC & CHẤT LƯỢNG
      // ======================================================

      /** console.log vào bản release là rác + rò rỉ thông tin. warn/error thì được. */
      'no-console': ['warn', {allow: ['warn', 'error']}],

      '@typescript-eslint/no-unused-vars': 'error',
      eqeqeq: ['error', 'always'],
      curly: 'error',
      'no-param-reassign': 'error',

      /**
       * Ternary lồng nhau khó đọc.
       *
       * ĐỂ 'warn': đừng để rule này ép tách thành if/else dài dòng và xấu hơn bản
       * gốc. Nếu bản ternary rõ hơn thì `// eslint-disable-next-line` kèm lý do.
       */
      'no-nested-ternary': 'warn',

      /**
       * Chặn các dạng import sai quy ước.
       *
       * `@` ĐÃ trỏ vào `src`, nên `@/src/...` phân giải thành `src/src/...` —
       * không tồn tại, nhưng lỗi hiện ra ở chỗ khác nên khó lần. Chặn thẳng.
       */
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/src', '@/src/*'],
              message:
                "Alias '@' đã trỏ vào src/. Viết '@/shared/...' chứ không phải '@/src/shared/...'.",
            },
            {
              group: ['src/*'],
              message:
                "Import khác module thì dùng alias '@/...', không dùng đường dẫn trần 'src/...'.",
            },
          ],
        },
      ],

      // KHÔNG bật 'no-duplicate-imports': nó báo lỗi với idiom TypeScript
      // `import type {Theme} from './x'` + `import {value} from './x'` (đã kiểm).
      // Muốn gộp thì dùng inline type import: `import {value, type Theme}`.
    },
  },
  {
    /**
     * RULE CẦN THÔNG TIN KIỂU.
     *
     * Chậm hơn (~7s cho cả src/) nên chỉ bật cho file thật sự nằm trong
     * tsconfig.json — file cấu hình .js không nằm trong đó, bật cho chúng sẽ lỗi
     * "file not found in project".
     *
     * Đây là phần bắt lỗi thật mà lint cú pháp không thấy được: lần đầu bật đã ra
     * 5 promise bị thả nổi (SplashScreen.hide(), Settings.initializeSDK(), i18n
     * init...) và 1 handler async truyền vào prop mong đợi void.
     */
    files: ['src/**/*.{ts,tsx}', 'App.tsx', '__tests__/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {projectService: true},
    },
    rules: {
      /** Promise không await/catch: lỗi biến mất im lặng thành unhandled rejection. */
      '@typescript-eslint/no-floating-promises': 'error',

      /** Hàm async truyền vào chỗ mong đợi void (onPress, useEffect): lỗi không ai bắt. */
      '@typescript-eslint/no-misused-promises': 'error',

      /** `await` trên giá trị không phải Promise = hiểu sai API đang gọi. */
      '@typescript-eslint/await-thenable': 'error',
    },
  },
  {
    /**
     * CỬA VÀO CỦA FEATURE AUTH.
     *
     * CLAUDE.md: barrel UI `@/features/auth` kéo theo AuthContext -> store/hooks
     * -> store/index -> rootSaga -> quay lại barrel, tạo vòng import lúc chạy
     * ("Cannot access '...' before initialization" ở một file ngẫu nhiên). Tầng
     * saga/service/store phải đi cửa thứ hai: `@/features/auth/services`.
     */
    files: [
      'src/features/*/services/**/*.{ts,tsx}',
      'src/features/*/store/**/*.{ts,tsx}',
      'src/store/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/features/auth',
              message:
                'Tầng saga/service/store phải import từ @/features/auth/services — barrel UI tạo vòng import lúc chạy (xem CLAUDE.md).',
            },
          ],
        },
      ],
    },
  },

  /**
   * PHẢI Ở CUỐI CÙNG. Tắt mọi rule ESLint đụng tới định dạng để Prettier là nguồn
   * sự thật duy nhất. Thêm config mới thì thêm PHÍA TRÊN dòng này.
   */
  prettierConfig,
];
