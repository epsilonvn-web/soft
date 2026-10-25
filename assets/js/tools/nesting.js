/**
 * Epsilon Soft - Trải phôi 2D (Web) – BẢN TEST NỘI BỘ (một file, có thuật toán)
 * !!! File này chứa toàn bộ thuật toán. Chỉ dùng để test nội bộ, KHÔNG đưa lên web công khai.
 * !!! Khi phát hành dùng bản tách: public/nesting.js + API máy chủ (xem HUONG_DAN_BAO_MAT).
 * Quy ước: kích thước thành phẩm + dư gia công (tổng); mạch cắt k giữa hai chi tiết;
 * chừa mép đúng bằng số nhập (được = 0); tấm lẻ giữ lại khi ≥ 200 mm;
 * ưu tiên số chiếc tối đa, bằng nhau chọn sơ đồ ít khối; báo cận trên / còn dư địa.
 * Bản quyền © Epsilon Lab.
 */
const {field, number: pretty, numeric, icon, setText, downloadBlob} = globalThis.EpsilonSoftShared || {};

const MAX_PREVIEW=900, LIMIT=1e6, EPS=1e-7;
// The four Portable presets are UI shortcuts only; names and densities load from materials.json.
const quickMaterialLabels=['Thép','Inox','Nhôm','Đồng'];
const loadMaterials=()=>{
 const shared=globalThis.EpsilonSoftShared?.loadMaterialsCatalog;
 if(typeof shared==='function')return shared();
 return fetch(new URL('./assets/data/materials.json',document.baseURI),{cache:'no-cache'}).then(r=>{
  if(!r.ok)throw Error('Không đọc được materials.json (HTTP '+r.status+').');return r.json();
 });
};
const DP_COST_LIMIT = 6e8;          // khối lượng phép tính tối đa của bước 1
// pinwheelWork: khối lượng tìm kiếm tối đa của bước 3 (đếm số phép thử, không phụ thuộc đồng hồ –
// Cloudflare Workers không cho đồng hồ chạy trong lúc tính).
const DEFAULTS = Object.freeze({ remnantMin: 200, pinwheelMs: 2500, pinwheelWork: 2e7 });

class UserError extends Error {}           // lỗi do số liệu người dùng nhập
const fail = msg => { throw new UserError(msg); };
const r6 = v => Math.round(v * 1e6) / 1e6;

/* ======================================================================= */
/* 1. CHỮ NHẬT – CHẶT SUỐT NHIỀU CẤP                                        */
/* ======================================================================= */

/** Các vị trí cắt có nghĩa trên chiều dài L: i*A + j*B ≤ L. pureOnly = chỉ bội số thuần. */
function normalPoints(L, A, B, pureOnly = false) {
  const s = new Set();
  if (pureOnly) {
    for (let i = 1; i * A <= L + EPS; i++) s.add(r6(i * A));
    for (let j = 1; j * B <= L + EPS; j++) s.add(r6(j * B));
  } else {
    const ni = Math.floor(L / A + 1e-9);
    for (let i = 0; i <= ni; i++) {
      const nj = Math.floor((L - i * A) / B + 1e-9);
      for (let j = 0; j <= nj; j++) {
        const v = r6(i * A + j * B);
        if (v > 0 && v <= L + EPS) s.add(v);
      }
      if (s.size > 40000) break;     // an toàn bộ nhớ – phương án dự phòng sẽ xử lý
    }
  }
  return Float64Array.from([...s].sort((a, b) => a - b));
}

/** Chỉ số lớn nhất có P[idx] ≤ v (−1 nếu không có). */
function floorIdx(P, v) {
  let lo = 0, hi = P.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (P[mid] <= v + EPS) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/**
 * Bảng quy hoạch động: F[i][j] = số chiếc tối đa trên miếng X[i] × Y[j].
 * Toạ độ "quy đổi": mỗi chi tiết chiếm (a+k) × (b+k); vùng dùng được cộng thêm k.
 */
function buildTable(WW, HH, a, b, k, pureOnly) {
  const A = a + k, B = b + k;
  const X = normalPoints(WW, A, B, pureOnly), Y = normalPoints(HH, A, B, pureOnly);
  const nx = X.length, ny = Y.length;
  if (!nx || !ny) return null;
  const cost = nx * nx * ny / 2 + ny * ny * nx / 2;
  if (cost > DP_COST_LIMIT) return { tooBig: true };
  const N = nx * ny;
  const F = new Int32Array(N), BL = new Int32Array(N), T = new Int8Array(N), P = new Int32Array(N);
  for (let j = 0; j < ny; j++) {
    const h = Y[j];
    for (let i = 0; i < nx; i++) {
      const w = X[i], id = i * ny + j;
      const n1 = Math.floor(w / A + 1e-9) * Math.floor(h / B + 1e-9);
      const n2 = Math.floor(w / B + 1e-9) * Math.floor(h / A + 1e-9);
      let best = n1 >= n2 ? n1 : n2, blocks = best > 0 ? 1 : 0, type = n1 >= n2 ? 0 : 1, pos = -1;
      // nhát dọc tại X[p] (chỉ xét nửa trái để không trùng)
      let q = i;
      for (let p = 0; p < nx && X[p] <= w / 2 + EPS; p++) {
        const rest = w - X[p];
        while (q >= 0 && X[q] > rest + EPS) q--;
        const pid = p * ny + j, qid = q * ny + j;
        const c = F[pid] + (q >= 0 ? F[qid] : 0);
        const bl = BL[pid] + (q >= 0 ? BL[qid] : 0);
        if (c > best || (c === best && c > 0 && bl < blocks)) { best = c; blocks = bl; type = 2; pos = p; }
      }
      // nhát ngang tại Y[p]
      q = j;
      for (let p = 0; p < ny && Y[p] <= h / 2 + EPS; p++) {
        const rest = h - Y[p];
        while (q >= 0 && Y[q] > rest + EPS) q--;
        const pid = i * ny + p, qid = i * ny + q;
        const c = F[pid] + (q >= 0 ? F[qid] : 0);
        const bl = BL[pid] + (q >= 0 ? BL[qid] : 0);
        if (c > best || (c === best && c > 0 && bl < blocks)) { best = c; blocks = bl; type = 3; pos = p; }
      }
      F[id] = best; BL[id] = blocks; T[id] = type; P[id] = pos;
    }
  }
  return { X, Y, nx, ny, F, BL, T, P, A, B, k, a, b };
}

/** Số chiếc của miếng bất kỳ w × h (quy đổi) theo bảng. */
function countAny(tb, w, h) {
  const i = floorIdx(tb.X, w), j = floorIdx(tb.Y, h);
  return i < 0 || j < 0 ? 0 : tb.F[i * tb.ny + j];
}

/** Dựng lại toạ độ chi tiết và đường cắt của miếng w × h đặt tại (x0, y0). */
function placeAny(tb, x0, y0, w, h, out, cuts) {
  const i = floorIdx(tb.X, w), j = floorIdx(tb.Y, h);
  if (i >= 0 && j >= 0) placeIdx(tb, i, j, x0, y0, out, cuts);
}
function placeIdx(tb, i, j, x0, y0, out, cuts) {
  const { X, Y, ny, F, T, P, A, B, k } = tb, id = i * ny + j;
  if (!F[id]) return;
  const w = X[i], h = Y[j], t = T[id];
  if (t <= 1) {
    const pw = t === 0 ? A : B, ph = t === 0 ? B : A;
    const cx = Math.floor(w / pw + 1e-9), cy = Math.floor(h / ph + 1e-9);
    for (let c = 0; c < cx; c++) for (let r = 0; r < cy; r++)
      out.push({ x: x0 + c * pw, y: y0 + r * ph, w: pw - k, h: ph - k });
    if (cuts) {
      for (let r = 1; r < cy; r++) cuts.push({ x1: x0, y1: y0 + r * ph - k / 2, x2: x0 + cx * pw - k, y2: y0 + r * ph - k / 2 });
      for (let c = 1; c < cx; c++) cuts.push({ x1: x0 + c * pw - k / 2, y1: y0, x2: x0 + c * pw - k / 2, y2: y0 + cy * ph - k });
      if (cx * pw < w - EPS) cuts.push({ x1: x0 + cx * pw - k / 2, y1: y0, x2: x0 + cx * pw - k / 2, y2: y0 + h - k });
      if (cy * ph < h - EPS) cuts.push({ x1: x0, y1: y0 + cy * ph - k / 2, x2: x0 + Math.min(w, cx * pw) - k, y2: y0 + cy * ph - k / 2 });
    }
  } else if (t === 2) {
    const xs = X[P[id]];
    if (cuts) cuts.push({ x1: x0 + xs - k / 2, y1: y0, x2: x0 + xs - k / 2, y2: y0 + h - k });
    placeIdx(tb, P[id], j, x0, y0, out, cuts);
    placeAny(tb, x0 + xs, y0, w - xs, h, out, cuts);
  } else {
    const ys = Y[P[id]];
    if (cuts) cuts.push({ x1: x0, y1: y0 + ys - k / 2, x2: x0 + w - k, y2: y0 + ys - k / 2 });
    placeIdx(tb, i, P[id], x0, y0, out, cuts);
    placeAny(tb, x0, y0 + ys, w, h - ys, out, cuts);
  }
}

/** Cận trên: diện tích "xếp được thật" / diện tích 1 chi tiết (đã cộng mạch). */
function upperBound(WW, HH, A, B) {
  const best = (L) => {           // tổ hợp i*A + j*B lớn nhất ≤ L
    let m = 0;
    for (let i = 0; i * A <= L + EPS; i++) m = Math.max(m, i * A + Math.floor((L - i * A) / B + 1e-9) * B);
    return m;
  };
  return Math.floor(best(WW) * best(HH) / (A * B) + 1e-9);
}

/** Bố trí 5 khối xoay vòng (không chặt suốt) – chỉ cho laser/plasma. */
function pinwheel(tb, WW, HH, target, deadline, maxWork) {
  const raster = (P, L) => {
    const s = new Set(P);
    for (const v of P) { const r = floorIdx(P, L - v); if (r >= 0) s.add(P[r]); }
    return [...s].filter(v => v > EPS && v < L - EPS).sort((a, b) => a - b);
  };
  const rx = raster(tb.X, WW), ry = raster(tb.Y, HH);
  const unit = tb.A * tb.B, area = WW * HH;
  let best = { n: 0, cut: null }, iter = 0, work = 0, complete = true;
  outer:
  for (let a = 0; a < rx.length; a++) {
    const x1 = rx[a];
    for (let b = a + 1; b < rx.length; b++) {
      const x2 = rx[b];
      for (let c = 0; c < ry.length; c++) {
        const y1 = ry[c];
        if ((++iter & 1023) === 0 && Date.now() > deadline) { complete = false; break outer; }
        if (work > maxWork) { complete = false; break outer; }
        const k2 = countAny(tb, WW - x1, y1);
        const k3 = countAny(tb, WW - x2, HH - y1);
        // cắt tỉa: phần còn lại dù xếp kín cũng không vượt được kết quả tốt nhất
        const restArea = area - (WW - x1) * y1 - (WW - x2) * (HH - y1);
        if (k2 + k3 + Math.floor(restArea / unit + 1e-9) <= best.n) continue;
        work += ry.length - c;
        for (let d = c + 1; d < ry.length; d++) {
          const y2 = ry[d];
          const n = countAny(tb, x1, y2) + k2 + k3 + countAny(tb, x2, HH - y2) + countAny(tb, x2 - x1, y2 - y1);
          if (n > best.n) { best = { n, cut: [x1, x2, y1, y2] }; if (n >= target) break outer; }
        }
      }
    }
  }
  return { ...best, complete, work };
}
function placePinwheel(tb, cut, WW, HH, e, out) {
  const [x1, x2, y1, y2] = cut;
  placeAny(tb, e, e, x1, y2, out, null);                         // K1
  placeAny(tb, e + x1, e, WW - x1, y1, out, null);               // K2
  placeAny(tb, e + x2, e + y1, WW - x2, HH - y1, out, null);     // K3
  placeAny(tb, e, e + y2, x2, HH - y2, out, null);               // K4
  placeAny(tb, e + x1, e + y1, x2 - x1, y2 - y1, out, null);     // ô giữa
}

/** Chuẩn bị bảng cho tấm W × H; tự hạ cấp nếu bài toán quá lớn. */
function rectTable(W, H, a, b, k, e) {
  const WW = W - 2 * e + k, HH = H - 2 * e + k;
  let tb = buildTable(WW, HH, a, b, k, false), exact = true;
  if (!tb || tb.tooBig) { tb = buildTable(WW, HH, a, b, k, true); exact = false; }
  if (!tb || tb.tooBig) fail('Chi tiết quá nhỏ so với tấm – hãy tăng kích thước chi tiết.');
  return { tb, WW, HH, exact };
}

/** Xếp chữ nhật trên tấm đầy đủ. */
function rectFull(i, a, b) {
  const k = i.gap, e = i.margin, shear = i.cutMethod === 'shear';
  const { tb, WW, HH, exact } = rectTable(i.sheetW, i.sheetH, a, b, k, e);
  const layout = [], cuts = [];
  const full = tb.F[tb.nx * tb.ny - 1];
  placeIdx(tb, tb.nx - 1, tb.ny - 1, e, e, layout, shear ? cuts : null);
  const ub = upperBound(WW, HH, a + k, b + k);
  let strategy = tb.BL[tb.nx * tb.ny - 1] > 1 ? 'guillotine' : 'grid', searchComplete = exact;
  if (!shear && full < ub) {
    const pw = pinwheel(tb, WW, HH, ub, Date.now() + (i.pinwheelMs ?? DEFAULTS.pinwheelMs), i.pinwheelWork ?? DEFAULTS.pinwheelWork);
    if (!pw.complete) searchComplete = false;
    if (pw.n > full) { layout.length = 0; placePinwheel(tb, pw.cut, WW, HH, e, layout); strategy = 'rotary'; }
  }
  if (shear) strategy = 'shear';
  return { tb, layout, cuts, strategy, upper: ub, searchComplete, WW, HH };
}

/** Điền tay: dải ngắn nhất (nguyên chiều rộng tấm) chứa đủ qty chi tiết – chặt suốt. */
function rectStrip(i, a, b, qty, tb) {
  const k = i.gap, e = i.margin, shear = i.cutMethod === 'shear';
  const jm = tb.ny - 1;
  let idx = -1;
  for (let x = 0; x < tb.nx; x++) if (tb.F[x * tb.ny + jm] >= qty) { idx = x; break; }
  if (idx < 0) return null;
  const all = [], cuts = [];
  placeIdx(tb, idx, jm, e, e, all, shear ? cuts : null);
  all.sort((p, q) => p.x - q.x || p.y - q.y);
  const layout = all.slice(0, qty);
  const right = Math.max(...layout.map(p => p.x + p.w));
  return { layout, cuts: cuts.filter(c => Math.min(c.x1, c.x2) < right + EPS), used: right + e };
}

/* ======================================================================= */
/* 2. TRÒN – LƯỚI VUÔNG VÀ SO LE                                           */
/* ======================================================================= */
function grid(avail, unit, gap) {
  if (unit <= 0 || avail + EPS < unit) return 0;
  return Math.max(0, Math.min(LIMIT, Math.floor((avail + gap) / (unit + gap) + 1e-10)));
}
function circleRows(height, d, step) {
  if (d <= 0 || step <= 0 || height + EPS < d) return 0;
  return Math.min(LIMIT, Math.floor((height - d) / step + 1e-10) + 1);
}
function circleCount(r, d, g, hex, shifted) {
  const step = d + g, ystep = hex ? step * Math.sqrt(3) / 2 : step;
  const nr = circleRows(r.h, d, ystep), normal = grid(r.w, d, g);
  if (!hex) return normal * nr;
  const shiftedCols = grid(r.w - step / 2, d, g);
  let a = Math.floor((nr + 1) / 2), b = Math.floor(nr / 2);
  if (shifted) [a, b] = [b, a];
  return a * normal + b * shiftedCols;
}
function bestCirclePlan(r, d, g) {
  let best = { count: circleCount(r, d, g, false, false), hex: false, transposed: false, shifted: false };
  for (const trans of [false, true]) {
    const sz = trans ? { ...r, w: r.h, h: r.w } : r;
    const sq = circleCount(sz, d, g, false, false);
    if (sq > best.count) best = { count: sq, hex: false, transposed: trans, shifted: false };
    for (const shift of [false, true]) {
      const c = circleCount(sz, d, g, true, shift);
      if (c > best.count) best = { count: c, hex: true, transposed: trans, shifted: shift };
    }
  }
  return best;
}
function circleLayout(r, d, g, p, limit = Infinity) {
  const sz = p.transposed ? { ...r, w: r.h, h: r.w } : r;
  const step = d + g, ystep = p.hex ? step * Math.sqrt(3) / 2 : step;
  const nr = circleRows(sz.h, d, ystep), out = [];
  for (let row = 0; row < nr && out.length < limit; row++) {
    const off = p.hex && ((row % 2 === 1) !== p.shifted) ? step / 2 : 0;
    const cols = grid(sz.w - off, d, g);
    for (let col = 0; col < cols && out.length < limit; col++) {
      let x = col * step + off, y = row * ystep;
      if (p.transposed) [x, y] = [y, x];
      out.push({ x: r.x + x, y: r.y + y, w: d, h: d });
    }
  }
  return out;
}

/* ======================================================================= */
/* 3. GIAO DIỆN CHUNG                                                      */
/* ======================================================================= */
const NUM_KEYS = ['sheetW', 'sheetH', 'thickness', 'gap', 'margin', 'density', 'allowance'];

export function calculateNesting(input) {
  const i = { ...input };
  const keys = [...NUM_KEYS, ...(i.shape === 'circle' ? ['diameter'] : ['partW', 'partH'])];
  for (const key of keys) {
    const v = i[key];
    if (!Number.isFinite(v) || v < 0 || v > LIMIT) fail('Số đo không hợp lệ hoặc vượt giới hạn: ' + key);
  }
  if (!['rect', 'circle'].includes(i.shape)) fail('Hình dạng chi tiết không hợp lệ.');
  if (!['laser', 'shear'].includes(i.cutMethod)) fail('Phương pháp cắt không hợp lệ.');
  if (i.shape === 'circle' && i.cutMethod === 'shear') fail('Chặt sấn chỉ xếp chi tiết chữ nhật.');
  if (i.sheetW <= 0 || i.sheetH <= 0 || i.thickness <= 0 || i.density <= 0 ||
      (!i.autoMax && (!Number.isInteger(i.quantity) || i.quantity <= 0 || i.quantity > LIMIT)))
    fail('Kiểm tra kích thước tấm, dày, vật liệu hoặc số lượng.');
  if (i.shape === 'rect' && (i.partW <= 0 || i.partH <= 0)) fail('Kích thước thành phẩm phải lớn hơn 0.');
  if (i.shape === 'circle' && i.diameter <= 0) fail('Đường kính thành phẩm phải lớn hơn 0.');
  const remnantMin = Number.isFinite(i.remnantMin) && i.remnantMin >= 0 ? i.remnantMin : DEFAULTS.remnantMin;
  const e = i.margin;
  if (i.sheetW - 2 * e <= 0 || i.sheetH - 2 * e <= 0) fail('Chừa mép vượt kích thước tấm.');

  const cutW = (i.shape === 'circle' ? i.diameter : i.partW) + i.allowance;
  const cutH = (i.shape === 'circle' ? i.diameter : i.partH) + i.allowance;
  const area = i.shape === 'circle' ? Math.PI * i.diameter ** 2 / 4 : i.partW * i.partH;

  // ---------- sức chứa 1 tấm đầy
  let plan, rect = null;
  const region = { x: e, y: e, w: i.sheetW - 2 * e, h: i.sheetH - 2 * e };
  if (i.shape === 'circle') {
    const p = bestCirclePlan(region, cutW, i.gap);
    plan = { count: p.count, layout: circleLayout(region, cutW, i.gap, p), cutLines: [],
             strategy: p.hex ? 'staggered' : 'grid', rotated: p.transposed, staggered: p.hex,
             upperBound: null, searchComplete: true, circle: p };
  } else {
    rect = rectFull(i, cutW, cutH);
    plan = { count: rect.layout.length, layout: rect.layout, cutLines: rect.cuts, strategy: rect.strategy,
             staggered: false, upperBound: rect.upper, searchComplete: rect.searchComplete };
  }
  if (plan.count < 1) fail('Chi tiết không lọt tấm phôi (đã tính mạch cắt, chừa mép và lượng dư).');
  if (!Number.isSafeInteger(plan.count) || plan.count > LIMIT) fail('Số chi tiết quá lớn.');

  const qty = i.autoMax ? plan.count : i.quantity;
  const sheets = Math.ceil(qty / plan.count), lastSheetParts = (qty - 1) % plan.count + 1;

  // ---------- chiều dài phải xuất (tấm lẻ chỉ giữ khi ≥ remnantMin)
  const keepLength = used => {
    const L = Math.min(i.sheetW, Math.ceil((used - 1e-9) * 10) / 10);
    return i.sheetW - L >= remnantMin ? L : i.sheetW;
  };
  const stripFor = n => {
    if (n >= plan.count && i.autoMax) return null;
    if (i.shape === 'circle') {
      let lo = 0, hi = i.sheetW;
      for (let s = 0; s < 40; s++) {
        const mid = (lo + hi) / 2, r = { x: e, y: e, w: mid - 2 * e, h: i.sheetH - 2 * e };
        if (r.w > 0 && bestCirclePlan(r, cutW, i.gap).count >= n) hi = mid; else lo = mid;
      }
      const r = { x: e, y: e, w: hi - 2 * e, h: i.sheetH - 2 * e };
      const lay = circleLayout(r, cutW, i.gap, bestCirclePlan(r, cutW, i.gap)).sort((p, q) => p.x - q.x || p.y - q.y).slice(0, n);
      return { layout: lay, cuts: [], used: Math.max(...lay.map(p => p.x + p.w)) + e };
    }
    return rectStrip(i, cutW, cutH, n, rect.tb);          // null nếu chỉ kiểu xoay vòng mới chứa đủ
  };

  const out = {
    ...plan, partsPerSheet: plan.count, sheets, lastSheetParts, completeSheets: 0, shownOnSheet: lastSheetParts,
    cutW, cutH, partArea: area, cutArea: cutW * cutH, sheetArea: i.sheetW * i.sheetH,
    remnantL: 0, remnantW: 0, savedOffcutKG: 0, issuedLastLength: i.sheetW, remnantMin,
    input: { ...i, remnantMin }, quantity: qty,
  };
  let lengthIssued;
  if (i.autoMax) {
    lengthIssued = i.sheetW;                                 // barem: cắt hết tờ
  } else {
    out.completeSheets = sheets - 1;
    const last = stripFor(lastSheetParts);
    if (last) {
      out.layout = last.layout; out.cutLines = last.cuts;
      out.issuedLastLength = keepLength(last.used);
      if (out.strategy === 'rotary') out.strategy = 'guillotine';
    } else {
      out.layout = plan.layout.slice(0, lastSheetParts); out.issuedLastLength = i.sheetW;
    }
    out.remnantL = i.sheetW - out.issuedLastLength; out.remnantW = out.remnantL > 0 ? i.sheetH : 0;
    let fullLen = i.sheetW;
    if (out.completeSheets > 0) { const f = stripFor(plan.count); if (f) fullLen = keepLength(f.used); }
    lengthIssued = out.issuedLastLength + out.completeSheets * fullLen;
    out.savedOffcutKG = (sheets * i.sheetW - lengthIssued) * i.sheetH * i.thickness * i.density / 1e9;
  }
  if (out.layout.length > MAX_PREVIEW) out.layout = out.layout.slice(0, MAX_PREVIEW);
  if (out.cutLines.length > 4 * MAX_PREVIEW) out.cutLines = out.cutLines.slice(0, 4 * MAX_PREVIEW);
  out.previewDrawn = Math.min(out.shownOnSheet, out.layout.length);
  out.rotated = i.shape === 'rect' && out.layout.length > 0 && out.layout.every(p => Math.abs(p.w - cutH) < 1e-6 && Math.abs(p.h - cutW) < 1e-6) && cutW !== cutH;
  out.mixed = i.shape === 'rect' && cutW !== cutH && !out.rotated && out.layout.some(p => Math.abs(p.w - cutH) < 1e-6 && Math.abs(p.h - cutW) < 1e-6);
  out.slack = out.upperBound == null ? null : Math.max(0, out.upperBound - out.partsPerSheet);
  out.issuedKG = lengthIssued * i.sheetH * i.thickness * i.density / 1e9;
  out.finishedKG = area * i.thickness * qty * i.density / 1e9;
  out.wasteKG = out.issuedKG - out.finishedKG;
  if (out.wasteKG < 0 && out.wasteKG > -1e-8) out.wasteKG = 0;
  if (out.wasteKG < 0 || out.finishedKG <= 0) fail('Cân bằng khối lượng không hợp lệ.');
  out.wasteOverFinishedPercent = 100 * out.wasteKG / out.finishedKG;
  delete out.circle;
  return out;
}

// A module Worker runs the very same nesting.js. No second algorithm file.
// Editing during a lengthy search terminates the previous Worker immediately.
if(typeof document==='undefined' && typeof self!=='undefined' && typeof self.postMessage==='function'){
 self.addEventListener('message',event=>{
  try{self.postMessage({ok:true,result:calculateNesting(event.data)});}
  catch(error){self.postMessage({ok:false,error:String(error?.message||'Không thể tính trải phôi.')});}
 });
}

// -----------------------------------------------------------------------------
// UI parity with ES TOOLKIT V1.0 Portable / extensions_windows.go.
// Keep the checked calculation engine above unchanged.
// -----------------------------------------------------------------------------
const DEFAULT_STATE={
 sheetW:'6000',sheetH:'2000',thickness:'20',partW:'300',partH:'200',diameter:'310',
 allowance:'0',gap:'3',margin:'10',quantity:'20',density:'7850',
 shape:'rect',cutMethod:'laser',autoMax:true,material:0,customDensity:false,
 sheets:{laser:['6000','2000','20'],shear:['2440','1220','3']},
 gaps:{laser:'3',shear:'0'},allowances:{rect:'0',circle:'5'}
};
let savedState=null;
const htmlEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prettyPortable=n=>{
 if(!Number.isFinite(n))return '—';
 if(n===0)return '0';
 const abs=Math.abs(n);
 if(abs<0.00005||abs>=1e14)return n.toExponential(4).replace(/(?:\.0+|(?<=\d)0+)e/,'e');
 return new Intl.NumberFormat('en-US',{minimumFractionDigits:0,maximumFractionDigits:4,useGrouping:true}).format(n);
};
const percentagePortable=n=>Number.isFinite(n)?n.toFixed(2):'—';
const parseNestNumber=(raw,label,{strictPositive=false,integer=false}={})=>{
 const rawText=String(raw??'').trim();
 if(!rawText||rawText.length>60)throw Error(`Kiểm tra ô: ${label}`);
 const cleaned=rawText.replace(/[\s,]/g,'');
 if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(cleaned))throw Error(`Kiểm tra ô: ${label}`);
 const v=Number(cleaned);
 if(!Number.isFinite(v)||v<0||v>LIMIT||(strictPositive&&v<=0)||(integer&&!Number.isInteger(v)))throw Error(`Kiểm tra ô: ${label}`);
 return v;
};
const nestField=(name,label,value,{accent='',unit='mm',readOnly=false}={})=>`<label class="nest-field ${accent?'is-'+accent:''}"><span class="nest-field-label">${htmlEscape(label)}</span><span class="nest-input-wrap"><input type="text" name="${htmlEscape(name)}" value="${htmlEscape(prettyPortable(Number(value)))}" inputmode="decimal" autocomplete="off" spellcheck="false" ${readOnly?'readonly aria-readonly="true"':''} aria-label="${htmlEscape(label)}"><small>${htmlEscape(unit)}</small></span></label>`;
function previewDrawing(res){
 const i=res.input, SW=1080, SH=376;
 const insetX=11,insetY=12,plotW=SW-2*insetX,plotH=SH-2*insetY;
 const scale=Math.min(plotW/i.sheetW,plotH/i.sheetH);
 const W=i.sheetW*scale,H=i.sheetH*scale;
 const x0=insetX+(plotW-W)/2,y0=insetY+(plotH-H)/2;
 const pt=n=>Number(n).toFixed(3);
 let shapes='',remnant='',cuts='',unrotated=false,rotated=false,drawn=0;
 if(!i.autoMax&&res.remnantL>0){
  const cutX=x0+res.issuedLastLength*scale,restWidth=Math.max(0,W-(cutX-x0));
  if(restWidth>.2){
   remnant=`<rect x="${pt(cutX)}" y="${pt(y0)}" width="${pt(restWidth)}" height="${pt(H)}" fill="#e3f8eb"/><line x1="${pt(cutX)}" y1="${pt(y0)}" x2="${pt(cutX)}" y2="${pt(y0+H)}" stroke="#169a70" stroke-width="2.5"/>`;
   if(restWidth>120&&H>70)remnant+=`<text x="${pt(cutX+restWidth/2)}" y="${pt(y0+H/2)}" font-size="21" fill="#147451" font-weight="700" font-family="Arial,sans-serif" text-anchor="middle">TẤM LẺ</text>`;
  }
 }
 const maxDraw=Math.min(res.previewDrawn||0,res.layout?.length||0,MAX_PREVIEW);
 for(let j=0;j<maxDraw;j++){
  const p=res.layout[j],xx=x0+p.x*scale,yy=y0+p.y*scale,ww=p.w*scale,hh=p.h*scale;
  if(ww<.65||hh<.65)continue;
  drawn++;
  if(i.shape==='circle'){
   shapes+=`<ellipse cx="${pt(xx+ww/2)}" cy="${pt(yy+hh/2)}" rx="${pt(ww/2)}" ry="${pt(hh/2)}" fill="#baa7f3" stroke="#6145ac" stroke-width="1.1"/>`;
   const inner=i.allowance/2*scale;
   if(inner>1.4&&ww-2*inner>3)shapes+=`<ellipse cx="${pt(xx+ww/2)}" cy="${pt(yy+hh/2)}" rx="${pt(ww/2-inner)}" ry="${pt(hh/2-inner)}" fill="#ddd4ff"/>`;
  }else{
   const r=Math.abs(p.w-res.cutH)<1e-7&&Math.abs(p.h-res.cutW)<1e-7&&Math.abs(res.cutH-res.cutW)>1e-7;
   const color=r?'#9bcffc':'#afa2eb',edge=r?'#326bab':'#5c47b3';
   if(r)rotated=true;else unrotated=true;
   shapes+=`<rect x="${pt(xx)}" y="${pt(yy)}" width="${pt(ww)}" height="${pt(hh)}" rx="${pt(Math.min(1,ww*.08))}" fill="${color}" stroke="${edge}" stroke-width="0.92"/>`;
   const inner=i.allowance/2*scale;
   if(inner>1.4&&ww-2*inner>3&&hh-2*inner>3)shapes+=`<rect x="${pt(xx+inner)}" y="${pt(yy+inner)}" width="${pt(ww-2*inner)}" height="${pt(hh-2*inner)}" rx=".8" fill="#e1dbff"/>`;
  }
 }
 if(i.cutMethod==='shear')for(const c of res.cutLines||[]){
  if(!i.autoMax&&Math.min(c.x1,c.x2)>res.issuedLastLength-1e-6)continue;
  cuts+=`<line x1="${pt(x0+c.x1*scale)}" y1="${pt(y0+c.y1*scale)}" x2="${pt(x0+c.x2*scale)}" y2="${pt(y0+c.y2*scale)}" stroke="#d58027" stroke-width="1.2"/>`;
 }
 const m=i.margin*scale;
 const boundary=(m>=3&&W>2*m&&H>2*m)?`<rect x="${pt(x0+m)}" y="${pt(y0+m)}" width="${pt(W-2*m)}" height="${pt(H-2*m)}" fill="none" stroke="#ddc9fa" stroke-width="1"/>`:'';
 const diagram=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" role="img" aria-label="Sơ đồ tấm phôi ${prettyPortable(i.sheetW)} × ${prettyPortable(i.sheetH)} mm, ${prettyPortable(res.shownOnSheet)} chi tiết" preserveAspectRatio="xMidYMid meet"><rect width="${SW}" height="${SH}" fill="#faf7ff"/><rect x="${pt(x0)}" y="${pt(y0)}" width="${pt(W)}" height="${pt(H)}" fill="#f1ebfd" stroke="#793afa" stroke-width="2"/>${remnant}${boundary}${shapes}${cuts}</svg>`;
 const title=`TẤM PHÔI ${prettyPortable(i.sheetW)} × ${prettyPortable(i.sheetH)} × ${prettyPortable(i.thickness)} mm`;
 let legend='';
 if(i.shape==='circle')legend=`<span class="nest-legend-item"><i class="nest-dot nest-dot-round"></i>Phôi cắt D${prettyPortable(res.cutW)} mm</span>`;
 else{
  if(unrotated)legend+=`<span class="nest-legend-item"><i class="nest-dot nest-dot-zero"></i>0° &nbsp; ${prettyPortable(res.cutW)} × ${prettyPortable(res.cutH)} mm</span>`;
  if(rotated)legend+=`<span class="nest-legend-item"><i class="nest-dot nest-dot-rot"></i>90° &nbsp; ${prettyPortable(res.cutH)} × ${prettyPortable(res.cutW)} mm</span>`;
 }
 // Export the exact sheet geometry, plus the annotations useful outside the Web App.
 const fullSVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH+82}"><rect width="${SW}" height="${SH+82}" fill="#faf7ff"/><text x="540" y="26" fill="#675295" font-size="21" text-anchor="middle" font-weight="700" font-family="Arial,sans-serif">${htmlEscape(title)}</text><svg x="0" y="35" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">${diagram.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</svg><text x="22" y="${SH+61}" fill="#63489a" font-size="19" font-family="Arial,sans-serif">${htmlEscape(prettyPortable(res.shownOnSheet)+' chi tiết / tấm hiển thị')}</text></svg>`;
 return {svg:diagram,download:fullSVG,title,legend,drawn};
}
function nestingStrategy(r){
 const base={guillotine:'Phối hợp 0°/90° – chia vùng nhiều cấp',rotary:'Phối hợp 0°/90° – bố trí xoay vòng',
  shear:'Nhát chặt chạy suốt – chia dải nhiều cấp',staggered:'Hình tròn xếp so le'}[r.strategy]||(r.rotated?'Lưới xoay 90°':'Lưới thẳng 0°');
 if(r.upperBound==null)return base;
 return r.slack===0?`${base} · ✓ Đã đạt số chiếc tối đa có thể`:`${base} · Theo diện tích còn tối đa ${r.slack} chiếc`;
}
const NEST_CSS=`
.nest-pro{font-size:16px;color:#191c69;min-width:0}
.nest-pro *{box-sizing:border-box}
.nest-pro .nest-top{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin:0 0 12px}
.nest-pro .nest-subtitle{font-size:16px;color:#706d99;margin:0}
.nest-pro .nest-materials{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end;margin-left:auto}
.nest-pro .nest-materials>strong{font-weight:800;margin-right:4px}
.nest-pro .nest-materials button,.nest-pro .nest-toggle button{border:1px solid #dfd3fc;border-radius:11px;background:white;color:#2e1b70;min-height:40px;padding:7px 12px;font-weight:750;font-size:16px;white-space:nowrap}
.nest-pro .nest-materials button.is-active,.nest-pro .nest-toggle button.is-active{color:white;border-color:transparent;background:linear-gradient(120deg,#aa42f9,#7732e9);box-shadow:0 2px 8px #6627af1e}
.nest-pro .nest-materials button:disabled{opacity:.52}
.nest-pro .nest-material-list{background:white;min-height:40px;max-width:198px;min-width:145px;font-size:16px;font-weight:650;color:#5324b4;border:1px solid #dac6fb;border-radius:11px;padding:6px 9px}
.nest-pro .nest-material-list:disabled{opacity:.6}
.nest-pro .nest-material-retry{color:#5c2bdd;background:#f0eaff;border:1px solid #cfbafb;border-radius:10px;padding:6px 10px;font-size:16px}
.nest-pro .nest-material-warning{font-size:16px;color:#aa3c3c;margin:0 0 8px}
.nest-pro .nest-material-warning[hidden]{display:none!important}
.nest-pro .nest-panelgrid{display:grid;grid-template-columns:minmax(405px,min(34.5%,490px)) minmax(0,1fr);gap:10px;align-items:stretch}
.nest-pro .nest-panel{background:#fff;border:1px solid #e4d3ff;border-radius:16px;padding:12px 13px;min-width:0;box-shadow:0 2px 5px #4c2b8a08}
.nest-pro .nest-parameters{display:flex;flex-direction:column}
.nest-pro .nest-panel-title{color:#592ac1;font-size:20px;margin:0 0 12px;font-weight:850}
.nest-pro .nest-grid{display:grid;gap:9px;min-width:0}
.nest-pro .nest-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
.nest-pro .nest-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}
.nest-pro .nest-grid + .nest-grid{margin-top:17px}
.nest-pro .nest-field{min-width:0;display:block}
.nest-pro .nest-field-label{font-size:16px;font-weight:750;color:#251973;display:block;margin-bottom:4px;white-space:nowrap}
.nest-pro .nest-input-wrap{display:flex;align-items:center;min-width:0;position:relative}
.nest-pro .nest-input-wrap input,.nest-pro .nest-shape{background:#fff;border:1px solid #d4b7ff;border-radius:10px;min-height:42px;width:100%;font-size:18px;color:#24156c;padding:7px 10px;min-width:0;outline:none;box-shadow:none;line-height:1.24}
.nest-pro .nest-input-wrap input:focus,.nest-pro .nest-shape:focus-visible{border-color:#7442ff;box-shadow:0 0 0 3px #7542ff21}
.nest-pro .nest-input-wrap input{padding-right:36px;font-variant-numeric:tabular-nums}
.nest-pro .nest-input-wrap input:read-only{background:#efe8fc;color:#6424d4;font-weight:750;cursor:default}
.nest-pro .nest-input-wrap small{position:absolute;right:9px;font-size:16px;font-weight:700;color:#6f36df;pointer-events:none}
.nest-pro .nest-field.is-allowance .nest-field-label{color:#a36a07}
.nest-pro .nest-field.is-allowance input{border:2px solid #f3a535;background:#fffcf5;padding-left:9px}
.nest-pro .nest-field.is-kerf .nest-field-label{color:#2568bb}
.nest-pro .nest-field.is-kerf input{border:2px solid #5a9eff;background:#fafdff;padding-left:9px}
.nest-pro .nest-methods{margin-top:18px}
.nest-pro .nest-methods h3{font-size:18px;margin:0 0 9px;color:#5c29bf;font-weight:850}
.nest-pro .nest-toggle{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.nest-pro .nest-toggle button{width:100%;padding:6px 8px}
.nest-pro .nest-qty-switch{margin-top:6px}
.nest-pro .nest-hint{font-size:16px;color:#65588b;margin:8px 0 0;min-height:0}
.nest-pro .nest-error{font-size:16px;color:#b52441;font-weight:650;margin:12px 0 0;line-height:1.4}
.nest-pro .nest-error:empty{display:none}
.nest-pro .nest-output{display:flex;flex-direction:column}
.nest-pro .nest-figure{background:#faf7ff;border:1px solid #e7dafa;border-radius:12px;min-width:0;padding:6px 7px;flex:1;display:flex;flex-direction:column;min-height:0}
.nest-pro .nest-figure-title{text-align:center;font-size:18px;line-height:1.25;color:#675295;font-weight:800;margin:0 0 2px}
.nest-pro .nest-preview{flex:1;display:flex;justify-content:center;align-items:center;min-width:0;min-height:0;overflow:hidden}
.nest-pro .nest-preview svg{width:100%;height:auto;display:block;min-height:0;max-height:none}
.nest-pro .nest-legend{display:flex;justify-content:flex-start;align-items:center;gap:12px;flex-wrap:wrap;min-height:0;color:#58438f;font-size:16px;font-weight:700;margin:2px 0 0;padding-left:4px}
.nest-pro .nest-legend-item{display:inline-flex;align-items:center;gap:7px}
.nest-pro .nest-dot{display:inline-block;width:20px;height:15px;flex:0 0 auto;border:1px solid #6850aa}
.nest-pro .nest-dot-zero{background:#afa2eb}.nest-pro .nest-dot-rot{background:#9bcffc;border-color:#316bb1}.nest-pro .nest-dot-round{background:#baa7f3;border-radius:100%}
.nest-pro .nest-preview-note{margin:4px 0 0;font-size:16px;color:#9f3348;text-align:center}
.nest-pro .nest-preview-note:empty{display:none}
.nest-pro .nest-caption{display:flex;justify-content:space-between;gap:9px;margin-top:10px;align-items:baseline;flex-wrap:wrap;color:#5b2eb7;font-size:18px}
.nest-pro .nest-summary{font-size:20px;font-weight:850}
.nest-pro .nest-sizing{font-size:16px;font-weight:800;color:#655399;text-align:right}
.nest-pro .nest-footrow{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;min-height:35px}
.nest-pro .nest-strategy{color:#6a598b;font-size:16px;flex:1;margin:1px 0}
.nest-pro .nest-export{background:#f9f6ff;border:1px solid #b59efc;border-radius:9px;color:#632dd6;padding:5px 12px;min-height:35px;font-size:16px;font-weight:700}
.nest-pro .nest-status{font-size:16px;color:#65539e;min-height:0}
.nest-pro .nest-status:empty{display:none}
.nest-pro .nest-spinner{width:16px;height:16px;border-radius:50%;border:2px solid #d1bef5;border-top-color:#662be8;display:inline-block;animation:nest-spin .7s linear infinite;margin-left:7px;vertical-align:middle}
@keyframes nest-spin{to{transform:rotate(360deg)}}
.nest-pro .nest-result-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}
.nest-pro .nest-result{background:white;border:1px solid #e1d5f9;border-radius:14px;padding:10px 13px;min-width:0;min-height:79px}
.nest-pro .nest-result.emphasis{background:linear-gradient(115deg,#a943f7,#7930e8);border-color:transparent;color:white}
.nest-pro .nest-result strong{font-size:16px;display:block;font-weight:750}
.nest-pro .nest-result output{font-size:23px;font-weight:850;display:block;line-height:1.35;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.nest-pro .nest-result button{display:block;background:none;border:0;color:inherit;text-align:left;padding:0;cursor:pointer;width:100%}
.nest-pro .nest-note{font-size:16px;color:#6a6691;text-align:center;margin:7px 0 0;line-height:1.4}
@media(max-width:1260px){.nest-pro .nest-panelgrid{grid-template-columns:minmax(0,1fr)}.nest-pro .nest-figure{min-height:330px}.nest-pro .nest-materials{justify-content:flex-start;margin-left:0}}
@media(max-width:680px){.nest-pro .nest-grid.three{grid-template-columns:repeat(2,minmax(0,1fr))}.nest-pro .nest-grid.three .nest-field:first-child{grid-column:1/-1}.nest-pro .nest-panel{padding:12px}.nest-pro .nest-panel-title{font-size:18px}.nest-pro .nest-field-label{white-space:normal}.nest-pro .nest-materials{gap:6px}.nest-pro .nest-materials button{padding:6px 10px}.nest-pro .nest-material-list{max-width:100%;width:100%}.nest-pro .nest-figure{min-height:0;padding:8px}.nest-pro .nest-preview svg{min-height:0}.nest-pro .nest-result-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.nest-pro .nest-result output{font-size:20px}.nest-pro .nest-caption{display:block}.nest-pro .nest-summary,.nest-pro .nest-sizing{display:block;text-align:left;line-height:1.45;margin:2px 0 4px}.nest-pro .nest-legend{gap:11px}.nest-pro .nest-toggle button{font-size:16px}}

/* Portable-proportion layout on laptops; all nesting logic / coordinates / source data intact. */
@media (min-width: 1040px) and (max-height: 900px) {
.nest-pro .nest-top{gap:10px;margin-bottom:7px}
.nest-pro .nest-materials{gap:5px}
.nest-pro .nest-materials button,.nest-pro .nest-toggle button{min-height:33px;padding:5px 9px;border-radius:9px}
.nest-pro .nest-material-list{min-height:33px;padding:4px 8px}
.nest-pro .nest-panelgrid{gap:8px}
.nest-pro .nest-panel{padding:10px 11px;border-radius:12px}
.nest-pro .nest-panel-title{font-size:18px;margin-bottom:7px}
.nest-pro .nest-grid{gap:7px}
.nest-pro .nest-grid + .nest-grid{margin-top:9px}
.nest-pro .nest-field-label{margin-bottom:2px;line-height:1.2}
.nest-pro .nest-input-wrap input,.nest-pro .nest-shape{min-height:35px;font-size:17px;padding:5px 9px;border-radius:8px}
.nest-pro .nest-qty-switch{margin-top:4px}
.nest-pro .nest-methods{margin-top:10px}
.nest-pro .nest-methods h3{font-size:17px;margin-bottom:6px}
.nest-pro .nest-toggle{gap:6px}
.nest-pro .nest-hint{margin-top:4px;line-height:1.25}
.nest-pro .nest-figure{min-height:0;padding:5px 6px}
.nest-pro .nest-figure-title{font-size:17px;margin-bottom:2px}
.nest-pro .nest-preview svg{min-height:0;max-height:none}
.nest-pro .nest-legend{min-height:0;gap:10px;margin-top:2px}
.nest-pro .nest-caption{margin-top:6px;gap:6px}
.nest-pro .nest-summary{font-size:18px}
.nest-pro .nest-footrow{min-height:31px;gap:7px}
.nest-pro .nest-export{min-height:31px;padding:4px 9px}
.nest-pro .nest-result-grid{gap:8px;margin-top:8px}
.nest-pro .nest-result{min-height:65px;padding:7px 10px;border-radius:10px}
.nest-pro .nest-result output{font-size:20px}
.nest-pro .nest-note{margin-top:5px;line-height:1.3}
}

`;

export function mount(root,ctx){
 // One self-contained file; the calculation engine and Worker are unchanged.
 const state=savedState?structuredClone(savedState):structuredClone(DEFAULT_STATE);
 state.sheets??=structuredClone(DEFAULT_STATE.sheets);
 state.gaps??=structuredClone(DEFAULT_STATE.gaps);
 state.allowances??=structuredClone(DEFAULT_STATE.allowances);
 if(!['rect','circle'].includes(state.shape))state.shape='rect';
 if(!['laser','shear'].includes(state.cutMethod))state.cutMethod='laser';
 let materialCatalog=null,worker=null,timer=null,serial=0,last=null,lastSVG='';
 root.innerHTML=`<style>${NEST_CSS}</style><div class="nest-pro">
  <div class="nest-top"><p class="nest-subtitle">1 loại chi tiết · Thành phẩm (mm) · Đường bao ngoài</p>
   <div class="nest-materials" role="group" aria-label="Vật liệu"><strong>Vật liệu</strong>
    ${quickMaterialLabels.map((v,i)=>`<button type="button" data-nest-material="${i}" aria-pressed="false" disabled>${v}</button>`).join('')}
    <select class="nest-material-list" id="nest-all-materials" aria-label="Danh mục khối lượng riêng dùng chung" disabled><option value="">Đang tải vật liệu...</option></select>
    <button class="nest-material-retry" type="button" id="nest-material-retry" hidden>Tải lại</button>
   </div>
  </div><p class="nest-material-warning" id="nest-material-warning" role="alert" hidden></p>
  <div class="nest-panelgrid">
   <section class="nest-panel nest-parameters"><h2 class="nest-panel-title">TẤM PHÔI &amp; CHI TIẾT</h2>
    <div class="nest-grid three">
     ${nestField('sheetW','Dài tấm (mm)',state.sheetW,{unit:''})}${nestField('sheetH','Rộng tấm (mm)',state.sheetH,{unit:''})}${nestField('thickness','Dày (mm)',state.thickness,{unit:''})}
    </div>
    <div class="nest-grid three">
     <label class="nest-field"><span class="nest-field-label">Hình dạng</span><select class="nest-shape" name="shape"><option value="rect">Chữ nhật</option><option value="circle">Hình tròn</option></select></label>
     <div data-nest-part="rect">${nestField('partW','Dài TP (mm)',state.partW,{unit:''})}</div>
     <div data-nest-part="rect">${nestField('partH','Rộng TP (mm)',state.partH,{unit:''})}</div>
     <div data-nest-part="circle">${nestField('diameter','D TP (mm)',state.diameter,{unit:''})}</div>
    </div>
    <div class="nest-grid two">
     ${nestField('allowance','Dư gia công (mm)',state.allowance,{unit:'',accent:'allowance'})}
     ${nestField('gap','Mạch cắt (mm)',state.gap,{unit:'',accent:'kerf'})}
    </div>
    <div class="nest-grid two">
     ${nestField('margin','Chừa mép (mm)',state.margin,{unit:''})}
     <div class="nest-qty-box">${nestField('quantity','Số lượng',state.quantity,{unit:'',readOnly:true})}
      <div class="nest-toggle nest-qty-switch" role="group" aria-label="Chế độ số lượng">
       <button type="button" data-nest-mode="auto">Tự động</button><button type="button" data-nest-mode="manual">Điền tay</button>
      </div></div>
    </div>
    <div class="nest-methods"><h3>PHƯƠNG PHÁP CẮT</h3><div class="nest-toggle" role="group" aria-label="Phương pháp cắt">
     <button type="button" data-nest-cut="laser">Laser / Plasma</button><button type="button" data-nest-cut="shear">Chặt sấn</button>
    </div><p class="nest-hint" id="nest-cut-hint"></p></div>
    <p class="nest-error" id="nest-error" role="alert"></p>
   </section>
   <section class="nest-panel nest-output" aria-label="Sơ đồ trải phôi">
    <div class="nest-figure">
     <div class="nest-figure-title" id="nest-figure-title">TẤM PHÔI 6,000 × 2,000 × 20 mm</div>
     <div class="nest-preview" id="nest-preview">Đang lập sơ đồ…</div>
     <div class="nest-legend" id="nest-legend"></div><p class="nest-preview-note" id="nest-preview-note"></p>
    </div>
    <div class="nest-caption"><strong class="nest-summary" id="nest-summary">—</strong><span class="nest-sizing" id="nest-sizing">—</span></div>
    <div class="nest-footrow"><p class="nest-strategy" id="nest-strategy">—</p>
     <button class="nest-export" type="button" id="nest-svg-export" disabled>↓ Tải sơ đồ SVG</button></div>
    <div class="nest-status" id="nest-status" role="status" aria-live="polite"></div>
   </section>
  </div>
  <section class="nest-result-grid" aria-label="Kết quả trải phôi">
   <div class="nest-result"><strong>Xuất phôi (kg)</strong><output id="nest-issued">—</output></div>
   <div class="nest-result"><strong>Thành phẩm* (kg)</strong><output id="nest-finished">—</output></div>
   <div class="nest-result emphasis"><button id="nest-copy" type="button" title="Sao chép kết quả"><strong>Hao phí / TP (%)</strong><output id="nest-waste">—</output></button></div>
   <div class="nest-result"><strong>Tấm lẻ còn lại (mm)</strong><output id="nest-remnant">—</output></div>
  </section>
  <p class="nest-note">* Thành phẩm tính theo đường bao ngoài. Hao phí = (Xuất phôi − TP) / TP × 100. Tấm lẻ (cạnh ≥ 200 mm) được giữ lại, không tính xuất.</p>
 </div>`;
 const getField=name=>root.querySelector(`[name="${name}"]`);
 const getById=id=>root.querySelector('#'+id);
 function collectFields(){
  for(const key of ['sheetW','sheetH','thickness','partW','partH','diameter','allowance','gap','margin'])state[key]=getField(key).value;
  if(!state.autoMax)state.quantity=getField('quantity').value;
  state.allowances[state.shape]=state.allowance;
  savedState=structuredClone(state);
 }
 function syncUI(){
  getField('shape').value=state.shape;
  for(const key of ['sheetW','sheetH','thickness','partW','partH','diameter','allowance','gap','margin','quantity'])getField(key).value=prettyPortable(Number(String(state[key]).replaceAll(',','')));
  getField('quantity').readOnly=state.autoMax;
  getField('quantity').setAttribute('aria-readonly',String(state.autoMax));
  root.querySelectorAll('[data-nest-part]').forEach(el=>el.hidden=el.dataset.nestPart!==state.shape);
  root.querySelectorAll('[data-nest-mode]').forEach(b=>{const yes=(b.dataset.nestMode==='auto')===state.autoMax;b.classList.toggle('is-active',yes);b.setAttribute('aria-pressed',String(yes));});
  root.querySelectorAll('[data-nest-cut]').forEach(b=>{const yes=b.dataset.nestCut===state.cutMethod;b.classList.toggle('is-active',yes);b.setAttribute('aria-pressed',String(yes));b.disabled=b.dataset.nestCut==='shear'&&state.shape==='circle';});
  root.querySelectorAll('[data-nest-material]').forEach(b=>{const yes=Number(b.dataset.nestMaterial)===state.material;b.classList.toggle('is-active',yes);b.setAttribute('aria-pressed',String(yes));});
  const chooser=getById('nest-all-materials');
  if(materialCatalog)chooser.value=state.material>=4?String(state.material):'';
  const kerf=getField('gap').closest('.nest-field').querySelector('.nest-field-label');
  kerf.textContent=state.cutMethod==='shear'?'Khe hở (mm)':'Mạch cắt (mm)';
  setText(root,'#nest-cut-hint',state.cutMethod==='shear'?'Nhát chặt chạy suốt → chia dải nhiều cấp':'');
 }
 function payload(){
  const names={sheetW:'Dài tấm',sheetH:'Rộng tấm',thickness:'Dày',partW:'Dài TP',partH:'Rộng TP',diameter:'D TP',allowance:'Dư gia công',gap:state.cutMethod==='shear'?'Khe hở':'Mạch cắt',margin:'Chừa mép',quantity:'Số lượng'};
  const inputs=['sheetW','sheetH','thickness',...(state.shape==='rect'?['partW','partH']:['diameter']),'allowance','gap','margin'];
  const vals=Object.fromEntries(inputs.map(key=>[key,parseNestNumber(state[key],names[key],{strictPositive:['sheetW','sheetH','thickness','partW','partH','diameter'].includes(key)})]));
  const density=Number(state.density);
  if(!Number.isFinite(density)||density<=0||density>LIMIT)throw Error('Kiểm tra vật liệu và khối lượng riêng.');
  return {shape:state.shape,cutMethod:state.cutMethod,autoMax:state.autoMax,density,...vals,quantity:state.autoMax?1:parseNestNumber(state.quantity,'Số lượng',{strictPositive:true,integer:true})};
 }
 function status(message='',busy=false){const box=getById('nest-status');box.textContent=message;if(busy)box.insertAdjacentHTML('beforeend','<span class="nest-spinner" aria-hidden="true"></span>');getById('nest-svg-export').disabled=busy||!lastSVG;}
 function invalid(message){last=null;lastSVG='';getById('nest-preview').textContent='Không thể lập sơ đồ với thông số hiện tại.';getById('nest-legend').textContent='';getById('nest-figure-title').textContent='TẤM PHÔI';setText(root,'#nest-error',message);for(const id of ['nest-issued','nest-finished','nest-waste','nest-remnant','nest-summary','nest-sizing','nest-strategy','nest-preview-note'])getById(id).textContent='—';getById('nest-preview-note').textContent='';status('');}
 function present(res){
  last=res;
  const pic=previewDrawing(res);lastSVG=pic.download;
  getById('nest-preview').innerHTML=pic.svg;
  getById('nest-figure-title').textContent=pic.title;
  getById('nest-legend').innerHTML=pic.legend;
  const count=res.shownOnSheet;
  getById('nest-preview-note').textContent=res.previewDrawn<count?`Minh họa ${prettyPortable(res.previewDrawn)}/${prettyPortable(count)} chi tiết đầu tiên`:'';
  if(state.autoMax)getField('quantity').value=prettyPortable(res.partsPerSheet);
  setText(root,'#nest-issued',prettyPortable(res.issuedKG));
  setText(root,'#nest-finished',prettyPortable(res.finishedKG));
  setText(root,'#nest-waste',percentagePortable(res.wasteOverFinishedPercent));
  setText(root,'#nest-remnant',state.autoMax?'—':res.remnantL>0?`${prettyPortable(res.remnantL)} × ${prettyPortable(res.remnantW)}`:'Không có');
  setText(root,'#nest-summary',state.autoMax?`${prettyPortable(res.partsPerSheet)} chi tiết / tấm`:`Tấm cuối: ${prettyPortable(res.lastSheetParts)} / ${prettyPortable(res.partsPerSheet)} chi tiết`);
  const i=res.input;
  setText(root,'#nest-sizing',i.shape==='circle'?`TP D${prettyPortable(i.diameter)} → Cắt D${prettyPortable(res.cutW)} mm`:`TP ${prettyPortable(i.partW)} × ${prettyPortable(i.partH)} → Cắt ${prettyPortable(res.cutW)} × ${prettyPortable(res.cutH)} mm`);
  setText(root,'#nest-strategy',!i.autoMax&&res.remnantL>0?`Xuất dài ${prettyPortable(res.issuedLastLength)} mm · Tấm lẻ giữ lại ${prettyPortable(res.remnantL)} × ${prettyPortable(res.remnantW)} mm`:nestingStrategy(res));
  getById('nest-error').textContent='';status('');
 }
 function compute(){
  serial++;const job=serial;
  if(worker){worker.terminate();worker=null;}
  let args;try{collectFields();args=payload();}catch(e){invalid(e.message);return;}
  last=null;lastSVG='';status('Đang tính sơ đồ…',true);
  function complete(value,error){if(job!==serial||ctx.signal?.aborted)return;worker?.terminate();worker=null;if(error)invalid(error);else present(value);}
  try{
   worker=new Worker(new URL('./nesting.js',import.meta.url),{type:'module',name:'epsilon-nesting'});
   worker.addEventListener('message',e=>complete(e.data?.result,e.data?.ok?null:e.data?.error||'Không thể tính trải phôi.'),{once:true});
   worker.addEventListener('error',e=>{if(job!==serial||ctx.signal?.aborted)return;worker?.terminate();worker=null;console.warn('Nesting Worker:',e.message);try{complete(calculateNesting(args),null);}catch(err){complete(null,err.message);}}, {once:true});
   worker.postMessage(args);
  }catch(e){worker?.terminate();worker=null;try{complete(calculateNesting(args),null);}catch(err){complete(null,err.message);}}
 }
 function schedule(){clearTimeout(timer);if(worker){worker.terminate();worker=null;serial++;}status('Đang cập nhật…',true);timer=setTimeout(compute,170);}
 root.addEventListener('input',e=>{
  if(!e.target.matches('input[name]'))return;
  collectFields();if(e.target.name==='quantity'&&state.autoMax)return;schedule();
 },{signal:ctx.signal});
 root.addEventListener('focusout',e=>{
  if(!e.target.matches('input[name]')||e.target.readOnly)return;
  const key=e.target.name;
  try{e.target.value=prettyPortable(parseNestNumber(e.target.value,key));collectFields();}catch{}
 },{signal:ctx.signal});
 getField('shape').addEventListener('change',e=>{
  collectFields();state.shape=e.target.value;
  state.allowance=state.allowances[state.shape]??DEFAULT_STATE.allowances[state.shape];
  if(state.shape==='circle'&&state.cutMethod==='shear'){
   state.sheets.shear=[state.sheetW,state.sheetH,state.thickness];state.gaps.shear=state.gap;
   state.cutMethod='laser';[state.sheetW,state.sheetH,state.thickness]=state.sheets.laser;state.gap=state.gaps.laser;
  }
  savedState=structuredClone(state);syncUI();schedule();
 },{signal:ctx.signal});
 root.addEventListener('click',e=>{
  const mat=e.target.closest('[data-nest-material]');
  if(mat){if(!materialCatalog){ctx.showToast?.('Danh mục vật liệu chưa tải xong.','error');return;}collectFields();state.material=Number(mat.dataset.nestMaterial);state.density=String(materialCatalog[state.material].density);state.customDensity=false;savedState=structuredClone(state);syncUI();schedule();return;}
  const mode=e.target.closest('[data-nest-mode]');
  if(mode){collectFields();state.autoMax=mode.dataset.nestMode==='auto';savedState=structuredClone(state);syncUI();schedule();return;}
  const cut=e.target.closest('[data-nest-cut]');
  if(cut&&!cut.disabled){collectFields();const next=cut.dataset.nestCut;if(next!==state.cutMethod){
   state.sheets[state.cutMethod]=[state.sheetW,state.sheetH,state.thickness];state.gaps[state.cutMethod]=state.gap;
   state.cutMethod=next;[state.sheetW,state.sheetH,state.thickness]=state.sheets[next];state.gap=state.gaps[next];
   savedState=structuredClone(state);syncUI();schedule();}return;}
 },{signal:ctx.signal});
 const select=getById('nest-all-materials'),retry=getById('nest-material-retry');
 select.addEventListener('change',()=>{
  const idx=Number(select.value),item=materialCatalog?.[idx];if(!select.value||!item)return;
  collectFields();state.material=idx;state.density=String(item.density);state.customDensity=false;savedState=structuredClone(state);syncUI();schedule();
 },{signal:ctx.signal});
 async function loadCatalog(){
  const warning=getById('nest-material-warning');retry.hidden=true;warning.hidden=true;
  select.disabled=true;select.innerHTML='<option value="">Đang tải vật liệu...</option>';
  try{
   const catalog=await loadMaterials();
   if(ctx.signal?.aborted)return;
   if(!Array.isArray(catalog)||catalog.length<4||!catalog.every(v=>v&&typeof v.name==='string'&&Number.isFinite(v.density)&&v.density>0))throw Error('Danh mục vật liệu không hợp lệ');
   materialCatalog=catalog;
   select.replaceChildren(new Option(`Danh mục ${catalog.length} vật liệu`,'') ,...catalog.map((v,i)=>new Option(v.name,String(i))));
   select.disabled=false;
   root.querySelectorAll('[data-nest-material]').forEach((b,i)=>{b.disabled=false;b.textContent=catalog[i].name;});
   if(!Number.isInteger(state.material)||state.material<0||state.material>=catalog.length)state.material=0;
   state.density=String(catalog[state.material].density);state.customDensity=false;savedState=structuredClone(state);syncUI();schedule();
  }catch(error){if(ctx.signal?.aborted)return;materialCatalog=null;select.disabled=true;retry.hidden=false;warning.hidden=false;warning.textContent='Không tải được materials.json; đang dùng khối lượng riêng đã lưu. Kiểm tra dữ liệu và nhấn Tải lại.';console.warn('Nesting catalog:',error);}
 }
 retry.addEventListener('click',()=>void loadCatalog(),{signal:ctx.signal});
 getById('nest-svg-export').addEventListener('click',()=>{
  if(!last||!lastSVG){ctx.showToast?.('Chưa có sơ đồ hợp lệ để xuất.','error');return;}
  downloadBlob(new Blob([lastSVG],{type:'image/svg+xml;charset=utf-8'}),'epsilon-soft-trai-phoi-2d.svg');ctx.showToast?.('Đã tạo sơ đồ SVG.');
 },{signal:ctx.signal});
 getById('nest-copy').addEventListener('click',()=>{
  if(!last)return;
  const text=`ES TOOLKIT Nesting | capacity ${last.partsPerSheet}/sheet | ${last.sheets} sheets | issued ${prettyPortable(last.issuedKG)} kg | finished ${prettyPortable(last.finishedKG)} kg | waste ${prettyPortable(last.wasteKG)} kg | waste/finished ${percentagePortable(last.wasteOverFinishedPercent)}% | last remnant ${prettyPortable(last.remnantL)} x ${prettyPortable(last.remnantW)} mm | last issued length ${prettyPortable(last.issuedLastLength)} mm`;
  if(!navigator.clipboard?.writeText){ctx.showToast?.('Không thể sao chép khi trình duyệt không hỗ trợ.','error');return;}
  navigator.clipboard.writeText(text).then(()=>ctx.showToast?.('Đã sao chép kết quả.'),()=>ctx.showToast?.('Không sao chép được kết quả.','error'));
 },{signal:ctx.signal});
 syncUI();compute();void loadCatalog();
 return ()=>{clearTimeout(timer);serial++;worker?.terminate();worker=null;};
}
