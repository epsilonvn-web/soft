/**
 * Epsilon Soft - TRẢI PHÔI 2D PRO – Ghép nhiều chi tiết trên nhiều tờ (Web) – BẢN TEST NỘI BỘ
 * Tên file: nesting_pro.js. Kế thừa lõi một loại của nesting.js (giữ nguyên thuật toán đã kiểm chứng).
 * !!! File này chứa toàn bộ thuật toán. Chỉ dùng để test nội bộ, KHÔNG đưa lên web công khai.
 * Phạm vi: chữ nhật, tròn, vành khuyên (chèn chi tiết vào lỗ); nhiều khổ + kho tấm lẻ; xuất DXF máy cắt + DXF cutting plan.
 * Quy ước (đã chốt với anh):
 *  - Kích thước nhập là THÀNH PHẨM; kích thước CẮT = thành phẩm + dư gia công (tổng, không phải mỗi bên).
 *  - Mọi chi tiết cùng mác thép, cùng chiều dày, cùng một phương pháp cắt trên một tờ.
 *  - Mạch cắt k giữa hai chi tiết; chừa mép e ở 4 cạnh tờ (được = 0).
 *  - Không giới hạn số tờ: ghép đến khi hết chi tiết.
 *  - Hao phí / TP = (KL xuất − KL tấm lẻ thu hồi − KL thành phẩm) / KL thành phẩm.
 *  - Tấm lẻ thu hồi khi cạnh ngắn ≥ ngưỡng (mặc định 200 mm, TÙY CHỈNH); dưới ngưỡng tính vào hao phí.
 *  - Phần dư mép mỗi tờ (dư phải, dư dưới) luôn được ghi kích thước, dù to hay nhỏ.
 *  - Mỗi lần đổi số liệu chạy lại từ đầu, thử nhiều cách phối kết hợp, đưa ra các phương án khác nhau để chọn.
 *  - Thứ tự xếp hạng: đủ số lượng → thép thực tiêu hao ít nhất → ít tờ → xếp khít → sơ đồ gọn (ít khối).
 *  - Chặt sấn: chỉ chữ nhật, mọi sơ đồ phải tách được bằng nhát chặt chạy suốt (kiểm tra độc lập).
 *  - Laser/plasma: chữ nhật + tròn, được xếp không chặt suốt (xoay vòng, so le, xếp tự do).
 * Bản quyền © Epsilon Lab.
 */
const LIMIT = 1e6, EPS = 1e-7;
const MAX_TYPES = 200, MAX_PIECES = 20000, MAX_SHEETS = 5000;
const DEFAULTS = Object.freeze({
  remnantMin: 200,
  dpCostFull: 6e7,          // khối lượng phép tính tối đa cho bảng quy hoạch động đầy đủ / 1 loại
  dpCostPure: 3e8,          // khi vượt -> bảng thu gọn (chỉ bội số thuần)
  pinwheelMsTotal: 2000,    // thời gian tìm kiểu xoay vòng cho các tờ một loại (chia đều các loại)
  pinwheelWork: 1e7,
  maxRectsPieces: 600,      // xếp tự do từng chiếc chỉ chạy khi số chiếc còn lại ≤ ngưỡng này
  tidyTolerance: 100,       // tờ cuối: sơ đồ gọn (theo khối) được ưu tiên nếu phần dư chỉ ngắn hơn ≤ 100 mm
  planMs: 10000,            // thời gian tối đa thử thêm các chiến lược phối kết hợp
  altWithin: 1.0,           // phương án thay thế chỉ hiện khi hao phí kém phương án tốt nhất ≤ 1 điểm % VÀ khác biệt thật
});

class UserError extends Error {}
const fail = msg => { throw new UserError(msg); };
const r6 = v => Math.round(v * 1e6) / 1e6;
const sum = a => a.reduce((s, v) => s + v, 0);

/* ======================================================================= */
/* 1. LÕI MỘT LOẠI – KẾ THỪA NGUYÊN THUẬT TOÁN CỦA nesting.js               */
/*    (thêm tham số rot: cho phép xoay 90° hay không)                       */
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
      if (s.size > 40000) break;
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
 * Bảng quy hoạch động: F[i][j] = số chiếc tối đa (chặt suốt nhiều cấp) trên miếng X[i] × Y[j].
 * Toạ độ "quy đổi": mỗi chi tiết chiếm (a+k) × (b+k); vùng dùng được cộng thêm k.
 * Trả null nếu chi tiết không lọt, { tooBig } nếu vượt khối lượng tính cho phép.
 */
function buildTable(WW, HH, a, b, k, pureOnly, rot, costLimit) {
  const A = a + k, B = b + k;
  const X = rot ? normalPoints(WW, A, B, pureOnly) : normalPoints(WW, A, A, true);
  const Y = rot ? normalPoints(HH, A, B, pureOnly) : normalPoints(HH, B, B, true);
  const nx = X.length, ny = Y.length;
  if (!nx || !ny) return null;
  const cost = nx * nx * ny / 2 + ny * ny * nx / 2;
  if (cost > costLimit) return { tooBig: true };
  const N = nx * ny;
  const F = new Int32Array(N), BL = new Int32Array(N), T = new Int8Array(N), P = new Int32Array(N);
  for (let j = 0; j < ny; j++) {
    const h = Y[j];
    for (let i = 0; i < nx; i++) {
      const w = X[i], id = i * ny + j;
      const n1 = Math.floor(w / A + 1e-9) * Math.floor(h / B + 1e-9);
      const n2 = rot ? Math.floor(w / B + 1e-9) * Math.floor(h / A + 1e-9) : 0;
      let best = n1 >= n2 ? n1 : n2, blocks = best > 0 ? 1 : 0, type = n1 >= n2 ? 0 : 1, pos = -1;
      let q = i;
      for (let p = 0; p < nx && X[p] <= w / 2 + EPS; p++) {          // nhát dọc
        const rest = w - X[p];
        while (q >= 0 && X[q] > rest + EPS) q--;
        const pid = p * ny + j, qid = q * ny + j;
        const c = F[pid] + (q >= 0 ? F[qid] : 0);
        const bl = BL[pid] + (q >= 0 ? BL[qid] : 0);
        if (c > best || (c === best && c > 0 && bl < blocks)) { best = c; blocks = bl; type = 2; pos = p; }
      }
      q = j;
      for (let p = 0; p < ny && Y[p] <= h / 2 + EPS; p++) {          // nhát ngang
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

function countAny(tb, w, h) {
  const i = floorIdx(tb.X, w), j = floorIdx(tb.Y, h);
  return i < 0 || j < 0 ? 0 : tb.F[i * tb.ny + j];
}
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
  const best = L => {
    let m = 0;
    for (let i = 0; i * A <= L + EPS; i++) m = Math.max(m, i * A + Math.floor((L - i * A) / B + 1e-9) * B);
    return m;
  };
  return Math.floor(best(WW) * best(HH) / (A * B) + 1e-9);
}

/** Bố trí 5 khối xoay vòng (không chặt suốt) – chỉ laser/plasma. Nguyên văn nesting.js. */
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
  return { ...best, complete };
}
function placePinwheel(tb, cut, WW, HH, e, out) {
  const [x1, x2, y1, y2] = cut;
  placeAny(tb, e, e, x1, y2, out, null);
  placeAny(tb, e + x1, e, WW - x1, y1, out, null);
  placeAny(tb, e + x2, e + y1, WW - x2, HH - y1, out, null);
  placeAny(tb, e, e + y2, x2, HH - y2, out, null);
  placeAny(tb, e + x1, e + y1, x2 - x1, y2 - y1, out, null);
}

/* ======================================================================= */
/* 2. TRÒN – LƯỚI VUÔNG VÀ SO LE (nguyên văn nesting.js)                    */
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
/* 3. CHUẨN BỊ CÁC LOẠI CHI TIẾT                                            */
/* ======================================================================= */
/** Mỗi loại: kích thước cắt cw × ch (tròn/vành khuyên: cw = ch = D ngoài cắt), quy đổi A = cw + k, B = ch + k.
 *  Bảng quy hoạch động dựng một lần trên vùng của khổ LỚN NHẤT -> dùng được cho mọi khổ nhỏ hơn và mọi ô con. */
function prepareTypes(i, maxW, maxH) {
  const k = i.gap, e = i.margin, shear = i.cutMethod === 'shear';
  const WW = maxW - 2 * e + k, HH = maxH - 2 * e + k;
  const types = i.parts.map((p, t) => {
    const ring = p.shape === 'ring', circle = p.shape === 'circle' || ring;
    const cw = (circle ? p.diameter : p.partW) + p.allowance;
    const ch = (circle ? p.diameter : p.partH) + p.allowance;
    const hole = ring ? p.inner - p.allowanceIn : 0;               // Ø lỗ cắt = Ø trong TP − dư Ø trong
    const rot = !circle && p.rotate !== false && Math.abs(cw - ch) > EPS;
    // Thành phẩm phủ bì; riêng vành khuyên trừ lỗ (lỗ được dùng để chèn chi tiết khác – CHỜ XÁC NHẬN)
    const tpArea = ring ? Math.PI * (p.diameter ** 2 - p.inner ** 2) / 4 : circle ? Math.PI * p.diameter ** 2 / 4 : p.partW * p.partH;
    const cutArea = circle ? Math.PI * cw ** 2 / 4 : cw * ch;          // diện tích chiếm chỗ (dùng để chấm điểm phương án)
    const netArea = cutArea - Math.PI * hole ** 2 / 4;                 // diện tích phôi cắt thực
    const lbArea = circle ? Math.PI * ((cw + k) ** 2 - Math.max(0, hole - k) ** 2) / 4 : (cw + k) * (ch + k);
    const T = { t, name: p.name, noRotate: !circle && p.rotate === false && Math.abs(cw - ch) > EPS, circle, ring, hole, cw, ch,
      A: cw + k, B: ch + k, rot, tpArea, cutArea, netArea, lbArea, qty: p.qty, tb: null };
    if (!circle && cw + k <= WW + EPS && ch + k <= HH + EPS || (!circle && rot && ch + k <= WW + EPS && cw + k <= HH + EPS)) {
      let tb = buildTable(WW, HH, cw, ch, k, false, rot, DEFAULTS.dpCostFull);
      if (tb && tb.tooBig) { tb = buildTable(WW, HH, cw, ch, k, true, rot, DEFAULTS.dpCostPure); if (tb && !tb.tooBig) tb.pureOnly = true; }
      T.tb = tb && !tb.tooBig ? tb : null;
    }
    return T;
  });
  return { k, e, shear, types };
}
/** Chi tiết loại T có lọt khổ W × H không (đã tính mạch, mép). */
function fitsStock(T, W, H, k, e) {
  const WW = W - 2 * e + k, HH = H - 2 * e + k;
  if (T.circle) return T.cw <= Math.min(W, H) - 2 * e + EPS;
  return (T.A <= WW + EPS && T.B <= HH + EPS) || (T.rot && T.B <= WW + EPS && T.A <= HH + EPS);
}

/** Số chiếc lưới đơn (dự phòng khi không có bảng). */
function gridCount(T, w, h) {
  const n1 = Math.floor(w / T.A + 1e-9) * Math.floor(h / T.B + 1e-9);
  const n2 = T.rot ? Math.floor(w / T.B + 1e-9) * Math.floor(h / T.A + 1e-9) : 0;
  return { n: Math.max(n1, n2), turned: n2 > n1 };
}

/* ---------- Tờ chỉ một loại (dùng thẳng thuật toán bản Free) ---------- */
function purePattern(C, T, msBudget) {
  const { e, k, WW, HH, shear } = C;
  const items = [], cuts = [];
  let strategy, upper = null;
  if (T.circle && fitsStock(T, C.W, C.H, k, e)) {
    const region = { x: e, y: e, w: C.W - 2 * e, h: C.H - 2 * e };
    const p = bestCirclePlan(region, T.cw, k);
    items.push(...circleLayout(region, T.cw, k, p));
    strategy = p.hex ? 'staggered' : 'grid';
  } else if (!fitsStock(T, C.W, C.H, k, e)) {
    strategy = 'none';
  } else if (T.tb) {
    const tb = T.tb, xi = floorIdx(tb.X, WW), yj = floorIdx(tb.Y, HH);
    if (xi >= 0 && yj >= 0) placeIdx(tb, xi, yj, e, e, items, shear ? cuts : null);
    strategy = xi >= 0 && yj >= 0 && tb.BL[xi * tb.ny + yj] > 1 ? 'guillotine' : 'grid';
    upper = T.rot ? upperBound(WW, HH, T.A, T.B) : Math.floor(WW / T.A + 1e-9) * Math.floor(HH / T.B + 1e-9);
    if (!shear && T.rot && items.length < upper && C.demand[T.t] >= items.length) {
      const pw = pinwheel(tb, WW, HH, upper, Date.now() + msBudget, DEFAULTS.pinwheelWork);
      if (pw.n > items.length) { items.length = 0; placePinwheel(tb, pw.cut, WW, HH, e, items); strategy = 'rotary'; }
    }
  } else {
    const g = gridCount(T, WW, HH), pw = g.turned ? T.B : T.A, ph = g.turned ? T.A : T.B;
    for (let c = 0; c < Math.floor(WW / pw + 1e-9); c++)
      for (let r = 0; r < Math.floor(HH / ph + 1e-9); r++) items.push({ x: e + c * pw, y: e + r * ph, w: pw - k, h: ph - k });
    strategy = 'grid';
  }
  const placed = items.map(p => tag(T, p));
  const counts = C.types.map(() => 0); counts[T.t] = placed.length;
  return { items: placed, cuts: cuts.map(c => ({ ...c, seq: 0 })), counts, blocks: 1, strategy: 'pure-' + strategy, upper };
}
function tag(T, p) {
  const o = { t: T.t, x: p.x, y: p.y, w: p.w, h: p.h, circle: T.circle,
    rot: !T.circle && Math.abs(p.w - T.cw) > 1e-6 };
  if (T.ring) { o.ring = true; o.hole = T.hole; }
  return o;
}

/* ======================================================================= */
/* 4. BỘ XẾP KHỐI CHẶT SUỐT (dùng cho cả chặt sấn và laser)                 */
/* Cách làm giống thợ: lấy một ô trống, đặt vào góc một KHỐI gồm các chi    */
/* tiết cùng loại (khối tự xếp tối ưu bằng bảng quy hoạch động), rồi chia   */
/* phần còn lại của ô bằng hai nhát cắt suốt. Lặp đến khi hết ô / hết chi   */
/* tiết. Vì mọi bước đều là nhát cắt suốt nên toàn tờ luôn chặt suốt được.  */
/* ======================================================================= */

/** Đánh giá nhanh khối của loại T trong ô R (toạ độ quy đổi) – chưa dựng toạ độ. */
function blockOptions(C, T, R, need) {
  const k = C.k, out = [];
  if (T.circle) {
    const real = { x: R.x, y: R.y, w: R.w - k, h: R.h - k };
    if (real.w + EPS < T.cw || real.h + EPS < T.cw) return out;
    const p = bestCirclePlan(real, T.cw, k);
    if (!p.count) return out;
    if (need >= p.count) { out.push({ n: p.count, bw: R.w, bh: R.h, sub: { w: real.w, h: real.h }, order: 'x' }); return out; }
    for (const axis of ['w', 'h']) {                      // co ô theo một chiều cho vừa đủ "need" chiếc
      let lo = T.cw, hi = real[axis];
      for (let s = 0; s < 30 && hi - lo > 0.5; s++) {
        const mid = (lo + hi) / 2, r = { ...real, [axis]: mid };
        if (bestCirclePlan(r, T.cw, k).count >= need) hi = mid; else lo = mid;
      }
      const sub = { w: real.w, h: real.h, [axis]: hi };
      out.push({ n: need, bw: sub.w + k, bh: sub.h + k, sub, order: axis === 'w' ? 'x' : 'y' });
    }
    return out;
  }
  if (T.tb) {
    const tb = T.tb, i = floorIdx(tb.X, R.w), j = floorIdx(tb.Y, R.h);
    if (i < 0 || j < 0) return out;
    const c = tb.F[i * tb.ny + j];
    if (!c) return out;
    if (need >= c) { out.push({ n: c, bw: tb.X[i], bh: tb.Y[j], ij: [i, j], order: 'x' }); return out; }
    // Biên Pareto (rộng, cao) nhỏ nhất vẫn chứa đủ "need" chiếc: ứng với mỗi bề rộng, bề cao thấp nhất.
    // Ví dụ 30 chiếc 490×555 có thể là khối 10 cột × 3 hàng, 9 × 4 thiếu… – thợ cũng ướm nhiều kích thước khối.
    let ii = 0; while (ii < i && tb.F[ii * tb.ny + j] < need) ii++;
    const front = [];
    for (let a = ii, jj = j; a <= i; a++) {
      while (jj > 0 && tb.F[a * tb.ny + jj - 1] >= need) jj--;
      if (tb.F[a * tb.ny + jj] < need) continue;
      if (!front.length || tb.Y[jj] < front[front.length - 1].bh - EPS) front.push({ n: need, bw: tb.X[a], bh: tb.Y[jj], ij: [a, jj], order: 'x' });
    }
    const step = Math.max(1, Math.ceil(front.length / 24));
    front.forEach((o, k) => { if (k % step === 0 || k === front.length - 1) out.push(o); });
    out[out.length - 1].order = 'y';
    return out;
  }
  const g = gridCount(T, R.w, R.h);
  if (!g.n) return out;
  const pw = g.turned ? T.B : T.A, ph = g.turned ? T.A : T.B;
  const cx = Math.floor(R.w / pw + 1e-9), cy = Math.floor(R.h / ph + 1e-9), n = Math.min(g.n, need);
  out.push({ n, bw: Math.min(cx, Math.ceil(n / cy)) * pw, bh: Math.min(cy, n) * ph, grid: { pw, ph, cx, cy }, order: 'x' });
  return out;
}

/** Dựng toạ độ thật cho phương án khối đã chọn; trả items, cuts nội bộ, kích thước bao thật. */
function buildBlock(C, T, R, o) {
  const k = C.k, raw = [], cuts = C.shear ? [] : null;
  if (T.circle) {
    const p = bestCirclePlan({ x: R.x, y: R.y, ...o.sub }, T.cw, k);
    raw.push(...circleLayout({ x: R.x, y: R.y, ...o.sub }, T.cw, k, p));
  } else if (o.ij) {
    placeIdx(T.tb, o.ij[0], o.ij[1], R.x, R.y, raw, cuts);
  } else {
    const { pw, ph, cx, cy } = o.grid;
    for (let c = 0; c < cx; c++) for (let r = 0; r < cy; r++) raw.push({ x: R.x + c * pw, y: R.y + r * ph, w: pw - k, h: ph - k });
    if (cuts) {
      for (let r = 1; r < cy; r++) cuts.push({ x1: R.x, y1: R.y + r * ph - k / 2, x2: R.x + cx * pw - k, y2: R.y + r * ph - k / 2 });
      for (let c = 1; c < cx; c++) cuts.push({ x1: R.x + c * pw - k / 2, y1: R.y, x2: R.x + c * pw - k / 2, y2: R.y + cy * ph - k });
    }
  }
  if (raw.length > o.n) {
    raw.sort(o.order === 'x' ? (p, q) => p.x - q.x || p.y - q.y : (p, q) => p.y - q.y || p.x - q.x);
    raw.length = o.n;
  }
  let bw = 0, bh = 0;
  for (const p of raw) { bw = Math.max(bw, p.x + p.w - R.x + k); bh = Math.max(bh, p.y + p.h - R.y + k); }
  bw = Math.min(bw, R.w); bh = Math.min(bh, R.h);
  // xén các nhát nội bộ vào khung bao (giao của sơ đồ chặt suốt với một hình chữ nhật vẫn chặt suốt)
  const xMax = R.x + bw - k, yMax = R.y + bh - k, inner = [];
  for (const c of cuts || []) {
    const x1 = Math.min(c.x1, xMax), x2 = Math.min(c.x2, xMax), y1 = Math.min(c.y1, yMax), y2 = Math.min(c.y2, yMax);
    if (c.x1 === c.x2 ? c.x1 < xMax - EPS && y2 - y1 > EPS : c.y1 < yMax - EPS && x2 - x1 > EPS)
      inner.push({ x1, y1, x2, y2, seq: 0 });
  }
  return { items: raw.map(p => tag(T, p)), cuts: inner, bw, bh };
}

/** Ước lượng nhanh diện tích lấp được của ô R nếu chỉ dùng MỘT loại (loại tốt nhất còn chi tiết). */
function rectValue(C, R, rem) {
  if (R.w <= EPS || R.h <= EPS) return 0;
  let best = 0;
  for (const T of C.types) {
    if (rem[T.t] <= 0) continue;
    let n;
    if (T.circle) { const real = { x: 0, y: 0, w: R.w - C.k, h: R.h - C.k }; n = real.w + EPS < T.cw || real.h + EPS < T.cw ? 0 : bestCirclePlan(real, T.cw, C.k).count; }
    else n = T.tb ? countAny(T.tb, R.w, R.h) : gridCount(T, R.w, R.h).n;
    best = Math.max(best, Math.min(n, rem[T.t]) * T.cutArea);
  }
  return best;
}
/** Hai cách chia phần còn lại của ô sau khi đặt khối bw × bh. */
function splitPieces(R, bw, bh, mode) {
  return mode === 'h'
    ? [{ x: R.x, y: R.y + bh, w: R.w, h: R.h - bh }, { x: R.x + bw, y: R.y, w: R.w - bw, h: bh }]
    : [{ x: R.x + bw, y: R.y, w: R.w - bw, h: R.h }, { x: R.x, y: R.y + bh, w: bw, h: R.h - bh }];
}

/**
 * Xếp một tờ (hoặc một vùng) bằng khối chặt suốt.
 * opt.pick:  'bl' ô trên-trái trước | 'area' ô lớn trước
 * opt.rule:  'fill' khối lấp nhiều diện tích nhất | 'big' chi tiết lớn trước | 'dense' khối đặc nhất
 *            'look' nhìn trước một bước: khối + phần còn lại lấp được nhiều nhất (giống thợ ướm thử)
 * opt.split: 'h' nhát ngang trước | 'v' nhát dọc trước | 'max' chọn cách để lại ô lớn nhất
 */
function blockPack(C, rem0, region, opt, quota = null) {
  // quota: PHỐI ĐỀU – đặt trước phần "định mức" của từng loại cho tờ này, ô nào không dùng được thì để dành,
  // sau đó lấp tiếp các ô còn lại bằng toàn bộ chi tiết còn thiếu.
  let rem = quota ? rem0.map((v, t) => Math.min(v, quota[t])) : rem0.slice();
  const items = [], cuts = [], counts = C.types.map(() => 0), later = [];
  let free = [{ ...region }], phase = quota ? 1 : 2;
  let seq = 0, blocks = 0;
  const minDim = () => {
    let m = Infinity;
    for (const T of C.types) if (rem[T.t] > 0) m = Math.min(m, T.circle ? T.A : (T.rot ? Math.min(T.A, T.B) : Math.min(T.A, T.B)));
    return m;
  };
  let md = minDim();
  for (;;) {
    if (!free.length || md === Infinity) {
      if (phase === 1) { phase = 2; free = free.concat(later); rem = rem0.map((v, t) => v - counts[t]); md = minDim(); continue; }
      break;
    }
    let bi = 0;
    for (let f = 1; f < free.length; f++) {
      const a = free[f], b = free[bi];
      if (opt.pick === 'bl' ? (a.y < b.y - EPS || (Math.abs(a.y - b.y) <= EPS && a.x < b.x)) : a.w * a.h > b.w * b.h) bi = f;
    }
    const R = free.splice(bi, 1)[0];
    if (R.w + EPS < md || R.h + EPS < md) { if (phase === 1) later.push(R); continue; }
    let best = null, bestKey = null;
    for (const T of C.types) {
      if (rem[T.t] <= 0) continue;
      for (const o of blockOptions(C, T, R, rem[T.t])) {
        const placed = o.n * T.cutArea, dens = placed / (o.bw * o.bh);
        if (opt.rule === 'look') {
          const r2 = rem.slice(); r2[T.t] -= o.n;
          for (const mode of ['h', 'v']) {
            const v = placed + splitPieces(R, o.bw, o.bh, mode).reduce((s2, P) => s2 + rectValue(C, P, r2), 0);
            const key = [v, placed, dens];
            if (!bestKey || key[0] > bestKey[0] + 1e-9 || (Math.abs(key[0] - bestKey[0]) <= 1e-9 && key[1] > bestKey[1] + 1e-9)) { best = { T, o, mode }; bestKey = key; }
          }
          continue;
        }
        const key = opt.rule === 'big' ? [T.cutArea, placed, dens] : opt.rule === 'dense' ? [dens, placed, 0] : [placed, dens, 0];
        if (!bestKey || key[0] > bestKey[0] + 1e-9 || (Math.abs(key[0] - bestKey[0]) <= 1e-9 &&
            (key[1] > bestKey[1] + 1e-9 || (Math.abs(key[1] - bestKey[1]) <= 1e-9 && key[2] > bestKey[2] + 1e-9)))) {
          best = { T, o }; bestKey = key;
        }
      }
    }
    if (!best) { if (phase === 1) later.push(R); continue; }       // ô không dùng được -> phế (giai đoạn 1: để dành)
    const b = buildBlock(C, best.T, R, best.o);
    if (!b.items.length) continue;
    items.push(...b.items); rem[best.T.t] -= b.items.length; counts[best.T.t] += b.items.length; blocks++;
    const { bw, bh } = b, k = C.k;
    let mode = opt.rule === 'look' && opt.split === 'look' ? best.mode : opt.split;
    if (mode === 'look') mode = 'max';
    if (mode === 'max') {
      const hMax = Math.max(R.w * (R.h - bh), (R.w - bw) * bh), vMax = Math.max((R.w - bw) * R.h, bw * (R.h - bh));
      mode = hMax >= vMax ? 'h' : 'v';
    }
    const restW = R.w - bw > EPS, restH = R.h - bh > EPS;
    if (mode === 'h') {
      if (restH) { if (C.shear) cuts.push({ x1: R.x, y1: R.y + bh - k / 2, x2: R.x + R.w - k, y2: R.y + bh - k / 2, seq: ++seq }); free.push({ x: R.x, y: R.y + bh, w: R.w, h: R.h - bh }); }
      if (restW) { if (C.shear) cuts.push({ x1: R.x + bw - k / 2, y1: R.y, x2: R.x + bw - k / 2, y2: R.y + bh - k, seq: ++seq }); free.push({ x: R.x + bw, y: R.y, w: R.w - bw, h: bh }); }
    } else {
      if (restW) { if (C.shear) cuts.push({ x1: R.x + bw - k / 2, y1: R.y, x2: R.x + bw - k / 2, y2: R.y + R.h - k, seq: ++seq }); free.push({ x: R.x + bw, y: R.y, w: R.w - bw, h: R.h }); }
      if (restH) { if (C.shear) cuts.push({ x1: R.x, y1: R.y + bh - k / 2, x2: R.x + bw - k, y2: R.y + bh - k / 2, seq: ++seq }); free.push({ x: R.x, y: R.y + bh, w: bw, h: R.h - bh }); }
    }
    cuts.push(...b.cuts);
    md = minDim();
  }
  return { items, cuts, counts, blocks, strategy: 'block' };
}

/* ======================================================================= */
/* 5. XẾP TỰ DO TỪNG CHIẾC (MaxRects) – chỉ laser/plasma, đơn hàng nhỏ      */
/* ======================================================================= */
function maxRectsPack(C, rem0, region, opt) {
  const pieces = [];
  C.types.forEach(T => { for (let j = 0; j < rem0[T.t]; j++) pieces.push(T); });
  const key = {
    area: T => T.A * T.B, side: T => Math.max(T.A, T.B), perim: T => T.A + T.B, width: T => Math.min(T.A, T.B),
  }[opt.order];
  pieces.sort((a, b) => key(b) - key(a) || b.A * b.B - a.A * a.B || a.t - b.t);
  let free = [{ ...region }];
  const items = [], counts = C.types.map(() => 0);
  let minW = Infinity;
  for (const T of pieces) minW = Math.min(minW, Math.min(T.A, T.B));
  for (const T of pieces) {
    let best = null;
    const orients = T.rot ? [[T.A, T.B], [T.B, T.A]] : [[T.A, T.B]];
    for (const f of free) for (const [w, h] of orients) {
      if (w > f.w + EPS || h > f.h + EPS) continue;
      const ls = Math.min(f.w - w, f.h - h), ll = Math.max(f.w - w, f.h - h);
      const s = opt.rule === 'bssf' ? [ls, ll] : opt.rule === 'baf' ? [f.w * f.h - w * h, ls] : [f.y, f.x];
      if (!best || s[0] < best.s[0] - EPS || (Math.abs(s[0] - best.s[0]) <= EPS && s[1] < best.s[1] - EPS)) best = { s, x: f.x, y: f.y, w, h };
    }
    if (!best) continue;
    const P = { x: best.x, y: best.y, w: best.w, h: best.h };
    items.push(tag(T, { x: P.x, y: P.y, w: P.w - C.k, h: P.h - C.k })); counts[T.t]++;
    const next = [];
    for (const f of free) {
      if (P.x >= f.x + f.w - EPS || P.x + P.w <= f.x + EPS || P.y >= f.y + f.h - EPS || P.y + P.h <= f.y + EPS) { next.push(f); continue; }
      if (P.x > f.x + EPS) next.push({ x: f.x, y: f.y, w: P.x - f.x, h: f.h });
      if (P.x + P.w < f.x + f.w - EPS) next.push({ x: P.x + P.w, y: f.y, w: f.x + f.w - P.x - P.w, h: f.h });
      if (P.y > f.y + EPS) next.push({ x: f.x, y: f.y, w: f.w, h: P.y - f.y });
      if (P.y + P.h < f.y + f.h - EPS) next.push({ x: f.x, y: P.y + P.h, w: f.w, h: f.y + f.h - P.y - P.h });
    }
    free = next.filter(f => f.w + EPS >= minW && f.h + EPS >= minW);
    free = free.filter((a, ia) => !free.some((b, ib) => ib !== ia &&
      a.x >= b.x - EPS && a.y >= b.y - EPS && a.x + a.w <= b.x + b.w + EPS && a.y + a.h <= b.y + b.h + EPS &&
      (ib < ia || a.x > b.x + EPS || a.y > b.y + EPS || a.w < b.w - EPS || a.h < b.h - EPS)));
    if (!free.length) break;
  }
  return { items, cuts: [], counts, blocks: items.length, strategy: 'free' };
}


/* ======================================================================= */
/* 5b. CHÈN KHE (laser/plasma): đưa chi tiết còn lại vào khe hở của sơ đồ   */
/* Phôi tròn: thử các vị trí TIẾP XÚC (sát 2 phôi, sát phôi + mép, góc…),   */
/* kiểm tra khoảng cách chính xác. Chữ nhật: thử các góc tạo bởi cạnh phải/ */
/* cạnh dưới các chi tiết đã đặt. Ưu tiên vị trí lệch trái để dồn dư sang   */
/* phải (tấm lẻ thu hồi lớn hơn).                                          */
/* ======================================================================= */
function makeIndex(cellSize) {
  const map = new Map(), all = [];
  let stamp = 0;
  const keyOf = (gx, gy) => gx * 100003 + gy;
  return {
    all,
    add(o) {
      all.push(o); o._s = 0;
      for (let gx = Math.floor(o.x / cellSize); gx <= Math.floor((o.x + o.w) / cellSize); gx++)
        for (let gy = Math.floor(o.y / cellSize); gy <= Math.floor((o.y + o.h) / cellSize); gy++) {
          const kk = keyOf(gx, gy); let l = map.get(kk); if (!l) map.set(kk, l = []); l.push(o);
        }
    },
    /** Các vật cản có khung bao chạm vùng [x0,x1]×[y0,y1] (không trùng lặp). */
    near(x0, y0, x1, y1) {
      const out = [], st = ++stamp;
      for (let gx = Math.floor(x0 / cellSize); gx <= Math.floor(x1 / cellSize); gx++)
        for (let gy = Math.floor(y0 / cellSize); gy <= Math.floor(y1 / cellSize); gy++) {
          const l = map.get(keyOf(gx, gy));
          if (l) for (const o of l) if (o._s !== st) { o._s = st; out.push(o); }
        }
      return out;
    },
  };
}
/** Hình mới q (x,y,w,h,circle) có hợp lệ với mọi chi tiết đã đặt không (đủ mạch k, trong mép). */
function freeAt(C, idx, q) {
  const k = C.k, tol = 1e-6;
  if (q.x < C.e - tol || q.y < C.e - tol || q.x + q.w > C.W - C.e + tol || q.y + q.h > C.H - C.e + tol) return false;
  for (const p of idx.near(q.x - k, q.y - k, q.x + q.w + k, q.y + q.h + k)) {
    if (q.circle && p.circle) {
      if (Math.hypot(q.x + q.w / 2 - p.x - p.w / 2, q.y + q.h / 2 - p.y - p.h / 2) < q.w / 2 + p.w / 2 + k - tol) return false;
    } else if (q.circle || p.circle) {
      const c = q.circle ? q : p, r = q.circle ? p : q, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      const nx = Math.max(r.x, Math.min(cx, r.x + r.w)), ny = Math.max(r.y, Math.min(cy, r.y + r.h));
      if (Math.hypot(cx - nx, cy - ny) < c.w / 2 + k - tol) return false;
    } else if (!(q.x + q.w + k <= p.x + tol || p.x + p.w + k <= q.x + tol || q.y + q.h + k <= p.y + tol || p.y + p.h + k <= q.y + tol)) return false;
  }
  return true;
}
/** Tâm ứng viên cho phôi tròn bán kính r: giao điểm các "đường tiếp xúc" quanh các vật cản trong list. */
function circleSpots(C, list, idx, r, withSheet) {
  const k = C.k;
  const lo = C.e + r, hiX = C.W - C.e - r, hiY = C.H - C.e - r;
  const sheetPrims = [{ kind: 'v', v: lo }, { kind: 'v', v: hiX }, { kind: 'h', v: lo }, { kind: 'h', v: hiY }];
  const primsOf = p => p.circle
    ? [{ kind: 'c', x: p.x + p.w / 2, y: p.y + p.h / 2, R: p.w / 2 + r + k }]
    : [{ kind: 'v', v: p.x - r - k }, { kind: 'v', v: p.x + p.w + r + k }, { kind: 'h', v: p.y - r - k }, { kind: 'h', v: p.y + p.h + r + k },
       { kind: 'c', x: p.x, y: p.y, R: r + k }, { kind: 'c', x: p.x + p.w, y: p.y, R: r + k },
       { kind: 'c', x: p.x, y: p.y + p.h, R: r + k }, { kind: 'c', x: p.x + p.w, y: p.y + p.h, R: r + k }];
  const pts = [];
  const push = (x, y) => { if (x >= lo - 1e-6 && x <= hiX + 1e-6 && y >= lo - 1e-6 && y <= hiY + 1e-6) pts.push([x, y]); };
  const meet = (a, b) => {
    if (a.kind !== 'c' && b.kind !== 'c') { if (a.kind !== b.kind) a.kind === 'v' ? push(a.v, b.v) : push(b.v, a.v); return; }
    if (a.kind === 'c' && b.kind === 'c') {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < 1e-9 || d > a.R + b.R || d < Math.abs(a.R - b.R)) return;
      const t = (a.R * a.R - b.R * b.R + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, a.R * a.R - t * t));
      const mx = a.x + dx * t / d, my = a.y + dy * t / d;
      push(mx + dy * hh / d, my - dx * hh / d); push(mx - dy * hh / d, my + dx * hh / d); return;
    }
    const c = a.kind === 'c' ? a : b, l = a.kind === 'c' ? b : a;
    const off = l.v - (l.kind === 'v' ? c.x : c.y);
    if (Math.abs(off) > c.R) return;
    const s = Math.sqrt(c.R * c.R - off * off);
    if (l.kind === 'v') { push(l.v, c.y + s); push(l.v, c.y - s); } else { push(c.x + s, l.v); push(c.x - s, l.v); }
  };
  if (withSheet) for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) meet(sheetPrims[i], sheetPrims[j]);
  const reach = 2 * r + 2 * k;
  const active = withSheet ? freeNear(C, idx.all, reach) : null;
  for (const p of list) {
    if (active && !active.has(p)) continue;                 // chi tiết nằm giữa vùng kín -> không thể có khe cạnh nó
    const P = primsOf(p);
    for (const a of P) for (const s of sheetPrims) meet(a, s);
    for (const q of idx.near(p.x - reach, p.y - reach, p.x + p.w + reach, p.y + p.h + reach)) {
      if (q === p) continue;
      for (const a of P) for (const b of primsOf(q)) meet(a, b);
    }
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) meet(P[i], P[j]);
  }
  return pts;
}
/**
 * Lưới ô vuông 25 mm: ô "kín" khi nằm trọn trong một chi tiết (phôi tròn: trong hình vuông nội tiếp).
 * Trả tập chi tiết có ô trống trong phạm vi reach – chỉ quanh các chi tiết này mới có thể chèn thêm.
 */
function freeNear(C, items, reach) {
  const cs = 25, nx = Math.ceil(C.W / cs), ny = Math.ceil(C.H / cs), full = new Uint8Array(nx * ny);
  for (const p of items) {
    let x0 = p.x, y0 = p.y, x1 = p.x + p.w, y1 = p.y + p.h;
    if (p.circle) { const h = p.w / 2 * (1 - Math.SQRT1_2); x0 += h; y0 += h; x1 -= h; y1 -= h; }
    for (let gx = Math.ceil(x0 / cs); (gx + 1) * cs <= x1; gx++) for (let gy = Math.ceil(y0 / cs); (gy + 1) * cs <= y1; gy++) full[gx * ny + gy] = 1;
  }
  // ô ngoài vùng cắt (mép tờ) coi như kín
  for (let gx = 0; gx < nx; gx++) for (let gy = 0; gy < ny; gy++)
    if (gx * cs < C.e - 1e-9 || gy * cs < C.e - 1e-9 || (gx + 1) * cs > C.W - C.e + 1e-9 || (gy + 1) * cs > C.H - C.e + 1e-9) full[gx * ny + gy] = 1;
  const out = new Set();
  for (const p of items) {
    const ax = Math.max(0, Math.floor((p.x - reach) / cs)), bx = Math.min(nx - 1, Math.floor((p.x + p.w + reach) / cs));
    const ay = Math.max(0, Math.floor((p.y - reach) / cs)), by = Math.min(ny - 1, Math.floor((p.y + p.h + reach) / cs));
    search: for (let gx = ax; gx <= bx; gx++) for (let gy = ay; gy <= by; gy++) if (!full[gx * ny + gy]) { out.add(p); break search; }
  }
  return out;
}
/** Vị trí góc ứng viên cho chữ nhật: sát phải / sát dưới các chi tiết đã đặt và sát mép tờ. */
function rectSpots(C, list) {
  const k = C.k, pts = [];
  for (const p of list) {
    pts.push([p.x + p.w + k, p.y], [p.x, p.y + p.h + k], [p.x + p.w + k, C.e], [C.e, p.y + p.h + k], [p.x + p.w + k, p.y + p.h + k]);
  }
  return pts;
}
/** Hàng đợi ưu tiên theo (x, y) nhỏ trước – lấy vị trí lệch trái nhất. */
class SpotHeap {
  constructor() { this.a = []; this.seen = new Set(); }
  less(p, q) { return p[0] < q[0] - 1e-9 || (Math.abs(p[0] - q[0]) <= 1e-9 && p[1] < q[1]); }
  push(p) {
    const key = Math.round(p[0] * 20) * 1e6 + Math.round(p[1] * 20);
    if (this.seen.has(key)) return; this.seen.add(key);
    const a = this.a; a.push(p);
    for (let i = a.length - 1; i > 0;) { const j = (i - 1) >> 1; if (!this.less(a[i], a[j])) break; [a[i], a[j]] = [a[j], a[i]]; i = j; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}
function gapFill(C, cand, rem, budgetMax = 6e5) {
  const left = rem.map((v, t) => v - cand.counts[t]);
  if (!sum(left)) return cand;
  const items = cand.items.slice(), counts = cand.counts.slice();
  const idx = makeIndex(Math.max(100, ...C.types.map(T => Math.max(T.cw, T.ch))) + C.k);
  for (const p of items) idx.add(p);
  const order = C.types.filter(T => left[T.t] > 0).sort((a, b) => b.cutArea - a.cutArea);
  let added = 0, budget = budgetMax;                             // giới hạn số phép thử
  for (const T of order) {
    // vị trí đã hỏng thì hỏng mãi (chỉ có thêm vật cản) -> bỏ khỏi hàng đợi
    const heap = new SpotHeap();
    for (const p of T.circle ? circleSpots(C, idx.all, idx, T.cw / 2, true)
      : [[C.e, C.e], ...rectSpots(C, (() => { const a = freeNear(C, idx.all, Math.max(T.cw, T.ch) + C.k); return idx.all.filter(p => a.has(p)); })())]) heap.push(p);
    const dims = T.circle ? [[T.cw, T.cw]] : T.rot ? [[T.cw, T.ch], [T.ch, T.cw]] : [[T.cw, T.ch]];
    while (left[T.t] > 0 && budget > 0 && heap.size) {
      const [x, y] = heap.pop();
      let spot = null;
      for (const [w, h] of dims) {
        budget--;
        const q = T.circle ? { x: x - w / 2, y: y - w / 2, w, h, circle: true } : { x, y, w, h, circle: false };
        if (freeAt(C, idx, q)) { spot = q; break; }
      }
      if (!spot) continue;
      const it = tag(T, spot); items.push(it); idx.add(it); left[T.t]--; counts[T.t]++; added++;
      for (const p of T.circle ? circleSpots(C, [it], idx, T.cw / 2, false) : rectSpots(C, [it])) heap.push(p);
    }
  }
  if (!added) return cand;
  return { ...cand, items, counts, blocks: cand.blocks + 1, strategy: cand.strategy + '+fill' };
}

/* ======================================================================= */
/* 6. MỘT TỜ: THỬ NHIỀU CÁCH, CHỌN CÁCH TỐT NHẤT                            */
/* ======================================================================= */
const BLOCK_OPTS = [];
for (const pick of ['bl', 'area']) for (const rule of ['fill', 'big', 'dense']) for (const split of ['h', 'v', 'max']) BLOCK_OPTS.push({ pick, rule, split });
for (const pick of ['bl', 'area']) for (const split of ['look', 'h', 'v']) BLOCK_OPTS.push({ pick, rule: 'look', split });
const BLOCK_OPTS_FAST = BLOCK_OPTS.filter(o => o.rule === 'look' || (o.rule === 'fill' && o.split === 'max') || (o.rule === 'big' && o.split === 'max'));
const FREE_OPTS = [];
for (const order of ['area', 'side', 'width']) for (const rule of ['bssf', 'baf']) FREE_OPTS.push({ order, rule });

function sheetScore(C, cand, mode) {
  let s = 0;
  for (const T of C.types) {
    const n = cand.counts[T.t];
    if (n) s += n * T.cutArea * (mode === 'big' ? Math.pow(T.cutArea / C.maxCutArea, 0.25)
      : mode === 'small' ? Math.pow(C.maxCutArea / T.cutArea, 0.25) : 1);
  }
  return s;
}

/**
 * Chọn phương án cho một tờ/vùng.
 * needAll = true: chỉ nhận phương án xếp đủ toàn bộ rem (dùng khi dồn tờ cuối).
 */
function packSheet(C, rem, region, { mode = 'area', needAll = false, full = true, must = null, tidy = false, all = false, quota = null } = {}) {
  const total = sum(rem), cands = [];
  if (full && !quota) for (const T of C.types) {
    const P = C.pure[T.t];
    if (P && P.items.length && rem[T.t] >= P.items.length) cands.push(P);
  }
  // dồn tờ cuối (needAll) chạy nhiều lần -> dùng bộ chiến lược rút gọn để nhanh
  for (const o of needAll ? BLOCK_OPTS_FAST : BLOCK_OPTS) cands.push(blockPack(C, rem, region, o, quota));
  if (!C.shear && !tidy && !quota && total <= (needAll ? 150 : DEFAULTS.maxRectsPieces)) for (const o of FREE_OPTS) cands.push(maxRectsPack(C, rem, region, o));
  const rank = (a, b) => sheetScore(C, b, mode) - sheetScore(C, a, mode) || a.blocks - b.blocks;
  let pool = cands.filter(c => !must || c.counts.every((v, t) => v >= must[t])).sort(rank);
  // chèn khe chỉ áp dụng cho laser/plasma, khi tờ còn chi tiết chưa xếp; vùng phải là tờ đủ chiều
  // (dồn tờ cuối: bỏ qua nếu diện tích còn trống chắc chắn không đủ cho số chi tiết còn thiếu)
  const roomOK = c => !needAll || C.types.reduce((s2, T) => s2 + (rem[T.t] - c.counts[T.t]) * T.lbArea, 0)
    <= region.w * region.h - C.types.reduce((s2, T) => s2 + c.counts[T.t] * T.lbArea, 0) + 1e-6;
  // dồn tờ cuối: còn thiếu quá nhiều chiếc thì vùng đang thử chắc chắn chật -> không tốn công chèn khe
  if (!C.shear && pool.length && sum(pool[0].counts) < total && roomOK(pool[0]) && (!needAll || total - sum(pool[0].counts) <= 30)) {
    const top = pool.slice(0, needAll ? 1 : 2).map(c => withRegion(C, region, () => gapFill(C, c, rem, needAll ? 1.5e5 : 6e5)));
    pool = [...top, ...pool.slice(top.length)].sort(rank);
  }
  if (needAll) pool = pool.filter(c => sum(c.counts) >= total);
  return all ? pool : pool[0] || null;
}
/** Chèn khe làm việc theo mép tờ; với vùng bị thu ngắn (dồn tờ cuối) tạm coi mép là biên vùng. */
function withRegion(C, region, fn) {
  const W = C.W, H = C.H;
  C.W = region.x + region.w - C.k + C.e; C.H = region.y + region.h - C.k + C.e;
  try { return fn(); } finally { C.W = W; C.H = H; }
}

/* ======================================================================= */
/* 7. NHIỀU TỜ: XẾP TỪNG TỜ, LẶP LẠI SƠ ĐỒ TỐT, DỒN PHẦN DƯ VỀ TỜ CUỐI      */
/* ======================================================================= */
/**
 * Xếp lần lượt từng tờ.
 *  mode  'area' lấp nhiều diện tích nhất | 'big' ưu tiên chi tiết lớn | 'small' ưu tiên chi tiết nhỏ
 *  capK  > 0: PHỐI ĐỀU – mỗi tờ chỉ lấy khoảng 1/k số còn lại của từng loại, rồi chèn thêm cho kín tờ
 *  first ép sơ đồ tờ đầu (dùng để thử nhiều cách mở đầu khác nhau)
 */
function planAll(C, demand, mode, limit = Infinity, { capK = 0, first = null } = {}) {
  const rem = demand.slice(), groups = [];
  let sheets = 0;
  while (sum(rem) > 0) {
    if (sheets >= limit) return null;                              // hết phôi khổ này
    let best;
    if (first && !groups.length) best = first;
    else if (capK > 0) {
      const left = Math.max(1, capK - sheets);
      const quota = rem.map(v => Math.ceil(v / left));
      best = packSheet(C, rem, C.full, { mode, quota });
    } else best = packSheet(C, rem, C.full, { mode });
    if (!best || !sum(best.counts)) return null;                    // có chi tiết không lọt khổ này
    // lặp lại sơ đồ này khi còn đủ chi tiết; để lại một lượt để tờ sau được tính lại
    let m = Infinity;
    best.counts.forEach((c, t) => { if (c > 0) m = Math.min(m, Math.floor(rem[t] / c)); });
    m = Math.min(Math.max(1, capK > 0 || (first && !groups.length) ? 1 : m - 1), limit - sheets);
    best.counts.forEach((c, t) => { rem[t] -= c * m; });
    groups.push({ n: m, sheet: best });
    sheets += m;
    if (sheets > MAX_SHEETS) fail(`Số tờ vượt ${MAX_SHEETS}. Kiểm tra lại số lượng chi tiết.`);
  }
  // gộp các tờ liền nhau giống hệt (phối đều thường cho nhiều tờ trùng sơ đồ)
  const out = [];
  for (const g of groups) {
    const p = out[out.length - 1];
    if (p && sameSheet(p.sheet, g.sheet)) p.n += g.n; else out.push({ ...g });
  }
  return out;
}
function sameSheet(a, b) {
  if (a === b) return true;
  if (a.items.length !== b.items.length || a.counts.some((c, t) => c !== b.counts[t])) return false;
  return a.items.every((p, k) => { const q = b.items[k]; return p.t === q.t && Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6 && Math.abs(p.w - q.w) < 1e-6; });
}

/**
 * Rót chi tiết tờ cuối vào các tờ còn chỗ (tờ dùng ít nhất trước): xếp lại tờ đó với
 * chi tiết cũ + chi tiết tờ cuối. Hết chi tiết -> bớt được một tờ; còn thì tờ cuối nhẹ hơn,
 * tấm lẻ thu hồi lớn hơn.
 */
function absorbLast(C, groups, mode) {
  groups = groups.map(g => ({ ...g }));
  let last = groups[groups.length - 1];
  if (groups.length < 2 && last.n < 2) return groups;
  if (last.n > 1) { groups[groups.length - 1] = { n: last.n - 1, sheet: last.sheet }; groups.push(last = { n: 1, sheet: last.sheet }); }
  let left = last.sheet.counts.slice();
  const used = g => g.sheet.items.reduce((s, p) => s + C.types[p.t].cutArea, 0);
  const order = groups.slice(0, -1).map((g, idx) => ({ g, idx, u: used(g) })).sort((a, b) => a.u - b.u).slice(0, 12);
  let changed = false;
  for (const { idx } of order) {
    if (!sum(left)) break;
    const g = groups[idx], comb = g.sheet.counts.map((c, t) => c + left[t]);
    const cand = packSheet(C, comb, C.full, { mode, full: false, must: g.sheet.counts });
    if (!cand || sum(cand.counts) <= sum(g.sheet.counts)) continue;
    left = comb.map((c, t) => c - cand.counts[t]);
    if (g.n > 1) { groups[idx] = { n: g.n - 1, sheet: g.sheet }; groups.splice(idx + 1, 0, { n: 1, sheet: cand }); }
    else groups[idx] = { n: 1, sheet: cand };
    changed = true;
  }
  if (!changed) return groups;
  groups.pop();
  if (sum(left)) {
    const rest = packSheet(C, left, C.full, { mode, needAll: true, full: false });
    if (!rest) return null;                       // không xếp lại được -> bỏ cải tiến
    groups.push({ n: 1, sheet: rest });
  }
  return groups;
}

/** Tấm lẻ của một tờ: dải cuối theo chiều dài hoặc chiều rộng, giữ khi cạnh ngắn ≥ ngưỡng. */
function remnantOf(C, items, remnantMin) {
  let maxR = 0, maxB = 0;
  for (const p of items) { maxR = Math.max(maxR, p.x + p.w); maxB = Math.max(maxB, p.y + p.h); }
  const ceil1 = v => Math.ceil(v * 10 - 1e-6) / 10;
  const usedL = Math.min(C.W, ceil1(maxR + C.e)), usedH = Math.min(C.H, ceil1(maxB + C.e));
  const opts = [];
  const remL = r6(C.W - usedL), remH = r6(C.H - usedH);
  if (Math.min(remL, C.H) >= remnantMin - EPS && remL > EPS) opts.push({ side: 'right', at: usedL, w: remL, h: C.H });
  if (Math.min(remH, C.W) >= remnantMin - EPS && remH > EPS) opts.push({ side: 'bottom', at: usedH, w: C.W, h: remH });
  opts.sort((a, b) => b.w * b.h - a.w * a.h);
  const free = [];
  if (C.W - maxR > EPS) free.push({ side: 'right', w: r6(C.W - maxR), h: C.H });
  if (C.H - maxB > EPS && maxR > EPS) free.push({ side: 'bottom', w: r6(maxR), h: r6(C.H - maxB) });
  return { remnant: opts[0] || null, freeStrips: free };
}

/** Dồn tờ cuối: tìm vùng ngắn nhất (theo dài hoặc theo rộng) vẫn xếp đủ chi tiết của tờ đó. */
function compactLast(C, groups, remnantMin, mode) {
  const g = groups[groups.length - 1], need = g.sheet.counts.slice();
  let best = { sheet: g.sheet, rem: remnantOf(C, g.sheet.items, remnantMin).remnant };
  const area = best.rem ? best.rem.w * best.rem.h : 0;
  let bestArea = area;
  const needArea = C.types.reduce((s, T) => s + need[T.t] * T.lbArea, 0);
  for (const axis of ['w', 'h']) {
    const full = axis === 'w' ? C.WW : C.HH, other = axis === 'w' ? C.HH : C.WW;
    // chỉ tìm trong khoảng [cận diện tích, độ dài đang dùng] – không cần thử dài hơn sơ đồ hiện có
    const cur = g.sheet.items.reduce((m, p) => Math.max(m, axis === 'w' ? p.x + p.w : p.y + p.h), 0) - C.e + C.k;
    const search = tidy => {
      let lo = Math.max(0, needArea / other - 1), hi = Math.min(full, cur + 1), found = null;
      for (let s = 0; s < 11 && hi - lo > 2; s++) {
        const mid = (lo + hi) / 2;
        const region = axis === 'w' ? { x: C.e, y: C.e, w: mid, h: C.HH } : { x: C.e, y: C.e, w: C.WW, h: mid };
        const cand = packSheet(C, need, region, { mode, needAll: true, full: false, tidy });
        if (cand) { hi = mid; found = cand; } else lo = mid;
      }
      return found;
    };
    const any = search(false), neat = any && /^free/.test(any.strategy) ? search(true) : null;
    const remA = r => { const x = r && remnantOf(C, r.items, remnantMin).remnant; return x ? x.w * x.h : 0; };
    // sơ đồ gọn thắng nếu tấm lẻ chỉ kém trong ngưỡng chấp nhận
    let found = any;
    if (neat && (!any || remA(neat) >= remA(any) - DEFAULTS.tidyTolerance * other - 1e-6)) found = neat;
    if (!found) continue;
    const r = remnantOf(C, found.items, remnantMin).remnant;
    const a = r ? r.w * r.h : 0;
    const tidyNow = !/^free/.test(best.sheet.strategy), tidyNew = !/^free/.test(found.strategy);
    if (a > bestArea + 1e-6 && (tidyNew || !tidyNow || a > bestArea + DEFAULTS.tidyTolerance * other)) { best = { sheet: found, rem: r }; bestArea = a; }
    else if (tidyNew && !tidyNow && a >= bestArea - DEFAULTS.tidyTolerance * other - 1e-6) { best = { sheet: found, rem: r }; bestArea = a; }
  }
  if (best.sheet === g.sheet) return groups;
  const out = groups.slice(0, -1);
  if (g.n > 1) out.push({ n: g.n - 1, sheet: g.sheet });
  out.push({ n: 1, sheet: best.sheet });
  return out;
}

/* ======================================================================= */
/* 8. VÀNH KHUYÊN – CHÈN CHI TIẾT VÀO LỖ                                    */
/* Lỗ vành khuyên là vùng tròn bán kính Rh; chi tiết chèn vào phải cách     */
/* mép lỗ ≥ mạch cắt k. Thử 3 cách, chọn cách lấp nhiều diện tích nhất:     */
/*  A. phôi tròn / vành khuyên lớn nhất đặt đồng tâm (vành lồng vành, đệ   */
/*     quy 3 cấp), rồi chèn phôi tròn nhỏ vào vành hở còn lại;             */
/*  B. lưới chữ nhật theo từng hàng dây cung, rồi chèn phôi tròn quanh;     */
/*  C. chỉ phôi tròn nhỏ, chèn sát mép lỗ.                                  */
/* Chèn vào lỗ luôn có lợi: chi tiết trong lỗ không tốn thêm thép.          */
/* ======================================================================= */
/** Lưới chữ nhật trong hình tròn bán kính L (mép chi tiết phải nằm trong L), toạ độ gốc ở tâm. */
function chordGrid(T, L, k) {
  let best = [];
  const orients = T.rot ? [[T.cw, T.ch], [T.ch, T.cw]] : [[T.cw, T.ch]];
  for (const [w, h] of orients) {
    const pw = w + k, ph = h + k, maxRows = Math.floor((2 * L + k) / ph + 1e-9);
    for (let m = 1; m <= maxRows; m++) {
      const out = [], top = -(m * ph - k) / 2;
      for (let r = 0; r < m; r++) {
        const y0 = top + r * ph, ym = Math.max(Math.abs(y0), Math.abs(y0 + h));
        if (ym > L) continue;
        const hw = Math.sqrt(L * L - ym * ym), n = Math.floor((2 * hw + k) / pw + 1e-9), x0 = -(n * pw - k) / 2;
        for (let c = 0; c < n; c++) out.push({ dx: x0 + c * pw, dy: y0, w, h });
      }
      if (out.length > best.length) best = out;
    }
  }
  const d = p => Math.hypot(p.dx + p.w / 2, p.dy + p.h / 2);
  return best.sort((a, b) => d(a) - d(b));
}
/** Chèn phôi tròn (không phải vành) vào hình tròn bán kính L đã có các vật cản (toạ độ gốc ở tâm). */
function diskInsert(C, rem0, L, placed) {
  const k = C.k, rem = rem0.slice(), items = [], obst = placed.slice();
  const order = C.types.filter(T => T.circle && !T.ring && rem[T.t] > 0).sort((a, b) => b.cw - a.cw);
  let guard = 0;
  for (const T of order) {
    const r = T.cw / 2;
    if (r > L) continue;
    while (rem[T.t] > 0 && guard++ < 400) {
      const prims = [{ kind: 'c', x: 0, y: 0, R: L - r }];
      for (const p of obst) {
        if (p.circle) prims.push({ kind: 'c', x: p.dx + p.w / 2, y: p.dy + p.h / 2, R: p.w / 2 + r + k });
        else prims.push({ kind: 'v', v: p.dx - r - k }, { kind: 'v', v: p.dx + p.w + r + k }, { kind: 'h', v: p.dy - r - k }, { kind: 'h', v: p.dy + p.h + r + k },
          { kind: 'c', x: p.dx, y: p.dy, R: r + k }, { kind: 'c', x: p.dx + p.w, y: p.dy, R: r + k },
          { kind: 'c', x: p.dx, y: p.dy + p.h, R: r + k }, { kind: 'c', x: p.dx + p.w, y: p.dy + p.h, R: r + k });
      }
      const pts = obst.length ? [] : [[-(L - r), 0]];
      const meet = (a, b) => {
        if (a.kind !== 'c' && b.kind !== 'c') { if (a.kind !== b.kind) pts.push(a.kind === 'v' ? [a.v, b.v] : [b.v, a.v]); return; }
        if (a.kind === 'c' && b.kind === 'c') {
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d < 1e-9 || d > a.R + b.R || d < Math.abs(a.R - b.R)) return;
          const t = (a.R * a.R - b.R * b.R + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, a.R * a.R - t * t));
          const mx = a.x + dx * t / d, my = a.y + dy * t / d;
          pts.push([mx + dy * hh / d, my - dx * hh / d], [mx - dy * hh / d, my + dx * hh / d]); return;
        }
        const c = a.kind === 'c' ? a : b, l = a.kind === 'c' ? b : a, off = l.v - (l.kind === 'v' ? c.x : c.y);
        if (Math.abs(off) > c.R) return;
        const s2 = Math.sqrt(c.R * c.R - off * off);
        if (l.kind === 'v') pts.push([l.v, c.y + s2], [l.v, c.y - s2]); else pts.push([c.x + s2, l.v], [c.x - s2, l.v]);
      };
      for (let u = 0; u < prims.length; u++) for (let v = u + 1; v < prims.length; v++) meet(prims[u], prims[v]);
      const ok = ([x, y]) => {
        if (Math.hypot(x, y) + r > L + 1e-6) return false;
        for (const p of obst) {
          if (p.circle) { if (Math.hypot(x - p.dx - p.w / 2, y - p.dy - p.h / 2) < p.w / 2 + r + k - 1e-6) return false; }
          else {
            const nx = Math.max(p.dx, Math.min(x, p.dx + p.w)), ny = Math.max(p.dy, Math.min(y, p.dy + p.h));
            if (Math.hypot(x - nx, y - ny) < r + k - 1e-6) return false;
          }
        }
        return true;
      };
      // ưu tiên điểm sát mép lỗ (xếp vòng quanh mép), sau đó trên → trái
      pts.sort((a, b) => Math.hypot(b[0], b[1]) - Math.hypot(a[0], a[1]) || a[1] - b[1] || a[0] - b[0]);
      const spot = pts.find(ok);
      if (!spot) break;
      const it = { t: T.t, dx: spot[0] - r, dy: spot[1] - r, w: T.cw, h: T.cw, circle: true };
      items.push(it); obst.push(it); rem[T.t]--;
    }
  }
  return { items, rem };
}
/** Lấp lỗ bán kính Rh (Ø lỗ cắt / 2) bằng các chi tiết còn lại; trả { items (toạ độ gốc ở tâm, có thể lồng kids), counts }. */
function holeFill(C, rem0, Rh, depth) {
  const k = C.k, L = Rh - k;
  const minDim = Math.min(...C.types.filter(T => rem0[T.t] > 0).map(T => Math.min(T.cw, T.ch)));
  if (!(L > 0) || minDim > 2 * L) return null;
  const opts = [];
  const value = list => list.reduce((s, p) => s + C.types[p.t].cutArea + (p.kids ? value(p.kids) : 0), 0);
  const rounds = C.types.filter(T => T.circle && rem0[T.t] > 0 && T.cw <= 2 * L + 1e-9).sort((a, b) => b.cw - a.cw);
  if (rounds.length) {                                                       // A. đồng tâm
    const T = rounds[0], r = rem0.slice(); r[T.t]--;
    const it = { t: T.t, dx: -T.cw / 2, dy: -T.cw / 2, w: T.cw, h: T.cw, circle: true };
    if (T.ring) { it.ring = true; it.hole = T.hole; }
    if (T.ring && depth < 3) {
      const sub = holeFill(C, r, T.hole / 2, depth + 1);
      if (sub) { it.kids = sub.items; sub.counts.forEach((c, t) => { r[t] -= c; }); }
    }
    const ins = diskInsert(C, r, L, [it]);
    opts.push({ items: [it, ...ins.items], rem: ins.rem });
  }
  for (const T of C.types) {                                                  // B. lưới chữ nhật
    if (T.circle || rem0[T.t] <= 0) continue;
    const g = chordGrid(T, L, k).slice(0, rem0[T.t]);
    if (!g.length) continue;
    const r = rem0.slice(); r[T.t] -= g.length;
    const items = g.map(p => ({ t: T.t, dx: p.dx, dy: p.dy, w: p.w, h: p.h, circle: false, rot: Math.abs(p.w - T.cw) > 1e-6 }));
    const ins = diskInsert(C, r, L, items);
    opts.push({ items: [...items, ...ins.items], rem: ins.rem });
  }
  const only = diskInsert(C, rem0, L, []);                                    // C. chỉ phôi tròn
  if (only.items.length) opts.push(only);
  if (!opts.length) return null;
  opts.sort((a, b) => value(b.items) - value(a.items));
  const best = opts[0];
  return { items: best.items, counts: rem0.map((v, t) => v - best.rem[t]) };
}
/**
 * Chuẩn bị "bộ lỗ" cho từng vành khuyên trước khi xếp tờ (vành lỗ lớn trước).
 * Trả: sheetDemand (số chi tiết còn phải xếp lên tờ – vành chỉ tính chiếc nằm ngoài),
 *      kits[t] = hàng đợi [{ n, items, counts }] gán lần lượt cho từng vành loại t trên tờ.
 */
function buildKits(C, demand) {
  const rem = demand.slice(), kits = C.types.map(() => []), outer = demand.slice();
  if (C.shear) return { sheetDemand: rem, kits };
  for (const T of C.types.filter(T => T.ring).sort((a, b) => b.hole - a.hole)) {
    let left = rem[T.t]; outer[T.t] = left; rem[T.t] = 0;
    while (left > 0) {
      const f = holeFill(C, rem, T.hole / 2, 1);
      if (!f || !sum(f.counts)) { kits[T.t].push({ n: left, items: [], counts: C.types.map(() => 0) }); break; }
      let m = left;
      f.counts.forEach((c, t) => { if (c > 0) m = Math.min(m, Math.floor(rem[t] / c)); });
      m = Math.max(1, m);
      f.counts.forEach((c, t) => { rem[t] -= c * m; });
      kits[T.t].push({ n: m, items: f.items, counts: f.counts });
      left -= m;
    }
  }
  return { sheetDemand: C.types.map(T => (T.ring ? outer[T.t] : rem[T.t])), kits };
}
/** Gán bộ lỗ cho từng vành đã xếp; tách nhóm tờ nếu các tờ nhận bộ lỗ khác nhau. */
function attachKits(C, groups, kits) {
  if (!kits.some(q => q.length && q.some(r => r.items.length))) return groups;
  const queue = kits.map(q => q.map(r => ({ ...r })));
  let runId = 0; queue.forEach(q => q.forEach(r => { r.id = runId++; }));
  const take = t => { const q = queue[t]; while (q.length && q[0].n <= 0) q.shift(); if (!q.length) return null; q[0].n--; return q[0]; };
  const flat = (list, cx, cy, out) => {
    for (const p of list) {
      const T = C.types[p.t], it = tag(T, { x: cx + p.dx, y: cy + p.dy, w: p.w, h: p.h });
      out.push(it);
      if (p.kids) flat(p.kids, cx + p.dx + p.w / 2, cy + p.dy + p.h / 2, out);
    }
  };
  const out = [];
  for (const g of groups) {
    if (!g.sheet.items.some(p => p.ring)) { out.push(g); continue; }
    for (let j = 0; j < g.n; j++) {
      const items = [], counts = g.sheet.counts.slice(), ids = [];
      let filled = false;
      for (const p of g.sheet.items) {
        items.push(p);
        if (!p.ring) continue;
        const run = take(p.t);
        ids.push(run ? run.id : -1);
        if (run && run.items.length) { filled = true; flat(run.items, p.x + p.w / 2, p.y + p.h / 2, items); run.counts.forEach((c, t) => { counts[t] += c; }); }
      }
      const sig = ids.join(','), prev = out[out.length - 1];
      if (prev && prev._sig === sig && prev._base === g.sheet) prev.n++;
      else out.push({ ...g, n: 1, _sig: sig, _base: g.sheet, sheet: { ...g.sheet, items, counts, strategy: g.sheet.strategy + (filled ? '+hole' : '') } });
    }
  }
  return out;
}

/* ======================================================================= */
/* 9. KIỂM TRA HÌNH HỌC ĐỘC LẬP                                             */
/* ======================================================================= */
/** Trả danh sách lỗi (rỗng = đạt): trong vùng cắt, đúng kích thước, đủ mạch cắt, không chồng lấn,
 *  chặt sấn phải tách được bằng nhát cắt suốt. Không dùng lại bất kỳ hàm xếp nào ở trên. */
function verifySheet(C, items) {
  const errs = [], k = C.k, tol = 1e-5;
  for (const p of items) {
    const T = C.types[p.t];
    if (p.x < C.e - tol || p.y < C.e - tol || p.x + p.w > C.W - C.e + tol || p.y + p.h > C.H - C.e + tol) errs.push('Chi tiết lấn mép tờ.');
    const ok = T.circle ? Math.abs(p.w - T.cw) < tol && Math.abs(p.h - T.cw) < tol
      : (Math.abs(p.w - T.cw) < tol && Math.abs(p.h - T.ch) < tol) || (T.rot && Math.abs(p.w - T.ch) < tol && Math.abs(p.h - T.cw) < tol);
    if (!ok) errs.push('Kích thước cắt sai.');
    if (errs.length) return errs;
  }
  const cell = Math.max(...items.map(p => Math.max(p.w, p.h))) + k + 1, buckets = new Map();
  items.forEach((p, idx) => {
    for (let gx = Math.floor(p.x / cell); gx <= Math.floor((p.x + p.w) / cell); gx++)
      for (let gy = Math.floor(p.y / cell); gy <= Math.floor((p.y + p.h) / cell); gy++) {
        const key = gx * 100003 + gy; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(idx);
      }
  });
  /** q nằm trọn trong lỗ của vành R, cách mép lỗ ≥ k */
  const inHole = (R, q) => {
    if (!R.ring) return false;
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2, lim = R.hole / 2 - k + tol;
    if (q.circle) return Math.hypot(q.x + q.w / 2 - cx, q.y + q.h / 2 - cy) + q.w / 2 <= lim;
    return Math.max(Math.abs(q.x - cx), Math.abs(q.x + q.w - cx)) ** 2 + Math.max(Math.abs(q.y - cy), Math.abs(q.y + q.h - cy)) ** 2 <= lim * lim;
  };
  const seen = new Set();
  const clash = (a, b) => {
    if (inHole(a, b) || inHole(b, a)) return false;
    if (a.circle && b.circle) {
      const dx = a.x + a.w / 2 - b.x - b.w / 2, dy = a.y + a.h / 2 - b.y - b.h / 2;
      return Math.hypot(dx, dy) < a.w / 2 + b.w / 2 + k - tol;
    }
    if (a.circle || b.circle) {
      const c = a.circle ? a : b, r = a.circle ? b : a, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      const nx = Math.max(r.x, Math.min(cx, r.x + r.w)), ny = Math.max(r.y, Math.min(cy, r.y + r.h));
      const inside = cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h;
      return inside || Math.hypot(cx - nx, cy - ny) < c.w / 2 + k - tol;
    }
    return !(a.x + a.w + k <= b.x + tol || b.x + b.w + k <= a.x + tol || a.y + a.h + k <= b.y + tol || b.y + b.h + k <= a.y + tol);
  };
  for (const list of buckets.values()) for (let u = 0; u < list.length; u++) for (let v = u + 1; v < list.length; v++) {
    const i = Math.min(list[u], list[v]), j = Math.max(list[u], list[v]), key = i * 1e6 + j;
    if (seen.has(key)) continue; seen.add(key);
    if (clash(items[i], items[j])) { errs.push('Hai chi tiết chồng lấn hoặc thiếu mạch cắt.'); return errs; }
  }
  if (C.shear && !guillotineOK(items, k)) errs.push('Sơ đồ chặt sấn không tách được bằng nhát cắt suốt.');
  return errs;
}
/** Tách đệ quy: luôn tìm được một đường thẳng chạy suốt không cắt qua chi tiết nào. */
function guillotineOK(items, k) {
  const stack = [items];
  while (stack.length) {
    const set = stack.pop();
    if (set.length <= 1) continue;
    let split = null;
    for (const [lo, len] of [['x', 'w'], ['y', 'h']]) {
      const s = set.slice().sort((a, b) => a[lo] - b[lo]);
      let reach = -Infinity;
      for (let i = 0; i < s.length - 1; i++) {
        reach = Math.max(reach, s[i][lo] + s[i][len]);
        if (s[i + 1][lo] >= reach + k - 1e-5) { split = [s.slice(0, i + 1), s.slice(i + 1)]; break; }
      }
      if (split) break;
    }
    if (!split) return false;
    stack.push(split[0], split[1]);
  }
  return true;
}

/* ======================================================================= */
/* 10. NHIỀU KHỔ + KHO PHÔI LẺ                                              */
/* ======================================================================= */
/** Ngữ cảnh tính cho một khổ: dùng chung bảng của các loại, sơ đồ "một loại" tính riêng cho khổ này. */
function makeCtx(base, stock, msPerType) {
  const C = { ...base, W: stock.W, H: stock.H, stock };
  C.WW = stock.W - 2 * C.e + C.k; C.HH = stock.H - 2 * C.e + C.k;
  C.full = { x: C.e, y: C.e, w: C.WW, h: C.HH };
  C.pure = C.types.map(T => purePattern(C, T, msPerType));
  return C;
}
/**
 * Kết hợp khổ: mỗi tờ thử mọi khổ còn phôi, chọn khổ có tỉ lệ sử dụng cao nhất;
 * tờ cuối chọn khổ cho thép thực tiêu hao (xuất − tấm lẻ thu hồi) nhỏ nhất.
 */
function planMixed(ctxs, demand, mode) {
  const rem = demand.slice(), groups = [], used = ctxs.map(() => 0);
  while (sum(rem) > 0) {
    let best = null;
    ctxs.forEach((C, si) => {
      if (used[si] >= C.stock.limit) return;
      const cand = packSheet(C, rem, C.full, { mode });
      if (!cand || !sum(cand.counts)) return;
      const placed = C.types.reduce((s, T) => s + cand.counts[T.t] * T.netArea, 0);
      const score = placed / (C.W * C.H);                           // tỉ lệ sử dụng tờ
      if (!best || score > best.score + 1e-9) best = { si, sheet: cand, score };
    });
    if (!best) return null;
    const C = ctxs[best.si];
    let m = Infinity;
    best.sheet.counts.forEach((c, t) => { if (c > 0) m = Math.min(m, Math.floor(rem[t] / c)); });
    m = Math.min(Math.max(1, m - 1), C.stock.limit - used[best.si]);
    best.sheet.counts.forEach((c, t) => { rem[t] -= c * m; });
    used[best.si] += m;
    groups.push({ n: m, sheet: best.sheet, si: best.si });
    if (sum(used) > MAX_SHEETS) fail(`Số tờ vượt ${MAX_SHEETS}.`);
  }
  return groups;
}
/** Thử đặt toàn bộ chi tiết tờ cuối sang khổ nhỏ hơn nếu vẫn xếp đủ (bớt thép xuất). */
function finalizeLast(ctxs, groups, mode) {
  if (!groups.length) return groups;
  const last = groups[groups.length - 1];
  let best = { si: last.si, sheet: last.sheet, area: ctxs[last.si].W * ctxs[last.si].H };
  const usedBy = ctxs.map((_, si) => groups.reduce((s, g) => s + (g.si === si ? g.n : 0), 0));
  ctxs.forEach((C, si) => {
    if (si === last.si || usedBy[si] >= C.stock.limit || C.W * C.H >= best.area - 1) return;
    const cand = packSheet(C, last.sheet.counts, C.full, { mode, needAll: true });
    if (!cand) return;
    const g = compactLast(C, [{ n: 1, sheet: cand }], 0, mode);
    best = { si, sheet: g[g.length - 1].sheet, area: C.W * C.H };
  });
  if (best.si === last.si) return groups;
  const out = groups.slice(0, -1);
  if (last.n > 1) out.push({ ...last, n: last.n - 1 });
  out.push({ n: 1, sheet: best.sheet, si: best.si });
  return out;
}

/* ======================================================================= */
/* 11. GIAO DIỆN CHUNG CỦA LÕI TÍNH                                         */
/* Mỗi lần đổi số liệu: chạy lại TỪ ĐẦU, thử nhiều cách phối kết hợp, giữ   */
/* các phương án tốt nhất khác nhau để người dùng chọn.                     */
/* ======================================================================= */
const STRATEGY_LABEL = {
  area: 'Lấp kín từng tờ', big: 'Chi tiết lớn trước', small: 'Chi tiết nhỏ trước',
  even: 'Phối đều các loại trên mọi tờ', look: 'Mở đầu khác', mixed: 'Kết hợp khổ từng tờ', last: 'Tờ cuối khổ nhỏ hơn',
};
export function calculateNestingPro(input) {
  const t0 = Date.now();
  const i = { ...input };
  if (i.remnantMin == null) i.remnantMin = DEFAULTS.remnantMin;
  for (const key of ['thickness', 'gap', 'margin', 'density', 'remnantMin'])
    if (!Number.isFinite(i[key]) || i[key] < 0 || i[key] > LIMIT) fail('Thông số không hợp lệ: ' + key);
  if (!['laser', 'shear'].includes(i.cutMethod)) fail('Phương pháp cắt không hợp lệ.');
  if (i.thickness <= 0 || i.density <= 0) fail('Kiểm tra chiều dày và vật liệu.');
  let stocks = Array.isArray(i.stocks) && i.stocks.length ? i.stocks : [{ W: i.sheetW, H: i.sheetH, limit: null, remnant: false }];
  stocks = stocks.map((s, idx) => {
    if (![s.W, s.H].every(v => Number.isFinite(v) && v > 0 && v <= LIMIT)) fail(`Kho phôi dòng ${idx + 1}: kích thước không hợp lệ.`);
    const W = Math.max(s.W, s.H), H = Math.min(s.W, s.H);                  // quy ước: dài ≥ rộng
    const limit = s.limit == null ? (s.remnant ? 1 : Infinity) : s.limit;
    if (!Number.isInteger(limit) && limit !== Infinity || limit < 0) fail(`Kho phôi dòng ${idx + 1}: số tờ phải là số nguyên.`);
    if (W - 2 * i.margin <= 0 || H - 2 * i.margin <= 0) fail(`Kho phôi dòng ${idx + 1}: chừa mép vượt kích thước tấm.`);
    return { idx, W, H, limit, remnant: !!s.remnant, lot: String(s.lot || '').slice(0, 60) };
  }).filter(s => s.limit > 0);
  if (!stocks.length) fail('Nhập ít nhất một khổ phôi.');
  if (stocks.length > 40) fail('Tối đa 40 dòng kho phôi.');

  const parts = (i.parts || []).filter(p => p && p.qty > 0);
  if (!parts.length) fail('Nhập ít nhất một chi tiết có số lượng.');
  if (parts.length > MAX_TYPES) fail(`Tối đa ${MAX_TYPES} loại chi tiết.`);
  let pieces = 0;
  for (const p of parts) {
    if (!['rect', 'circle', 'ring'].includes(p.shape)) fail('Hình dạng chi tiết không hợp lệ.');
    p.allowanceIn = p.allowanceIn ?? 0;
    const dims = p.shape === 'rect' ? [p.partW, p.partH] : p.shape === 'ring' ? [p.diameter, p.inner] : [p.diameter];
    if (dims.some(v => !Number.isFinite(v) || v <= 0 || v > LIMIT) || !Number.isFinite(p.allowance) || p.allowance < 0 ||
        !Number.isFinite(p.allowanceIn) || p.allowanceIn < 0 || !Number.isInteger(p.qty))
      fail(`Kiểm tra kích thước, dư gia công và số lượng của chi tiết "${p.name}".`);
    if (p.shape === 'ring' && (p.inner >= p.diameter || p.inner - p.allowanceIn <= 0))
      fail(`Vành khuyên "${p.name}": Ø trong phải nhỏ hơn Ø ngoài và lớn hơn dư gia công Ø trong.`);
    if (p.shape !== 'rect' && i.cutMethod === 'shear') fail(`Chặt sấn chỉ xếp chi tiết chữ nhật – "${p.name}" là chi tiết tròn/vành khuyên, hãy chuyển sang Laser / Plasma.`);
    pieces += p.qty;
  }
  if (pieces > MAX_PIECES) fail(`Tổng số chi tiết vượt ${MAX_PIECES.toLocaleString('vi-VN')} chiếc.`);
  i.parts = parts;

  const maxW = Math.max(...stocks.map(s => s.W)), maxH = Math.max(...stocks.map(s => s.H));
  const base = prepareTypes(i, maxW, maxH);
  base.maxCutArea = Math.max(...base.types.map(T => T.cutArea));
  const demand = base.types.map(T => T.qty);
  for (const T of base.types) if (!stocks.some(s => fitsStock(T, s.W, s.H, base.k, base.e)))
    fail(`Chi tiết "${T.name}" không lọt khổ phôi nào (đã tính dư gia công, mạch cắt và chừa mép).`);

  const { sheetDemand, kits } = buildKits(base, demand);
  base.demand = sheetDemand;
  const rectTypes = base.types.filter(T => !T.circle && T.rot).length || 1;
  const ctxs = stocks.map(s => makeCtx(base, s, Math.max(150, DEFAULTS.pinwheelMsTotal / rectTypes / Math.min(4, stocks.length))));

  // 1) tấm lẻ trong kho: dùng trước (tấm lớn trước)
  let rem = sheetDemand.slice();
  const pre = [];
  ctxs.map((C, si) => ({ C, si })).filter(o => o.C.stock.remnant).sort((a, b) => b.C.W * b.C.H - a.C.W * a.C.H).forEach(({ C, si }) => {
    for (let j = 0; j < C.stock.limit && sum(rem); j++) {
      let cand = packSheet(C, rem, C.full, { mode: 'area' });
      if (!cand || !sum(cand.counts)) break;
      if (sum(cand.counts) === sum(rem)) { const g = compactLast(C, [{ n: 1, sheet: cand }], 0, 'area'); cand = g[g.length - 1].sheet; }
      cand.counts.forEach((c, t) => { rem[t] -= c; });
      pre.push({ n: 1, sheet: cand, si });
    }
  });

  // 2) khổ tiêu chuẩn: nhiều chiến lược phối kết hợp, mỗi chiến lược chạy lại từ đầu
  const plans = [], invalid = [];
  const finish = (groups, label, single) => {
    if (!groups) return;
    const plan = evaluate(ctxs, attachKits(base, pre.concat(groups), kits), i.remnantMin);
    plan.label = label; plan.single = single;
    plans.push(plan);
  };
  const polish = (C, groups, mode) => {                               // rót tờ cuối + xếp khít tờ cuối
    groups = absorbLast(C, groups, mode) || groups;
    return compactLast(C, groups, 0, mode);
  };
  const late = () => Date.now() - t0 > DEFAULTS.planMs;
  if (!sum(rem)) finish([], 'Chỉ dùng tấm lẻ trong kho', null);
  else {
    const std = ctxs.map((C, si) => ({ C, si })).filter(o => !o.C.stock.remnant);
    for (const { C, si } of std) {
      const size = `${C.W}×${C.H}`;
      if (!base.types.every(T => !rem[T.t] || fitsStock(T, C.W, C.H, C.k, C.e))) { invalid.push(`Khổ ${size}: có chi tiết không lọt khổ`); continue; }
      const tag = (groups, key) => groups && groups.map(g => ({ ...g, si }));
      const run = (key, mode, extra) => {
        if (late() && plans.length) return null;
        const g = planAll(C, rem, mode, C.stock.limit, extra);
        if (!g) return null;
        const groups = tag(polish(C, g, mode));
        finish(groups, `${STRATEGY_LABEL[key]} · khổ ${size}`, si);
        return groups;
      };
      const greedy = run('area', 'area');
      if (!greedy) { invalid.push(`Khổ ${size}: không đủ số tờ trong kho`); continue; }
      const k = greedy.reduce((s, g) => s + g.n, 0);
      if (k > 1) run('even', 'area', { capK: k });                      // phối đều: mọi tờ đều có đủ các loại
      run('big', 'big'); run('small', 'small');
      // mở đầu khác: thử các phương án tờ đầu tốt thứ 2, 3… rồi xếp tiếp từ đầu
      if (k > 1) {
        const pool = packSheet(C, rem, C.full, { mode: 'area', all: true });
        const seen = new Set([pool[0]?.counts.join(',')]);
        let tries = 0;
        for (const cand of pool.slice(1)) {
          const key = cand.counts.join(',');
          if (seen.has(key) || tries >= 2) continue;
          seen.add(key); tries++;
          run('look', 'area', { first: cand });
        }
      }
      if (std.length > 1) {
        const last = finalizeLast(ctxs, greedy, 'area');
        if (last !== greedy) finish(last, `${STRATEGY_LABEL.last} · khổ chính ${size}`, null);
      }
    }
    if (std.length > 1 || std.some(o => o.C.stock.limit < Infinity)) {
      const mixed = planMixed(std.map(o => o.C), rem, 'area');
      if (mixed) {
        const groups = mixed.map(g => ({ ...g, si: std[g.si].si }));
        finish(finalizeLast(ctxs, groups, 'area'), STRATEGY_LABEL.mixed, null);
      }
    }
  }
  if (!plans.length) fail('Không đủ phôi trong kho để xếp hết chi tiết. ' + invalid.join('; '));

  // kiểm tra độc lập MỌI phương án đưa ra: từng tờ + tổng số lượng từng loại
  for (const plan of plans) {
    const made = base.types.map(() => 0);
    for (const g of plan.groups) {
      const errs = verifySheet(ctxs[g.si], g.items);
      if (errs.length) throw Error('Lỗi kiểm tra hình học (lỗi phần mềm, không phải do số liệu): ' + errs[0]);
      g.counts.forEach((c, t) => { made[t] += c * g.n; });
    }
    base.types.forEach(T => { if (made[T.t] !== T.qty) throw Error(`Lỗi kiểm tra số lượng: ${T.name} xếp ${made[T.t]} / ${T.qty}.`); });
  }
  // xếp hạng, bỏ phương án trùng, giữ tối đa 6
  plans.sort((a, b) => (better(a, b) ? -1 : better(b, a) ? 1 : 0));
  const sig = p => p.groups.map(g => `${g.n}:${g.W}x${g.H}:${g.counts.join('.')}`).join('|');
  const kept = [], seenSig = new Set();
  for (const p of plans) { const k = sig(p); if (!seenSig.has(k)) { seenSig.add(k); kept.push(p); } if (kept.length >= 6) break; }

  const kg = a => a * i.thickness * i.density / 1e9;
  const finishedArea = base.types.reduce((s, T) => s + T.qty * T.tpArea, 0);
  const lbCache = new Map();
  const mainCtx = ctxs[kept[0].single ?? ctxs.findIndex(C => !C.stock.remnant)] || ctxs[0];
  // Thép tấm: chọn hao phí thấp nhất. Chỉ đưa thêm phương án thay thế khi nó KHÁC BIỆT THẬT
  // (dùng khổ khác, ít tờ hơn, ít kiểu tờ hơn – dễ cắt) và hao phí không kém quá altWithin điểm %.
  const wasteOf = p => 100 * (p.issuedArea - p.recoveredArea - finishedArea) / finishedArea;
  const sizesOf = p => [...new Set(p.groups.map(g => `${g.remnantStock ? 'lẻ ' : ''}${g.W}×${g.H}`))].sort().join(' + ');
  const best = kept[0], shown = [best];
  best.reason = 'Hao phí thấp nhất';
  for (const p of kept.slice(1)) {
    if (wasteOf(p) - wasteOf(best) > DEFAULTS.altWithin + 1e-9) continue;
    const why = [];
    if (sizesOf(p) !== sizesOf(best)) why.push(`Dùng khổ ${sizesOf(p)}`);
    if (p.totalSheets < best.totalSheets) why.push(`Ít tờ hơn (${p.totalSheets} tờ)`);
    if (p.groups.length < best.groups.length) why.push(`Ít kiểu tờ hơn (${p.groups.length} kiểu) – dễ cắt`);
    if (!why.length || shown.some(q => q.reason === why.join(' · '))) continue;
    p.reason = why.join(' · ');
    shown.push(p);
    if (shown.length >= 3) break;
  }
  const out = shown.map((p, rank) => {
    let lowerBound = null;
    if (p.single != null && !pre.length) {
      if (!lbCache.has(p.single)) lbCache.set(p.single, sheetLowerBound(ctxs[p.single], demand, true));
      lowerBound = lbCache.get(p.single);
    }
    const last = p.groups[p.groups.length - 1];
    return {
      rank, label: p.label, reason: p.reason,
      groups: p.groups.map(g => ({ ...g, items: g.items.map(q => ({ ...q, x: r6(q.x), y: r6(q.y), w: r6(q.w), h: r6(q.h) })) })),
      totalSheets: p.totalSheets, lowerBound, proven: lowerBound != null && p.totalSheets <= lowerBound,
      issuedKG: kg(p.issuedArea), finishedKG: kg(finishedArea), recoveredKG: kg(p.recoveredArea),
      remnantUsedKG: kg(p.groups.reduce((s, g) => s + (g.remnantStock ? g.n * g.W * g.H : 0), 0)),
      wastePercent: 100 * (p.issuedArea - p.recoveredArea - finishedArea) / finishedArea,
      wasteFullPercent: 100 * (p.issuedArea - finishedArea) / finishedArea,
      lastFree: last.freeStrips, blocks: p.blocks, kinds: p.groups.length,
    };
  });
  return {
    input: i,
    stocks: stocks.map(s => ({ W: s.W, H: s.H, limit: s.limit === Infinity ? null : s.limit, remnant: s.remnant, lot: s.lot })),
    types: base.types.map(T => {
      const p = i.parts[T.t];
      return { t: T.t, name: T.name, noRotate: T.noRotate, circle: T.circle, ring: T.ring, hole: T.hole, cw: T.cw, ch: T.ch, rot: T.rot, qty: T.qty,
        tpW: T.circle ? p.diameter : p.partW, tpH: T.circle ? p.diameter : p.partH, tpIn: T.ring ? p.inner : null,
        allowance: p.allowance, allowanceIn: p.allowanceIn, inHoles: T.qty - sheetDemand[T.t],
        pureCount: mainCtx.pure[T.t].items.length };
    }),
    plans: out, invalid, tried: plans.length, pieces, ms: Date.now() - t0,
  };
}

/**
 * Cận dưới số tờ cho MỘT khổ (chứng minh được, không phụ thuộc thuật toán xếp):
 *  1. Diện tích: tổng diện tích chiếm chỗ (đã nở mạch k; vành khuyên trừ lỗ) / diện tích vùng dùng được.
 *  2. Chi tiết CHỮ NHẬT "rộng" (dài hơn nửa tờ theo X ở mọi hướng đặt) phải xếp chồng theo Y -> tổng bề cao ≤ rộng vùng.
 *     Tương tự chi tiết "cao". Chi tiết vừa rộng vừa cao -> mỗi chiếc một tờ.
 *  3. Chỉ một loại: số chiếc ≤ cận trên sức chứa 1 tờ (chặt sấn: đúng sức chứa tối ưu chặt suốt).
 */
function sheetLowerBound(C, demand) {
  const { WW, HH } = C;
  let lb = Math.ceil(C.types.reduce((s, T) => s + demand[T.t] * T.lbArea, 0) / (WW * HH) - 1e-9);
  const orients = T => T.rot ? [[T.A, T.B], [T.B, T.A]] : [[T.A, T.B]];
  let sumWide = 0, sumTall = 0, both = 0;
  for (const T of C.types) {
    if (T.circle) continue;                           // phôi tròn xếp so le được -> lập luận "nửa tờ" chỉ đúng cho chữ nhật
    const o = orients(T), q = demand[T.t];
    if (o.every(([w, h]) => w > WW / 2 + EPS && h > HH / 2 + EPS)) both += q;
    if (o.every(([w]) => w > WW / 2 + EPS)) sumWide += q * Math.min(...o.map(([, h]) => h));
    if (o.every(([, h]) => h > HH / 2 + EPS)) sumTall += q * Math.min(...o.map(([w]) => w));
  }
  lb = Math.max(lb, both, Math.ceil(sumWide / HH - 1e-9), Math.ceil(sumTall / WW - 1e-9));
  if (C.types.length === 1) {
    const T = C.types[0], P = C.pure[0];
    let cap = P.upper ?? P.items.length;
    if (C.shear && T.tb && !T.tb.pureOnly) cap = P.items.length;
    if (T.circle) cap = Math.floor(WW * HH / ((T.cw + C.k) ** 2 * Math.PI / 4) + 1e-9);
    if (cap > 0) lb = Math.max(lb, Math.ceil(demand[0] / Math.max(cap, P.items.length) - 1e-9));
  }
  return Math.max(1, lb);
}

/**
 * Tổng hợp phương án.
 *  - Phần dư mép tờ (dư phải, dư dưới) LUÔN được ghi kích thước, dù to hay nhỏ.
 *  - Tấm lẻ thu hồi: dải dư lớn nhất của tờ có cạnh ngắn ≥ ngưỡng (mặc định 200 mm, tùy chỉnh),
 *    tách bằng một nhát cắt suốt; phần dư dưới ngưỡng tính vào hao phí.
 */
function evaluate(ctxs, groups, remnantMin) {
  let totalSheets = 0, issuedArea = 0, recoveredArea = 0, blocks = 0;
  const gs = groups.map(g => {
    const C = ctxs[g.si];
    const { remnant, freeStrips } = remnantOf(C, g.sheet.items, remnantMin);
    totalSheets += g.n; blocks += g.sheet.blocks * g.n; issuedArea += g.n * C.W * C.H;
    if (remnant) recoveredArea += g.n * remnant.w * remnant.h;
    const netArea = g.sheet.items.reduce((s, p) => s + (p.circle ? Math.PI * (p.w ** 2 - (p.hole || 0) ** 2) / 4 : p.w * p.h), 0);
    const cuts = g.sheet.cuts.slice();
    if (C.shear && remnant) cuts.push(remnant.side === 'right'                        // nhát tách tấm lẻ
      ? { x1: remnant.at, y1: 0, x2: remnant.at, y2: C.H, seq: -1 } : { x1: 0, y1: remnant.at, x2: C.W, y2: remnant.at, seq: -1 });
    return { n: g.n, si: g.si, W: C.W, H: C.H, lot: C.stock.lot, remnantStock: C.stock.remnant,
      items: g.sheet.items, cuts, counts: g.sheet.counts, strategy: g.sheet.strategy,
      blocks: g.sheet.blocks, remnant, freeStrips, usedPercent: 100 * netArea / (C.W * C.H),
      // hao phí riêng của tờ này = (tờ − tấm lẻ thu hồi − thành phẩm trên tờ) / thành phẩm trên tờ
      wastePercent: (() => { const tp = g.sheet.counts.reduce((s2, c, t) => s2 + c * C.types[t].tpArea, 0);
        return tp > 0 ? 100 * (C.W * C.H - (remnant ? remnant.w * remnant.h : 0) - tp) / tp : null; })() };
  });
  const last = gs[gs.length - 1];
  const lastFree = last ? Math.max(0, ...last.freeStrips.map(f => f.w * f.h)) : 0;
  return { groups: gs, totalSheets, issuedArea, recoveredArea, blocks, lastFree };
}
/** Thứ tự: thép thực tiêu hao (xuất − tấm lẻ thu hồi) ít nhất = hao phí thấp nhất → ít tờ → xếp khít → sơ đồ gọn. */
function better(a, b) {
  const net = p => p.issuedArea - p.recoveredArea;
  if (Math.abs(net(a) - net(b)) > 1) return net(a) < net(b);
  if (a.totalSheets !== b.totalSheets) return a.totalSheets < b.totalSheets;
  if (Math.abs(a.lastFree - b.lastFree) > 1) return a.lastFree > b.lastFree;
  return a.blocks < b.blocks;
}

/* ======================================================================= */
/* 12. XUẤT DXF (R12 – AutoCAD, CypCut và mọi phần mềm CAD/CAM đều đọc được) */
/*  - DXF máy cắt: mỗi kiểu tờ một file, CHỈ đường bao cắt, 1:1 mm,         */
/*    CIRCLE cho tròn / vành khuyên (2 vòng), POLYLINE khép kín cho chữ     */
/*    nhật, không chữ, không hatch, không bù mạch cắt vào hình học.         */
/*  - DXF cutting plan: hồ sơ chuẩn dự án, layer VIEN_TAM, CHI_TIET,        */
/*    SO_HIEU, SURPLUS, THUOC_DO, KHUNG_TEN (+ NHAT_CHAT khi chặt sấn).      */
/*  Toạ độ DXF: gốc ở góc trái-dưới tờ, trục Y hướng lên.                   */
/* ======================================================================= */
const DXF_MIN_ZONE = 50;   // dải dư mép tờ hẹp hơn 50 mm không vẽ khung (tránh nét thừa)
const dxfNum = v => { const s = (Math.round(v * 1e4) / 1e4).toFixed(4).replace(/\.?0+$/, ''); return s === '-0' ? '0' : s; };
/** Ký tự ngoài ASCII -> \U+XXXX (AutoCAD hiểu trong mọi phiên bản). */
const dxfText = s => String(s ?? '').replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7e]/g, c => '\\U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
class DxfWriter {
  constructor(layers) { this.layers = layers; this.out = []; this.min = [Infinity, Infinity]; this.max = [-Infinity, -Infinity]; }
  g(code, val) { this.out.push(String(code), String(val)); }
  ext(x, y) { this.min[0] = Math.min(this.min[0], x); this.min[1] = Math.min(this.min[1], y); this.max[0] = Math.max(this.max[0], x); this.max[1] = Math.max(this.max[1], y); }
  line(l, x1, y1, x2, y2) { this.g(0, 'LINE'); this.g(8, l); this.g(10, dxfNum(x1)); this.g(20, dxfNum(y1)); this.g(30, 0); this.g(11, dxfNum(x2)); this.g(21, dxfNum(y2)); this.g(31, 0); this.ext(x1, y1); this.ext(x2, y2); }
  circle(l, x, y, r) { this.g(0, 'CIRCLE'); this.g(8, l); this.g(10, dxfNum(x)); this.g(20, dxfNum(y)); this.g(30, 0); this.g(40, dxfNum(r)); this.ext(x - r, y - r); this.ext(x + r, y + r); }
  rect(l, x, y, w, h) {
    this.g(0, 'POLYLINE'); this.g(8, l); this.g(66, 1); this.g(10, 0); this.g(20, 0); this.g(30, 0); this.g(70, 1);
    for (const [px, py] of [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]) { this.g(0, 'VERTEX'); this.g(8, l); this.g(10, dxfNum(px)); this.g(20, dxfNum(py)); this.g(30, 0); this.ext(px, py); }
    this.g(0, 'SEQEND'); this.g(8, l);
  }
  /** align: 'l' trái-dưới | 'c' giữa-giữa | 'r' phải-giữa */
  text(l, x, y, h, s, align = 'l') {
    this.g(0, 'TEXT'); this.g(8, l); this.g(10, dxfNum(x)); this.g(20, dxfNum(y)); this.g(30, 0); this.g(40, dxfNum(h)); this.g(1, dxfText(s));
    if (align !== 'l') { this.g(72, align === 'c' ? 1 : 2); this.g(11, dxfNum(x)); this.g(21, dxfNum(y)); this.g(31, 0); this.g(73, 2); }
    this.ext(x, y); this.ext(x + h * String(s).length * 0.7 * (align === 'l' ? 1 : 0.5), y + h);
  }
  toString() {
    const head = [], g = (c, v) => head.push(String(c), String(v));
    const mn = Number.isFinite(this.min[0]) ? this.min : [0, 0], mx = Number.isFinite(this.max[0]) ? this.max : [0, 0];
    g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009'); g(9, '$INSBASE'); g(10, 0); g(20, 0); g(30, 0);
    g(9, '$EXTMIN'); g(10, dxfNum(mn[0])); g(20, dxfNum(mn[1])); g(30, 0); g(9, '$EXTMAX'); g(10, dxfNum(mx[0])); g(20, dxfNum(mx[1])); g(30, 0);
    g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'TABLES');
    g(0, 'TABLE'); g(2, 'LTYPE'); g(70, 1); g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, 0); g(3, 'Solid line'); g(72, 65); g(73, 0); g(40, 0); g(0, 'ENDTAB');
    g(0, 'TABLE'); g(2, 'LAYER'); g(70, this.layers.length);
    for (const [name, color] of this.layers) { g(0, 'LAYER'); g(2, name); g(70, 0); g(62, color); g(6, 'CONTINUOUS'); }
    g(0, 'ENDTAB');
    g(0, 'TABLE'); g(2, 'STYLE'); g(70, 1); g(0, 'STYLE'); g(2, 'STANDARD'); g(70, 0); g(40, 0); g(41, 1); g(50, 0); g(71, 0); g(42, 2.5); g(3, 'txt'); g(4, ''); g(0, 'ENDTAB');
    g(0, 'ENDSEC'); g(0, 'SECTION'); g(2, 'ENTITIES');
    return head.concat(this.out, ['0', 'ENDSEC', '0', 'EOF']).join('\r\n') + '\r\n';
  }
}
/** Vẽ đường bao một chi tiết; (ox, oy) = góc trái-dưới tờ trong bản vẽ, H = rộng tờ để lật trục Y. */
function dxfPart(d, layer, p, ox, oy, H) {
  if (p.circle) {
    const cx = ox + p.x + p.w / 2, cy = oy + H - (p.y + p.h / 2);
    d.circle(layer, cx, cy, p.w / 2);
    if (p.ring) d.circle(layer, cx, cy, p.hole / 2);
  } else d.rect(layer, ox + p.x, oy + H - p.y - p.h, p.w, p.h);
}
/** DXF cho máy cắt: một kiểu tờ. */
export function cutDXF(res, gi) {
  const g = res.groups[gi], d = new DxfWriter([['CAT', 7]]);
  for (const p of g.items) dxfPart(d, 'CAT', p, 0, 0, g.H);
  return d.toString();
}
/** DXF cutting plan chuẩn dự án – tất cả kiểu tờ trong một bản vẽ, xếp từ trên xuống. */
export function planDXF(res, info = {}) {
  const d = new DxfWriter([['VIEN_TAM', 5], ['CHI_TIET', 7], ['SO_HIEU', 1], ['SURPLUS', 3], ['THUOC_DO', 4], ['KHUNG_TEN', 2], ['NHAT_CHAT', 30]]);
  const i = res.input, t = i.thickness;
  const maxW = Math.max(...res.groups.map(g => g.W)), maxH = Math.max(...res.groups.map(g => g.H));
  const th = Math.max(20, Math.round(maxH / 45));                    // chiều cao chữ chung
  let first = 1, oy = 0;
  res.groups.forEach((g, gi) => {
    const W = g.W, H = g.H, last = first + g.n - 1, range = first === last ? `${first}` : `${first}-${last}`;
    oy -= H + 6 * th;                                                // chừa chỗ tiêu đề phía trên
    const by = oy;                                                   // đáy tờ
    // tiêu đề
    d.text('KHUNG_TEN', 0, by + H + 3.6 * th, th * 1.3, `CUTTING PLAN: PLATE ${t} - SHEET ${range}${g.n > 1 ? ` (x${g.n})` : ''}${g.remnantStock ? ' - REMNANT STOCK' : ''}`);
    d.text('KHUNG_TEN', 0, by + H + 1.9 * th, th, `TOTAL USED: ${g.items.length} PCS   SIZE: ${W} x ${H} x ${t} mm   PLATE SERI.NO: ${g.lot || '................'}`);
    // tờ
    d.rect('VIEN_TAM', 0, by, W, H);
    // phần dư mép tờ: CHỈ GHI CHÚ kích thước (giữ lại hay bỏ do người dùng quyết định)
    const zones = (g.freeStrips || []).filter(f => Math.min(f.w, f.h) >= DXF_MIN_ZONE).map(f => f.side === 'right'
      ? { x: W - f.w, y: 0, w: f.w, h: f.h, name: 'DU PHAI', key: 'R' } : { x: 0, y: H - f.h, w: f.w, h: f.h, name: 'DU DUOI', key: 'B' })
      .map(z => {
        const R = g.remnant;
        if (!R || (R.side === 'right') !== (z.key === 'R')) return z;
        // tấm lẻ thu hồi: kích thước theo nhát tách (biên chi tiết + chừa mép)
        return R.side === 'right' ? { x: R.at, y: 0, w: R.w, h: R.h, name: 'SURPLUS SP.01', key: 'SP.01', kept: true }
          : { x: 0, y: R.at, w: R.w, h: R.h, name: 'SURPLUS SP.01', key: 'SP.01', kept: true };
      });
    for (const z of zones) {
      const x0 = z.x, y0 = by + H - z.y - z.h;
      d.rect('SURPLUS', x0, y0, z.w, z.h);
      const hh = Math.min(th, z.h * 0.45, z.w / 9);
      if (hh >= 4) d.text('SURPLUS', x0 + z.w / 2, y0 + z.h / 2, hh, `${z.name} ${Math.round(z.w)} x ${Math.round(z.h)}`, 'c');
    }
    // chi tiết + số hiệu NO (= số dòng BOM)
    for (const p of g.items) {
      dxfPart(d, 'CHI_TIET', p, 0, by, H);
      const hh = Math.min(th * 0.9, (p.ring ? (p.w - p.hole) / 2 : Math.min(p.w, p.h)) * 0.45);
      if (hh >= 3) {
        const cx = p.x + p.w / 2, cy = by + H - (p.y + p.h / 2);
        d.text('SO_HIEU', p.ring ? cx : cx, p.ring ? cy + (p.w + p.hole) / 4 : cy, hh, String(p.t + 1), 'c');
      }
    }
    // chặt sấn: đường nhát chặt + thứ tự nhát chặt chính
    if (i.cutMethod === 'shear') for (const c of g.cuts) {
      if (c.seq === 0) continue;
      d.line('NHAT_CHAT', c.x1, by + H - c.y1, c.x2, by + H - c.y2);
      if (c.seq > 0) d.text('NHAT_CHAT', (c.x1 + c.x2) / 2, by + H - (c.y1 + c.y2) / 2, th * 0.8, `(${c.seq})`, 'c');
    }
    // thước toạ độ hai trục
    const step = W > 8000 ? 1000 : 500;
    d.line('THUOC_DO', 0, by - 0.8 * th, W, by - 0.8 * th);
    for (let x = 0; x <= W + 1e-6; x += step) {                     // chỉ vạch chính, không vạch phụ
      d.line('THUOC_DO', x, by - 0.8 * th, x, by - 1.4 * th);
      d.text('THUOC_DO', x, by - 2.1 * th, th * 0.7, String(x), 'c');
    }
    if (W % step) { d.line('THUOC_DO', W, by - 0.8 * th, W, by - 1.4 * th); d.text('THUOC_DO', W, by - 2.1 * th, th * 0.7, String(W), 'c'); }
    d.line('THUOC_DO', -0.8 * th, by, -0.8 * th, by + H);
    for (let y = 0; y <= H + 1e-6; y += step) {
      d.line('THUOC_DO', -0.8 * th, by + y, -1.4 * th, by + y);
      d.text('THUOC_DO', -1.6 * th, by + y, th * 0.7, String(y), 'r');
    }
    if (H % step) { d.line('THUOC_DO', -0.8 * th, by + H, -1.4 * th, by + H); d.text('THUOC_DO', -1.6 * th, by + H, th * 0.7, String(H), 'r'); }
    // bảng NO – ITEM NAME
    const tx = W + 2 * th, rowH = 1.6 * th, cols = [0, 3 * th, 15 * th, 24 * th, 28 * th];
    const rows = res.types.filter(T => g.counts[T.t] > 0);
    let ty = by + H;
    const tableRow = (cells, yTop) => {
      d.line('KHUNG_TEN', tx, yTop - rowH, tx + cols[4], yTop - rowH);
      cells.forEach((c, k) => d.text('KHUNG_TEN', tx + cols[k] + 0.3 * th, yTop - rowH + 0.45 * th, th * 0.7, c));
    };
    d.line('KHUNG_TEN', tx, ty, tx + cols[4], ty);
    tableRow(['NO', 'ITEM NAME', 'SIZE (mm)', 'QTY'], ty); ty -= rowH;
    for (const T of rows) {
      tableRow([String(T.t + 1), T.name, T.ring ? `OD${T.cw} / ID${T.hole}` : T.circle ? `D${T.cw}` : `${T.cw} x ${T.ch}`, String(g.counts[T.t])], ty); ty -= rowH;
    }
    tableRow(['', 'TOTAL', '', String(g.items.length)], ty); ty -= rowH;
    for (const x of cols) d.line('KHUNG_TEN', tx + x, by + H, tx + x, ty);
    // bảng phần dư mép tờ (ghi chú)
    if (zones.length) {
      ty -= rowH;
      const top = ty;
      d.line('KHUNG_TEN', tx, ty, tx + cols[4], ty);
      tableRow(['FREE', 'SIZE (mm)', 'AREA (m2)', 'KEEP'], ty); ty -= rowH;
      for (const z of zones) { tableRow([z.key, `${Math.round(z.w)} x ${Math.round(z.h)}`, (z.w * z.h / 1e6).toFixed(3), z.kept ? 'YES' : 'SCRAP'], ty); ty -= rowH; }
      for (const x of cols) d.line('KHUNG_TEN', tx + x, top, tx + x, ty);
    }
    oy = Math.min(by - 3.5 * th, ty) - 3 * th;
    first = last + 1;
  });
  // khung tên chung
  const fx = 0, fw = Math.max(36 * th, maxW * 0.55), rh = 1.7 * th, fields = [
    ['PROJECT', info.project || ''], ['DRAWING NO', info.drawingNo || ''], ['MATERIAL', `${info.material || ''}  t = ${t} mm`],
    ['METHOD', i.cutMethod === 'shear' ? 'GUILLOTINE SHEAR' : 'LASER / PLASMA'], ['KERF / MARGIN', `${i.gap} / ${i.margin} mm`],
    ['TOTAL SHEETS', String(res.totalSheets)], ['ISSUED / RECOVERED', `${res.issuedKG.toFixed(1)} / ${res.recoveredKG.toFixed(1)} kg (SURPLUS >= ${i.remnantMin} mm)`],
    ['FINISHED (OUTLINE)', `${res.finishedKG.toFixed(1)} kg`], ['WASTE / FINISHED', `${res.wastePercent.toFixed(2)} %`],
    ['DRAWN BY', info.drawnBy || ''], ['DATE', info.date || ''], ['REV', info.rev || '0'],
  ];
  const top = oy;
  d.rect('KHUNG_TEN', fx, top - rh * (fields.length + 1), fw, rh * (fields.length + 1));
  d.text('KHUNG_TEN', fx + 0.5 * th, top - rh + 0.45 * th, th * 0.9, 'CUTTING PLAN - TITLE BLOCK');
  fields.forEach(([k, v], n) => {
    const y = top - rh * (n + 1);
    d.line('KHUNG_TEN', fx, y, fx + fw, y);
    d.text('KHUNG_TEN', fx + 0.5 * th, y - rh + 0.45 * th, th * 0.7, k);
    d.text('KHUNG_TEN', fx + 11 * th, y - rh + 0.45 * th, th * 0.7, v);
  });
  d.line('KHUNG_TEN', fx + 10.5 * th, top - rh, fx + 10.5 * th, top - rh * (fields.length + 1));
  return d.toString();
}

/* ---------- ZIP không nén (gói nhiều file DXF máy cắt) ---------- */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function zipFiles(files) {
  const enc = new TextEncoder(), chunks = [], central = [];
  let offset = 0;
  const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const local = Uint8Array.from([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
    chunks.push(local, name, data);
    central.push(Uint8Array.from([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
    offset += local.length + name.length + data.length;
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = Uint8Array.from([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  const all = [...chunks, ...central, end], out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
  let p = 0; for (const c of all) { out.set(c, p); p += c.length; }
  return out;
}

// Module Worker chạy chính file này – không có file thuật toán thứ hai.
if (typeof document === 'undefined' && typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.addEventListener('message', e => {
    try { self.postMessage({ ok: true, result: calculateNestingPro(e.data) }); }
    catch (err) { self.postMessage({ ok: false, error: String(err?.message || 'Không tính được phương án trải phôi.') }); }
  });
}

/* ========================================================================= */
/* GIAO DIỆN                                                                 */
/* ========================================================================= */
const { setText, downloadBlob } = globalThis.EpsilonSoftShared || {};
const quickMaterialLabels = ['Thép', 'Inox', 'Nhôm', 'Đồng'];
const loadMaterials = () => {
  const shared = globalThis.EpsilonSoftShared?.loadMaterialsCatalog;
  if (typeof shared === 'function') return shared();
  return fetch(new URL('./assets/data/materials.json', document.baseURI), { cache: 'no-cache' }).then(r => {
    if (!r.ok) throw Error('Không đọc được materials.json (HTTP ' + r.status + ').'); return r.json();
  });
};
const COLORS = [['#afa2eb', '#5c47b3'], ['#9bcffc', '#326bab'], ['#f6c58f', '#b06a12'], ['#a6e3c8', '#1f7a55'], ['#f4b2c6', '#a3365a']];
const hslHex = (h, s, l) => {
  s /= 100; l /= 100;
  const f = n => { const k = (n + h / 30) % 12, c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0'); };
  return `#${f(0)}${f(8)}${f(4)}`;
};
const colorOf = t => t < COLORS.length ? COLORS[t] : [hslHex((t * 137.5 + 100) % 360, 70, 80), hslHex((t * 137.5 + 100) % 360, 45, 38)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pretty = n => {
  if (!Number.isFinite(n)) return '—';
  return (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
};
const parseNum = (raw, label, { integer = false, positive = false } = {}) => {
  const txt = String(raw ?? '').replaceAll(',', '').trim();
  const v = txt === '' ? NaN : Number(txt);
  if (!Number.isFinite(v) || v < 0 || v > LIMIT || (positive && v <= 0)) throw Error(`${label}: số không hợp lệ.`);
  if (integer && !Number.isInteger(v)) throw Error(`${label}: phải là số nguyên.`);
  return v;
};
const sheetRange = (res, gi) => {
  let a = 1; for (let j = 0; j < gi; j++) a += res.groups[j].n;
  const b = a + res.groups[gi].n - 1;
  return a === b ? `Tờ ${a}` : `Tờ ${a}–${b}`;
};
const STRATEGY = {
  'pure-grid': 'Một loại – lưới thẳng', 'pure-guillotine': 'Một loại – chia vùng nhiều cấp', 'pure-rotary': 'Một loại – bố trí xoay vòng',
  'pure-staggered': 'Một loại – tròn so le', block: 'Ghép khối chặt suốt', free: 'Ghép tự do từng chiếc',
};
const strategyText = s => (STRATEGY[s.replace(/\+(fill|hole)/g, '')] || s) + (s.includes('+fill') ? ' + chèn khe' : '') + (s.includes('+hole') ? ' + chèn lỗ vành khuyên' : '');

function drawSheet(res, gi) {
  const i = res.input, g = res.groups[gi], sheetW = g.W, sheetH = g.H, SW = 1080, inset = 11, plotW = SW - 2 * inset;
  const SH = Math.round(Math.min(600, Math.max(300, plotW * sheetH / sheetW + 24)));
  const plotH = SH - 24, scale = Math.min(plotW / sheetW, plotH / sheetH);
  const W = sheetW * scale, H = sheetH * scale, x0 = inset + (plotW - W) / 2, y0 = 12 + (plotH - H) / 2;
  const pt = n => Number(n).toFixed(2);
  let body = '';
  // phần dư mép tờ: luôn ghi kích thước; dải được thu hồi (≥ ngưỡng) tô xanh, dải dưới ngưỡng ghi "hao phí"
  for (const f of g.freeStrips || []) {
    if (Math.min(f.w, f.h) < 50) continue;                         // dải quá hẹp: chỉ ghi số, không vẽ khung
    const kept = g.remnant && g.remnant.side === f.side, z = kept ? g.remnant : f;   // tấm lẻ: kích thước theo nhát tách
    const fx = f.side === 'right' ? x0 + (sheetW - z.w) * scale : x0, fy = f.side === 'right' ? y0 : y0 + (sheetH - z.h) * scale;
    const fw = z.w * scale, fh = z.h * scale;
    body += kept ? `<rect x="${pt(fx)}" y="${pt(fy)}" width="${pt(fw)}" height="${pt(fh)}" fill="#e3f8eb" stroke="#169a70" stroke-width="1.6"/>`
      : `<rect x="${pt(fx)}" y="${pt(fy)}" width="${pt(fw)}" height="${pt(fh)}" fill="#fbf6ee" stroke="#c49a5a" stroke-width="1" stroke-dasharray="6 4"/>`;
    const label = `${kept ? 'TẤM LẺ THU HỒI' : f.side === 'right' ? 'DƯ PHẢI' : 'DƯ DƯỚI'} ${pretty(z.w)} × ${pretty(z.h)}`, fsz = Math.min(18, fh * 0.5, fw / label.length * 1.7);
    if (fsz >= 9) body += `<text x="${pt(fx + fw / 2)}" y="${pt(fy + fh / 2 + fsz * 0.35)}" font-size="${pt(fsz)}" fill="${kept ? '#147451' : '#8a5a12'}" font-weight="700" font-family="Arial,sans-serif" text-anchor="middle">${label}</text>`;
  }
  const m = i.margin * scale;
  if (m >= 3) body += `<rect x="${pt(x0 + m)}" y="${pt(y0 + m)}" width="${pt(W - 2 * m)}" height="${pt(H - 2 * m)}" fill="none" stroke="#ddc9fa" stroke-width="1"/>`;
  let labels = 0;
  for (const p of g.items) {
    const T = res.types[p.t], [fill, edge] = colorOf(p.t);
    const xx = x0 + p.x * scale, yy = y0 + p.y * scale, ww = p.w * scale, hh = p.h * scale;
    const inner = T.allowance / 2 * scale;
    if (p.circle) {
      body += `<circle cx="${pt(xx + ww / 2)}" cy="${pt(yy + hh / 2)}" r="${pt(ww / 2)}" fill="${fill}" stroke="${edge}" stroke-width="1"/>`;
      if (p.ring) body += `<circle cx="${pt(xx + ww / 2)}" cy="${pt(yy + hh / 2)}" r="${pt(p.hole / 2 * scale)}" fill="#f1ebfd" stroke="${edge}" stroke-width="1"/>`;
      if (!p.ring && inner > 1.4 && ww - 2 * inner > 3) body += `<circle cx="${pt(xx + ww / 2)}" cy="${pt(yy + hh / 2)}" r="${pt(ww / 2 - inner)}" fill="none" stroke="${edge}" stroke-opacity=".45" stroke-width=".8"/>`;
    } else {
      body += `<rect x="${pt(xx)}" y="${pt(yy)}" width="${pt(ww)}" height="${pt(hh)}" fill="${fill}" stroke="${edge}" stroke-width="0.9"/>`;
      if (p.rot) body += `<rect x="${pt(xx)}" y="${pt(yy)}" width="${pt(ww)}" height="${pt(hh)}" fill="url(#np-rot)"/>`;
      if (inner > 1.4 && ww - 2 * inner > 3 && hh - 2 * inner > 3) body += `<rect x="${pt(xx + inner)}" y="${pt(yy + inner)}" width="${pt(ww - 2 * inner)}" height="${pt(hh - 2 * inner)}" fill="none" stroke="${edge}" stroke-opacity=".45" stroke-width=".8"/>`;
    }
    const fs = Math.min(13, hh * 0.32, ww / Math.max(3, String(T.name).length) * 1.6);
    if (labels < 600 && fs >= 8) {
      labels++;
      const ly = p.ring ? yy + (ww - p.hole * scale) / 4 + fs * 0.35 : yy + hh / 2 + fs * 0.35;
      body += `<text x="${pt(xx + ww / 2)}" y="${pt(ly)}" font-size="${pt(fs)}" fill="#1d1652" font-weight="700" font-family="Arial,sans-serif" text-anchor="middle">${esc(T.name)}</text>`;
    }
  }
  if (i.cutMethod === 'shear') {
    const main = g.cuts.filter(c => c.seq > 0);
    for (const c of g.cuts) {
      const color = c.seq === -1 ? '#169a70' : '#d58027', w = c.seq === 0 ? 0.9 : 1.6;
      body += `<line x1="${pt(x0 + c.x1 * scale)}" y1="${pt(y0 + c.y1 * scale)}" x2="${pt(x0 + c.x2 * scale)}" y2="${pt(y0 + c.y2 * scale)}" stroke="${color}" stroke-width="${w}"${c.seq === 0 ? ' stroke-dasharray="4 3"' : ''}/>`;
    }
    if (main.length <= 80) for (const c of main) {
      const mx = x0 + (c.x1 + c.x2) / 2 * scale, my = y0 + (c.y1 + c.y2) / 2 * scale;
      body += `<circle cx="${pt(mx)}" cy="${pt(my)}" r="9" fill="#fff7ea" stroke="#d58027" stroke-width="1.2"/><text x="${pt(mx)}" y="${pt(my + 4)}" font-size="11" font-weight="800" fill="#9a520f" font-family="Arial,sans-serif" text-anchor="middle">${c.seq}</text>`;
    }
  }
  const defs = `<defs><pattern id="np-rot" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#1d1652" stroke-opacity=".22" stroke-width="1.4"/></pattern></defs>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" role="img" aria-label="Sơ đồ ${sheetRange(res, gi)}, ${g.items.length} chi tiết" preserveAspectRatio="xMidYMid meet">${defs}<rect width="${SW}" height="${SH}" fill="#faf7ff"/><rect x="${pt(x0)}" y="${pt(y0)}" width="${pt(W)}" height="${pt(H)}" fill="#f1ebfd" stroke="#793afa" stroke-width="2"/>${body}</svg>`;
  const title = `${sheetRange(res, gi).toUpperCase()} · ${g.remnantStock ? 'TẤM LẺ KHO' : 'TẤM'} ${pretty(sheetW)} × ${pretty(sheetH)} × ${pretty(i.thickness)} mm${g.lot ? ' · ' + g.lot : ''}`;
  const download = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH + 40}"><rect width="${SW}" height="${SH + 40}" fill="#faf7ff"/><text x="${SW / 2}" y="27" fill="#675295" font-size="20" text-anchor="middle" font-weight="700" font-family="Arial,sans-serif">${esc(title)} (×${g.n})</text><svg x="0" y="38" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">${svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg></svg>`;
  return { svg, download, title };
}

const CSS = `
.np{font-size:16px;color:#191c69;min-width:0}.np *{box-sizing:border-box}
.np .np-top{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin:0 0 12px}
.np .np-sub{font-size:16px;color:#706d99;margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.np .np-badge{display:inline-block;background:linear-gradient(115deg,#a943f7,#7930e8);color:#fff;font-weight:900;font-size:14px;letter-spacing:.08em;border-radius:7px;padding:2px 9px}
.np .np-materials{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end;margin-left:auto}
.np .np-materials>strong{font-weight:800;margin-right:4px}
.np .np-materials button,.np .np-toggle button{border:1px solid #dfd3fc;border-radius:11px;background:#fff;color:#2e1b70;min-height:40px;padding:7px 12px;font-weight:750;font-size:16px;white-space:nowrap}
.np .np-materials button.is-active,.np .np-toggle button.is-active{color:#fff;border-color:transparent;background:linear-gradient(120deg,#aa42f9,#7732e9)}
.np .np-material-list{background:#fff;min-height:40px;max-width:198px;min-width:145px;font-size:16px;font-weight:650;color:#5324b4;border:1px solid #dac6fb;border-radius:11px;padding:6px 9px}
.np .np-warn{font-size:16px;color:#aa3c3c;margin:0 0 8px}
.np .np-grid{display:grid;grid-template-columns:minmax(420px,min(37%,540px)) minmax(0,1fr);gap:12px;align-items:start}
.np .np-panel{background:#fff;border:1px solid #e4d3ff;border-radius:16px;padding:14px 15px;min-width:0}
.np .np-title{color:#592ac1;font-size:20px;margin:0 0 12px;font-weight:850}
.np .np-row{display:grid;gap:9px;margin-bottom:11px}.np .np-row.three{grid-template-columns:repeat(3,minmax(0,1fr))}
.np .np-row.p1{grid-template-columns:1.5fr 1.1fr .9fr}
.np label span{font-size:15px;font-weight:750;color:#251973;display:block;margin-bottom:4px;white-space:nowrap}
.np input,.np select.np-shape{background:#fff;border:1px solid #d4b7ff;border-radius:10px;min-height:40px;width:100%;font-size:17px;color:#24156c;padding:6px 9px;outline:none;font-variant-numeric:tabular-nums;font-family:inherit}
.np input:focus,.np select.np-shape:focus{border-color:#7442ff;box-shadow:0 0 0 3px #7542ff21}
.np .is-kerf input{border:2px solid #5a9eff}.np .is-allow input{border:2px solid #f3a535}.np .is-rem input{border:2px solid #4cc795}
.np .np-methods{margin:2px 0 14px}.np .np-methods h3{font-size:17px;margin:0 0 7px;color:#5c29bf;font-weight:850}
.np .np-toggle{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.np .np-toggle button{width:100%}
.np .np-hint{font-size:15px;color:#65588b;margin:6px 0 0}
.np .np-parts-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:4px 0 6px}
.np .np-parts-head strong{font-size:18px;color:#5c29bf;font-weight:850}.np .np-parts-head small{font-size:15px;color:#6a598b;font-weight:700}
.np .np-parts{max-height:560px;overflow:auto;padding-right:4px}
.np .np-part{border-top:1px solid #f0e8fc;padding-top:8px;margin-top:4px}
.np .np-part-head{display:flex;align-items:center;gap:8px;margin:0 0 7px;font-size:16px;font-weight:850;color:#5c29bf}
.np .np-part-head i{display:inline-block;width:18px;height:14px;border:1px solid #5c47b3;border-radius:3px}
.np .np-part-head i.round{border-radius:50%;width:15px;height:15px}
.np .np-rot{display:inline-flex;align-items:center;gap:6px;font-size:15px;font-weight:700;color:#326bab;margin-left:auto;cursor:pointer}
.np .np-rot input{width:17px;height:17px;min-height:17px;accent-color:#326bab}.np .np-rot.is-off{opacity:.45;cursor:default}
.np .np-del{background:#fff5f6;border:1px solid #f0b7c1;color:#b52441;border-radius:8px;padding:2px 9px;font-size:15px;font-weight:700}
.np .np-add{width:100%;margin:6px 0 2px;min-height:40px;border:2px dashed #b59efc;border-radius:11px;background:#faf7ff;color:#632dd6;font-size:16px;font-weight:800}
.np .np-add:hover{background:#f1ebfd}
.np .np-error{font-size:16px;color:#b52441;font-weight:650;margin:10px 0 0;line-height:1.4}.np .np-error:empty{display:none}
.np .np-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 9px;max-height:132px;overflow:auto}
.np .np-tab{border:1.5px solid #e1d5f9;border-radius:11px;background:#fff;padding:5px 11px;text-align:left;color:#29234f;min-width:118px}
.np .np-tab b{display:block;font-size:15.5px;color:#5c29bf;font-weight:850}.np .np-tab small{display:block;font-size:13.5px;color:#655587}
.np .np-tab.is-active{border-color:#7930e8;background:#f6f0ff;box-shadow:0 0 0 3px #7542ff1c}
.np .np-tab .np-tab-rem{color:#147451;font-weight:750}
.np .np-figure{background:#faf7ff;border:1px solid #e7dafa;border-radius:12px;padding:7px}
.np .np-fig-title{text-align:center;font-size:17px;color:#675295;font-weight:800;margin:0 0 3px}
.np .np-preview svg{width:100%;height:auto;display:block}
.np .np-legend{display:flex;gap:6px 14px;flex-wrap:wrap;color:#58438f;font-size:15px;font-weight:700;margin:4px 0 0;padding-left:4px}
.np .np-legend span{display:inline-flex;align-items:center;gap:6px}
.np .np-chip{display:inline-block;width:18px;height:13px;border:1px solid;border-radius:3px}.np .np-chip.round{border-radius:50%;width:14px;height:14px}
.np .np-chip.hatch{background:repeating-linear-gradient(45deg,#fff,#fff 3px,#cfc8e6 3px,#cfc8e6 5px);border-color:#6850aa}
.np .np-caption{display:flex;justify-content:space-between;gap:9px;margin-top:9px;flex-wrap:wrap;align-items:baseline;color:#5b2eb7}
.np .np-summary{font-size:19px;font-weight:850}.np .np-proof{font-size:16px;font-weight:750;color:#147451}.np .np-proof.gap{color:#a3500a}
.np .np-footrow{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-top:4px}
.np .np-strategy{color:#6a598b;font-size:15.5px;margin:0;flex:1}
.np .np-export{background:#f9f6ff;border:1px solid #b59efc;border-radius:9px;color:#632dd6;padding:5px 12px;min-height:35px;font-size:16px;font-weight:700}
.np .np-status{font-size:16px;color:#65539e;margin-top:6px}.np .np-status:empty{display:none}
.np .np-spin{width:15px;height:15px;border-radius:50%;border:2px solid #d1bef5;border-top-color:#662be8;display:inline-block;animation:np-spin .7s linear infinite;margin-left:7px;vertical-align:middle}
@keyframes np-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.np .np-spin{animation:none}}
.np .np-list{margin-top:12px;border:1px solid #e6dafa;border-radius:12px;overflow:hidden}.np .np-list[hidden]{display:none}
.np .np-list-title{display:flex;justify-content:space-between;gap:10px;padding:10px 13px;background:#f8f5ff;color:#5a2bb8;font-size:16.5px;font-weight:800}
.np .np-list-title small{font-size:15px;color:#655587;font-weight:700}
.np .np-scroll{overflow-x:auto}
.np table{width:100%;border-collapse:collapse;font-size:15.5px;color:#29234f}
.np th{background:#fcfaff;color:#695494;font-weight:750;border-bottom:1px solid #e8dff6;padding:8px 10px;white-space:nowrap;text-align:left}
.np td{border-bottom:1px solid #f0eaf9;padding:7px 10px;font-variant-numeric:tabular-nums;white-space:nowrap}
.np .num{text-align:right}.np .ok{color:#0f6e56;font-weight:800}
.np .np-total td{font-weight:850;background:#f8f5ff;color:#5328a9}
.np .np-results{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:10px}
.np .np-res{background:#fff;border:1px solid #e1d5f9;border-radius:14px;padding:10px 13px;min-height:79px;min-width:0}
.np .np-res.em{background:linear-gradient(115deg,#a943f7,#7930e8);color:#fff;border-color:transparent}
.np .np-res strong{font-size:15.5px;display:block}.np .np-res output{font-size:22px;font-weight:850;display:block;overflow-wrap:anywhere}
.np .np-res small{display:block;font-size:14px;opacity:.85;font-weight:650}
.np .np-note{font-size:15px;color:#6a6691;text-align:center;margin:7px 0 0;line-height:1.45}
.np .np-stock{display:grid;grid-template-columns:1.05fr .95fr .95fr .7fr 1.15fr 34px;gap:6px;align-items:end;margin-bottom:6px}
.np .np-stock select,.np .np-stock input{min-height:36px;font-size:15.5px;padding:4px 6px;min-width:0}
.np .np-stock select{border:1px solid #d4b7ff;border-radius:10px;background:#fff;color:#24156c;width:100%;font-family:inherit}
.np .np-stock.is-rem select,.np .np-stock.is-rem input{background:#f3fcf7;border-color:#8ed8c5}
.np .np-stock .np-x{background:#fff5f6;border:1px solid #f0b7c1;color:#b52441;border-radius:8px;min-height:36px;padding:0 9px;font-weight:700}
.np .np-stock-head{display:grid;grid-template-columns:1.05fr .95fr .95fr .7fr 1.15fr 34px;gap:6px;font-size:14px;font-weight:750;color:#251973;margin:0 0 3px}
.np .np-stock-head span:last-child{width:34px}
.np .np-presets{display:flex;gap:6px;flex-wrap:wrap;margin:2px 0 12px}
.np .np-presets button{border:1px dashed #b59efc;background:#faf7ff;color:#632dd6;border-radius:9px;padding:4px 10px;font-size:14.5px;font-weight:750}
.np .np-presets button.rem{border-color:#4cc795;color:#147451;background:#f3fcf7}
.np .np-section{font-size:17px;color:#5c29bf;font-weight:850;margin:4px 0 6px;display:flex;justify-content:space-between;align-items:baseline}
.np .np-section small{font-size:14px;color:#6a598b;font-weight:650}
.np details.np-info{border:1px solid #eee5fb;border-radius:11px;padding:6px 10px;margin:0 0 12px}
.np details.np-info summary{cursor:pointer;font-weight:800;color:#5c29bf;font-size:16px}
.np details.np-info .np-row{margin:8px 0 2px}
.np .np-row.two{grid-template-columns:repeat(2,minmax(0,1fr))}
.np .np-total-bar{display:grid;grid-template-columns:1.5fr repeat(4,minmax(0,1fr));gap:1px;background:#d9c9fb;border:1px solid #d9c9fb;border-radius:13px;overflow:hidden;margin:0 0 10px}
.np .np-total-bar[hidden]{display:none}
.np .np-total-bar>div{background:#fff;padding:7px 11px;min-width:0}
.np .np-tb-main{background:linear-gradient(115deg,#a943f7,#7930e8)!important;color:#fff}
.np .np-tb-main span{display:block;font-size:13.5px;font-weight:800;letter-spacing:.06em;opacity:.9}
.np .np-tb-main strong{display:block;font-size:26px;font-weight:900;line-height:1.15}
.np .np-tb-main small{display:block;font-size:13px;opacity:.88}
.np .np-tb-cell span{display:block;font-size:13.5px;color:#6a598b;font-weight:700}
.np .np-tb-cell b{display:block;font-size:18px;color:#2e1b70;font-weight:850;margin-top:3px;overflow-wrap:anywhere}
@media(max-width:820px){.np .np-total-bar{grid-template-columns:repeat(2,minmax(0,1fr))}.np .np-tb-main{grid-column:1/-1}}
.np .np-remnant-box{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 0 12px;padding:9px 12px;border:2px solid #16a374;border-radius:12px;background:linear-gradient(110deg,#e6fbf2,#f4fffa);cursor:text}
.np .np-remnant-box span{white-space:normal;margin:0}
.np .np-rb-text{flex:1 1 auto;min-width:0}
.np .np-rb-text b{display:block;font-size:16.5px;color:#0d6b4c;font-weight:850}
.np .np-rb-text small{display:block;font-size:13.5px;color:#3f7f69;line-height:1.3;font-weight:600}
.np .np-rb-input{display:flex;align-items:center;gap:6px;flex:0 0 auto}
.np .np-rb-input input{width:84px;flex:0 0 84px;min-height:44px;padding:4px 8px;font-size:22px;font-weight:900;color:#0d6b4c;text-align:right;border:2px solid #16a374;background:#fff}
.np .np-rb-input input:focus{box-shadow:0 0 0 3px #16a37433;border-color:#0d8a5f}
.np .np-rb-input small{font-size:16px;font-weight:800;color:#0d6b4c}
.np .np-res.np-res-rem{border:2px solid #16a374;background:#f2fdf8}
.np .np-free-ok{color:#0d6b4c;font-weight:800}.np .np-free-no{color:#8a5a12;font-weight:700}
.np .np-plans{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:8px;margin:0 0 10px}
.np .np-plan{border:1.5px solid #e1d5f9;border-radius:12px;background:#fff;padding:7px 11px;text-align:left;color:#29234f}
.np .np-plan:hover{border-color:#b59efc}
.np .np-plan.is-active{border-color:#7930e8;background:#f6f0ff;box-shadow:0 0 0 3px #7542ff1c}
.np .np-plan b{display:block;font-size:15px;color:#5c29bf;font-weight:850}
.np .np-plan big{display:block;font-size:19px;font-weight:850;margin:1px 0}
.np .np-plan small{display:block;font-size:13.5px;color:#655587;line-height:1.35}
.np .np-opts{margin-top:12px;border:1px solid #e6dafa;border-radius:12px;overflow:hidden}.np .np-opts[hidden]{display:none}
.np .np-opts tr.is-chosen td{background:#f6f0ff;font-weight:800;color:#4d21b8}
.np .np-opts td.na{color:#a3500a}
.np .np-chip.ring{border-radius:50%;width:14px;height:14px;box-shadow:inset 0 0 0 4px #fff}
@media(max-width:680px){.np .np-stock,.np .np-stock-head{grid-template-columns:1fr 1fr 1fr}.np .np-stock-head{display:none}}
@media(max-width:1260px){.np .np-grid{grid-template-columns:minmax(0,1fr)}.np .np-materials{justify-content:flex-start;margin-left:0}}
@media(max-width:820px){.np .np-results{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:680px){.np .np-row.three,.np .np-row.p1{grid-template-columns:repeat(2,minmax(0,1fr))}.np .np-row.p1 label:first-child{grid-column:1/-1}.np label span{white-space:normal}.np .np-material-list{max-width:100%;width:100%}}
`;

const DEFAULT_STATE = {
  thickness: '20', gap: '3', margin: '10', remnantMin: '200', density: '7850', cutMethod: 'laser', material: 0,
  thick: { laser: '20', shear: '3' }, gaps: { laser: '3', shear: '0' }, margins: { laser: '10', shear: '0' },
  stocks: {
    laser: [{ kind: 'std', W: '6000', H: '2000', qty: '', lot: '' }],
    shear: [{ kind: 'std', W: '2440', H: '1220', qty: '', lot: '' }],
  },
  info: { project: '', drawingNo: '', material: '', drawnBy: '' },
  parts: [
    { name: 'BM1', shape: 'rect', partW: '490', partH: '555', diameter: '310', inner: '', allowance: '0', allowanceIn: '5', qty: '30', rotate: true },
    { name: 'BM2', shape: 'rect', partW: '300', partH: '200', diameter: '310', inner: '', allowance: '0', allowanceIn: '5', qty: '60', rotate: true },
    { name: 'D310', shape: 'circle', partW: '300', partH: '300', diameter: '310', inner: '', allowance: '5', allowanceIn: '5', qty: '12', rotate: true },
    { name: 'VK900', shape: 'ring', partW: '300', partH: '300', diameter: '900', inner: '640', allowance: '5', allowanceIn: '5', qty: '4', rotate: true },
  ],
};
const ALLOW_DEFAULT = { rect: '0', circle: '5', ring: '5' };
const PRESETS = { laser: [[6000, 2000], [3000, 1500], [2500, 1250]], shear: [[2440, 1220], [3000, 1500], [6000, 2000]] };
let savedState = null;

export function mount(root, ctx = {}) {
  const st = savedState ? structuredClone(savedState) : structuredClone(DEFAULT_STATE);
  const on = (el, ev, fn) => el.addEventListener(ev, fn, ctx.signal ? { signal: ctx.signal } : undefined);
  let catalog = null, worker = null, timer = null, serial = 0, last = null, full = null, planIdx = 0, lastSVG = '', group = 0, disposed = false;
  const fld = (name, label, val, cls = '') =>
    `<label class="${cls}"><span>${esc(label)}</span><input name="${name}" value="${esc(val ?? '')}" inputmode="decimal" autocomplete="off" spellcheck="false"></label>`;
  const txt = (name, label, val) =>
    `<label><span>${esc(label)}</span><input name="${name}" value="${esc(val ?? '')}" autocomplete="off" maxlength="80"></label>`;
  root.innerHTML = `<style>${CSS}</style><div class="np">
  <div class="np-top"><p class="np-sub"><span class="np-badge">PRO</span>Cutting plan tôn tấm · ghép nhiều chi tiết · nhiều khổ · tận dụng tấm lẻ · xuất DXF</p>
   <div class="np-materials" role="group" aria-label="Vật liệu"><strong>Vật liệu</strong>
    ${quickMaterialLabels.map((v, k) => `<button type="button" data-mat="${k}" disabled>${v}</button>`).join('')}
    <select class="np-material-list" id="np-mat-list" aria-label="Danh mục khối lượng riêng" disabled><option value="">Đang tải vật liệu…</option></select>
   </div></div>
  <p class="np-warn" id="np-warn" role="alert" hidden></p>
  <div class="np-grid">
   <section class="np-panel"><h2 class="np-title">TẤM PHÔI &amp; THÔNG SỐ</h2>
    <div class="np-methods"><h3>Phương pháp cắt</h3><div class="np-toggle" role="group" aria-label="Phương pháp cắt">
     <button type="button" data-cut="laser">Laser / Plasma</button><button type="button" data-cut="shear">Chặt sấn</button></div>
     <p class="np-hint" id="np-cut-hint"></p></div>
    <div class="np-row three">${fld('thickness', 'Dày (mm)', st.thickness)}${fld('gap', 'Mạch cắt (mm)', st.gap, 'is-kerf')}${fld('margin', 'Chừa mép (mm)', st.margin)}</div>
    <label class="np-remnant-box"><span class="np-rb-text"><b>Ngưỡng thu hồi tấm lẻ</b><small>Dải dư có cạnh ngắn ≥ ngưỡng được thu hồi, nhỏ hơn tính vào hao phí</small></span>
     <span class="np-rb-input"><input name="remnantMin" value="${esc(st.remnantMin)}" inputmode="decimal" autocomplete="off" aria-label="Ngưỡng thu hồi tấm lẻ (mm)"><small>mm</small></span></label>
    <div class="np-section">Kho phôi <small>Số tờ trống = không giới hạn</small></div>
    <div class="np-stock-head"><span>Loại</span><span>Dài (mm)</span><span>Rộng (mm)</span><span>Số tờ</span><span>Mã lô / seri</span><span></span></div>
    <div id="np-stocks"></div>
    <div class="np-presets" id="np-presets"></div>
    <details class="np-info"><summary>Hồ sơ cutting plan (khung tên DXF)</summary>
     <div class="np-row two">${txt('project', 'Dự án', st.info.project)}${txt('drawingNo', 'Số bản vẽ', st.info.drawingNo)}</div>
     <div class="np-row two">${txt('matName', 'Mác thép', st.info.material)}${txt('drawnBy', 'Người lập', st.info.drawnBy)}</div></details>
    <div class="np-parts-head"><strong>Chi tiết cần cắt</strong><small id="np-count"></small></div>
    <div class="np-parts" id="np-parts"></div>
    <button type="button" class="np-add" id="np-add">＋ Thêm chi tiết</button>
    <p class="np-error" id="np-error" role="alert"></p>
   </section>
   <section class="np-panel" aria-label="Phương án trải phôi">
    <div class="np-total-bar" id="np-total-bar" hidden>
     <div class="np-tb-main"><span>HAO PHÍ CHUNG</span><strong id="np-tb-waste">—</strong><small id="np-tb-sub"></small></div>
     <div class="np-tb-cell"><span>Xuất kho</span><b id="np-tb-issued">—</b></div>
     <div class="np-tb-cell"><span>Tấm lẻ thu hồi</span><b id="np-tb-rec">—</b></div>
     <div class="np-tb-cell"><span>Thực tiêu hao</span><b id="np-tb-net">—</b></div>
     <div class="np-tb-cell"><span>Thành phẩm</span><b id="np-tb-tp">—</b></div>
    </div>
    <div class="np-plans" id="np-plans" role="group" aria-label="Các phương án phối kết hợp"></div>
    <div class="np-tabs" id="np-tabs" role="tablist" aria-label="Các tờ"></div>
    <div class="np-figure"><div class="np-fig-title" id="np-fig-title">SƠ ĐỒ TRẢI PHÔI</div><div class="np-preview" id="np-preview">Đang lập sơ đồ…</div><div class="np-legend" id="np-legend"></div></div>
    <div class="np-caption"><strong class="np-summary" id="np-summary">—</strong><span class="np-proof" id="np-proof"></span></div>
    <div class="np-footrow"><p class="np-strategy" id="np-strategy">—</p></div>
    <div class="np-footrow"><span></span><span>
     <button class="np-export" type="button" id="np-dxf-cut" disabled title="Mỗi kiểu tờ một file, chỉ đường bao cắt – đưa vào CypCut / phần mềm máy cắt">↓ DXF máy cắt (.zip)</button>
     <button class="np-export" type="button" id="np-dxf-plan" disabled title="Bản vẽ cutting plan chuẩn dự án">↓ DXF cutting plan</button>
     <button class="np-export" type="button" id="np-csv" disabled>↓ CSV</button>
     <button class="np-export" type="button" id="np-svg" disabled>↓ SVG tờ này</button></span></div>
    <div class="np-status" id="np-status" role="status" aria-live="polite"></div>
    <div class="np-list" id="np-list" hidden><div class="np-list-title"><span>DANH SÁCH CHI TIẾT ĐÃ XẾP</span><small id="np-list-count"></small></div>
     <div class="np-scroll"><table><thead><tr><th>NO</th><th>Mã chi tiết</th><th class="num">Thành phẩm (mm)</th><th class="num">Kích thước cắt (mm)</th><th class="num">Yêu cầu</th><th class="num">Đã xếp</th><th class="num">Trong lỗ</th></tr></thead><tbody id="np-list-body"></tbody></table></div></div>
   </section>
  </div>
  <section class="np-results" aria-label="Kết quả">
   <div class="np-res"><strong>Số tờ xuất</strong><output id="np-sheets">—</output><small id="np-sheets-sub"></small></div>
   <div class="np-res"><strong>Xuất kho (kg)</strong><output id="np-issued">—</output><small id="np-issued-sub"></small></div>
   <div class="np-res"><strong>Thành phẩm* (kg)</strong><output id="np-finished">—</output></div>
   <div class="np-res em"><strong>Hao phí / TP (%)</strong><output id="np-waste">—</output><small id="np-waste-sub"></small></div>
   <div class="np-res np-res-rem"><strong id="np-remnant-title">Tấm lẻ thu hồi</strong><output id="np-remnant">—</output><small id="np-remnant-sub"></small></div>
  </section>
  <p class="np-note">* Thành phẩm tính phủ bì theo đường bao ngoài (vành khuyên trừ lỗ). Hao phí = (Xuất kho − Tấm lẻ thu hồi − Thành phẩm) / Thành phẩm × 100; xuất kho gồm cả tấm lẻ lấy từ kho. Mỗi tờ luôn ghi kích thước dư phải, dư dưới (theo biên chi tiết, chưa trừ mạch cắt); dải dư lớn nhất có cạnh ngắn ≥ ngưỡng được thu hồi bằng một nhát cắt suốt, phần dư nhỏ hơn ngưỡng tính vào hao phí. Mỗi lần đổi số liệu máy chạy lại từ đầu, thử nhiều cách phối kết hợp và đưa ra các phương án khác nhau. Mọi sơ đồ đã qua kiểm tra hình học độc lập: không chồng lấn, đủ mạch cắt, không lấn mép, chi tiết trong lỗ cách mép lỗ đủ mạch cắt, đủ số lượng.</p>
 </div>`;
  const $ = id => root.querySelector('#' + id);
  const put = (id, text) => (setText ? setText(root, '#' + id, text) : ($(id).textContent = text));
  const val = n => root.querySelector(`[name="${n}"]`)?.value ?? '';
  const stocks = () => st.stocks[st.cutMethod];

  function renderStocks() {
    $('np-stocks').innerHTML = stocks().map((s, j) => `<div class="np-stock${s.kind === 'rem' ? ' is-rem' : ''}">
      <select data-skind="${j}" aria-label="Loại phôi dòng ${j + 1}"><option value="std"${s.kind === 'std' ? ' selected' : ''}>Chuẩn</option><option value="rem"${s.kind === 'rem' ? ' selected' : ''}>Tấm lẻ</option></select>
      <input name="sW${j}" value="${esc(s.W)}" inputmode="decimal" aria-label="Dài dòng ${j + 1}"><input name="sH${j}" value="${esc(s.H)}" inputmode="decimal" aria-label="Rộng dòng ${j + 1}">
      <input name="sQ${j}" value="${esc(s.qty)}" inputmode="numeric" placeholder="${s.kind === 'rem' ? '1' : '∞'}" aria-label="Số tờ dòng ${j + 1}">
      <input name="sL${j}" value="${esc(s.lot)}" maxlength="60" placeholder="${s.kind === 'rem' ? 'Mã tấm lẻ' : 'Seri / heat'}" aria-label="Mã lô dòng ${j + 1}">
      <button type="button" class="np-x" data-sdel="${j}" aria-label="Xóa dòng ${j + 1}"${stocks().length > 1 ? '' : ' disabled'}>✕</button></div>`).join('');
    $('np-presets').innerHTML = PRESETS[st.cutMethod].map(([w, h]) => `<button type="button" data-preset="${w}x${h}">＋ ${w} × ${h}</button>`).join('') +
      '<button type="button" class="rem" data-preset="rem">＋ Tấm lẻ kho</button>';
  }
  function renderParts() {
    $('np-parts').innerHTML = st.parts.map((p, t) => {
      const [fill, edge] = colorOf(t), round = p.shape !== 'rect';
      const dims = p.shape === 'rect' ? fld(`partW${t}`, 'Dài TP (mm)', p.partW) + fld(`partH${t}`, 'Rộng TP (mm)', p.partH) + fld(`allowance${t}`, 'Dư gia công (mm)', p.allowance, 'is-allow')
        : p.shape === 'circle' ? fld(`diameter${t}`, 'D TP (mm)', p.diameter) + fld(`allowance${t}`, 'Dư Ø (mm)', p.allowance, 'is-allow') + '<span></span>'
        : fld(`diameter${t}`, 'Ø ngoài TP', p.diameter) + fld(`inner${t}`, 'Ø trong TP', p.inner) + fld(`allowance${t}`, 'Dư Ø ngoài', p.allowance, 'is-allow');
      const extra = p.shape === 'ring' ? `<div class="np-row three">${fld(`allowanceIn${t}`, 'Dư Ø trong', p.allowanceIn, 'is-allow')}<span></span><span></span></div>` : '';
      return `<div class="np-part" data-part="${t}"><div class="np-part-head"><i class="${round ? 'round' : ''}" style="background:${fill};border-color:${edge}${p.shape === 'ring' ? ';box-shadow:inset 0 0 0 4px #fff' : ''}"></i>Chi tiết ${t + 1}
       <label class="np-rot${round ? ' is-off' : ''}" title="Bỏ chọn khi vật liệu có chiều cán / vân không được xoay"><input type="checkbox" data-rot="${t}" ${p.rotate !== false ? 'checked' : ''} ${round ? 'disabled' : ''}>Cho xoay 90°</label>
       ${st.parts.length > 1 ? `<button type="button" class="np-del" data-del="${t}" aria-label="Xóa chi tiết ${t + 1}">✕ Xóa</button>` : ''}</div>
       <div class="np-row p1">${txt(`name${t}`, 'Tên / mã', p.name)}<label><span>Hình dạng</span><select class="np-shape" data-shape="${t}"><option value="rect"${p.shape === 'rect' ? ' selected' : ''}>Chữ nhật</option><option value="circle"${p.shape === 'circle' ? ' selected' : ''}>Tròn</option><option value="ring"${p.shape === 'ring' ? ' selected' : ''}>Vành khuyên</option></select></label>${fld(`qty${t}`, 'Số lượng', p.qty)}</div>
       <div class="np-row three">${dims}</div>${extra}</div>`;
    }).join('');
    countLine();
  }
  function countLine() {
    const total = st.parts.reduce((s, p) => s + (Number(String(p.qty).replaceAll(',', '')) || 0), 0);
    put('np-count', `${st.parts.length} loại · ${total.toLocaleString('vi-VN')} chiếc`);
  }
  function collect() {
    for (const k of ['thickness', 'gap', 'margin', 'remnantMin']) st[k] = val(k);
    st.info = { project: val('project'), drawingNo: val('drawingNo'), material: val('matName'), drawnBy: val('drawnBy') };
    stocks().forEach((s, j) => { s.W = val(`sW${j}`); s.H = val(`sH${j}`); s.qty = val(`sQ${j}`); s.lot = val(`sL${j}`); });
    st.parts.forEach((p, t) => {
      p.name = val(`name${t}`); p.qty = val(`qty${t}`); p.allowance = val(`allowance${t}`);
      if (p.shape === 'rect') { p.partW = val(`partW${t}`); p.partH = val(`partH${t}`); }
      else p.diameter = val(`diameter${t}`);
      if (p.shape === 'ring') { p.inner = val(`inner${t}`); p.allowanceIn = val(`allowanceIn${t}`); }
      const rb = root.querySelector(`[data-rot="${t}"]`); if (rb && !rb.disabled) p.rotate = rb.checked;
    });
    countLine();
    savedState = structuredClone(st);
  }
  function syncUI() {
    root.querySelectorAll('[data-cut]').forEach(b => { const yes = b.dataset.cut === st.cutMethod; b.classList.toggle('is-active', yes); b.setAttribute('aria-pressed', String(yes)); });
    root.querySelectorAll('[data-mat]').forEach(b => { const yes = Number(b.dataset.mat) === st.material; b.classList.toggle('is-active', yes); b.setAttribute('aria-pressed', String(yes)); });
    if (catalog) $('np-mat-list').value = st.material >= 4 ? String(st.material) : '';
    for (const k of ['thickness', 'gap', 'margin']) root.querySelector(`[name="${k}"]`).value = st[k];
    root.querySelector('[name="gap"]').closest('label').querySelector('span').textContent = st.cutMethod === 'shear' ? 'Khe hở (mm)' : 'Mạch cắt (mm)';
    put('np-cut-hint', st.cutMethod === 'shear' ? 'Nhát chặt chạy suốt · chỉ chữ nhật · phần dư là chữ nhật'
      : 'Xếp tự do chữ nhật, tròn, vành khuyên · xoay vòng, so le, chèn khe, chèn lỗ');
    renderStocks();
  }
  function payload() {
    const density = Number(st.density);
    if (!Number.isFinite(density) || density <= 0) throw Error('Kiểm tra vật liệu và khối lượng riêng.');
    const stockList = stocks().map((s, j) => {
      const lab = `Kho phôi dòng ${j + 1}`, q = String(s.qty).trim();
      return { W: parseNum(s.W, `${lab} – dài`, { positive: true }), H: parseNum(s.H, `${lab} – rộng`, { positive: true }),
        limit: q === '' ? null : parseNum(q, `${lab} – số tờ`, { integer: true }), remnant: s.kind === 'rem', lot: String(s.lot || '').trim() };
    });
    const parts = st.parts.map((p, t) => {
      const lab = `Chi tiết ${t + 1}`, qtyRaw = String(p.qty).trim();
      if (!qtyRaw || Number(qtyRaw.replaceAll(',', '')) === 0) return null;
      const name = String(p.name || '').trim() || `CT${t + 1}`;
      const base = { name, shape: p.shape, rotate: p.rotate !== false, allowance: parseNum(p.allowance || '0', `${lab} – dư gia công`),
        qty: parseNum(p.qty, `${lab} – số lượng`, { integer: true }) };
      if (p.shape === 'rect') return { ...base, partW: parseNum(p.partW, `${lab} – dài TP`, { positive: true }), partH: parseNum(p.partH, `${lab} – rộng TP`, { positive: true }) };
      const d = { ...base, diameter: parseNum(p.diameter, `${lab} – Ø ngoài TP`, { positive: true }) };
      if (p.shape === 'ring') { d.inner = parseNum(p.inner, `${lab} – Ø trong TP`, { positive: true }); d.allowanceIn = parseNum(p.allowanceIn || '0', `${lab} – dư Ø trong`); }
      return d;
    }).filter(Boolean);
    return {
      cutMethod: st.cutMethod, density, stocks: stockList,
      thickness: parseNum(st.thickness, 'Dày', { positive: true }), gap: parseNum(st.gap, st.cutMethod === 'shear' ? 'Khe hở' : 'Mạch cắt'),
      margin: parseNum(st.margin, 'Chừa mép'), remnantMin: parseNum(st.remnantMin, 'Ngưỡng thu hồi tấm lẻ'), parts,
    };
  }
  function status(msg = '', busy = false) {
    const box = $('np-status'); box.textContent = msg;
    if (busy) box.insertAdjacentHTML('beforeend', '<span class="np-spin" aria-hidden="true"></span>');
  }
  const exportsOff = off => { for (const id of ['np-csv', 'np-svg', 'np-dxf-cut', 'np-dxf-plan']) $(id).disabled = off; };
  function invalid(msg) {
    last = null; lastSVG = '';
    $('np-preview').textContent = 'Không thể lập sơ đồ với thông số hiện tại.'; $('np-tabs').innerHTML = ''; $('np-legend').innerHTML = '';
    $('np-list').hidden = true; $('np-plans').innerHTML = ''; $('np-total-bar').hidden = true; exportsOff(true); full = null;
    put('np-error', msg); put('np-fig-title', 'SƠ ĐỒ TRẢI PHÔI');
    for (const id of ['np-summary', 'np-strategy', 'np-sheets', 'np-issued', 'np-finished', 'np-waste', 'np-remnant']) put(id, '—');
    for (const id of ['np-proof', 'np-sheets-sub', 'np-issued-sub', 'np-waste-sub', 'np-remnant-sub']) put(id, '');
    status('');
  }
  /** Dư phải, dư dưới luôn ghi kích thước; dải được thu hồi đánh dấu ✓, dải còn lại ghi "vào hao phí". */
  const freeText = g => {
    const part = side => {
      const f = (g.freeStrips || []).find(x => x.side === side), name = side === 'right' ? 'Dư phải' : 'Dư dưới';
      if (!f) return `${name}: 0`;
      const kept = g.remnant && g.remnant.side === side;
      return `${name}: ${pretty(f.w)} × ${pretty(f.h)} mm${kept ? ' → thu hồi ' + pretty(g.remnant.w) + ' × ' + pretty(g.remnant.h) : ' (vào hao phí)'}`;
    };
    return `${part('right')} · ${part('bottom')}`;
  };
  const sizeText = T => T.ring ? `Ø${pretty(T.cw)} / Ø${pretty(T.hole)}` : T.circle ? 'D' + pretty(T.cw) : pretty(T.cw) + ' × ' + pretty(T.ch);
  const chip = T => { const [fill, edge] = colorOf(T.t); return `<i class="np-chip${T.ring ? ' ring' : T.circle ? ' round' : ''}" style="background:${fill};border-color:${edge}"></i>`; };
  function showGroup(gi) {
    if (!last) return;
    group = Math.max(0, Math.min(gi, last.groups.length - 1));
    const res = last, g = res.groups[group], pic = drawSheet(res, group);
    $('np-preview').innerHTML = pic.svg; lastSVG = pic.download;
    put('np-fig-title', pic.title + (g.n > 1 ? ` · ×${g.n} tờ giống nhau` : ''));
    root.querySelectorAll('[data-group]').forEach(b => { const yes = Number(b.dataset.group) === group; b.classList.toggle('is-active', yes); b.setAttribute('aria-selected', String(yes)); });
    const present = new Set(g.items.map(p => p.t)), anyRot = g.items.some(p => p.rot);
    $('np-legend').innerHTML = res.types.filter(T => present.has(T.t)).map(T => `<span>${chip(T)}${T.t + 1}. ${esc(T.name)} ${sizeText(T)} <b>×${g.counts[T.t]}</b></span>`).join('') +
      (anyRot ? '<span><i class="np-chip hatch"></i>Xoay 90°</span>' : '') +
      (g.cuts.some(c => c.seq > 0) ? '<span><i class="np-chip" style="background:#fff7ea;border-color:#d58027"></i>Số = thứ tự nhát chặt chính</span>' : '');
    put('np-summary', `${sheetRange(res, group)} / ${res.totalSheets}: ${g.items.length} chi tiết · hao phí tờ ${g.wastePercent == null ? '—' : g.wastePercent.toFixed(2) + ' %'} · dùng ${g.usedPercent.toFixed(1)} % tờ`);
    put('np-strategy', strategyText(g.strategy) + ' · ' + freeText(g));
  }
  function present(res, keepPlan = false) {
    full = res;
    if (!keepPlan || planIdx >= res.plans.length) planIdx = 0;
    // chỉ hiện thẻ khi có phương án thay thế khác biệt thật; mặc định luôn mở phương án hao phí thấp nhất
    $('np-plans').innerHTML = res.plans.length < 2 ? '' : res.plans.map((p, k) => `<button type="button" class="np-plan" data-plan="${k}">
        <b>${k === 0 ? '★ Phương án tốt nhất' : 'Phương án khác ' + k}</b><big>${p.totalSheets} tờ · ${p.wastePercent.toFixed(2)} %</big>
        <small>${esc(p.reason)}</small><small>Thu hồi ${pretty(p.recoveredKG)} kg · ${p.kinds} kiểu tờ</small></button>`).join('');
    showPlan(planIdx);
  }
  function showPlan(k) {
    planIdx = k;
    const res = { ...full, ...full.plans[k] };
    last = res;
    root.querySelectorAll('[data-plan]').forEach(b => { const yes = Number(b.dataset.plan) === k; b.classList.toggle('is-active', yes); b.setAttribute('aria-pressed', String(yes)); });
    const multi = new Set(res.groups.map(g => g.W + 'x' + g.H)).size > 1;
    $('np-tabs').innerHTML = res.groups.map((g, gi) => {
      const r = g.freeStrips.find(f => f.side === 'right');
      return `<button type="button" class="np-tab" role="tab" data-group="${gi}"><b>${sheetRange(res, gi)}${g.n > 1 ? ` · ×${g.n}` : ''}</b><small>${multi || g.remnantStock ? `${g.remnantStock ? 'Lẻ ' : ''}${g.W}×${g.H} · ` : ''}${g.items.length} ct · hp ${g.wastePercent == null ? '—' : g.wastePercent.toFixed(1) + ' %'}${g.remnant ? ' · <span class="np-tab-rem">thu hồi</span>' : ''}</small></button>`;
    }).join('');
    showGroup(group < res.groups.length ? group : 0);
    const proof = $('np-proof');
    proof.textContent = res.lowerBound == null ? '' : res.proven ? '✓ Số tờ tối thiểu – đã chứng minh' : `Cận dưới ${res.lowerBound} tờ · phương án hơn cận dưới ${res.totalSheets - res.lowerBound} tờ`;
    proof.classList.toggle('gap', res.lowerBound != null && !res.proven);
    const bySize = new Map();
    res.groups.forEach(g => { const kk = (g.remnantStock ? 'lẻ ' : '') + g.W + '×' + g.H; bySize.set(kk, (bySize.get(kk) || 0) + g.n); });
    put('np-sheets', String(res.totalSheets)); put('np-sheets-sub', [...bySize].map(([kk, n]) => `${n} tờ ${kk}`).join(' · '));
    put('np-issued', pretty(res.issuedKG));
    put('np-issued-sub', `Thực tiêu hao ${pretty(res.issuedKG - res.recoveredKG)} kg` + (res.remnantUsedKG ? ` · gồm ${pretty(res.remnantUsedKG)} kg tấm lẻ kho` : ''));
    put('np-finished', pretty(res.finishedKG));
    $('np-total-bar').hidden = false;
    put('np-tb-waste', res.wastePercent.toFixed(2) + ' %');
    put('np-tb-sub', `${res.totalSheets} tờ · nếu không thu hồi ${res.wasteFullPercent.toFixed(2)} %`);
    put('np-tb-issued', pretty(res.issuedKG) + ' kg'); put('np-tb-rec', pretty(res.recoveredKG) + ' kg');
    put('np-tb-net', pretty(res.issuedKG - res.recoveredKG) + ' kg'); put('np-tb-tp', pretty(res.finishedKG) + ' kg');
    put('np-waste', res.wastePercent.toFixed(2)); put('np-waste-sub', `Nếu không thu hồi: ${res.wasteFullPercent.toFixed(2)} % · tổng cả trình cắt · đã thử ${full.tried} cách xếp`);
    const rems = res.groups.filter(g => g.remnant), nRem = rems.reduce((s, g) => s + g.n, 0);
    put('np-remnant-title', `Tấm lẻ thu hồi (≥ ${pretty(res.input.remnantMin)} mm)`);
    put('np-remnant', nRem ? `${pretty(res.recoveredKG)} kg` : 'Không có');
    const lr = res.lastFree.find(f => f.side === 'right'), lb = res.lastFree.find(f => f.side === 'bottom');
    put('np-remnant-sub', (nRem ? rems.map(g => `${pretty(g.remnant.w)}×${pretty(g.remnant.h)}${g.n > 1 ? ` (×${g.n})` : ''}`).slice(0, 3).join('; ') + (rems.length > 3 ? '…' : '') + ' · ' : '')
      + `Tờ cuối dư phải ${lr ? pretty(lr.w) + '×' + pretty(lr.h) : '0'}, dư dưới ${lb ? pretty(lb.w) + '×' + pretty(lb.h) : '0'}`);
    $('np-list-body').innerHTML = res.types.map(T => {
      const made = res.groups.reduce((s, g) => s + g.counts[T.t] * g.n, 0);
      const tp = T.ring ? `Ø${pretty(T.tpW)} / Ø${pretty(T.tpIn)}` : T.circle ? 'D' + pretty(T.tpW) : pretty(T.tpW) + ' × ' + pretty(T.tpH);
      return `<tr><td>${T.t + 1}</td><td>${chip(T)} ${esc(T.name)}${T.noRotate ? ' <small>(không xoay)</small>' : ''}</td>
       <td class="num">${tp}</td><td class="num">${sizeText(T)}</td>
       <td class="num">${pretty(T.qty)}</td><td class="num ${made === T.qty ? 'ok' : ''}">${pretty(made)}${made === T.qty ? ' ✓' : ''}</td><td class="num">${T.inHoles ? pretty(T.inHoles) : ''}</td></tr>`;
    }).join('') + `<tr class="np-total"><td colspan="4">TỔNG</td><td class="num">${pretty(res.pieces)}</td><td class="num">${pretty(res.pieces)}</td><td class="num">${pretty(res.types.reduce((s, T) => s + T.inHoles, 0)) || ''}</td></tr>`;
    put('np-list-count', `${res.types.length} loại · ${pretty(res.pieces)} chi tiết · tính ${(res.ms / 1000).toFixed(1)} s`);
    $('np-list').hidden = false; exportsOff(false);
    put('np-error', ''); status('');
  }
  function compute() {
    serial++; const job = serial;
    if (worker) { worker.terminate(); worker = null; }
    let args;
    try { collect(); args = payload(); } catch (e) { invalid(e.message); return; }
    status('Đang tìm phương án ghép…', true);
    const done = (value, error) => {
      if (job !== serial || disposed || ctx.signal?.aborted) return;
      worker?.terminate(); worker = null;
      if (error) invalid(error); else present(value);
    };
    const local = () => { try { done(calculateNestingPro(args), null); } catch (err) { done(null, err.message); } };
    try {
      worker = new Worker(new URL(import.meta.url), { type: 'module', name: 'epsilon-nesting-pro' });
      worker.addEventListener('message', e => done(e.data?.result, e.data?.ok ? null : e.data?.error || 'Không tính được.'), { once: true });
      worker.addEventListener('error', e => { if (job !== serial) return; console.warn('Nesting PRO Worker:', e.message); worker?.terminate(); worker = null; local(); }, { once: true });
      worker.postMessage(args);
    } catch { worker = null; local(); }
  }
  const schedule = () => { clearTimeout(timer); if (worker) { worker.terminate(); worker = null; serial++; } status('Đang cập nhật…', true); timer = setTimeout(compute, 400); };
  const INFO = ['project', 'drawingNo', 'matName', 'drawnBy'];

  on(root, 'input', e => {
    if (!e.target.matches('input[name]')) return;
    collect();
    if (INFO.includes(e.target.name)) return;                     // khung tên không ảnh hưởng phương án
    schedule();
  });
  on(root, 'change', e => {
    if (e.target.matches('[data-rot]')) { collect(); schedule(); return; }
    if (e.target.matches('[data-skind]')) { collect(); stocks()[Number(e.target.dataset.skind)].kind = e.target.value; renderStocks(); collect(); schedule(); return; }
    if (e.target.matches('[data-shape]')) {
      collect();
      const p = st.parts[Number(e.target.dataset.shape)], next = e.target.value;
      if (String(p.allowance).trim() === ALLOW_DEFAULT[p.shape]) p.allowance = ALLOW_DEFAULT[next];
      if (next === 'ring' && !String(p.inner).trim()) p.inner = String(Math.round(Number(p.diameter) * 0.6) || '');
      p.shape = next; renderParts(); collect(); schedule();
    }
  });
  on(root, 'click', e => {
    const tab = e.target.closest('[data-group]'); if (tab) { showGroup(Number(tab.dataset.group)); return; }
    const pl = e.target.closest('[data-plan]'); if (pl && full) { group = 0; showPlan(Number(pl.dataset.plan)); return; }
    const del = e.target.closest('[data-del]');
    if (del && st.parts.length > 1) { collect(); st.parts.splice(Number(del.dataset.del), 1); renderParts(); collect(); schedule(); return; }
    const sdel = e.target.closest('[data-sdel]');
    if (sdel && stocks().length > 1) { collect(); stocks().splice(Number(sdel.dataset.sdel), 1); renderStocks(); collect(); schedule(); return; }
    const pre = e.target.closest('[data-preset]');
    if (pre) {
      collect();
      if (pre.dataset.preset === 'rem') stocks().push({ kind: 'rem', W: '', H: '', qty: '1', lot: '' });
      else { const [w, h] = pre.dataset.preset.split('x'); stocks().push({ kind: 'std', W: w, H: h, qty: '', lot: '' }); }
      renderStocks(); collect();
      if (pre.dataset.preset === 'rem') root.querySelector(`[name="sW${stocks().length - 1}"]`)?.focus(); else schedule();
      return;
    }
    const cut = e.target.closest('[data-cut]');
    if (cut && cut.dataset.cut !== st.cutMethod) {
      collect();
      st.thick[st.cutMethod] = st.thickness; st.gaps[st.cutMethod] = st.gap; st.margins[st.cutMethod] = st.margin;
      st.cutMethod = cut.dataset.cut;
      st.thickness = st.thick[st.cutMethod]; st.gap = st.gaps[st.cutMethod]; st.margin = st.margins[st.cutMethod];
      savedState = structuredClone(st); syncUI(); schedule(); return;
    }
    const mat = e.target.closest('[data-mat]');
    if (mat && catalog) { st.material = Number(mat.dataset.mat); st.density = String(catalog[st.material].density); savedState = structuredClone(st); syncUI(); schedule(); }
  });
  on($('np-add'), 'click', () => {
    collect();
    st.parts.push({ name: `CT${st.parts.length + 1}`, shape: 'rect', partW: '', partH: '', diameter: '', inner: '', allowance: '0', allowanceIn: '5', qty: '1', rotate: true });
    renderParts(); collect();
    root.querySelector(`[name="partW${st.parts.length - 1}"]`)?.focus();
  });
  on($('np-mat-list'), 'change', () => {
    const k = Number($('np-mat-list').value), item = catalog?.[k];
    if (!$('np-mat-list').value || !item) return;
    st.material = k; st.density = String(item.density); savedState = structuredClone(st); syncUI(); schedule();
  });
  const stamp = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
  const fileTag = () => (st.info.drawingNo || 'cutting-plan').replace(/[^\w.-]+/g, '_');
  const matName = () => st.info.material || catalog?.[st.material]?.name || '';
  on($('np-svg'), 'click', () => {
    if (!lastSVG) return;
    downloadBlob?.(new Blob([lastSVG], { type: 'image/svg+xml;charset=utf-8' }), `${fileTag()}_${sheetRange(last, group).replace(/\s|–/g, '-')}.svg`);
    ctx.showToast?.('Đã tạo sơ đồ SVG.');
  });
  on($('np-dxf-cut'), 'click', () => {
    if (!last) return;
    const files = last.groups.map((g, gi) => ({
      name: `${fileTag()}_${sheetRange(last, gi).replace(/\s|–/g, '-')}${g.n > 1 ? `_x${g.n}` : ''}_${g.W}x${g.H}x${last.input.thickness}.dxf`,
      data: cutDXF(last, gi),
    }));
    downloadBlob?.(new Blob([zipFiles(files)], { type: 'application/zip' }), `${fileTag()}_DXF_may_cat.zip`);
    ctx.showToast?.(`Đã tạo ${files.length} file DXF máy cắt.`);
  });
  on($('np-dxf-plan'), 'click', () => {
    if (!last) return;
    const dxf = planDXF(last, { ...st.info, material: matName(), date: stamp() });
    downloadBlob?.(new Blob([dxf], { type: 'application/dxf' }), `${fileTag()}_cutting_plan.dxf`);
    ctx.showToast?.('Đã tạo DXF cutting plan.');
  });
  on($('np-csv'), 'click', () => {
    if (!last) return;
    const q = v => `"${String(v).replaceAll('"', '""')}"`, res = last, rows = [];
    rows.push([q('Dự án'), q(st.info.project), q('Số bản vẽ'), q(st.info.drawingNo), q('Vật liệu'), q(matName()), q('Dày (mm)'), res.input.thickness,
      q('Phương pháp'), q(res.input.cutMethod === 'shear' ? 'Chặt sấn' : 'Laser / Plasma'), q('Mạch cắt'), res.input.gap, q('Chừa mép'), res.input.margin].join(','));
    rows.push('');
    rows.push([q('Phương án'), q(`${planIdx + 1}. ${res.label}`)].join(','));
    rows.push(['Kiểu tờ', 'Tờ số', 'Số tờ', 'Khổ (mm)', 'Nguồn phôi', 'Mã lô / seri', ...res.types.map(T => `${T.t + 1}. ${T.name}`), 'Dùng (%)', 'Dư phải (mm)', 'Dư dưới (mm)', `Tấm lẻ thu hồi ≥ ${res.input.remnantMin} (mm)`, 'Cách xếp'].map(q).join(','));
    const fr = (g, side) => { const f = g.freeStrips.find(x => x.side === side); return f ? `${f.w} x ${f.h}` : '0'; };
    res.groups.forEach((g, gi) => rows.push([gi + 1, sheetRange(res, gi), g.n, `${g.W} x ${g.H}`, g.remnantStock ? 'Tấm lẻ kho' : 'Khổ chuẩn', g.lot,
      ...res.types.map(T => g.counts[T.t]), g.usedPercent.toFixed(1), fr(g, 'right'), fr(g, 'bottom'), g.remnant ? `${g.remnant.w} x ${g.remnant.h}` : '', strategyText(g.strategy)].map(q).join(',')));
    rows.push('');
    rows.push([q('Tổng số tờ'), res.totalSheets, q('Cận dưới'), res.lowerBound ?? ''].join(','));
    rows.push([q('Xuất kho (kg)'), res.issuedKG.toFixed(2), q('Tấm lẻ thu hồi (kg)'), res.recoveredKG.toFixed(2), q('Thành phẩm (kg)'), res.finishedKG.toFixed(2)].join(','));
    rows.push([q('Hao phí / TP (%)'), res.wastePercent.toFixed(2), q('Nếu không thu hồi (%)'), res.wasteFullPercent.toFixed(2), q('Ngưỡng thu hồi (mm)'), res.input.remnantMin].join(','));
    rows.push('');
    rows.push(['Các phương án đã thử', 'Số tờ', 'Xuất kho (kg)', 'Thu hồi (kg)', 'Hao phí / TP (%)', 'Số kiểu tờ', 'Đang xem'].map(q).join(','));
    full.plans.forEach((p, k) => rows.push([`${k + 1}. ${p.label}`, p.totalSheets, p.issuedKG.toFixed(2), p.recoveredKG.toFixed(2), p.wastePercent.toFixed(2), p.kinds, k === planIdx ? 'X' : ''].map(q).join(',')));
    rows.push('');
    rows.push(['Kiểu tờ', 'STT', 'NO', 'Mã chi tiết', 'Hình', 'X (mm)', 'Y (mm)', 'Dài cắt (mm)', 'Rộng cắt (mm)', 'Ø lỗ (mm)', 'Xoay 90°'].map(q).join(','));
    res.groups.forEach((g, gi) => g.items.forEach((p, k) => rows.push([gi + 1, k + 1, p.t + 1, res.types[p.t].name, p.ring ? 'Vành khuyên' : p.circle ? 'Tròn' : 'Chữ nhật', p.x, p.y, p.w, p.h, p.ring ? p.hole : '', p.rot ? 'Có' : ''].map(q).join(','))));
    downloadBlob?.(new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${fileTag()}.csv`);
    ctx.showToast?.('Đã tạo bảng cắt CSV.');
  });
  async function loadCatalog() {
    const sel = $('np-mat-list'), warn = $('np-warn');
    try {
      const list = await loadMaterials();
      if (disposed || ctx.signal?.aborted) return;
      if (!Array.isArray(list) || list.length < 4 || !list.every(v => v && typeof v.name === 'string' && Number.isFinite(v.density) && v.density > 0)) throw Error('Danh mục không hợp lệ');
      catalog = list;
      sel.replaceChildren(new Option(`Danh mục ${list.length} vật liệu`, ''), ...list.map((v, k) => new Option(v.name, String(k))));
      sel.disabled = false;
      root.querySelectorAll('[data-mat]').forEach((b, k) => { b.disabled = false; b.textContent = list[k].name; });
      if (!Number.isInteger(st.material) || st.material < 0 || st.material >= list.length) st.material = 0;
      st.density = String(list[st.material].density); savedState = structuredClone(st); syncUI(); schedule();
    } catch (err) {
      if (disposed || ctx.signal?.aborted) return;
      warn.hidden = false; warn.textContent = 'Không tải được materials.json; đang dùng khối lượng riêng đã lưu (' + st.density + ' kg/m³).';
      console.warn('Nesting PRO catalog:', err);
    }
  }
  renderParts(); syncUI(); compute(); void loadCatalog();
  return () => { disposed = true; clearTimeout(timer); serial++; worker?.terminate(); worker = null; };
}
