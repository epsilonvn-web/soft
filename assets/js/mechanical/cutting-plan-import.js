/**
 * Epsilon Soft – CUTTING PLAN · NHẬP LIỆU (Excel / DXF) – BẢN TEST NỘI BỘ
 * Tên file: cutting-plan-import.js (trước là nhap_lieu.js). Đặt CÙNG THƯ MỤC với cutting-plan-plate.js và cutting-plan-section.js.
 * Hai chương trình chỉ nạp file này khi người dùng bấm nút nhập (import động):
 * nếu thiếu file, phần nhập tay và lõi tính vẫn chạy bình thường.
 *
 * Không chứa thuật toán xếp phôi. Không dùng thư viện ngoài, không gửi dữ liệu đi đâu:
 *  - Excel: giải nén .xlsx bằng DecompressionStream của trình duyệt, đọc XML trực tiếp.
 *  - DXF : đọc file ASCII, nhận diện đường bao chi tiết.
 *
 * Quy ước (theo handoff Cutting Plan):
 *  - Kích thước trong Excel và DXF là THÀNH PHẨM; kích thước cắt = thành phẩm + dư gia công.
 *  - Ô dư gia công để trống = dùng mặc định của chương trình (hoặc của sheet 3_Thong_so_cat).
 *  - Thiếu dữ liệu bắt buộc thì BÁO LỖI theo số dòng Excel, không tự đoán.
 *  - Nhóm trình cắt: tôn tấm theo Mác + Dày + Phương pháp; thép hình theo Quy cách + Mác.
 * Bản quyền © Epsilon Soft.
 */

export const IMPORT_VERSION = '1.0 (28/10/2026)';
const LIM = Object.freeze({
  xlsxBytes: 20e6, xlsxUnzipped: 120e6, zipEntries: 3000, rows: 5000, cols: 60,
  dxfBytes: 60e6, dxfEntities: 600000, insertDepth: 8, contours: 200000, types: 200,
});
class ImportError extends Error {}
const fail = m => { throw new ImportError(m); };

/* ========================================================================= */
/* 1. CHUẨN HÓA CHỮ: bỏ dấu, bỏ ký hiệu – để khớp tiêu đề cột và giá trị       */
/* ========================================================================= */
/** "Ø ngoài TP (mm)" → "phingoaitp". Bỏ phần trong ngoặc, bỏ dấu tiếng Việt. */
export const norm = s => String(s ?? '').replace(/\([^)]*\)/g, ' ').replace(/[ØøΦφ⌀]/g, 'phi')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');
const cellText = v => (v == null ? '' : String(v).trim());
/** Số từ ô Excel: nhận số thật, hoặc chữ "1.234,5" / "490" / "12 000". Trống → null. Sai → NaN. */
export function cellNum(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  let s = String(v).trim().replace(/\s+/g, '');
  if (!s) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');   // 1.234,5
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');                  // 1,234.5
  else s = s.replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}
const fmt = n => String(Math.round(n * 1e4) / 1e4);

/* ========================================================================= */
/* 2. GIẢI NÉN ZIP (file .xlsx là một file zip)                                */
/* ========================================================================= */
async function inflateRaw(data) {
  if (typeof DecompressionStream !== 'function') fail('Trình duyệt quá cũ, không giải nén được file Excel. Hãy dùng Chrome / Edge / Firefox bản mới.');
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function unzip(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (u8.length < 22 || dv.getUint32(0, true) !== 0x04034b50) fail('Không phải file Excel .xlsx (file .xls cũ hãy mở bằng Excel và lưu lại dạng .xlsx).');
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 22 - 65535); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) fail('File Excel bị hỏng (không đọc được mục lục zip).');
  const count = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  if (count > LIM.zipEntries) fail('File Excel có quá nhiều thành phần.');
  const dec = new TextDecoder('utf-8'), files = new Map(); let total = 0;
  for (let k = 0; k < count; k++) {
    if (p + 46 > u8.length || dv.getUint32(p, true) !== 0x02014b50) fail('File Excel bị hỏng (mục lục zip sai).');
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true);
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (dv.getUint32(off, true) !== 0x04034b50) fail('File Excel bị hỏng (thành phần zip sai).');
    const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
    total += usize; if (total > LIM.xlsxUnzipped) fail('File Excel quá lớn sau giải nén.');
    files.set(name, { method, data: u8.subarray(start, start + csize) });
  }
  const read = async name => {
    const f = files.get(name) ?? files.get(name.replace(/^\//, ''));
    if (!f) return null;
    const raw = f.method === 0 ? f.data : f.method === 8 ? await inflateRaw(f.data) : fail('File Excel dùng kiểu nén chưa hỗ trợ.');
    return dec.decode(raw);
  };
  return { read, names: [...files.keys()] };
}

/* ========================================================================= */
/* 3. ĐỌC EXCEL .xlsx → { sheets: [{ name, rows: [[giá trị ô…]] }] }          */
/* ========================================================================= */
const xmlDecode = s => String(s).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
  const k = e.toLowerCase();
  if (k[0] === '#') { const c = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10); return Number.isFinite(c) && c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ''; }
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[k];
});
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s(?:\\w+:)?${name}\\s*=\\s*"([^"]*)"`)); return m ? xmlDecode(m[1]) : null; };
const textRuns = xml => { let s = ''; for (const m of xml.replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, '').matchAll(/<(?:\w+:)?t\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?t>)/g)) s += xmlDecode(m[1] ?? ''); return s; };
const colIndex = ref => { const m = /^([A-Z]+)/.exec(ref || ''); if (!m) return -1; let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
const resolvePath = (base, target) => {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const seg of target.split('/')) { if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg); }
  return parts.join('/');
};
export async function readXlsx(bytes) {
  if (bytes.byteLength > LIM.xlsxBytes) fail(`File Excel lớn hơn ${LIM.xlsxBytes / 1e6} MB.`);
  const zip = await unzip(bytes);
  const rootRels = await zip.read('_rels/.rels') || '';
  let wbPath = 'xl/workbook.xml';
  for (const m of rootRels.matchAll(/<(?:\w+:)?Relationship\b[^>]*>/g)) if (/officeDocument"?$/.test(attr(m[0], 'Type') || '') || /\/officeDocument$/.test(attr(m[0], 'Type') || '')) wbPath = resolvePath('', attr(m[0], 'Target'));
  const wb = await zip.read(wbPath); if (!wb) fail('File Excel không có workbook.');
  const relPath = wbPath.replace(/[^/]+$/, m => '_rels/' + m + '.rels'), rels = new Map();
  for (const m of (await zip.read(relPath) || '').matchAll(/<(?:\w+:)?Relationship\b[^>]*>/g)) rels.set(attr(m[0], 'Id'), { target: attr(m[0], 'Target'), type: attr(m[0], 'Type') || '' });
  let shared = [];
  const ssRel = [...rels.values()].find(r => /sharedStrings$/.test(r.type));
  const ssXml = await zip.read(ssRel ? resolvePath(wbPath, ssRel.target) : 'xl/sharedStrings.xml');
  if (ssXml) shared = [...ssXml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>|<(?:\w+:)?si\b[^>]*\/>/g)].map(m => textRuns(m[1] ?? ''));
  const sheets = [];
  for (const m of wb.matchAll(/<(?:\w+:)?sheet\b[^>]*>/g)) {
    const name = attr(m[0], 'name'), rid = attr(m[0], 'id'), rel = rels.get(rid);
    if (!rel) continue;
    const xml = await zip.read(resolvePath(wbPath, rel.target)); if (xml == null) continue;
    sheets.push({ name, rows: parseSheet(xml, shared) });
  }
  if (!sheets.length) fail('File Excel không có sheet nào đọc được.');
  return { sheets };
}
function parseSheet(xml, shared) {
  const rows = [];
  let next = 0;
  for (const rm of xml.matchAll(/<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
    const rAttr = /\sr\s*=\s*"(\d+)"/.exec(rm[1]); const r = rAttr ? Number(rAttr[1]) - 1 : next; next = r + 1;
    if (r >= LIM.rows + 200) break;
    const row = []; let cnext = 0;
    for (const cm of (rm[2] || '').matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const ref = attr(' ' + cm[1], 'r'), c = ref ? colIndex(ref) : cnext; cnext = c + 1;
      if (c < 0 || c >= LIM.cols) continue;
      const t = attr(' ' + cm[1], 't') || 'n', body = cm[2] || '';
      const vm = /<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/.exec(body), v = vm ? xmlDecode(vm[1]) : null;
      let val = null;
      if (t === 's') val = v == null ? null : shared[Number(v)] ?? null;
      else if (t === 'inlineStr') val = textRuns(body);
      else if (t === 'str' || t === 'e') val = v;
      else if (t === 'b') val = v === '1' ? 'TRUE' : 'FALSE';
      else val = v == null || v === '' ? null : Number(v);
      if (val !== null && val !== '') row[c] = val;
    }
    rows[r] = row;
  }
  for (let r = 0; r < rows.length; r++) if (!rows[r]) rows[r] = [];
  return rows;
}

/* ========================================================================= */
/* 4. FORM CUTTING PLAN 3 SHEET: 1_BOM · 2_Kho_phoi · 3_Thong_so_cat           */
/* ========================================================================= */
/** Tên cột chấp nhận (đã chuẩn hóa). Thứ tự cột trong file không quan trọng. */
const BOM_COLS = {
  code: ['machitiet', 'ma', 'code'], name: ['tenchitiet', 'ten'], kind: ['loaiphoi'], shape: ['hinhdang'],
  spec: ['quycachthephinh', 'quycach'], len: ['daitp', 'dai', 'chieudaitp', 'chieudai'], wid: ['rongtp', 'rong'],
  dout: ['phingoaitp', 'phingoai', 'duongkinhngoai'], din: ['phitrongtp', 'phitrong', 'duongkinhtrong'],
  thick: ['day', 'chieuday', 'daymm'], grade: ['macvatlieu', 'mac', 'macthep', 'vatlieu'], qty: ['soluong', 'sl'],
  method: ['phuongphapcat', 'phuongphap'], allow: ['dugiacong'], allowIn: ['duphitrong'],
  rotate: ['choxoay90', 'choxoay'], splice: ['chophepnoi', 'noi'], note: ['ghichu'],
};
const STOCK_COLS = {
  kind: ['loaiphoi'], cls: ['phanloai'], grade: ['macvatlieu', 'mac', 'macthep', 'vatlieu'], thick: ['day', 'chieuday'],
  spec: ['quycachthephinh', 'quycach'], method: ['phuongphapcat', 'phuongphap'], len: ['dai', 'chieudai'], wid: ['rong'],
  qty: ['soluong', 'sl', 'soto', 'socay'], lot: ['malo', 'maloseri', 'seri', 'serital', 'soseri', 'serilo'],
  heat: ['heatnumber', 'heat', 'soheat'], cert: ['chungchi31', 'chungchi', 'sochungchi'], place: ['vitrikho', 'vitri'], note: ['ghichu'],
};
const DENS_COLS = { grade: ['mac', 'macvatlieu', 'vatlieu'], density: ['khoiluongrieng'] };
const PROF_COLS = { spec: ['quycach', 'quycachthephinh'], kgm: ['khoiluong', 'khoiluongm', 'kgm', 'khoiluongtheom'], stockL: ['daicay', 'chieudaicay'] };
/** Thông số sheet 3 (cột A = tên thông số, cột B = giá trị). Trống = giữ giá trị chương trình. */
export const PARAMS = [
  { key: 'laserGap', label: 'Laser / Plasma – mạch cắt', unit: 'mm', min: 0, max: 50 },
  { key: 'laserMargin', label: 'Laser / Plasma – chừa mép', unit: 'mm', min: 0, max: 500 },
  { key: 'shearGap', label: 'Chặt sấn – khe hở', unit: 'mm', min: 0, max: 50 },
  { key: 'shearMargin', label: 'Chặt sấn – chừa mép', unit: 'mm', min: 0, max: 500 },
  { key: 'remnantMin', label: 'Tấm lẻ thu hồi – cạnh ngắn ≥', unit: 'mm', min: 0, max: 100000 },
  { key: 'remnantMinLong', label: 'Tấm lẻ thu hồi – cạnh dài ≥', unit: 'mm', min: 0, max: 100000 },
  { key: 'longStripMin', label: 'Chặt sấn – ưu tiên dải dài khi h ≥', unit: 'mm', min: 0, max: 100000 },
  { key: 'allowRect', label: 'Dư gia công mặc định – chữ nhật', unit: 'mm', min: -5, max: 100 },
  { key: 'allowRound', label: 'Dư gia công mặc định – tròn / Ø ngoài vành khuyên', unit: 'mm', min: -5, max: 100 },
  { key: 'allowIn', label: 'Dư gia công mặc định – Ø trong vành khuyên', unit: 'mm', min: 0, max: 100 },
  { key: 'lengthTol', label: 'Đề xuất tăng khổ dài tối đa +', unit: 'mm', min: 0, max: 200 },
  { key: 'widthTol', label: 'Đề xuất tăng khổ rộng tối đa +', unit: 'mm', min: 0, max: 200 },
  { key: 'shrinkTol', label: 'Đề xuất giảm kích thước chi tiết −', unit: 'mm', min: 0, max: 3 },
  { key: 'sawKerf', label: 'Cưa thép hình – mạch cưa', unit: 'mm', min: 0, max: 50 },
  { key: 'sawTrim', label: 'Cưa thép hình – cắt bỏ đầu cây', unit: 'mm', min: 0, max: 100000 },
  { key: 'barRemnantMin', label: 'Cây lẻ thu hồi ≥', unit: 'mm', min: 0, max: 100000 },
  { key: 'allowBar', label: 'Dư gia công mặc định – thép hình (chiều dài)', unit: 'mm', min: 0, max: 1000 },
];
const INFO_KEYS = { project: ['duan'], drawingNo: ['sobanve'], drawnBy: ['nguoilap'], customer: ['khachhang'], orderNo: ['sodonhang', 'madonhang'] };

const KIND = v => { const n = norm(v); return !n ? null : ['tam', 'tontam', 'theptam', 'plate'].includes(n) ? 'plate' : ['thephinh', 'th', 'profile', 'cay'].includes(n) ? 'profile' : 'bad'; };
const SHAPE = v => { const n = norm(v); return !n ? null : ['chunhat', 'cn', 'vuong', 'hcn', 'rect'].includes(n) ? 'rect' : ['tron', 'd', 'circle', 'dia', 'phi'].includes(n) ? 'circle'
  : ['vanhkhuyen', 'vk', 'ring', 'vanh'].includes(n) ? 'ring' : ['thanh', 'bar', 'doan'].includes(n) ? 'bar' : 'bad'; };
const METHOD = v => { const n = norm(v); return !n ? null : ['laser', 'plasma', 'laserplasma', 'plasmalaser'].includes(n) ? 'laser' : ['chatsan', 'chat', 'shear', 'guillotine'].includes(n) ? 'shear'
  : ['cua', 'cuathephinh', 'saw'].includes(n) ? 'saw' : 'bad'; };
const YESNO = v => { const n = norm(v); return !n ? null : ['co', 'c', 'x', 'yes', 'y', 'true', '1', 'duoc'].includes(n) ? true : ['khong', 'k', 'no', 'n', 'false', '0'].includes(n) ? false : 'bad'; };
export const METHOD_LABEL = { laser: 'Laser / Plasma', shear: 'Chặt sấn', saw: 'Cưa', '': 'Chưa ghi' };

const findSheet = (book, keys) => book.sheets.find(s => keys.some(k => norm(s.name) === k)) || book.sheets.find(s => keys.some(k => norm(s.name).includes(k)));
/** Tìm dòng tiêu đề chứa đủ các cột bắt buộc; trả { r, map: {khóa: cột} }. */
function findHeader(rows, cols, required, from = 0) {
  for (let r = from; r < Math.min(rows.length, from + 60); r++) {
    const map = {};
    (rows[r] || []).forEach((v, c) => { const n = norm(v); if (!n) return; for (const [k, list] of Object.entries(cols)) if (map[k] == null && list.includes(n)) map[k] = c; });
    if (required.every(k => map[k] != null)) return { r, map };
  }
  return null;
}
/** Đọc bảng từ dòng sau tiêu đề tới dòng trống đầu tiên (hoặc hết sheet nếu untilBlank = false). */
function readTable(rows, head, untilBlank) {
  const out = [];
  for (let r = head.r + 1; r < rows.length; r++) {
    const row = rows[r] || [], rec = { _row: r + 1 };
    let any = false;
    for (const [k, c] of Object.entries(head.map)) { const v = row[c]; rec[k] = v; if (v != null && cellText(v) !== '') any = true; }
    if (!any) { if (untilBlank) break; continue; }
    out.push(rec);
    if (out.length > LIM.rows) fail(`Bảng quá dài (hơn ${LIM.rows} dòng).`);
  }
  return out;
}

/**
 * Đọc form cutting plan. Trả:
 *  plateGroups / profileGroups: các trình cắt (mỗi nhóm: key, label, rows, errors, stocks …)
 *  params, info, densities, profiles: dữ liệu sheet 3
 *  errors (chung), warnings
 */
export function parseCuttingPlanBook(book) {
  const errors = [], warnings = [];
  const bomSheet = findSheet(book, ['1bom', 'bom']);
  if (!bomSheet) fail('Không thấy sheet "1_BOM". Hãy dùng form mẫu cutting plan.');
  const head = findHeader(bomSheet.rows, BOM_COLS, ['code', 'qty']);
  if (!head) fail('Sheet 1_BOM: không thấy dòng tiêu đề (cần ít nhất cột "Mã chi tiết" và "Số lượng").');
  const rows = readTable(bomSheet.rows, head, false);

  // ---- sheet 3: thông số, thông tin đơn hàng, khối lượng riêng, thép hình
  const params = {}, info = {}, densities = new Map(), profiles = new Map();
  const ps = findSheet(book, ['3thongsocat', 'thongsocat', 'thongso']);
  if (ps) {
    for (let r = 0; r < ps.rows.length; r++) {
      const row = ps.rows[r] || [], n = norm(row[0]);
      if (!n) continue;
      const pdef = PARAMS.find(p => norm(p.label) === n);
      if (pdef) {
        const v = cellNum(row[1]);
        if (v == null) continue;
        if (!Number.isFinite(v) || v < pdef.min || v > pdef.max) errors.push(`3_Thong_so_cat dòng ${r + 1}: "${pdef.label}" phải là số từ ${pdef.min} đến ${pdef.max} ${pdef.unit}.`);
        else params[pdef.key] = v;
        continue;
      }
      for (const [k, list] of Object.entries(INFO_KEYS)) if (list.includes(n) && cellText(row[1])) info[k] = cellText(row[1]).slice(0, 80);
    }
    const dh = findHeader(ps.rows, DENS_COLS, ['grade', 'density']);
    if (dh) for (const t of readTable(ps.rows, dh, true)) {
      const g = cellText(t.grade), d = cellNum(t.density);
      if (!g && d == null) continue;
      if (!g || !(d > 0 && d < 30000)) { errors.push(`3_Thong_so_cat dòng ${t._row}: khối lượng riêng của mác "${g || '?'}" không hợp lệ (kg/m³).`); continue; }
      densities.set(norm(g), { grade: g, density: d });
    }
    const ph = findHeader(ps.rows, PROF_COLS, ['spec', 'kgm']);
    if (ph) for (const t of readTable(ps.rows, ph, true)) {
      const s = cellText(t.spec), kg = cellNum(t.kgm), L = cellNum(t.stockL);
      if (!s && kg == null) continue;
      if (!s || (kg != null && !(kg > 0 && kg < 5000)) || (L != null && !(L > 0 && L <= 100000))) { errors.push(`3_Thong_so_cat dòng ${t._row}: dòng thép hình "${s || '?'}" không hợp lệ.`); continue; }
      profiles.set(norm(s), { spec: s, kgPerM: kg, stockL: L });
    }
  } else warnings.push('Không có sheet 3_Thong_so_cat – dùng thông số đang có trong chương trình.');

  // ---- sheet 1: từng dòng BOM
  const plate = [], profile = [], codes = new Map();
  for (const t of rows) {
    const where = `1_BOM dòng ${t._row}`, e = [];
    const code = cellText(t.code), name = cellText(t.name), q = cellNum(t.qty);
    if (!code && !name && q == null) continue;
    if (!code) e.push('thiếu Mã chi tiết');
    if (q == null) e.push('thiếu Số lượng'); else if (!(Number.isInteger(q) && q > 0 && q <= 100000)) e.push('Số lượng phải là số nguyên dương');
    let kind = KIND(t.kind), shape = SHAPE(t.shape);
    const spec = cellText(t.spec), method = METHOD(t.method), grade = cellText(t.grade);
    if (kind === 'bad') e.push(`Loại phôi "${cellText(t.kind)}" không hiểu (ghi Tấm hoặc Thép hình)`);
    if (shape === 'bad') e.push(`Hình dạng "${cellText(t.shape)}" không hiểu (Chữ nhật / Tròn / Vành khuyên / Thanh)`);
    if (method === 'bad') e.push(`Phương pháp cắt "${cellText(t.method)}" không hiểu (Laser / Plasma / Chặt sấn / Cưa)`);
    if (kind == null) kind = spec || shape === 'bar' ? 'profile' : 'plate';
    const num = (v, lab, { req = false, pos = true, min = null } = {}) => {
      const x = cellNum(v);
      if (x == null) { if (req) e.push(`thiếu ${lab}`); return null; }
      if (!Number.isFinite(x) || (pos && x <= 0) || (min != null && x < min) || Math.abs(x) > 1e6) { e.push(`${lab} không hợp lệ`); return null; }
      return x;
    };
    const allow = num(t.allow, 'Dư gia công', { pos: false, min: -5 }), rot = YESNO(t.rotate), spl = YESNO(t.splice);
    if (rot === 'bad') e.push('Cho xoay 90° ghi Có / Không');
    if (spl === 'bad') e.push('Cho phép nối ghi Có / Không');
    if (code) { if (codes.has(code)) warnings.push(`${where}: Mã chi tiết "${code}" trùng với dòng ${codes.get(code)} – vẫn tính là hai dòng riêng.`); else codes.set(code, t._row); }
    if (kind === 'profile') {
      if (shape && shape !== 'bar' && shape !== 'bad') e.push('thép hình chỉ có hình dạng Thanh');
      if (method && method !== 'saw' && method !== 'bad') e.push('thép hình chỉ cắt bằng Cưa');
      if (!spec) e.push('thiếu Quy cách thép hình');
      const len = num(t.len, 'Dài TP', { req: true });
      if (allow != null && allow < 0) e.push('thép hình: dư gia công không được âm');
      profile.push({ row: t._row, code, name, spec, grade, qty: q, length: len, allowance: allow, splice: spl === false ? false : true, note: cellText(t.note), errors: e });
    } else {
      if (shape === 'bar') e.push('tôn tấm không có hình dạng Thanh');
      if (method === 'saw') e.push('tôn tấm không cắt bằng Cưa');
      if (!shape || shape === 'bad') { if (!shape) e.push('thiếu Hình dạng'); }
      const thick = num(t.thick, 'Dày', { req: true });
      if (!grade) e.push('thiếu Mác vật liệu');
      const r = { row: t._row, code, name, grade, thick, qty: q, shape, method: method === 'bad' ? null : method, allowance: allow, allowanceIn: num(t.allowIn, 'Dư Ø trong', { pos: false, min: 0 }),
        rotate: rot === false ? false : true, note: cellText(t.note), errors: e };
      if (shape === 'rect') { r.partW = num(t.len, 'Dài TP', { req: true }); r.partH = num(t.wid, 'Rộng TP', { req: true }); }
      else if (shape === 'circle') r.diameter = num(t.dout, 'Ø ngoài TP', { req: true });
      else if (shape === 'ring') {
        r.diameter = num(t.dout, 'Ø ngoài TP', { req: true }); r.inner = num(t.din, 'Ø trong TP', { req: true });
        if (r.diameter != null && r.inner != null && r.inner >= r.diameter) e.push('Ø trong phải nhỏ hơn Ø ngoài');
      }
      if (shape !== 'rect' && r.method === 'shear') e.push('chặt sấn chỉ cắt chi tiết chữ nhật');
      plate.push(r);
    }
  }
  if (!plate.length && !profile.length) fail('Sheet 1_BOM chưa có dòng chi tiết nào.');

  // ---- sheet 2: kho phôi (tùy chọn)
  const stocks = [];
  const ks = findSheet(book, ['2khophoi', 'khophoi', 'kho']);
  if (ks) {
    const kh = findHeader(ks.rows, STOCK_COLS, ['len']);
    if (kh) for (const t of readTable(ks.rows, kh, false)) {
      const where = `2_Kho_phoi dòng ${t._row}`, k = KIND(t.kind), cls = norm(t.cls), L = cellNum(t.len), W = cellNum(t.wid), q = cellNum(t.qty);
      const kind = k === 'bad' || k == null ? (cellText(t.spec) ? 'profile' : 'plate') : k;
      const rem = ['tamle', 'cayle', 'le', 'remnant'].includes(cls);
      if (cls && !rem && !['chuan', 'tieuchuan', 'std'].includes(cls)) { errors.push(`${where}: Phân loại "${cellText(t.cls)}" không hiểu (Chuẩn / Tấm lẻ / Cây lẻ).`); continue; }
      if (!(L > 0) || (kind === 'plate' && !(W > 0))) { errors.push(`${where}: thiếu kích thước Dài${kind === 'plate' ? ' / Rộng' : ''}.`); continue; }
      if (q != null && !(Number.isInteger(q) && q >= 0)) { errors.push(`${where}: Số lượng phải là số nguyên ≥ 0 (để trống = không giới hạn).`); continue; }
      const m = METHOD(t.method);
      stocks.push({ row: t._row, kind, remnant: rem, grade: cellText(t.grade), thick: cellNum(t.thick), spec: cellText(t.spec), method: m === 'bad' ? null : m,
        W: L, H: W, qty: q, lot: cellText(t.lot), heat: cellText(t.heat), cert: cellText(t.cert), place: cellText(t.place) });
    }
  }

  // ---- gom nhóm trình cắt
  const plateGroups = groupPlates(plate, stocks, densities);
  const profileGroups = groupProfiles(profile, stocks, profiles);
  if (stocks.some(s => s.heat || s.cert)) warnings.push('Kho phôi có heat number / chứng chỉ 3.1: chương trình hiện chỉ mang Mã lô / seri lên sơ đồ; chế độ truy xuất EN 1090 chưa làm.');
  return { plateGroups, profileGroups, params, info, densities, profiles, errors, warnings, rowCount: plate.length + profile.length };
}

/** Tôn tấm: nhóm theo Mác + Dày + Phương pháp. Chữ nhật để trống phương pháp:
 *  nhập vào nhóm cùng Mác + Dày nếu nhóm đó chỉ có MỘT phương pháp đã ghi; nếu không, theo phương pháp đang chọn trên chương trình.
 *  Tròn / vành khuyên để trống → Laser / Plasma (chặt sấn không cắt được). */
function groupPlates(rows, stocks, densities) {
  const by = new Map();
  const keyOf = (g, t, m) => `${norm(g)}|${t}|${m}`;
  const explicit = new Map();
  for (const r of rows) {
    const m = r.method || (r.shape === 'circle' || r.shape === 'ring' ? 'laser' : '');
    r.methodUsed = m; r.methodAuto = !r.method && !!m;
    if (m) { const k = `${norm(r.grade)}|${r.thick}`; if (!explicit.has(k)) explicit.set(k, new Set()); explicit.get(k).add(m); }
  }
  for (const r of rows) if (!r.methodUsed) {
    const set = explicit.get(`${norm(r.grade)}|${r.thick}`);
    if (set && set.size === 1) { r.methodUsed = [...set][0]; r.methodAuto = true; }
  }
  for (const r of rows) {
    const k = keyOf(r.grade, r.thick, r.methodUsed);
    if (!by.has(k)) by.set(k, { kind: 'plate', key: k, grade: r.grade, thick: r.thick, method: r.methodUsed, rows: [] });
    by.get(k).rows.push(r);
  }
  return [...by.values()].map(g => {
    g.errors = g.rows.flatMap(r => r.errors.map(e => `1_BOM dòng ${r.row}: ${e}`));
    g.pieces = g.rows.reduce((s, r) => s + (r.qty || 0), 0);
    g.stocks = stocks.filter(s => s.kind === 'plate' && (!s.grade || norm(s.grade) === norm(g.grade)) && (s.thick == null || s.thick === g.thick) && (!s.method || !g.method || s.method === g.method));
    g.density = densities.get(norm(g.grade)) || null;
    g.autoMethod = g.rows.some(r => r.methodAuto);
    g.label = `${g.grade || '(chưa ghi mác)'} · dày ${g.thick == null ? '?' : fmt(g.thick)} mm · ${g.method ? METHOD_LABEL[g.method] : 'theo phương pháp đang chọn'}`;
    if (g.rows.length > LIM.types) g.errors.push(`Nhóm có ${g.rows.length} dòng chi tiết, vượt ${LIM.types} loại / trình cắt.`);
    return g;
  }).sort((a, b) => String(a.grade).localeCompare(String(b.grade)) || (a.thick ?? 0) - (b.thick ?? 0) || String(a.method).localeCompare(String(b.method)));
}
function groupProfiles(rows, stocks, profiles) {
  const by = new Map();
  for (const r of rows) {
    const k = `${norm(r.spec)}|${norm(r.grade)}`;
    if (!by.has(k)) by.set(k, { kind: 'profile', key: k, spec: r.spec, grade: r.grade, rows: [] });
    by.get(k).rows.push(r);
  }
  return [...by.values()].map(g => {
    g.errors = g.rows.flatMap(r => r.errors.map(e => `1_BOM dòng ${r.row}: ${e}`));
    g.pieces = g.rows.reduce((s, r) => s + (r.qty || 0), 0);
    g.stocks = stocks.filter(s => s.kind === 'profile' && norm(s.spec) === norm(g.spec) && (!s.grade || !g.grade || norm(s.grade) === norm(g.grade)));
    g.profile = profiles.get(norm(g.spec)) || null;
    g.label = `${g.spec || '(chưa ghi quy cách)'}${g.grade ? ' · ' + g.grade : ''}`;
    return g;
  });
}

/* ========================================================================= */
/* 5. ĐỌC DXF – nhận diện đường bao chi tiết tôn tấm                          */
/* Nhận: CIRCLE, ARC, LINE, LWPOLYLINE, POLYLINE (2D), INSERT (block, mảng). */
/* Đường bao kín ngoài cùng = chi tiết; bên trong = lỗ (tính phủ bì, bỏ qua),  */
/* trừ tròn đồng tâm trong tròn = vành khuyên. Lồng tiếp (chi tiết vẽ trong   */
/* lỗ) lại là chi tiết – quy tắc chẵn lẻ.                                     */
/* ========================================================================= */
const UNIT_SCALE = { 1: [25.4, 'inch'], 2: [304.8, 'feet'], 4: [1, 'mm'], 5: [10, 'cm'], 6: [1000, 'm'] };
export function readDxf(text) {
  if (typeof text !== 'string') text = new TextDecoder('utf-8').decode(text);
  if (text.length > LIM.dxfBytes) fail(`File DXF lớn hơn ${LIM.dxfBytes / 1e6} MB.`);
  if (text.startsWith('AutoCAD Binary DXF')) fail('DXF dạng nhị phân chưa hỗ trợ – trong CAD hãy lưu lại dạng DXF ASCII.');
  const L = text.split(/\r\n|\r|\n/);
  const pairs = [];
  for (let i = 0; i + 1 < L.length; i += 2) {
    const c = parseInt(L[i], 10);
    if (!Number.isFinite(c)) fail(`File DXF lỗi định dạng ở dòng ${i + 1}.`);
    pairs.push([c, L[i + 1].trim()]);
  }
  let units = 0;
  const blocks = new Map(), entities = [], layers = new Map();
  let i = 0, section = '';
  const readEntity = () => {           // pairs[i] là (0, TÊN); đọc đến cặp 0 kế tiếp
    const e = { type: pairs[i][1], g: [] }; i++;
    while (i < pairs.length && pairs[i][0] !== 0) { e.g.push(pairs[i]); i++; }
    return e;
  };
  while (i < pairs.length) {
    const [c, v] = pairs[i];
    if (c === 0 && v === 'SECTION') { i++; section = pairs[i]?.[0] === 2 ? pairs[i][1] : ''; i++; continue; }
    if (c === 0 && v === 'ENDSEC') { section = ''; i++; continue; }
    if (c === 0 && v === 'EOF') break;
    if (section === 'HEADER' && c === 9 && v === '$INSUNITS') { units = Number(pairs[i + 1]?.[1]) || 0; i += 2; continue; }
    if (section === 'TABLES' && c === 0 && v === 'LAYER') { const e = readEntity(); const name = e.g.find(p => p[0] === 2)?.[1]; const flags = Number(e.g.find(p => p[0] === 70)?.[1] || 0), color = Number(e.g.find(p => p[0] === 62)?.[1] || 0); if (name) layers.set(name, { frozen: !!(flags & 1), off: color < 0 }); continue; }
    if (section === 'BLOCKS' && c === 0 && v === 'BLOCK') {
      const b = readEntity(); const name = b.g.find(p => p[0] === 2)?.[1] || '';
      const base = [num(b.g, 10), num(b.g, 20)], list = [];
      while (i < pairs.length && !(pairs[i][0] === 0 && pairs[i][1] === 'ENDBLK')) { if (pairs[i][0] === 0) list.push(readEntity()); else i++; }
      blocks.set(name, { base, list }); continue;
    }
    if (section === 'ENTITIES' && c === 0) { entities.push(readEntity()); if (entities.length > LIM.dxfEntities) fail('File DXF có quá nhiều đối tượng.'); continue; }
    i++;
  }
  const [scale, uname] = UNIT_SCALE[units] || [1, null];
  return { units, unitName: uname, scale, blocks, entities, layerTable: layers };
}
const num = (g, code, def = 0) => { const p = g.find(x => x[0] === code); const v = p ? Number(p[1]) : def; return Number.isFinite(v) ? v : def; };
const str = (g, code, def = '') => g.find(x => x[0] === code)?.[1] ?? def;

/** Biến đổi phẳng: ma trận [a b c d tx ty] : x' = a x + c y + tx ; y' = b x + d y + ty */
const T0 = [1, 0, 0, 1, 0, 0];
const tMul = (P, Q) => [P[0] * Q[0] + P[2] * Q[1], P[1] * Q[0] + P[3] * Q[1], P[0] * Q[2] + P[2] * Q[3], P[1] * Q[2] + P[3] * Q[3], P[0] * Q[4] + P[2] * Q[5] + P[4], P[1] * Q[4] + P[3] * Q[5] + P[5]];
const tApply = (M, x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
const tScale = M => { const sx = Math.hypot(M[0], M[1]), sy = Math.hypot(M[2], M[3]); return { sx, sy, uniform: Math.abs(sx - sy) <= 1e-9 * Math.max(1, sx), mirror: M[0] * M[3] - M[1] * M[2] < 0 }; };

/** Trải phẳng các đối tượng (kể cả trong block) thành hình học trong hệ tọa độ bản vẽ (mm). */
function flatten(dxf, skip, opts = {}) {
  const out = { circles: [], segs: [], polys: [], stats: { spline: 0, ellipse: 0, text: 0, dim: 0, hatch: 0, other: 0, nonUniform: 0, points3d: 0 } };
  let count = 0;
  const sc0 = opts.forceMM ? 1 : dxf.scale, S = [sc0, 0, 0, sc0, 0, 0];
  const walk = (list, M, inheritLayer, depth, stack) => {
    for (const e of list) {
      if (++count > LIM.dxfEntities) fail('File DXF có quá nhiều đối tượng (sau khi trải block).');
      let layer = str(e.g, 8, '0'); if (layer === '0' && inheritLayer) layer = inheritLayer;
      const ocs = num(e.g, 230, 1) < 0;                 // trục Z âm: hình bị lật X
      const Mo = ocs ? tMul(M, [-1, 0, 0, 1, 0, 0]) : M;
      switch (e.type) {
        case 'INSERT': {
          const name = str(e.g, 2), b = dxf.blocks.get(name);
          if (!b) { out.stats.other++; break; }
          if (depth >= LIM.insertDepth || stack.includes(name)) fail(`Block "${name}" lồng quá sâu hoặc tham chiếu vòng.`);
          const sx = num(e.g, 41, 1), sy = num(e.g, 42, 1), rot = num(e.g, 50) * Math.PI / 180;
          const cols = Math.max(1, Math.min(1000, num(e.g, 70, 1))), rows = Math.max(1, Math.min(1000, num(e.g, 71, 1))), dc = num(e.g, 44), dr = num(e.g, 45);
          if (cols * rows > 100000) fail('Mảng block quá lớn.');
          const cs = Math.cos(rot), sn = Math.sin(rot);
          for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) {
            const ox = cc * dc, oy = rr * dr;         // bước mảng theo trục đã xoay của INSERT
            const tx = num(e.g, 10) + ox * cs - oy * sn, ty = num(e.g, 20) + ox * sn + oy * cs;
            const B = [cs * sx, sn * sx, -sn * sy, cs * sy, tx, ty];
            const local = tMul(B, [1, 0, 0, 1, -b.base[0], -b.base[1]]);
            walk(b.list, tMul(Mo, local), layer, depth + 1, [...stack, name]);
          }
          break;
        }
        case 'CIRCLE': {
          if (skip(layer)) break;
          const sc = tScale(Mo); if (!sc.uniform) { out.stats.nonUniform++; break; }
          const [x, y] = tApply(Mo, num(e.g, 10), num(e.g, 20));
          out.circles.push({ layer, x, y, r: num(e.g, 40) * sc.sx });
          break;
        }
        case 'ARC': {
          if (skip(layer)) break;
          const sc = tScale(Mo); if (!sc.uniform) { out.stats.nonUniform++; break; }
          const cx = num(e.g, 10), cy = num(e.g, 20), r = num(e.g, 40);
          let a0 = num(e.g, 50) * Math.PI / 180, a1 = num(e.g, 51) * Math.PI / 180;
          if (a1 <= a0) a1 += 2 * Math.PI;
          out.segs.push(arcSeg(Mo, cx, cy, r, a0, a1, layer));
          break;
        }
        case 'LINE': {
          if (skip(layer)) break;
          out.segs.push(lineSeg(tApply(Mo, num(e.g, 10), num(e.g, 20)), tApply(Mo, num(e.g, 11), num(e.g, 21)), layer));
          break;
        }
        case 'LWPOLYLINE': {
          if (skip(layer)) break;
          const vs = []; let cur = null;
          for (const [c, v] of e.g) {
            if (c === 10) { cur = { x: Number(v), y: 0, b: 0 }; vs.push(cur); }
            else if (c === 20 && cur) cur.y = Number(v);
            else if (c === 42 && cur) cur.b = Number(v) || 0;
          }
          addPoly(out, Mo, vs, (num(e.g, 70) & 1) === 1, layer);
          break;
        }
        case 'POLYLINE': {
          // đỉnh nằm trong các VERTEX đi kèm (đã gom vào e.vertices khi đọc)
          if (skip(layer)) break;
          const fl = num(e.g, 70);
          if (fl & (8 | 16 | 64)) { out.stats.points3d++; break; }   // polyline 3D / lưới – bỏ qua
          addPoly(out, Mo, (e.vertices || []).map(v => ({ x: num(v.g, 10), y: num(v.g, 20), b: num(v.g, 42) })), (fl & 1) === 1, layer);
          break;
        }
        case 'SPLINE': out.stats.spline++; break;
        case 'ELLIPSE': out.stats.ellipse++; break;
        case 'TEXT': case 'MTEXT': case 'ATTRIB': case 'ATTDEF': out.stats.text++; break;
        case 'DIMENSION': case 'LEADER': case 'MLEADER': out.stats.dim++; break;
        case 'HATCH': case 'SOLID': out.stats.hatch++; break;
        case 'VERTEX': case 'SEQEND': case 'POINT': case 'VIEWPORT': break;
        default: out.stats.other++;
      }
    }
  };
  const attachVertices = list => {      // POLYLINE cũ: các VERTEX đứng sau, kết thúc bằng SEQEND
    const res = [];
    for (let k = 0; k < list.length; k++) {
      const e = list[k];
      if (e.type === 'POLYLINE') { e.vertices = []; while (k + 1 < list.length && list[k + 1].type === 'VERTEX') e.vertices.push(list[++k]); if (list[k + 1]?.type === 'SEQEND') k++; }
      res.push(e);
    }
    return res;
  };
  for (const b of dxf.blocks.values()) b.list = attachVertices(b.list);
  walk(attachVertices(dxf.entities), S, null, 0, []);
  return out;
}
function lineSeg(p, q, layer) { return { layer, kind: 'line', p, q, pts: [p, q] }; }
function arcSeg(M, cx, cy, r, a0, a1, layer) {
  const n = Math.max(2, Math.ceil((a1 - a0) / (Math.PI / 36)));    // 5° mỗi đoạn
  const pts = []; for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; pts.push(tApply(M, cx + r * Math.cos(a), cy + r * Math.sin(a))); }
  const [x, y] = tApply(M, cx, cy), sc = tScale(M);
  return { layer, kind: 'arc', cx: x, cy: y, r: r * sc.sx, sweep: a1 - a0, p: pts[0], q: pts[pts.length - 1], pts };
}
function addPoly(out, M, vs, closed, layer) {
  if (vs.length < 2) return;
  const n = vs.length;
  if (!closed && n > 2 && Math.hypot(vs[0].x - vs[n - 1].x, vs[0].y - vs[n - 1].y) < 1e-6) { closed = true; vs = vs.slice(0, -1); }
  const sc = tScale(M);
  const segs = [];
  for (let k = 0; k < (closed ? vs.length : vs.length - 1); k++) {
    const a = vs[k], b = vs[(k + 1) % vs.length];
    if (Math.abs(a.b) < 1e-12) segs.push(lineSeg(tApply(M, a.x, a.y), tApply(M, b.x, b.y), layer));
    else {
      if (!sc.uniform) { out.stats.nonUniform++; return; }
      const th = 4 * Math.atan(a.b), d = Math.hypot(b.x - a.x, b.y - a.y), r = d / (2 * Math.sin(Math.abs(th) / 2));
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, h = r * Math.cos(Math.abs(th) / 2), ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
      const sgn = th > 0 ? 1 : -1, cx = mx - sgn * h * uy, cy = my + sgn * h * ux;
      let a0 = Math.atan2(a.y - cy, a.x - cx), a1 = Math.atan2(b.y - cy, b.x - cx);
      if (th > 0) { if (a1 <= a0) a1 += 2 * Math.PI; segs.push(arcSeg(M, cx, cy, Math.abs(r), a0, a1, layer)); }
      else { if (a0 <= a1) a0 += 2 * Math.PI; const s = arcSeg(M, cx, cy, Math.abs(r), a1, a0, layer); s.pts.reverse(); [s.p, s.q] = [s.q, s.p]; segs.push(s); }
    }
  }
  if (closed) out.polys.push({ layer, segs }); else out.segs.push(...segs);
}

/** Nối các đoạn rời (LINE, ARC, polyline hở) thành vòng kín. Chỉ nhận vòng sạch: mỗi nút đúng 2 đoạn. */
function chainLoops(segs, tol = 0.01) {
  const nodes = new Map(), keyOf = ([x, y]) => `${Math.round(x / tol)},${Math.round(y / tol)}`;
  const nodeOf = p => {
    const gx = Math.round(p[0] / tol), gy = Math.round(p[1] / tol);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const k = `${gx + dx},${gy + dy}`; if (nodes.has(k)) return nodes.get(k); }
    const n = { k: keyOf(p), ends: [] }; nodes.set(n.k, n); return n;
  };
  const S = segs.filter(s => Math.hypot(s.p[0] - s.q[0], s.p[1] - s.q[1]) > tol || s.kind === 'arc');
  S.forEach((s, id) => { s.id = id; s.na = nodeOf(s.p); s.nb = nodeOf(s.q); s.na.ends.push(s); s.nb.ends.push(s); });
  const used = new Set(), loops = []; let open = 0;
  for (const s of S) {
    if (used.has(s.id)) continue;
    // gom thành phần liên thông
    const comp = [], stack = [s]; used.add(s.id);
    while (stack.length) { const c = stack.pop(); comp.push(c); for (const n of [c.na, c.nb]) for (const o of n.ends) if (!used.has(o.id)) { used.add(o.id); stack.push(o); } }
    const nodesC = new Set(comp.flatMap(c => [c.na, c.nb]));
    if (![...nodesC].every(n => n.ends.length === 2)) { open++; continue; }
    // đi vòng
    const order = [], pts = []; let cur = comp[0], at = cur.na; const seen = new Set();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      const fwd = cur.na === at, sp = fwd ? cur.pts : [...cur.pts].reverse();
      pts.push(...sp.slice(0, -1)); order.push(cur); (order.dir ??= []).push(fwd);
      at = fwd ? cur.nb : cur.na;
      cur = at.ends.find(o => !seen.has(o.id));
    }
    if (seen.size !== comp.length) { open++; continue; }
    loops.push({ layer: comp[0].layer, segs: order, pts });
  }
  return { loops, open };
}

/** Đường bao dạng đỉnh + bulge (như LWPOLYLINE), hệ trục bản vẽ (Y lên), dời về gốc (0,0), chiều ngược kim đồng hồ.
 *  Bulge = tan(góc ở tâm / 4), dương = cung đi ngược kim đồng hồ. */
function outlineOf(loop) {
  const dirs = loop.segs.dir || loop.segs.map(() => true), V = [];
  loop.segs.forEach((s, k) => {
    const pts = dirs[k] ? s.pts : [...s.pts].reverse(), p = pts[0], q = pts[pts.length - 1];
    let b = 0;
    if (s.kind === 'arc') {
      const m = pts[Math.floor(pts.length / 2)], cr = (q[0] - p[0]) * (m[1] - p[1]) - (q[1] - p[1]) * (m[0] - p[0]);
      b = (cr < 0 ? 1 : -1) * Math.tan(s.sweep / 4);
    }
    V.push({ x: p[0], y: p[1], b });
  });
  const area = polyArea(loop.pts);
  let out = V;
  if (area < 0) {                                  // đảo chiều: đỉnh ngược thứ tự, bulge đổi dấu và gán cho đỉnh đầu đoạn mới
    const n = V.length; out = [];
    for (let k = n - 1; k >= 0; k--) out.push({ x: V[k].x, y: V[k].y, b: -V[(k - 1 + n) % n].b });
  }
  const xs = loop.pts.map(p => p[0]), ys = loop.pts.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
  const r6 = v => Math.round(v * 1e6) / 1e6;
  return { verts: out.map(v => ({ x: r6(v.x - x0), y: r6(v.y - y0), b: r6(v.b) })), w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}
const polyArea = P => { let a = 0; for (let k = 0; k < P.length; k++) { const [x1, y1] = P[k], [x2, y2] = P[(k + 1) % P.length]; a += x1 * y2 - x2 * y1; } return a / 2; };
const inPoly = (P, [x, y]) => { let c = false; for (let k = 0, j = P.length - 1; k < P.length; j = k++) { const [xi, yi] = P[k], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
function hull(P) {
  const p = [...P].sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/** Chữ nhật bao nhỏ nhất (xét các hướng cạnh bao lồi). */
function minRect(P) {
  const H = hull(P); let best = null;
  for (let k = 0; k < H.length; k++) {
    const [x1, y1] = H[k], [x2, y2] = H[(k + 1) % H.length], L = Math.hypot(x2 - x1, y2 - y1); if (L < 1e-9) continue;
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L; let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const [x, y] of H) { const a = x * ux + y * uy, b = -x * uy + y * ux; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
    const w = a1 - a0, h = b1 - b0; if (!best || w * h < best.w * best.h - 1e-9) best = { w, h };
  }
  return best || { w: 0, h: 0 };
}
/** Phân loại một vòng kín: chữ nhật (4 cạnh thẳng vuông góc), tròn (các cung cùng tâm, cùng bán kính), hay hình khác. */
function classify(loop) {
  const arcs = loop.segs.filter(s => s.kind === 'arc');
  if (arcs.length === loop.segs.length) {
    const a = arcs[0], same = arcs.every(s => Math.hypot(s.cx - a.cx, s.cy - a.cy) < 0.01 && Math.abs(s.r - a.r) < 0.01);
    const sweep = arcs.reduce((t, s) => t + s.sweep, 0);
    if (same && Math.abs(sweep - 2 * Math.PI) < 1e-3) return { kind: 'circle', x: a.cx, y: a.cy, r: a.r };
  }
  if (!arcs.length) {
    let V = loop.pts.map(p => p);
    // bỏ đỉnh thẳng hàng
    for (let changed = true; changed && V.length > 3;) {
      changed = false;
      for (let k = 0; k < V.length; k++) {
        const a = V[(k - 1 + V.length) % V.length], b = V[k], c = V[(k + 1) % V.length];
        const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]), L = Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1]);
        if (L === 0 || Math.abs(cr) / L < 1e-6) { V.splice(k, 1); changed = true; break; }
      }
    }
    if (V.length === 4) {
      const e = [0, 1, 2, 3].map(k => [V[(k + 1) % 4][0] - V[k][0], V[(k + 1) % 4][1] - V[k][1]]), len = e.map(v => Math.hypot(...v));
      const right = [0, 1, 2, 3].every(k => Math.abs(e[k][0] * e[(k + 1) % 4][0] + e[k][1] * e[(k + 1) % 4][1]) <= 1e-6 * len[k] * len[(k + 1) % 4]);
      if (right && Math.abs(len[0] - len[2]) < 0.01 && Math.abs(len[1] - len[3]) < 0.01) {
        const ang = Math.atan2(e[0][1], e[0][0]) * 180 / Math.PI, axis = Math.abs(Math.round(ang / 90) * 90 - ang) < 1e-4;
        // trục song song: Dài theo phương X như bản vẽ; xiên: Dài = cạnh dài
        const horiz = axis && Math.abs(Math.round(ang / 90)) % 2 === 0;
        const w = axis ? (horiz ? len[0] : len[1]) : Math.max(len[0], len[1]), h = axis ? (horiz ? len[1] : len[0]) : Math.min(len[0], len[1]);
        return { kind: 'rect', w, h, skew: !axis };
      }
    }
  }
  const r = minRect(loop.pts);
  return { kind: 'other', w: Math.max(r.w, r.h), h: Math.min(r.w, r.h), curved: arcs.length > 0 };
}

/**
 * Phân tích DXF thành danh sách chi tiết. opts.layers: Set lớp ĐƯỢC DÙNG (null = mọi lớp đang bật).
 * Trả { items, layers, units, holes, skipped, warnings }. items: { kind: rect|circle|ring|other, w, h, d, inner, qty, layers, note }.
 */
export function analyzeDxf(dxf, opts = {}) {
  const layerCount = new Map();
  const want = opts.layers || null;
  const hiddenLayer = n => { const t = dxf.layerTable.get(n); return !!(t && (t.frozen || t.off)); };
  const skip = layer => { layerCount.set(layer, (layerCount.get(layer) || 0) + 1); return want ? !want.has(layer) : hiddenLayer(layer); };
  const flat = flatten(dxf, skip, opts);
  const { loops, open } = chainLoops(flat.segs);
  const contours = [];
  for (const c of flat.circles) if (c.r > 0) contours.push({ layer: c.layer, kind: 'circle', x: c.x, y: c.y, r: c.r, area: Math.PI * c.r * c.r, box: [c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r], pt: [c.x + c.r * 0.7071, c.y + c.r * 0.7071] });
  for (const l of [...flat.polys.map(p => ({ layer: p.layer, segs: p.segs, pts: p.segs.flatMap(s => s.pts.slice(0, -1)) })), ...loops]) {
    if (l.pts.length < 3) continue;
    const cl = classify(l), xs = l.pts.map(p => p[0]), ys = l.pts.map(p => p[1]);
    const area = Math.abs(polyArea(l.pts)); if (area < 1e-6) continue;
    const c = { layer: l.layer, ...cl, poly: l.pts, loop: l, area, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], pt: l.pts[0] };
    if (cl.kind === 'circle') { c.area = Math.PI * cl.r * cl.r; c.pt = [cl.x + cl.r * 0.7071, cl.y + cl.r * 0.7071]; }
    contours.push(c);
  }
  if (contours.length > LIM.contours) fail(`Bản vẽ có ${contours.length} đường bao kín, vượt ${LIM.contours}.`);
  // quan hệ chứa: cha = đường bao nhỏ nhất chứa nó
  contours.sort((a, b) => b.area - a.area);
  const inside = (o, c) => {                                 // o nằm trong c?
    const e = 1e-6;
    if (o.box[0] < c.box[0] - e || o.box[1] < c.box[1] - e || o.box[2] > c.box[2] + e || o.box[3] > c.box[3] + e || o.area >= c.area) return false;
    const test = o.kind === 'circle' ? [o.x, o.y] : o.pt;
    return c.kind === 'circle' && !c.poly ? Math.hypot(test[0] - c.x, test[1] - c.y) < c.r : inPoly(c.poly, test);
  };
  // lưới ô để tìm cha nhanh: duyệt từ đường bao lớn đến nhỏ, cha là đường bao NHỎ NHẤT (đã duyệt) chứa nó
  if (contours.length) {
    const X0 = Math.min(...contours.map(o => o.box[0])), Y0 = Math.min(...contours.map(o => o.box[1]));
    const X1 = Math.max(...contours.map(o => o.box[2])), Y1 = Math.max(...contours.map(o => o.box[3]));
    const cell = Math.max(1e-3, Math.sqrt(Math.max(1, (X1 - X0) * (Y1 - Y0)) / contours.length) * 2);
    const grid = new Map(), big = [];
    const cx = x => Math.floor((x - X0) / cell), cy = y => Math.floor((y - Y0) / cell);
    for (const o of contours) {
      o.parent = null; o.kids = [];
      const t = o.kind === 'circle' ? [o.x, o.y] : o.pt;
      const cand = [...(grid.get(`${cx(t[0])},${cy(t[1])}`) || []), ...big];
      for (const c of cand) if (inside(o, c) && (!o.parent || c.area < o.parent.area)) o.parent = c;
      const i0 = cx(o.box[0]), i1 = cx(o.box[2]), j0 = cy(o.box[1]), j1 = cy(o.box[3]);
      if ((i1 - i0 + 1) * (j1 - j0 + 1) > 4096) big.push(o);
      else for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = `${i},${j}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(o); }
    }
  }
  for (const o of contours) { o.depth = 0; for (let p = o.parent; p; p = p.parent) o.depth++; if (o.parent) o.parent.kids.push(o); }
  const parts = contours.filter(o => o.depth % 2 === 0);
  let holes = 0;
  const warnings = [];
  const items = new Map();
  const r2 = v => Math.round(v * 100) / 100;
  for (const o of parts) {
    let it;
    const holesHere = o.kids.length; holes += holesHere;
    if (o.kind === 'circle') {
      const conc = o.kids.filter(k => k.kind === 'circle' && Math.hypot(k.x - o.x, k.y - o.y) < 0.01);
      const inner = conc.length ? Math.max(...conc.map(k => k.r)) : 0;
      it = inner > 0 ? { kind: 'ring', d: r2(2 * o.r), inner: r2(2 * inner) } : { kind: 'circle', d: r2(2 * o.r) };
      if (inner > 0) holes--;
    } else if (o.kind === 'rect') it = { kind: 'rect', w: r2(o.w), h: r2(o.h), skew: o.skew };
    else {
      const ol = outlineOf(o.loop);
      it = { kind: 'other', w: Math.round(ol.w * 1e6) / 1e6, h: Math.round(ol.h * 1e6) / 1e6, curved: o.curved, area: Math.round(o.area), outline: ol.verts, skew: o.w * o.h < ol.w * ol.h - 1 };
    }
    const bigKids = o.kids.filter(k => k.kind !== 'circle').length;
    if (bigKids >= 2 && o.kind === 'rect') warnings.push(`Đường bao ${r2(o.w)} × ${r2(o.h)} (lớp "${o.layer}") chứa ${bigKids} đường bao chữ nhật / đa giác bên trong – nếu là khung bản vẽ, hãy bỏ tích lớp đó.`);
    const key = it.kind === 'other' ? `other|${r2(it.w)}|${r2(it.h)}|${it.area}` : it.kind === 'rect' ? `rect|${Math.max(it.w, it.h)}|${Math.min(it.w, it.h)}` : it.kind === 'ring' ? `ring|${it.d}|${it.inner}` : `circle|${it.d}`;
    if (!items.has(key)) items.set(key, { ...it, qty: 0, layers: new Set(), holes: 0 });
    const g = items.get(key); g.qty++; g.layers.add(o.layer); g.holes += o.kind === 'circle' && it.kind === 'ring' ? holesHere - 1 : holesHere;
    if (it.skew) g.skew = true;
  }
  // khung bản vẽ: chữ nhật trùng khổ giấy ISO A0–A4 (±0,5 mm) – mặc định không lấy
  const PAPER = [['A0', 1189, 841], ['A1', 841, 594], ['A2', 594, 420], ['A3', 420, 297], ['A4', 297, 210]];
  for (const g of items.values()) if (g.kind === 'rect') {
    const L = Math.max(g.w, g.h), S = Math.min(g.w, g.h), hit = PAPER.find(([, a, b]) => Math.abs(L - a) <= 0.5 && Math.abs(S - b) <= 0.5);
    if (hit) g.frame = hit[0];
  }
  const list = [...items.values()].map(g => ({ ...g, layers: [...g.layers] }))
    .sort((a, b) => ({ rect: 0, circle: 1, ring: 2, other: 3 }[a.kind] - { rect: 0, circle: 1, ring: 2, other: 3 }[b.kind]) || (b.w ?? b.d) - (a.w ?? a.d));
  const layers = [...layerCount.entries()].map(([name, count]) => ({ name, count, hidden: hiddenLayer(name), used: want ? want.has(name) : !hiddenLayer(name) })).sort((a, b) => a.name.localeCompare(b.name));
  if (opts.forceMM) { if (dxf.scale !== 1) warnings.push(`Bản vẽ ghi đơn vị ${dxf.unitName}, đang COI LÀ mm theo lựa chọn của người dùng.`); }
  else if (dxf.units === 0) warnings.push('Bản vẽ không ghi đơn vị ($INSUNITS) – đang hiểu là mm.');
  else if (!dxf.unitName) warnings.push(`Đơn vị bản vẽ mã ${dxf.units} chưa hỗ trợ – đang hiểu là mm.`);
  else if (dxf.scale !== 1) warnings.push(`Bản vẽ ghi đơn vị ${dxf.unitName} – đã đổi sang mm (× ${dxf.scale}). Nếu thực tế vẽ bằng mm, chọn "Coi là mm".`);
  const huge = list.filter(it => Math.max(it.w ?? 0, it.h ?? 0, it.d ?? 0) > 6000);
  if (huge.length) warnings.push(`${huge.length} kích thước lớn hơn 6000 mm – kiểm tra đơn vị bản vẽ hoặc lớp khung.`);
  const tiny = list.filter(it => Math.max(it.w ?? 0, it.h ?? 0, it.d ?? 0) < 5);
  if (tiny.length) warnings.push(`${tiny.length} kích thước nhỏ hơn 5 mm – kiểm tra đơn vị bản vẽ.`);
  if (flat.stats.nonUniform) warnings.push(`${flat.stats.nonUniform} đường tròn / cung trong block bị co giãn không đều (thành elip) – bỏ qua.`);
  if (list.length > LIM.types) warnings.push(`Có ${list.length} kích thước khác nhau, vượt ${LIM.types} loại / trình cắt – cần tách bản vẽ.`);
  return { items: list, layers, units: opts.forceMM ? 'mm' : dxf.unitName || 'mm', fileUnits: dxf.unitName, unitScale: dxf.scale, holes, warnings,
    skipped: { open, spline: flat.stats.spline, ellipse: flat.stats.ellipse, text: flat.stats.text, dim: flat.stats.dim, hatch: flat.stats.hatch, other: flat.stats.other + flat.stats.points3d } };
}

/** Đọc file người dùng chọn (File / Blob) – kiểm tra kích thước trước khi đọc. */
export async function readFileBytes(file, maxBytes) {
  if (!file) fail('Chưa chọn file.');
  if (file.size > maxBytes) fail(`File lớn hơn ${Math.round(maxBytes / 1e6)} MB.`);
  return new Uint8Array(await file.arrayBuffer());
}
export const LIMITS = LIM;
export { ImportError };
