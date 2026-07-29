/// <reference types="node" />
import fs from 'fs';
import path from 'path';

/**
 * Canh biên module. Không kiểm tra hành vi — kiểm tra HƯỚNG phụ thuộc.
 *
 * Cây src/ chia theo feature chỉ có giá trị khi luật import được giữ. Một dòng
 * `import` sai hướng không làm test nào khác đỏ, không làm tsc đỏ, và sáu tháng
 * sau thì `shared/` đã dính vào nửa số feature — lúc đó không tách ra được nữa.
 * Rẻ nhất là chặn ngay ở commit đầu tiên.
 *
 * Luật (xem docs/08-BASE-HUONG-DAN.md mục 1):
 *   shared/      chỉ được import shared/
 *   features/X   không được import app/, và chỉ vào features/Y qua cửa vào
 *   store, navigation, app  được import tất cả (chúng là chỗ lắp ghép)
 */

// `/// <reference types="node" />` ở đầu file là cần thiết: tsconfig của RN đặt
// `types: ["react-native", "jest"]` nên fs/path/__dirname không được nạp. Khai
// tại chỗ thay vì thêm "node" vào tsconfig — test này là chỗ DUY NHẤT được dùng
// API Node, còn src/ chạy trên thiết bị thì không có fs.
const SRC = path.join(__dirname, '..', 'src');

/** Cửa vào công khai của feature: '@/features/X' và các subpath được phép. */
const PUBLIC_ENTRIES = ['services'];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry: fs.Dirent) => {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(p);
    }
    return /\.tsx?$/.test(entry.name) ? [p] : [];
  });
}

/** Đọc mọi specifier dạng '@/...' trong file. */
function aliasImports(file: string): string[] {
  const content = fs.readFileSync(file, 'utf8');
  return [...content.matchAll(/(?:from\s+|require\()['"]@\/([^'"]+)['"]/g)].map(m => m[1]);
}

const files = walk(SRC).map(abs => ({
  rel: path.relative(SRC, abs).split(path.sep).join('/'),
  imports: aliasImports(abs),
}));

describe('biên module trong src/', () => {
  it('có file để kiểm tra (bắt lỗi glob hỏng, không phải pass rỗng)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('shared/ không import features/, store/, app/, navigation/', () => {
    const banned = ['features', 'store', 'app', 'navigation'];
    const viol = files
      .filter(f => f.rel.startsWith('shared/'))
      .flatMap(f =>
        f.imports
          .filter(i => banned.includes(i.split('/')[0]))
          .map(i => `${f.rel} → @/${i}`),
      );
    expect(viol).toEqual([]);
  });

  it('features/ không import app/', () => {
    const viol = files
      .filter(f => f.rel.startsWith('features/'))
      .flatMap(f =>
        f.imports.filter(i => i.startsWith('app/')).map(i => `${f.rel} → @/${i}`),
      );
    expect(viol).toEqual([]);
  });

  it('feature chỉ vào feature khác qua cửa vào công khai', () => {
    const viol: string[] = [];
    for (const f of files) {
      if (!f.rel.startsWith('features/')) {
        continue;
      }
      const mine = f.rel.split('/')[1];
      for (const imp of f.imports) {
        const parts = imp.split('/');
        // Trong cùng feature thì nên dùng relative, không chặn ở test này.
        if (parts[0] !== 'features' || parts[1] === mine) {
          continue;
        }
        const subpath = parts.slice(2).join('/');
        if (subpath !== '' && !PUBLIC_ENTRIES.includes(subpath)) {
          viol.push(`${f.rel} → @/${imp}`);
        }
      }
    }
    expect(viol).toEqual([]);
  });

  it('rootReducer/rootSaga không đi qua barrel của feature', () => {
    // Barrel kéo theo screen/context -> vòng store → feature → store/hooks → store.
    const viol: string[] = [];
    for (const rel of ['store/rootReducer.ts', 'store/rootSaga.ts']) {
      const f = files.find(x => x.rel === rel);
      expect(f).toBeDefined();
      for (const imp of f?.imports ?? []) {
        if (/^features\/[^/]+$/.test(imp)) {
          viol.push(`${rel} → @/${imp}`);
        }
      }
    }
    expect(viol).toEqual([]);
  });
});
