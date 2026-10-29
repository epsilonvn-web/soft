/**
 * Epsilon Soft - CUTTING PLAN PLATE (thép tấm) – Ghép nhiều chi tiết trên nhiều tờ (Web) – BẢN TEST NỘI BỘ
 * Đổi tên 28/10/2026: trước là "Trải phôi 2D PRO" (nesting_pro.js).
 * Tên file: cutting-plan-plate.js. Kế thừa lõi một loại của nesting.js (giữ nguyên thuật toán đã kiểm chứng).
 * !!! File này chứa toàn bộ thuật toán. Chỉ dùng để test nội bộ, KHÔNG đưa lên web công khai.
 * Phạm vi: chữ nhật, tròn, vành khuyên (chèn chi tiết vào lỗ), ĐA GIÁC đường bao thật từ DXF (đoạn thẳng + cung);
 *  nhiều khổ + kho tấm lẻ; xuất DXF máy cắt + DXF cutting plan.
 *  - Đa giác (28/10/2026): khối lượng thành phẩm theo đường bao thật; tờ một loại thử kiểu RĂNG LƯỢC (hàng xen kẽ xoay 180°,
 *    lệch ngang để phần nhô cắm vào phần lõm – anh xác nhận thợ xếp phổ biến); tờ ghép nhiều loại tạm xếp theo khung bao.
 *    Chỉ laser / plasma; dư gia công đa giác = 0 (CHỜ XÁC NHẬN cách cộng dư cho đường bao bất kỳ).
 * Đầu vào: 3 cách – nhập tay, Excel (form cutting plan 3 sheet), DXF (đường bao chi tiết). Excel / DXF đọc bằng cutting-plan-import.js
 *  (đặt cùng thư mục, chỉ nạp khi bấm nút nhập – thiếu file thì nhập tay vẫn chạy).
 * Quy ước (đã chốt với anh):
 *  - Kích thước nhập là THÀNH PHẨM; kích thước CẮT = thành phẩm + dư gia công (tổng, không phải mỗi bên).
 *  - Mọi chi tiết cùng mác thép, cùng chiều dày, cùng một phương pháp cắt trên một tờ.
 *  - Mạch cắt k giữa hai chi tiết; chừa mép e ở 4 cạnh tờ (được = 0).
 *  - Không giới hạn số tờ: ghép đến khi hết chi tiết.
 *  - Hao phí / TP = (KL xuất − KL tấm lẻ thu hồi − KL thành phẩm) / KL thành phẩm.
 *  - Tấm lẻ thu hồi khi cạnh ngắn ≥ ngưỡng (mặc định 200 mm, TÙY CHỈNH); dưới ngưỡng tính vào hao phí.
 *  - Phần dư mép mỗi tờ (dư phải, dư dưới) luôn được ghi kích thước, dù to hay nhỏ.
 *  - Mỗi lần đổi số liệu chạy lại từ đầu, thử nhiều cách phối kết hợp, đưa ra các phương án khác nhau để chọn.
 *  - Thứ tự xếp hạng (chốt 28/10/2026, sửa 29/10/2026): đủ số lượng → ÍT TỜ → DỒN DƯ VÀO MỘT TẤM LẺ TO (mỗi tờ chỉ tính
 *    một tấm lẻ to nhất, tấm thứ hai cùng tờ coi như phế; KHÔNG giảm số tấm lẻ bằng cách biến tấm lẻ thành phế)
 *    → ít tấm lẻ → tấm lẻ lớn nhất → hao phí thấp nhất → sơ đồ gọn. Dồn dư về tờ cuối để gom thành một tấm lẻ.
 *  - Chi tiết nhỏ: ĐIỀN Ô KẸT trước, phần còn lại lấp dải hẹp để tấm lẻ còn lại là một tấm to (chốt 29/10/2026).
 *  - Bán thành phẩm (BTP, chỉ thép tấm): thư viện tối đa 5 mã mỗi chiều dày (mác dùng lẫn); thợ tích mã được ghép (thứ tự trong
 *    master data chỉ để hiển thị – mã đứng đầu thường được tích nhất); lấp phần dư mép tờ để tấm lẻ về 0;
 *    hao phí tính BTP như một chi tiết trong đơn hàng; giới hạn số lượng theo tồn kho BTP.
 *  - Tròn nhiều cỡ (sửa 29/10/2026 – ca 10 × D556 + 10 × D409): ngoài khối lưới từng cỡ, thử thêm XẾP XEN KẼ từng chiếc vào
 *    vị trí tiếp xúc sát trái (phôi nhỏ chèn khe giữa phôi lớn, như thợ) → sơ đồ ngắn hơn, tấm lẻ to hơn.
 *  - Chặt sấn: chỉ chữ nhật, mọi sơ đồ phải tách được bằng nhát chặt chạy suốt (kiểm tra độc lập).
 *  - Laser/plasma: chữ nhật + tròn, được xếp không chặt suốt (xoay vòng, so le, xếp tự do).
 * Bản quyền © Epsilon Soft.
 */
const LIMIT = 1e6, EPS = 1e-7;
const MAX_TYPES = 200, MAX_PIECES = 20000, MAX_SHEETS = 5000;
const DEFAULTS = Object.freeze({
  remnantMin: 200,
  remnantMinLong: 500,      // tấm lẻ phải dài tối thiểu 500 mm (cạnh dài) mới thu hồi – đã chốt (chuẩn: tận dụng được cho chi tiết cỡ 400 × 190)
  longStripMin: 300,        // chặt sấn: ƯU TIÊN dải dài 2440 × h khi h ≥ 300 mm (chỉ để chọn phương án, không phải ngưỡng thu hồi)
  dpCostFull: 6e7,          // khối lượng phép tính tối đa cho bảng quy hoạch động đầy đủ / 1 loại
  dpCostPure: 3e8,          // khi vượt -> bảng thu gọn (chỉ bội số thuần)
  pinwheelMsTotal: 2000,    // thời gian tìm kiểu xoay vòng cho các tờ một loại (chia đều các loại)
  pinwheelWork: 1e7,
  maxRectsPieces: 600,      // xếp tự do từng chiếc chỉ chạy khi số chiếc còn lại ≤ ngưỡng này
  tidyTolerance: 100,       // tờ cuối: sơ đồ gọn (theo khối) được ưu tiên nếu phần dư chỉ ngắn hơn ≤ 100 mm
  planMs: 10000,            // thời gian tối đa thử thêm các chiến lược phối kết hợp
  widthTol: 10,             // phương án tăng khổ: tờ thực tế có thể RỘNG hơn khổ danh nghĩa tối đa 10 mm (người dùng chỉnh)
  lengthTol: 10,            //                     … và DÀI hơn tối đa 10 mm
  shrinkTol: 0.5,
  proposalMs: 7000,         // giới hạn tổng thời gian (từ lúc bắt đầu) dành cho các đề xuất khi "cận"           // phương án giảm kích thước cắt: mỗi chi tiết giảm 0,5 mm (dài / rộng / đường kính) – người dùng duyệt
  tailMs: 2500,             // thời gian tìm phương án dồn dư về tờ cuối (mỗi khổ)
  semiMax: 5,               // BTP: tối đa 5 mã mỗi chiều dày (anh chốt 28/10/2026 – nhiều mã thì quản lý BTP phức tạp)
  circleStripMs: 600,       // tờ cuối toàn phôi tròn nhiều cỡ: thời gian tìm sơ đồ xen kẽ ngắn nhất
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
/* 2b. CHI TIẾT ĐA GIÁC (đường bao thật từ DXF: đoạn thẳng + cung)          */
/* Đường bao: đỉnh {x, y, b} trong hệ của lõi (Y hướng xuống), bao [0,w]×[0,h]; */
/* b = tan(góc ở tâm / 4), dương = cung đi theo chiều góc dương của hệ toạ độ. */
/* Hướng đặt: ang 0 / 90 / 180 / 270 (chỉ xoay, không lật).                 */
/* ======================================================================= */
/** Diện tích đúng của đường bao (đa giác + phần cung). */
function polyAreaExact(V) {
  let a = 0;
  for (let k = 0; k < V.length; k++) {
    const p = V[k], q = V[(k + 1) % V.length];
    a += p.x * q.y - q.x * p.y;
    if (p.b) { const th = 4 * Math.atan(p.b), c = Math.hypot(q.x - p.x, q.y - p.y), r = c / (2 * Math.sin(Math.abs(th) / 2));
      a += Math.sign(th) * r * r * (Math.abs(th) - Math.sin(Math.abs(th))); }   // ×2 vì a đang là 2 × diện tích
  }
  return Math.abs(a / 2);
}
/** Rải điểm trên đường bao (cung chia ≤ stepDeg độ). Cung lồi: dây cung nằm trong vật liệu, lồi thêm cung lõm: nằm ngoài – sai số ≤ R(1−cos(step/2)). */
function polySample(V, stepDeg = 1) {
  const out = [];
  for (let k = 0; k < V.length; k++) {
    const p = V[k], q = V[(k + 1) % V.length];
    out.push([p.x, p.y]);
    if (!p.b) continue;
    const th = 4 * Math.atan(p.b), d = Math.hypot(q.x - p.x, q.y - p.y), r = d / (2 * Math.sin(Math.abs(th) / 2));
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, h = r * Math.cos(Math.abs(th) / 2), ux = (q.x - p.x) / d, uy = (q.y - p.y) / d;
    const s = th > 0 ? 1 : -1, cx = mx - s * h * uy, cy = my + s * h * ux, a0 = Math.atan2(p.y - cy, p.x - cx);
    const n = Math.max(2, Math.ceil(Math.abs(th) * 180 / Math.PI / stepDeg)), angs = [];
    for (let j = 1; j < n; j++) angs.push(th * j / n);
    for (let q4 = -8; q4 <= 8; q4++) { const t = q4 * Math.PI / 2 - a0; if (th > 0 ? t > 1e-9 && t < th - 1e-9 : t < -1e-9 && t > th + 1e-9) angs.push(t); }   // điểm cực của cung
    angs.sort((u, v) => th > 0 ? u - v : v - u);
    for (const t of angs) { const a = a0 + t; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  }
  return out;
}
/** Điểm bên trong đường bao, xa biên nhất (lưới 24 × 12) – để ghi tên / số hiệu. */
function polyLabel(P, w, h) {
  let best = [w / 2, h / 2], bd = -1;
  for (let i = 1; i < 24; i++) for (let j = 1; j < 12; j++) {
    const q = [w * i / 24, h * j / 12]; if (!ptIn(P, q)) continue;
    let d = Infinity; for (let k = 0; k < P.length; k++) d = Math.min(d, segDist(q, q, P[k], P[(k + 1) % P.length]));
    if (d > bd) { bd = d; best = q; }
  }
  return { x: best[0], y: best[1], r: Math.max(0, bd) };
}
/** Chuẩn bị đường bao nhập theo hệ DXF (Y lên): dời về gốc theo khung bao CHÍNH XÁC (kể cả điểm cực của cung),
 *  đổi sang hệ của lõi (Y xuống): y' = h − y, cung đổi chiều. */
function polyPrep(p) {
  const V0 = p.outline.map(v => ({ x: v.x, y: v.y, b: v.b || 0 })), P0 = polySample(V0, 1);
  const x0 = Math.min(...P0.map(q => q[0])), y0 = Math.min(...P0.map(q => q[1]));
  const w = Math.max(...P0.map(q => q[0])) - x0, h = Math.max(...P0.map(q => q[1])) - y0;
  if (Math.abs(w - p.partW) > 0.5 || Math.abs(h - p.partH) > 0.5) fail(`Chi tiết "${p.name}": khung bao ${p.partW} × ${p.partH} không khớp đường bao – nhập lại từ DXF.`);
  const V = V0.map(v => ({ x: v.x - x0, y: h - (v.y - y0), b: -v.b })), pts = polySample(V, 1);
  return { verts: V, pts, w, h, area: polyAreaExact(V), label: polyLabel(pts, w, h) };
}
/** Đổi một điểm của đường bao (bao w×h) sang hướng ang, kết quả vẫn trong bao [0,W']×[0,H']. */
function polyTurn(x, y, w, h, ang) {
  return ang === 90 ? [h - y, x] : ang === 180 ? [w - x, h - y] : ang === 270 ? [y, w - x] : [x, y];
}
const turnVerts = (V, w, h, ang) => V.map(v => { const [x, y] = polyTurn(v.x, v.y, w, h, ang); return { x, y, b: v.b }; });
/** Hướng đặt của một chi tiết đa giác đã xếp: ang có sẵn (kiểu răng lược) hoặc suy từ bao (0 / 90). */
const polyAng = (T, p) => p.ang ?? (Math.abs(p.w - T.cw) > 1e-6 ? 90 : 0);
/** Điểm rải của chi tiết đa giác đã đặt trên tờ. */
function placedPoly(T, p) {
  const ang = polyAng(T, p);
  return T.poly.pts.map(([x, y]) => { const [u, v] = polyTurn(x, y, T.cw, T.ch, ang); return [p.x + u, p.y + v]; });
}
function segDist(a, b, c, d) {
  const pd = (p, s, e) => { const dx = e[0] - s[0], dy = e[1] - s[1], L = dx * dx + dy * dy; let t = L ? ((p[0] - s[0]) * dx + (p[1] - s[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - s[0] - t * dx, p[1] - s[1] - t * dy); };
  const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  if (cr(a, b, c) * cr(a, b, d) < 0 && cr(c, d, a) * cr(c, d, b) < 0) return 0;
  return Math.min(pd(a, c, d), pd(b, c, d), pd(c, a, b), pd(d, a, b));
}
const ptIn = (P, [x, y]) => { let c = false; for (let k = 0, j = P.length - 1; k < P.length; j = k++) { const [xi, yi] = P[k], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
/** Khoảng cách nhỏ nhất giữa hai đa giác (0 nếu giao hoặc lồng nhau). */
function polyDist(P, Q, stop = Infinity) {
  if (ptIn(P, Q[0]) || ptIn(Q, P[0])) return 0;
  let best = Infinity;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    const bx0 = Math.min(a[0], b[0]) - stop, bx1 = Math.max(a[0], b[0]) + stop, by0 = Math.min(a[1], b[1]) - stop, by1 = Math.max(a[1], b[1]) + stop;
    for (let j = 0; j < Q.length; j++) {
      const c = Q[j], d = Q[(j + 1) % Q.length];
      if (Math.max(c[0], d[0]) < bx0 || Math.min(c[0], d[0]) > bx1 || Math.max(c[1], d[1]) < by0 || Math.min(c[1], d[1]) > by1) continue;
      const s = segDist(a, b, c, d); if (s < best) { best = s; if (best === 0) return 0; }
    }
  }
  return best;
}
/** Đa giác thay cho chi tiết chữ nhật / tròn (để so khoảng cách với chi tiết đa giác). */
function shapeOf(C, p) {
  const T = C.types[p.t];
  if (T.poly) return placedPoly(T, p);
  if (p.circle) { const r = p.w / 2, cx = p.x + r, cy = p.y + r, n = 96, R = r / Math.cos(Math.PI / n);   // đa giác ngoại tiếp: an toàn
    return Array.from({ length: n }, (_, k) => [cx + R * Math.cos(2 * Math.PI * k / n), cy + R * Math.sin(2 * Math.PI * k / n)]); }
  return [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]];
}

/* ---------- Kiểu xếp RĂNG LƯỢC cho tờ chỉ một loại đa giác (laser / plasma) ----------
 * Thợ hay làm: các hàng chi tiết chạy suốt theo chiều dài tờ; hàng sau xoay 180° và lệch ngang để phần nhô
 * của hàng này cắm vào phần lõm của hàng kia. Máy tìm độ lệch ngang và khoảng cách hàng nhỏ nhất bằng
 * "biên dạng trên / dưới" của hàng (đã nới thêm mạch cắt), rồi kiểm tra lại bằng khoảng cách đa giác thật. */
const ROW_STEP = 0.5;
/** Biên trên / dưới của chi tiết theo ô lưới x (ô i = [x_i − bước/2, x_i + bước/2]) trong bao [0,w] – lấy cực trị trong cả ô (bảo thủ). */
function rowProfile(P, w) {
  const g = ROW_STEP, n = Math.round(w / g) + 1, lo = new Float64Array(n).fill(Infinity), hi = new Float64Array(n).fill(-Infinity);
  const yAt = (x1, y1, x2, y2, x) => Math.abs(x2 - x1) < 1e-12 ? null : y1 + (y2 - y1) * (x - x1) / (x2 - x1);
  for (let k = 0; k < P.length; k++) {
    const [x1, y1] = P[k], [x2, y2] = P[(k + 1) % P.length], xa = Math.min(x1, x2), xb = Math.max(x1, x2);
    const a = Math.max(0, Math.round(xa / g)), b = Math.min(n - 1, Math.round(xb / g));
    for (let i = a; i <= b; i++) {
      const c0 = Math.max(xa, (i - 0.5) * g), c1 = Math.min(xb, (i + 0.5) * g);
      const ys = xb - xa < 1e-12 ? [y1, y2] : [yAt(x1, y1, x2, y2, c0), yAt(x1, y1, x2, y2, c1)];
      for (const v of ys) { if (v < lo[i]) lo[i] = v; if (v > hi[i]) hi[i] = v; }
    }
  }
  for (let i = 1; i < n; i++) { if (lo[i] === Infinity) lo[i] = lo[i - 1]; if (hi[i] === -Infinity) hi[i] = hi[i - 1]; }
  return { lo, hi };
}
/** Khoảng nâng nhỏ nhất của hàng U (lệch d) đặt sau hàng L, sao cho cách nhau ≥ k. Hàng lặp với bước P = w + k. */
function rowShift(L, U, w, k, d) {
  const n = L.hi.length, per = Math.round((w + k) / ROW_STEP), rk = Math.ceil(k / ROW_STEP);
  const off = ((Math.round(d / ROW_STEP) % per) + per) % per;
  let need = -Infinity;
  for (let i = 0; i < per; i++) {                         // i: vị trí trong một chu kỳ của hàng U
    const iu = i; if (iu >= n) continue;                  // khe giữa hai chi tiết hàng U
    const lu = U.lo[iu];
    for (let dx = -rk - 1; dx <= rk + 1; dx++) {                  // nới biên hàng L bằng đĩa bán kính k
      const iL = (((i + off + dx) % per) + per) % per; if (iL >= n) continue;
      const gap = Math.max(0, (Math.abs(dx) - 1) * ROW_STEP), lift = Math.sqrt(Math.max(0, k * k - gap * gap));   // hai ô cách nhau ít nhất (|dx| − 1) bước
      const v = L.hi[iL] + lift - lu; if (v > need) need = v;
    }
  }
  return need + 0.02;                                     // biên đã lấy bảo thủ theo ô; vẫn kiểm tra lại bằng đa giác thật
}
/** Tìm kiểu răng lược tốt nhất cho một hướng gốc (0° hoặc 90°). Trả { w, h, rows: [{ ang, dx, dy }] chu kỳ } . */
function interlockPlans(T, base, k) {
  const w = base === 90 ? T.ch : T.cw, h = base === 90 ? T.cw : T.ch;
  const PA = T.poly.pts.map(([x, y]) => polyTurn(x, y, T.cw, T.ch, base));
  const PB = T.poly.pts.map(([x, y]) => polyTurn(x, y, T.cw, T.ch, (base + 180) % 360));
  const A = rowProfile(PA, w), B = rowProfile(PB, w), per = w + k, plans = [];
  // 1) mọi hàng cùng hướng, mỗi hàng lệch d so với hàng trước
  let bestAA = null;
  for (let d = 0; d < per; d += 2 * ROW_STEP) { const s = rowShift(A, A, w, k, d); if (!bestAA || s < bestAA.s - 1e-9) bestAA = { d, s }; }
  plans.push({ w, h, base, cycle: [{ ang: base, dx: bestAA.d, dy: bestAA.s }] });
  // 2) hàng xen kẽ xoay 180°: A → B lệch d, B → A lệch −d
  let bestAB = null;
  for (let d = 0; d < per; d += 2 * ROW_STEP) {
    const s1 = rowShift(A, B, w, k, d), s2 = rowShift(B, A, w, k, -d);
    if (!bestAB || s1 + s2 < bestAB.s1 + bestAB.s2 - 1e-9) bestAB = { d, s1, s2 };
  }
  for (let d = bestAB.d - 2 * ROW_STEP; d <= bestAB.d + 2 * ROW_STEP; d += ROW_STEP) {
    const s1 = rowShift(A, B, w, k, d), s2 = rowShift(B, A, w, k, -d);
    if (s1 + s2 < bestAB.s1 + bestAB.s2 - 1e-9) bestAB = { d, s1, s2 };
  }
  plans.push({ w, h, base, cycle: [{ ang: (base + 180) % 360, dx: bestAB.d, dy: bestAB.s1 }, { ang: base, dx: -bestAB.d, dy: bestAB.s2 }] });
  return plans;
}
/** Đặt kiểu răng lược lên tờ; phần dư bên phải và phía dưới xếp thêm theo khung chữ nhật. */
function placeInterlock(C, T, plan, sx, startB) {
  const { e, k } = C, W = C.W - e, H = C.H - e, per = plan.w + k, items = [];
  const n = plan.cycle.length;
  let ang = startB ? plan.cycle[0].ang : (n > 1 ? plan.cycle[n - 1].ang : plan.base), idx = startB ? 1 % n : 0;
  let y = e, ox = 0, xmax = e, ybot = e;
  while (y + plan.h <= H + 1e-9) {
    const x0 = e + (((sx + ox) % per) + per) % per;
    for (let x = x0; x + plan.w <= W + 1e-9; x += per) { items.push({ t: T.t, x, y, w: plan.w, h: plan.h, ang, poly: true, rot: ang % 180 !== 0 }); xmax = Math.max(xmax, x + plan.w); }
    ybot = y + plan.h;
    const step = plan.cycle[idx]; idx = (idx + 1) % n;
    y += step.dy; ox += step.dx; ang = step.ang;
  }
  // phần dư: dải phải (hết chiều cao) và dải dưới (tới hết các hàng) – xếp khung bao theo lưới
  const fill = (x0, y0, x1, y1) => {
    const g = gridCount(T, x1 - x0 + k, y1 - y0 + k); if (!g.n) return;
    const pw = g.turned ? T.B : T.A, ph = g.turned ? T.A : T.B;
    for (let c = 0; c < Math.floor((x1 - x0 + k) / pw + 1e-9); c++) for (let r = 0; r < Math.floor((y1 - y0 + k) / ph + 1e-9); r++)
      items.push({ t: T.t, x: x0 + c * pw, y: y0 + r * ph, w: pw - k, h: ph - k, ang: g.turned ? 90 : 0, poly: true, rot: g.turned });
  };
  if (items.length) { fill(xmax + k, e, W, H); fill(e, ybot + k, xmax, H); }
  return items;
}
/** Tờ một loại đa giác: thử các kiểu răng lược, giữ kiểu nhiều chiếc nhất đã qua kiểm tra đa giác thật. */
function interlockPattern(C, T) {
  if (C.shear || !T.poly) return null;
  const cache = T.poly.plans ??= {};
  const key = `${C.k}`;
  const plans = cache[key] ??= [0, ...(T.rot ? [90] : [])].flatMap(base => interlockPlans(T, base, C.k));
  let best = null;
  for (const plan of plans) {
    const per = plan.w + C.k;
    for (const startB of plan.cycle.length > 1 ? [false, true] : [false])
      for (let s = 0; s < 16; s++) {
        const items = placeInterlock(C, T, plan, per * s / 16, startB);
        if (!best || items.length > best.items.length) best = { items, plan };
      }
  }
  if (!best || !best.items.length) return null;
  // kiểm tra lại bằng đa giác thật; sai thì nới khoảng hàng 0,2 mm và thử lại (tối đa 5 lần)
  for (let tries = 0; tries < 5; tries++) {
    if (!verifySheet(C, best.items).length) return { items: best.items, plan: best.plan };
    best.plan = { ...best.plan, cycle: best.plan.cycle.map(c => ({ ...c, dy: c.dy + 0.2 })) };
    best.items = placeInterlock(C, T, best.plan, 0, false);
  }
  return null;
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
    // đa giác: đường bao nhập theo hệ DXF (Y lên) → đổi sang hệ của lõi (Y xuống): y' = h − y, cung đổi chiều
    const poly = p.shape === 'poly' ? polyPrep(p) : null;
    const cw = poly ? poly.w : (circle ? p.diameter : p.partW) + p.allowance;
    const ch = poly ? poly.h : (circle ? p.diameter : p.partH) + p.allowance;
    const hole = ring ? p.inner - p.allowanceIn : 0;               // Ø lỗ cắt = Ø trong TP − dư Ø trong
    const rot = !circle && p.rotate !== false && Math.abs(cw - ch) > EPS;
    // Thành phẩm phủ bì; riêng vành khuyên trừ lỗ (lỗ được dùng để chèn chi tiết khác – CHỜ XÁC NHẬN)
    const tpArea = poly ? poly.area : ring ? Math.PI * (p.diameter ** 2 - p.inner ** 2) / 4 : circle ? Math.PI * p.diameter ** 2 / 4 : p.partW * p.partH;
    const cutArea = circle ? Math.PI * cw ** 2 / 4 : cw * ch;          // diện tích chiếm chỗ (dùng để chấm điểm phương án)
    const netArea = cutArea - Math.PI * hole ** 2 / 4;                 // diện tích phôi cắt thực
    const lbArea = poly ? poly.area : circle ? Math.PI * ((cw + k) ** 2 - Math.max(0, hole - k) ** 2) / 4 : (cw + k) * (ch + k);   // đa giác: chỉ diện tích thật (cận dưới chắc chắn)
    const T = { t, name: p.name, noRotate: !circle && p.rotate === false && Math.abs(cw - ch) > EPS, circle, ring, hole, cw, ch,
      A: cw + k, B: ch + k, rot, tpArea, cutArea: poly ? cw * ch : cutArea, netArea: poly ? poly.area : netArea, lbArea, qty: p.qty, tb: null, ...(poly ? { poly } : {}) };
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
  if (T.poly) {                                         // cận trên tính theo khung bao không đúng cho đa giác (răng lược vượt được)
    const il = interlockPattern(C, T);
    if (il && il.items.length > placed.length) { counts[T.t] = il.items.length; return { items: il.items, cuts: [], counts, blocks: 1, strategy: 'pure-interlock', upper: null }; }
    upper = null;
  }
  return { items: placed, cuts: cuts.map(c => ({ ...c, seq: 0 })), counts, blocks: 1, strategy: 'pure-' + strategy, upper };
}
function tag(T, p) {
  const o = { t: T.t, x: p.x, y: p.y, w: p.w, h: p.h, circle: T.circle,
    rot: !T.circle && Math.abs(p.w - T.cw) > 1e-6 };
  if (T.ring) { o.ring = true; o.hole = T.hole; }
  if (T.poly) { o.poly = true; o.ang = o.rot ? 90 : 0; }
  if (T.semi) o.semi = true;
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
  let removed = [];
  if (raw.length > o.n) {
    raw.sort(o.order === 'x' ? (p, q) => p.x - q.x || p.y - q.y : (p, q) => p.y - q.y || p.x - q.x);
    removed = raw.splice(o.n);
  }
  let bw = 0, bh = 0;
  for (const p of raw) { bw = Math.max(bw, p.x + p.w - R.x + k); bh = Math.max(bh, p.y + p.h - R.y + k); }
  bw = Math.min(bw, R.w); bh = Math.min(bh, R.h);
  // KHỐI THIẾU CHIẾC: chỗ của các chiếc bớt đi nằm TRONG khung khối thành ô trống dùng được
  // (vd. khối 3 × 3 chỉ lấy 8 chiếc -> trống 1 ô vừa 3 mặt bích). Chỉ nhận khi vẫn chặt suốt được.
  // có thể có nhiều ô trống (mỗi cột / hàng bị bớt một đoạn): gom các chiếc bị bớt theo cột, mỗi cột một ô;
  // thêm từng ô nếu vẫn chặt suốt được cùng các chiếc giữ lại và các ô đã nhận.
  const holes = [];
  if (removed.length) {
    const groupsBy = new Map();
    for (const p of removed) { const key = Math.round(o.order === 'x' ? p.x : p.y); if (!groupsBy.has(key)) groupsBy.set(key, []); groupsBy.get(key).push(p); }
    const accepted = [];
    for (const list of groupsBy.values()) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const p of list) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + p.w + k); y1 = Math.max(y1, p.y + p.h + k); }
      x1 = Math.min(x1, R.x + bw); y1 = Math.min(y1, R.y + bh);
      const h = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      if (!(h.w > EPS && h.h > EPS)) continue;
      const hit = q => q.x < h.x + h.w - EPS && q.x + q.w + k > h.x + EPS && q.y < h.y + h.h - EPS && q.y + q.h + k > h.y + EPS;
      if (raw.some(hit) || accepted.some(q => hit({ x: q.x, y: q.y, w: q.w - k, h: q.h - k }))) continue;
      const pseudo = [...raw, ...accepted, h].map(q => (q === h || accepted.includes(q) ? { x: q.x, y: q.y, w: q.w - k, h: q.h - k } : q));
      if (guillotineOK(pseudo, k)) { accepted.push(h); holes.push(h); }
    }
  }
  // xén các nhát nội bộ vào khung bao (giao của sơ đồ chặt suốt với một hình chữ nhật vẫn chặt suốt)
  const xMax = R.x + bw - k, yMax = R.y + bh - k, inner = [];
  for (const c of cuts || []) {
    const x1 = Math.min(c.x1, xMax), x2 = Math.min(c.x2, xMax), y1 = Math.min(c.y1, yMax), y2 = Math.min(c.y2, yMax);
    if (c.x1 === c.x2 ? c.x1 < xMax - EPS && y2 - y1 > EPS : c.y1 < yMax - EPS && x2 - x1 > EPS)
      inner.push({ x1, y1, x2, y2, seq: 0 });
  }
  return { items: raw.map(p => tag(T, p)), cuts: inner, bw, bh, holes };
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
    for (const h of b.holes || []) free.push(h);                     // các ô trống trong khối thiếu chiếc
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
/* 4b. XẾP THEO DẢI TỪNG LOẠI (giống thợ: vuông vài hàng trên, tròn so le    */
/* vài hàng dưới…). Thử mọi cách chia bề rộng tờ cho các loại (số hàng,     */
/* hướng xoay, so le / thẳng), chọn cách xếp được nhiều nhất trong chiều dài */
/* vùng đang xét. Chi tiết còn thiếu được chèn khe sau đó.                  */
/* ======================================================================= */
function bandPack(C, rem0, region) {
  const L = region.w, Hh = region.h, s3 = Math.sqrt(3) / 2, eps = 1e-9;
  const types = C.types.filter(T => rem0[T.t] > 0).sort((a, b) => b.cutArea - a.cutArea).slice(0, 4);
  const opts = types.map(T => {
    const list = [{ rows: 0, height: 0, cap: 0 }], need = rem0[T.t];
    if (T.circle) {
      if (C.shear) return list;
      const p = T.A;
      for (let r = 1; ; r++) {
        const h = p + (r - 1) * p * s3; if (h > Hh + eps) break;
        const m0 = Math.floor(L / p + eps), m1 = Math.floor((L - p / 2) / p + eps);
        list.push({ kind: 'hex', rows: r, height: h, cap: Math.ceil(r / 2) * m0 + Math.floor(r / 2) * Math.max(0, m1) });
      }
      for (let r = 1; r * p <= Hh + eps; r++) list.push({ kind: 'grid', rows: r, height: r * p, cap: r * Math.floor(L / p + eps), a: p, b: p });
    } else {
      const ors = T.rot ? [[T.A, T.B], [T.B, T.A]] : [[T.A, T.B]];
      for (const [a, b] of ors) for (let r = 1; r * b <= Hh + eps; r++) list.push({ kind: 'grid', rows: r, height: r * b, cap: r * Math.floor(L / a + eps), a, b });
    }
    // bỏ các lựa chọn bị lấn át: đã chứa đủ thì chỉ giữ dải thấp nhất
    const full = list.filter(o => o.cap >= need).sort((x, y) => x.height - y.height)[0];
    return list.filter(o => o.cap > 0 || o.rows === 0).filter(o => o.cap < need || o === full);
  });
  let best = null, bestScore = 0, combos = 0;
  const pick = [];
  const dfs = (k, used, score) => {
    if (++combos > 200000) return;
    if (k === types.length) { if (score > bestScore + 1e-6) { bestScore = score; best = pick.slice(); } return; }
    for (const o of opts[k]) {
      if (used + o.height > Hh + eps) continue;
      pick[k] = o;
      dfs(k + 1, used + o.height, score + Math.min(o.cap, rem0[types[k].t]) * types[k].cutArea);
    }
  };
  dfs(0, 0, 0);
  const items = [], counts = C.types.map(() => 0);
  if (!best) return { items, cuts: [], counts, blocks: 0, strategy: 'band' };
  let y0 = region.y, bands = 0;
  types.forEach((T, k) => {
    const o = best[k];
    if (!o.rows) return;
    const n = Math.min(o.cap, rem0[T.t]), slots = [];
    if (o.kind === 'hex') {
      const p = T.A;
      for (let r = 0; r < o.rows; r++) {
        const off = r % 2 ? p / 2 : 0, m = Math.floor((L - off) / p + eps);
        for (let c = 0; c < m; c++) slots.push({ x: region.x + off + c * p, y: y0 + r * p * s3, w: T.cw, h: T.cw });
      }
    } else {
      const cols = Math.floor(L / o.a + eps);
      for (let c = 0; c < cols; c++) for (let r = 0; r < o.rows; r++) slots.push({ x: region.x + c * o.a, y: y0 + r * o.b, w: o.a - C.k, h: o.b - C.k });
    }
    slots.sort((a, b) => a.x - b.x || a.y - b.y);                      // lấp theo cột từ trái sang -> dồn dư về phải
    slots.slice(0, n).forEach(p => items.push(tag(T, p)));
    counts[T.t] += n; y0 += o.height; bands++;
  });
  return { items, cuts: [], counts, blocks: bands, strategy: 'band' };
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
/**
 * TRƯỢT VỊ TRÍ (chèn khe – bổ sung 28/10/2026): chữ nhật q đặt tại (x, y) bị vướng thì đề xuất 2 vị trí mới –
 * trượt XUỐNG vừa qua mọi vật vướng, và trượt SANG PHẢI vừa qua mọi vật vướng. Với phôi tròn tính đúng điểm tiếp xúc
 * (không dùng khung bao). Nhờ đó tìm được ô kẹp giữa hai vật khác nhau – vd. khe dọc bên phải hàng tròn so le,
 * dưới vòng tròn hàng giữa: x lấy từ tròn hàng dưới, y lấy từ tròn hàng giữa.
 */
function slideSpots(C, idx, q) {
  const k = C.k, tol = 1e-6;
  const hits = idx.near(q.x - k, q.y - k, q.x + q.w + k, q.y + q.h + k);
  let down = -Infinity, right = -Infinity;
  for (const p of hits) {
    if (p.circle) {
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2, R = p.w / 2 + k;
      const dx = Math.max(0, q.x - cx, cx - (q.x + q.w)), dy = Math.max(0, q.y - cy, cy - (q.y + q.h));
      if (Math.hypot(dx, dy) >= R - tol) continue;
      if (dx < R) down = Math.max(down, cy + Math.sqrt(R * R - dx * dx));
      if (dy < R) right = Math.max(right, cx + Math.sqrt(R * R - dy * dy));
    } else {
      if (q.x + q.w + k <= p.x + tol || p.x + p.w + k <= q.x + tol || q.y + q.h + k <= p.y + tol || p.y + p.h + k <= q.y + tol) continue;
      down = Math.max(down, p.y + p.h + k); right = Math.max(right, p.x + p.w + k);
    }
  }
  const out = [];
  if (down > q.y + tol && down + q.h <= C.H - C.e + tol) out.push([q.x, down + 1e-6]);
  if (right > q.x + tol && right + q.w <= C.W - C.e + tol) out.push([right + 1e-6, q.y]);
  return out;
}
/**
 * XẾP NGAY NGẮN (28/10/2026): các chi tiết chèn khe cùng kích thước, cùng hướng, đứng liền nhau thành hàng (hoặc cột)
 * nhưng lệch nhau do trượt áp sát cung tròn -> kéo cả hàng về CÙNG MỘT cao độ (cột: cùng một hoành độ) – lấy vị trí
 * thấp nhất (phải nhất) của hàng để không phải đẩy chi tiết nào lên vướng cung tròn. Chỉ áp dụng khi mọi chiếc dời
 * đều hợp lệ (đủ mạch, trong mép); không được thì giữ nguyên.
 */
function alignAdded(C, items, added) {
  const k = C.k, tol = 0.5, isAdded = new Set(added);
  const rects = added.filter(p => !p.circle);
  const moveOK = (p, q) => {
    const idx = makeIndex(Math.max(100, ...items.map(o => Math.max(o.w, o.h))) + k);
    for (const o of items) if (o !== p) idx.add(o);
    return freeAt(C, idx, q);
  };
  for (const axis of ['row', 'col']) {
    const along = axis === 'row' ? 'x' : 'y', size = axis === 'row' ? 'w' : 'h', cross = axis === 'row' ? 'y' : 'x', csize = axis === 'row' ? 'h' : 'w';
    const groups = new Map();
    for (const p of rects) { const key = `${p.w.toFixed(3)}x${p.h.toFixed(3)}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(p); }
    for (const list of groups.values()) {
      list.sort((a, b) => a[along] - b[along]);
      const chains = [];
      for (const p of list) {
        const c = chains.find(ch => { const t = ch[ch.length - 1]; return Math.abs(p[along] - (t[along] + t[size] + k)) <= tol && p[cross] < t[cross] + t[csize] && t[cross] < p[cross] + p[csize]; });
        if (c) c.push(p); else chains.push([p]);
      }
      for (const ch of chains) {
        if (ch.length < 2) continue;
        const target = Math.max(...ch.map(p => p[cross]));
        if (ch.every(p => Math.abs(p[cross] - target) < 1e-6)) continue;
        const moved = ch.map(p => ({ ...p, [cross]: target }));
        // thử dời từng chiếc trên tờ đã dời các chiếc trước
        const saved = items.slice();
        let ok = true;
        ch.forEach((p, n) => {
          if (!ok) return;
          const i = items.indexOf(p);
          if (!moveOK(p, moved[n])) { ok = false; return; }
          items[i] = moved[n];
        });
        if (!ok) { items.splice(0, items.length, ...saved); continue; }
        moved.forEach((q, n) => { const i = added.indexOf(ch[n]); if (i >= 0) added[i] = q; isAdded.add(q); });
      }
    }
  }
  return items;
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
        if (!T.circle && budget > 0) for (const sp of slideSpots(C, idx, q)) heap.push(sp);   // vướng: trượt xuống / sang phải
      }
      if (!spot) continue;
      const it = tag(T, spot); items.push(it); idx.add(it); left[T.t]--; counts[T.t]++; added++;
      for (const p of T.circle ? circleSpots(C, [it], idx, T.cw / 2, false) : rectSpots(C, [it])) heap.push(p);
    }
  }
  if (!added) return cand;
  alignAdded(C, items, items.slice(cand.items.length));                // hàng chèn khe: thẳng hàng, ngay ngắn
  return { ...cand, items, counts, blocks: cand.blocks + 1, strategy: cand.strategy + '+fill' };
}

/* ======================================================================= */
/* 5c. DẢI PHÔI TRÒN NHIỀU CỠ (laser/plasma) – ĐẶT TỪNG CHIẾC SÁT TRÁI     */
/* Ca 29/10/2026 (10 × D556 + 10 × D409 trên 6000 × 2000): máy xếp hai khối */
/* lưới riêng (khối D556 trên, khối D409 dưới, dài 2797) trong khi thợ xếp */
/* XEN KẼ: phôi lớn so le, phôi nhỏ chèn vào khe và dọc mép → ngắn hơn,    */
/* tấm lẻ to hơn. Cách làm giống thợ: lần lượt đặt từng phôi vào vị trí    */
/* TIẾP XÚC (sát 2 phôi / phôi + mép / góc) có mép phải nhỏ nhất – tức dồn */
/* hết về bên trái. Thử nhiều thứ tự (lớn trước, nhỏ trước, xen kẽ, đảo    */
/* ngẫu nhiên có hạt giống cố định – chạy lại ra đúng kết quả cũ), giữ sơ  */
/* đồ đủ chiếc mà ngắn nhất. Chỉ dùng khi các chi tiết còn lại đều tròn.  */
/* ======================================================================= */
const CIRCLE_STRIP_MAX = 160;          // số phôi tối đa cho cách đặt từng chiếc (nhiều hơn: lưới khối đã đủ tốt)
/** Thứ tự đặt cơ bản: danh sách loại theo từng chiếc. */
function circleOrders(C, rem) {
  const live = C.types.filter(T => T.circle && !T.ring && rem[T.t] > 0);
  const seq = (list) => list.flatMap(T => Array(rem[T.t]).fill(T));
  const big = live.slice().sort((a, b) => b.cw - a.cw), small = big.slice().reverse();
  const inter = [];                                             // xen kẽ theo tỉ lệ số lượng (lớn trước trong mỗi nhịp)
  const left = rem.slice(), tot = sum(big.map(T => rem[T.t]));
  for (let n = 0; n < tot; n++) {
    let pick = null, val = -Infinity;
    for (const T of big) if (left[T.t] > 0) { const v = left[T.t] / rem[T.t]; if (v > val + 1e-9) { val = v; pick = T; } }
    inter.push(pick); left[pick.t]--;
  }
  return [seq(big), seq(small), inter];
}
/**
 * Đặt lần lượt các phôi tròn theo thứ tự order vào vùng (đã đặt C.W/C.H theo vùng – gọi trong withRegion).
 * lean: hệ số ưu tiên theo chiều đứng (0 = chỉ xét mép phải; > 0 = hơi ưu tiên vị trí thấp → xếp theo cột gọn).
 * Trả ứng viên sơ đồ, hoặc null nếu có phôi không đặt được.
 */
function circleStripRun(C, order, lean) {
  const idx = makeIndex(Math.max(100, ...C.types.map(T => Math.max(T.cw, T.ch))) + C.k);
  const items = [], counts = C.types.map(() => 0);
  // vị trí tiếp xúc theo từng cỡ: thêm dần quanh chiếc vừa đặt; vị trí đã vướng thì vướng mãi (chỉ có thêm vật cản) → bỏ
  const spots = new Map();
  for (const T of order) if (!spots.has(T.cw)) spots.set(T.cw, circleSpots(C, [], idx, T.cw / 2, true));
  for (const T of order) {
    const r = T.cw / 2, list = spots.get(T.cw);
    let best = null, bv = Infinity, w = 0;
    for (let n = 0; n < list.length; n++) {
      const [x, y] = list[n];
      const q = { x: x - r, y: y - r, w: T.cw, h: T.cw, circle: true };
      if (!freeAt(C, idx, q)) continue;
      list[w++] = list[n];
      const v = x + r + lean * y;
      if (v < bv - 1e-9) { best = q; bv = v; }
    }
    list.length = w;
    if (!best) return null;
    const it = tag(T, best); items.push(it); idx.add(it); counts[T.t]++;
    for (const [d, l] of spots) for (const sp of circleSpots(C, [it], idx, d / 2, false)) l.push(sp);
  }
  return { items, counts, cuts: [], blocks: 1, strategy: 'circle-strip' };
}
const stripLen = c => c.items.reduce((m, p) => Math.max(m, p.x + p.w), 0);
/**
 * Sơ đồ dải ngắn nhất cho toàn bộ rem (chỉ phôi tròn) trong vùng region, tìm trong hạn ms.
 * Trả ứng viên có đủ chiếc, hoặc null.
 */
function circleStrip(C, rem, region, ms) {
  const total = sum(rem);
  if (C.shear || !total || total > CIRCLE_STRIP_MAX) return null;
  if (C.types.some(T => rem[T.t] > 0 && (!T.circle || T.ring))) return null;
  if (C.types.filter(T => rem[T.t] > 0).length < 2) return null;     // một cỡ: lưới thẳng / so le của bản Free đã tối ưu
  // ghi nhớ: đặt sát trái KHÔNG phụ thuộc chiều dài vùng (vị trí sát mép phải không bao giờ được chọn trước vị trí bên trái)
  // → với vùng bắt đầu từ góc tờ, chỉ cần tính một lần trên cả chiều dài tờ rồi so mép phải với chiều dài vùng.
  // Các bước dồn tờ cuối (chia đôi chiều dài) / phối tờ gọi lại rất nhiều lần cùng số lượng.
  const memo = C._circleStrip ??= new Map();
  const corner = Math.abs(region.x - C.e) < 1e-9 && Math.abs(region.y - C.e) < 1e-9;
  if (corner && region.w < C.WW - 1e-9) {
    const whole = circleStrip(C, rem, { ...region, w: C.WW }, ms);
    return whole && stripLen(whole) <= region.x + region.w - C.k + 1e-6 ? whole : null;
  }
  const key = `${rem.join(',')}|${r6(region.x)},${r6(region.y)},${r6(region.w)},${r6(region.h)}|${ms}`;
  if (memo.has(key)) return memo.get(key);
  const out = withRegion(C, region, () => {
    const end = Date.now() + ms;
    let best = null;
    const tryOrder = (order, lean) => {
      const c = circleStripRun(C, order, lean);
      if (c && (!best || stripLen(c) < stripLen(best) - 1e-6)) best = c;
      return c;
    };
    const base = circleOrders(C, rem);
    for (const lean of [0, 0.02, 0.15]) for (const o of base) tryOrder(o, lean);
    // cải tiến cục bộ: đổi chỗ hai chiếc khác cỡ trong thứ tự (hạt giống cố định → chạy lại ra đúng kết quả)
    let seed = 20261029;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    let cur = base[0].slice(), curLen = Infinity, lean = 0;
    { const c = circleStripRun(C, cur, lean); if (c) curLen = stripLen(c); }
    for (let it = 0, last = 0; Date.now() < end && it < 4000 && it - last < 1500; it++) {   // 1500 lượt không tiến → dừng sớm
      const o = cur.slice();
      const a = Math.floor(rnd() * o.length), b = Math.floor(rnd() * o.length);
      if (o[a] === o[b]) continue;
      [o[a], o[b]] = [o[b], o[a]];
      const c = tryOrder(o, lean);
      if (c && stripLen(c) <= curLen + 1e-6) { if (stripLen(c) < curLen - 1e-6) last = it; cur = o; curLen = stripLen(c); }
    }
    return best;
  });
  memo.set(key, out);
  return out;
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
  if (!quota && !(C.shear && C.types.some(T => T.circle && rem[T.t] > 0))) cands.push(bandPack(C, rem, region));
  // dồn tờ cuối (needAll): thêm sơ đồ chặt suốt tối ưu nhiều loại rồi bớt chiếc thừa – để chi tiết nhỏ chui vào ô trống
  // (vd. 3 mặt bích lấp ô trống của khối FS) thay vì nằm ngoài làm hẹp tấm lẻ
  if (needAll && !quota) {
    const live = C.types.filter(T => rem[T.t] > 0);
    if (live.length && live.length <= 3 && !live.some(T => T.circle)) {
      const sets = [live.map(() => 1), ...live.map(T => live.map(U => (U === T ? 1.4 : 1)))];
      for (const ws of sets) {
        const weights = C.types.map(() => 0);
        live.forEach((T, n) => { weights[T.t] = T.cutArea * ws[n]; });
        const dp = guillotineKnap(C, weights, region);
        if (!dp || dp.counts.some((c, t) => c < rem[t])) continue;
        const keep = rem.slice();
        const items = dp.items.slice().sort((a, b) => a.x - b.x || a.y - b.y).filter(p => keep[p.t]-- > 0);   // bớt chiếc thừa ở phía phải
        cands.push({ ...dp, items, counts: rem.slice(), cuts: [] });
      }
    }
  }
  if (!C.shear && !tidy && !quota && total <= (needAll ? 150 : DEFAULTS.maxRectsPieces)) for (const o of FREE_OPTS) cands.push(maxRectsPack(C, rem, region, o));
  // phôi tròn nhiều cỡ: đặt từng chiếc sát trái (xen kẽ lớn/nhỏ như thợ) – chỉ thứ tự cơ bản, không tìm sâu
  if (!quota) { const cs = circleStrip(C, rem, region, 0); if (cs) cands.push(cs); }   // (có ghi nhớ – gọi lặp không tốn thêm)
  const rank = (a, b) => sheetScore(C, b, mode) - sheetScore(C, a, mode) || a.blocks - b.blocks;
  let pool = cands.filter(c => !must || c.counts.every((v, t) => v >= must[t])).sort(rank);
  // CHỪA KHE ĐỂ CHÈN (28/10/2026 – ca tròn D365 ×25 + thanh 510×68 trên 3000×1500): tờ còn thiếu vài chiếc thì thử xếp khối
  // với loại chữ nhật đông nhất BỚT 1–6 chiếc – khối chữ nhật gọn lại, phôi tròn sắp đều, chừa đúng các khe sát cung tròn –
  // rồi chèn khe phần còn thiếu. Thợ làm y như vậy: xếp khối chính trước, nhét thanh vào khe sau.
  if (!C.shear && !quota && pool.length && sum(pool[0].counts) < total && total - sum(pool[0].counts) <= 12) {
    const rt = C.types.filter(T => !T.circle && rem[T.t] > 1).sort((a, b) => rem[b.t] - rem[a.t])[0];
    if (rt) {
      const extra = [];
      for (let d = 1; d <= Math.min(6, rem[rt.t] - 1); d++) {
        const r2 = rem.slice(); r2[rt.t] -= d;
        for (const o of BLOCK_OPTS_FAST) { const c = blockPack(C, r2, region, o, null); if (c && sum(c.counts)) extra.push(c); }
      }
      const seenX = new Set();
      const top = extra.sort(rank).filter(c => { const k = c.counts.join(','); if (seenX.has(k)) return false; seenX.add(k); return true; }).slice(0, 4)
        .map(c => withRegion(C, region, () => gapFill(C, c, rem, 2e5)));
      const bestN = sum(pool[0].counts);
      for (const c of top) if (sum(c.counts) > bestN) pool.push(c);
      pool.sort(rank);
    }
  }
  // chèn khe chỉ áp dụng cho laser/plasma, khi tờ còn chi tiết chưa xếp; vùng phải là tờ đủ chiều
  // (dồn tờ cuối: bỏ qua nếu diện tích còn trống chắc chắn không đủ cho số chi tiết còn thiếu)
  const roomOK = c => !needAll || C.types.reduce((s2, T) => s2 + (rem[T.t] - c.counts[T.t]) * T.lbArea, 0)
    <= region.w * region.h - C.types.reduce((s2, T) => s2 + c.counts[T.t] * T.lbArea, 0) + 1e-6;
  // dồn tờ cuối: còn thiếu quá nhiều chiếc thì vùng đang thử chắc chắn chật -> không tốn công chèn khe
  if (!C.shear && pool.length && sum(pool[0].counts) < total && roomOK(pool[0]) && (!needAll || total - sum(pool[0].counts) <= 30)) {
    const top = pool.slice(0, needAll || total > 150 ? 1 : 2)   // đơn nhiều chiếc: chỉ chèn khe cho ứng viên tốt nhất (nhanh)
      .map(c => withRegion(C, region, () => gapFill(C, c, rem, needAll ? 1.5e5 : 6e5)));
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
  const remL = r6(C.W - usedL), remH = r6(C.H - usedH);
  // 1) THU HỒI hay HAO PHÍ: mỗi dải dư có cạnh ngắn ≥ ngưỡng (mặc định 200, tùy chỉnh) là thu hồi – không phân biệt dọc hay ngang.
  //    Dư cả phải lẫn dưới (dạng chữ L) thì cắt thành 2 dải, dải nào đủ ngưỡng đều thu hồi (chi tiết hẹp 190 vẫn dùng được).
  //    Hai cách cắt: (A) tách dải phải suốt chiều rộng trước, rồi dải dưới phần còn lại; (B) tách dải dưới suốt chiều dài trước.
  //    Tấm lẻ còn phải ĐỦ DÀI mới tận dụng được: cạnh dài ≥ remnantMinLong (mặc định 500, tùy chỉnh) – vd. mẩu 250 × 300 ở góc chữ L bỏ.
  const longNeed = C.remnantMinLong ?? DEFAULTS.remnantMinLong;
  const keep = r => r.w > EPS && r.h > EPS && Math.min(r.w, r.h) >= remnantMin - EPS && Math.max(r.w, r.h) >= longNeed - EPS;
  const A = [{ side: 'right', at: usedL, x: usedL, y: 0, w: remL, h: C.H, cut: { x1: usedL, y1: 0, x2: usedL, y2: C.H } },
             { side: 'bottom', at: usedH, x: 0, y: usedH, w: usedL, h: remH, cut: { x1: 0, y1: usedH, x2: usedL, y2: usedH } }].filter(keep);
  const B = [{ side: 'bottom', at: usedH, x: 0, y: usedH, w: C.W, h: remH, cut: { x1: 0, y1: usedH, x2: C.W, y2: usedH } },
             { side: 'right', at: usedL, x: usedL, y: 0, w: remL, h: usedH, cut: { x1: usedL, y1: 0, x2: usedL, y2: usedH } }].filter(keep);
  // nếu chỉ còn một dải thì dải đó chạy suốt cạnh tờ
  if (A.length === 1 && A[0].side === 'bottom') Object.assign(A[0], { w: C.W, cut: { x1: 0, y1: usedH, x2: C.W, y2: usedH } });
  if (B.length === 1 && B[0].side === 'right') Object.assign(B[0], { h: C.H, cut: { x1: usedL, y1: 0, x2: usedL, y2: C.H } });
  // 2) ƯU TIÊN dạng tấm lẻ đẹp khi chọn phương án (chỉ để chọn, không đổi ngưỡng thu hồi):
  //    laser / plasma: ưu tiên dải giữ khổ rộng tờ (L × 2000), tránh dải dọc kiểu 6000 × 500;
  //    chặt sấn: dải dài 2440 × h đẹp khi h ≥ 300 (tùy chỉnh); hẹp hơn thì ưu tiên dải ngang kiểu 1220 × 400.
  //    Cùng diện tích thì MỘT tấm liền tốt hơn hai tấm rời.
  const longMin = C.longStripMin ?? DEFAULTS.longStripMin;
  const factor = o => C.shear ? (o.side === 'bottom' && o.h < longMin - EPS ? 0.5 : 1) : (o.side === 'right' ? 1 : 0.5);
  const score = list => list.reduce((s2, o) => s2 + o.w * o.h * factor(o), 0) * (list.length > 1 ? 0.999 : 1);
  const pick = score(B) > score(A) + 1e-6 ? B : A;
  const remnants = pick.map(o => ({ ...o }));
  const total = remnants.reduce((s2, o) => s2 + o.w * o.h, 0);
  const remnant = remnants.length ? { ...remnants[0], score: score(pick), area: total } : null;
  const free = [];
  if (C.W - maxR > EPS) free.push({ side: 'right', w: r6(C.W - maxR), h: C.H });
  if (C.H - maxB > EPS && maxR > EPS) free.push({ side: 'bottom', w: r6(maxR), h: r6(C.H - maxB) });
  return { remnant, remnants, freeStrips: free };
}

/** Dồn tờ cuối: tìm vùng ngắn nhất (theo dài hoặc theo rộng) vẫn xếp đủ chi tiết của tờ đó. */
function compactLast(C, groups, remnantMin, mode) {
  const g = groups[groups.length - 1], need = g.sheet.counts.slice();
  let best = { sheet: g.sheet, rem: remnantOf(C, g.sheet.items, remnantMin).remnant };   // so theo điểm ưu tiên (score)
  const area = best.rem ? best.rem.score : 0;
  let bestArea = area;
  const needArea = C.types.reduce((s, T) => s + need[T.t] * T.lbArea, 0);
  for (const axis of C.shear ? ['w', 'h'] : ['w']) {             // laser: chỉ dồn theo chiều dài (tấm lẻ giữ nguyên khổ rộng)
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
    const remA = r => { const x = r && remnantOf(C, r.items, remnantMin).remnant; return x ? x.score : 0; };
    // sơ đồ gọn thắng nếu tấm lẻ chỉ kém trong ngưỡng chấp nhận
    let found = any;
    if (neat && (!any || remA(neat) >= remA(any) - DEFAULTS.tidyTolerance * other - 1e-6)) found = neat;
    if (!found) continue;
    const r = remnantOf(C, found.items, remnantMin).remnant;
    const a = r ? r.score : 0;
    const tidyNow = !/^free/.test(best.sheet.strategy), tidyNew = !/^free/.test(found.strategy);
    if (a > bestArea + 1e-6 && (tidyNew || !tidyNow || a > bestArea + DEFAULTS.tidyTolerance * other)) { best = { sheet: found, rem: r }; bestArea = a; }
    else if (tidyNew && !tidyNow && a >= bestArea - DEFAULTS.tidyTolerance * other - 1e-6) { best = { sheet: found, rem: r }; bestArea = a; }
  }
  // phôi tròn nhiều cỡ: tìm sâu sơ đồ dải ngắn nhất cho tờ cuối (đặt từng chiếc xen kẽ, đổi thứ tự)
  {
    const cs = circleStrip(C, need, C.full, DEFAULTS.circleStripMs);
    const r = cs && remnantOf(C, cs.items, remnantMin).remnant, a = r ? r.score : 0;
    if (cs && a > bestArea + 1e-6) { best = { sheet: cs, rem: r }; bestArea = a; }
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
    if (C.types[a.t].poly || C.types[b.t].poly) {
      if (a.x > b.x + b.w + k || b.x > a.x + a.w + k || a.y > b.y + b.h + k || b.y > a.y + a.h + k) return false;
      const c = a.circle ? a : b.circle ? b : null;
      if (c) {                                          // tròn – đa giác: khoảng cách đúng từ tâm tới đường bao trừ bán kính
        const P = shapeOf(C, c === a ? b : a), o = [c.x + c.w / 2, c.y + c.h / 2];
        if (ptIn(P, o)) return true;
        let d = Infinity; for (let n = 0; n < P.length; n++) d = Math.min(d, segDist(o, o, P[n], P[(n + 1) % P.length]));
        return d - c.w / 2 < k - tol;
      }
      return polyDist(shapeOf(C, a), shapeOf(C, b), k) < k - tol;
    }
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

/**
 * Sơ đồ chặt suốt TỐI ƯU cho NHIỀU loại trên một tờ (quy hoạch động không giới hạn số lượng):
 * mỗi ô X × Y lấy giá trị lớn nhất giữa "đặt 1 chi tiết" và mọi nhát cắt dọc / ngang tại các điểm chuẩn
 * (tổ hợp kích thước các chi tiết). weights[t] = giá trị 1 chiếc loại t (diện tích × hệ số ưu tiên).
 * Cho ra các sơ đồ tờ "kiểu kỹ sư" như 7 FS + 15 mặt bích (98,8 %) để bước phối hợp tờ chọn.
 */
function guillotineKnap(C, weights, region) {
  const k = C.k, WW = region.w, HH = region.h;
  const kinds = [];
  for (const T of C.types) {
    if (!(weights[T.t] > 0) || T.circle) continue;
    kinds.push({ T, a: T.A, b: T.B });
    if (T.rot) kinds.push({ T, a: T.B, b: T.A });
  }
  if (!kinds.length) return null;
  const pts = (L, dims) => {
    const set = new Set([0]); let frontier = [0];
    while (frontier.length && set.size < 2500) {
      const next = [];
      for (const v of frontier) for (const d of dims) { const u = r6(v + d); if (u <= L + EPS && !set.has(u)) { set.add(u); next.push(u); } }
      frontier = next;
    }
    set.delete(0);
    return Float64Array.from([...set].sort((a, b) => a - b));
  };
  const X = pts(WW, [...new Set(kinds.map(q => q.a))]), Y = pts(HH, [...new Set(kinds.map(q => q.b))]);
  const nx = X.length, ny = Y.length;
  if (!nx || !ny || nx * nx * ny + ny * ny * nx > 4e7) return null;   // giới hạn khối lượng tính cho nhanh
  const N = nx * ny, V = new Float64Array(N), CH = new Int32Array(N), PS = new Int32Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const w = X[i], h = Y[j], id = i * ny + j;
    let best = 0, ch = -1, pos = -1;
    kinds.forEach((q, qi) => { if (q.a <= w + EPS && q.b <= h + EPS && weights[q.T.t] > best) { best = weights[q.T.t]; ch = qi; } });
    for (let p = 0; p < nx && X[p] <= w / 2 + EPS; p++) {
      const r = floorIdx(X, w - X[p]); if (r < 0) continue;
      const v = V[p * ny + j] + V[r * ny + j];
      if (v > best + 1e-9) { best = v; ch = -2; pos = p; }
    }
    for (let p = 0; p < ny && Y[p] <= h / 2 + EPS; p++) {
      const r = floorIdx(Y, h - Y[p]); if (r < 0) continue;
      const v = V[i * ny + p] + V[i * ny + r];
      if (v > best + 1e-9) { best = v; ch = -3; pos = p; }
    }
    V[id] = best; CH[id] = ch; PS[id] = pos;
  }
  const items = [], cuts = [], counts = C.types.map(() => 0);
  let seq = 0;
  const place = (i, j, x0, y0, depth = 0) => {
    if (i < 0 || j < 0) return;
    const id = i * ny + j, ch = CH[id], w = X[i], h = Y[j];
    if (ch >= 0) {
      const q = kinds[ch];
      items.push(tag(q.T, { x: x0, y: y0, w: q.a - k, h: q.b - k })); counts[q.T.t]++;
      if (C.shear) {
        if (q.a < w - EPS) cuts.push({ x1: x0 + q.a - k / 2, y1: y0, x2: x0 + q.a - k / 2, y2: y0 + h - k, seq: depth < 2 ? ++seq : 0 });
        if (q.b < h - EPS) cuts.push({ x1: x0, y1: y0 + q.b - k / 2, x2: x0 + q.a - k, y2: y0 + q.b - k / 2, seq: depth < 2 ? ++seq : 0 });
      }
    } else if (ch === -2) {
      const xs = X[PS[id]];
      if (C.shear) cuts.push({ x1: x0 + xs - k / 2, y1: y0, x2: x0 + xs - k / 2, y2: y0 + h - k, seq: depth < 2 ? ++seq : 0 });
      place(PS[id], j, x0, y0, depth + 1); place(floorIdx(X, w - xs), j, x0 + xs, y0, depth + 1);
    } else if (ch === -3) {
      const ys = Y[PS[id]];
      if (C.shear) cuts.push({ x1: x0, y1: y0 + ys - k / 2, x2: x0 + w - k, y2: y0 + ys - k / 2, seq: depth < 2 ? ++seq : 0 });
      place(i, PS[id], x0, y0, depth + 1); place(i, floorIdx(Y, h - ys), x0, y0 + ys, depth + 1);
    }
  };
  place(nx - 1, ny - 1, region.x, region.y);
  return { items, cuts, counts, blocks: items.length ? Math.max(1, Math.round(items.length / 6)) : 0, strategy: 'guillotine-dp' };
}

/* ======================================================================= */
/* 10b. PHỐI HỢP ÍT TỜ NHẤT                                                 */
/* Xếp tham từng tờ (lấp đầy tờ đầu) có khi tốn thêm 1 tờ. Khi số tờ còn    */
/* hơn cận dưới, máy làm như kỹ sư: dựng sẵn nhiều sơ đồ tờ khác nhau (mỗi  */
/* sơ đồ một cách phối các loại), rồi tìm k sơ đồ cộng lại đủ số lượng từng  */
/* loại. Bớt chi tiết khỏi một sơ đồ chặt suốt vẫn chặt suốt được.          */
/* ======================================================================= */
/**
 * SƠ ĐỒ THEO DẢI CÓ GIỚI HẠN SỐ LƯỢNG (kiểu thợ xếp tay, học từ barem inox 304 – 28/10/2026):
 * tờ = các dải chạy suốt chiều dài (hoặc chiều rộng) tờ, mỗi dải một chiều cao, trong dải xếp nối tiếp các chi tiết
 * thấp hơn dải (được xoay). Khác quy hoạch động không giới hạn ở chỗ: số chiếc mỗi loại ≤ cap – nhờ đó sinh được
 * sơ đồ PHỐI ĐỀU các loại theo tỷ lệ đơn hàng (vd. 9 GS + 5 FS A + 3 FS B / tờ × 7 tờ), không chỉ sơ đồ lấp kín nhất.
 * Luôn chặt suốt được (nhát suốt tách dải, rồi nhát suốt trong dải).
 */
function stripPatterns(C, cap, deadline, transpose = false) {
  const types = C.types.filter(T => !T.circle && cap[T.t] > 0);
  if (!types.length || types.length > 6) return [];
  const LEN = transpose ? C.HH : C.WW, WID = transpose ? C.WW : C.HH;
  // hướng đặt của mỗi loại: [chiều dọc dải (chiếm chiều dài), chiều ngang dải (chiếm chiều cao)] – đã cộng mạch k
  const ori = T => (T.rot ? [[T.A, T.B], [T.B, T.A]] : [transpose ? [T.B, T.A] : [T.A, T.B]]);
  const heights = [...new Set(types.flatMap(T => ori(T).map(o => o[1])))].filter(h => h <= WID + EPS).sort((a, b) => a - b);
  const area = v => types.reduce((s, T, n) => s + v[n] * T.cutArea, 0);
  // 1) các cách lấp MỘT dải chiều cao h (vector số chiếc, không bị lấn át)
  const strips = [];
  for (const h of heights) {
    const len = types.map(T => Math.min(...ori(T).filter(o => o[1] <= h + EPS).map(o => o[0]), Infinity));
    const lim = types.map((T, n) => (len[n] === Infinity ? 0 : Math.min(cap[T.t], Math.floor(LEN / len[n] + 1e-9))));
    const found = [], v = types.map(() => 0);
    const rec = (n, used) => {
      if (found.length > 4000) return;
      if (n === types.length) { if (v.some(x => x)) found.push({ h, v: v.slice(), len: used }); return; }
      for (let c = lim[n]; c >= 0; c--) {
        const add = c ? c * len[n] : 0;                                   // loại không vừa dải: len = ∞, chỉ c = 0
        if (used + add > LEN + EPS) continue;
        v[n] = c; rec(n + 1, used + add);
      }
      v[n] = 0;
    };
    rec(0, 0);
    // giữ vector không bị lấn át, và chỉ dải mà chi tiết cao nhất đúng bằng h (tránh trùng)
    const ok = found.filter(f => types.some((T, n) => f.v[n] && Math.abs(Math.min(...ori(T).filter(o => o[1] <= h + EPS && o[0] === len[n]).map(o => o[1])) - h) < EPS));
    const nd = ok.filter(f => !ok.some(g => g !== f && g.v.every((x, n) => x >= f.v[n]) && g.v.some((x, n) => x > f.v[n])));
    nd.forEach(f => { f.a = area(f.v); f.len = len; });
    nd.sort((a, b) => b.a - a.a);
    strips.push(...nd.slice(0, 60));
  }
  if (!strips.length) return [];
  // 2) chọn các dải xếp chồng (tổng chiều cao ≤ WID, tổng số chiếc ≤ cap), giữ nhiều phương án tờ tốt nhất
  strips.sort((a, b) => b.a / b.h - a.a / a.h);
  const bestDens = strips[0].a / strips[0].h, TOP = 25, outs = [];
  let nodes = 0;
  const pick = [], tot = types.map(() => 0);
  const dfs = (start, usedH, got) => {
    if (++nodes > 150000 || Date.now() > deadline) return;
    if (outs.length >= TOP && got + (WID - usedH) * bestDens <= outs[outs.length - 1].got + 1e-6) return;
    if (pick.length) {
      outs.push({ got, pick: pick.slice() }); outs.sort((a, b) => b.got - a.got); if (outs.length > TOP) outs.pop();
    }
    for (let i = start; i < strips.length; i++) {
      const s2 = strips[i];
      if (usedH + s2.h > WID + EPS || s2.v.some((x, n) => tot[n] + x > cap[types[n].t])) continue;
      pick.push(s2); s2.v.forEach((x, n) => { tot[n] += x; });
      dfs(i, usedH + s2.h, got + s2.a);
      pick.pop(); s2.v.forEach((x, n) => { tot[n] -= x; });
    }
  };
  dfs(0, 0, 0);
  // 3) dựng toạ độ: dải từ trên xuống (theo chiều cao giảm dần cho gọn), trong dải từ trái sang phải
  return outs.map(o => {
    const items = [], counts = C.types.map(() => 0);
    let off = 0;
    for (const s2 of o.pick.slice().sort((a, b) => b.h - a.h)) {
      let at = 0;
      types.forEach((T, n) => {
        const o2 = ori(T).filter(q => q[1] <= s2.h + EPS && q[0] === s2.len[n]).sort((a, b) => b[1] - a[1])[0];
        for (let c = 0; c < s2.v[n]; c++) {
          const [pl, ph] = o2, x = transpose ? off : at, y = transpose ? at : off;
          const w = (transpose ? ph : pl) - C.k, h = (transpose ? pl : ph) - C.k;
          items.push(tag(T, { x: C.e + x, y: C.e + y, w, h })); counts[T.t]++;
          at += pl;
        }
      });
      off += s2.h;
    }
    return { items, cuts: [], counts, blocks: o.pick.length, strategy: 'block' };
  });
}
/** Dựng sẵn nhiều sơ đồ tờ khác nhau (mỗi sơ đồ một cách phối các loại) – dùng chung cho
 *  "phối hợp ít tờ nhất" và "dồn dư về tờ cuối". Trả danh sách sơ đồ không bị lấn át, đầy trước. */
function sheetPatterns(C, demand, k, deadline) {
  const types = C.types.filter(T => demand[T.t] > 0);
  if (!types.length || types.length > 8) return null;
  const pats = new Map();
  const add = cand => {
    if (!cand || !sum(cand.counts)) return;
    const key = cand.counts.join(',');
    const ex = pats.get(key);
    if (!ex || cand.blocks < ex.blocks) pats.set(key, cand);
  };
  // các nhu cầu con để sinh sơ đồ: đủ, chia đều k tờ (nhiều mức), bỏ một loại, chỉ hai loại, một loại đầy đủ + loại khác chia đều
  const subs = [demand.slice()];
  for (const f of [1, 1.25, 1.5, 2]) subs.push(demand.map(v => Math.min(v, Math.ceil(v * f / k))));
  for (const T of types) {
    subs.push(demand.map((v, t) => (t === T.t ? 0 : v)));
    subs.push(demand.map((v, t) => (t === T.t ? v : Math.ceil(v / k))));
    subs.push(demand.map((v, t) => (t === T.t ? v : 0)));
    for (const U of types) if (U.t > T.t && types.length <= 6) subs.push(demand.map((v, t) => (t === T.t || t === U.t ? v : 0)));
  }
  // sơ đồ tối ưu chặt suốt nhiều loại – thử nhiều bộ trọng số để có các cách phối khác nhau
  if (types.length <= 4 && !types.some(T => T.circle)) {
    const wsets = [types.map(() => 1)];
    for (const T of types) for (const f of [1.5, 3, 0]) wsets.push(types.map(U => (U === T ? f : 1)));
    for (const ws of wsets) {
      if (Date.now() > deadline) break;
      const weights = C.types.map(() => 0);
      types.forEach((T, n) => { weights[T.t] = T.cutArea * ws[n]; });
      add(guillotineKnap(C, weights, C.full));
    }
  }
  for (const sub of subs) {
    if (Date.now() > deadline) break;
    for (const cand of packSheet(C, sub, C.full, { all: true }).slice(0, 12)) add(cand);
  }
  // sơ đồ theo dải, giới hạn số chiếc theo tỷ lệ đơn hàng chia cho m tờ (m quanh k): kiểu thợ phối đều các loại
  if (!types.some(T => T.circle)) {
    const caps = [demand.slice()];
    for (const m of [k - 1, k, k + 1, k - 2]) if (m >= 1) for (const f of [1, 1.15]) caps.push(demand.map(v => Math.min(v, Math.ceil(v * f / m))));
    const seenCap = new Set();
    for (const cap of caps) {
      const key = cap.join(','); if (seenCap.has(key)) continue; seenCap.add(key);
      if (Date.now() > deadline) break;
      for (const tr of [false, true]) for (const cand of stripPatterns(C, cap, Math.min(deadline, Date.now() + 400), tr)) add(cand);
    }
  }
  // bỏ sơ đồ bị lấn át (mọi loại đều ≤ một sơ đồ khác)
  let list = [...pats.values()];
  list = list.filter(p => !list.some(q => q !== p && q.counts.every((c, t) => c >= p.counts[t]) && q.counts.some((c, t) => c > p.counts[t])));
  list.sort((a, b) => sheetScore(C, b, 'area') - sheetScore(C, a, 'area'));
  return list;
}
function coverPlan(C, demand, k, deadline) {
  const list = sheetPatterns(C, demand, k, deadline);
  if (!list || !list.length) return null;
  const maxC = C.types.map(T => Math.max(0, ...list.map(p => p.counts[T.t])));
  const maxArea = Math.max(...list.map(p => sheetScore(C, p, 'area')));
  // tìm k sơ đồ phủ đủ nhu cầu; giữ lời giải dư nhiều nhất (tờ cuối trống nhiều -> tấm lẻ lớn)
  let best = null, nodes = 0;
  const pick = [];
  const dfs = (start, need) => {
    if (++nodes > 300000 || Date.now() > deadline) return;
    if (need.every(v => v <= 0)) {
      const slack = -C.types.reduce((s2, T) => s2 + need[T.t] * T.cutArea, 0);
      if (!best || slack > best.slack) best = { slack, pick: pick.slice() };
      return;
    }
    const left = k - pick.length;
    if (!left) return;
    if (need.some((v, t) => v > left * maxC[t])) return;
    if (C.types.reduce((s2, T) => s2 + Math.max(0, need[T.t]) * T.cutArea, 0) > left * maxArea + 1e-6) return;
    for (let i = start; i < list.length; i++) {
      const p = list[i];
      if (!p.counts.some((c, t) => c > 0 && need[t] > 0)) continue;
      pick.push(i);
      dfs(i, need.map((v, t) => v - p.counts[t]));
      pick.pop();
      if (best && nodes > 50000) return;
    }
  };
  dfs(0, demand.slice());
  if (!best) return null;
  // chia đúng số lượng: tờ đầy nhất nhận trước, tờ cuối nhận phần còn lại; xếp lại từng tờ cho gọn
  const chosen = best.pick.map(i => list[i]).sort((a, b) => sheetScore(C, b, 'area') - sheetScore(C, a, 'area'));
  const need = demand.slice(), sheets = [];
  for (const p of chosen) {
    const cnt = p.counts.map((c, t) => Math.min(c, need[t]));
    cnt.forEach((c, t) => { need[t] -= c; });
    if (!sum(cnt)) continue;
    let sheet = cnt.every((c, t) => c === p.counts[t]) ? p : packSheet(C, cnt, C.full, { needAll: true });
    if (!sheet) {                                            // không xếp lại được thì bớt chi tiết khỏi sơ đồ gốc (vẫn hợp lệ)
      const keep = cnt.slice(), items = [...p.items].sort((a, b) => a.x - b.x || a.y - b.y).filter(it => keep[it.t]-- > 0);
      sheet = { ...p, items, counts: cnt, cuts: C.shear ? [] : p.cuts };
      if (C.shear) sheet.cuts = [];
    }
    sheets.push(sheet);
  }
  if (need.some(v => v > 0)) return null;
  const groups = [];
  for (const sh of sheets) { const g = groups[groups.length - 1]; if (g && sameSheet(g.sheet, sh)) g.n++; else groups.push({ n: 1, sheet: sh }); }
  return groups;
}

/* ======================================================================= */
/* 10c. DỒN DƯ VỀ TỜ CUỐI (đã chốt 28/10/2026)                              */
/* Cùng số tờ, MỘT tấm lẻ tốt hơn hai tấm lẻ: k − 1 tờ đầu xếp ĐẦY theo các  */
/* sơ đồ tốt nhất, tờ cuối nhận phần còn lại -> phần dư gom về một tấm lẻ   */
/* lớn ở tờ cuối (đúng cách thợ xếp tay: tờ 2 nhồi 15 chiếc, tờ 3 dư 680).   */
/* ======================================================================= */
/** Bớt chi tiết khỏi sơ đồ cho không vượt nhu cầu (bớt chi tiết khỏi sơ đồ chặt suốt vẫn chặt suốt). */
function trimPattern(C, p, cap) {
  if (p.counts.every((c, t) => c <= cap[t])) return p;
  const keep = cap.slice();
  const items = [...p.items].sort((a, b) => a.x - b.x || a.y - b.y).filter(it => keep[it.t]-- > 0);
  const counts = p.counts.map((c, t) => Math.min(c, cap[t]));
  return { ...p, items, counts, cuts: C.shear ? [] : p.cuts };
}
function tailPlan(C, demand, k, deadline) {
  if (k < 2) return null;
  const pats = sheetPatterns(C, demand, k, deadline);
  if (!pats || !pats.length) return null;
  const area = p => C.types.reduce((s, T) => s + p.counts[T.t] * T.cutArea, 0);
  const seen = new Set(), list = [];
  for (const p0 of pats) {
    const p = trimPattern(C, p0, demand), key = p.counts.join(',');
    if (!sum(p.counts) || seen.has(key)) continue;
    seen.add(key); list.push({ p, a: area(p) });
  }
  list.sort((x, y) => y.a - x.a);
  list.length = Math.min(list.length, 40);
  const maxA = list.length ? list[0].a : 0, TOP = 12, sols = [];
  let nodes = 0;
  const pick = [];
  // chọn k − 1 sơ đồ (được lặp), tổng ≤ nhu cầu, diện tích lớn nhất – giữ TOP lời giải để thử xếp tờ cuối
  const dfs = (start, need, got) => {
    if (++nodes > 200000 || Date.now() > deadline) return;
    const left = k - 1 - pick.length;
    if (sols.length >= TOP && got + left * maxA <= sols[sols.length - 1].got + 1e-6) return;
    if (!left) {
      sols.push({ got, pick: pick.slice() });
      sols.sort((x, y) => y.got - x.got);
      if (sols.length > TOP) sols.pop();
      return;
    }
    for (let i = start; i < list.length; i++) {
      const { p, a } = list[i];
      if (p.counts.some((c, t) => c > need[t])) continue;
      pick.push(i);
      dfs(i, need.map((v, t) => v - p.counts[t]), got + a);
      pick.pop();
    }
  };
  dfs(0, demand.slice(), 0);
  for (const sol of sols) {
    if (Date.now() > deadline + 1500) break;
    const need = demand.slice();
    for (const i of sol.pick) list[i].p.counts.forEach((c, t) => { need[t] -= c; });
    const sheets = sol.pick.map(i => list[i].p);
    if (sum(need)) {
      const last = packSheet(C, need, C.full, { mode: 'area', needAll: true });
      if (!last) continue;
      sheets.push(last);
    }
    const groups = [];
    for (const sh of sheets) { const g = groups[groups.length - 1]; if (g && sameSheet(g.sheet, sh)) g.n++; else groups.push({ n: 1, sheet: sh }); }
    return compactLast(C, groups, 0, 'area');
  }
  return null;
}

/* ======================================================================= */
/* 10d. BÁN THÀNH PHẨM (BTP) – LẤP PHẦN DƯ ĐỂ TẤM LẺ VỀ 0 (đã chốt 28/10/2026) */
/* Thư viện tối đa 5 mã mỗi chiều dày (mác dùng lẫn); thợ tích mã được ghép, */
/* máy tự tính số lượng (thứ tự master data chỉ để hiển thị). Sau            */
/* khi xếp đơn hàng, phần dư mép mỗi tờ (dư phải, dư dưới – kể cả dưới ngưỡng */
/* thu hồi) được lấp bằng BTP; phần còn lại nếu đủ ngưỡng vẫn là tấm lẻ.      */
/* Hao phí tính BTP như một chi tiết trong đơn hàng. Chỉ áp dụng thép tấm.    */
/* Lấp theo kiểu chặt suốt (dải dư tách bằng một nhát suốt, trong dải xếp     */
/* chặt suốt) -> dùng được cho cả chặt sấn lẫn laser; laser thêm BTP tròn.    */
/* ======================================================================= */
/** Bớt BTP vượt số lượng cho phép (capLeft = còn được lấp, chia cho n tờ giống nhau). */
function semiTrim(r, capLeft, n) {
  const keep = capLeft.map(c => (c === Infinity ? Infinity : Math.floor(c / n)));
  const items = [...r.items].sort((a, b) => a.x - b.x || a.y - b.y).filter(it => keep[it.t]-- > 0);
  return { items };
}
/** Lấp một vùng (toạ độ quy đổi như C.full: rộng/cao đã cộng mạch k) bằng các mã BTP được tích – chọn cách lấp nhiều
 *  diện tích thành phẩm nhất; bằng nhau thì ít loại BTP hơn (dễ quản lý). */
function semiFillRegion(C, region, semis, capLeft, n) {
  if (!(region.w > EPS && region.h > EPS)) return null;
  let best = null;
  const consider = r => {
    if (!r || !r.items.length) return;
    const sc = r.items.reduce((s, it) => s + C.types[it.t].tpArea, 0), kinds = new Set(r.items.map(x => x.t)).size;
    if (!best || sc > best.sc + 1e-6 || (Math.abs(sc - best.sc) <= 1e-6 && kinds < best.kinds)) best = { items: r.items, sc, kinds };
  };
  const ok = T => capLeft[T.t] === Infinity || capLeft[T.t] >= n;
  const rects = semis.filter(T => !T.circle && ok(T));
  const sets = rects.length > 1 ? [rects, ...rects.map(T => [T])] : rects.map(T => [T]);   // phối các mã / từng mã riêng
  for (const set of sets) {
    const weights = C.types.map(() => 0);
    set.forEach(T => { weights[T.t] = T.tpArea; });
    const r = guillotineKnap(C, weights, region);
    if (r) consider(semiTrim(r, capLeft, n));
  }
  if (!C.shear) for (const T of semis.filter(T => T.circle && ok(T))) {          // BTP tròn: chỉ laser / plasma
    const phys = { x: region.x, y: region.y, w: region.w - C.k, h: region.h - C.k };
    if (phys.w + EPS < T.cw || phys.h + EPS < T.cw) continue;
    const plan = bestCirclePlan(phys, T.cw, C.k);
    const limit = capLeft[T.t] === Infinity ? Infinity : Math.floor(capLeft[T.t] / n);
    consider({ items: circleLayout(phys, T.cw, C.k, plan, limit).map(q => tag(T, q)) });
  }
  return best;
}
/** Lấp phần dư mép một tờ. Hai cách tách giống tấm lẻ: (A) dải phải suốt chiều rộng tờ trước, rồi dải dưới;
 *  (B) dải dưới suốt chiều dài tờ trước, rồi dải phải. Chọn cách lấp được nhiều hơn. */
function semiFillSheet(C, items, semis, capLeft, n) {
  if (!items.length) return null;
  let maxR = 0, maxB = 0;
  for (const p of items) { maxR = Math.max(maxR, p.x + p.w); maxB = Math.max(maxB, p.y + p.h); }
  const { W, H, e, k } = C, xr = maxR + k, yb = maxB + k;
  const opts = [
    [{ x: xr, y: e, w: W - e - maxR, h: C.HH }, { x: e, y: yb, w: maxR - e + k, h: H - e - maxB }],
    [{ x: e, y: yb, w: C.WW, h: H - e - maxB }, { x: xr, y: e, w: W - e - maxR, h: maxB - e + k }],
  ];
  let best = null;
  for (const regs of opts) {
    const left = capLeft.slice(), add = [];
    let sc = 0;
    for (const reg of regs) {
      const r = semiFillRegion(C, reg, semis, left, n);
      if (!r) continue;
      r.items.forEach(it => { if (left[it.t] !== Infinity) left[it.t] -= n; });
      add.push(...r.items); sc += r.sc;
    }
    if (add.length && (!best || sc > best.sc + 1e-6)) best = { items: add, sc };
  }
  return best;
}
/** Tạo phương án \"lấp BTP\" từ một phương án đã đánh giá. Tờ có tấm lẻ được lấp trước (khi BTP có giới hạn số lượng). */
function applySemis(ctxsX, plan, semis, caps) {
  const capLeft = caps.slice();
  const order = plan.groups.map((g, gi) => ({ gi, r: g.remnants.reduce((s, o) => s + o.w * o.h, 0) })).sort((a, b) => b.r - a.r);
  const out = plan.groups.map(g => ({ n: g.n, si: g.si, sheet: { items: g.items, cuts: g.cuts.filter(c => !c.rem), counts: ctxsX[g.si].types.map((_, t) => g.counts[t] || 0), blocks: g.blocks, strategy: g.strategy } }));
  let any = false;
  for (const { gi } of order) {
    const g = out[gi], C = ctxsX[g.si];
    const f = semiFillSheet(C, g.sheet.items, semis, capLeft, g.n);
    if (!f) continue;
    any = true;
    const counts = g.sheet.counts.slice();
    f.items.forEach(it => { counts[it.t]++; if (capLeft[it.t] !== Infinity) capLeft[it.t] -= g.n; });
    g.sheet = { items: g.sheet.items.concat(f.items), cuts: C.shear ? [] : g.sheet.cuts, counts, blocks: g.sheet.blocks + 1, strategy: g.sheet.strategy + '+btp' };
  }
  return any ? out : null;
}

/* ======================================================================= */
/* 11. GIAO DIỆN CHUNG CỦA LÕI TÍNH                                         */
/* Mỗi lần đổi số liệu: chạy lại TỪ ĐẦU, thử nhiều cách phối kết hợp, giữ   */
/* các phương án tốt nhất khác nhau để người dùng chọn.                     */
/* ======================================================================= */
const STRATEGY_LABEL = {
  'guillotine-dp': 'Chặt suốt tối ưu nhiều loại',
  area: 'Lấp kín từng tờ', big: 'Chi tiết lớn trước', small: 'Chi tiết nhỏ trước',
  even: 'Phối đều các loại trên mọi tờ', cover: 'Phối hợp ít tờ nhất', look: 'Mở đầu khác', mixed: 'Kết hợp khổ từng tờ', last: 'Tờ cuối khổ nhỏ hơn', tail: 'Dồn dư về tờ cuối',
};
export function calculateNestingPro(input) {
  // TỰ ĐỘNG (mục đích 1 – barem): một chi tiết, xếp TỐI ĐA lên một tờ khổ chuẩn đầu tiên trong kho, cắt hết tờ,
  // không trừ thu hồi: hao phí = (tờ − n × TP) / (n × TP). Số chiếc n do máy tìm, người dùng không nhập.
  if (input?.autoFill) {
    if (!Array.isArray(input.parts) || input.parts.length !== 1) fail('Chế độ Tự động chỉ dùng khi có đúng 1 chi tiết.');
    const std = (input.stocks || []).find(s => !s.remnant);
    if (!std) fail('Chế độ Tự động cần ít nhất một khổ tờ chuẩn trong kho phôi.');
    const one = { ...input, autoFill: false, stocks: [{ W: std.W, H: std.H, limit: null, lot: std.lot }], lengthTol: 0, widthTol: 0, shrinkTol: 0, semis: [] };
    const probe = calculateNestingPro({ ...one, _noEnlarge: true, parts: [{ ...input.parts[0], qty: 1 }] });
    let n = probe.types[0]?.barem?.n || 0;
    if (!n) fail(`Chi tiết không lọt tờ ${std.W} × ${std.H} (đã trừ mép).`);
    const BIG = LIMIT;                                 // cắt hết tờ: ngưỡng thu hồi lớn nhất cho phép → không có tấm lẻ thu hồi
    let res = null;
    for (; n > 0; n--) {                               // phòng khi lượt xếp chính không lặp lại được đúng n chiếc trên 1 tờ
      res = calculateNestingPro({ ...one, remnantMin: BIG, remnantMinLong: BIG, parts: [{ ...input.parts[0], qty: n }] });
      if (res.plans[0].totalSheets === 1) break;
    }
    res.autoFill = { n, W: std.W, H: std.H };
    return res;
  }
  const t0 = Date.now();
  const i = { ...input };
  if (i.remnantMin == null) i.remnantMin = DEFAULTS.remnantMin;
  for (const [key, lab] of [['widthTol', 'rộng'], ['lengthTol', 'dài']])
    if (i[key] != null && !(Number.isFinite(i[key]) && i[key] >= 0 && i[key] <= 200)) fail(`Tăng khổ ${lab} cho phép phải từ 0 đến 200 mm.`);
  if (i.shrinkTol != null && !(Number.isFinite(i.shrinkTol) && i.shrinkTol >= 0 && i.shrinkTol <= 3)) fail('Giảm kích thước cho phép phải từ 0 đến 3 mm.');
  if (i.longStripMin != null && !(Number.isFinite(i.longStripMin) && i.longStripMin >= 0 && i.longStripMin <= LIMIT)) fail('Ranh giới dải dài không hợp lệ.');
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
    return { idx, W, H, limit, remnant: !!s.remnant, lot: String(s.lot || '').slice(0, 60), ...(s.nominalH ? { nominalH: Math.min(s.nominalH, H) } : {}), ...(s.nominalW ? { nominalW: Math.min(s.nominalW, W) } : {}) };
  }).filter(s => s.limit > 0);
  if (!stocks.length) fail('Nhập ít nhất một khổ phôi.');
  if (stocks.length > 40) fail('Tối đa 40 dòng kho phôi.');

  const parts = (i.parts || []).filter(p => p && p.qty > 0);
  if (!parts.length) fail('Nhập ít nhất một chi tiết có số lượng.');
  if (parts.length > MAX_TYPES) fail(`Tối đa ${MAX_TYPES} loại chi tiết.`);
  let pieces = 0;
  for (const p of parts) {
    if (!['rect', 'circle', 'ring', 'poly'].includes(p.shape)) fail('Hình dạng chi tiết không hợp lệ.');
    p.allowanceIn = p.allowanceIn ?? 0;
    if (p.shape === 'poly') {
      if (!Array.isArray(p.outline) || p.outline.length < 3 || p.outline.length > 5000 || !p.outline.every(v => v && [v.x, v.y, v.b ?? 0].every(Number.isFinite) && Math.abs(v.b ?? 0) <= 1e3))
        fail(`Đường bao chi tiết "${p.name}" không hợp lệ – nhập lại từ DXF.`);
      if (p.allowance) fail(`Chi tiết đa giác "${p.name}": chưa hỗ trợ dư gia công (để 0).`);
      if (i.cutMethod === 'shear') fail(`Chặt sấn không cắt chi tiết đa giác "${p.name}" – chuyển sang Laser / Plasma.`);
    }
    const dims = p.shape === 'rect' || p.shape === 'poly' ? [p.partW, p.partH] : p.shape === 'ring' ? [p.diameter, p.inner] : [p.diameter];
    if (dims.some(v => !Number.isFinite(v) || v <= 0 || v > LIMIT) || !Number.isFinite(p.allowance) || p.allowance < -5 || dims.some(v => v + p.allowance <= 0) ||
        !Number.isFinite(p.allowanceIn) || p.allowanceIn < 0 || !Number.isInteger(p.qty))
      fail(`Kiểm tra kích thước, dư gia công (cho phép âm tới −5 mm khi người dùng chủ động giảm kích thước cắt) và số lượng của chi tiết "${p.name}".`);
    if (p.shape === 'ring' && (p.inner >= p.diameter || p.inner - p.allowanceIn <= 0))
      fail(`Vành khuyên "${p.name}": Ø trong phải nhỏ hơn Ø ngoài và lớn hơn dư gia công Ø trong.`);
    if (p.shape !== 'rect' && i.cutMethod === 'shear') fail(`Chặt sấn chỉ xếp chi tiết chữ nhật – "${p.name}" là chi tiết tròn/vành khuyên, hãy chuyển sang Laser / Plasma.`);
    pieces += p.qty;
  }
  if (pieces > MAX_PIECES) fail(`Tổng số chi tiết vượt ${MAX_PIECES.toLocaleString('vi-VN')} chiếc.`);
  i.parts = parts;
  // BÁN THÀNH PHẨM: các mã được tích, cùng chiều dày (mác dùng lẫn), tối đa 5 mã; chặt sấn chỉ lấp BTP chữ nhật
  const semiIn = (Array.isArray(i.semis) ? i.semis : []).filter(Boolean);
  if (semiIn.length > DEFAULTS.semiMax) fail(`Bán thành phẩm: tối đa ${DEFAULTS.semiMax} mã cho một chiều dày.`);
  const semiSkipped = [];
  const semiParts = semiIn.map((b, j) => {
    const name = String(b.code || '').trim().slice(0, 40) || `BTP${j + 1}`;
    if (!['rect', 'circle'].includes(b.shape)) fail(`Bán thành phẩm "${name}": hình dạng phải là chữ nhật hoặc tròn.`);
    const dims = b.shape === 'rect' ? [b.partW, b.partH] : [b.diameter];
    const allowance = b.allowance ?? 0;
    if (dims.some(v => !Number.isFinite(v) || v <= 0 || v > LIMIT) || !Number.isFinite(allowance) || allowance < 0 || dims.some(v => v + allowance <= 0))
      fail(`Bán thành phẩm "${name}": kiểm tra kích thước và dư gia công.`);
    if (b.maxQty != null && !(Number.isInteger(b.maxQty) && b.maxQty >= 0)) fail(`Bán thành phẩm "${name}": số lượng tối đa phải là số nguyên ≥ 0.`);
    if (b.shape === 'circle' && i.cutMethod === 'shear') { semiSkipped.push(`${name} (tròn – chặt sấn không cắt được)`); return null; }
    return { name, code: name, shape: b.shape, partW: b.partW, partH: b.partH, diameter: b.diameter, allowance, rotate: b.rotate !== false, qty: 0, maxQty: b.maxQty ?? null,
      rank: Number.isInteger(b.rank) && b.rank >= 0 ? b.rank : j };
  }).filter(Boolean);

  const maxW = Math.max(...stocks.map(s => s.W)), maxH = Math.max(...stocks.map(s => s.H));
  const base = prepareTypes(i, maxW, maxH);
  base.longStripMin = i.longStripMin ?? DEFAULTS.longStripMin;
  base.remnantMinLong = i.remnantMinLong ?? DEFAULTS.remnantMinLong;
  base.maxCutArea = Math.max(...base.types.map(T => T.cutArea));
  const demand = base.types.map(T => T.qty);
  const nBase = base.types.length;
  const semiTypes = semiParts.length && i.semiOn !== false ? prepareTypes({ ...i, parts: semiParts }, maxW, maxH).types.map((T, j) =>
    Object.assign(T, { t: nBase + j, semi: true, rank: semiParts[j].rank, code: semiParts[j].code, cap: semiParts[j].maxQty == null ? Infinity : semiParts[j].maxQty })) : [];
  const allTypes = base.types.concat(semiTypes), allParts = parts.concat(semiParts);
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
    const plan = evaluate(ctxs, pocketPass(ctxs, attachKits(base, pre.concat(groups), kits), i.remnantMin), i.remnantMin);   // điền ô kẹt trước
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
        if (i._noEnlarge && key !== 'area' && key !== 'even') return null;   // lượt thử tăng khổ: chỉ các chiến lược chính cho nhanh
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
      // còn hơn cận dưới -> tìm phối hợp ít tờ hơn (như kỹ sư ướm từng tờ cho vừa đủ số lượng)
      const minK = Math.min(...plans.filter(p => p.single === si).map(p => p.totalSheets));
      const lbK = sheetLowerBound(C, rem);
      // (kể cả khi đã bằng số tờ tốt nhất: tìm phối hợp dồn dư về tờ cuối để có tấm lẻ thu hồi lớn hơn)
      for (let kk = lbK; kk <= minK && !(late() && i._noEnlarge); kk++) {
        const g = coverPlan(C, rem, kk, t0 + DEFAULTS.planMs);
        if (!g) continue;
        finish(tag(compactLast(C, g, 0, 'area')), `${STRATEGY_LABEL.cover} · khổ ${size}`, si);
        break;
      }
      // dồn dư về tờ cuối: cùng số tờ tốt nhất, gom phần dư thành MỘT tấm lẻ lớn ở tờ cuối
      {
        const bestK = Math.min(...plans.filter(p => p.single === si).map(p => p.totalSheets));
        const g = Number.isFinite(bestK) ? tailPlan(C, rem, bestK, Date.now() + DEFAULTS.tailMs) : null;
        if (g) finish(tag(g), `${STRATEGY_LABEL.tail} · khổ ${size}`, si);
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
  // BÁN THÀNH PHẨM: mỗi phương án có thêm một biến thể lấp BTP vào phần dư; kiểm tra hình học độc lập như mọi phương án
  if (semiTypes.length) {
    const ctxsX = ctxs.map(C => ({ ...C, types: allTypes }));
    const caps = allTypes.map(T => (T.semi ? T.cap : 0));
    for (const p of plans.slice()) {
      const groups = applySemis(ctxsX, p, semiTypes, caps);
      if (!groups) continue;
      const q = evaluate(ctxsX, groups, i.remnantMin);
      q.label = p.label + ' + lấp BTP'; q.single = p.single; q.semi = true;
      const made = allTypes.map(() => 0);
      for (const g of q.groups) {
        const errs = verifySheet(ctxsX[g.si], g.items);
        if (errs.length) throw Error('Lỗi kiểm tra hình học (lấp BTP – lỗi phần mềm): ' + errs[0]);
        g.counts.forEach((c, t) => { made[t] += c * g.n; });
      }
      base.types.forEach(T => { if (made[T.t] !== T.qty) throw Error(`Lỗi kiểm tra số lượng sau lấp BTP: ${T.name} ${made[T.t]} / ${T.qty}.`); });
      semiTypes.forEach(T => { if (made[T.t] > T.cap) throw Error(`Lỗi: BTP ${T.name} vượt số lượng tối đa.`); });
      plans.push(q);
    }
  }
  // xếp hạng, bỏ phương án trùng, giữ tối đa 6
  plans.sort((a, b) => (better(a, b) ? -1 : better(b, a) ? 1 : 0));
  const sig = p => p.groups.map(g => `${g.n}:${g.W}x${g.H}:${g.counts.join('.')}`).join('|');
  const kept = [], seenSig = new Set();
  for (const p of plans) { const k = sig(p); if (!seenSig.has(k)) { seenSig.add(k); kept.push(p); } if (kept.length >= 6) break; }
  // luôn giữ phương án tốt nhất KHÔNG lấp BTP (và ngược lại) để anh so sánh
  for (const want of [false, true]) if (semiTypes.length && !kept.some(p => !!p.semi === want)) {
    const p = plans.find(q => !!q.semi === want); if (p) kept.push(p);
  }

  const kg = a => a * i.thickness * i.density / 1e9;
  const finishedArea = base.types.reduce((s, T) => s + T.qty * T.tpArea, 0);
  const lbCache = new Map();
  const mainCtx = ctxs[kept[0].single ?? ctxs.findIndex(C => !C.stock.remnant)] || ctxs[0];
  // HAO PHÍ TIÊU CHUẨN (barem – mục đích 1): ghép MỘT MÌNH chi tiết lên cả tờ khổ tiêu chuẩn (dòng khổ chuẩn đầu tiên
  // trong kho phôi, mặc định 6000 × 2000), cắt hết tờ, không trừ thu hồi: HP = (tờ − n × TP) / (n × TP).
  const bIdx = Math.max(0, ctxs.findIndex(C => !C.stock.remnant)), bCtx = { ...ctxs[bIdx], demand: base.types.map(() => Infinity) };
  const bMs = Math.max(150, Math.min(800, 2500 / rectTypes));
  const baremStd = allTypes.map(T => {
    const P = bCtx.pure[T.t]?.items.length && !T.rot ? bCtx.pure[T.t] : purePattern(bCtx, T, bMs);   // đủ sức chứa, không giới hạn bởi số lượng đơn
    const n = P.items.length, sheet = bCtx.W * bCtx.H;
    return { W: bCtx.W, H: bCtx.H, n, percent: n > 0 ? 100 * (sheet - n * T.tpArea) / (n * T.tpArea) : null, strategy: P.strategy };
  });
  // Thép tấm: chọn hao phí thấp nhất. Chỉ đưa thêm phương án thay thế khi nó KHÁC BIỆT THẬT
  // (dùng khổ khác, ít tờ hơn, ít kiểu tờ hơn – dễ cắt) và hao phí không kém quá altWithin điểm %.
  const wasteOf = wasteOfPlan;
  const sizesOf = p => [...new Set(p.groups.map(g => `${g.remnantStock ? 'lẻ ' : ''}${g.W}×${g.H}`))].sort().join(' + ');
  const semiN = p => p.groups.reduce((s, g) => s + g.n * g.counts.reduce((s2, c, t) => s2 + (allTypes[t]?.semi ? c : 0), 0), 0);
  const remWord = p => (p.remCount ? `${p.remCount} tấm lẻ` : p.semi ? 'Không còn tấm lẻ' : 'Không có tấm lẻ (dư nhỏ rải các tờ)');
  const best = kept[0], shown = [best];
  {
    // so với các phương án cùng số tờ (phương án nhiều tờ hơn có thể "hao phí thấp" nhờ thu hồi nhiều tấm lẻ – không so)
    const minW = Math.min(...kept.filter(p => p.totalSheets <= best.totalSheets).map(wasteOf)), d = wasteOf(best) - minW;
    best.reason = [remWord(best), best.semi ? `lấp ${semiN(best)} BTP` : '',
      d > 0.005 ? 'dồn dư về 1 tấm' : 'hao phí thấp nhất'].filter(Boolean).join(' · ');
  }
  for (const p of kept.slice(1)) {
    const otherSemi = !!p.semi !== !!best.semi;
    if (p.single != null && p.single === best.single && p.totalSheets > best.totalSheets) continue;   // nhiều tờ hơn: không đưa ra
    if (!otherSemi && wasteOf(p) - wasteOf(best) > DEFAULTS.altWithin + 1e-9) continue;
    const why = [];
    if (otherSemi) why.push(p.semi ? `Lấp ${semiN(p)} BTP` : 'Không lấp BTP');
    if (p.remCount !== best.remCount) why.push(remWord(p));
    if (sizesOf(p) !== sizesOf(best)) why.push(`Dùng khổ ${sizesOf(p)}`);
    if (p.totalSheets < best.totalSheets) why.push(`Ít tờ hơn (${p.totalSheets} tờ)`);
    if (p.groups.length < best.groups.length) why.push(`Ít kiểu tờ hơn (${p.groups.length} kiểu) – dễ cắt`);
    if (wasteOf(p) < wasteOf(best) - 0.005) why.push(`hao phí thấp hơn ${(wasteOf(best) - wasteOf(p)).toFixed(2)} điểm %`);
    if (!why.length || shown.some(q => q.reason === why.join(' · '))) continue;
    p.reason = why.join(' · ');
    shown.push(p);
    if (shown.length >= 3) break;
  }
  // PHƯƠNG ÁN 2 – TĂNG KHỔ PHÔI: tờ thực tế thường rộng hơn khổ danh nghĩa (vd. 2000 → 2050). Thử lại toàn bộ với bề rộng
  // + widthTol; nếu tiết kiệm rõ rệt thì đưa ra phương án riêng, ghi rõ bề rộng tờ cần có – người dùng chấp nhận mới dùng.
  // ĐỀ XUẤT KHI "CẬN" – máy chỉ tính theo barem, các điều chỉnh sau đưa ra để NGƯỜI DÙNG DUYỆT, máy không tự chọn:
  //  • Tăng khổ phôi: tờ thực tế thường lớn hơn khổ danh nghĩa (vd. rộng 2000 → 2050) – thử rộng, dài, cả hai.
  //  • Giảm kích thước cắt: mỗi chi tiết giảm shrinkTol (mặc định 0,5 mm) theo dài / rộng / đường kính.
  //  • Kết hợp cả hai khi mỗi cách riêng đều có lợi.
  // Ghi đúng số mm cần tăng; thành phẩm và xuất kho vẫn tính theo số liệu danh nghĩa.
  const enlarged = [];
  const tolW = i.widthTol == null ? DEFAULTS.widthTol : i.widthTol, tolL = i.lengthTol == null ? DEFAULTS.lengthTol : i.lengthTol;
  const shrink = i.shrinkTol == null ? DEFAULTS.shrinkTol : i.shrinkTol;
  if (!i._noEnlarge && (tolW > 0 || tolL > 0 || shrink > 0)) {
    // so sánh PHẾ LIỆU (xuất − thu hồi − thành phẩm, thành phẩm gồm cả BTP) – không so thép tiêu hao, vì lấp BTP cũng "tiêu hao" thép
    const netB = kg(best.issuedArea - best.recoveredArea - best.tpArea);
    const sheetKG = kg(Math.max(...stocks.filter(x => !x.remnant).map(x => x.W * x.H), 0));
    const trial = (dL, dW, sh) => {
      if (Date.now() - t0 > DEFAULTS.proposalMs) return null;           // hết thời gian cho đề xuất – giữ phương án đã có
      try {
        const sub = calculateNestingPro({ ...input, _noEnlarge: true,
          parts: sh > 0 ? input.parts.map(p => p.shape === 'poly' ? p : ({ ...p, allowance: (p.allowance || 0) - sh })) : input.parts,
          stocks: stocks.map(x => x.remnant ? { W: x.W, H: x.H, limit: x.limit === Infinity ? null : x.limit, remnant: true, lot: x.lot }
            : { W: x.W + dL, H: x.H + dW, nominalW: x.W, nominalH: x.H, limit: x.limit === Infinity ? null : x.limit, lot: x.lot }) });
        const q = sub.plans[0];
        const needL = Math.max(0, ...q.groups.map(g => g.needW ? g.needW - g.Wn : 0)), needR = Math.max(0, ...q.groups.map(g => g.needH ? g.needH - g.Hn : 0));
        const save = netB - (q.issuedKG - q.recoveredKG - q.finishedKG);
        if (!(needL > 0 || needR > 0 || sh > 0) || (dL + dW > 0 && !(needL > 0 || needR > 0))) return null;
        if (!(q.totalSheets < best.totalSheets || save >= 0.01 * sheetKG)) return null;
        const what = [needL ? `dài +${needL} mm` : '', needR ? `rộng +${needR} mm` : ''].filter(Boolean).join(', ');
        const need = q.groups.filter(g => g.needW || g.needH).map(g => `${g.needW ?? g.Wn} × ${g.needH ?? g.Hn}`);
        const label = [what ? `Tăng khổ ${what}` : '', sh > 0 ? `Giảm ${sh} mm mỗi chi tiết` : ''].filter(Boolean).join(' + ');
        const reason = [what ? `tăng khổ ${what} (tờ thực tế ≥ ${[...new Set(need)].join(' / ')} mm)` : '',
          sh > 0 ? `giảm kích thước cắt ${sh} mm mỗi chi tiết (dài / rộng hoặc đường kính)` : ''].filter(Boolean).join(' + ');
        return { ...q, label, enlargeMM: Math.max(needL, needR), enlargeL: needL, enlargeW: needR, shrinkMM: sh > 0 ? sh : 0,
          lowerBound: null, proven: false, save, effort: needL + needR + sh * 10,
          reason: `${reason[0].toUpperCase()}${reason.slice(1)} · tiết kiệm ${Math.round(save * 10) / 10} kg${q.totalSheets < best.totalSheets ? ` · bớt ${best.totalSheets - q.totalSheets} tờ` : ''}` };
      } catch (err) { if (!(err instanceof UserError)) throw err; return null; }
    };
    // thứ tự ưu tiên khi thời gian có hạn: tăng rộng → giảm kích thước → tăng dài → cả hai
    const w = tolW > 0 ? trial(0, tolW, 0) : null;
    const sh = shrink > 0 ? trial(0, 0, shrink) : null;
    const l = tolL > 0 ? trial(tolL, 0, 0) : null;
    const both = w && l ? trial(tolL, tolW, 0) : null;
    const grow = [w, l, both].filter(Boolean).sort((a, b) => b.save - a.save || a.effort - b.effort)[0];
    const combo = grow && sh ? trial(grow.enlargeL ? tolL : 0, grow.enlargeW ? tolW : 0, shrink) : null;
    // mỗi KIỂU điều chỉnh một đề xuất (người dùng chọn cách chấp nhận được): tăng khổ, giảm kích thước;
    // kết hợp chỉ đưa ra khi tiết kiệm hơn hẳn từng cách riêng
    if (grow) enlarged.push(grow);
    if (sh) enlarged.push(sh);
    if (combo && combo.save > Math.max(grow?.save ?? 0, sh?.save ?? 0) + 0.5) enlarged.push(combo);
    enlarged.sort((a, b) => a.effort - b.effort);                         // can thiệp ít trước
  }
  /** Danh sách loại chi tiết cho một phương án: đơn hàng + BTP đã lấp (số lượng BTP = số đã lấp trong phương án đó). */
  const typesFor = p => (p?.semi ? allTypes : base.types).map(T => {
    const q = allParts[T.t];
    const qty = T.semi ? p.groups.reduce((s, g) => s + g.n * (g.counts[T.t] || 0), 0) : T.qty;
    return { t: T.t, name: T.name, semi: !!T.semi, semiNo: T.semi ? T.rank : null, code: T.code ?? null, noRotate: T.noRotate, circle: T.circle, ring: T.ring, hole: T.hole, cw: T.cw, ch: T.ch, rot: T.rot, qty, tpArea: T.tpArea,
      tpW: T.circle ? q.diameter : q.partW, tpH: T.circle ? q.diameter : q.partH, tpIn: T.ring ? q.inner : null,
      allowance: q.allowance, allowanceIn: q.allowanceIn, inHoles: T.semi ? 0 : T.qty - sheetDemand[T.t],
      pureCount: mainCtx.pure[T.t]?.items.length ?? null, barem: baremStd[T.t],
      ...(T.poly ? { poly: { verts: T.poly.verts, label: T.poly.label } } : {}) };   // đa giác: đường bao để vẽ sơ đồ / xuất DXF
  });   // giữ đủ mọi loại (res.types[t] tra theo chỉ số t); BTP chưa lấp có qty = 0
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
      issuedKG: kg(p.issuedArea), finishedKG: kg(p.tpArea), recoveredKG: kg(p.recoveredArea),
      remnantUsedKG: kg(p.groups.reduce((s, g) => s + (g.remnantStock ? g.n * g.W * g.H : 0), 0)),
      wastePercent: wasteOfPlan(p),
      wasteFullPercent: 100 * (p.issuedArea - p.tpArea) / p.tpArea,
      lastFree: last.freeStrips, blocks: p.blocks, kinds: p.groups.length,
      remCount: p.remCount, semi: !!p.semi, semiCount: semiN(p), semiKG: kg(p.tpArea - finishedArea),
      types: typesFor(p), pieces: pieces + semiN(p),
    };
  });
  return {
    input: i,
    stocks: stocks.map(s => ({ W: s.W, H: s.H, limit: s.limit === Infinity ? null : s.limit, remnant: s.remnant, lot: s.lot })),
    types: typesFor(null), semiSkipped,
    plans: out.concat(enlarged.map((e, k) => ({ ...e, rank: out.length + k }))), invalid, tried: plans.length, pieces, ms: Date.now() - t0,
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
    if (T.circle || T.poly) continue;                 // phôi tròn xếp so le, đa giác cài răng lược -> lập luận "nửa tờ" chỉ đúng cho chữ nhật
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
    if (T.poly) cap = 0;                              // chưa có cận trên sức chứa cho đa giác – không dùng số chiếc đã xếp làm cận
    if (cap > 0) lb = Math.max(lb, Math.ceil(demand[0] / Math.max(cap, P.items.length) - 1e-9));
  }
  return Math.max(1, lb);
}

/**
 * Thứ tự nhát chặt kiểu thợ (chặt sấn): dựng lại cây nhát cắt từ hình học các chi tiết.
 * Ở mỗi miếng phôi, trong các đường chặt suốt được, chọn đường tách KHÁC LOẠI chi tiết (ranh giới khối)
 * và cân đối nhất; đánh số theo từng cấp (nhát 1 trước, rồi các nhát trên từng nửa…).
 * Chỉ đánh số nhát đầu và các nhát tách khối khác loại (nhát chính); nhát trong khối cùng loại kẻ nét đứt, không đánh số.
 */
function shearCutTree(items, region, k) {
  const cuts = [], queue = [{ set: items, r: region, depth: 0 }];
  let seq = 0;
  while (queue.length) {
    const { set, r, depth } = queue.shift();
    if (!set.length) continue;
    const xR = r.x + r.w, yB = r.y + r.h;
    if (set.length === 1) {                                     // tách chiếc cuối khỏi phần thừa
      const p = set[0];
      if (p.x + p.w < xR - 0.5) cuts.push({ x1: p.x + p.w + k / 2, y1: r.y, x2: p.x + p.w + k / 2, y2: yB, seq: 0 });
      if (p.y + p.h < yB - 0.5) cuts.push({ x1: r.x, y1: p.y + p.h + k / 2, x2: Math.min(xR, p.x + p.w + k), y2: p.y + p.h + k / 2, seq: 0 });
      continue;
    }
    let best = null;
    for (const [lo, len] of [['x', 'w'], ['y', 'h']]) {
      const sorted = set.slice().sort((a, b) => a[lo] - b[lo]);
      let reach = -Infinity;
      for (let n = 0; n < sorted.length - 1; n++) {
        reach = Math.max(reach, sorted[n][lo] + sorted[n][len]);
        if (sorted[n + 1][lo] < reach + k - 1e-5) continue;
        const L = sorted.slice(0, n + 1), R = sorted.slice(n + 1);
        // mức "ranh giới khối": 1 − phần chung về tỉ lệ các loại hai bên (cùng loại = 0, khác hẳn = 1)
        const frac = G => { const m = new Map(); for (const p of G) m.set(p.t, (m.get(p.t) || 0) + 1 / G.length); return m; };
        const fl = frac(L), fr = frac(R);
        let overlap = 0; for (const [t, v] of fl) overlap += Math.min(v, fr.get(t) || 0);
        const boundary = 1 - overlap;
        const score = 2 * boundary + Math.min(L.length, R.length) / set.length;
        if (!best || score > best.score + 1e-9) best = { score, boundary, lo, at: reach + k / 2, L, R };
      }
    }
    if (!best) return null;                                       // không chặt suốt được (không xảy ra với sơ đồ đã kiểm)
    const num = depth === 0 || (depth < 4 && best.boundary > 0.05 && r.numbered !== false) ? ++seq : 0;   // nhát đầu + nhát tách khối khác loại
    if (best.lo === 'x') {
      cuts.push({ x1: best.at, y1: r.y, x2: best.at, y2: yB, seq: num });
      queue.push({ set: best.L, r: { x: r.x, y: r.y, w: best.at - r.x, h: r.h, numbered: num > 0 }, depth: depth + 1 },
                 { set: best.R, r: { x: best.at, y: r.y, w: xR - best.at, h: r.h, numbered: num > 0 }, depth: depth + 1 });
    } else {
      cuts.push({ x1: r.x, y1: best.at, x2: xR, y2: best.at, seq: num });
      queue.push({ set: best.L, r: { x: r.x, y: r.y, w: r.w, h: best.at - r.y, numbered: num > 0 }, depth: depth + 1 },
                 { set: best.R, r: { x: r.x, y: best.at, w: r.w, h: yB - best.at, numbered: num > 0 }, depth: depth + 1 });
    }
  }
  return cuts;
}

/**
 * Tổng hợp phương án.
 *  - Phần dư mép tờ (dư phải, dư dưới) LUÔN được ghi kích thước, dù to hay nhỏ.
 *  - Tấm lẻ thu hồi: dải dư lớn nhất của tờ có cạnh ngắn ≥ ngưỡng (mặc định 200 mm, tùy chỉnh),
 *    tách bằng một nhát cắt suốt; phần dư dưới ngưỡng tính vào hao phí.
 */
/* ======================================================================= */
/* 11b. ĐIỀN Ô KẸT + DỒN DƯ VỀ MỘT TẤM LẺ TO (anh chốt 29/10/2026)          */
/* Thứ tự ưu tiên khi đặt chi tiết nhỏ:                                     */
/*  1) ĐIỀN Ô KẸT TRƯỚC: "ô kẹt" = khoảng trống nằm BÊN TRONG khung bao các  */
/*     chi tiết của một tờ (không chạy suốt bề dài hay bề rộng tờ, vd. ô    */
/*     700 × 700 khi 9 tấm 700 xếp 5 + 4). Ô kẹt không thu hồi được nên phải */
/*     lấp bằng chi tiết nhỏ – kể cả chi tiết đang nằm ở tờ khác.            */
/*  2) PHẦN CÒN LẠI đặt sao cho tấm lẻ thu hồi là MỘT TẤM TO, không phải hai */
/*     tấm nhỏ: ưu tiên lấp dải hẹp (vd. dải phải 359 mm) để dải kia (dải    */
/*     dưới) chạy suốt tờ. Không đặt chi tiết nhỏ dưới khối chính làm dải    */
/*     dưới hụt xuống dưới ngưỡng thu hồi.                                  */
/* Mỗi bước dời chi tiết chỉ được nhận khi phương án mới THẮNG theo đúng thứ */
/* tự xếp hạng đã chốt (hàm better): ít tờ → phế liệu xếp hạng (mỗi tờ tính */
/* một tấm lẻ to nhất) → ít tấm lẻ → tấm lẻ to. Kiểm tra hình học độc lập.  */
/* Chỉ chữ nhật; không áp dụng khi có vành khuyên / đa giác (chèn lỗ riêng). */
/* ======================================================================= */

const POCKET_MIN_GAIN = 1e4;   // phế liệu thực phải giảm ≥ 10.000 mm² (0,01 m²) mới đổi sơ đồ

/** Các hình chữ nhật trống tối đại trong hộp (toạ độ quy đổi: chi tiết chiếm w + k, h + k). */
function freeRects(C, items, box) {
  let free = [box];
  for (const p of items) {
    const o = { x: p.x, y: p.y, w: p.w + C.k, h: p.h + C.k }, next = [];
    for (const f of free) {
      if (o.x >= f.x + f.w - EPS || o.x + o.w <= f.x + EPS || o.y >= f.y + f.h - EPS || o.y + o.h <= f.y + EPS) { next.push(f); continue; }
      if (o.x > f.x + EPS) next.push({ x: f.x, y: f.y, w: o.x - f.x, h: f.h });
      if (o.x + o.w < f.x + f.w - EPS) next.push({ x: o.x + o.w, y: f.y, w: f.x + f.w - o.x - o.w, h: f.h });
      if (o.y > f.y + EPS) next.push({ x: f.x, y: f.y, w: f.w, h: o.y - f.y });
      if (o.y + o.h < f.y + f.h - EPS) next.push({ x: f.x, y: o.y + o.h, w: f.w, h: f.y + f.h - o.y - o.h });
    }
    free = next.filter((a, ia) => !next.some((b, ib) => ib !== ia && b.x <= a.x + EPS && b.y <= a.y + EPS &&
      b.x + b.w >= a.x + a.w - EPS && b.y + b.h >= a.y + a.h - EPS && (ib < ia || b.w * b.h > a.w * a.h + EPS)));
  }
  return free;
}

/** Khung bao chi tiết của một tờ. */
function boxOf(items) {
  let maxR = 0, maxB = 0;
  for (const p of items) { maxR = Math.max(maxR, p.x + p.w); maxB = Math.max(maxB, p.y + p.h); }
  return { maxR, maxB };
}

/** Ô kẹt của một tờ: hình chữ nhật trống tối đại nằm trong khung bao chi tiết. */
function pocketsOf(C, items) {
  if (!items.length) return [];
  const { maxR, maxB } = boxOf(items);
  return freeRects(C, items, { x: C.e, y: C.e, w: maxR + C.k - C.e, h: maxB + C.k - C.e });
}

/** Lưới chữ nhật loại T trong ô R (toạ độ quy đổi): hướng chính rồi phần dư hướng xoay. Tối đa n chiếc. */
function gridInto(C, T, R, n) {
  const dims = T.rot ? [[T.cw, T.ch], [T.ch, T.cw]] : [[T.cw, T.ch]];
  let best = [];
  for (const [w1, h1] of dims) for (const split of ['right', 'bottom']) {
    const out = [], pw = w1 + C.k, ph = h1 + C.k;
    const cx = Math.floor(R.w / pw + 1e-9), cy = Math.floor(R.h / ph + 1e-9);
    for (let j = 0; j < cy && out.length < n; j++) for (let i = 0; i < cx && out.length < n; i++)
      out.push({ x: R.x + i * pw, y: R.y + j * ph, w: w1, h: h1 });
    // phần dư của ô: thử hướng còn lại (vd. 22 thanh đứng + 9 thanh nằm trong ô 700 × 700)
    const rest = split === 'right' ? { x: R.x + cx * pw, y: R.y, w: R.w - cx * pw, h: R.h } : { x: R.x, y: R.y + cy * ph, w: R.w, h: R.h - cy * ph };
    if (cx && cy) for (const [w2, h2] of dims) {
      const qw = w2 + C.k, qh = h2 + C.k, dx = Math.floor(rest.w / qw + 1e-9), dy = Math.floor(rest.h / qh + 1e-9);
      if (!dx || !dy) continue;
      for (let j = 0; j < dy && out.length < n; j++) for (let i = 0; i < dx && out.length < n; i++)
        out.push({ x: rest.x + i * qw, y: rest.y + j * qh, w: w2, h: h2 });
      break;
    }
    if (out.length > best.length) best = out;
  }
  return best;
}

/**
 * Đặt r chiếc loại T sát khung bao của items. Bốn cách:
 *  phải – trong chiều cao khung bao (dải dưới vẫn chạy suốt tờ  -> dồn về MỘT tấm lẻ dưới)
 *  phải – suốt chiều cao tờ        (lấp hẳn dải phải)
 *  dưới – trong bề rộng khung bao  (dải phải vẫn chạy suốt tờ   -> dồn về MỘT tấm lẻ phải)
 *  dưới – suốt bề dài tờ
 */
function besideBox(C, T, items, r) {
  const { maxR, maxB } = items.length ? boxOf(items) : { maxR: C.e - C.k, maxB: C.e - C.k };
  const dims = T.rot ? [[T.cw, T.ch], [T.ch, T.cw]] : [[T.cw, T.ch]], out = [];
  const x0 = maxR + C.k, y0 = maxB + C.k;
  for (const [w, h] of dims) {
    const pw = w + C.k, ph = h + C.k;
    for (const hAvail of [maxB + C.k - C.e, C.HH]) {
      const rows = Math.min(r, Math.floor(hAvail / ph + 1e-9));
      if (rows <= 0) continue;
      const cols = Math.ceil(r / rows);
      if (x0 + cols * pw - C.k <= C.W - C.e + 1e-6) out.push(Array.from({ length: r }, (_, q) => ({ x: x0 + Math.floor(q / rows) * pw, y: C.e + (q % rows) * ph, w, h })));
    }
    for (const wAvail of [maxR + C.k - C.e, C.WW]) {
      const cols = Math.min(r, Math.floor(wAvail / pw + 1e-9));
      if (cols <= 0) continue;
      const rws = Math.ceil(r / cols);
      if (y0 + rws * ph - C.k <= C.H - C.e + 1e-6) out.push(Array.from({ length: r }, (_, q) => ({ x: C.e + (q % cols) * pw, y: y0 + Math.floor(q / cols) * ph, w, h })));
    }
  }
  return out;
}

function pocketPass(ctxs, groups, remnantMin) {
  if (ctxs.some(C => C.types.some(T => T.ring || T.poly))) return groups;
  const judge = gs => Object.assign(evaluate(ctxs, gs, remnantMin), { single: 0 });
  const sheetOf = (g, items, C) => ({ ...g, sheet: { ...g.sheet, items, counts: C.types.map(U => items.filter(p => p.t === U.t).length), cuts: [],
    strategy: g.sheet.strategy.replace(/\+pocket/g, '') + '+pocket' } });
  let cur = groups, curP = judge(cur);
  for (let round = 0; round < 6; round++) {
    let best = null;
    cur.forEach((gT, ti) => {
      if (gT.n !== 1) return;
      const C = ctxs[gT.si];
      cur.forEach((gS, si2) => {
        if (gS.n !== 1 || gS.si !== gT.si) return;                 // cùng khổ tờ
        for (const T of C.types) {
          const m = gS.sheet.counts[T.t];
          if (!m || T.circle || T.semi) continue;
          const keepS = gS.sheet.items.filter(p => p.t !== T.t);
          const baseT = ti === si2 ? keepS : gT.sheet.items.slice();
          // 1) ĐIỀN Ô KẸT TRƯỚC (ô lớn trước)
          const pockets = pocketsOf(C, baseT).sort((a, b) => b.w * b.h - a.w * a.h);
          let placed = [], left = m;
          for (const R of pockets) {
            if (!left) break;
            for (const F of freeRects(C, baseT.concat(placed), R)) {
              if (!left) break;
              const add = gridInto(C, T, F, left);
              placed = placed.concat(add); left -= add.length;
            }
          }
          if (!placed.length && ti !== si2) continue;                // khác tờ: chỉ dời khi có ô kẹt để điền
          const withPocket = baseT.concat(placed.map(p => tag(T, p)));
          // 2) PHẦN CÒN LẠI: sát khung bao ở tờ đích, hoặc trả về tờ nguồn – thử mọi cách, xếp hạng chọn cách cho tấm lẻ to
          const options = [];
          if (!left) options.push({ itemsT: withPocket, itemsS: keepS });
          else {
            for (const ex of besideBox(C, T, withPocket, left)) options.push({ itemsT: withPocket.concat(ex.map(p => tag(T, p))), itemsS: keepS });
            if (ti !== si2) for (const ex of besideBox(C, T, keepS, left)) options.push({ itemsT: withPocket, itemsS: keepS.concat(ex.map(p => tag(T, p))) });
          }
          for (const { itemsT, itemsS } of options) {
            if (verifySheet(C, itemsT).length || (ti !== si2 && itemsS.length && verifySheet(C, itemsS).length)) continue;   // kiểm tra hình học độc lập
            const next = [];
            cur.forEach((g, gi) => {
              if (gi === ti) next.push(sheetOf(g, itemsT, C));
              else if (gi === si2) { if (itemsS.length) next.push(sheetOf(g, itemsS, C)); }
              else next.push(g);
            });
            const p = judge(next);
            // nhận khi THẮNG theo bộ xếp hạng chung (ít tờ → phế liệu xếp hạng → ít tấm lẻ → tấm lẻ to)
            if (!better(p, curP) || scrapOfPlan(p) > scrapOfPlan(curP) - POCKET_MIN_GAIN) continue;
            if (!best || better(p, best.p)) best = { next, p };
          }
        }
      });
    });
    if (!best) break;
    cur = best.next; curP = best.p;
  }
  return cur;
}
function evaluate(ctxs, groups, remnantMin) {
  let totalSheets = 0, issuedArea = 0, recoveredArea = 0, blocks = 0;
  const gs = groups.map(g => {
    const C = ctxs[g.si], items = g.sheet.items;
    // Khổ DANH NGHĨA (kho, tính xuất kho / thu hồi / hao phí) và khổ THỰC TẾ CẦN (phương án tăng khổ – để vẽ, xuất DXF)
    const Wn = C.stock.nominalW ?? C.W, Hn = C.stock.nominalH ?? C.H;
    let maxR = 0, maxB = 0;
    for (const p of items) { maxR = Math.max(maxR, p.x + p.w); maxB = Math.max(maxB, p.y + p.h); }
    const needW = C.W > Wn && Math.ceil(maxR + C.e - 1e-6) > Wn ? Math.ceil(maxR + C.e - 1e-6) : null;
    const needH = C.H > Hn && Math.ceil(maxB + C.e - 1e-6) > Hn ? Math.ceil(maxB + C.e - 1e-6) : null;
    const Wd = needW ?? Wn, Hd = needH ?? Hn;
    const { remnant, remnants } = remnantOf({ ...C, W: Wn, H: Hn }, items, remnantMin);   // tấm lẻ theo khổ danh nghĩa (1–2 dải)
    const remArea = remnants.reduce((s2, o) => s2 + o.w * o.h, 0);
    const { freeStrips } = remnantOf({ ...C, W: Wd, H: Hd }, items, 0);             // dư phải / dư dưới theo tờ thực tế cần
    totalSheets += g.n; blocks += g.sheet.blocks * g.n; issuedArea += g.n * Wn * Hn;
    recoveredArea += g.n * remArea;
    const netArea = items.reduce((s, p) => s + (p.circle ? Math.PI * (p.w ** 2 - (p.hole || 0) ** 2) / 4 : p.w * p.h), 0);
    let cuts = g.sheet.cuts.slice();
    if (C.shear) {                                                  // thứ tự nhát chặt kiểu thợ, dựng từ hình học
      const rightKept = remnants.some(o => o.side === 'right'), bottomKept = remnants.some(o => o.side === 'bottom');
      const reg = { x: 0, y: 0, w: rightKept ? remnants.find(o => o.side === 'right').at : Wd, h: bottomKept ? remnants.find(o => o.side === 'bottom').at : Hd };
      const tree = shearCutTree(items, reg, C.k);
      if (tree) cuts = tree;
    }
    if (C.shear && remnants.length) {
      // chặt sấn: các nhát tách tấm lẻ là NHÁT ĐẦU (1, 2), các nhát khác lùi số; bỏ nhát trùng đường tách
      const same = (c, r) => Math.abs(c.x1 - r.x1) < 1.5 && Math.abs(c.x2 - r.x2) < 1.5 && Math.abs(c.y1 - r.y1) < 1.5 && Math.abs(c.y2 - r.y2) < 1.5;
      const on = (c, r) => r.x1 === r.x2 ? Math.abs(c.x1 - r.x1) < 1.5 && Math.abs(c.x2 - r.x1) < 1.5 : Math.abs(c.y1 - r.y1) < 1.5 && Math.abs(c.y2 - r.y1) < 1.5;
      const rc = remnants.map(o => o.cut);
      cuts = cuts.filter(c => !rc.some(r => same(c, r) || on(c, r)));
      let n = rc.length; cuts = cuts.map(c => (c.seq > 0 ? { ...c, seq: ++n } : c));
      cuts.unshift(...rc.map((r, k2) => ({ ...r, y2: r.y2 === Hn ? Hd : r.y2, x2: r.x2 === Wn ? Wd : r.x2, seq: k2 + 1, rem: true })));
    }
    const tp = g.sheet.counts.reduce((s2, c, t) => s2 + c * C.types[t].tpArea, 0);
    return { n: g.n, si: g.si, W: Wd, H: Hd, Wn, Hn, needW, needH, lot: C.stock.lot, remnantStock: C.stock.remnant,
      items, cuts, counts: g.sheet.counts, strategy: g.sheet.strategy,
      blocks: g.sheet.blocks, remnant, remnants, freeStrips, usedPercent: 100 * netArea / (Wn * Hn),
      // hao phí riêng của tờ này = (tờ − tấm lẻ thu hồi − thành phẩm trên tờ) / thành phẩm trên tờ
      wastePercent: tp > 0 ? 100 * (Wn * Hn - remArea - tp) / tp : null };
  });
  const last = gs[gs.length - 1];
  const lastFree = last ? Math.max(0, ...last.freeStrips.map(f => f.w * f.h)) : 0;
  // thành phẩm của phương án (gồm cả bán thành phẩm lấp vào nếu có), số tấm lẻ và tấm lẻ lớn nhất – để xếp hạng
  const tpArea = gs.reduce((s, g) => s + g.n * g.counts.reduce((s2, c, t) => s2 + c * ctxs[g.si].types[t].tpArea, 0), 0);
  const remCount = gs.reduce((s, g) => s + g.n * g.remnants.length, 0);
  const maxRem = Math.max(0, ...gs.flatMap(g => g.remnants.map(o => o.w * o.h)));
  // xếp hạng: mỗi tờ chỉ tính MỘT tấm lẻ – tấm to nhất của tờ đó (tấm lẻ thứ hai cùng tờ coi như phế)
  const oneRemArea = gs.reduce((s, g) => s + g.n * Math.max(0, ...g.remnants.map(o => o.w * o.h)), 0);
  return { groups: gs, totalSheets, issuedArea, recoveredArea, blocks, lastFree, tpArea, remCount, maxRem, oneRemArea };
}
/** Hao phí / TP (%) của một phương án (đã trừ tấm lẻ thu hồi; thành phẩm gồm cả bán thành phẩm). */
const wasteOfPlan = p => 100 * (p.issuedArea - p.recoveredArea - p.tpArea) / p.tpArea;
/**
 * PHẾ LIỆU XẾP HẠNG (mm²) = tôn xuất − thành phẩm − Σ (tấm lẻ TO NHẤT của từng tờ).
 * Mỗi tờ chỉ được tính MỘT tấm lẻ thu hồi; tấm lẻ thứ hai trên cùng tờ tính như phế khi xếp hạng.
 * Ý nghĩa (anh chốt 29/10/2026): DỒN DƯ VÀO MỘT TẤM LẺ TO – không phải giảm số tấm lẻ một cách mù quáng
 *  - Gom đúng: lấp dải hẹp bằng chi tiết (vd. 19 thanh 400×28 vào dải phải 359 mm) để dải dưới chạy suốt
 *    6000 × 577 → tờ còn MỘT tấm to, phế giảm -> thắng.
 *  - Gom sai: để dải dư tụt dưới ngưỡng thành phế cho "ít tấm lẻ" (1 tấm lẻ / hao phí 48,8 % so với
 *    3 tấm lẻ / 27 %) -> phế tăng -> thua.
 * Chỉ dùng để XẾP HẠNG; hao phí báo cáo vẫn trừ đủ mọi tấm lẻ thu hồi theo công thức đã chốt.
 */
const scrapOfPlan = p => p.issuedArea - p.tpArea - p.oneRemArea;
const RANK_TOL = 1e4;   // dung sai so phế liệu: 10.000 mm² (0,01 m²) – chỉ khử sai số số học, không phải thông số kỹ thuật
/**
 * Thứ tự chọn phương án (anh chốt 28/10/2026, sửa 29/10/2026):
 *  ① đủ số lượng từng chi tiết (đã kiểm tra trước khi xếp hạng)
 *  ② ÍT TỜ nhất (cùng khổ) – 7 tờ luôn hơn 8 tờ
 *  ③ PHẾ LIỆU XẾP HẠNG thấp nhất (mỗi tờ tính một tấm lẻ to nhất – xem scrapOfPlan): dồn dư vào MỘT tấm to,
 *     không biến tấm lẻ thành phế
 *  ④ ÍT TẤM LẺ nhất (phế như nhau thì phương án đã gom thắng)
 *  ⑤ tấm lẻ lớn nhất (diện tích MỘT tấm) lớn hơn
 *  ⑥ hao phí thấp nhất  ⑦ ít tờ (khác khổ)  ⑧ dư tờ cuối lớn  ⑨ sơ đồ gọn (ít khối)
 *  Khác khổ (số tờ không so trực tiếp được): ③ → ④ → ⑤ → hao phí.
 */
function better(a, b) {
  const sameSize = a.single != null && a.single === b.single;
  if (sameSize && a.totalSheets !== b.totalSheets) return a.totalSheets < b.totalSheets;
  const sa = scrapOfPlan(a), sb = scrapOfPlan(b);
  if (Math.abs(sa - sb) > RANK_TOL) return sa < sb;
  if (a.remCount !== b.remCount) return a.remCount < b.remCount;
  if (Math.abs(a.maxRem - b.maxRem) > 1e4) return a.maxRem > b.maxRem;
  const wa = wasteOfPlan(a), wb = wasteOfPlan(b);
  if (Math.abs(wa - wb) > 1e-6) return wa < wb;
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
  /** Đường bao khép kín có cung: pts [{ x, y, b }] (b = bulge). */
  poly(l, pts) {
    this.g(0, 'POLYLINE'); this.g(8, l); this.g(66, 1); this.g(10, 0); this.g(20, 0); this.g(30, 0); this.g(70, 1);
    for (const p of pts) { this.g(0, 'VERTEX'); this.g(8, l); this.g(10, dxfNum(p.x)); this.g(20, dxfNum(p.y)); this.g(30, 0); if (p.b) this.g(42, dxfNum(p.b)); this.ext(p.x, p.y); }
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
    g(0, 'TABLE'); g(2, 'STYLE'); g(70, 1); g(0, 'STYLE'); g(2, 'STANDARD'); g(70, 0); g(40, 0); g(41, 1); g(50, 0); g(71, 0); g(42, 2.5); g(3, 'arial.ttf'); g(4, ''); g(0, 'ENDTAB');   // font Arial: hiện đúng tiếng Việt trong AutoCAD
    g(0, 'ENDSEC'); g(0, 'SECTION'); g(2, 'ENTITIES');
    return head.concat(this.out, ['0', 'ENDSEC', '0', 'EOF']).join('\r\n') + '\r\n';
  }
}
/** Vẽ đường bao một chi tiết; (ox, oy) = góc trái-dưới tờ trong bản vẽ, H = rộng tờ để lật trục Y. */
function dxfPart(d, layer, p, ox, oy, H, T = null) {
  if (T?.poly) {                                   // hệ lõi Y xuống → DXF Y lên: lật Y, cung đổi chiều
    const V = turnVerts(T.poly.verts, T.cw, T.ch, polyAng(T, p));
    d.poly(layer, V.map(v => ({ x: ox + p.x + v.x, y: oy + H - (p.y + v.y), b: -v.b })));
    return;
  }
  if (p.circle) {
    const cx = ox + p.x + p.w / 2, cy = oy + H - (p.y + p.h / 2);
    d.circle(layer, cx, cy, p.w / 2);
    if (p.ring) d.circle(layer, cx, cy, p.hole / 2);
  } else d.rect(layer, ox + p.x, oy + H - p.y - p.h, p.w, p.h);
}
/** DXF cho máy cắt: một kiểu tờ. */
export function cutDXF(res, gi) {
  const g = res.groups[gi], d = new DxfWriter([['CAT', 7]]);
  for (const p of g.items) dxfPart(d, 'CAT', p, 0, 0, g.needH ?? g.H, res.types[p.t]);   // tăng khổ: vẽ đúng bề rộng tờ thực tế cần
  return d.toString();
}
/** DXF cutting plan chuẩn dự án – tất cả kiểu tờ trong một bản vẽ, xếp từ trên xuống. */
export function planDXF(res, info = {}) {
  const d = new DxfWriter([['VIEN_TAM', 5], ['CHI_TIET', 7], ['SO_HIEU', 1], ['SURPLUS', 3], ['THUOC_DO', 4], ['KHUNG_TEN', 2], ['NHAT_CHAT', 30]]);
  const i = res.input, t = i.thickness;
  const maxW = Math.max(...res.groups.map(g => g.W)), maxH = Math.max(...res.groups.map(g => g.needH ?? g.H));
  const th = Math.max(20, Math.round(maxH / 45));                    // chiều cao chữ chung
  let first = 1, oy = 0;
  res.groups.forEach((g, gi) => {
    const W = g.W, H = g.needH ?? g.H, last = first + g.n - 1, range = first === last ? `${first}` : `${first}-${last}`;
    oy -= H + 6 * th;                                                // chừa chỗ tiêu đề phía trên
    const by = oy;                                                   // đáy tờ
    // tiêu đề
    d.text('KHUNG_TEN', 0, by + H + 3.6 * th, th * 1.3, `CUTTING PLAN: PLATE ${t} - SHEET ${range}${g.n > 1 ? ` (x${g.n})` : ''}${g.remnantStock ? ' - REMNANT STOCK' : ''}`);
    d.text('KHUNG_TEN', 0, by + H + 1.9 * th, th, `TOTAL USED: ${g.items.length} PCS   SIZE: ${g.Wn ?? W} x ${g.Hn ?? H} x ${t} mm${g.needW || g.needH ? `   (ENLARGED -> SHEET >= ${W} x ${H})` : ''}   PLATE SERI.NO: ${g.lot || '................'}`);
    // tờ
    d.rect('VIEN_TAM', 0, by, W, H);
    // phần dư mép tờ: CHỈ GHI CHÚ kích thước (giữ lại hay bỏ do người dùng quyết định)
    // tấm lẻ thu hồi (1–2 dải, SP.01 / SP.02) + phần dư dưới ngưỡng (ghi chú, vào hao phí)
    const rems = g.remnants || (g.remnant ? [g.remnant] : []);
    const zones = rems.map((o, n) => ({ x: o.x, y: o.y, w: o.w, h: o.side === 'right' && o.h >= (g.Hn ?? H) - 1e-6 ? H : o.h, name: `SURPLUS SP.0${n + 1}`, key: `SP.0${n + 1}`, kept: true, size: `${Math.round(o.w)} x ${Math.round(o.h)}` }));
    for (const f of (g.freeStrips || []).filter(f => Math.min(f.w, f.h) >= DXF_MIN_ZONE)) {
      const z = f.side === 'right' ? { x: W - f.w, y: 0, w: f.w, h: H, name: 'DU PHAI', key: 'R' } : { x: 0, y: H - f.h, w: f.w, h: f.h, name: 'DU DUOI', key: 'B' };
      const cov = zones.some(o => Math.max(0, Math.min(z.x + z.w, o.x + o.w) - Math.max(z.x, o.x)) * Math.max(0, Math.min(z.y + z.h, o.y + o.h) - Math.max(z.y, o.y)) > 0.5 * z.w * z.h);
      if (!cov) zones.push({ ...z, size: `${Math.round(z.w)} x ${Math.round(z.h)}` });
    }
    for (const z of zones) {
      const x0 = z.x, y0 = by + H - z.y - z.h;
      d.rect('SURPLUS', x0, y0, z.w, z.h);
      const hh = Math.min(th, z.h * 0.45, z.w / 9);
      if (hh >= 4) d.text('SURPLUS', x0 + z.w / 2, y0 + z.h / 2, hh, `${z.name} ${z.size}`, 'c');
    }
    // chi tiết + số hiệu NO (= số dòng BOM)
    for (const p of g.items) {
      const T = res.types[p.t];
      dxfPart(d, 'CHI_TIET', p, 0, by, H, T);
      const lab = T.poly ? polyTurn(T.poly.label.x, T.poly.label.y, T.cw, T.ch, polyAng(T, p)) : null;
      const hh = Math.min(th * 0.9, (T.poly ? T.poly.label.r * 1.2 : p.ring ? (p.w - p.hole) / 2 : Math.min(p.w, p.h)) * 0.45);
      if (hh >= 3) {
        const cx = lab ? p.x + lab[0] : p.x + p.w / 2, cy = by + H - (lab ? p.y + lab[1] : p.y + p.h / 2);
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
      for (const z of zones) { tableRow([z.key, z.size, (z.w * z.h / 1e6).toFixed(3), z.kept ? 'YES' : 'SCRAP'], ty); ty -= rowH; }
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

/* ---------- XLSX tối thiểu (Excel, LibreOffice, Google Sheets đều mở được) ---------- */
const xmlEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const colName = n => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
/**
 * sheets: [{ name, cols: [độ rộng], rows: [[ô…]] }]; ô = chuỗi | số | { v, s } với s: 'title' | 'head' | 'int' | 'dec' | 'pct' | 'bold' | 'note'.
 */
export function xlsxBook(sheets) {
  const ST = { text: 1, title: 2, head: 3, int: 4, dec: 5, pct: 6, bold: 7, note: 8, boldint: 9, bolddec: 10, hlpct: 11, hldec: 12, hlhead: 13, ref: 14, dec3: 15,
    semi: 16, semiint: 17, semidec: 18, semipct: 19, semihead: 20 };   // semi*: dòng bán thành phẩm (tô xanh ngọc)
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="0.00&quot; %&quot;"/><numFmt numFmtId="166" formatCode="0.000"/></numFmts>
<fonts count="5"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font><font><b/><sz val="14"/><color rgb="FF4A1FA8"/><name val="Arial"/></font><font><i/><sz val="10"/><color rgb="FF6A6691"/><name val="Arial"/></font><font><sz val="11"/><color rgb="FF7A7496"/><name val="Arial"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDE6FC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDF6EA"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDF1F2"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFB9A8E6"/></left><right style="thin"><color rgb="FFB9A8E6"/></right><top style="thin"><color rgb="FFB9A8E6"/></top><bottom style="thin"><color rgb="FFB9A8E6"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="21">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="3" fontId="1" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="1" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="165" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="165" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="3" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="165" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  const sheetXml = sh => {
    const rows = sh.rows.map((row, r) => `<row r="${r + 1}">${row.map((cell, c) => {
      if (cell == null || cell === '') return '';
      const o = typeof cell === 'object' ? cell : { v: cell };
      const ref = colName(c) + (r + 1);
      if (typeof o.v === 'number' && Number.isFinite(o.v)) return `<c r="${ref}" s="${ST[o.s || 'dec']}"><v>${o.v}</v></c>`;
      return `<c r="${ref}" s="${ST[o.s || 'text']}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(o.v)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const cols = sh.cols ? `<cols>${sh.cols.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const freeze = sh.freeze ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sh.freeze}" topLeftCell="A${sh.freeze + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}${cols}<sheetData>${rows}</sheetData></worksheet>`;
  };
  const safe = n => String(n).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, k) => `<Override PartName="/xl/worksheets/sheet${k + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, k) => `<sheet name="${xmlEsc(safe(s.name))}" sheetId="${k + 1}" r:id="rId${k + 1}"/>`).join('')}</sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, k) => `<Relationship Id="rId${k + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${k + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: styles },
    ...sheets.map((s, k) => ({ name: `xl/worksheets/sheet${k + 1}.xml`, data: sheetXml(s) })),
  ];
  return zipFiles(files);
}

// Module Worker chạy chính file này – không có file thuật toán thứ hai.
if (typeof document === 'undefined' && typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.addEventListener('message', e => {
    try { self.postMessage({ ok: true, result: calculateNestingPro(e.data) }); }
    catch (err) { self.postMessage({ ok: false, error: String(err?.message || 'Không tính được phương án trải phôi.') }); }
  });
}

/* ========================================================================= */
/* XUẤT PDF SƠ ĐỒ CẮT (khổ A3 ngang, in xưởng) – không cần thư viện ngoài.    */
/* Mỗi trang dựng thành SVG rồi vẽ ra ảnh JPEG độ phân giải cao (200 dpi) bằng */
/* trình duyệt -> chữ tiếng Việt hiển thị đúng như trên màn hình (font Arial   */
/* của máy). PDF là bản xem / in; bản vẽ vector 1:1 dùng DXF.                  */
/* ========================================================================= */
const PDF_PAGE = { w: 1680, h: 1188, ptW: 1190.55, ptH: 841.89, dpi: 200 };   // A3 ngang: 420 × 297 mm (khung SVG 4 đơn vị / mm)
/** Vẽ một trang SVG (đã có width/height) ra JPEG. */
async function pdfRaster(svg) {
  const pxW = Math.round(420 / 25.4 * PDF_PAGE.dpi), pxH = Math.round(297 / 25.4 * PDF_PAGE.dpi);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = () => no(Error('Không dựng được trang PDF.')); img.src = url; });
    const cv = document.createElement('canvas'); cv.width = pxW; cv.height = pxH;
    const c = cv.getContext('2d'); c.fillStyle = '#ffffff'; c.fillRect(0, 0, pxW, pxH); c.drawImage(img, 0, 0, pxW, pxH);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9));
    if (!blob) throw Error('Trình duyệt không tạo được ảnh trang PDF.');
    return { data: new Uint8Array(await blob.arrayBuffer()), pxW, pxH };
  } finally { URL.revokeObjectURL(url); }
}
/** Ghép các trang ảnh JPEG thành file PDF 1.4 (mỗi trang một ảnh phủ kín khổ A3 ngang). */
function pdfBytes(pages, title = '') {
  const enc = new TextEncoder(), parts = [], offs = [];
  let len = 0;
  const put = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (n, body) => { offs[n] = len; put(`${n} 0 obj\n`); body(); put('\nendobj\n'); };
  const n = pages.length, pageObj = k => 4 + k * 3;
  put('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  obj(1, () => put('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => put(`<< /Type /Pages /Count ${n} /Kids [${pages.map((_, k) => `${pageObj(k)} 0 R`).join(' ')}] >>`));
  const ascii = String(title).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, c => (c === 'đ' ? 'd' : 'D')).replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '');
  obj(3, () => put(`<< /Title (${ascii}) /Producer (Cutting Plan) >>`));
  pages.forEach((p, k) => {
    const pg = pageObj(k), content = `q ${PDF_PAGE.ptW} 0 0 ${PDF_PAGE.ptH} 0 0 cm /Im0 Do Q`;
    obj(pg, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE.ptW} ${PDF_PAGE.ptH}] /Resources << /XObject << /Im0 ${pg + 2} 0 R >> >> /Contents ${pg + 1} 0 R >>`));
    obj(pg + 1, () => put(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(pg + 2, () => { put(`<< /Type /XObject /Subtype /Image /Width ${p.pxW} /Height ${p.pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.data.length} >>\nstream\n`); put(p.data); put('\nendstream'); });
  });
  const total = 4 + n * 3, xref = len;
  put(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) put(`${String(offs[i]).padStart(10, '0')} 00000 n \n`);
  put(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(len); let o = 0;
  for (const b of parts) { out.set(b, o); o += b.length; }
  return out;
}
/** Khung trang A3: tiêu đề, dòng phụ, số trang, khung viền; body = nội dung SVG (toạ độ khung 1680 × 1188). */
function pdfPageSVG({ title, sub, page, pages, body, foot = '' }) {
  const { w, h } = PDF_PAGE, F = 'font-family="Arial,Helvetica,sans-serif"';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#ffffff"/>`
    + `<rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="none" stroke="#5c47b3" stroke-width="2"/>`
    + `<text x="48" y="74" font-size="34" font-weight="700" fill="#2e1b70" ${F}>${esc(title)}</text>`
    + `<text x="48" y="110" font-size="21" fill="#4a4470" ${F}>${esc(sub)}</text>`
    + `<text x="${w - 48}" y="74" font-size="22" text-anchor="end" fill="#4a4470" ${F}>Trang ${page} / ${pages}</text>`
    + `<line x1="24" y1="128" x2="${w - 24}" y2="128" stroke="#5c47b3" stroke-width="1.5"/>`
    + body
    + `<text x="48" y="${h - 40}" font-size="17" fill="#7a7496" ${F}>${esc(foot)}</text>`
    + `<text x="${w - 48}" y="${h - 40}" font-size="17" text-anchor="end" fill="#7a7496" ${F}>Cutting Plan</text></svg>`;
}
/** Nhúng một SVG con (có viewBox) vào ô (x, y, w, h) của trang, giữ tỷ lệ X/Y. */
function pdfEmbed(svg, x, y, w, h) {
  const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 100 100';
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</svg>`;
}
/** Hàng chú giải: [{fill, edge, text, dash, round}] xếp nhiều cột từ (x, y). */
function pdfLegend(rows, x, y, colW = 520, perCol = 6) {
  const F = 'font-family="Arial,Helvetica,sans-serif"';
  return rows.map((r, k) => {
    const cx = x + Math.floor(k / perCol) * colW, cy = y + (k % perCol) * 32;
    const chip = r.round ? `<circle cx="${cx + 13}" cy="${cy - 7}" r="10" fill="${r.fill}" stroke="${r.edge}" stroke-width="1.5"${r.dash ? ' stroke-dasharray="4 2"' : ''}/>`
      : `<rect x="${cx}" y="${cy - 17}" width="26" height="20" rx="3" fill="${r.fill}" stroke="${r.edge}" stroke-width="1.5"${r.dash ? ' stroke-dasharray="4 2"' : ''}/>`;
    return chip + `<text x="${cx + 36}" y="${cy}" font-size="19" fill="#1d1652" ${F}>${esc(r.text)}</text>`;
  }).join('');
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
/** Bán thành phẩm: bảng màu RIÊNG (xanh ngọc / ô liu / vàng đất) + viền nét đứt – nhìn là biết không thuộc đơn hàng. */
const SEMI_COLORS = [['#bfe8ea', '#127077'], ['#d9e8c0', '#55701a'], ['#f1e2b0', '#866512']];
/** Màu BTP theo THỨ TỰ trong thư viện chiều dày đó (ô chọn và sơ đồ cùng màu); từ mã thứ 4 sinh thêm sắc xanh ngọc – ô liu – vàng đất. */
const semiColor = r => r < SEMI_COLORS.length ? SEMI_COLORS[r] : [hslHex((150 + r * 47) % 120 + 50, 45, 82), hslHex((150 + r * 47) % 120 + 50, 55, 30)];
const colorOfT = T => (T.semi ? semiColor(T.semiNo ?? 0) : colorOf(T.t));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pretty = n => {
  if (!Number.isFinite(n)) return '—';
  return (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
};
const parseNum = (raw, label, { integer = false, positive = false, minus = 0 } = {}) => {
  const txt = String(raw ?? '').replaceAll(',', '').trim();
  const v = txt === '' ? NaN : Number(txt);
  if (!Number.isFinite(v) || v < -minus || v > LIMIT || (positive && v <= 0)) throw Error(`${label}: số không hợp lệ.`);
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
  'pure-staggered': 'Một loại – tròn so le', 'pure-interlock': 'Một loại – xếp răng lược (hàng xen kẽ xoay 180°)', block: 'Ghép khối chặt suốt', free: 'Ghép tự do từng chiếc',
  'circle-strip': 'Tròn nhiều cỡ – xếp xen kẽ, dồn trái',
};
const strategyText = s => (STRATEGY[s.replace(/\+(fill|hole|btp|pocket)/g, '')] || s) + (s.includes('+fill') ? ' + chèn khe' : '') + (s.includes('+pocket') ? ' + điền ô kẹt' : '') + (s.includes('+hole') ? ' + chèn lỗ vành khuyên' : '') + (s.includes('+btp') ? ' + lấp bán thành phẩm' : '');

function drawSheet(res, gi) {
  const i = res.input, g = res.groups[gi], sheetW = g.W, sheetH = g.needH ?? g.H, cut = g.H - sheetH, SW = 1080, inset = 11, plotW = SW - 2 * inset;
  const SH = Math.round(Math.min(600, Math.max(300, plotW * sheetH / sheetW + 24)));
  const plotH = SH - 24, scale = Math.min(plotW / sheetW, plotH / sheetH);
  const W = sheetW * scale, H = sheetH * scale, x0 = inset + (plotW - W) / 2, y0 = 12 + (plotH - H) / 2;
  const pt = n => Number(n).toFixed(2);
  let body = '';
  // phần dư mép tờ: luôn ghi kích thước; tấm lẻ thu hồi (≥ ngưỡng, 1–2 dải) tô xanh, phần dư dưới ngưỡng ghi "hao phí"
  const rems = remsOf(g);
  const covered = (x, y, w, h) => rems.some(o => Math.max(0, Math.min(x + w, o.x + o.w) - Math.max(x, o.x)) * Math.max(0, Math.min(y + h, o.y + o.h) - Math.max(y, o.y)) > 0.5 * w * h);
  const label = (fx, fy, fw, fh, text, color) => {
    const fsz = Math.min(18, fh * 0.5, fw / text.length * 1.7);
    if (fsz >= 9) body += `<text x="${pt(fx + fw / 2)}" y="${pt(fy + fh / 2 + fsz * 0.35)}" font-size="${pt(fsz)}" fill="${color}" font-weight="700" font-family="Arial,sans-serif" text-anchor="middle">${text}</text>`;
  };
  for (const f0 of g.freeStrips || []) {
    const f = f0.side === 'bottom' ? { ...f0, h: f0.h - cut } : { ...f0, h: sheetH };
    if (Math.min(f.w, f.h) < 50) continue;                         // dải quá hẹp: chỉ ghi số, không vẽ khung
    const rx = f.side === 'right' ? sheetW - f.w : 0, ry = f.side === 'right' ? 0 : sheetH - f.h;
    if (covered(rx, ry, f.w, f.h)) continue;
    const fx = x0 + rx * scale, fy = y0 + ry * scale, fw = f.w * scale, fh = f.h * scale;
    body += `<rect x="${pt(fx)}" y="${pt(fy)}" width="${pt(fw)}" height="${pt(fh)}" fill="#fbf6ee" stroke="#c49a5a" stroke-width="1" stroke-dasharray="6 4"/>`;
    label(fx, fy, fw, fh, `${f.side === 'right' ? 'DƯ PHẢI' : 'DƯ DƯỚI'} ${pretty(f.w)} × ${pretty(f.h)}`, '#8a5a12');
  }
  rems.forEach(o => {
    const h = o.side === 'right' && o.h >= (g.Hn ?? sheetH) - 1e-6 ? sheetH : o.h;   // tăng khổ: vẽ hết bề rộng tờ thực tế
    const fx = x0 + o.x * scale, fy = y0 + o.y * scale, fw = o.w * scale, fh = h * scale;
    body += `<rect x="${pt(fx)}" y="${pt(fy)}" width="${pt(fw)}" height="${pt(fh)}" fill="#e3f8eb" stroke="#169a70" stroke-width="1.6"/>`;
    label(fx, fy, fw, fh, `TẤM LẺ THU HỒI ${pretty(o.w)} × ${pretty(o.h)}`, '#147451');
  });
  const m = i.margin * scale;
  if (m >= 3) body += `<rect x="${pt(x0 + m)}" y="${pt(y0 + m)}" width="${pt(W - 2 * m)}" height="${pt(H - 2 * m)}" fill="none" stroke="#ddc9fa" stroke-width="1"/>`;
  let labels = 0;
  for (const p of g.items) {
    const T = res.types[p.t], [fill, edge] = colorOfT(T);
    const xx = x0 + p.x * scale, yy = y0 + p.y * scale, ww = p.w * scale, hh = p.h * scale;
    const inner = T.allowance / 2 * scale;
    if (T.poly) {
      const V = turnVerts(T.poly.verts, T.cw, T.ch, polyAng(T, p));
      let dpath = `M${pt(xx + V[0].x * scale)} ${pt(yy + V[0].y * scale)}`;
      V.forEach((v, n) => { const q = V[(n + 1) % V.length], X = pt(xx + q.x * scale), Y = pt(yy + q.y * scale);
        if (!v.b) { dpath += `L${X} ${Y}`; return; }
        const th = 4 * Math.atan(v.b), r = Math.hypot(q.x - v.x, q.y - v.y) / (2 * Math.sin(Math.abs(th) / 2)) * scale;
        dpath += `A${pt(r)} ${pt(r)} 0 ${Math.abs(th) > Math.PI ? 1 : 0} ${v.b > 0 ? 1 : 0} ${X} ${Y}`; });
      body += `<path d="${dpath}Z" fill="${fill}" stroke="${edge}" stroke-width="0.9"/>`;
    } else if (p.circle) {
      body += `<circle cx="${pt(xx + ww / 2)}" cy="${pt(yy + hh / 2)}" r="${pt(ww / 2)}" fill="${fill}" stroke="${edge}" stroke-width="${p.semi ? 1.3 : 1}"${p.semi ? ' stroke-dasharray="5 3"' : ''}/>`;
      if (p.ring) body += `<circle cx="${pt(xx + ww / 2)}" cy="${pt(yy + hh / 2)}" r="${pt(p.hole / 2 * scale)}" fill="#f1ebfd" stroke="${edge}" stroke-width="1"/>`;
      if (!p.ring && inner > 1.4 && ww - 2 * inner > 3) body += `<circle cx="${pt(xx + ww / 2)}" cy="${pt(yy + hh / 2)}" r="${pt(ww / 2 - inner)}" fill="none" stroke="${edge}" stroke-opacity=".45" stroke-width=".8"/>`;
    } else {
      body += `<rect x="${pt(xx)}" y="${pt(yy)}" width="${pt(ww)}" height="${pt(hh)}" fill="${fill}" stroke="${edge}" stroke-width="${p.semi ? 1.3 : 0.9}"${p.semi ? ' stroke-dasharray="5 3"' : ''}/>`;
      if (p.rot) body += `<rect x="${pt(xx)}" y="${pt(yy)}" width="${pt(ww)}" height="${pt(hh)}" fill="url(#np-rot)"/>`;
      if (inner > 1.4 && ww - 2 * inner > 3 && hh - 2 * inner > 3) body += `<rect x="${pt(xx + inner)}" y="${pt(yy + inner)}" width="${pt(ww - 2 * inner)}" height="${pt(hh - 2 * inner)}" fill="none" stroke="${edge}" stroke-opacity=".45" stroke-width=".8"/>`;
    }
    const lab = T.poly ? polyTurn(T.poly.label.x, T.poly.label.y, T.cw, T.ch, polyAng(T, p)) : null;
    const fs = Math.min(13, (lab ? T.poly.label.r * 2 * scale : hh) * 0.32, (lab ? T.poly.label.r * 4 * scale : ww) / Math.max(3, String(T.name).length) * 1.6);
    if (labels < 600 && fs >= 8) {
      labels++;
      const ly = lab ? yy + lab[1] * scale + fs * 0.35 : p.ring ? yy + (ww - p.hole * scale) / 4 + fs * 0.35 : yy + hh / 2 + fs * 0.35;
      body += `<text x="${pt(lab ? xx + lab[0] * scale : xx + ww / 2)}" y="${pt(ly)}" font-size="${pt(fs)}" fill="#1d1652" font-weight="700" font-family="Arial,sans-serif" text-anchor="middle">${esc(T.name)}</text>`;
    }
  }
  if (i.cutMethod === 'shear') {
    const main = g.cuts.filter(c => c.seq > 0);
    for (const c of g.cuts) {
      const color = c.rem || c.seq === -1 ? '#169a70' : '#d58027', w = c.seq === 0 ? 0.9 : c.rem ? 2.2 : 1.6;
      body += `<line x1="${pt(x0 + c.x1 * scale)}" y1="${pt(y0 + c.y1 * scale)}" x2="${pt(x0 + c.x2 * scale)}" y2="${pt(y0 + c.y2 * scale)}" stroke="${color}" stroke-width="${w}"${c.seq === 0 ? ' stroke-dasharray="4 3"' : ''}/>`;
    }
    if (main.length <= 80) for (const c of main) {
      const mx = x0 + (c.x1 + c.x2) / 2 * scale, my = y0 + (c.y1 + c.y2) / 2 * scale;
      body += `<circle cx="${pt(mx)}" cy="${pt(my)}" r="12" fill="#fff7ea" stroke="#d58027" stroke-width="1.2"/><text x="${pt(mx)}" y="${pt(my + 4)}" font-size="16" font-weight="800" fill="#9a520f" font-family="Arial,sans-serif" text-anchor="middle">${c.seq}</text>`;
    }
  }
  const defs = `<defs><pattern id="np-rot" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#1d1652" stroke-opacity=".22" stroke-width="1.4"/></pattern></defs>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" role="img" aria-label="Sơ đồ ${sheetRange(res, gi)}, ${g.items.length} chi tiết" preserveAspectRatio="xMidYMid meet">${defs}<rect width="${SW}" height="${SH}" fill="#faf7ff"/><rect x="${pt(x0)}" y="${pt(y0)}" width="${pt(W)}" height="${pt(H)}" fill="#f1ebfd" stroke="#793afa" stroke-width="2"/>${body}</svg>`;
  const title = `${sheetRange(res, gi).toUpperCase()} · ${g.remnantStock ? 'TẤM LẺ KHO' : 'TẤM'} ${pretty(g.Wn ?? sheetW)} × ${pretty(g.Hn ?? sheetH)} × ${pretty(i.thickness)} mm${needText(g) ? ` · ${needText(g).toUpperCase()}` : ''}${g.lot ? ' · ' + g.lot : ''}`;
  const download = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH + 40}"><rect width="${SW}" height="${SH + 40}" fill="#faf7ff"/><text x="${SW / 2}" y="27" fill="#675295" font-size="20" text-anchor="middle" font-weight="700" font-family="Arial,sans-serif">${esc(title)} (×${g.n})</text><svg x="0" y="38" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">${svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg></svg>`;
  return { svg, download, title };
}

const CSS = `
.np{font-size:16px;color:#191c69;min-width:0}.np *{box-sizing:border-box}
.np .np-top{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin:0 0 12px}
.np .np-sub{font-size:16px;color:#706d99;margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.tool-heading>.np-header-materials{margin-left:auto;max-width:100%}
.np .np-materials{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end;margin-left:auto}
.np .np-materials>strong{font-weight:800;margin-right:4px}
.np .np-materials button,.np .np-toggle button{border:1px solid #dfd3fc;border-radius:11px;background:#fff;color:#2e1b70;min-height:40px;padding:7px 12px;font-weight:750;font-size:16px;white-space:nowrap}
.np .np-materials button.is-active,.np .np-toggle button.is-active{color:#fff;border-color:transparent;background:linear-gradient(120deg,#aa42f9,#7732e9)}
.np .np-material-list{background:#fff;min-height:40px;width:120px;max-width:100%;min-width:0;font-size:16px;font-weight:650;color:#5324b4;border:1px solid #dac6fb;border-radius:11px;padding:6px 9px}
.np .np-warn{font-size:16px;color:#aa3c3c;margin:0 0 8px}
.np .np-grid{display:grid;grid-template-columns:minmax(420px,min(37%,540px)) minmax(0,1fr);gap:12px;align-items:start}
.np .np-panel{background:#fff;border:1px solid #e4d3ff;border-radius:16px;padding:14px 15px;min-width:0}
.np .np-title{color:#592ac1;font-size:20px;margin:0 0 12px;font-weight:850}
.np .np-row{display:grid;gap:9px;margin-bottom:11px}.np .np-row.three{grid-template-columns:repeat(3,minmax(0,1fr))}
.np .np-row.p1{grid-template-columns:1.5fr 1.1fr .9fr}
.np label span{font-size:16px;font-weight:750;color:#251973;display:block;margin-bottom:4px;white-space:nowrap}
.np input,.np select.np-shape{background:#fff;border:1px solid #d4b7ff;border-radius:10px;min-height:40px;width:100%;font-size:17px;color:#24156c;padding:6px 9px;outline:none;font-variant-numeric:tabular-nums;font-family:inherit}
.np input:focus,.np select.np-shape:focus{border-color:#7442ff;box-shadow:0 0 0 3px #7542ff21}
.np .is-kerf input{border:2px solid #5a9eff}.np .is-allow input{border:2px solid #f3a535}.np .is-rem input{border:2px solid #4cc795}
.np .np-methods{margin:2px 0 14px}.np .np-methods h3{font-size:17px;margin:0 0 7px;color:#5c29bf;font-weight:850}
.np .np-toggle{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.np .np-toggle button{width:100%}
.np .np-hint{font-size:16px;color:#65588b;margin:6px 0 0}
.np .np-parts-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:4px 0 6px}
.np .np-parts-head strong{font-size:18px;color:#5c29bf;font-weight:850}.np .np-parts-head small{font-size:16px;color:#6a598b;font-weight:700}
.np .np-parts{max-height:560px;overflow:auto;padding-right:4px}
.np .np-part{border-top:1px solid #f0e8fc;padding-top:8px;margin-top:4px}
.np .np-part-head{display:flex;align-items:center;gap:8px;margin:0 0 7px;font-size:16px;font-weight:850;color:#5c29bf}
.np .np-part-head i{display:inline-block;width:18px;height:14px;border:1px solid #5c47b3;border-radius:3px}
.np .np-part-head i.round{border-radius:50%;width:15px;height:15px}
.np .np-rot{display:inline-flex;align-items:center;gap:6px;font-size:16px;font-weight:700;color:#326bab;margin-left:auto;cursor:pointer}
.np .np-rot input{width:17px;height:17px;min-height:17px;accent-color:#326bab}.np .np-rot.is-off{opacity:.45;cursor:default}
.np .np-del{background:#fff5f6;border:1px solid #f0b7c1;color:#b52441;border-radius:8px;padding:2px 9px;font-size:16px;font-weight:700}
.np .np-add{width:100%;margin:6px 0 2px;min-height:40px;border:2px dashed #b59efc;border-radius:11px;background:#faf7ff;color:#632dd6;font-size:16px;font-weight:800}
.np .np-add:hover{background:#f1ebfd}
.np .np-error{font-size:16px;color:#b52441;font-weight:650;margin:10px 0 0;line-height:1.4}.np .np-error:empty{display:none}
.np .np-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 9px;max-height:132px;overflow:auto}
.np .np-tab{border:1.5px solid #e1d5f9;border-radius:11px;background:#fff;padding:5px 11px;text-align:left;color:#29234f;min-width:118px}
.np .np-tab b{display:block;font-size:16px;color:#5c29bf;font-weight:850}.np .np-tab small{display:block;font-size:16px;color:#655587}
.np .np-tab.is-active{border-color:#7930e8;background:#f6f0ff;box-shadow:0 0 0 3px #7542ff1c}
.np .np-tab .np-tab-rem{color:#147451;font-weight:750}
.np .np-figure{background:#faf7ff;border:1px solid #e7dafa;border-radius:12px;padding:7px}
.np .np-fig-title{text-align:center;font-size:17px;color:#675295;font-weight:800;margin:0 0 3px}
.np .np-preview svg{width:100%;height:auto;display:block}
.np .np-legend{display:flex;gap:6px 14px;flex-wrap:wrap;color:#58438f;font-size:16px;font-weight:700;margin:4px 0 0;padding-left:4px}
.np .np-legend span{display:inline-flex;align-items:center;gap:6px}
.np .np-chip{display:inline-block;width:18px;height:13px;border:1px solid;border-radius:3px}.np .np-chip.round{border-radius:50%;width:14px;height:14px}
.np .np-chip.hatch{background:repeating-linear-gradient(45deg,#fff,#fff 3px,#cfc8e6 3px,#cfc8e6 5px);border-color:#6850aa}
.np .np-caption{display:flex;justify-content:space-between;gap:9px;margin-top:9px;flex-wrap:wrap;align-items:baseline;color:#5b2eb7}
.np .np-summary{font-size:19px;font-weight:850}.np .np-proof{font-size:16px;font-weight:750;color:#147451}.np .np-proof.gap{color:#a3500a}
.np .np-footrow{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-top:4px}
.np .np-strategy{color:#6a598b;font-size:16px;margin:0;flex:1}
.np .np-export{background:#f9f6ff;border:1px solid #b59efc;border-radius:9px;color:#632dd6;padding:5px 12px;min-height:35px;font-size:16px;font-weight:700}
.np .np-status{font-size:16px;color:#65539e;margin-top:6px}.np .np-status:empty{display:none}
.np .np-spin{width:15px;height:15px;border-radius:50%;border:2px solid #d1bef5;border-top-color:#662be8;display:inline-block;animation:np-spin .7s linear infinite;margin-left:7px;vertical-align:middle}
@keyframes np-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.np .np-spin{animation:none}}
.np .np-list{margin-top:12px;border:1px solid #e6dafa;border-radius:12px;overflow:hidden}.np .np-list[hidden]{display:none}
.np .np-list-title{display:flex;justify-content:space-between;gap:10px;padding:10px 13px;background:#f8f5ff;color:#5a2bb8;font-size:16.5px;font-weight:800}
.np .np-list-title small{font-size:16px;color:#655587;font-weight:700}
.np .np-scroll{overflow-x:auto}
.np table{width:100%;border-collapse:collapse;font-size:16px;color:#29234f}
.np th{background:#fcfaff;color:#695494;font-weight:750;border-bottom:1px solid #e8dff6;padding:8px 10px;white-space:nowrap;text-align:left}
.np td{border-bottom:1px solid #f0eaf9;padding:7px 10px;font-variant-numeric:tabular-nums;white-space:nowrap}
.np .num{text-align:right}.np .ok{color:#0f6e56;font-weight:800}
.np .np-total td{font-weight:850;background:#f8f5ff;color:#5328a9}
.np .np-results{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:10px}
.np .np-res{background:#fff;border:1px solid #e1d5f9;border-radius:14px;padding:10px 13px;min-height:79px;min-width:0}
.np .np-res.em{background:linear-gradient(115deg,#a943f7,#7930e8);color:#fff;border-color:transparent}
.np .np-res strong{font-size:16px;display:block}.np .np-res output{font-size:22px;font-weight:850;display:block;overflow-wrap:anywhere}
.np .np-res small{display:block;font-size:16px;opacity:.85;font-weight:650}
.np .np-note{font-size:16px;color:#6a6691;text-align:center;margin:7px 0 0;line-height:1.45}
.np .np-stock{display:grid;grid-template-columns:1.05fr .95fr .95fr .7fr 1.15fr 34px;gap:6px;align-items:end;margin-bottom:6px}
.np .np-stock select,.np .np-stock input{min-height:36px;font-size:16px;padding:4px 6px;min-width:0}
.np .np-stock select{border:1px solid #d4b7ff;border-radius:10px;background:#fff;color:#24156c;width:100%;font-family:inherit}
.np .np-stock.is-rem select,.np .np-stock.is-rem input{background:#f3fcf7;border-color:#8ed8c5}
.np .np-stock .np-x{background:#fff5f6;border:1px solid #f0b7c1;color:#b52441;border-radius:8px;min-height:36px;padding:0 9px;font-weight:700}
.np .np-stock-head{display:grid;grid-template-columns:1.05fr .95fr .95fr .7fr 1.15fr 34px;gap:6px;font-size:16px;font-weight:750;color:#251973;margin:0 0 3px}
.np .np-stock-head span:last-child{width:34px}
.np .np-presets{display:flex;gap:6px;flex-wrap:wrap;margin:2px 0 12px}
.np .np-presets button{border:1px dashed #b59efc;background:#faf7ff;color:#632dd6;border-radius:9px;padding:4px 10px;font-size:16px;font-weight:750}
.np .np-presets button.rem{border-color:#4cc795;color:#147451;background:#f3fcf7}
.np .np-section{font-size:17px;color:#5c29bf;font-weight:850;margin:4px 0 6px;display:flex;justify-content:space-between;align-items:baseline}
.np .np-section small{font-size:16px;color:#6a598b;font-weight:650}
.np details.np-info{border:1px solid #eee5fb;border-radius:11px;padding:6px 10px;margin:0 0 12px}
.np details.np-info summary{cursor:pointer;font-weight:800;color:#5c29bf;font-size:16px}
.np details.np-info .np-row{margin:8px 0 2px}
.np .np-row.two{grid-template-columns:repeat(2,minmax(0,1fr))}
.np .np-total-bar{display:grid;grid-template-columns:1.5fr repeat(4,minmax(0,1fr));gap:1px;background:#d9c9fb;border:1px solid #d9c9fb;border-radius:13px;overflow:hidden;margin:0 0 10px}
.np .np-total-bar[hidden]{display:none}
.np .np-total-bar>div{background:#fff;padding:7px 11px;min-width:0}
.np .np-tb-main{background:linear-gradient(115deg,#a943f7,#7930e8)!important;color:#fff}
.np .np-tb-main span{display:block;font-size:16px;font-weight:800;letter-spacing:.06em;opacity:.9}
.np .np-tb-main strong{display:block;font-size:26px;font-weight:900;line-height:1.15}
.np .np-tb-main small{display:block;font-size:16px;opacity:.88}
.np .np-tb-cell span{display:block;font-size:16px;color:#6a598b;font-weight:700}
.np .np-tb-cell small.np-tb-use{display:block;font-size:16px;color:#0d6b4c;font-weight:700;margin-top:2px}
.np .np-tb-cell small.np-tb-use b{display:inline;font-size:16px;color:#0d6b4c;margin:0}
.np .np-tb-cell b{display:block;font-size:18px;color:#2e1b70;font-weight:850;margin-top:3px;overflow-wrap:anywhere}
@media(max-width:820px){.np .np-total-bar{grid-template-columns:repeat(2,minmax(0,1fr))}.np .np-tb-main{grid-column:1/-1}}
.np details.np-barem textarea{width:100%;min-height:96px;margin:4px 0 6px;border:1px solid #d4b7ff;border-radius:10px;padding:7px 9px;font:16px/1.4 ui-monospace,Consolas,monospace;color:#24156c;resize:vertical}
.np details.np-barem summary small{font-size:16px;font-weight:700;color:#147451;margin-left:6px}
.np details.np-barem code{background:#f3eefc;border-radius:5px;padding:0 4px}
.np .np-list.no-hole .np-col-hole{display:none}
.np .np-std-src{margin:8px 0 8px}
.np .np-cap{display:flex;align-items:center;gap:8px;margin:0 0 4px}
.np .np-cap span{margin:0!important;font-size:16px}
.np .np-cap input{width:76px;min-height:36px;text-align:right;font-weight:800}
.np .np-cap small{font-weight:800;color:#5c29bf}
.np #np-std-copy{margin:2px 0 8px}
.np #np-table-box[hidden]{display:none}
.np th.np-ref,.np td.np-ref{color:#7a7496}.np th.np-ref small{font-weight:600}
.np th.np-real{background:#e8f8ef;color:#0d6b4c}.np td.np-real{background:#f2fcf6;font-weight:850;color:#0d6b4c;font-size:16px}
.np .np-missing{margin-top:12px;border:2px solid #e6a23c;background:#fff8ec;border-radius:12px;padding:10px 13px;color:#6b4208;font-size:16px;line-height:1.45}
.np .np-missing[hidden]{display:none}
.np .np-missing>b,.np .np-missing>span{display:block}
.np .np-missing ul{margin:5px 0 8px 18px;padding:0}
.np .np-missing code{background:#fff;border:1px solid #f0cf96;border-radius:5px;padding:0 5px;font-weight:700}
.np sup.np-cap-tag{font-size:16px;font-weight:800;color:#4a1fa8}
.np .np-est sup{font-size:16px;font-weight:800;color:#c2410c;margin-left:2px}
.np .np-est{color:#8a5a12;font-style:normal}
.np td.np-k{color:#4a1fa8;font-weight:900}
.np td.dev-up{color:#a3500a;font-weight:800}.np td.dev-down{color:#0f6e56;font-weight:800}
.np .is-margin input{border:2px solid #16a374;background:#f2fdf8;font-weight:850;color:#0d6b4c}
.np .is-margin span{color:#0d6b4c}
.np details.np-semi{border-color:#bfe3e5;background:#f7fcfc}
.np details.np-semi summary{color:#127077}
.np .np-semi-list{margin:8px 0 6px;display:grid;gap:6px}
.np .np-semi-pick{display:flex;align-items:center;gap:9px;border:1px solid #cfe9ea;border-radius:10px;padding:7px 10px;background:#fff;cursor:pointer;font-weight:750;color:#1d3f52}
.np .np-semi-pick input{width:19px;min-height:19px;flex:none;accent-color:#127077}
.np .np-semi-pick.is-on{border-color:#127077;background:#eaf7f8}
.np .np-semi-pick.is-off{opacity:.5;cursor:not-allowed}
.np .np-semi-no{flex:none;min-width:22px;height:22px;border-radius:50%;background:#127077;color:#fff;font-size:16px;display:inline-flex;align-items:center;justify-content:center}
.np .np-semi-pick small{margin-left:auto;font-weight:650;color:#4d6e78;font-size:16px}
.np .np-semi-tag{display:inline-block;font-size:16px;font-weight:850;font-style:normal;color:#127077;background:#dff3f4;border:1px solid #9fd3d6;border-radius:5px;padding:0 4px;margin-left:5px;vertical-align:1px}
.np details.np-semi-lib{margin:6px 0 2px}.np details.np-semi-lib summary{font-size:16px;font-weight:750;color:#4d6e78;cursor:pointer}
.np details.np-semi-lib textarea{width:100%;margin-top:6px;border:1px solid #bfe3e5;border-radius:10px;padding:7px 9px;font:16px/1.4 Consolas,monospace;color:#1d3f52}
.np .np-list-stock{padding:0 16px 10px;font-weight:800;color:#2e1b70;font-size:16px}
.np tr.np-semi-row td{background:#eaf7f8}
.np tr.np-semi-head td{background:#d3eef0;color:#0e5a60;font-weight:850;font-size:16px}
.np .np-strip-rule{margin:-4px 0 12px}.np .np-strip-rule [hidden]{display:none}
.np .np-strip-rule .np-cap span{font-size:16px;color:#0d6b4c}
/* De xuat khi can: label tren / input duoi, ba o bang nhau tren toan bo be rong. */
.np .np-tol-box{margin:0 0 12px;padding:8px 12px;border:2px solid #e6a23c;border-radius:12px;background:#fff8ec}
.np .np-tol-content{display:grid;gap:7px;margin-top:8px}
.np details.np-fold>summary{display:flex;align-items:center;gap:8px;list-style:none;cursor:pointer}
.np details.np-fold>summary::-webkit-details-marker{display:none}
.np details.np-fold>summary::after{content:'';width:8px;height:8px;flex:none;margin-left:auto;margin-right:2px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(-2px) rotate(45deg)}
.np details.np-fold[open]>summary::after{transform:translateY(2px) rotate(225deg)}
.np .np-tol-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;min-width:0}
.np .np-tol-heading b{flex:1;min-width:0;font-size:17px;color:#8a4b06;font-weight:850;line-height:1.25}
.np .np-tol-unit{flex:none;color:#8a4b06;background:#fff;border:1px solid #efc57e;border-radius:7px;padding:2px 8px;font-size:16px;font-weight:800;line-height:1.3}
.np .np-tol-hint{margin:0;color:#8a5a12;font-size:16px;line-height:1.38;font-weight:600}
.np .np-tol-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:end;min-width:0}
.np .np-tol-fields label{display:flex;flex-direction:column;gap:4px;min-width:0;margin:0}
.np .np-tol-fields label span{display:block;margin:0;text-align:center;white-space:normal;font-size:16px;font-weight:800;line-height:1.25;color:#8a4b06}
.np .np-tol-fields input{display:block;width:100%;min-width:0;min-height:40px;padding:5px 7px;border:2px solid #e6a23c;border-radius:9px;background:#fff;font-size:19px;font-weight:850;color:#8a4b06;text-align:center;font-variant-numeric:tabular-nums}
.np .np-tol-fields input:focus{border-color:#b56b05;box-shadow:0 0 0 3px #e6a23c33}
.np .np-plan.is-enlarge{border-color:#e6a23c;background:#fff8ec}
.np .np-plan.is-enlarge.is-active{border-color:#c2410c;box-shadow:0 0 0 3px #e6a23c33}
.np .np-plan.is-enlarge b{color:#a3500a}
.np .np-enlarge-warn{margin:0 0 8px;padding:7px 11px;border-radius:10px;background:#fff1dc;color:#8a4b06;font-weight:750;font-size:16px}
.np .np-enlarge-warn[hidden]{display:none}
.np .np-remnant-box{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 0 12px;padding:9px 12px;border:2px solid #16a374;border-radius:12px;background:linear-gradient(110deg,#e6fbf2,#f4fffa);cursor:text}
.np .np-remnant-box span{white-space:normal;margin:0}
.np .np-rb-text{flex:1 1 auto;min-width:0}
.np .np-rb-text b{display:block;font-size:16.5px;color:#0d6b4c;font-weight:850}
.np .np-rb-text small{display:block;font-size:16px;color:#3f7f69;line-height:1.3;font-weight:600}
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
.np .np-plan b{display:block;font-size:16px;color:#5c29bf;font-weight:850}
.np .np-plan big{display:block;font-size:19px;font-weight:850;margin:1px 0}
.np .np-plan small{display:block;font-size:16px;color:#655587;line-height:1.35}
.np .np-opts{margin-top:12px;border:1px solid #e6dafa;border-radius:12px;overflow:hidden}.np .np-opts[hidden]{display:none}
.np .np-opts tr.is-chosen td{background:#f6f0ff;font-weight:800;color:#4d21b8}
.np .np-opts td.na{color:#a3500a}
.np .np-chip.ring{border-radius:50%;width:14px;height:14px;box-shadow:inset 0 0 0 4px #fff}

/* Readability floor: no UI text smaller than 16px, including native small/sup/sub. */
.np :is(small, sub, sup){font-size:max(16px, .833333em)}
@media(max-width:680px){.np .np-stock,.np .np-stock-head{grid-template-columns:1fr 1fr 1fr}.np .np-stock-head{display:none}}
@media(max-width:1260px){.np .np-grid{grid-template-columns:minmax(0,1fr)}.np .np-materials{justify-content:flex-start;margin-left:0}}
@media(max-width:820px){.np .np-results{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:680px){.np .np-row.three,.np .np-row.p1{grid-template-columns:repeat(2,minmax(0,1fr))}.np .np-row.p1 label:first-child{grid-column:1/-1}.np label span{white-space:normal}}
.np .np-auto{display:inline-flex;align-items:center;gap:6px;font-size:16px;font-weight:800;color:#1f7a55;cursor:pointer;margin-left:auto;margin-right:14px}
.np .np-auto input{width:17px;height:17px;accent-color:#169a70}
.np .np-guide-btn{border:1px solid #cdb8fb;background:#fff;color:#5c29bf;border-radius:10px;padding:6px 14px;font-size:16px;font-weight:800;cursor:pointer}
.np .np-guide-btn[aria-expanded="true"]{background:#5c29bf;color:#fff}
.np .np-guide{border:1px solid #d9c9fb;border-radius:14px;background:#fff;padding:12px 18px;margin:0 0 14px;font-size:16px;line-height:1.5;color:#2c2552}
.np .np-guide[hidden]{display:none}.np .np-guide h3{margin:10px 0 4px;font-size:16px;color:#4d21b8}.np .np-guide h3:first-child{margin-top:0}
.np .np-guide ol,.np .np-guide ul{margin:2px 0 4px;padding-left:22px}.np .np-guide li{margin:2px 0}
.np .np-out{display:block;padding:7px 2px;font-weight:750;color:#3e2391;font-size:16px}
.np .np-import{display:flex;flex-wrap:wrap;align-items:center;gap:8px;border:1px solid #e6dafa;background:#fbf9ff;border-radius:11px;padding:8px 10px;margin:0 0 12px}
.np .np-import>b{color:#5c29bf;font-size:16px;font-weight:850;margin-right:2px}.np .np-import small{color:#6a598b;font-size:16px}
.np .np-imp{border:1px solid #d9c9fb;border-radius:12px;padding:10px 12px;margin:0 0 12px;background:#fff}.np .np-imp[hidden]{display:none}
.np .np-imp h4{margin:0 0 6px;font-size:16px;color:#4d21b8;display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.np .np-imp ul{margin:4px 0 6px;padding-left:20px;font-size:16px;line-height:1.4}.np .np-imp .bad{color:#b52441}.np .np-imp .warn{color:#8a5a00}.np .np-imp .ok{color:#1f7a55}
.np .np-imp-g{border:1px solid #eee5fb;border-radius:10px;padding:7px 10px;margin:6px 0;display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between}
.np .np-imp-g b{color:#3e2391;font-size:16px}.np .np-imp-g small{color:#6a598b;font-size:16px;display:block}.np .np-imp-g.is-bad{border-color:#f0c2cc;background:#fff7f9}
.np .np-imp table{width:100%;border-collapse:collapse;font-size:16px;margin:6px 0}.np .np-imp th,.np .np-imp td{border-bottom:1px solid #eee5fb;padding:4px 6px;text-align:left}
.np .np-imp td.num,.np .np-imp th.num{text-align:right}.np .np-imp tr.is-off td{color:#9a8fb5}
.np .np-imp-layers{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}.np .np-imp-layers label{border:1px solid #e6dafa;border-radius:8px;padding:2px 8px;font-size:16px;cursor:pointer}
.np .np-imp-act{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
`;

/** Hướng dẫn sử dụng – chỉ nói làm được gì và dùng thế nào (không nêu cách máy tính).
 *  Trang chủ (app.js) đọc GUIDE để hiện tab "Hướng dẫn sử dụng" cạnh tên tool; nếu trang chủ chưa hỗ trợ, tool tự hiện nút. */
export const GUIDE = `
<h3>Chức năng</h3>
<ul><li>Tính <b>định mức xuất thép tấm</b> từ kích thước thành phẩm: số tờ, sơ đồ cắt từng tờ, tấm lẻ thu hồi, khối lượng xuất kho và <b>hệ số hao phí</b> (tính trên khối lượng thành phẩm).</li>
<li>Chi tiết: chữ nhật, tròn, vành khuyên, đa giác lấy từ bản vẽ DXF. Phương pháp cắt: Laser / Plasma hoặc Chặt sấn.</li>
<li>Ghép nhiều chi tiết trên cùng tờ, nhiều khổ tôn, tận dụng tấm lẻ trong kho, lấp bán thành phẩm vào phần dư.</li>
<li>Xuất: DXF cho máy cắt (mỗi tờ một file), DXF cutting plan có khung tên, PDF in xưởng, Excel tổng hợp.</li></ul>
<h3>Cách dùng</h3>
<ol><li>Chọn <b>vật liệu</b> (trên cùng bên phải), <b>phương pháp cắt</b>, chiều dày, mạch cắt, chừa mép và khổ tôn ở <b>Kho phôi</b>.</li>
<li>Nhập chi tiết theo một trong ba cách:
 <ul><li><b>Nhập tay</b>: điền tên, hình dạng, kích thước thành phẩm, số lượng; bấm “Thêm chi tiết” để thêm dòng.</li>
 <li><b>Nhập Excel</b>: dùng form mẫu cutting plan (sheet 1_BOM, 2_Kho_phoi, 3_Thong_so_cat), chọn trình cắt rồi bấm “Nạp”.</li>
 <li><b>Nhập DXF</b>: chọn bản vẽ; xem bảng chi tiết nhận được, bỏ tích lớp khung bản vẽ nếu có, rồi “Thay” hoặc “Thêm vào danh sách”.</li></ul></li>
<li><b>Một chi tiết – Tự động</b> (mặc định): máy xếp tối đa lên một tờ khổ chuẩn và cho hao phí kiểu barem (cắt hết tờ, không trừ thu hồi). Bỏ tích “Tự động” để nhập số lượng theo đơn hàng.</li>
<li>Kết quả cập nhật ngay bên phải: hao phí chung, xuất kho, tấm lẻ thu hồi, sơ đồ từng tờ. Các thẻ “⚠ cần duyệt” là đề xuất tăng khổ / giảm kích thước – chỉ dùng khi người có thẩm quyền đồng ý.</li>
<li>Điền <b>Hồ sơ cutting plan</b> (dự án, số bản vẽ, người lập) rồi xuất DXF / PDF / Excel.</li></ol>
<h3>Lưu ý</h3>
<ul><li>Kích thước nhập là <b>thành phẩm</b>; dư gia công là tổng (không phải mỗi bên), ví dụ tiện D300 → dư 5 → cắt D305.</li>
<li>Tính theo khổ tôn danh nghĩa. Mọi sơ đồ đều được kiểm tra tự động: không chồng lấn, đủ mạch cắt, không lấn mép, đủ số lượng.</li>
<li>Máy ghi “Số tờ tối thiểu – đã chứng minh” khi không thể ít tờ hơn.</li></ul>`;

const DEFAULT_STATE = {
  auto: true, thickness: '20', gap: '3', margin: '0', remnantMin: '200', remnantMinLong: '500', longStripMin: '300', widthTol: '10', lengthTol: '10', shrinkTol: '0.5', density: '7850', cutMethod: 'laser', material: 0,
  thick: { laser: '20', shear: '3' }, gaps: { laser: '3', shear: '0' }, margins: { laser: '0', shear: '0' },   // chừa mép mặc định 0: bề rộng tôn thực tế thường > khổ danh nghĩa (anh xác nhận)
  stocks: {
    laser: [{ kind: 'std', W: '6000', H: '2000', qty: '', lot: '' }],
    shear: [{ kind: 'std', W: '2440', H: '1220', qty: '', lot: '' }],
  },
  info: { project: '', drawingNo: '', material: '', drawnBy: '' },
  // BÁN THÀNH PHẨM: thư viện mã theo chiều dày (mác dùng lẫn) – anh bổ sung từ master data sau; chỉ mã cùng chiều dày tờ đang tính được dùng
  // btpLib: thư viện BTP (TẠM – dán từ Google Sheets cho tới khi có database): mỗi dòng Mã ⇥ Dày ⇥ Kích thước TP [⇥ Dư gia công]
  // btpPick: mã BTP được tích cho phép ghép cắt cùng đơn hàng (mặc định KHÔNG tích – kỹ thuật chủ động chọn)
  btpLib: '', btpPick: {},
  barem: '', stdSource: 'table', squareCaps: { laser: '15', shear: '14' },
  parts: [
    { name: 'CT1', shape: 'rect', partW: '490', partH: '555', diameter: '310', inner: '', allowance: '0', allowanceIn: '5', qty: '30', rotate: true },
    { name: 'CT2', shape: 'rect', partW: '300', partH: '200', diameter: '310', inner: '', allowance: '0', allowanceIn: '5', qty: '60', rotate: true },
    { name: 'CT3', shape: 'circle', partW: '300', partH: '300', diameter: '310', inner: '', allowance: '5', allowanceIn: '5', qty: '12', rotate: true },
    { name: 'CT4', shape: 'ring', partW: '300', partH: '300', diameter: '900', inner: '640', allowance: '5', allowanceIn: '5', qty: '4', rotate: true },
  ],
};
const ALLOW_DEFAULT = { rect: '0', circle: '5', ring: '5' };
const PRESETS = { laser: [[6000, 2000], [3000, 1500], [2440, 1220]], shear: [[2440, 1220], [3000, 1500], [6000, 2000]] };
let savedState = null;
/** Phần tờ thực sử dụng (đơn vị TẤM): 1 − tấm lẻ thu hồi / diện tích tờ. Không thu hồi = 1 tấm. Ví dụ thu hồi 2 m trên tờ 6 m: 4/6 = 0,667 tấm. */
const remsOf = g => g.remnants || (g.remnant ? [g.remnant] : []);
const remArea = g => remsOf(g).reduce((s, o) => s + o.w * o.h, 0);
const remText = (g, sep = ' + ') => remsOf(g).map(o => `${pretty(o.w)} × ${pretty(o.h)}`).join(sep);
const sheetUse = g => remsOf(g).length ? 1 - remArea(g) / ((g.Wn ?? g.W) * (g.Hn ?? g.H)) : 1;
/** Phần tăng khổ của tờ (phương án tăng khổ): "dài +3, rộng +6" */
const growText = g => [g.needW ? `dài +${g.needW - g.Wn}` : '', g.needH ? `rộng +${g.needH - g.Hn}` : ''].filter(Boolean).join(', ');
const needText = g => (g.needW || g.needH) ? `cần tờ ≥ ${g.W} × ${g.H}` : '';
const sizeOf = g => `${g.Wn ?? g.W}×${g.Hn ?? g.H}${growText(g) ? ` (${growText(g)})` : ''}`;
const fmtTam = v => { const r = Math.round(v * 1000) / 1000; return Number.isInteger(r) ? String(r) : r.toFixed(3); };   // dấu chấm thập phân như các số khác
/** Tổng xuất kho quy đổi theo tấm, tách theo khổ: "1,403 tấm 6000×2000". */
const useBySize = res => {
  const m = new Map();
  res.groups.forEach(g => { const k = (g.remnantStock ? 'tấm lẻ ' : '') + (g.Wn ?? g.W) + '×' + (g.Hn ?? g.H); m.set(k, (m.get(k) || 0) + g.n * sheetUse(g)); });
  return [...m].map(([k, v]) => `${fmtTam(v)} tấm ${k}`).join(' + ');
};

/* ---------- BẢNG HAO PHÍ TIÊU CHUẨN & HAO PHÍ THỰC TẾ TỪNG CHI TIẾT ---------- */
/** Khoá tra: chữ nhật "nhỏ x lớn" (không phân biệt chiều), tròn "D310", vành khuyên "D900/640". */
const baremKey = raw => {
  let s = String(raw ?? '').toUpperCase().replace(/\s+/g, '').replace(/[×*X]/g, 'x').replace(/^(Ø|Φ|PHI|DN?)/, 'D').replace(',', '.');
  const ring = s.match(/^D(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (ring) return `D${+ring[1]}/${+ring[2]}`;
  const round = s.match(/^D(\d+(?:\.\d+)?)$/);
  if (round) return `D${+round[1]}`;
  const rect = s.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
  if (rect) { const [a, b] = [+rect[1], +rect[2]].sort((p, q) => p - q); return `${a}x${b}`; }
  return null;
};
/** Đọc bảng dán: mỗi dòng "kích thước <tab/;/,> hao phí". Bỏ dòng tiêu đề, dòng lỗi; trùng kích thước giữ dòng đầu. */
function parseBarem(text) {
  const map = new Map(); let bad = 0, dup = 0;
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = line.split(/\t|;|\|/).map(c => c.trim()).filter(Boolean);
    let key = null, val = null;
    for (const c of cells) {
      const k = baremKey(c);
      if (k && !key) { key = k; continue; }
      const m = c.replace(',', '.').match(/^(-?\d+(?:\.\d+)?)\s*(%?)$/);
      if (key && m && val == null) { const v = +m[1]; val = m[2] || v > 1 ? v : v * 100; }
    }
    if (!key || val == null || !(val >= 0) || val > 1000) { bad++; continue; }
    if (map.has(key)) { dup++; continue; }
    map.set(key, val);
  }
  return { map, bad, dup };
}
const typeKey = T => T.ring ? `D${T.tpW}/${T.tpIn}` : T.circle ? `D${T.tpW}` : baremKey(`${T.tpW}x${T.tpH}`);
/**
 * Hao phí thực tế từng chi tiết = hao phí tiêu chuẩn × K (một hệ số K chung cho cả trình cắt).
 * K chọn sao cho:  Σ TP_i × (1 + HP thực tế_i) = khối lượng xuất kho thực (xuất − tấm lẻ thu hồi)
 *   => K = (xuất thực − Σ TP) / Σ (TP_i × HP tiêu chuẩn_i).   K > 1: ghép kém hơn tiêu chuẩn; K < 1: tốt hơn.
 * BẮT BUỘC mọi chi tiết có HP tiêu chuẩn: lấy từ bảng; chưa có thì dùng HP tính mới theo trình cắt
 * 1 chi tiết / tờ khổ tiêu chuẩn (barem) và yêu cầu bổ sung vào bảng.
 * std[k] = { value, source: 'table' | 'new' | 'none' }
 */
function allocateWaste(res, std) {
  const kg = a => a * res.input.thickness * res.input.density / 1e9;
  const tp = res.types.map(T => kg(T.qty * T.tpArea));
  const tpAll = tp.reduce((a, b) => a + b, 0), net = res.issuedKG - res.recoveredKG;
  const used = std.map(s => s.value ?? res.wastePercent);              // 'none' (không lọt khổ chuẩn): tạm hao phí chung
  const base = res.types.reduce((s, T, k) => s + tp[k] * used[k] / 100, 0);
  const K = base > 0 ? (net - tpAll) / base : null;
  const rows = res.types.map((T, k) => {
    const actual = K == null ? res.wastePercent : used[k] * K;
    return { std: used[k], source: std[k].source, capped: std[k].capped, actual, tpKG: tp[k],
      issuedKG: tp[k] * (1 + actual / 100), stdIssuedKG: tp[k] * (1 + used[k] / 100) };
  });
  rows.K = K; rows.net = net;
  return rows;
}

export function mount(root, ctx = {}) {
  const st = savedState ? structuredClone(savedState) : structuredClone(DEFAULT_STATE);
  const on = (el, ev, fn) => el.addEventListener(ev, fn, ctx.signal ? { signal: ctx.signal } : undefined);
  let catalog = null, worker = null, timer = null, serial = 0, last = null, full = null, planIdx = 0, lastSVG = '', group = 0, disposed = false;
  const fld = (name, label, val, cls = '') =>
    `<label class="${cls}"><span>${esc(label)}</span><input name="${name}" value="${esc(val ?? '')}" inputmode="decimal" autocomplete="off" spellcheck="false"></label>`;
  const txt = (name, label, val) =>
    `<label><span>${esc(label)}</span><input name="${name}" value="${esc(val ?? '')}" autocomplete="off" maxlength="80"></label>`;
  root.innerHTML = `<style>${CSS}</style><div class="np">
  <div class="np-top">${ctx.hostGuide ? '' : '<p class="np-sub"><button type="button" class="np-guide-btn" id="np-guide-btn" aria-expanded="false" aria-controls="np-guide">📘 Hướng dẫn sử dụng</button></p>'}
   <div class="np-materials" role="group" aria-label="Vật liệu"><strong>Vật liệu</strong>
    ${quickMaterialLabels.map((v, k) => `<button type="button" data-mat="${k}" disabled>${v}</button>`).join('')}
    <select class="np-material-list" id="np-mat-list" aria-label="Danh mục khối lượng riêng" disabled><option value="">Đang tải vật liệu…</option></select>
   </div></div>
  ${ctx.hostGuide ? '' : `<section class="np-guide" id="np-guide" hidden aria-label="Hướng dẫn sử dụng">${GUIDE}</section>`}
  <p class="np-warn" id="np-warn" role="alert" hidden></p>
  <div class="np-grid">
   <section class="np-panel"><h2 class="np-title">TẤM PHÔI &amp; THÔNG SỐ</h2>
    <div class="np-import" role="group" aria-label="Nhập dữ liệu"><b>Nhập dữ liệu</b>
     <button type="button" class="np-export" id="np-imp-xlsx" title="Form cutting plan 3 sheet: 1_BOM, 2_Kho_phoi, 3_Thong_so_cat">📄 Nhập Excel</button>
     <button type="button" class="np-export" id="np-imp-dxf" title="Bản vẽ chi tiết: lấy đường bao chữ nhật, tròn, vành khuyên">📐 Nhập DXF</button>
     <small>hoặc nhập tay bên dưới</small>
     <input type="file" id="np-file-xlsx" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>
     <input type="file" id="np-file-dxf" accept=".dxf" hidden></div>
    <div class="np-imp" id="np-imp" role="region" aria-label="Kết quả nhập file" hidden></div>
    <div class="np-methods"><h3>Phương pháp cắt</h3><div class="np-toggle" role="group" aria-label="Phương pháp cắt">
     <button type="button" data-cut="laser">Laser / Plasma</button><button type="button" data-cut="shear">Chặt sấn</button></div>
    </div>
    <div class="np-row three">${fld('thickness', 'Dày (mm)', st.thickness)}${fld('gap', 'Mạch cắt (mm)', st.gap, 'is-kerf')}${fld('margin', 'Chừa mép (mm)', st.margin, 'is-margin')}</div>
    <label class="np-remnant-box"><span class="np-rb-text"><b>Ngưỡng thu hồi tấm lẻ</b><small>Dải dư có cạnh ngắn ≥ ngưỡng được thu hồi (dọc hay ngang đều vậy), nhỏ hơn tính vào hao phí</small></span>
     <span class="np-rb-input"><input name="remnantMin" value="${esc(st.remnantMin)}" inputmode="decimal" autocomplete="off" aria-label="Ngưỡng thu hồi tấm lẻ (mm)"><small>mm</small></span></label>
    <div class="np-strip-rule" id="np-strip-rule">
     <label class="np-cap" title="Tấm lẻ đủ rộng nhưng quá ngắn (vd. mẩu ở góc khi dư dạng chữ L) khó tận dụng – tính vào hao phí"><span>Tấm lẻ phải dài (cạnh dài) ≥</span><input name="remnantMinLong" value="${esc(st.remnantMinLong)}" inputmode="decimal" autocomplete="off"><small>mm</small></label>
     <p class="np-hint" id="np-strip-laser">Laser / plasma: khi chọn phương án, ưu tiên tấm lẻ giữ nguyên khổ rộng tờ (vd. 1800 × 2000) thay vì dải dọc kiểu 6000 × 500. Dải nào ≥ ngưỡng vẫn thu hồi.</p>
     <label class="np-cap" id="np-strip-shear" title="Chỉ để chọn phương án, không phải ngưỡng thu hồi"><span>Chặt sấn: ưu tiên dải dài 2440 × h khi h ≥</span><input name="longStripMin" value="${esc(st.longStripMin)}" inputmode="decimal" autocomplete="off"><small>mm</small></label>
    </div>
    <details class="np-tol-box np-fold">
     <summary class="np-tol-heading"><b id="np-tol-heading">Đề xuất khi "cận"</b><span class="np-tol-unit">mm</span></summary>
     <div class="np-tol-content">
     <p class="np-tol-hint">Tờ thực tế thường lớn hơn khổ danh nghĩa; chi tiết giảm 0,5 mm thường chấp nhận được. Nếu điều chỉnh nhỏ mà tiết kiệm rõ, máy đưa đề xuất để người dùng duyệt. 0 = tắt.</p>
     <div class="np-tol-fields">
      <label><span>Dài +</span><input name="lengthTol" value="${esc(st.lengthTol)}" inputmode="decimal" autocomplete="off" aria-label="Cho phép tăng khổ dài (mm)"></label>
      <label><span>Rộng +</span><input name="widthTol" value="${esc(st.widthTol)}" inputmode="decimal" autocomplete="off" aria-label="Cho phép tăng khổ rộng (mm)"></label>
      <label><span>Chi tiết −</span><input name="shrinkTol" value="${esc(st.shrinkTol)}" inputmode="decimal" autocomplete="off" aria-label="Cho phép giảm kích thước chi tiết (mm)"></label>
     </div>
     </div>
    </details>
    <div class="np-section">Kho phôi <small>Số tờ trống = không giới hạn</small></div>
    <div class="np-stock-head"><span>Loại</span><span>Dài (mm)</span><span>Rộng (mm)</span><span>Số tờ</span><span>Mã lô / seri</span><span></span></div>
    <div id="np-stocks"></div>
    <div class="np-presets" id="np-presets"></div>
    <details class="np-info np-semi np-fold" id="np-semi-box"><summary>Bán thành phẩm <small id="np-semi-status"></small></summary>
     <div class="np-semi-list" id="np-semis"></div>
     <p class="np-hint">Tích mã được phép ghép cắt cùng đơn hàng – máy tự tính số lượng để hao phí thấp nhất. Hao phí tính BTP như một chi tiết trong đơn hàng.</p>
     <details class="np-semi-lib"><summary>Thư viện BTP (tạm, trước khi có database) <small id="np-semi-lib-status"></small></summary>
      <p class="np-hint">Dán từ Google Sheets / Excel, mỗi dòng: <b>Mã</b> ⇥ <b>Dày</b> ⇥ <b>Kích thước TP</b> [⇥ <b>Dư gia công</b>]. Chữ nhật ghi <code>200x150</code>, tròn ghi <code>D200</code>. Tối đa 5 mã mỗi chiều dày (mác dùng lẫn); xếp mã hay dùng lên đầu. Dư gia công để trống: chữ nhật 0, tròn 5 mm.</p>
      <textarea id="np-btp-lib" rows="5" spellcheck="false" placeholder="BTP-3-A&#9;3&#9;200x150&#10;BTP-10-D&#9;10&#9;D200&#9;5">${esc(st.btpLib)}</textarea></details></details>
    <details class="np-info np-barem"><summary>Hao phí tiêu chuẩn (tham chiếu) <small id="np-barem-status"></small></summary>
     <div class="np-toggle np-std-src" role="group" aria-label="Nguồn hao phí tiêu chuẩn">
      <button type="button" data-stdsrc="table">Theo bảng công ty</button><button type="button" data-stdsrc="auto">Máy tự tính</button></div>
     <label class="np-cap"><span id="np-cap-label">Trần hao phí khổ vuông</span><input name="squareCap" value="${esc(st.squareCaps[st.cutMethod])}" inputmode="decimal" autocomplete="off"><small>%</small></label>
     <p class="np-hint" id="np-std-hint"></p>
     <button type="button" class="np-export" id="np-std-copy">⧉ Sao chép bảng HP tiêu chuẩn của đơn này</button>
     <div id="np-table-box"><p class="np-hint">Dán 2 cột từ Google Sheets / Excel: <b>Kích thước</b> và <b>Hao phí</b> (vd. <code>260x260 ⇥ 14.6%</code>). Tròn ghi <code>D310</code>. Kích thước theo thành phẩm, không phân biệt dài × rộng. Chi tiết chưa có trong bảng: máy tự tính và yêu cầu bổ sung.</p>
     <textarea id="np-barem" rows="5" spellcheck="false" placeholder="260x260	14.6%&#10;270x310	5.4%&#10;D310	9.5%">${esc(st.barem)}</textarea></div></details>
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
     <div class="np-tb-cell"><span>Xuất kho</span><b id="np-tb-issued">—</b><small class="np-tb-use">sử dụng: <b id="np-tb-use">—</b></small></div>
     <div class="np-tb-cell"><span>Tấm lẻ thu hồi</span><b id="np-tb-rec">—</b></div>
     <div class="np-tb-cell"><span>Thực tiêu hao</span><b id="np-tb-net">—</b></div>
     <div class="np-tb-cell"><span>Thành phẩm</span><b id="np-tb-tp">—</b></div>
    </div>
    <div class="np-plans" id="np-plans" role="group" aria-label="Các phương án phối kết hợp"></div>
    <p class="np-enlarge-warn" id="np-enlarge-warn" hidden></p>
    <div class="np-tabs" id="np-tabs" role="tablist" aria-label="Các tờ"></div>
    <div class="np-figure"><div class="np-fig-title" id="np-fig-title">SƠ ĐỒ TRẢI PHÔI</div><div class="np-preview" id="np-preview">Đang lập sơ đồ…</div><div class="np-legend" id="np-legend"></div></div>
    <div class="np-caption"><strong class="np-summary" id="np-summary">—</strong><span class="np-proof" id="np-proof"></span></div>
    <div class="np-footrow"><p class="np-strategy" id="np-strategy">—</p></div>
    <div class="np-footrow"><span></span><span>
     <button class="np-export" type="button" id="np-dxf-cut" disabled title="Mỗi kiểu tờ một file, chỉ đường bao cắt – đưa vào CypCut / phần mềm máy cắt">↓ DXF máy cắt (.zip)</button>
     <button class="np-export" type="button" id="np-dxf-plan" disabled title="Bản vẽ cutting plan chuẩn dự án">↓ DXF cutting plan</button>
     <button class="np-export" type="button" id="np-csv" disabled title="Danh sách chi tiết + hao phí tiêu chuẩn / thực tế, sơ đồ từng tờ, toạ độ, tổng hợp">↓ Excel thông tin cắt</button>
     <button class="np-export" type="button" id="np-svg" disabled>↓ SVG tờ này</button>
     <button class="np-export" type="button" id="np-pdf" disabled title="Sơ đồ cắt khổ A3 ngang, mỗi kiểu tờ một trang – in xưởng, mở không cần CAD">↓ PDF sơ đồ cắt</button></span></div>
    <div class="np-status" id="np-status" role="status" aria-live="polite"></div>
    <div class="np-list" id="np-list" hidden><div class="np-list-title"><span>DANH SÁCH CHI TIẾT ĐÃ XẾP</span><small id="np-list-count"></small></div><div class="np-list-stock" id="np-list-stock"></div>
     <div class="np-scroll"><table><thead><tr><th>NO</th><th>Mã chi tiết</th><th class="num">Thành phẩm (mm)</th><th class="num">Kích thước cắt (mm)</th><th class="num">Yêu cầu</th><th class="num">Đã xếp</th><th class="num np-col-hole">Trong lỗ</th><th class="num np-ref">HP tiêu chuẩn<br><small>tham chiếu</small></th><th class="num np-real">HP thực tế</th></tr></thead><tbody id="np-list-body"></tbody></table></div></div>
    <div class="np-missing" id="np-missing" role="status" hidden></div>
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
  // Keep the material toolbar with the host title, without changing app.js.
  const materialControls = root.querySelector('.np-materials');
  const hostHeading = ctx.hostGuide ? root.closest('.tool-page')?.querySelector('.tool-heading') : null;
  let materialHeader = null;
  if (hostHeading) {
    materialHeader = document.createElement('div');
    materialHeader.className = 'np np-header-materials';
    hostHeading.insertBefore(materialHeader, hostHeading.querySelector(':scope > .es-tool-actions'));
    materialHeader.append(materialControls);
    root.querySelector('.np-top').remove();
  }
  const $ = id => root.querySelector('#' + id) || materialControls.querySelector('#' + id);
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
  /** Đọc thư viện BTP: Mã ⇥ Dày ⇥ Kích thước TP [⇥ Dư]. Bỏ dòng tiêu đề / lỗi; mỗi chiều dày giữ 5 mã đầu.
   *  Thứ tự dòng chỉ để HIỂN THỊ (mã đứng đầu thường được tích nhất) – không ảnh hưởng thuật toán. */
  const parseBtpLib = text => {
    const list = []; let bad = 0, dup = 0, over = 0;
    for (const line of String(text || '').split(/\r?\n/)) {
      if (!line.trim()) continue;
      const c = line.split(/\t|;|\|/).map(x => x.trim());
      const t = Number(String(c[1] ?? '').replace(',', '.')), size = String(c[2] ?? '').toUpperCase().replace(/\s+/g, '').replace(/[×*]/g, 'X').replace(',', '.');
      const rect = size.match(/^(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)$/), round = size.match(/^(?:D|Ø|PHI)(\d+(?:\.\d+)?)$/);
      if (!(t > 0) && !list.length && !bad) continue;                     // dòng tiêu đề
      if (!(t > 0) || (!rect && !round)) { bad++; continue; }
      const allowRaw = String(c[3] ?? '').replace(',', '.').trim(), allowance = allowRaw === '' ? (round ? 5 : 0) : Number(allowRaw);
      if (!Number.isFinite(allowance) || allowance < 0) { bad++; continue; }
      const b = round ? { shape: 'circle', diameter: +round[1] } : { shape: 'rect', partW: +rect[1], partH: +rect[2] };
      b.thickness = t; b.allowance = allowance;
      b.code = (c[0] || `BTP-${t}-${round ? 'D' + round[1] : rect[1] + 'x' + rect[2]}`).slice(0, 40);
      b.size = round ? `D${b.diameter}` : `${b.partW} × ${b.partH}`;
      if (list.some(x => x.code === b.code)) { dup++; continue; }          // trùng mã: giữ dòng đầu
      if (list.filter(x => x.thickness === t).length >= DEFAULTS.semiMax) { over++; continue; }
      list.push(b);
    }
    return { list, bad, dup, over };
  };
  let btpCache = { text: null, parsed: null };
  const btpLib = () => { if (btpCache.text !== st.btpLib) btpCache = { text: st.btpLib, parsed: parseBtpLib(st.btpLib) }; return btpCache.parsed; };
  const curThick = () => Number(String(st.thickness).replace(',', '.'));
  /** Chỉ hiện các mã BTP cùng chiều dày tờ đang tính; chặt sấn không cắt được BTP tròn. */
  function renderSemis() {
    const t = curThick(), lib = btpLib(), mine = lib.list.filter(b => b.thickness === t);
    $('np-semis').innerHTML = mine.length ? mine.map((b, j) => {
      const off = b.shape === 'circle' && st.cutMethod === 'shear', on = !off && !!st.btpPick[b.code];
      const [fill, edge] = semiColor(j);
      return `<label class="np-semi-pick${on ? ' is-on' : ''}${off ? ' is-off' : ''}"${off ? ' title="Chặt sấn không cắt được chi tiết tròn"' : ''}>
        <input type="checkbox" data-bpick="${esc(b.code)}"${on ? ' checked' : ''}${off ? ' disabled' : ''}>
        <b class="np-semi-no" title="Thứ tự trong master data – mã đứng đầu thường được tích nhất">${j + 1}</b><i class="np-chip${b.shape === 'circle' ? ' round' : ''}" style="background:${fill};border-color:${edge};border-style:dashed"></i>${esc(b.code)}
        <small>${b.size}${b.allowance ? ` · dư ${b.allowance}` : ''}${off ? ' · không dùng cho chặt sấn' : ''}</small></label>`;
    }).join('') : `<p class="np-hint">Chưa có mã BTP cho dày ${esc(st.thickness)} mm – bổ sung trong thư viện bên dưới.</p>`;
    const picked = mine.filter(b => st.btpPick[b.code] && !(b.shape === 'circle' && st.cutMethod === 'shear')).length;
    put('np-semi-status', mine.length ? `dày ${st.thickness} mm · ${picked}/${mine.length} mã được ghép` : `dày ${st.thickness} mm · chưa có mã`);
    put('np-semi-lib-status', `${lib.list.length} mã${lib.bad ? ` · ${lib.bad} dòng lỗi bỏ qua` : ''}${lib.dup ? ` · ${lib.dup} mã trùng bỏ qua` : ''}${lib.over ? ` · ${lib.over} mã vượt ${DEFAULTS.semiMax} mã / chiều dày bỏ qua` : ''}`);
  }
  function renderParts() {
    $('np-parts').innerHTML = st.parts.map((p, t) => {
      const [fill, edge] = colorOf(t), round = p.shape === 'circle' || p.shape === 'ring', poly = p.shape === 'poly' && Array.isArray(p.outline);
      // Hàng 1: tên, hình dạng, dư gia công · Hàng 2: kích thước + SỐ LƯỢNG (nhập liền một mạch: kích thước → số lượng)
      const autoOn = st.parts.length === 1 && st.auto !== false;
      const qty = autoOn ? `<label><span>Số lượng</span><input name="qty${t}" value="${esc(st.autoN ?? '')}" placeholder="tối đa / tờ" disabled title="Tự động: máy xếp tối đa lên một tờ khổ chuẩn"></label>` : fld(`qty${t}`, 'Số lượng', p.qty);
      const allow = poly ? '<label class="is-allow"><span>Dư gia công</span><output class="np-out">0 (đường bao)</output></label>' : p.shape === 'rect' ? fld(`allowance${t}`, 'Dư gia công (mm)', p.allowance, 'is-allow')
        : fld(`allowance${t}`, p.shape === 'ring' ? 'Dư Ø ngoài' : 'Dư Ø (mm)', p.allowance, 'is-allow');
      const dims = poly ? `<label><span>Khung bao TP (mm)</span><output class="np-out">${pretty(Number(p.partW))} × ${pretty(Number(p.partH))}</output></label>`
          + `<label><span>Đường bao (DXF)</span><output class="np-out">${p.outline.length} đỉnh${p.outline.some(v => v.b) ? ' · có cung' : ''}</output></label>` + qty
        : p.shape === 'rect' ? fld(`partW${t}`, 'Dài TP (mm)', p.partW) + fld(`partH${t}`, 'Rộng TP (mm)', p.partH) + qty
        : p.shape === 'circle' ? fld(`diameter${t}`, 'D TP (mm)', p.diameter) + qty + '<span></span>'
        : fld(`diameter${t}`, 'Ø ngoài TP', p.diameter) + fld(`inner${t}`, 'Ø trong TP', p.inner) + qty;
      const extra = p.shape === 'ring' ? `<div class="np-row three">${fld(`allowanceIn${t}`, 'Dư Ø trong', p.allowanceIn, 'is-allow')}<span></span><span></span></div>` : '';
      return `<div class="np-part" data-part="${t}"><div class="np-part-head"><i class="${round ? 'round' : ''}" style="background:${fill};border-color:${edge}${p.shape === 'ring' ? ';box-shadow:inset 0 0 0 4px #fff' : ''}"></i>Chi tiết ${t + 1}
       ${st.parts.length === 1 ? `<label class="np-auto" title="Xếp tối đa chi tiết này lên một tờ khổ chuẩn để tính hao phí (barem). Bỏ tích để nhập số lượng theo đơn hàng."><input type="checkbox" data-auto ${st.auto !== false ? 'checked' : ''}>Tự động</label>` : ''}
       <label class="np-rot${round ? ' is-off' : ''}" title="Bỏ chọn khi vật liệu có chiều cán / vân không được xoay"><input type="checkbox" data-rot="${t}" ${p.rotate !== false ? 'checked' : ''} ${round ? 'disabled' : ''}>Cho xoay 90°</label>
       ${st.parts.length > 1 ? `<button type="button" class="np-del" data-del="${t}" aria-label="Xóa chi tiết ${t + 1}">✕ Xóa</button>` : ''}</div>
       <div class="np-row p1">${txt(`name${t}`, 'Tên / mã', p.name)}<label><span>Hình dạng</span><select class="np-shape" data-shape="${t}"><option value="rect"${p.shape === 'rect' ? ' selected' : ''}>Chữ nhật</option><option value="circle"${p.shape === 'circle' ? ' selected' : ''}>Tròn</option><option value="ring"${p.shape === 'ring' ? ' selected' : ''}>Vành khuyên</option>${Array.isArray(p.outline) ? `<option value="poly"${p.shape === 'poly' ? ' selected' : ''}>Đa giác (DXF)</option>` : ''}</select></label>${allow}</div>
       <div class="np-row three">${dims}</div>${extra}</div>`;
    }).join('');
    countLine();
  }
  function countLine() {
    if (st.parts.length === 1 && st.auto !== false) { put('np-count', `1 loại · tự động${st.autoN ? ` ${Number(st.autoN).toLocaleString('vi-VN')} chiếc / tờ` : ''}`); return; }
    const total = st.parts.reduce((s, p) => s + (Number(String(p.qty).replaceAll(',', '')) || 0), 0);
    put('np-count', `${st.parts.length} loại · ${total.toLocaleString('vi-VN')} chiếc`);
  }
  function collect() {
    for (const k of ['thickness', 'gap', 'margin', 'remnantMin', 'remnantMinLong', 'longStripMin', 'widthTol', 'lengthTol', 'shrinkTol']) st[k] = val(k);
    st.info = { project: val('project'), drawingNo: val('drawingNo'), material: val('matName'), drawnBy: val('drawnBy') };
    stocks().forEach((s, j) => { s.W = val(`sW${j}`); s.H = val(`sH${j}`); s.qty = val(`sQ${j}`); s.lot = val(`sL${j}`); });
    st.parts.forEach((p, t) => {
      p.name = val(`name${t}`); if (!(st.parts.length === 1 && st.auto !== false)) p.qty = val(`qty${t}`);
      if (p.shape === 'poly') { p.allowance = '0'; const rb = root.querySelector(`[data-rot="${t}"]`); if (rb) p.rotate = rb.checked; return; }
      p.allowance = val(`allowance${t}`);
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
    materialControls.querySelectorAll('[data-mat]').forEach(b => { const yes = Number(b.dataset.mat) === st.material; b.classList.toggle('is-active', yes); b.setAttribute('aria-pressed', String(yes)); });
    if (catalog) $('np-mat-list').value = st.material >= 4 ? String(st.material) : '';
    for (const k of ['thickness', 'gap', 'margin']) root.querySelector(`[name="${k}"]`).value = st[k];
    root.querySelector('[name="gap"]').closest('label').querySelector('span').textContent = st.cutMethod === 'shear' ? 'Khe hở (mm)' : 'Mạch cắt (mm)';
    $('np-strip-laser').hidden = st.cutMethod === 'shear'; $('np-strip-shear').hidden = st.cutMethod !== 'shear';
    renderStocks(); renderSemis();
  }
  function payload() {
    const density = Number(st.density);
    if (!Number.isFinite(density) || density <= 0) throw Error('Kiểm tra vật liệu và khối lượng riêng.');
    const stockList = stocks().map((s, j) => {
      const lab = `Kho phôi dòng ${j + 1}`, q = String(s.qty).trim();
      return { W: parseNum(s.W, `${lab} – dài`, { positive: true }), H: parseNum(s.H, `${lab} – rộng`, { positive: true }),
        limit: q === '' ? null : parseNum(q, `${lab} – số tờ`, { integer: true }), remnant: s.kind === 'rem', lot: String(s.lot || '').trim() };
    });
    const auto = st.parts.length === 1 && st.auto !== false;
    const parts = st.parts.map((p, t) => {
      if (auto) p = { ...p, qty: '1' };                  // Tự động: số chiếc do máy tìm
      const lab = `Chi tiết ${t + 1}`, qtyRaw = String(p.qty).trim();
      if (!qtyRaw || Number(qtyRaw.replaceAll(',', '')) === 0) return null;
      const name = String(p.name || '').trim() || `CT${t + 1}`;   // mã chỉ để nhận diện – quy cách mới là điều người dùng quan tâm
      const base = { name, shape: p.shape, rotate: p.rotate !== false, allowance: parseNum(p.allowance || '0', `${lab} – dư gia công`, { minus: 5 }),
        qty: parseNum(p.qty, `${lab} – số lượng`, { integer: true }) };
      if (p.shape === 'poly') return { ...base, allowance: 0, partW: Number(p.partW), partH: Number(p.partH), outline: p.outline };   // đường bao thật từ DXF
      if (p.shape === 'rect') return { ...base, partW: parseNum(p.partW, `${lab} – dài TP`, { positive: true }), partH: parseNum(p.partH, `${lab} – rộng TP`, { positive: true }) };
      const d = { ...base, diameter: parseNum(p.diameter, `${lab} – Ø ngoài TP`, { positive: true }) };
      if (p.shape === 'ring') { d.inner = parseNum(p.inner, `${lab} – Ø trong TP`, { positive: true }); d.allowanceIn = parseNum(p.allowanceIn || '0', `${lab} – dư Ø trong`); }
      return d;
    }).filter(Boolean);
    // BTP: các mã cùng chiều dày tờ đang tính (mác dùng lẫn) ĐƯỢC TÍCH; số lượng máy tự tính
    const thick = parseNum(st.thickness, 'Dày', { positive: true });
    const semis = btpLib().list.filter(b => b.thickness === thick).map((b, rank) => ({ b, rank })).filter(({ b }) => st.btpPick[b.code])
      .map(({ b, rank }) => ({ rank, code: b.code, shape: b.shape, partW: b.partW, partH: b.partH, diameter: b.diameter, allowance: b.allowance, maxQty: null }));
    return {
      cutMethod: st.cutMethod, density, stocks: stockList, semis,
      thickness: parseNum(st.thickness, 'Dày', { positive: true }), gap: parseNum(st.gap, st.cutMethod === 'shear' ? 'Khe hở' : 'Mạch cắt'),
      margin: parseNum(st.margin, 'Chừa mép'), remnantMin: parseNum(st.remnantMin, 'Ngưỡng thu hồi tấm lẻ'), longStripMin: parseNum(st.longStripMin || '0', 'Ưu tiên dải dài'), remnantMinLong: parseNum(st.remnantMinLong || '0', 'Tấm lẻ dài tối thiểu'), widthTol: parseNum(st.widthTol || '0', 'Cho phép tăng khổ rộng'), lengthTol: parseNum(st.lengthTol || '0', 'Cho phép tăng khổ dài'), shrinkTol: parseNum(st.shrinkTol || '0', 'Cho phép giảm kích thước'), parts, autoFill: auto,
    };
  }
  function status(msg = '', busy = false) {
    const box = $('np-status'); box.textContent = msg;
    if (busy) box.insertAdjacentHTML('beforeend', '<span class="np-spin" aria-hidden="true"></span>');
  }
  const exportsOff = off => { for (const id of ['np-csv', 'np-svg', 'np-dxf-cut', 'np-dxf-plan', 'np-pdf']) $(id).disabled = off; };
  function invalid(msg) {
    $('np-missing').hidden = true;
    last = null; lastSVG = '';
    $('np-preview').textContent = 'Không thể lập sơ đồ với thông số hiện tại.'; $('np-tabs').innerHTML = ''; $('np-legend').innerHTML = '';
    $('np-list').hidden = true; $('np-plans').innerHTML = ''; $('np-total-bar').hidden = true; exportsOff(true); full = null;
    put('np-error', msg); put('np-fig-title', 'SƠ ĐỒ TRẢI PHÔI');
    for (const id of ['np-summary', 'np-strategy', 'np-sheets', 'np-issued', 'np-finished', 'np-waste', 'np-remnant']) put(id, '—');
    for (const id of ['np-proof', 'np-sheets-sub', 'np-issued-sub', 'np-waste-sub', 'np-remnant-sub']) put(id, '');
    status('');
  }
  /** Dư phải, dư dưới luôn ghi kích thước; kèm các tấm lẻ được thu hồi (≥ ngưỡng), phần còn lại vào hao phí. */
  const freeText = g => {
    const part = side => {
      const f0 = (g.freeStrips || []).find(x => x.side === side), name = side === 'right' ? 'Dư phải' : 'Dư dưới';
      const sh = g.needH ?? g.H, f = !f0 ? null : side === 'right' ? { ...f0, h: sh } : { ...f0, h: f0.h - (g.H - sh) };   // tăng khổ: theo bề rộng thực tế cần
      return f ? `${name}: ${pretty(f.w)} × ${pretty(f.h)} mm` : `${name}: 0`;
    };
    return `${part('right')} · ${part('bottom')}` + (remsOf(g).length ? ` → thu hồi ${remText(g)}` : ' (vào hao phí)');
  };
  const sizeText = T => { const s = last?.shrinkMM || 0, cw = T.cw - s, ch = T.ch - s;   // phương án giảm kích thước: hiện kích thước cắt sau khi giảm
    return T.ring ? `Ø${pretty(cw)} / Ø${pretty(T.hole)}` : T.circle ? 'D' + pretty(cw) : pretty(cw) + ' × ' + pretty(ch); };
  const chip = T => { const [fill, edge] = colorOfT(T); return `<i class="np-chip${T.ring ? ' ring' : T.circle ? ' round' : ''}" style="background:${fill};border-color:${edge}"></i>`; };
  function showGroup(gi) {
    if (!last) return;
    group = Math.max(0, Math.min(gi, last.groups.length - 1));
    const res = last, g = res.groups[group], pic = drawSheet(res, group);
    $('np-preview').innerHTML = pic.svg; lastSVG = pic.download;
    put('np-fig-title', pic.title + (g.n > 1 ? ` · ×${g.n} tờ giống nhau` : ''));
    root.querySelectorAll('[data-group]').forEach(b => { const yes = Number(b.dataset.group) === group; b.classList.toggle('is-active', yes); b.setAttribute('aria-selected', String(yes)); });
    const present = new Set(g.items.map(p => p.t)), anyRot = g.items.some(p => p.rot);
    $('np-legend').innerHTML = res.types.filter(T => present.has(T.t)).map(T => `<span>${chip(T)}${T.t + 1}. ${esc(T.name)}${T.semi ? '<i class="np-semi-tag">BTP</i>' : ''} ${sizeText(T)} <b>×${g.counts[T.t]}</b></span>`).join('') +
      (anyRot ? '<span><i class="np-chip hatch"></i>Xoay 90°</span>' : '') +
      (g.cuts.some(c => c.seq > 0) ? '<span><i class="np-chip" style="background:#fff7ea;border-color:#d58027"></i>Số = thứ tự nhát chặt chính</span>' : '');
    const gSemi = g.items.filter(p => p.semi).length;
    put('np-summary', `${sheetRange(res, group)} / ${res.totalSheets}: ${g.items.length - gSemi} chi tiết${gSemi ? ` + ${gSemi} BTP` : ''} · hao phí tờ ${g.wastePercent == null ? '—' : g.wastePercent.toFixed(2) + ' %'}${g.remnant ? ` · sử dụng: ${fmtTam(sheetUse(g))} tấm` : ''} · lấp đầy ${g.usedPercent.toFixed(1)} %`);
    put('np-strategy', strategyText(g.strategy) + ' · ' + freeText(g));
  }
  function present(res, keepPlan = false) {
    full = res;
    if (res.autoFill) {                                 // Tự động: hiện số chiếc tối đa máy tìm được vào ô Số lượng
      st.autoN = String(res.autoFill.n); savedState = structuredClone(st);
      const q = root.querySelector('[name="qty0"]'); if (q?.disabled) q.value = st.autoN;
      countLine();
    }
    if (!keepPlan || planIdx >= res.plans.length) planIdx = 0;
    // chỉ hiện thẻ khi có phương án thay thế khác biệt thật; mặc định luôn mở phương án hao phí thấp nhất
    $('np-plans').innerHTML = res.plans.length < 2 ? '' : res.plans.map((p, k) => `<button type="button" class="np-plan${p.enlargeMM || p.shrinkMM ? ' is-enlarge' : ''}" data-plan="${k}">
        <b>${k === 0 ? '★ Phương án tốt nhất' : p.enlargeMM && p.shrinkMM ? '⚠ Đề xuất kết hợp – cần duyệt' : p.enlargeMM ? '⚠ Đề xuất tăng khổ – cần duyệt' : p.shrinkMM ? '⚠ Đề xuất giảm kích thước – cần duyệt' : 'Phương án khác ' + k}</b><big>${p.totalSheets} tờ · ${p.wastePercent.toFixed(2)} %</big>
        <small>${esc(p.reason)}</small><small>Thu hồi ${pretty(p.recoveredKG)} kg${p.semiCount ? ` · BTP ${p.semiCount} ct (${pretty(p.semiKG)} kg)` : ''} · ${p.kinds} kiểu tờ</small></button>`).join('');
    showPlan(planIdx);
  }
  let baremCache = { text: null, parsed: null };
  const barem = () => {
    if (baremCache.text !== st.barem) baremCache = { text: st.barem, parsed: parseBarem(st.barem) };
    return baremCache.parsed;
  };
  const r1 = v => Math.round(v * 10) / 10;                             // bảng tiêu chuẩn ghi 1 chữ số thập phân
  /** Quy tắc thực tế (bất quy tắc): chi tiết khổ VUÔNG – HP tiêu chuẩn tối đa = trần (mặc định 15 %). */
  const isSquare = T => !T.circle && Math.abs(T.tpW - T.tpH) < 1e-9;
  /** Trần theo phương pháp cắt: laser / plasma 15 %, chặt sấn 14 % (kinh nghiệm thực tế, chỉnh được). */
  const capOf = () => { const v = Number(String(st.squareCaps[st.cutMethod] ?? '').replace(',', '.')); return Number.isFinite(v) && v > 0 ? v : null; };
  const capped = (T, v) => { const c = capOf(); return v != null && c != null && isSquare(T) && v > c ? { value: c, capped: true } : { value: v, capped: false }; };
  /** Máy tự tính: trình cắt 1 chi tiết / tờ khổ chuẩn (barem), làm tròn 1 số lẻ, áp trần khổ vuông. */
  const autoStd = T => T.barem?.percent == null ? { value: null, capped: false } : capped(T, r1(T.barem.percent));
  const stdOf = res => { const b = barem(); return res.types.map(T => {
    if (st.stdSource === 'table') {
      const k = typeKey(T);
      if (k && b.map.has(k)) return { value: b.map.get(k), capped: false, source: 'table' };   // bảng đã xét duyệt: dùng nguyên số
    }
    const a = autoStd(T);
    return a.value != null ? { ...a, source: st.stdSource === 'table' ? 'new' : 'auto' } : { value: null, capped: false, source: 'none' };
  }); };
  const stdLines = (res, onlyNew) => { const std = stdOf(res); return res.types.map((T, k) => ({ T, s: std[k] }))
    .filter(({ T, s }) => T.qty > 0 && typeKey(T) && s.value != null && (!onlyNew || s.source === 'new'))
    .map(({ T, s }) => `${typeKey(T)}\t${s.value.toFixed(1)}%`); };
  /** Chi tiết chưa có trong bảng: hiện danh sách + nút bổ sung vào bảng / sao chép để dán vào Google Sheets. */
  function renderMissing(res) {
    const std = stdOf(res), box = $('np-missing');
    const miss = st.stdSource === 'table' ? res.types.filter((T, k) => std[k].source !== 'table' && T.qty > 0) : [];
    if (!miss.length) { box.hidden = true; box.innerHTML = ''; return; }
    const b0 = miss.find(T => T.barem)?.barem;
    box.hidden = false;
    box.innerHTML = `<b>⚠ ${miss.length} chi tiết chưa có trong bảng hao phí tiêu chuẩn – cần bổ sung.</b>
      <span>Máy đã tính theo trình cắt <b>1 chi tiết / tờ ${b0 ? b0.W + ' × ' + b0.H : 'khổ chuẩn'}</b> (cắt hết tờ):</span>
      <ul>${miss.map(T => T.barem?.percent != null
        ? `<li><code>${esc(typeKey(T) || T.name)}</code> ${esc(T.name)}: <b>${autoStd(T).value.toFixed(1)} %</b> <small>(${T.barem.n} chiếc / tờ${autoStd(T).capped ? ` · khổ vuông, giới hạn ${capOf()} %` : ''})</small></li>`
        : `<li><code>${esc(T.name)}</code>: không lọt tờ khổ chuẩn – cần nhập tay</li>`).join('')}</ul>
      <span><button type="button" class="np-export" id="np-miss-add">＋ Thêm vào bảng tiêu chuẩn</button>
      <button type="button" class="np-export" id="np-miss-copy">⧉ Sao chép để dán Google Sheets</button></span>`;
  }
  const missingLines = res => stdLines(res, true);
  function baremStatus() {
    const b = barem(), auto = st.stdSource !== 'table', cap = capOf();
    root.querySelectorAll('[data-stdsrc]').forEach(x => { const yes = x.dataset.stdsrc === st.stdSource; x.classList.toggle('is-active', yes); x.setAttribute('aria-pressed', String(yes)); });
    $('np-table-box').hidden = auto;
    const method = st.cutMethod === 'shear' ? 'chặt sấn' : 'laser / plasma';
    const capInput = root.querySelector('[name="squareCap"]');
    if (capInput && document.activeElement !== capInput) capInput.value = st.squareCaps[st.cutMethod] ?? '';
    put('np-cap-label', `Trần HP khổ vuông – ${method}`);
    put('np-barem-status', (auto ? 'máy tự tính' : `bảng công ty · ${b.map.size} kích thước`) + (cap ? ` · khổ vuông ≤ ${cap} % (${method})` : ''));
    put('np-std-hint', auto
      ? 'Mỗi chi tiết được ghép một mình kín tờ khổ chuẩn (dòng khổ chuẩn đầu tiên trong kho phôi), cắt hết tờ: HP = (tờ − n × TP) / (n × TP); khổ vuông áp trần. Sao chép bảng này để dựng bảng tiêu chuẩn của công ty.'
      : `Ưu tiên bảng đã xét duyệt (dùng nguyên số trong bảng)${b.dup ? ` · ${b.dup} dòng trùng` : ''}${b.bad ? ` · ${b.bad} dòng bỏ qua` : ''}. Chi tiết chưa có: máy tính theo 1 chi tiết / tờ (khổ vuông áp trần) và yêu cầu bổ sung.`);
  }
  /** Bảng chi tiết: thêm hao phí tiêu chuẩn (tra bảng) và hao phí thực tế (phân bổ sau ghép phôi). */
  const stdTip = (T, a) => (a.source === 'table' ? 'Theo bảng công ty' : a.source === 'none' ? 'Không lọt tờ khổ chuẩn – cần nhập tay'
    : `Máy tính: 1 chi tiết / tờ ${T.barem.W}×${T.barem.H} = ${T.barem.n} chiếc / tờ → ${r1(T.barem.percent).toFixed(1)} %`) + (a.capped ? ` · khổ vuông: giới hạn ${capOf()} %` : '');
  function renderPartTable(res) {
    renderMissing(res);
    const alloc = allocateWaste(res, stdOf(res));
    const pc = v => v == null ? '—' : v.toFixed(2) + ' %';
    const semiRows = res.types.filter(T => T.semi);                     // mọi mã được tích (kể cả máy không dùng – ghi 0)
    const semiHead = semiRows.length ? `<tr class="np-semi-head"><td colspan="9">BÁN THÀNH PHẨM – nhập kho BTP · ${semiRows.map(T => `${esc(T.name)}: ${pretty(T.qty)} chiếc`).join(' · ')} · ${pretty(res.semiKG)} kg</td></tr>` : '';
    $('np-list-body').innerHTML = res.types.map((T, k) => {
      const lead = T.semi && T === semiRows[0] ? semiHead : '';
      if (T.semi && !T.qty) return `${lead}<tr class="np-semi-row"><td>${T.t + 1}</td><td>${chip(T)} ${esc(T.name)}<i class="np-semi-tag">BTP</i></td><td class="num">${T.circle ? 'D' + pretty(T.tpW) : pretty(T.tpW) + ' × ' + pretty(T.tpH)}</td><td class="num">${sizeText(T)}</td><td class="num"><small>lấp dư</small></td><td class="num">0</td><td class="num np-col-hole"></td><td colspan="2"><small>Máy không dùng mã này trong phương án – lấp mã khác ít hao phí hơn</small></td></tr>`;
      const made = res.groups.reduce((s, g) => s + g.counts[T.t] * g.n, 0), a = alloc[k];
      const tp = T.ring ? `Ø${pretty(T.tpW)} / Ø${pretty(T.tpIn)}` : T.circle ? 'D' + pretty(T.tpW) : pretty(T.tpW) + ' × ' + pretty(T.tpH);
      const dev = a.actual == null ? '' : a.actual > a.std + 0.005 ? 'dev-up' : a.actual < a.std - 0.005 ? 'dev-down' : '';
      return `${lead}<tr${T.semi ? ' class="np-semi-row"' : ''}><td>${T.t + 1}</td><td>${chip(T)} ${esc(T.name)}${T.semi ? '<i class="np-semi-tag" title="Bán thành phẩm – nhập kho BTP">BTP</i>' : ''}${T.noRotate ? ' <small>(không xoay)</small>' : ''}</td>
       <td class="num">${tp}</td><td class="num">${sizeText(T)}</td>
       <td class="num">${T.semi ? '<small>lấp dư</small>' : pretty(T.qty)}</td><td class="num ${made === T.qty ? 'ok' : ''}">${pretty(made)}${made === T.qty ? ' ✓' : ''}</td><td class="num np-col-hole">${T.inHoles ? pretty(T.inHoles) : ''}</td>
       <td class="num np-ref" title="${stdTip(T, a)}">${a.source === 'none' ? '<i class="np-est">? <sup>nhập tay</sup></i>' : a.source === 'new' ? `<i class="np-est">${pc(a.std)} <sup>mới</sup></i>` : pc(a.std)}${a.capped ? ' <sup class="np-cap-tag">≤' + capOf() + '</sup>' : ''}</td><td class="num np-real ${dev}" title="Lệch ${(a.actual - a.std).toFixed(2)} điểm % so với tiêu chuẩn">${pc(a.actual)}</td></tr>`;
    }).join('') + `<tr class="np-total"><td colspan="4">TỔNG</td><td class="num">${pretty(res.types.reduce((s, T) => s + (T.semi ? 0 : T.qty), 0))}</td><td class="num">${pretty(res.pieces)}</td><td class="num np-col-hole">${pretty(res.types.reduce((s, T) => s + T.inHoles, 0)) || ''}</td><td class="num np-k">${alloc.K == null ? '' : 'K = ' + alloc.K.toFixed(3)}</td><td class="num np-real">${res.wastePercent.toFixed(2)} %</td></tr>`;
    $('np-list').classList.toggle('no-hole', !res.types.some(T => T.ring));
  }
  function showPlan(k) {
    planIdx = k;
    const res = { ...full, ...full.plans[k] };
    last = res;
    root.querySelectorAll('[data-plan]').forEach(b => { const yes = Number(b.dataset.plan) === k; b.classList.toggle('is-active', yes); b.setAttribute('aria-pressed', String(yes)); });
    const multi = new Set(res.groups.map(g => sizeOf(g))).size > 1 || res.groups.some(g => g.needW || g.needH);
    const warn = $('np-enlarge-warn');
    warn.hidden = !(res.enlargeMM || res.shrinkMM);
    if (res.enlargeMM || res.shrinkMM) warn.textContent = '⚠ ' + [
      res.enlargeMM ? `Dùng tờ thực tế lớn hơn khổ danh nghĩa (${[res.enlargeL ? 'dài +' + res.enlargeL + ' mm' : '', res.enlargeW ? 'rộng +' + res.enlargeW + ' mm' : ''].filter(Boolean).join(', ')}) – đo tờ trước khi cắt: ${[...new Set(res.groups.filter(g => g.needW || g.needH).map(needText))].join(' / ')} mm` : '',
      res.shrinkMM ? `Giảm kích thước cắt ${res.shrinkMM} mm mỗi chi tiết (dài / rộng hoặc đường kính) – kiểm tra dung sai trước khi duyệt` : '',
    ].filter(Boolean).join('. ') + '. Xuất kho và thành phẩm vẫn tính theo số liệu danh nghĩa.';
    $('np-tabs').innerHTML = res.groups.map((g, gi) => {
      const r = g.freeStrips.find(f => f.side === 'right');
      return `<button type="button" class="np-tab" role="tab" data-group="${gi}"><b>${sheetRange(res, gi)}${g.n > 1 ? ` · ×${g.n}` : ''}</b><small>${multi || g.remnantStock ? `${g.remnantStock ? 'Lẻ ' : ''}${sizeOf(g)} · ` : ''}${g.items.length} ct · hp ${g.wastePercent == null ? '—' : g.wastePercent.toFixed(1) + ' %'}${g.remnant ? ` · <span class="np-tab-rem">sử dụng ${fmtTam(sheetUse(g))} tấm</span>` : ''}</small></button>`;
    }).join('');
    showGroup(group < res.groups.length ? group : 0);
    const proof = $('np-proof');
    proof.textContent = res.lowerBound == null ? '' : res.proven ? '✓ Số tờ tối thiểu – đã chứng minh' : `Cận dưới ${res.lowerBound} tờ · phương án hơn cận dưới ${res.totalSheets - res.lowerBound} tờ`;
    proof.classList.toggle('gap', res.lowerBound != null && !res.proven);
    const bySize = new Map();
    res.groups.forEach(g => { const kk = (g.remnantStock ? 'lẻ ' : '') + sizeOf(g); bySize.set(kk, (bySize.get(kk) || 0) + g.n); });
    put('np-sheets', String(res.totalSheets)); put('np-sheets-sub', [...bySize].map(([kk, n]) => `${n} tờ ${kk}`).join(' · '));
    put('np-issued', pretty(res.issuedKG));
    put('np-issued-sub', `Thực tiêu hao ${pretty(res.issuedKG - res.recoveredKG)} kg` + (res.remnantUsedKG ? ` · gồm ${pretty(res.remnantUsedKG)} kg tấm lẻ kho` : ''));
    put('np-finished', pretty(res.finishedKG));
    $('np-total-bar').hidden = false;
    put('np-tb-waste', res.wastePercent.toFixed(2) + ' %');
    const semiText = res.types.filter(T => T.semi && T.qty).map(T => `${T.name} × ${pretty(T.qty)}`).join(', ');
    put('np-tb-sub', `${res.totalSheets} tờ · nếu không thu hồi ${res.wasteFullPercent.toFixed(2)} %${res.semiCount ? ` · gồm BTP ${semiText} (${pretty(res.semiKG)} kg)` : ''}`);
    put('np-tb-use', `${fmtTam(res.groups.reduce((total, g) => total + g.n * sheetUse(g), 0))} tấm`);
    put('np-tb-issued', pretty(res.issuedKG) + ' kg'); put('np-tb-rec', pretty(res.recoveredKG) + ' kg');
    put('np-tb-net', pretty(res.issuedKG - res.recoveredKG) + ' kg'); put('np-tb-tp', pretty(res.finishedKG) + ' kg');
    put('np-waste', res.wastePercent.toFixed(2)); put('np-waste-sub', `Nếu không thu hồi: ${res.wasteFullPercent.toFixed(2)} % · tổng cả trình cắt · đã thử ${full.tried} cách xếp`);
    const rems = res.groups.filter(g => remsOf(g).length), nRem = rems.reduce((s, g) => s + g.n, 0);
    put('np-remnant-title', `Tấm lẻ thu hồi (≥ ${pretty(res.input.remnantMin)} mm)`);
    put('np-remnant', nRem ? `${pretty(res.recoveredKG)} kg · ${nRem} tấm` : 'Không có');
    const lr = res.lastFree.find(f => f.side === 'right'), lb = res.lastFree.find(f => f.side === 'bottom');
    put('np-remnant-sub', (nRem ? rems.map(g => `${remText(g)}${g.n > 1 ? ` (×${g.n})` : ''}`).slice(0, 3).join('; ') + (rems.length > 3 ? '…' : '') + ' · ' : '')
      + `Tờ cuối dư phải ${lr ? pretty(lr.w) + '×' + pretty(lr.h) : '0'}, dư dưới ${lb ? pretty(lb.w) + '×' + pretty(lb.h) : '0'}`);
    renderPartTable(res);
    put('np-list-count', `${res.types.length} loại · ${pretty(res.pieces)} chi tiết · tính ${(res.ms / 1000).toFixed(1)} s`);
    // vật liệu / mác, chiều dày, khổ thép × số tờ (gộp theo khổ; tấm lẻ kho ghi riêng)
    const stockBy = new Map();
    for (const g of res.groups) { const k = `${g.remnantStock ? 'tấm lẻ ' : ''}${pretty(g.W)} × ${pretty(g.H)}`; stockBy.set(k, (stockBy.get(k) || 0) + g.n); }
    put('np-list-stock', [matName() || 'Vật liệu chưa ghi', `dày ${pretty(res.input.thickness)} mm`,
      [...stockBy].map(([k, n]) => `khổ ${k} mm × ${n} tờ`).join(' + '), stockBy.size > 1 ? `tổng ${res.totalSheets} tờ` : ''].filter(Boolean).join(' · '));
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
    if (e.target.name === 'squareCap') { st.squareCaps[st.cutMethod] = e.target.value; savedState = structuredClone(st); baremStatus(); if (last) renderPartTable(last); return; }
    if (e.target.name === 'thickness') renderSemis();               // đổi chiều dày: hiện mã BTP của chiều dày đó
    schedule();
  });
  on(root, 'change', e => {
    if (e.target.matches('[data-rot]')) { collect(); schedule(); return; }
    if (e.target.matches('[data-bpick]')) {
      collect(); st.btpPick[e.target.dataset.bpick] = e.target.checked; savedState = structuredClone(st); renderSemis(); schedule(); return;
    }
    if (e.target.matches('[data-skind]')) { collect(); stocks()[Number(e.target.dataset.skind)].kind = e.target.value; renderStocks(); collect(); schedule(); return; }
    if (e.target.matches('[data-auto]')) {
      collect(); st.auto = e.target.checked;
      if (!st.auto && st.autoN && !Number(st.parts[0].qty)) st.parts[0].qty = st.autoN;   // điền tay: bắt đầu từ số chiếc tối đa vừa tính
      renderParts(); collect(); savedState = structuredClone(st); schedule(); return;
    }
    if (e.target.matches('[data-shape]')) {
      collect();
      const p = st.parts[Number(e.target.dataset.shape)], next = e.target.value;
      if (p.shape === 'poly' || String(p.allowance).trim() === ALLOW_DEFAULT[p.shape]) p.allowance = ALLOW_DEFAULT[next] ?? '0';
      if (next === 'ring' && !String(p.inner).trim()) p.inner = String(Math.round(Number(p.diameter) * 0.6) || '');
      p.shape = next; renderParts(); collect(); schedule();
    }
  });
  on(root, 'click', e => {
    const tab = e.target.closest('[data-group]'); if (tab) { showGroup(Number(tab.dataset.group)); return; }
    const pl = e.target.closest('[data-plan]'); if (pl && full) { group = 0; showPlan(Number(pl.dataset.plan)); return; }
    const del = e.target.closest('[data-del]');
    if (del && st.parts.length > 1) {
      collect(); st.parts.splice(Number(del.dataset.del), 1);
      if (st.parts.length === 1) { st.auto = true; st.autoN = ''; }   // về 1 chi tiết: mặc định Tự động
      st.parts.forEach((p, k) => { if (/^CT\d+$/.test(String(p.name).trim())) p.name = `CT${k + 1}`; });   // mã tự đặt: đánh lại số
      renderParts(); collect(); schedule(); return;
    }
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
      savedState = structuredClone(st); syncUI(); baremStatus(); schedule(); return;
    }
  });
  on(materialControls, 'click', e => {
    const mat = e.target.closest('[data-mat]');
    if (mat && catalog) { st.material = Number(mat.dataset.mat); st.density = String(catalog[st.material].density); savedState = structuredClone(st); syncUI(); schedule(); }
  });
  on($('np-missing'), 'click', e => {
    if (!last) return;
    const lines = missingLines(last);
    if (!lines.length) return;
    if (e.target.closest('#np-miss-add')) {
      st.barem = (st.barem.trim() ? st.barem.replace(/\s*$/, '\n') : '') + lines.join('\n');
      $('np-barem').value = st.barem; savedState = structuredClone(st);
      root.querySelector('details.np-barem').open = true;
      baremStatus(); renderPartTable(last);
      ctx.showToast?.(`Đã thêm ${lines.length} kích thước vào bảng hao phí tiêu chuẩn.`);
    } else if (e.target.closest('#np-miss-copy')) {
      navigator.clipboard?.writeText(lines.join('\n')).then(() => ctx.showToast?.('Đã sao chép – dán vào bảng hao phí trên Google Sheets.'), () => {});
    }
  });
  on(root, 'click', e => {
    const src = e.target.closest('[data-stdsrc]');
    if (src) { st.stdSource = src.dataset.stdsrc; savedState = structuredClone(st); baremStatus(); if (last) renderPartTable(last); return; }
    if (e.target.closest('#np-std-copy') && last) {
      const lines = stdLines(last, false);
      navigator.clipboard?.writeText(['Kích thước\tHao phí', ...lines].join('\n')).then(() => ctx.showToast?.(`Đã sao chép ${lines.length} dòng hao phí tiêu chuẩn.`), () => {});
    }
  });
  on($('np-barem'), 'input', () => {
    st.barem = $('np-barem').value; savedState = structuredClone(st);
    baremStatus(); if (last) renderPartTable(last);
  });
  on($('np-btp-lib'), 'input', () => {
    st.btpLib = $('np-btp-lib').value; savedState = structuredClone(st); renderSemis(); schedule();
  });
  on($('np-add'), 'click', () => {
    collect();
    if (st.parts.length === 1 && st.auto !== false && st.autoN) st.parts[0].qty = st.autoN;   // rời Tự động: giữ số chiếc đã tính
    let no = st.parts.length + 1; while (st.parts.some(p => String(p.name).trim() === `CT${no}`)) no++;
    st.parts.push({ name: `CT${no}`, shape: 'rect', partW: '', partH: '', diameter: '', inner: '', allowance: '0', allowanceIn: '5', qty: '1', rotate: true });
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
  /** PDF sơ đồ cắt: mỗi kiểu tờ một trang A3 ngang – tiêu đề, sơ đồ đúng tỷ lệ, chú giải, số liệu tờ và tổng trình cắt. */
  async function nestingPDF(res) {
    const i = res.input, W = PDF_PAGE.w, H = PDF_PAGE.h, F = 'font-family="Arial,Helvetica,sans-serif"';
    const method = i.cutMethod === 'shear' ? 'chặt sấn' : 'laser / plasma';
    const title = `SƠ ĐỒ CẮT – ${matName()} ${pretty(i.thickness)} mm – ${method}`.replace(/\s+/g, ' ');
    const sub = [st.info.project ? 'Dự án: ' + st.info.project : '', st.info.drawingNo ? 'Số bản vẽ: ' + st.info.drawingNo : '',
      `Phương án: ${res.label}`, `Ngày: ${stamp()}`, st.info.drawnBy ? 'Người lập: ' + st.info.drawnBy : ''].filter(Boolean).join(' · ');
    const semiTxt = res.semiCount ? ` · gồm BTP ${res.types.filter(T => T.semi && T.qty).map(T => `${T.name} × ${T.qty}`).join(', ')}` : '';
    const foot = `Tổng ${res.totalSheets} tờ · xuất kho ${pretty(res.issuedKG)} kg · tấm lẻ thu hồi ${pretty(res.recoveredKG)} kg · thành phẩm ${pretty(res.finishedKG)} kg${semiTxt} · hao phí / TP ${res.wastePercent.toFixed(2)} %`;
    const pages = [];
    for (let gi = 0; gi < res.groups.length; gi++) {
      const g = res.groups[gi], pic = drawSheet(res, gi), nSemi = g.items.filter(p => p.semi).length;
      const legend = res.types.filter(T => g.counts[T.t] > 0).map(T => { const [fill, edge] = colorOfT(T);
        return { fill, edge, round: T.circle, dash: T.semi, text: `${T.t + 1}. ${T.name}${T.semi ? ' (BTP)' : ''} – ${sizeText(T)} × ${g.counts[T.t]}` }; });
      const legRows = Math.min(6, Math.max(1, legend.length)), legY = H - 70 - legRows * 32, statY = legY - 70;
      const body = `<text x="48" y="172" font-size="26" font-weight="700" fill="#5c29bf" ${F}>${esc(pic.title)}${g.n > 1 ? ` · ×${g.n} TỜ GIỐNG NHAU` : ''}</text>`
        + pdfEmbed(pic.svg, 48, 188, W - 96, statY - 188 - 34)
        + `<text x="48" y="${statY}" font-size="21" font-weight="700" fill="#2e1b70" ${F}>${esc(`${g.items.length - nSemi} chi tiết${nSemi ? ` + ${nSemi} BTP` : ''} · hao phí tờ ${g.wastePercent == null ? '—' : g.wastePercent.toFixed(2) + ' %'}${remsOf(g).length ? ` · sử dụng ${fmtTam(sheetUse(g))} tấm` : ''} · lấp đầy ${g.usedPercent.toFixed(1)} %`)}</text>`
        + `<text x="48" y="${statY + 30}" font-size="19" fill="#4a4470" ${F}>${esc(strategyText(g.strategy) + ' · ' + freeText(g))}</text>`
        + pdfLegend(legend, 48, legY + 20, 520, 6);
      pages.push(await pdfRaster(pdfPageSVG({ title, sub, page: gi + 1, pages: res.groups.length, body, foot })));
    }
    return pdfBytes(pages, `${title} ${st.info.drawingNo || ''}`);
  }
  on($('np-pdf'), 'click', async () => {
    if (!last) return;
    const btn = $('np-pdf'), res = last;
    btn.disabled = true; status('Đang dựng PDF sơ đồ cắt…', true);
    try {
      const pdf = await nestingPDF(res);
      downloadBlob?.(new Blob([pdf], { type: 'application/pdf' }), `${fileTag()}_so_do_cat.pdf`);
      ctx.showToast?.(`Đã tạo PDF sơ đồ cắt (${res.groups.length} trang A3).`);
    } catch (err) { put('np-error', 'Không tạo được PDF: ' + err.message); }
    finally { btn.disabled = !last; status(''); }
  });
  on($('np-dxf-cut'), 'click', () => {
    if (!last) return;
    const files = last.groups.map((g, gi) => ({
      name: `${fileTag()}_${sheetRange(last, gi).replace(/\s|–/g, '-')}${g.n > 1 ? `_x${g.n}` : ''}_${g.W}x${g.needH ?? g.H}x${last.input.thickness}.dxf`,
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
    const res = last, alloc = allocateWaste(res, stdOf(res)), i = res.input, kgOf = a => a * i.thickness * i.density / 1e9;
    const head = arr => arr.map(v => ({ v, s: 'head' }));
    const r2 = v => v == null ? '' : { v: Math.round(v * 100) / 100, s: 'dec' }, pc = v => v == null ? '' : { v: Math.round(v * 100) / 100, s: 'pct' };
    const title = `${matName()} ${i.thickness} mm – ${i.cutMethod === 'shear' ? 'chặt sấn' : 'laser / plasma'}`;
    const shapeOf = T => T.ring ? 'Vành khuyên' : T.circle ? 'Tròn' : 'Chữ nhật';
    const tpOf = T => T.ring ? `Ø${T.tpW} / Ø${T.tpIn}` : T.circle ? `D${T.tpW}` : `${T.tpW} x ${T.tpH}`;
    const sh = res.shrinkMM || 0, cutOf = T => T.ring ? `Ø${T.cw - sh} / Ø${T.hole}` : T.circle ? `D${T.cw - sh}` : `${T.cw - sh} x ${T.ch - sh}`;
    // 1. danh sách chi tiết + hao phí tiêu chuẩn / thực tế
    const s1 = [[{ v: `THÔNG TIN CẮT – ${title}`, s: 'title' }], [{ v: `${st.info.project ? 'Dự án: ' + st.info.project + ' · ' : ''}Phương án: ${res.label} · HP THỰC TẾ dùng cho bóc tách, chi phí và thống kê; HP tiêu chuẩn chỉ để tham chiếu (kiểm soát, báo giá) · HP thực tế = HP tiêu chuẩn × K, với K = (xuất kho − thu hồi − Σ TP) / Σ (TP × HP tiêu chuẩn) = ${alloc.K == null ? '—' : alloc.K.toFixed(4)}`, s: 'note' }],
      head(['NO', 'Mã chi tiết', 'Hình dạng', 'Thành phẩm (mm)', 'Kích thước cắt (mm)', 'Số lượng', 'KL TP / chiếc (kg)', 'KL TP (kg)']).concat(
        ['HP tiêu chuẩn – tham chiếu (%)', 'KL xuất theo tiêu chuẩn (kg)', 'Hệ số K'].map(v => ({ v, s: 'head' })),
        ['HP THỰC TẾ (%)', 'KL XUẤT THỰC TẾ (kg)'].map(v => ({ v, s: 'hlhead' })), [{ v: 'Chênh lệch (kg)', s: 'head' }, { v: 'Ghi chú', s: 'head' }])];
    let sTP = 0, sStd = 0, sAct = 0, stdAll = true;
    const SEMI_S = { int: 'semiint', dec: 'semidec', ref: 'semidec', hldec: 'semidec', hlpct: 'semipct' };
    const semiRow = row => row.map(c => (c && typeof c === 'object' ? { ...c, s: SEMI_S[c.s] || 'semi' } : { v: c ?? '', s: 'semi' }));
    let semiHeadDone = false;
    res.types.forEach((T, k) => {
      if (T.semi && !T.qty) return;
      const a = alloc[k]; sTP += a.tpKG; sAct += a.issuedKG; sStd += a.stdIssuedKG;
      if (T.semi && !semiHeadDone) { semiHeadDone = true; s1.push([{ v: '', s: 'semihead' }, { v: 'BÁN THÀNH PHẨM – nhập kho BTP (máy tự tính số lượng)', s: 'semihead' }]); }
      (T.semi ? (row => s1.push(semiRow(row))) : (row => s1.push(row)))([{ v: T.t + 1, s: 'int' }, T.name, shapeOf(T), tpOf(T), cutOf(T), { v: T.qty, s: 'int' }, r2(kgOf(T.tpArea)), r2(a.tpKG),
        a.std == null ? '' : { v: Math.round(a.std * 100) / 100, s: 'ref' }, r2(a.stdIssuedKG), alloc.K == null ? '' : { v: Math.round(alloc.K * 10000) / 10000, s: 'dec' },
        { v: Math.round(a.actual * 100) / 100, s: 'hlpct' }, { v: Math.round(a.issuedKG * 100) / 100, s: 'hldec' },
        a.stdIssuedKG == null ? '' : r2(a.issuedKG - a.stdIssuedKG),
        [T.semi ? 'BÁN THÀNH PHẨM – nhập kho BTP' : '', a.source === 'new' ? `HP tiêu chuẩn TÍNH MỚI (1 chi tiết / tờ ${T.barem.W}×${T.barem.H}: ${T.barem.n} chiếc / tờ) – cần bổ sung vào bảng`
          : a.source === 'auto' ? `HP tiêu chuẩn máy tính: 1 chi tiết / tờ ${T.barem.W}×${T.barem.H}, ${T.barem.n} chiếc / tờ`
          : a.source === 'none' ? 'Không lọt tờ khổ chuẩn – tạm dùng hao phí chung, cần nhập tay' : 'HP tiêu chuẩn theo bảng công ty',
         a.capped ? `khổ vuông: giới hạn ${capOf()} %` : '',
         T.inHoles ? `${T.inHoles} chiếc chèn trong lỗ vành` : ''].filter(Boolean).join('; ')]);
    });
    // 5. bán thành phẩm – dạng NHẬT KÝ (mỗi mã một dòng) để sau này nạp vào database thống kê theo tháng
    const semiLog = res.types.filter(T => T.semi && T.qty);
    const s5 = [[{ v: `BÁN THÀNH PHẨM ĐÃ LẤP – ${title}`, s: 'title' }], [{ v: 'Mỗi dòng một mã BTP – giữ nguyên cột để nạp database thống kê theo tháng', s: 'note' }],
      head(['Ngày lập', 'Dự án', 'Số bản vẽ', 'Phương án', 'Mã BTP', 'Dày (mm)', 'Vật liệu', 'Hình dạng', 'Thành phẩm (mm)', 'Kích thước cắt (mm)', 'Số lượng', 'KL / chiếc (kg)', 'KL (kg)']),
      ...semiLog.map(T => [stamp(), st.info.project || '', st.info.drawingNo || '', res.label, T.name, { v: i.thickness, s: 'dec' }, matName(), shapeOf(T), tpOf(T), cutOf(T),
        { v: T.qty, s: 'int' }, r2(kgOf(T.tpArea)), r2(T.qty * kgOf(T.tpArea))])];
    s1.push([{ v: '', s: 'bold' }, { v: 'TỔNG', s: 'bold' }, { v: '', s: 'bold' }, { v: '', s: 'bold' }, { v: '', s: 'bold' }, { v: res.pieces, s: 'boldint' }, { v: '', s: 'bold' },
      { v: Math.round(sTP * 100) / 100, s: 'bolddec' }, { v: '', s: 'bold' }, stdAll ? { v: Math.round(sStd * 100) / 100, s: 'bolddec' } : { v: '', s: 'bold' },
      alloc.K == null ? { v: '', s: 'bold' } : { v: Math.round(alloc.K * 10000) / 10000, s: 'bolddec' }, { v: Math.round(res.wastePercent * 100) / 100, s: 'hlpct' }, { v: Math.round(sAct * 100) / 100, s: 'hldec' }, stdAll ? { v: Math.round((sAct - sStd) * 100) / 100, s: 'bolddec' } : { v: '', s: 'bold' }, { v: '', s: 'bold' }]);
    // 2. sơ đồ từng tờ
    const s2 = [[{ v: `SƠ ĐỒ CẮT TỪNG TỜ – ${title}`, s: 'title' }], [{ v: `Mạch cắt ${i.gap} mm · chừa mép ${i.margin} mm · thu hồi tấm lẻ khi cạnh ngắn ≥ ${i.remnantMin} mm`, s: 'note' }],
      head(['Kiểu tờ', 'Tờ số', 'Số tờ', 'Khổ (mm)', 'Nguồn phôi', 'Mã lô / seri', ...res.types.map(T => `${T.t + 1}. ${T.name}`), 'Sử dụng (tấm / tờ)', 'Sử dụng cả nhóm (tấm)', 'Lấp đầy (%)', 'Hao phí tờ (%)', 'Dư phải (mm)', 'Dư dưới (mm)', 'Tấm lẻ thu hồi (mm)'])];
    const fr = (g, side) => { const f = g.freeStrips.find(x => x.side === side), sh = g.needH ?? g.H;
      if (!f) return '0'; const h = side === 'right' ? sh : f.h - (g.H - sh); return `${Math.round(f.w * 10) / 10} x ${Math.round(h * 10) / 10}`; };
    res.groups.forEach((g, gi) => s2.push([{ v: gi + 1, s: 'int' }, sheetRange(res, gi), { v: g.n, s: 'int' }, needText(g) ? `${g.Wn} x ${g.Hn} (${needText(g)})` : `${g.W} x ${g.H}`, g.remnantStock ? 'Tấm lẻ kho' : 'Khổ chuẩn', g.lot || '',
      ...res.types.map(T => ({ v: g.counts[T.t], s: 'int' })), { v: Math.round(sheetUse(g) * 1000) / 1000, s: 'dec3' }, { v: Math.round(g.n * sheetUse(g) * 1000) / 1000, s: 'dec3' }, pc(g.usedPercent), pc(g.wastePercent), fr(g, 'right'), fr(g, 'bottom'), remsOf(g).map(o => `${o.w} x ${o.h}`).join(' + ')]));
    // 3. toạ độ
    const s3 = [[{ v: 'TOẠ ĐỘ CHI TIẾT (gốc: góc trên-trái tờ, mm)', s: 'title' }], [],
      head(['Kiểu tờ', 'STT', 'NO', 'Mã chi tiết', 'Hình dạng', 'X (mm)', 'Y (mm)', 'Dài cắt (mm)', 'Rộng cắt (mm)', 'Ø lỗ (mm)', 'Xoay 90°'])];
    res.groups.forEach((g, gi) => g.items.forEach((p, k) => s3.push([{ v: gi + 1, s: 'int' }, { v: k + 1, s: 'int' }, { v: p.t + 1, s: 'int' }, res.types[p.t].name,
      p.ring ? 'Vành khuyên' : p.circle ? 'Tròn' : 'Chữ nhật', r2(p.x), r2(p.y), r2(p.w), r2(p.h), p.ring ? r2(p.hole) : '', p.rot ? 'Có' : ''])));
    // 4. tổng hợp
    const s4 = [[{ v: `TỔNG HỢP ĐỊNH MỨC – ${title}`, s: 'title' }], [], head(['Hạng mục', 'Giá trị', 'Ghi chú']),
      ['Dự án', st.info.project || '', ''], ['Số bản vẽ', st.info.drawingNo || '', ''], ['Vật liệu', matName(), `${i.density} kg/m³`],
      ['Chiều dày', { v: i.thickness, s: 'dec' }, 'mm'], ['Phương pháp cắt', i.cutMethod === 'shear' ? 'Chặt sấn' : 'Laser / Plasma', `mạch cắt ${i.gap} mm · chừa mép ${i.margin} mm`],
      ['Phương án', res.label, ''], ['Số tờ xuất', { v: res.totalSheets, s: 'int' }, [...new Set(res.groups.map(g => sizeOf(g)))].join(', ')],
      ...(res.shrinkMM ? [['Giảm kích thước cắt', { v: res.shrinkMM, s: 'dec' }, 'mm mỗi chi tiết (dài / rộng hoặc đường kính) – người dùng duyệt']] : []),
      ...(res.enlargeMM ? [['Tăng khổ phôi', res.label.split(' + ')[0].replace('Tăng khổ ', ''), `${[...new Set(res.groups.filter(g => g.needW || g.needH).map(needText))].join(' / ')} mm; xuất kho vẫn tính theo khổ danh nghĩa – người dùng duyệt`]] : []),
      ['Xuất kho quy đổi (sử dụng)', useBySize(res), 'tấm · có thu hồi thì = 1 − tấm lẻ / tờ'],
      ['Khối lượng xuất kho', r2(res.issuedKG), 'kg'], ['Tấm lẻ thu hồi', r2(res.recoveredKG), `kg · ngưỡng ≥ ${i.remnantMin} mm`],
      ['Thép thực tiêu hao', r2(res.issuedKG - res.recoveredKG), 'kg'], ['Khối lượng thành phẩm', r2(res.finishedKG), `kg (phủ bì, vành khuyên trừ lỗ${res.semiCount ? '; gồm bán thành phẩm' : ''})`],
      ...(res.semiCount ? [['Bán thành phẩm lấp phần dư', { v: res.semiCount, s: 'int' }, `chiếc · ${pretty(res.semiKG)} kg · ${res.types.filter(T => T.semi && T.qty).map(T => `${T.name} × ${T.qty}`).join(', ')} – nhập kho BTP`]] : []),
      ['Số tấm lẻ thu hồi', { v: res.remCount ?? 0, s: 'int' }, 'quy tắc: ít tờ nhất → dồn dư về 1 tấm'],
      ['HAO PHÍ CHUNG / TP', pc(res.wastePercent), '(xuất − thu hồi − TP) / TP'], ['Hao phí nếu không thu hồi', pc(res.wasteFullPercent), ''],
      ['Số tờ tối thiểu', res.lowerBound == null ? '' : res.proven ? 'Đã chứng minh' : `Cận dưới ${res.lowerBound} tờ`, ''],
      ['Nguồn HP tiêu chuẩn', st.stdSource === 'table' ? `Bảng công ty (${barem().map.size} kích thước)` : 'Máy tự tính (1 chi tiết / tờ khổ chuẩn)',
        st.stdSource === 'table' ? `${alloc.filter(a => a.source === 'table').length}/${res.types.length} chi tiết có trong bảng` : 'tham chiếu cho kiểm soát và báo giá'],
      ['Trần HP khổ vuông', capOf() == null ? 'không áp dụng' : { v: capOf(), s: 'pct' }, `${i.cutMethod === 'shear' ? 'chặt sấn' : 'laser / plasma'} · chỉ áp cho HP máy tính · ${alloc.filter(a => a.capped).length} chi tiết bị giới hạn`],
      ['Hệ số K', alloc.K == null ? '' : { v: Math.round(alloc.K * 10000) / 10000, s: 'dec' }, 'HP thực tế = HP tiêu chuẩn × K; Σ TP × (1 + HP thực tế) = xuất kho − thu hồi'],
      [], [{ v: `Ngày lập: ${stamp()}${st.info.drawnBy ? ' · Người lập: ' + st.info.drawnBy : ''}`, s: 'note' }]];
    const book = xlsxBook([
      { name: 'Danh sách chi tiết', cols: [6, 22, 12, 16, 16, 9, 12, 12, 13, 15, 10, 13, 15, 13, 30], rows: s1, freeze: 3 },
      { name: 'Sơ đồ từng tờ', cols: [8, 10, 8, 14, 12, 14, ...res.types.map(() => 11), 12, 13, 10, 12, 16, 16, 18], rows: s2, freeze: 3 },
      { name: 'Toạ độ', cols: [8, 7, 6, 22, 12, 11, 11, 12, 12, 10, 9], rows: s3, freeze: 3 },
      { name: 'Tổng hợp', cols: [28, 24, 44], rows: s4 },
      ...(semiLog.length ? [{ name: 'Bán thành phẩm', cols: [11, 18, 16, 30, 18, 9, 14, 11, 16, 16, 10, 13, 12], rows: s5, freeze: 3 }] : []),
    ]);
    downloadBlob?.(new Blob([book], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${fileTag()}_thong_tin_cat.xlsx`);
    ctx.showToast?.('Đã tạo file Excel thông tin cắt.');
  });
  async function loadCatalog() {
    const sel = $('np-mat-list'), warn = $('np-warn');
    try {
      const list = await loadMaterials();
      if (disposed || ctx.signal?.aborted) return;
      if (!Array.isArray(list) || list.length < 4 || !list.every(v => v && typeof v.name === 'string' && Number.isFinite(v.density) && v.density > 0)) throw Error('Danh mục không hợp lệ');
      catalog = list;
      sel.replaceChildren(new Option('Vật liệu', ''), ...list.map((v, k) => new Option(v.name, String(k))));
      sel.disabled = false;
      materialControls.querySelectorAll('[data-mat]').forEach((b, k) => { b.disabled = false; b.textContent = list[k].name; });
      if (st.material === -1 && Number(st.density) > 0) { savedState = structuredClone(st); syncUI(); schedule(); return; }   // khối lượng riêng lấy từ file Excel
      if (!Number.isInteger(st.material) || st.material < 0 || st.material >= list.length) st.material = 0;
      st.density = String(list[st.material].density); savedState = structuredClone(st); syncUI(); schedule();
    } catch (err) {
      if (disposed || ctx.signal?.aborted) return;
      warn.hidden = false; warn.textContent = 'Không tải được materials.json; đang dùng khối lượng riêng đã lưu (' + st.density + ' kg/m³).';
      console.warn('Nesting PRO catalog:', err);
    }
  }
  /* ---------------- NHẬP EXCEL / DXF (cutting-plan-import.js nạp khi cần) ---------------- */
  let importer = null, imp = null;
  const loadImporter = () => importer ??= import(new URL('./cutting-plan-import.js', import.meta.url).href).catch(err => {
    importer = null; console.warn('cutting-plan-import.js:', err);
    throw Error('Không nạp được bộ nhập liệu cutting-plan-import.js – đặt file này cùng thư mục với cutting-plan-plate.js.');
  });
  const impBox = () => $('np-imp');
  const n4 = v => (v == null || v === '' ? '' : String(Math.round(Number(v) * 1e4) / 1e4));
  const setInput = (name, v) => { const el = root.querySelector(`[name="${name}"]`); if (el) el.value = v; };
  const li = (list, cls) => list.length ? `<ul class="${cls}">${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  function impError(msg) {
    imp = null; const box = impBox(); box.hidden = false;
    box.innerHTML = `<h4>Không nhập được file <button type="button" class="np-export" data-imp="close">Đóng</button></h4><ul class="bad"><li>${esc(msg)}</li></ul>`;
  }
  /** Khối lượng riêng theo mác: bảng trong file → danh mục vật liệu (tên trùng hoặc nằm trong mác, ưu tiên tên dài nhất) → giữ vật liệu đang chọn. */
  function densityFor(g, norm) {
    if (g.density) return { density: g.density.density, material: -1, text: `${g.density.grade}: ${g.density.density} kg/m³ (theo file)` };
    const key = norm(g.grade);
    const hit = (catalog || []).map((v, k) => ({ v, k, n: norm(v.name) })).filter(x => x.n && (x.n === key || key.includes(x.n))).sort((a, b) => b.n.length - a.n.length)[0];
    if (hit) return { density: hit.v.density, material: hit.k, text: `${hit.v.name}: ${hit.v.density} kg/m³ (danh mục vật liệu)` };
    return null;
  }
  function renderXlsx() {
    const { file, data, M } = imp, box = impBox(); box.hidden = false;
    const blocked = data.errors.length > 0;
    const groups = data.plateGroups.map((g, k) => {
      const bad = blocked || g.errors.length > 0, dens = densityFor(g, M.norm);
      const kho = g.stocks.length ? `kho phôi: ${g.stocks.length} dòng (${g.stocks.filter(s => s.remnant).length} tấm lẻ)` : 'kho phôi: khổ đang có trên chương trình';
      return `<div class="np-imp-g${bad ? ' is-bad' : ''}"><span><b>${esc(g.label)}</b><small>${g.rows.length} loại · ${g.pieces.toLocaleString('vi-VN')} chiếc · ${kho}</small>
        <small>${dens ? 'Khối lượng riêng ' + esc(dens.text) : `⚠ Chưa có khối lượng riêng cho mác "${esc(g.grade)}" – sẽ dùng vật liệu đang chọn`}</small>
        ${g.autoMethod ? '<small>Có dòng để trống phương pháp: ' + (g.method ? 'xếp vào nhóm này theo quy ước form' : 'theo phương pháp đang chọn') + '</small>' : ''}${li(g.errors.slice(0, 12), 'bad')}${g.errors.length > 12 ? `<small class="bad">… còn ${g.errors.length - 12} lỗi</small>` : ''}</span>
        <button type="button" class="np-export" data-imp-group="${k}"${bad ? ' disabled' : ''}>Nạp trình cắt này</button></div>`;
    }).join('');
    const prof = data.profileGroups.length ? `<p class="np-hint">${data.profileGroups.length} trình cắt thép hình (${data.profileGroups.reduce((s, g) => s + g.rows.length, 0)} dòng) – nạp bằng công cụ Cutting plan thép hình.</p>` : '';
    box.innerHTML = `<h4>Excel: ${esc(file)} <button type="button" class="np-export" data-imp="close">Đóng</button></h4>
      ${blocked ? '<p class="np-hint bad">Sửa các lỗi dưới đây trong file rồi nhập lại – chưa nạp được trình cắt nào.</p>' : ''}${li(data.errors, 'bad')}${li(data.warnings, 'warn')}
      ${data.plateGroups.length ? `<p class="np-hint">${data.plateGroups.length} trình cắt tôn tấm (nhóm theo Mác + Dày + Phương pháp). Mỗi lần nạp một trình cắt – nạp sẽ THAY danh sách chi tiết, chiều dày, phương pháp, kho phôi hiện tại.</p>` : '<p class="np-hint">File không có dòng tôn tấm.</p>'}
      ${groups}${prof}${imp.applied ? `<p class="np-hint ok">✓ ${esc(imp.applied.title)}</p>${li(imp.applied.notes, 'ok')}` : ''}`;
  }
  function applyXlsxGroup(k) {
    const { data, M } = imp, g = data.plateGroups[k], P = data.params;
    if (!g || data.errors.length || g.errors.length) return;
    collect();
    const notes = [], method = g.method || st.cutMethod;
    if (method !== st.cutMethod) {
      st.thick[st.cutMethod] = st.thickness; st.gaps[st.cutMethod] = st.gap; st.margins[st.cutMethod] = st.margin;
      st.cutMethod = method; st.thickness = st.thick[method]; st.gap = st.gaps[method]; st.margin = st.margins[method];
    }
    st.thickness = n4(g.thick);
    const setP = (stKey, pKey, label) => { if (P[pKey] == null) return; const old = st[stKey]; st[stKey] = n4(P[pKey]); if (String(old) !== st[stKey]) notes.push(`${label}: ${old} → ${st[stKey]} mm (theo file)`); };
    if (method === 'laser') { setP('gap', 'laserGap', 'Mạch cắt'); setP('margin', 'laserMargin', 'Chừa mép'); }
    else { setP('gap', 'shearGap', 'Khe hở'); setP('margin', 'shearMargin', 'Chừa mép'); }
    setP('remnantMin', 'remnantMin', 'Ngưỡng tấm lẻ cạnh ngắn'); setP('remnantMinLong', 'remnantMinLong', 'Ngưỡng tấm lẻ cạnh dài'); setP('longStripMin', 'longStripMin', 'Ưu tiên dải dài');
    setP('lengthTol', 'lengthTol', 'Đề xuất tăng khổ dài'); setP('widthTol', 'widthTol', 'Đề xuất tăng khổ rộng'); setP('shrinkTol', 'shrinkTol', 'Đề xuất giảm kích thước');
    const defAllow = shape => n4(shape === 'rect' ? P.allowRect ?? ALLOW_DEFAULT.rect : P.allowRound ?? ALLOW_DEFAULT[shape]);
    st.auto = false;                                    // BOM có số lượng đơn hàng – không dùng Tự động
    st.parts = g.rows.map(r => ({ name: r.code, shape: r.shape, partW: n4(r.partW), partH: n4(r.partH), diameter: n4(r.diameter), inner: n4(r.inner),
      allowance: r.allowance == null ? defAllow(r.shape) : n4(r.allowance), allowanceIn: r.allowanceIn == null ? n4(P.allowIn ?? 5) : n4(r.allowanceIn), qty: String(r.qty), rotate: r.rotate !== false }));
    if (g.stocks.length) {
      const rows = g.stocks.map(s => ({ kind: s.remnant ? 'rem' : 'std', W: n4(s.W), H: n4(s.H), qty: s.qty == null ? '' : String(s.qty), lot: (s.lot || '').slice(0, 60) }));
      const keep = rows.some(r => r.kind === 'std') ? [] : st.stocks[method].filter(s => s.kind === 'std');
      st.stocks[method] = [...rows, ...keep].slice(0, 40);
      notes.push(`Kho phôi: ${rows.length} dòng từ file${keep.length ? ` + ${keep.length} khổ chuẩn đang có` : ' (thay khổ đang có)'}`);
    }
    const dens = densityFor(g, M.norm);
    if (dens) { st.density = String(dens.density); st.material = dens.material; notes.push('Khối lượng riêng ' + dens.text); }
    else notes.push(`Chưa có khối lượng riêng cho mác "${g.grade}" – đang dùng vật liệu đã chọn (${st.density} kg/m³). Bổ sung ở sheet 3_Thong_so_cat.`);
    st.info = { ...st.info, material: g.grade, ...(data.info.project ? { project: data.info.project } : {}), ...(data.info.drawingNo ? { drawingNo: data.info.drawingNo } : {}), ...(data.info.drawnBy ? { drawnBy: data.info.drawnBy } : {}) };
    renderParts(); syncUI();
    for (const key of ['remnantMin', 'remnantMinLong', 'longStripMin', 'lengthTol', 'widthTol', 'shrinkTol']) setInput(key, st[key]);
    setInput('project', st.info.project); setInput('drawingNo', st.info.drawingNo); setInput('matName', st.info.material); setInput('drawnBy', st.info.drawnBy);
    collect(); savedState = structuredClone(st);
    imp.applied = { title: `Đã nạp ${g.label}: ${g.rows.length} loại, ${g.pieces.toLocaleString('vi-VN')} chiếc. Kết quả tính lại ở khung bên phải.`, notes };
    renderXlsx(); schedule();
  }
  const DXF_KIND = { rect: 'Chữ nhật', circle: 'Tròn', ring: 'Vành khuyên', other: 'Đa giác' };
  const dxfSize = it => it.kind === 'ring' ? `Ø${pretty(it.d)} / Ø${pretty(it.inner)}` : it.kind === 'circle' ? 'D' + pretty(it.d) : `${pretty(it.w)} × ${pretty(it.h)}`;
  function renderDxf() {
    const { file, res } = imp, box = impBox(); box.hidden = false;
    const sk = res.skipped, skipped = [sk.open && `${sk.open} đường hở / giao nhau`, sk.spline && `${sk.spline} spline`, sk.ellipse && `${sk.ellipse} elip`,
      sk.text && `${sk.text} chữ`, sk.dim && `${sk.dim} kích thước`, sk.hatch && `${sk.hatch} hatch`, sk.other && `${sk.other} đối tượng khác`].filter(Boolean).join(' · ');
    const total = res.items.reduce((s, it, k) => s + (imp.pick.has(k) ? it.qty : 0), 0);
    box.innerHTML = `<h4>DXF: ${esc(file)} <button type="button" class="np-export" data-imp="close">Đóng</button></h4>
      <p class="np-hint">Kích thước đọc từ bản vẽ hiểu là THÀNH PHẨM; dư gia công lấy mặc định (chữ nhật ${ALLOW_DEFAULT.rect}, tròn ${ALLOW_DEFAULT.circle} mm). Dày, vật liệu, phương pháp cắt: theo ô đang nhập.
       Đơn vị: <b>${esc(res.units)}</b>${res.fileUnits && res.unitScale !== 1 ? ` <label><input type="checkbox" data-imp-mm ${imp.opts.forceMM ? 'checked' : ''}> Coi là mm (bản vẽ ghi ${esc(res.fileUnits)})</label>` : ''}</p>
      <div class="np-imp-layers">${res.layers.map(l => `<label title="${l.count} đối tượng"><input type="checkbox" data-imp-layer="${esc(l.name)}" ${l.used ? 'checked' : ''}> ${esc(l.name)}${l.hidden ? ' (đang tắt)' : ''}</label>`).join('')}</div>
      ${li(res.warnings, 'warn')}
      <p class="np-hint">${res.items.length} kích thước · ${res.holes} lỗ / khoét trong chi tiết (tính phủ bì, bỏ qua)${skipped ? ' · bỏ qua: ' + skipped : ''}</p>
      ${res.items.length ? `<div class="np-scroll"><table><thead><tr><th></th><th>Loại</th><th class="num">Kích thước TP (mm)</th><th class="num">Số lượng</th><th>Lớp</th><th>Ghi chú</th></tr></thead><tbody>
      ${res.items.map((it, k) => `<tr class="${imp.pick.has(k) ? '' : 'is-off'}"><td><input type="checkbox" data-imp-item="${k}" ${imp.pick.has(k) ? 'checked' : ''} aria-label="Lấy dòng ${k + 1}"></td>
        <td>${DXF_KIND[it.kind]}</td><td class="num">${dxfSize(it)}</td><td class="num">${it.qty}</td><td>${esc(it.layers.join(', '))}</td>
        <td>${it.frame ? `Trùng khổ giấy ${it.frame} – có thể là khung bản vẽ, mặc định không lấy` : ''}${it.kind === 'other' ? `${it.curved ? 'Có cung' : 'Đa giác'} – xếp theo đường bao thật (laser / plasma)` : ''}${it.skew ? 'Vẽ xiên' : ''}${it.holes ? `${it.kind === 'other' ? ' · ' : ''}${it.holes} lỗ` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="np-hint bad">Không tìm thấy đường bao kín nào trên các lớp đã chọn.</p>'}
      ${st.cutMethod === 'shear' && res.items.some((it, k) => imp.pick.has(k) && it.kind !== 'rect') ? '<p class="np-hint warn">Đang chọn Chặt sấn: chi tiết tròn / vành khuyên / đa giác phải chuyển sang Laser / Plasma.</p>' : ''}
      <div class="np-imp-act"><button type="button" class="np-export" data-imp="replace"${total ? '' : ' disabled'}>Thay danh sách chi tiết (${total.toLocaleString('vi-VN')} chiếc)</button>
       <button type="button" class="np-export" data-imp="append"${total ? '' : ' disabled'}>Thêm vào danh sách</button></div>
      ${imp.applied ? `<p class="np-hint ok">✓ ${esc(imp.applied)}</p>` : ''}`;
  }
  function analyzeAgain() {
    try { imp.res = imp.M.analyzeDxf(imp.dxf, imp.opts); imp.pick = new Set(imp.res.items.map((it, k) => it.frame ? -1 : k).filter(k => k >= 0)); imp.applied = ''; renderDxf(); }
    catch (e) { impError(e.message); }
  }
  function applyDxf(mode) {
    const items = imp.res.items.filter((it, k) => imp.pick.has(k));
    if (!items.length) return;
    collect();
    const name = it => it.kind === 'ring' ? `VK${n4(it.d)}/${n4(it.inner)}` : it.kind === 'circle' ? `D${n4(it.d)}` : `${it.kind === 'other' ? 'DG' : ''}${n4(it.w)}x${n4(it.h)}`;
    const add = items.map(it => it.kind === 'other'
      ? { name: name(it), shape: 'poly', partW: String(it.w), partH: String(it.h), outline: it.outline, diameter: '', inner: '', allowance: '0', allowanceIn: '5', qty: String(it.qty), rotate: true }
      : it.kind === 'rect'
      ? { name: name(it), shape: 'rect', partW: n4(it.w), partH: n4(it.h), diameter: '', inner: '', allowance: ALLOW_DEFAULT.rect, allowanceIn: '5', qty: String(it.qty), rotate: true }
      : { name: name(it), shape: it.kind, partW: '', partH: '', diameter: n4(it.d), inner: it.kind === 'ring' ? n4(it.inner) : '', allowance: ALLOW_DEFAULT[it.kind], allowanceIn: '5', qty: String(it.qty), rotate: true });
    if (st.parts.length + (mode === 'replace' ? 0 : add.length) > MAX_TYPES || add.length > MAX_TYPES) { impError(`Tối đa ${MAX_TYPES} loại chi tiết một trình cắt.`); return; }
    st.parts = mode === 'replace' ? add : [...st.parts, ...add];
    if (st.parts.length === 1) { st.auto = true; st.autoN = ''; }   // một chi tiết từ bản vẽ: mặc định Tự động (barem)
    renderParts(); collect(); savedState = structuredClone(st);
    imp.applied = `${mode === 'replace' ? 'Đã thay' : 'Đã thêm'} ${add.length} loại, ${items.reduce((s, it) => s + it.qty, 0).toLocaleString('vi-VN')} chiếc. Kết quả tính lại ở khung bên phải.`;
    renderDxf(); schedule();
  }
  async function openFile(kind, file) {
    if (!file) return;
    status('Đang đọc file…', true);
    try {
      const M = await loadImporter();
      if (kind === 'xlsx') {
        const book = await M.readXlsx(await M.readFileBytes(file, M.LIMITS.xlsxBytes));
        imp = { type: 'xlsx', file: file.name, M, data: M.parseCuttingPlanBook(book), applied: null };
        renderXlsx();
      } else {
        const bytes = await M.readFileBytes(file, M.LIMITS.dxfBytes);
        imp = { type: 'dxf', file: file.name, M, dxf: M.readDxf(new TextDecoder('utf-8').decode(bytes)), opts: { layers: null, forceMM: false } };
        analyzeAgain();
      }
      status('');
    } catch (e) { status(''); impError(e?.message || 'Không đọc được file.'); }
  }
  if ($('np-guide-btn')) on($('np-guide-btn'), 'click', () => {
    const b = $('np-guide-btn'), open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(open)); $('np-guide').hidden = !open;
  });
  on($('np-imp-xlsx'), 'click', () => { $('np-file-xlsx').value = ''; $('np-file-xlsx').click(); });
  on($('np-imp-dxf'), 'click', () => { $('np-file-dxf').value = ''; $('np-file-dxf').click(); });
  on($('np-file-xlsx'), 'change', e => openFile('xlsx', e.target.files?.[0]));
  on($('np-file-dxf'), 'change', e => openFile('dxf', e.target.files?.[0]));
  on($('np-imp'), 'click', e => {
    const b = e.target.closest('[data-imp],[data-imp-group]'); if (!b) return;
    if (b.dataset.imp === 'close') { imp = null; impBox().hidden = true; impBox().innerHTML = ''; return; }
    if (b.dataset.impGroup != null && imp?.type === 'xlsx') { applyXlsxGroup(Number(b.dataset.impGroup)); return; }
    if ((b.dataset.imp === 'replace' || b.dataset.imp === 'append') && imp?.type === 'dxf') applyDxf(b.dataset.imp);
  });
  on($('np-imp'), 'change', e => {
    if (imp?.type !== 'dxf') return;
    const t = e.target;
    if (t.matches('[data-imp-item]')) { const k = Number(t.dataset.impItem); if (t.checked) imp.pick.add(k); else imp.pick.delete(k); imp.applied = ''; renderDxf(); }
    else if (t.matches('[data-imp-layer]')) { imp.opts.layers = new Set([...impBox().querySelectorAll('[data-imp-layer]')].filter(x => x.checked).map(x => x.dataset.impLayer)); analyzeAgain(); }
    else if (t.matches('[data-imp-mm]')) { imp.opts.forceMM = t.checked; analyzeAgain(); }
  });
  renderParts(); renderSemis(); syncUI(); baremStatus(); compute(); void loadCatalog();
  return () => { disposed = true; clearTimeout(timer); serial++; worker?.terminate(); worker = null; materialHeader?.remove(); };
}
