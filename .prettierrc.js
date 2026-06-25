module.exports = {
  /**
   * Bắt buộc thêm dấu ngoặc đơn quanh tham số của arrow function khi thực sự cần thiết.
   * 'avoid': Ẩn dấu ngoặc nếu chỉ có 1 tham số. Ví dụ: x => x
   * 'always': Luôn luôn có dấu ngoặc. Ví dụ: (x) => x
   */
  arrowParens: 'avoid',

  /**
   * Đặt dấu đóng ngoặc nhọn của thẻ JSX (>) trên cùng một dòng với thuộc tính cuối cùng.
   * true: <View
   * style={...}>
   * false: <View
   * style={...}
   * >
   */
  bracketSameLine: true,

  /**
   * Quy định việc thêm khoảng trắng giữa các dấu ngoặc nhọn khi khai báo object.
   * true: { foo: bar }
   * false: {foo: bar}
   */
  bracketSpacing: false,

  /**
   * Bắt buộc sử dụng dấu nháy đơn cho tất cả các chuỗi chuỗi (String).
   * true: 'hello'
   * false: "hello"
   */
  singleQuote: true,

  /**
   * Sử dụng dấu nháy đơn thay vì nháy kép trong code JSX.
   * true: <Component status='active' />
   */
  jsxSingleQuote: true,

  /**
   * Thêm dấu phẩy ở cuối cùng (trailing commas) ở những nơi hợp lệ khi biên dịch.
   * 'all': Thêm dấu phẩy ở mọi nơi có thể (object, mảng, tham số hàm, gọi hàm).
   */
  trailingComma: 'all',

  /**
   * Khoảng cách thụt dòng (Indent) khi nhấn Tab.
   * Chuẩn của các dự án JavaScript/TypeScript là 2 khoảng trắng.
   */
  tabWidth: 2,

  /**
   * Sử dụng khoảng trắng (Spaces) thay vì phím Tab thuần túy để thụt dòng.
   * Giúp code hiển thị đồng nhất trên mọi máy tính và mọi hệ điều hành.
   */
  useTabs: false,

  /**
   * Bắt buộc thêm dấu chấm phẩy (;) ở cuối mỗi câu lệnh.
   * true: const a = 1;
   */
  semi: true,

  /**
   * Giới hạn độ dài tối đa của một dòng code (số lượng ký tự).
   * Nếu vượt quá con số này, Prettier sẽ tự động xuống dòng sao cho đẹp mắt.
   */
  printWidth: 100,

  /**
   * Tự động xử lý ký tự xuống dòng (End of Line) tùy theo hệ điều hành.
   * 'auto': Giúp loại bỏ hoàn toàn lỗi xung đột dấu xuống dòng giữa máy Windows (CRLF) và Mac (LF).
   */
  endOfLine: 'auto',
};
