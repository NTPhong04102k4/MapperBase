#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  NGUỒN SỰ THẬT DUY NHẤT cho version = package.json
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   {
 *     "version": "1.2.3",                                  // marketing version, chung 3 flavor
 *     "buildNumbers": { "dev": 46, "staging": 12, "prod": 5 }   // TÁCH theo flavor
 *   }
 *
 *  Vì sao tách: mỗi flavor là một app record riêng trên Play Console /
 *  App Store Connect (chốt ở docs/05 mục 2) ⇒ không gian build number độc lập.
 *  Bắn dev 30 bản/tuần không làm "cháy" số của prod.
 *
 *  Muốn quay về DÙNG CHUNG một counter: xem docs/06-FLAVOR-BUILD-NUMBER.md
 *  — ở đó có nguyên đoạn code thay thế cho cả file này lẫn build.gradle.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  CÁCH DÙNG
 * ─────────────────────────────────────────────────────────────────────────────
 *   node scripts/bump.js build dev       # dev 46 -> 47, giữ nguyên 1.2.3
 *   node scripts/bump.js build all       # +1 cho cả 3 flavor
 *   node scripts/bump.js patch prod      # 1.2.3 -> 1.2.4, prod +1
 *   node scripts/bump.js minor all       # 1.2.3 -> 1.3.0, cả 3 flavor +1
 *   node scripts/bump.js print           # in bảng version hiện tại
 *   node scripts/bump.js sync            # chỉ ghi lại file sinh ra, không đổi số
 *
 *  Android: build.gradle đọc thẳng package.json  -> không bao giờ sửa Gradle.
 *  iOS:     ghi ios/Config/Version.xcconfig      -> không bao giờ sửa Xcode.
 */
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const XCCONFIG_PATH = path.join(ROOT, 'ios', 'Config', 'Version.xcconfig');
const BUILD_INFO_PATH = path.join(ROOT, 'src', 'shared', 'config', 'buildInfo.json');

const FLAVORS = ['dev', 'staging', 'prod'];
const MODES = ['build', 'patch', 'minor', 'major', 'print', 'sync'];

const readPkg = () => JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', {cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore']})
      .toString()
      .trim();
  } catch {
    return 'nogit';
  }
}

function bumpSemver(version, mode) {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(n => parseInt(n, 10) || 0);
  if (mode === 'major') {return `${major + 1}.0.0`;}
  if (mode === 'minor') {return `${major}.${minor + 1}.0`;}
  if (mode === 'patch') {return `${major}.${minor}.${patch + 1}`;}
  return version;
}

function normalizeBuildNumbers(pkg) {
  const out = {};
  for (const f of FLAVORS) {
    out[f] = parseInt(pkg.buildNumbers?.[f], 10) || 1;
  }
  return out;
}

function writeFileEnsured(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, content);
}

/**
 * Version.xcconfig chứa 1 biến build number cho MỖI flavor.
 * Dev/Staging/Prod.xcconfig trỏ CURRENT_PROJECT_VERSION vào biến của mình,
 * nên Xcode luôn lấy đúng số mà không cần điều kiện gì.
 */
function writeXcconfig(version, buildNumbers) {
  writeFileEnsured(
    XCCONFIG_PATH,
    [
      '// TỰ ĐỘNG SINH RA bởi scripts/bump.js — ĐỪNG sửa tay.',
      '// Nguồn sự thật là package.json (version + buildNumbers).',
      '',
      `MARKETING_VERSION = ${version}`,
      '',
      `BUILD_NUMBER_DEV = ${buildNumbers.dev}`,
      `BUILD_NUMBER_STAGING = ${buildNumbers.staging}`,
      `BUILD_NUMBER_PROD = ${buildNumbers.prod}`,
      '',
    ].join('\n'),
  );
}

/** Cho màn About: env / version / build / git sha — QA báo bug là biết ngay bản nào. */
function writeBuildInfo(version, buildNumbers) {
  writeFileEnsured(
    BUILD_INFO_PATH,
    JSON.stringify({version, buildNumbers, gitSha: gitSha()}, null, 2) + '\n',
  );
}

function printTable(version, buildNumbers) {
  console.log(`\n  version  ${version}        sha ${gitSha()}`);
  for (const f of FLAVORS) {
    console.log(`  ${f.padEnd(8)} build ${buildNumbers[f]}   ->  ${version} (${buildNumbers[f]})`);
  }
  console.log('');
}

function main() {
  const mode = process.argv[2] || 'print';
  const target = process.argv[3] || 'all';

  if (!MODES.includes(mode)) {
    console.error(`Mode không hợp lệ: "${mode}". Dùng: ${MODES.join(' | ')}`);
    process.exit(1);
  }
  if (!['all', ...FLAVORS].includes(target)) {
    console.error(`Flavor không hợp lệ: "${target}". Dùng: all | ${FLAVORS.join(' | ')}`);
    process.exit(1);
  }

  const pkg = readPkg();
  let version = pkg.version || '0.0.1';
  const buildNumbers = normalizeBuildNumbers(pkg);

  if (mode === 'print') {
    printTable(version, buildNumbers);
    return;
  }

  if (mode !== 'sync') {
    version = bumpSemver(version, mode);
    const targets = target === 'all' ? FLAVORS : [target];
    for (const f of targets) {buildNumbers[f] += 1;}

    pkg.version = version;
    pkg.buildNumbers = buildNumbers;
    fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
  }

  writeXcconfig(version, buildNumbers);
  writeBuildInfo(version, buildNumbers);

  printTable(version, buildNumbers);
  console.log('  ios/Config/Version.xcconfig  đã ghi');
  console.log('  src/shared/config/buildInfo.json  đã ghi');
  console.log('  android                      không cần sửa (Gradle đọc package.json)\n');
}

main();
