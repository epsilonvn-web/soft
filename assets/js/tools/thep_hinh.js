/**
 * Epsilon Soft - Cắt thép hình 1D (Web) – BẢN TEST NỘI BỘ (một file, có thuật toán)
 * !!! File này chứa toàn bộ thuật toán. Chỉ dùng để test nội bộ, KHÔNG đưa lên web công khai.
 * Quy ước (đã chốt với anh):
 *  - Chiều dài nhập là THÀNH PHẨM; chiều dài CẮT = thành phẩm + dư gia công.
 *  - Mỗi nhát cưa mất "mạch cưa" (mặc định 3 mm); có thể cắt bỏ đầu cây trước khi cắt.
 *  - Cây lẻ chỉ thu hồi khi dài ≥ ngưỡng (mặc định 1000 mm).
 *  - Hao phí / TP = (KL xuất − KL thu hồi − KL thành phẩm) / KL thành phẩm.
 *  - Thứ tự chọn: ít cây nhất → phần dư dồn vào MỘT cây cuối thành cây lẻ dài nhất
 *    → ít kiểu cắt khác nhau nhất.
 *  - Số cây tối thiểu được CHỨNG MINH (duyệt toàn bộ trạng thái), không phải ước lượng.
 * Bản quyền © Epsilon Lab.
 */
const {setText, downloadBlob} = globalThis.EpsilonSoftShared || {};
const LIMIT = 1e6, EPS = 1e-7, MAX_STATES = 400000, MAX_PATTERNS = 20000, MAX_TYPES = 5;
class UserError extends Error {}
const fail = m => { throw new UserError(m); };

/* ========================================================================= */
/* LÕI TÍNH                                                                  */
/* ========================================================================= */

/** Liệt kê mọi kiểu cắt 1 cây (số chiếc mỗi loại), không vượt số lượng cần. */
function listPatterns(len, cap, maxCount) {
  const n = len.length, out = [], cur = new Array(n).fill(0);
  (function rec(t, room) {
    if (out.length > MAX_PATTERNS) return;
    if (t === n) { if (cur.some(v => v > 0)) out.push({ c: cur.slice(), used: cap - room }); return; }
    const most = Math.min(maxCount[t], Math.floor(room / len[t] + 1e-9));
    for (let k = most; k >= 0; k--) { cur[t] = k; rec(t + 1, room - k * len[t]); }
    cur[t] = 0;
  })(0, cap);
  return out;
}

/** Quy hoạch động trên số lượng còn lại: số cây tối thiểu cho mọi trạng thái. */
function solveExact(len, qty, cap) {
  const n = len.length, radix = [], stride = [];
  let states = 1;
  for (let t = 0; t < n; t++) { stride.push(states); radix.push(qty[t] + 1); states *= qty[t] + 1; }
  if (states > MAX_STATES) return null;
  const all = listPatterns(len, cap, qty);
  if (all.length > MAX_PATTERNS) return null;
  // chỉ giữ kiểu cắt "đầy" (không thêm được chiếc nào nữa) – kiểu bị cắt bớt khi dư số lượng
  const full = all.filter(p => p.c.every((v, t) => v === qty[t] || p.used + len[t] > cap + EPS));
  const best = new Int32Array(states).fill(1 << 30), pick = new Int32Array(states).fill(-1);
  best[0] = 0;
  const dec = s => { const v = []; for (let t = 0; t < n; t++) v.push(Math.floor(s / stride[t]) % radix[t]); return v; };
  for (let s = 1; s < states; s++) {
    const v = dec(s);
    for (let pi = 0; pi < full.length; pi++) {
      const c = full[pi].c; let r = 0, moved = false;
      for (let t = 0; t < n; t++) { const k = Math.min(c[t], v[t]); if (k) moved = true; r += (v[t] - k) * stride[t]; }
      if (moved && best[r] + 1 < best[s]) { best[s] = best[r] + 1; pick[s] = pi; }
    }
  }
  return { best, pick, full, all, stride, radix, dec, states };
}

/** Phương án dự phòng khi bài toán quá lớn: xếp dài trước (chưa chứng minh tối ưu). */
function solveGreedy(len, qty, cap) {
  const items = [];
  len.forEach((l, t) => { for (let k = 0; k < qty[t]; k++) items.push(t); });
  items.sort((a, b) => len[b] - len[a]);
  const bars = [];
  for (const t of items) {
    let bi = -1, room = Infinity;
    bars.forEach((b, i) => { const r = cap - b.used - len[t]; if (r >= -EPS && r < room) { room = r; bi = i; } });
    if (bi < 0) { bars.push({ c: new Array(len.length).fill(0), used: 0 }); bi = bars.length - 1; }
    bars[bi].c[t]++; bars[bi].used += len[t];
  }
  return bars.map(b => b.c);
}

export function calculateBars(input) {
  const i = { ...input };
  for (const k of ['stockL', 'kerf', 'trim', 'remnantMin', 'kgPerM'])
    if (!Number.isFinite(i[k]) || i[k] < 0 || i[k] > LIMIT) fail('Thông số không hợp lệ: ' + k);
  if (i.stockL <= 0 || i.kgPerM <= 0) fail('Kiểm tra chiều dài cây và khối lượng mét.');
  const stockQty = Number.isInteger(i.stockQty) && i.stockQty > 0 ? i.stockQty : 0;
  const parts = (i.parts || []).filter(p => p && p.qty > 0);
  if (!parts.length) fail('Nhập ít nhất một chi tiết có số lượng.');
  if (parts.length > MAX_TYPES) fail(`Tối đa ${MAX_TYPES} loại chi tiết.`);
  const usable = i.stockL - i.trim;
  if (usable <= 0) fail('Phần cắt bỏ đầu cây lớn hơn chiều dài cây.');
  for (const p of parts) {
    if (!Number.isFinite(p.length) || p.length <= 0 || !Number.isFinite(p.allowance) || p.allowance < 0 ||
        !Number.isInteger(p.qty) || p.qty > 100000) fail('Kiểm tra chiều dài và số lượng chi tiết.');
    if (p.length + p.allowance > usable + EPS) fail(`Chi tiết ${p.name || ''} dài hơn cây thép (đã tính dư gia công, cắt đầu cây).`);
  }
  const cutL = parts.map(p => p.length + p.allowance);
  const len = cutL.map(l => l + i.kerf);              // mỗi chiếc chiếm thêm 1 mạch cưa
  const cap = usable + i.kerf;                        // nhát cuối trùng đầu cây thì không mất mạch
  const qty = parts.map(p => p.qty);

  // ---------- giải
  const ex = solveExact(len, qty, cap);
  let patterns, proven;
  if (ex) {
    proven = true;
    const N = ex.best[ex.states - 1];
    // cây cuối: kiểu cắt dùng ít thép nhất mà phần còn lại vẫn đủ N − 1 cây -> cây lẻ dài nhất
    const subs = ex.all.slice().sort((a, b) => a.used - b.used);
    const start = ex.dec(ex.states - 1);
    let lastC = null, rest = ex.states - 1;
    for (const p of subs) {
      if (p.c.some((v, t) => v > start[t])) continue;
      const r = p.c.reduce((acc, v, t) => acc + (start[t] - v) * ex.stride[t], 0);
      if (ex.best[r] === N - 1) { lastC = p.c; rest = r; break; }
    }
    patterns = [];
    let s = rest, prev = -1;
    while (s > 0) {
      const v = ex.dec(s);
      // ưu tiên lặp lại kiểu cắt vừa dùng -> ít kiểu cắt khác nhau
      let pi = ex.pick[s];
      if (prev >= 0) {
        const c = ex.full[prev].c; let r = 0, moved = false;
        for (let t = 0; t < len.length; t++) { const k = Math.min(c[t], v[t]); if (k) moved = true; r += (v[t] - k) * ex.stride[t]; }
        if (moved && ex.best[r] === ex.best[s] - 1) pi = prev;
      }
      const c = ex.full[pi].c.map((k, t) => Math.min(k, v[t]));
      patterns.push(c);
      s -= c.reduce((acc, k, t) => acc + k * ex.stride[t], 0);
      prev = pi;
    }
    patterns.push(lastC);
  } else {
    proven = false;
    patterns = solveGreedy(len, qty, cap).sort((a, b) =>
      b.reduce((s, k, t) => s + k * len[t], 0) - a.reduce((s, k, t) => s + k * len[t], 0));
  }

  // ---------- dựng từng cây
  const bars = patterns.map(c => {
    const pieces = [];
    c.forEach((k, t) => { for (let j = 0; j < k; j++) pieces.push(t); });
    pieces.sort((a, b) => cutL[b] - cutL[a]);
    const cutTotal = pieces.reduce((s, t) => s + cutL[t], 0);
    const leftover = Math.max(0, usable - cutTotal - i.kerf * pieces.length);
    return { counts: c, pieces, leftover, recovered: leftover >= i.remnantMin - EPS };
  });
  // gom các cây giống nhau
  const groups = [];
  for (const b of bars) {
    const key = b.pieces.join(',') + '|' + b.leftover.toFixed(3);
    const g = groups.find(x => x.key === key);
    if (g) g.n++; else groups.push({ key, n: 1, ...b });
  }
  const lowerBound = Math.ceil(len.reduce((s, l, t) => s + l * qty[t], 0) / cap - 1e-9);
  const totalBars = bars.length;
  const issuedL = totalBars * i.stockL;
  const recoveredL = bars.reduce((s, b) => s + (b.recovered ? b.leftover : 0), 0);
  const finishedL = parts.reduce((s, p) => s + p.length * p.qty, 0);
  const kg = mm => mm / 1000 * i.kgPerM;
  return {
    input: { ...i, stockQty }, parts, cutL, totalBars, groups, proven, lowerBound,
    optimal: proven || totalBars === lowerBound,
    shortage: stockQty && totalBars > stockQty ? totalBars - stockQty : 0,
    issuedKG: kg(issuedL), recoveredKG: kg(recoveredL), finishedKG: kg(finishedL),
    recovered: bars.filter(b => b.recovered).map(b => b.leftover),
    wastePercent: 100 * (issuedL - recoveredL - finishedL) / finishedL,
    wasteNoRecoveryPercent: 100 * (issuedL - finishedL) / finishedL,
  };
}

/* ========================================================================= */
/* GIAO DIỆN                                                                 */
/* ========================================================================= */
const COLORS = [['#afa2eb', '#5c47b3'], ['#9bcffc', '#326bab'], ['#f6c58f', '#b06a12'], ['#a6e3c8', '#1f7a55'], ['#f4b2c6', '#a3365a']];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pretty = n => {
  if (!Number.isFinite(n)) return '—';
  const r = Math.round(n * 100) / 100;
  return r.toLocaleString('en-US', { maximumFractionDigits: 2 });
};
const parseNum = (raw, label, { integer = false } = {}) => {
  const v = Number(String(raw ?? '').replaceAll(',', '').trim());
  if (!Number.isFinite(v) || v < 0 || v > LIMIT) throw Error(`${label}: số không hợp lệ.`);
  if (integer && !Number.isInteger(v)) throw Error(`${label}: phải là số nguyên.`);
  return v;
};

function drawBars(res) {
  const W = 1080, L = res.input.stockL, rowH = 46, gapH = 30, x0 = 120, plotW = W - x0 - 24;
  const sc = plotW / L, rows = res.groups.length, H = 26 + rows * (rowH + gapH);
  let g = '';
  res.groups.forEach((b, r) => {
    const y = 18 + r * (rowH + gapH);
    g += `<text x="${x0 - 12}" y="${y + rowH / 2 + 6}" text-anchor="end" font-size="18" font-weight="800" fill="#5b2eb7" font-family="Arial,sans-serif">× ${b.n} cây</text>`;
    g += `<rect x="${x0}" y="${y}" width="${plotW}" height="${rowH}" fill="#f1ebfd" stroke="#793afa" stroke-width="1.5"/>`;
    let x = res.input.trim;
    if (res.input.trim > 0) g += `<rect x="${x0}" y="${y}" width="${(res.input.trim * sc).toFixed(2)}" height="${rowH}" fill="#d9d4e6"/>`;
    for (const t of b.pieces) {
      const w = res.cutL[t] * sc, [fill, edge] = COLORS[t % COLORS.length];
      g += `<rect x="${(x0 + x * sc).toFixed(2)}" y="${y}" width="${w.toFixed(2)}" height="${rowH}" fill="${fill}" stroke="${edge}" stroke-width="1"/>`;
      if (w > 46) g += `<text x="${(x0 + (x + res.cutL[t] / 2) * sc).toFixed(2)}" y="${y + rowH / 2 + 5}" text-anchor="middle" font-size="14" fill="#1d1652" font-family="Arial,sans-serif">${pretty(res.cutL[t])}</text>`;
      x += res.cutL[t] + res.input.kerf;
    }
    if (b.leftover > 0) {
      const lx = x0 + (L - b.leftover) * sc, w = b.leftover * sc;
      g += `<rect x="${lx.toFixed(2)}" y="${y}" width="${w.toFixed(2)}" height="${rowH}" fill="${b.recovered ? '#e3f8eb' : '#eeeeee'}" stroke="${b.recovered ? '#169a70' : '#9a9a9a'}" stroke-width="1"/>`;
      if (w > 60) g += `<text x="${(lx + w / 2).toFixed(2)}" y="${y + rowH / 2 + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="${b.recovered ? '#147451' : '#6b6b6b'}" font-family="Arial,sans-serif">${b.recovered ? 'CÂY LẺ ' : 'DƯ '}${pretty(b.leftover)}</text>`;
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sơ đồ cắt ${res.totalBars} cây thép">${'<rect width="' + W + '" height="' + H + '" fill="#faf7ff"/>' + g}</svg>`;
  return svg;
}

const CSS = `
.bar-pro{font-size:16px;color:#191c69;min-width:0}.bar-pro *{box-sizing:border-box}
.bar-pro .bp-sub{font-size:16px;color:#706d99;margin:0 0 12px}
.bar-pro .bp-grid{display:grid;grid-template-columns:minmax(430px,min(39%,555px)) minmax(0,1fr);gap:12px;align-items:stretch}
.bar-pro .bp-panel{background:#fff;border:1px solid #e4d3ff;border-radius:16px;padding:15px 16px;min-width:0}
.bar-pro .bp-title{color:#592ac1;font-size:20px;margin:0 0 12px;font-weight:850}
.bar-pro .bp-row{display:grid;gap:9px;margin-bottom:12px}.bar-pro .bp-row.three{grid-template-columns:repeat(3,minmax(0,1fr))}.bar-pro .bp-row.four{grid-template-columns:1.3fr 1fr 1fr 1fr}
.bar-pro label span{font-size:15px;font-weight:750;color:#251973;display:block;margin-bottom:4px;white-space:nowrap}
.bar-pro input{background:#fff;border:1px solid #d4b7ff;border-radius:10px;min-height:40px;width:100%;font-size:17px;color:#24156c;padding:6px 9px;outline:none;font-variant-numeric:tabular-nums}
.bar-pro input:focus{border-color:#7442ff;box-shadow:0 0 0 3px #7542ff21}
.bar-pro .is-kerf input{border:2px solid #5a9eff}.bar-pro .is-allow input{border:2px solid #f3a535}
.bar-pro h3{font-size:17px;margin:6px 0 8px;color:#5c29bf;font-weight:850;display:flex;align-items:center;gap:8px}
.bar-pro h3 i{display:inline-block;width:18px;height:14px;border:1px solid #5c47b3}
.bar-pro .bp-error{font-size:16px;color:#b52441;font-weight:650;margin:8px 0 0}.bar-pro .bp-error:empty{display:none}
.bar-pro .bp-figure{background:#faf7ff;border:1px solid #e7dafa;border-radius:12px;padding:10px;min-height:300px}
.bar-pro .bp-figure svg{width:100%;height:auto;display:block}
.bar-pro .bp-head{text-align:center;font-size:18px;color:#675295;font-weight:800;margin:0 0 8px}
.bar-pro .bp-caption{display:flex;justify-content:space-between;gap:9px;margin-top:10px;flex-wrap:wrap;color:#5b2eb7}
.bar-pro .bp-summary{font-size:20px;font-weight:850}.bar-pro .bp-proof{font-size:16px;color:#147451;font-weight:750}
.bar-pro .bp-strategy{color:#6a598b;font-size:16px;margin:6px 0 0}
.bar-pro .bp-export{background:#f9f6ff;border:1px solid #b59efc;border-radius:9px;color:#632dd6;padding:5px 12px;min-height:35px;font-size:16px;font-weight:700}
.bar-pro .bp-results{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}
.bar-pro .bp-res{background:#fff;border:1px solid #e1d5f9;border-radius:14px;padding:10px 13px;min-height:79px}
.bar-pro .bp-res.em{background:linear-gradient(115deg,#a943f7,#7930e8);color:#fff;border-color:transparent}
.bar-pro .bp-res strong{font-size:16px;display:block}.bar-pro .bp-res output{font-size:22px;font-weight:850;display:block;overflow-wrap:anywhere}
.bar-pro .bp-note{font-size:15px;color:#6a6691;text-align:center;margin:7px 0 0}
@media(max-width:1260px){.bar-pro .bp-grid{grid-template-columns:minmax(0,1fr)}}
@media(max-width:680px){.bar-pro .bp-row.three,.bar-pro .bp-row.four{grid-template-columns:repeat(2,minmax(0,1fr))}.bar-pro .bp-results{grid-template-columns:repeat(2,minmax(0,1fr))}}

/* Section library: compact, aligned and keyboard-accessible. */
.bar-pro .bp-row.three > label{display:flex;flex-direction:column;justify-content:flex-end;min-width:0}
.bar-pro .bp-row.three > label > span{font-size:16px;line-height:1.25;white-space:normal;overflow-wrap:normal}
.bar-pro .bp-row.four > label > span,.bar-pro label span{font-size:16px}
.bar-pro .bp-row.three input{flex:0 0 auto}
.bar-pro .bp-spec input{border-color:#b69bf4;background:#faf8ff;font-weight:800;color:#4d21b8}
.bar-pro .bp-weight-field input[readonly]{border:2px solid #8ed8c5;background:linear-gradient(115deg,#e6fff5,#f2fcff);color:#087453;font-weight:900}
.bar-pro .bp-weight-field input:not([readonly]){border:2px solid #f2b343;background:#fff9ec;color:#a35b08;font-weight:850}
.bar-pro .bp-weight-field input[readonly]:focus{box-shadow:none;outline:none}
.bar-pro .bp-profile-toolbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px 11px;margin:-5px 0 3px}
.bar-pro .bp-profile-picker{display:block;min-width:180px;flex:1 1 205px;max-width:100%;min-height:36px;border:1px solid #c7b6f7;border-radius:9px;background:linear-gradient(120deg,#f7f2ff,#eef3ff);color:#5929b9;padding:4px 8px;font-size:16px;font-weight:800;text-overflow:ellipsis;cursor:pointer}
.bar-pro .bp-profile-picker:disabled{opacity:.7;cursor:progress}
.bar-pro .bp-profile-picker:focus-visible{outline:2px solid #7b39e8;outline-offset:2px}
.bar-pro .bp-profile-announcer{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.bar-pro .bp-profile-status{font-size:16px;font-weight:750;color:#5744a3}
.bar-pro .bp-weight-toggle{display:inline-flex;align-items:center;gap:7px;cursor:pointer;user-select:none;flex-shrink:0}
.bar-pro .bp-weight-toggle input[type=checkbox]{width:19px;height:19px;min-height:19px;margin:0;accent-color:#7433e8;flex-shrink:0}
.bar-pro .bp-weight-toggle span{font-size:16px;line-height:1.3;font-weight:750;margin:0;white-space:normal;color:#592cbb}
.bar-pro .bp-profile-details{font-size:16px;line-height:1.3;display:flex;flex-wrap:wrap;gap:5px 10px;align-items:baseline;color:#5c6794;margin:0 0 12px;min-height:18px}
.bar-pro .bp-profile-details.bp-profile-warning{color:#a75b08}
.bar-pro .bp-profile-details a{color:#5d2ac5;text-decoration:underline;text-underline-offset:2px;font-weight:750}
.bar-pro .bp-stock-row{margin-bottom:10px}
.bar-pro .bp-stock-inline{display:grid;grid-template-columns:minmax(0,1fr) minmax(105px,145px);align-items:center;gap:10px;min-width:0}
.bar-pro .bp-stock-inline>span{font-size:16px;line-height:1.25;margin:0;white-space:normal}
.bar-pro .bp-stock-inline input{min-width:0}
.bar-pro .bp-note{font-size:16px}
@media(max-width:680px){
 .bar-pro .bp-stock-inline{grid-template-columns:minmax(0,1fr) minmax(98px,140px)}
 .bar-pro .bp-row.three>label{min-width:0}
 .bar-pro .bp-profile-toolbar{gap:7px}
}
`;

const DEFAULTS = {
  spec: 'H125', kgPerM: '23.8', stockL: '12000', stockQty: '0', kerf: '3', trim: '0', remnantMin: '1000',
  parts: [{ name: 'CT1', length: '2450', allowance: '0', qty: '6' }, { name: 'CT2', length: '3100', allowance: '0', qty: '4' }],
};
let saved = null;

// Additional public catalog data lives inside the first steel entry in materials.json.
// The shared density catalog intentionally drops unknown metadata, so load raw JSON here.
const profileKey = value => String(value ?? '').toUpperCase().trim().replace(/[\s×]/g, c => c === '×' ? 'X' : '').replace(/,/g, '.');
async function loadSteelProfileCatalog(){
  const url = new URL('./assets/data/materials.json', document.baseURI);
  const response = await fetch(url, {cache:'no-cache'});
  if (!response.ok) throw Error('HTTP ' + response.status);
  const list = await response.json();
  if(!Array.isArray(list) || list.length > 2000) throw Error('materials.json không hợp lệ');
  const steel = list.find(row => row && row.name === 'Thép');
  const raw = steel?.steelProfiles?.profiles;
  if(!Array.isArray(raw) || !raw.length || raw.length > 500) throw Error('Chưa có thư viện quy cách thép hình');
  const profiles=[], seen=new Set();
  for(const row of raw){
    if(!row || typeof row.code!=='string' || row.code.length>55 || !/^[A-Za-z0-9.\-]+$/.test(row.code) ||
       typeof row.family!=='string' || !['H','I','UPN','V'].includes(row.family) ||
       typeof row.dimensions!=='string' || row.dimensions.length>70 ||
       !Number.isFinite(row.kgPerM) || row.kgPerM<=0 || row.kgPerM>5000) throw Error('Quy cách thép không hợp lệ');
    const key=profileKey(row.code);
    if(seen.has(key)) throw Error('Mã quy cách bị trùng');
    seen.add(key);
    profiles.push({code:row.code,family:row.family,dimensions:row.dimensions,kgPerM:row.kgPerM,standard:String(row.standard||''),source:String(row.source||'')});
  }
  return profiles;
}

export function mount(root, ctx = {}) {
  const st = saved ? structuredClone(saved) : structuredClone(DEFAULTS);
  st.manualKg = Boolean(st.manualKg);
  let last = null, lastSVG = '', timer = null, disposed = false;
  let steelProfiles = [], profilesReady = false, profilesFailed = false;
  let profilesByCode = new Map();
  const fld = (name, label, val, cls = '') =>
    `<label class="${cls}"><span>${esc(label)}</span><input name="${name}" value="${esc(val)}" inputmode="decimal" autocomplete="off"></label>`;
  root.innerHTML = `<style>${CSS}</style><div class="bar-pro">
  <p class="bp-sub">Cắt thép hình 1D · Chiều dài thành phẩm (mm) · Tối ưu số cây</p>
  <div class="bp-grid">
   <section class="bp-panel"><h2 class="bp-title">THÉP HÌNH &amp; CHI TIẾT</h2>
    <div class="bp-row three">
     <label class="bp-spec"><span>Quy cách</span><input name="spec" list="bp-profile-options" title="Nhập mã hoặc chọn quy cách thép hình từ danh sách gợi ý" value="${esc(st.spec)}" autocomplete="off" maxlength="55" aria-describedby="bp-profile-detail"></label>
     <label class="bp-weight-field"><span>Khối lượng (kg/m)</span><input name="kgPerM" value="${esc(st.kgPerM)}" inputmode="decimal" autocomplete="off" ${st.manualKg?'':'readonly aria-readonly="true"'} aria-describedby="bp-profile-detail"></label>
     ${fld('stockL', 'Dài cây (mm)', st.stockL)}
    </div>
    <datalist id="bp-profile-options"></datalist>
    <div class="bp-profile-toolbar"><select class="bp-profile-picker" id="bp-profile-picker" aria-label="Thư viện thép hình" disabled><option value="">Đang nạp thư viện…</option></select><span class="bp-profile-announcer" id="bp-profile-status" role="status" aria-live="polite">Đang nạp thư viện…</span>
     <label class="bp-weight-toggle"><input type="checkbox" id="bp-allow-edit-kg" ${st.manualKg?'checked':''}><span>Chỉnh KL/m dài</span></label>
    </div>
    <div class="bp-profile-details" id="bp-profile-detail"><span id="bp-profile-description">Khối lượng tham khảo, cần đối chiếu barem khi sử dụng chính thức.</span><a id="bp-profile-source" href="#" target="_blank" rel="noopener noreferrer" hidden>Nguồn tra</a></div>
    <div class="bp-row three">${fld('kerf', 'Mạch cưa (mm)', st.kerf, 'is-kerf')}${fld('trim', 'Cắt bỏ đầu cây (mm)', st.trim)}${fld('remnantMin', 'Cây lẻ thu hồi ≥ (mm)', st.remnantMin)}</div>
    <div class="bp-row bp-stock-row"><label class="bp-stock-inline"><span>Số cây có (0 = không giới hạn)</span><input name="stockQty" value="${esc(st.stockQty)}" inputmode="numeric" autocomplete="off"></label></div>
    ${st.parts.map((p, t) => `<h3><i style="background:${COLORS[t][0]};border-color:${COLORS[t][1]}"></i>Chi tiết ${t + 1}</h3>
    <div class="bp-row four">${fld(`name${t}`, 'Tên / mã', p.name)}${fld(`length${t}`, 'Dài TP (mm)', p.length)}${fld(`allowance${t}`, 'Dư gia công', p.allowance, 'is-allow')}${fld(`qty${t}`, 'Số lượng', p.qty)}</div>`).join('')}
    <p class="bp-error" id="bp-error" role="alert"></p>
   </section>
   <section class="bp-panel">
    <div class="bp-figure"><div class="bp-head" id="bp-head">SƠ ĐỒ CẮT</div><div id="bp-figure"></div></div>
    <div class="bp-caption"><strong class="bp-summary" id="bp-summary">—</strong><span class="bp-proof" id="bp-proof"></span></div>
    <div class="bp-caption"><p class="bp-strategy" id="bp-strategy">—</p><button class="bp-export" type="button" id="bp-export" disabled>↓ Tải sơ đồ SVG</button></div>
   </section>
  </div>
  <section class="bp-results">
   <div class="bp-res"><strong>Xuất kho (kg)</strong><output id="bp-issued">—</output></div>
   <div class="bp-res"><strong>Thành phẩm (kg)</strong><output id="bp-finished">—</output></div>
   <div class="bp-res em"><strong>Hao phí / TP (%)</strong><output id="bp-waste">—</output></div>
   <div class="bp-res"><strong>Cây lẻ thu hồi (mm)</strong><output id="bp-remnant">—</output></div>
  </section>
  <p class="bp-note">Hao phí = (Xuất kho − Cây lẻ thu hồi − Thành phẩm) / Thành phẩm × 100. Cây lẻ chỉ tính thu hồi khi đạt ngưỡng.</p>
 </div>`;
  const $ = id => root.querySelector('#' + id);
  const put = (id, text) => (setText ? setText(root, '#' + id, text) : ($(id).textContent = text));
  const val = n => root.querySelector(`[name="${n}"]`).value;
  const specInput = root.querySelector('[name="spec"]');
  const weightInput = root.querySelector('[name="kgPerM"]');
  const weightEdit = $('bp-allow-edit-kg');
  const profilePicker = $('bp-profile-picker');
  const profileDesc = $('bp-profile-description');
  const profileSource = $('bp-profile-source');
  const profileStatus = $('bp-profile-status');

  function updateReferenceWeight(){
    const match = profilesByCode.get(profileKey(specInput.value));
    if(profilesReady) profilePicker.value=match?.code||'';
    const isManual = weightEdit.checked;
    weightInput.readOnly = !isManual;
    weightInput.setAttribute('aria-readonly',String(!isManual));
    if(!isManual){
      if(match) weightInput.value=String(match.kgPerM);
      else if(!profilesReady && !profilesFailed && profileKey(specInput.value)==='H125') weightInput.value='23.8';
      else if(profilesFailed && profileKey(specInput.value)==='H125') weightInput.value='23.8';
      else weightInput.value='';
    }
    if(match){
      const base=`${match.family} · ${match.dimensions} mm · ${match.kgPerM} kg/m (tham khảo)`;
      profileDesc.textContent=isManual?`${base} · Đang nhập KL/m riêng`:base;
      try {
        const u=new URL(match.source);
        if(u.protocol==='https:'){profileSource.href=u.href;profileSource.hidden=false;}
        else profileSource.hidden=true;
      }catch{profileSource.hidden=true;}
    }else{
      profileSource.hidden=true;
      profileDesc.textContent=profilesFailed
        ? 'Chưa tải được thư viện. Chỉ H125 dùng giá trị mẫu; quy cách khác cần tích Chỉnh KL/m dài.'
        : profilesReady
          ? 'Quy cách chưa có trong thư viện. Hãy chọn mã gợi ý hoặc tích Chỉnh KL/m dài.'
          : 'Đang tra thư viện quy cách thép hình…';
    }
    $('bp-profile-detail').classList.toggle('bp-profile-warning',Boolean((!match && (profilesReady||profilesFailed))));
    st.kgPerM=weightInput.value;
    st.manualKg=isManual;
  }

  async function initProfiles(){
    try{
      const rows=await loadSteelProfileCatalog();
      if(disposed || ctx.signal?.aborted) return;
      steelProfiles=rows; profilesByCode=new Map(rows.map(p=>[profileKey(p.code),p]));
      profilesReady=true; profilesFailed=false;
      const frag=document.createDocumentFragment();
      for(const p of rows){
        const opt=document.createElement('option');
        opt.value=p.code;
        opt.label=`${p.family}: ${p.dimensions} mm · ${p.kgPerM} kg/m`;
        frag.appendChild(opt);
      }
      $('bp-profile-options').replaceChildren(frag);
      profilePicker.replaceChildren(new Option(`📚 Chọn thép hình (${rows.length} quy cách)`,''));
      for(const family of ['H','I','UPN','V']){
        const group=document.createElement('optgroup');
        group.label=family==='UPN'?'Thép UPN (EN)':`Thép ${family}`;
        for(const p of rows.filter(row=>row.family===family)){
          const opt=new Option(`${p.code} · ${p.dimensions} mm · ${p.kgPerM} kg/m`,p.code);
          group.appendChild(opt);
        }
        profilePicker.appendChild(group);
      }
      profilePicker.disabled=false;
      profileStatus.textContent=`Thư viện: ${rows.length} quy cách H / I / UPN / V`;
      updateReferenceWeight();
      schedule();
    }catch(e){
      if(disposed || ctx.signal?.aborted) return;
      profilesReady=false; profilesFailed=true;
      profileStatus.textContent='Thư viện chưa tải được';
      profilePicker.replaceChildren(new Option('Không tải được thư viện',''));
      profilePicker.disabled=true;
      updateReferenceWeight();
      schedule();
    }
  }

  function collect() {
    for (const k of ['spec', 'kgPerM', 'stockL', 'stockQty', 'kerf', 'trim', 'remnantMin']) st[k] = val(k);
    st.manualKg=weightEdit.checked;
    st.parts.forEach((p, t) => { p.name = val(`name${t}`); p.length = val(`length${t}`); p.allowance = val(`allowance${t}`); p.qty = val(`qty${t}`); });
    saved = structuredClone(st);
  }
  function payload() {
    if(!st.manualKg && !profilesByCode.has(profileKey(st.spec)) && (profilesReady || profileKey(st.spec)!=='H125'))
      throw Error('Quy cách chưa có trong thư viện. Chọn quy cách có sẵn hoặc tích “Chỉnh KL/m dài”.');
    if(!String(st.kgPerM).trim()) throw Error('Chưa có khối lượng/m dài. Hãy chọn quy cách hoặc tích “Chỉnh KL/m dài”.');
    return {
      kgPerM: parseNum(st.kgPerM, 'Khối lượng mét'), stockL: parseNum(st.stockL, 'Dài cây'),
      stockQty: parseNum(st.stockQty, 'Số cây có', { integer: true }), kerf: parseNum(st.kerf, 'Mạch cưa'),
      trim: parseNum(st.trim, 'Cắt bỏ đầu cây'), remnantMin: parseNum(st.remnantMin, 'Ngưỡng cây lẻ'),
      parts: st.parts.map((p, t) => ({ name: p.name || `CT${t + 1}`, length: parseNum(p.length, `Dài chi tiết ${t + 1}`),
        allowance: parseNum(p.allowance, `Dư gia công chi tiết ${t + 1}`), qty: parseNum(p.qty, `Số lượng chi tiết ${t + 1}`, { integer: true }) })),
    };
  }
  function invalid(msg) {
    last = null; lastSVG = ''; $('bp-figure').textContent = ''; $('bp-export').disabled = true;
    put('bp-error', msg); for (const id of ['bp-summary', 'bp-proof', 'bp-strategy', 'bp-issued', 'bp-finished', 'bp-waste', 'bp-remnant']) put(id, '—');
    put('bp-proof', '');
  }
  function compute() {
    let res;
    try { collect(); res = calculateBars(payload()); }
    catch (e) { invalid(e instanceof UserError || e instanceof Error ? e.message : 'Không tính được.'); return; }
    last = res;
    const svg = drawBars(res);
    $('bp-figure').innerHTML = svg; lastSVG = svg; $('bp-export').disabled = false;
    put('bp-head', `SƠ ĐỒ CẮT ${st.spec || ''} – CÂY ${pretty(res.input.stockL)} mm`);
    put('bp-summary', `${res.totalBars} cây ${pretty(res.input.stockL / 1000)} m` + (res.shortage ? ` · THIẾU ${res.shortage} cây so với kho` : ''));
    put('bp-proof', res.proven ? '✓ Số cây tối thiểu – đã chứng minh' : (res.optimal ? '✓ Đạt cận dưới – tối ưu' : `Cận dưới ${res.lowerBound} cây · chưa chứng minh tối ưu`));
    put('bp-strategy', `${res.groups.length} kiểu cắt · phần dư dồn về một cây` +
      ` · Hao phí nếu không thu hồi: ${res.wasteNoRecoveryPercent.toFixed(2)} %`);
    put('bp-issued', pretty(res.issuedKG)); put('bp-finished', pretty(res.finishedKG));
    put('bp-waste', res.wastePercent.toFixed(2));
    put('bp-remnant', res.recovered.length ? res.recovered.map(pretty).join(' ; ') : 'Không có');
    put('bp-error', '');
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(compute, 200); };
  root.addEventListener('input', e => {
    if(!e.target.matches('input[name]'))return;
    if(e.target === specInput){
      // A different section should never silently inherit a previous manual mass.
      if(weightEdit.checked)weightEdit.checked=false;
      updateReferenceWeight();
    }
    schedule();
  }, ctx.signal ? { signal: ctx.signal } : undefined);
  profilePicker.addEventListener('change',()=>{
    const selection=profilesByCode.get(profileKey(profilePicker.value));
    if(!selection)return;
    specInput.value=selection.code;
    weightEdit.checked=false;
    updateReferenceWeight();
    collect();
    schedule();
  },ctx.signal ? {signal:ctx.signal}:undefined);
  weightEdit.addEventListener('change',()=>{
    updateReferenceWeight();
    collect();
    if(weightEdit.checked)weightInput.focus();
    schedule();
  },ctx.signal ? {signal:ctx.signal}:undefined);
  $('bp-export').addEventListener('click', () => {
    if (!lastSVG) return;
    const blob = new Blob([lastSVG], { type: 'image/svg+xml;charset=utf-8' });
    if (downloadBlob) downloadBlob(blob, 'epsilon-soft-cat-thep-hinh.svg');
    ctx.showToast?.('Đã tạo sơ đồ SVG.');
  }, ctx.signal ? { signal: ctx.signal } : undefined);
  updateReferenceWeight();
  compute();
  void initProfiles();
  return () => {disposed=true;clearTimeout(timer);};
}
