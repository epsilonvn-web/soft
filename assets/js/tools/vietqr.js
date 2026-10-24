/**
 * Epsilon Soft – Tạo QR chuyển khoản VietQR (chuẩn EMVCo / NAPAS 247).
 * Self-contained: QR encoder, CRC and UI are all in this file, no network needed.
 * Exports pure helpers for tests: buildVietQR, crc16, encodeQR, normalizeContent, BANKS.
 */
const shared = globalThis.EpsilonSoftShared || {};
const ic = (name, size) => { try { return shared.icon ? shared.icon(name, size) : ''; } catch { return ''; } };

/* ------------------------------------------------------------ QR encoder ---
 * Byte-mode QR Code (ISO/IEC 18004), versions 1–40, ECC L/M/Q/H, automatic mask. */
const ECL = { L: { ord: 0, bits: 1 }, M: { ord: 1, bits: 0 }, Q: { ord: 2, bits: 3 }, H: { ord: 3, bits: 2 } };
const ECC_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const NUM_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];
function rawModules(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) { const n = Math.floor(ver / 7) + 2; r -= (25 * n - 10) * n - 55; if (ver >= 7) r -= 36; }
  return r;
}
const dataCodewords = (ver, e) => Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[e.ord][ver] * NUM_BLOCKS[e.ord][ver];
function gfMul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 0xff; }
function rsDivisor(degree) {
  const r = new Array(degree).fill(0); r[degree - 1] = 1; let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) { r[j] = gfMul(r[j], root); if (j + 1 < degree) r[j] ^= r[j + 1]; }
    root = gfMul(root, 0x02);
  }
  return r;
}
function rsRemainder(data, div) {
  const r = new Array(div.length).fill(0);
  for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gfMul(c, f); }); }
  return r;
}
function alignPositions(ver) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2, size = ver * 4 + 17;
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const out = [6];
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
}

/** Encode text (UTF-8 bytes) to a QR matrix: returns { size, modules: boolean[][] } (modules[y][x], true = dark). */
export function encodeQR(text, eclName = 'M', minVer = 1, maxVer = 40) {
  const e = ECL[eclName] || ECL.M;
  const bytes = [...new TextEncoder().encode(String(text))];
  let ver = minVer, cap;
  for (; ver <= maxVer; ver++) {
    const ccBits = ver < 10 ? 8 : 16;
    cap = dataCodewords(ver, e) * 8;
    if (4 + ccBits + bytes.length * 8 <= cap && bytes.length < (1 << ccBits)) break;
  }
  if (ver > maxVer) throw new Error('Nội dung quá dài để tạo mã QR.');
  // Bit stream
  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - bits.length % 8) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  // Error correction + interleave
  const nBlocks = NUM_BLOCKS[e.ord][ver], eccLen = ECC_PER_BLOCK[e.ord][ver];
  const rawCw = Math.floor(rawModules(ver) / 8), nShort = nBlocks - rawCw % nBlocks, shortLen = Math.floor(rawCw / nBlocks);
  const div = rsDivisor(eccLen), dBlocks = [], eBlocks = [];
  for (let i = 0, k = 0; i < nBlocks; i++) {
    const len = shortLen - eccLen + (i < nShort ? 0 : 1);
    const d = data.slice(k, k + len); k += len;
    dBlocks.push(d); eBlocks.push(rsRemainder(d, div));
  }
  const final = [];
  for (let i = 0; i < shortLen - eccLen + 1; i++) dBlocks.forEach(b => { if (i < b.length) final.push(b[i]); });
  for (let i = 0; i < eccLen; i++) eBlocks.forEach(b => final.push(b[i]));
  // Matrix with function patterns
  const size = ver * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const al = alignPositions(ver);
  al.forEach((ax, i) => al.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const drawFormat = mask => {
    const d = (e.bits << 3) | mask; let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412, bit = i => ((b >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (ver << 12) | r;
    for (let i = 0; i < 18; i++) { const bit = ((b >>> i) & 1) !== 0, a = size - 11 + i % 3, c = Math.floor(i / 3); set(a, c, bit); set(c, a, bit); }
  }
  // Data placement (zigzag)
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
      if (!fn[y][x] && i < final.length * 8) { mod[y][x] = ((final[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; }
    }
  }
  const maskFn = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0,
  ];
  const applyMask = m => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && maskFn[m](x, y)) mod[y][x] = !mod[y][x]; };
  let best = 0, bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(m); drawFormat(m);
    const s = penalty(mod, size);
    if (s < bestScore) { bestScore = s; best = m; }
    applyMask(m);
  }
  applyMask(best); drawFormat(best);
  return { size, version: ver, modules: mod };
}
function penalty(m, n) {
  let score = 0, dark = 0;
  const line = get => {
    let run = 1, s = 0;
    const seq = [];
    for (let i = 0; i < n; i++) {
      const v = get(i); seq.push(v ? 1 : 0);
      if (i > 0 && v === get(i - 1)) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1;
    }
    const str = seq.join('');
    for (const p of ['10111010000', '00001011101']) { let at = str.indexOf(p); while (at >= 0) { s += 40; at = str.indexOf(p, at + 1); } }
    return s;
  };
  for (let y = 0; y < n; y++) { score += line(x => m[y][x]); score += line(x => m[x][y]); }
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
    const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) dark++;
  const total = n * n;
  score += Math.ceil(Math.abs(dark * 20 - total * 10) / total - 1) * 10;
  return score;
}

/* ------------------------------------------------------------- VietQR ---- */
export function crc16(str) {
  let crc = 0xffff;
  for (const b of new TextEncoder().encode(str)) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
const tlv = (id, value) => id + String(value.length).padStart(2, '0') + value;

/** Remove Vietnamese diacritics and unsupported characters; banks reject accented transfer notes. */
export function normalizeContent(s, max = 25) {
  const plain = String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return { text: plain.slice(0, max).trim(), trimmed: plain.length > max };
}

/** Build the EMVCo payload. amount: integer VND as string/number or ''. */
export function buildVietQR({ bin, account, amount = '', content = '', toCard = false }) {
  if (!/^\d{6}$/.test(String(bin))) throw new Error('Mã BIN ngân hàng phải gồm 6 chữ số.');
  const acc = String(account || '').replace(/\s+/g, '');
  if (!acc) throw new Error('Nhập số tài khoản người nhận.');
  if (!/^[0-9A-Za-z]{1,19}$/.test(acc)) throw new Error('Số tài khoản chỉ gồm chữ và số, tối đa 19 ký tự.');
  if (toCard && !/^\d{16,19}$/.test(acc)) throw new Error('Số thẻ phải gồm 16–19 chữ số.');
  const amt = String(amount ?? '').replace(/[.\s,]/g, '');
  if (amt && (!/^\d{1,13}$/.test(amt) || /^0+$/.test(amt))) throw new Error('Số tiền phải là số nguyên dương, tối đa 13 chữ số.');
  const note = normalizeContent(content).text;
  const beneficiary = tlv('00', String(bin)) + tlv('01', acc);
  const merchant = tlv('00', 'A000000727') + tlv('01', beneficiary) + tlv('02', toCard ? 'QRIBFTTC' : 'QRIBFTTA');
  let p = tlv('00', '01') + tlv('01', amt ? '12' : '11') + tlv('38', merchant) + tlv('53', '704');
  if (amt) p += tlv('54', amt.replace(/^0+/, ''));
  p += tlv('58', 'VN');
  if (note) p += tlv('62', tlv('08', note));
  p += '6304';
  return p + crc16(p);
}

/* Danh sách mã BIN NAPAS. Nguồn: danh sách thành viên NAPAS 247 công bố. Nên kiểm tra lại định kỳ. */
export const BANKS = [
  ['VCB', 'Vietcombank', 'Ngoại thương Việt Nam', '970436', 1], ['CTG', 'VietinBank', 'Công thương Việt Nam', '970415', 1],
  ['BIDV', 'BIDV', 'Đầu tư và Phát triển Việt Nam', '970418', 1], ['VBA', 'Agribank', 'Nông nghiệp và Phát triển Nông thôn', '970405', 1],
  ['TCB', 'Techcombank', 'Kỹ thương Việt Nam', '970407', 1], ['MB', 'MB Bank', 'Quân đội', '970422', 1],
  ['ACB', 'ACB', 'Á Châu', '970416', 1], ['VPB', 'VPBank', 'Việt Nam Thịnh Vượng', '970432', 1],
  ['TPB', 'TPBank', 'Tiên Phong', '970423', 1], ['STB', 'Sacombank', 'Sài Gòn Thương Tín', '970403', 1],
  ['HDB', 'HDBank', 'Phát triển TP.HCM', '970437', 1], ['VIB', 'VIB', 'Quốc tế Việt Nam', '970441', 1],
  ['SHB', 'SHB', 'Sài Gòn – Hà Nội', '970443', 1],
  ['ABB', 'ABBANK', 'An Bình', '970425'], ['BAB', 'Bac A Bank', 'Bắc Á', '970409'], ['BVB', 'BaoViet Bank', 'Bảo Việt', '970438'],
  ['BVBANK', 'BVBank', 'Bản Việt (Viet Capital)', '970454'], ['CAKE', 'Cake by VPBank', 'Ngân hàng số Cake', '546034'],
  ['CIMB', 'CIMB', 'CIMB Việt Nam', '422589'], ['COOP', 'Co-opBank', 'Hợp tác xã Việt Nam', '970446'],
  ['EIB', 'Eximbank', 'Xuất Nhập khẩu Việt Nam', '970431'], ['GPB', 'GPBank', 'Dầu khí Toàn cầu', '970408'],
  ['HLB', 'Hong Leong', 'Hong Leong Việt Nam', '970442'], ['HSBC', 'HSBC', 'HSBC Việt Nam', '458761'],
  ['IVB', 'Indovina', 'Indovina', '970434'], ['KBANK', 'KBank', 'Kasikornbank', '668888'],
  ['KLB', 'KienlongBank', 'Kiên Long', '970452'], ['LPB', 'LPBank', 'Lộc Phát Việt Nam (LienVietPostBank)', '970449'],
  ['MSB', 'MSB', 'Hàng Hải Việt Nam', '970426'], ['NAB', 'Nam A Bank', 'Nam Á', '970428'], ['NCB', 'NCB', 'Quốc Dân', '970419'],
  ['OCB', 'OCB', 'Phương Đông', '970448'], ['MBV', 'MBV (OceanBank)', 'Việt Nam Hiện Đại (Đại Dương)', '970414'],
  ['PGB', 'PGBank', 'Thịnh vượng và Phát triển', '970430'], ['PBVN', 'Public Bank', 'Public Bank Việt Nam', '970439'],
  ['PVCB', 'PVcomBank', 'Đại chúng Việt Nam', '970412'], ['SGB', 'Saigonbank', 'Sài Gòn Công Thương', '970400'],
  ['SCB', 'SCB', 'Sài Gòn', '970429'], ['SEAB', 'SeABank', 'Đông Nam Á', '970440'], ['SHBVN', 'Shinhan Bank', 'Shinhan Việt Nam', '970424'],
  ['SCVN', 'Standard Chartered', 'Standard Chartered Việt Nam', '970410'], ['UOB', 'UOB', 'United Overseas Bank Việt Nam', '970458'],
  ['UBANK', 'Ubank by VPBank', 'Ngân hàng số Ubank', '546035'], ['VAB', 'VietABank', 'Việt Á', '970427'],
  ['VBB', 'VietBank', 'Việt Nam Thương Tín', '970433'], ['VIKKI', 'Vikki (DongA Bank)', 'Ngân hàng số Vikki (Đông Á)', '970406'],
  ['VRB', 'VRB', 'Liên doanh Việt – Nga', '970421'], ['WVN', 'Woori Bank', 'Woori Việt Nam', '970457'],
].map(([code, short, name, bin, popular]) => ({ code, short, name, bin, popular: !!popular }));

/* ------------------------------------------------------------------ UI ---- */
// Layout uses the Epsilon Soft app classes (tool-box, form-grid, form-field, button-*, qr-output).
// The app already shows the tool title, so this module starts with its content.
const STYLE_ID = 'es-vietqr-style';
const CSS = `
.es-vqr .es-vqr-amount{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums}
.es-vqr .es-vqr-words{font-size:16px;font-weight:600;color:#566d99;min-height:1.4em}
.es-vqr .es-vqr-check{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;color:#122766}
.es-vqr .es-vqr-check input{width:20px;height:20px;accent-color:var(--purple,#5a20db)}
.es-vqr .es-vqr-saved{display:flex;flex-wrap:wrap;gap:8px}
.es-vqr .es-vqr-saved:empty{display:none}
.es-vqr .es-vqr-chip{display:inline-flex;align-items:stretch;border-radius:12px;overflow:hidden;background:#f0edff}
.es-vqr .es-vqr-chip .button{border-radius:0}
.es-vqr .es-vqr-chip .es-vqr-del{padding-inline:10px;color:#566d99}
.es-vqr .qr-output canvas{width:100%;max-width:400px;height:auto;border-radius:12px}
.es-vqr .es-vqr-payload{font:16px/1.45 ui-monospace,Consolas,monospace;word-break:break-all;color:#566d99;margin:12px 0 0}

/* Epsilon Soft compact laptop scale: dimensions only; logic and QR output resolution unchanged. */
.es-vqr{gap:12px}
.es-vqr .tool-box{padding:13px}
.es-vqr .tool-box-heading{margin-bottom:9px}
.es-vqr .stack{gap:9px}
.es-vqr .form-grid{gap:9px}
.es-vqr .form-field select,.es-vqr .form-field>input{min-height:42px;padding:8px 10px}
.es-vqr .es-vqr-amount{font-size:20px}
.es-vqr .es-vqr-words{min-height:0}
.es-vqr .qr-output{padding:10px;min-height:0}
.es-vqr .qr-output canvas{width:100%;max-width:318px;height:auto}
.es-vqr .form-actions{margin-top:7px;gap:7px}
.es-vqr .form-actions .button{min-height:42px;padding:8px 12px}
@media(max-width:750px){.es-vqr .qr-output canvas{max-width:330px}}
`;
const LS_KEY = 'epsilonsoft.vietqr.accounts';
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]').filter(a => a && a.bin && a.account).slice(0, 12); } catch { return []; } };
const storeSaved = list => { try { localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 12))); return true; } catch { return false; } };
const fmtVND = digits => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const upperPlain = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase().replace(/[^A-Z0-9 .&-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function drawCard(canvas, { qr, bank, account, holder, amount, content }) {
  const W = 760, pad = 44, qrBox = W - pad * 2, quiet = 4;
  const lines = [];
  lines.push({ t: bank ? `${bank.short} · ${bank.name}` : '', f: '600 26px', c: '#5d6388' });
  lines.push({ t: account, f: '700 38px', c: '#1c2366', mono: true });
  if (holder) lines.push({ t: holder, f: '700 28px', c: '#1c2366' });
  if (amount) lines.push({ t: fmtVND(amount) + ' VND', f: '800 40px', c: '#6b3fe0' });
  if (content) lines.push({ t: 'Nội dung: ' + content, f: '500 26px', c: '#3c4270' });
  const textH = lines.reduce((h, l) => h + parseInt(l.f.split(' ')[1]) * 1.45, 0);
  const H = pad + 44 + 20 + qrBox + 24 + textH + pad;
  canvas.width = W; canvas.height = Math.round(H);
  const g = canvas.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#1c2366'; g.font = '700 32px system-ui, "Segoe UI", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top';
  g.fillText('Quét mã để chuyển khoản', W / 2, pad);
  const n = qr.size + quiet * 2, cell = Math.floor(qrBox / n), drawn = cell * n, ox = Math.round((W - drawn) / 2), oy = pad + 44 + 20;
  g.fillStyle = '#000';
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.modules[y][x]) g.fillRect(ox + (x + quiet) * cell, oy + (y + quiet) * cell, cell, cell);
  let y = oy + drawn + 24;
  for (const l of lines) {
    if (!l.t) continue;
    const px = parseInt(l.f.split(' ')[1]);
    g.font = `${l.f} ${l.mono ? 'ui-monospace, Consolas, monospace' : 'system-ui, "Segoe UI", Arial, sans-serif'}`;
    g.fillStyle = l.c;
    let t = l.t; while (g.measureText(t).width > W - pad * 2 && t.length > 4) t = t.slice(0, -2) + '…';
    g.fillText(t, W / 2, y); y += px * 1.45;
  }
}

export async function mount(root, ctx = {}) {
  if (!document.getElementById(STYLE_ID)) { const st = document.createElement('style'); st.id = STYLE_ID; st.textContent = CSS; document.head.append(st); }
  const signal = ctx.signal;
  const toast = (m, t = 'success') => ctx.showToast ? ctx.showToast(m, t) : console.log(m);
  const download = (blob, name) => {
    if (shared.downloadBlob) return shared.downloadBlob(blob, name);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const popular = BANKS.filter(b => b.popular), others = BANKS.filter(b => !b.popular).sort((a, b) => a.short.localeCompare(b.short, 'vi'));
  const opt = b => `<option value="${b.bin}|${b.code}">${esc(b.short)} – ${esc(b.name)}</option>`;
  root.innerHTML = `<div class="tool-grid-2 es-vqr">
   <section class="tool-box">
    <h2 class="tool-box-heading">${ic('pen')} Thông tin người nhận</h2>
    <div class="stack">
     <div class="es-vqr-saved" id="vq-saved" aria-label="Tài khoản đã lưu"></div>
     <label class="form-field"><span>Ngân hàng nhận</span><select id="vq-bank"><optgroup label="Phổ biến">${popular.map(opt).join('')}</optgroup><optgroup label="Ngân hàng khác">${others.map(opt).join('')}</optgroup><option value="custom">Khác – tự nhập mã BIN</option></select></label>
     <label class="form-field" id="vq-bin-wrap" hidden><span>Mã BIN ngân hàng (6 số)</span><input id="vq-bin" inputmode="numeric" maxlength="6" placeholder="970xxx"></label>
     <div class="form-grid">
      <label class="form-field"><span>Số tài khoản</span><input id="vq-account" inputmode="numeric" maxlength="24" autocomplete="off" placeholder="0123456789"></label>
      <label class="form-field"><span>Tên chủ tài khoản (in trên ảnh)</span><input id="vq-holder" maxlength="60" autocomplete="off" placeholder="NGUYEN VAN A"></label>
     </div>
     <label class="es-vqr-check"><input type="checkbox" id="vq-card"> Chuyển tới số thẻ ATM thay vì số tài khoản</label>
     <label class="form-field"><span>Số tiền (để trống nếu người chuyển tự nhập)</span><input class="es-vqr-amount" id="vq-amount" inputmode="numeric" maxlength="20" autocomplete="off" placeholder="0"><span class="es-vqr-words" id="vq-words"></span></label>
     <label class="form-field"><span>Nội dung chuyển khoản (tối đa 25 ký tự, tự bỏ dấu)</span><input id="vq-content" maxlength="60" autocomplete="off" placeholder="Thanh toan HD 0123"></label>
     <div class="callout warning" id="vq-warn" hidden></div>
     <div class="form-actions" style="margin-top:0"><button class="button button-outline" type="button" id="vq-save">${ic('star', 18)} Lưu tài khoản này</button></div>
    </div>
   </section>
   <section class="tool-box">
    <h2 class="tool-box-heading">${ic('qr')} Mã QR chuyển khoản</h2>
    <div class="qr-output"><canvas id="vq-canvas" width="760" height="1000" aria-label="Ảnh mã QR chuyển khoản"></canvas></div>
    <p class="tool-error" id="vq-error" hidden></p>
    <div class="form-actions">
     <button class="button button-purple" type="button" id="vq-download">${ic('download', 18)} Tải ảnh PNG</button>
     <button class="button button-outline" type="button" id="vq-copyimg">${ic('image', 18)} Sao chép ảnh</button>
     <button class="button button-outline" type="button" id="vq-copytext">${ic('copy', 18)} Sao chép chuỗi QR</button>
    </div>
    <p class="tool-hint">Mã theo chuẩn VietQR (EMVCo/NAPAS 247). Trước khi gửi khách, hãy quét thử bằng app ngân hàng và kiểm tra tên người nhận hiện ra đúng. Tài khoản đã lưu chỉ nằm trên trình duyệt này.</p>
    <p class="es-vqr-payload" id="vq-payload"></p>
   </section>
  </div>`;
  const $ = s => root.querySelector(s);
  let current = null, saved = loadSaved(), readWords = null;
  // Optional: show "bằng chữ" when the sibling money-words module is available.
  import('./money-words.js').then(m => { readWords = d => { try { return m.amountToWords(d).vi; } catch { return ''; } }; if (!signal?.aborted) update(); }).catch(() => {});

  const bankOf = () => {
    const v = $('#vq-bank').value;
    if (v === 'custom') { const bin = $('#vq-bin').value.trim(); return { bin, short: 'Mã BIN ' + bin, name: 'Ngân hàng khác', code: 'BIN' + bin }; }
    const [bin, code] = v.split('|'); return BANKS.find(b => b.code === code && b.bin === bin);
  };
  function renderSaved() {
    $('#vq-saved').innerHTML = saved.map((a, i) => `<span class="es-vqr-chip"><button class="button button-soft button-sm" type="button" data-use="${i}" title="Dùng tài khoản này">${esc(a.short)} · ${esc(a.account)}${a.holder ? ' · ' + esc(a.holder) : ''}</button><button class="button button-soft button-sm es-vqr-del" type="button" data-del="${i}" aria-label="Xóa tài khoản đã lưu">${ic('close', 16)}</button></span>`).join('');
  }
  function update() {
    $('#vq-bin-wrap').hidden = $('#vq-bank').value !== 'custom';
    const amountDigits = $('#vq-amount').value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 13);
    const formatted = amountDigits ? fmtVND(amountDigits) : '';
    if ($('#vq-amount').value !== formatted) $('#vq-amount').value = formatted;
    $('#vq-words').textContent = amountDigits && readWords ? readWords(amountDigits) : '';
    const contentInfo = normalizeContent($('#vq-content').value);
    const warn = [];
    if (contentInfo.trimmed) warn.push(`Nội dung được rút gọn thành "${contentInfo.text}" (tối đa 25 ký tự).`);
    else if (contentInfo.text && contentInfo.text !== $('#vq-content').value.trim()) warn.push(`Nội dung sẽ gửi là "${contentInfo.text}" (ngân hàng không nhận dấu tiếng Việt và ký tự đặc biệt).`);
    $('#vq-warn').hidden = !warn.length; $('#vq-warn').textContent = warn.join(' ');
    const bank = bankOf();
    try {
      const account = $('#vq-account').value.replace(/\s+/g, '');
      const payload = buildVietQR({ bin: bank?.bin, account, amount: amountDigits, content: contentInfo.text, toCard: $('#vq-card').checked });
      const qr = encodeQR(payload, 'M');
      drawCard($('#vq-canvas'), { qr, bank, account, holder: upperPlain($('#vq-holder').value), amount: amountDigits, content: contentInfo.text });
      current = { payload, account, bank };
      $('#vq-error').hidden = true; $('#vq-payload').textContent = payload;
    } catch (e) {
      current = null;
      const c = $('#vq-canvas'), g = c.getContext('2d'); c.width = 760; c.height = 900;
      g.fillStyle = '#f7f8ff'; g.fillRect(0, 0, 760, 900); g.fillStyle = '#566d99'; g.font = '600 30px system-ui, "Segoe UI", Arial, sans-serif'; g.textAlign = 'center';
      g.fillText('Nhập số tài khoản để tạo mã QR', 380, 450);
      const show = $('#vq-account').value.trim() !== '' || $('#vq-bank').value === 'custom';
      $('#vq-error').hidden = !show; $('#vq-error').textContent = e.message; $('#vq-payload').textContent = '';
    }
    ['#vq-download', '#vq-copyimg', '#vq-copytext'].forEach(s => { $(s).disabled = !current; });
  }
  const canvasBlob = () => new Promise((res, rej) => $('#vq-canvas').toBlob(b => b ? res(b) : rej(new Error('Không tạo được ảnh.')), 'image/png'));
  root.addEventListener('input', update, { signal });
  root.addEventListener('change', update, { signal });
  root.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'vq-download' && current) download(await canvasBlob(), `vietqr-${current.bank?.code || 'bank'}-${current.account}.png`);
    if (b.id === 'vq-copytext' && current) { try { await navigator.clipboard.writeText(current.payload); toast('Đã sao chép chuỗi QR.'); } catch { toast('Trình duyệt không cho sao chép.', 'error'); } }
    if (b.id === 'vq-copyimg' && current) {
      try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': canvasBlob() })]); toast('Đã sao chép ảnh, có thể dán vào Zalo hoặc email.'); }
      catch { toast('Trình duyệt chưa hỗ trợ sao chép ảnh. Hãy dùng "Tải ảnh PNG".', 'error'); }
    }
    if (b.id === 'vq-save') {
      const bank = bankOf(), account = $('#vq-account').value.replace(/\s+/g, '');
      if (!current || !bank) { toast('Nhập đúng ngân hàng và số tài khoản trước khi lưu.', 'error'); return; }
      saved = [{ bank: $('#vq-bank').value, bin: bank.bin, short: bank.short, account, holder: upperPlain($('#vq-holder').value), card: $('#vq-card').checked },
        ...saved.filter(a => !(a.bin === bank.bin && a.account === account))].slice(0, 12);
      const ok = storeSaved(saved);
      toast(ok ? 'Đã lưu tài khoản trên trình duyệt này.' : 'Trình duyệt không cho lưu dữ liệu.', ok ? 'success' : 'error');
      renderSaved();
    }
    if (b.dataset.use !== undefined) {
      const a = saved[+b.dataset.use]; if (!a) return;
      const isCustom = !BANKS.some(x => `${x.bin}|${x.code}` === a.bank);
      $('#vq-bank').value = isCustom ? 'custom' : a.bank; if (isCustom) $('#vq-bin').value = a.bin;
      $('#vq-account').value = a.account; $('#vq-holder').value = a.holder || ''; $('#vq-card').checked = !!a.card; update(); $('#vq-amount').focus();
    }
    if (b.dataset.del !== undefined) { saved.splice(+b.dataset.del, 1); storeSaved(saved); renderSaved(); }
  }, { signal });
  renderSaved();
  if (saved[0]) root.querySelector('[data-use="0"]')?.click(); else update();
  return () => { root.innerHTML = ''; };
}
