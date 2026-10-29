/**
 * Epsilon Soft - CUTTING PLAN SECTION (thép hình) – Cắt thép hình 1D + ĐỀ XUẤT NỐI CỘT (Web) – BẢN TEST NỘI BỘ
 * Đổi tên 28/10/2026: trước là "Cắt thép hình 1D PRO MAX" (thep_hinh_pro_max.js).
 * Tên file: cutting-plan-section.js. Kế thừa bản PRO, thêm 3 phương án: không nối / nối ít / nối nhiều.
 * Đầu vào: nhập tay hoặc Excel (form cutting plan 3 sheet, các dòng Thép hình). Excel đọc bằng cutting-plan-import.js
 *  (đặt cùng thư mục, chỉ nạp khi bấm nút – thiếu file thì nhập tay vẫn chạy). Thép hình không nhập DXF.
 * !!! File này chứa toàn bộ thuật toán. Chỉ dùng để test nội bộ, KHÔNG đưa lên web công khai.
 * Quy ước (đã chốt với anh):
 *  - Chiều dài nhập là THÀNH PHẨM; chiều dài CẮT = thành phẩm + dư gia công.
 *  - Mỗi nhát cưa mất "mạch cưa" (mặc định 3 mm); có thể cắt bỏ đầu cây trước khi cắt.
 *  - Cây lẻ chỉ thu hồi khi dài ≥ ngưỡng (mặc định 1000 mm).
 *  - Hao phí / TP = (KL xuất − KL thu hồi − KL thành phẩm) / KL thành phẩm.
 *  - Không giới hạn số loại chi tiết, không giới hạn số cây: ghép đến khi hết chi tiết.
 *  - Thứ tự chọn: ít cây nhất → phần dư dồn vào MỘT cây cuối thành cây lẻ dài nhất
 *    → ít kiểu cắt khác nhau nhất.
 *  - Bài toán vừa: duyệt toàn bộ → số cây tối thiểu ĐƯỢC CHỨNG MINH.
 *    Bài toán lớn: tính cận dưới chặt bằng quy hoạch tuyến tính; phương án bằng cận dưới
 *    là tối ưu đã chứng minh, nếu chưa bằng thì báo rõ còn cách cận dưới bao nhiêu cây.
 *  - Xuất file: DXF sơ đồ trải phôi (sạch, không nét thừa) + Excel danh sách chi tiết cắt.
 * Bản quyền © Epsilon Soft.
 */
const {setText, downloadBlob} = globalThis.EpsilonSoftShared || {};
const LIMIT = 1e6, EPS = 1e-7, MAX_STATES = 400000, MAX_PATTERNS = 20000;
const MAX_TYPES = 2000, MAX_PIECES = 100000, KNAP_MEMORY = 6e7;
class UserError extends Error {}
const fail = m => { throw new UserError(m); };

/* ========================================================================= */
/* LÕI TÍNH                                                                  */
/* Đơn vị bên trong là số nguyên (mm, hoặc 0,1 mm nếu có số lẻ).             */
/* W[t] = chiều dài cắt + mạch cưa; C = chiều dài dùng được + mạch cưa.      */
/* ========================================================================= */

/* ---------- 1. Bài toán vừa: quy hoạch động trên số lượng còn lại (chính xác) */
function listPatterns(W, C, maxCount) {
  const n = W.length, out = [], cur = new Array(n).fill(0);
  (function rec(t, room) {
    if (out.length > MAX_PATTERNS) return;
    if (t === n) { if (cur.some(v => v > 0)) out.push({ c: cur.slice(), used: C - room }); return; }
    const most = Math.min(maxCount[t], Math.floor(room / W[t]));
    for (let k = most; k >= 0; k--) { cur[t] = k; rec(t + 1, room - k * W[t]); }
    cur[t] = 0;
  })(0, C);
  return out;
}

function exactPlan(W, q, C) {
  const n = W.length, radix = [], stride = [];
  let states = 1;
  for (let t = 0; t < n; t++) { stride.push(states); radix.push(q[t] + 1); states *= q[t] + 1; if (states > MAX_STATES) return null; }
  const all = listPatterns(W, C, q);
  if (all.length > MAX_PATTERNS) return null;
  const full = all.filter(p => p.c.every((v, t) => v === q[t] || p.used + W[t] > C));
  if (states * full.length * n > 4e8) return null;          // quá nặng -> dùng cách cho bài toán lớn
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
  const top = states - 1, N = best[top], start = dec(top);
  // cây cuối: dùng ít thép nhất mà phần còn lại vẫn đủ N − 1 cây -> cây lẻ dài nhất
  let lastC = null, rest = top;
  for (const p of all.slice().sort((a, b) => a.used - b.used)) {
    if (p.c.some((v, t) => v > start[t])) continue;
    const r = p.c.reduce((acc, v, t) => acc + (start[t] - v) * stride[t], 0);
    if (best[r] === N - 1) { lastC = p.c; rest = r; break; }
  }
  const bars = [];
  let s = rest, prev = -1;
  while (s > 0) {
    const v = dec(s);
    let pi = pick[s];
    if (prev >= 0) {                     // lặp lại kiểu cắt vừa dùng -> ít kiểu cắt
      const c = full[prev].c; let r = 0, moved = false;
      for (let t = 0; t < n; t++) { const k = Math.min(c[t], v[t]); if (k) moved = true; r += (v[t] - k) * stride[t]; }
      if (moved && best[r] === best[s] - 1) pi = prev;
    }
    const c = full[pi].c.map((k, t) => Math.min(k, v[t]));
    bars.push(c);
    s -= c.reduce((acc, k, t) => acc + k * stride[t], 0);
    prev = pi;
  }
  bars.push(lastC);
  return { bars, lowerBound: N, proven: true };
}

/* ---------- 2. Bài toán lớn: cận dưới bằng quy hoạch tuyến tính (sinh cột) */
/** Ba lô có chặn: max Σ y·a, Σ W·a ≤ C, 0 ≤ a ≤ ub (chính xác).
 *  Thử nhánh cận trước (rất nhanh), quá số nút thì chuyển sang quy hoạch động. */
function knapsack(W, y, ub, C) {
  return knapBB(W, y, ub, C) || knapDP(W, y, ub, C);
}
function knapBB(W, y, ub, C, nodeLimit = 300000) {
  const idx = [];
  for (let t = 0; t < W.length; t++) if (y[t] > 1e-12 && ub[t] > 0) idx.push(t);
  idx.sort((a, b) => y[b] / W[b] - y[a] / W[a]);
  const n = idx.length, cur = new Array(n).fill(0);
  let best = 0, bestA = new Array(n).fill(0), nodes = 0, aborted = false;
  const bound = (k, r) => {
    let v = 0;
    for (let j = k; j < n && r > 0; j++) { const t = idx[j], amt = Math.min(ub[t], r / W[t]); v += amt * y[t]; r -= amt * W[t]; }
    return v;
  };
  (function dfs(k, r, v) {
    if (++nodes > nodeLimit) { aborted = true; return; }
    if (v > best + 1e-12) { best = v; bestA = cur.slice(); }
    if (k === n || v + bound(k, r) <= best + 1e-12) return;
    const t = idx[k];
    for (let c = Math.min(ub[t], Math.floor(r / W[t])); c >= 0; c--) {
      cur[k] = c; dfs(k + 1, r - c * W[t], v + c * y[t]);
      if (aborted) return;
    }
    cur[k] = 0;
  })(0, C, 0);
  if (aborted) return null;
  const a = new Array(W.length).fill(0);
  idx.forEach((t, j) => { a[t] = bestA[j]; });
  return { value: best, a };
}
function knapDP(W, y, ub, C) {
  const items = [];
  for (let t = 0; t < W.length; t++) {
    if (!(y[t] > 1e-12) || ub[t] <= 0) continue;
    let left = ub[t];
    for (let k = 1; left > 0; k *= 2) { const c = Math.min(k, left); items.push({ t, c, w: W[t] * c, v: y[t] * c }); left -= c; }
  }
  if (items.length * (C + 1) > KNAP_MEMORY) return null;
  const dp = new Float64Array(C + 1), take = new Uint8Array(items.length * (C + 1));
  for (let k = 0; k < items.length; k++) {
    const it = items[k], base = k * (C + 1), w = it.w, v0 = it.v;
    for (let c = C; c >= w; c--) { const v = dp[c - w] + v0; if (v > dp[c] + 1e-12) { dp[c] = v; take[base + c] = 1; } }
  }
  const a = new Array(W.length).fill(0);
  for (let k = items.length - 1, c = C; k >= 0; k--) if (take[k * (C + 1) + c]) { a[items[k].t] += items[k].c; c -= items[k].w; }
  return { value: dp[C], a };
}

/** Đơn hình đã sửa đổi + sinh cột cho:  min Σx  với  Σ a_p x_p ≥ q.
 *  Dừng sớm khi cận dưới (làm tròn lên) đã bằng giá trị tuyến tính (làm tròn lên),
 *  hoặc đã bằng số cây của phương án tốt nhất đang có (target) -> chứng minh xong. */
function columnGeneration(W, q, C, target = Infinity, maxIter = 3000) {
  const m = W.length, ub = W.map((w, t) => Math.min(q[t], Math.floor(C / w)));
  const Binv = Array.from({ length: m }, (_, i) => { const r = new Float64Array(m); r[i] = 1 / ub[i]; return r; });
  const basis = ub.map((u, i) => { const a = new Array(m).fill(0); a[i] = u; return { a, cost: 1 }; });
  const xB = q.map((v, i) => v / ub[i]);
  let lb = 0;
  for (let it = 0; it < maxIter; it++) {
    const y = new Float64Array(m);
    for (let i = 0; i < m; i++) if (basis[i].cost) { const r = Binv[i]; for (let j = 0; j < m; j++) y[j] += r[j]; }
    let enter = null;
    for (let j = 0; j < m; j++) if (y[j] < -1e-9) { const a = new Array(m).fill(0); a[j] = -1; enter = { a, cost: 0 }; break; }
    if (!enter) {
      const ks = knapsack(W, y, ub, C);
      if (!ks) break;
      // cận Farley: hợp lệ ở mọi bước khi y ≥ 0
      lb = Math.max(lb, q.reduce((s, v, t) => s + v * y[t], 0) / Math.max(1, ks.value));
      const L = Math.ceil(lb - 1e-6);
      if (ks.value <= 1 + 1e-9 || L >= target) break;
      enter = { a: ks.a, cost: 1 };
    }
    const d = new Float64Array(m);
    for (let i = 0; i < m; i++) { let s = 0; const r = Binv[i]; for (let j = 0; j < m; j++) if (enter.a[j]) s += r[j] * enter.a[j]; d[i] = s; }
    let r = -1, best = Infinity;
    for (let i = 0; i < m; i++) if (d[i] > 1e-9) { const v = xB[i] / d[i]; if (v < best - 1e-12) { best = v; r = i; } }
    if (r < 0) break;
    for (let i = 0; i < m; i++) xB[i] -= best * d[i];
    xB[r] = best;
    const pr = Binv[r], dr = d[r];
    for (let j = 0; j < m; j++) pr[j] /= dr;
    for (let i = 0; i < m; i++) if (i !== r && d[i]) { const row = Binv[i], f = d[i]; for (let j = 0; j < m; j++) row[j] -= f * pr[j]; }
    basis[r] = enter;
  }
  return { basis, xB, lb };
}

/* ---------- 3. Phương án nguyên cho bài toán lớn ---------- */
/** Xếp dài trước, chọn cây vừa khít nhất. */
function bestFit(W, q, C) {
  const items = [];
  W.forEach((w, t) => { for (let k = 0; k < q[t]; k++) items.push(t); });
  items.sort((a, b) => W[b] - W[a]);
  const bars = [];
  for (const t of items) {
    let bi = -1, room = Infinity;
    for (let i = 0; i < bars.length; i++) { const r = C - bars[i].load - W[t]; if (r >= 0 && r < room) { room = r; bi = i; } }
    if (bi < 0) { bars.push({ c: new Array(W.length).fill(0), load: 0 }); bi = bars.length - 1; }
    bars[bi].c[t]++; bars[bi].load += W[t];
  }
  return bars.map(b => b.c);
}
const loadOf = (c, W) => c.reduce((s, k, t) => s + k * W[t], 0);

/** Làm tròn nghiệm tuyến tính, phần dư giải tiếp (chính xác nếu vừa sức). */
function roundLP(W, q, C, cg, depth = 0) {
  const bars = [], res = q.slice();
  cg.basis.forEach((col, i) => {
    if (!col.cost) return;
    const k = Math.floor(cg.xB[i] + 1e-9);
    for (let j = 0; j < k; j++) { bars.push(col.a.slice()); col.a.forEach((v, t) => { res[t] -= v; }); }
  });
  const need = res.map(v => Math.max(0, v));
  if (need.some(v => v > 0)) {
    const ex = exactPlan(W, need, C);
    if (ex) bars.push(...ex.bars);
    else if (depth < 3) { const sub = columnGeneration(W, need, C, Math.ceil(need.reduce((s, v, t) => s + v * W[t], 0) / C - 1e-9)); bars.push(...roundLP(W, need, C, sub, depth + 1)); }
    else bars.push(...bestFit(W, need, C));
  }
  // bỏ chi tiết làm thừa (ưu tiên bỏ ở cây ít tải)
  const made = q.map(() => 0);
  bars.forEach(c => c.forEach((v, t) => { made[t] += v; }));
  const order = bars.map((c, i) => i).sort((a, b) => loadOf(bars[a], W) - loadOf(bars[b], W));
  for (let t = 0; t < q.length; t++) for (const i of order) {
    while (made[t] > q[t] && bars[i][t] > 0) { bars[i][t]--; made[t]--; }
  }
  return bars.filter(c => c.some(v => v > 0));
}

/** Dồn phần dư: rút chi tiết khỏi cây nhẹ nhất sang các cây khác còn chỗ. */
function concentrate(bars, W, C) {
  bars = bars.map(c => c.slice());
  for (let guard = 0; guard < 1000 && bars.length > 1; guard++) {
    bars.sort((a, b) => loadOf(b, W) - loadOf(a, W));
    const L = bars[bars.length - 1], others = bars.slice(0, -1), loads = others.map(c => loadOf(c, W));
    const types = []; L.forEach((k, t) => { for (let j = 0; j < k; j++) types.push(t); });
    types.sort((a, b) => W[b] - W[a]);
    for (const t of types) {
      let bi = -1, room = Infinity;
      for (let i = 0; i < others.length; i++) { const r = C - loads[i] - W[t]; if (r >= 0 && r < room) { room = r; bi = i; } }
      if (bi >= 0) { others[bi][t]++; loads[bi] += W[t]; L[t]--; }
    }
    if (L.every(v => v === 0)) { bars.pop(); continue; }                  // bớt được một cây
    break;
  }
  return bars.sort((a, b) => loadOf(b, W) - loadOf(a, W));             // cây nhiều dư nhất ở cuối
}

/* ---------- 4. Giao diện chung của lõi tính ---------- */
export function calculateBars(input) {
  const i = { ...input };
  for (const k of ['stockL', 'kerf', 'trim', 'remnantMin', 'kgPerM'])
    if (!Number.isFinite(i[k]) || i[k] < 0 || i[k] > LIMIT) fail('Thông số không hợp lệ: ' + k);
  if (i.stockL <= 0 || i.kgPerM <= 0) fail('Kiểm tra chiều dài cây và khối lượng mét.');
  const parts = (i.parts || []).filter(p => p && p.qty > 0);
  if (!parts.length) fail('Nhập ít nhất một chi tiết có số lượng.');
  if (parts.length > MAX_TYPES) fail(`Tối đa ${MAX_TYPES} dòng chi tiết.`);
  const usable = i.stockL - i.trim;
  if (usable <= 0) fail('Phần cắt bỏ đầu cây lớn hơn chiều dài cây.');
  let pieces = 0;
  for (const p of parts) {
    if (!Number.isFinite(p.length) || p.length <= 0 || !Number.isFinite(p.allowance) || p.allowance < 0 || !Number.isInteger(p.qty))
      fail('Kiểm tra chiều dài và số lượng chi tiết.');
    if (p.length + p.allowance > usable + EPS) fail(`Chi tiết ${p.name || ''} dài hơn cây thép (đã tính dư gia công, cắt đầu cây).`);
    pieces += p.qty;
  }
  if (pieces > MAX_PIECES) fail(`Tổng số chi tiết vượt ${MAX_PIECES.toLocaleString('vi-VN')} chiếc.`);
  const cutL = parts.map(p => p.length + p.allowance);

  // gộp các dòng có cùng chiều dài cắt thành một loại để giải nhanh hơn
  const S = [...cutL, i.kerf, usable].every(v => Math.abs(v - Math.round(v)) < 1e-9) ? 1 : 10;
  const typeOf = new Map(), types = [];
  parts.forEach((p, k) => {
    const w = Math.round((cutL[k] + i.kerf) * S);
    if (!typeOf.has(w)) { typeOf.set(w, types.length); types.push({ w, q: 0, rows: [] }); }
    const T = types[typeOf.get(w)]; T.q += p.qty; T.rows.push({ k, left: p.qty });
  });
  const W = types.map(T => T.w), q = types.map(T => T.q), C = Math.round((usable + i.kerf) * S);

  // ---------- giải
  let bars, lowerBound, proven, method;
  const areaLB = Math.ceil(W.reduce((s, w, t) => s + w * q[t], 0) / C - 1e-9);
  const ex = exactPlan(W, q, C);
  if (ex) { bars = ex.bars; lowerBound = ex.lowerBound; proven = true; method = 'exact'; }
  else {
    method = 'lp';
    let best = concentrate(bestFit(W, q, C), W, C);
    lowerBound = areaLB;
    if (best.length > lowerBound) {
      const cg = columnGeneration(W, q, C, best.length);
      lowerBound = Math.max(lowerBound, Math.ceil(cg.lb - 1e-6));
      if (best.length > lowerBound) {
        const a = concentrate(roundLP(W, q, C, cg), W, C);
        if (a.length < best.length) best = a;
      }
    }
    bars = best; proven = bars.length <= lowerBound;
  }

  // ---------- gán lại tên chi tiết gốc, dựng từng cây
  const out = bars.map(c => {
    const list = [];
    c.forEach((k, t) => {
      for (let j = 0; j < k; j++) {
        const row = types[t].rows.find(r => r.left > 0); row.left--; list.push(row.k);
      }
    });
    list.sort((a, b) => cutL[b] - cutL[a] || a - b);
    const cutTotal = list.reduce((s, k) => s + cutL[k], 0);
    const leftover = Math.max(0, usable - cutTotal - i.kerf * list.length);
    return { pieces: list, leftover: Math.round(leftover * 1000) / 1000, recovered: leftover >= i.remnantMin - EPS };
  });
  const groups = [];
  for (const b of out) {
    const key = b.pieces.join(',') + '|' + b.leftover;
    const g = groups.find(x => x.key === key);
    if (g) g.n++; else groups.push({ key, n: 1, ...b });
  }
  groups.sort((a, b) => a.leftover - b.leftover);                       // cây dư nhiều nhất ở cuối
  const totalBars = out.length, issuedL = totalBars * i.stockL;
  const recoveredL = out.reduce((s, b) => s + (b.recovered ? b.leftover : 0), 0);
  const finishedL = parts.reduce((s, p) => s + p.length * p.qty, 0);
  const kg = mm => mm / 1000 * i.kgPerM;
  return {
    input: i, parts, cutL, totalBars, groups, proven, lowerBound, method,
    optimal: proven, gap: Math.max(0, totalBars - lowerBound),
    issuedKG: kg(issuedL), recoveredKG: kg(recoveredL), finishedKG: kg(finishedL),
    recovered: out.filter(b => b.recovered).map(b => b.leftover).sort((a, b) => b - a),
    wastePercent: 100 * (issuedL - recoveredL - finishedL) / finishedL,
    wasteNoRecoveryPercent: 100 * (issuedL - finishedL) / finishedL,
  };
}

/* ========================================================================= */
/* PRO-MAX: ĐỀ XUẤT NỐI CỘT                                                  */
/* NGUYÊN TẮC NGHIỆP VỤ (đã chốt với anh) – THỨ TỰ ƯU TIÊN TỪ TRÊN XUỐNG:     */
/*  1. AN TOÀN KẾT CẤU (ràng buộc cứng, không cho chỉnh):                     */
/*     - Mỗi cột tối đa MỘT mối nối: cột = đoạn dưới A (hàn mặt bích)        */
/*       + đoạn trên B ngắn; A + B = dài thành phẩm.                          */
/*  2. ĐOẠN NỐI B ≤ 10% DÀI CỘT là ưu tiên số một khi chọn phương án:         */
/*     - Mọi đoạn B trong ngưỡng là tốt nhất, kể cả phải nhiều mối nối hơn.  */
/*     - Bắt buộc vượt thì tối đa 1 sản phẩm, và là sản phẩm vượt ÍT NHẤT.   */
/*     - Ngưỡng 10% chỉnh được; trên giao diện chỉ cảnh báo, không chặn.     */
/*  3. ƯU TIÊN NỐI MỘT SẢN PHẨM:                                              */
/*     - Chỉ nối thêm sản phẩm thứ 2, thứ 3 khi tiết kiệm thêm được ít nhất  */
/*       MỘT CỘT NGẮN NHẤT trong đơn (cùng số cây; bớt thép xuất hoặc cây lẻ */
/*       nhập kho dài thêm). Sản phẩm nối thêm có B vượt 10% thì loại luôn.  */
/*     - Số mối nối tính tổng trên mọi sản phẩm.                              */
/*  4. SAU CÙNG MỚI TÍNH TIẾT KIỆM: ít mối nối → hao phí thấp; nếu người dùng */
/*     nhập giá thép / giá phế / chi phí 1 mối nối thì chọn thêm phương án    */
/*     tối ưu tài chính (giá là lựa chọn của người dùng, không lưu master).   */
/* Cách tạo đoạn nối: A lấy từ ĐOẠN THỪA khi cắt cột nguyên, làm tròn XUỐNG  */
/* theo bước (mặc định 5 mm); B = dài cột − A.                               */
/* Phương án đưa ra: KHÔNG NỐI · NỐI ÍT (mốc bớt cây đầu tiên) · NỐI NHIỀU   */
/* (ít cây nhất). Mỗi phương án ít hơn phương án trước ít nhất 1 cây.         */
/* Phần mềm chỉ tính, cảnh báo và đề xuất – người dùng quyết định cuối cùng. */
/* ========================================================================= */
const SEARCH_RATIO = 0.3;            // phạm vi dò đoạn B tới 30% dài cột; đoạn vượt 10% xếp ưu tiên sau (quy tắc 2)
const PM_EVAL_LIMIT = 900, PM_TIME_MS = 9000;

/** Tách cột theo đặc tả nối: spec = [{ idx, A, B, n }] (idx theo input.parts). */
export function expandSplices(input, spec = []) {
  const parts = [];
  input.parts.forEach((p, i) => {
    const s = spec.find(x => x.idx === i && x.n > 0);
    const n = s ? Math.min(s.n, p.qty) : 0;
    const base = { color: p.color ?? i, allowance: p.allowance, parent: i };
    if (p.qty - n > 0) parts.push({ ...base, name: p.name, length: p.length, qty: p.qty - n });
    if (n > 0) {
      parts.push({ ...base, name: `${p.name}-A`, length: s.A, qty: n, splice: 'A' });
      parts.push({ ...base, name: `${p.name}-B`, length: s.B, qty: n, splice: 'B' });
    }
  });
  return { ...input, parts };
}

/** Các đoạn thừa có thể biến thành đoạn A, kèm số lần xuất hiện trong phương án không nối. */
function spliceCandidates(input, base, step) {
  const usable = input.stockL - input.trim, k = input.kerf;
  const L = input.parts.map(p => p.length + p.allowance);
  const freq = new Map();
  const add = (r, f) => { if (r > 0) freq.set(r, (freq.get(r) || 0) + f); };
  base.groups.forEach(g => add(g.leftover, g.n * 10));          // đoạn thừa thật, ưu tiên cao
  for (let a = 0; a < L.length; a++)
    for (let i = 1; i * (L[a] + k) <= usable + k; i++) {
      const r1 = usable - i * (L[a] + k); add(r1, 1);
      for (let b = 0; b < L.length; b++) if (b !== a)
        for (let j = 1; r1 - j * (L[b] + k) >= 0; j++) add(r1 - j * (L[b] + k), 1);
    }
  const out = [];
  input.parts.forEach((p, i) => {
    if (!p.allowSplice || p.qty < 1) return;
    const seen = new Map();
    for (const [r, f] of freq) {
      const A = Math.floor((r - p.allowance) / step) * step, B = p.length - A;
      if (A <= 0 || B < step || B > SEARCH_RATIO * p.length || A <= B) continue;
      seen.set(A, (seen.get(A) || 0) + f);
    }
    [...seen].map(([A, f]) => ({ idx: i, A, B: p.length - A, f, ratio: (p.length - A) / p.length }))
      .sort((x, y) => (x.ratio > 0.1) - (y.ratio > 0.1) || y.f - x.f || x.B - y.B)
      .slice(0, 8).forEach(c => out.push(c));
  });
  return out;
}

export function calculateProMax(input, opts = {}) {
  const step = Math.max(1, Math.round(opts.roundStep || 5)), ideal = (opts.idealRatio ?? 10) / 100;
  const t0 = Date.now(), cache = new Map();
  let evals = 0;
  const base = calculateBars(input);
  const evalSpec = spec => {
    const key = JSON.stringify(spec);
    if (cache.has(key)) return cache.get(key);
    evals++;
    const r = calculateBars(expandSplices(input, spec));
    cache.set(key, r); return r;
  };
  const busy = () => evals > PM_EVAL_LIMIT || Date.now() - t0 > PM_TIME_MS;
  /* ƯU TIÊN KẾT CẤU TRƯỚC, TIẾT KIỆM SAU (anh chốt):
   *  st = mức vượt ngưỡng của đoạn nối: 0 nếu mọi đoạn B ≤ ngưỡng lý tưởng; nếu có vượt
   *  thì st = tỷ lệ B/dài cột lớn nhất (vượt càng ít càng tốt). Tối đa 1 sản phẩm được vượt.
   *  So sánh: st nhỏ hơn → ít mối nối hơn → hao phí thấp hơn. */
  const structOf = spec => spec.reduce((m, x) => { const r = x.B / input.parts[x.idx].length; return r > ideal + 1e-9 ? Math.max(m, r) : m; }, 0);
  const better = (x, y) => !y || (x.st !== y.st ? x.st < y.st : x.n !== y.n ? x.n < y.n : x.res.wastePercent < y.res.wastePercent);
  const pack = (spec, res) => { const st = structOf(spec); return { spec, res, n: spec.reduce((s, x) => s + x.n, 0), st, over: st > 0 ? 1 : 0 }; };

  const cands = spliceCandidates(input, base, step);
  // Cận dưới khi nối tùy ý: nối chỉ làm tăng mạch cưa, nên không thể ít hơn số này
  const C = input.stockL - input.trim + input.kerf;
  const floorBars = Math.ceil(input.parts.reduce((s, p) => s + p.qty * (p.length + p.allowance + input.kerf), 0) / C - 1e-9);
  /** Ít mối nối nhất để còn ≤ T cây.
   *  Ưu tiên nối MỘT loại cột (anh chốt: hạn chế nối từ 2 loại trở lên); chỉ khi không
   *  loại cột nào tự đạt được mức T thì mới thử phối hợp hai loại cột. */
  function minSplices(T, pairs = true) {
    if (T < floorBars) return null;
    let best = null;
    // xét đoạn nối trong ngưỡng trước, rồi đến đoạn vượt ít nhất
    const ordered = cands.slice().sort((a, b) => (a.ratio > ideal ? a.ratio : 0) - (b.ratio > ideal ? b.ratio : 0));
    for (const c of ordered) {
      if (busy()) break;
      const cs = c.ratio > ideal + 1e-9 ? c.ratio : 0;
      if (best && cs > best.st) break;                  // kết cấu kém hơn phương án đã có -> bỏ
      const q = input.parts[c.idx].qty;
      const at = n => evalSpec([{ idx: c.idx, A: c.A, B: c.B, n }]);
      // cùng mức kết cấu thì chỉ tìm cách ít mối nối hơn; kết cấu tốt hơn thì tìm đủ
      const limit = best && cs >= best.st ? Math.min(q, best.n - 1) : q;
      if (limit < 1) continue;
      // dò thưa trước (số cây không luôn giảm đều theo số mối nối), rồi chia đôi cho mịn
      const grid = [];
      for (let g = 1; g < limit; g = Math.max(g + 1, Math.round(g * 1.35))) grid.push(g);
      grid.push(limit);
      let prev = 0, hit = 0;
      for (const g of grid) { if (at(g).totalBars <= T) { hit = g; break; } prev = g; }
      if (!hit) continue;
      let lo = prev + 1, hi = hit;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (at(mid).totalBars <= T) hi = mid; else lo = mid + 1; }
      const cand = pack([{ idx: c.idx, A: c.A, B: c.B, n: lo }], at(lo));
      if (better(cand, best)) best = cand;
    }
    if (best || !pairs) return best;
    // một loại cột không đủ -> thử phối hợp hai loại cột
    const top = cands.slice(0, 24);
    for (let a = 0; a < top.length && !busy(); a++) for (let b = a + 1; b < top.length && !busy(); b++) {
      const x = top[a], y = top[b];
      if (x.idx === y.idx) continue;
      if (x.ratio > ideal + 1e-9 && y.ratio > ideal + 1e-9) continue;   // sản phẩm thứ 2 phải trong ngưỡng
      const qx = input.parts[x.idx].qty, qy = input.parts[y.idx].qty;
      for (let tot = 2; tot <= qx + qy && !busy(); tot++) {
        if (best && tot >= best.n) break;
        let hit = null;
        for (let nx = Math.max(1, tot - qy); nx <= Math.min(qx, tot - 1); nx++) {
          const spec = [{ idx: x.idx, A: x.A, B: x.B, n: nx }, { idx: y.idx, A: y.A, B: y.B, n: tot - nx }];
          const r = evalSpec(spec);
          if (r.totalBars <= T) { hit = pack(spec, r); break; }
        }
        if (hit) { if (better(hit, best)) best = hit; break; }
      }
    }
    return best;
  }

  const plans = [{ key: 'none', label: 'Không nối', spec: [], splices: 0, result: base }];
  // levels: mỗi mức số cây (bớt 1, 2, 3… cây) kèm cách nối ít mối nhất – để so chi phí
  /* Nối thêm sản phẩm thứ 2, thứ 3 (anh chốt):
   *  ưu tiên nối 1 sản phẩm; chỉ nối thêm sản phẩm khác khi tiết kiệm thêm được ít nhất
   *  MỘT CỘT NGẮN NHẤT trong đơn (bớt thép xuất hoặc cây lẻ nhập kho dài thêm).
   *  Thép tiêu hao thực = số cây × dài cây − tổng cây lẻ thu hồi. Số mối nối tính tổng. */
  const colMin = Math.min(...input.parts.map(p => p.length));
  const netOf = r => r.totalBars * input.stockL - r.recovered.reduce((a, v) => a + v, 0);
  function extendMulti(P, T) {
    let cur = P, extEvals = 0;               // giới hạn số lần thử để giữ tốc độ
    for (let round = 0; round < 2 && !busy(); round++) {            // tối đa 3 sản phẩm
      const used = new Set(cur.spec.map(x => x.idx));
      let best = null;
      // Sản phẩm nối thêm (thứ 2, thứ 3) BẮT BUỘC có đoạn B trong ngưỡng lý tưởng (mặc định 10%);
      // đoạn B vượt ngưỡng thì loại luôn (anh chốt).
      for (const withinOnly of [true]) {
        const seenIdx = new Map();
        for (const c of cands) {
          if (busy()) break;
          if (used.has(c.idx)) continue;
          if (withinOnly !== (c.ratio <= ideal + 1e-9)) continue;
          if ((seenIdx.get(c.idx) || 0) >= 2) continue;
          seenIdx.set(c.idx, (seenIdx.get(c.idx) || 0) + 1);
          const q = input.parts[c.idx].qty;
          for (let n = 1; n <= q && !busy() && extEvals < 80; n = Math.max(n + 1, Math.round(n * 1.7))) {
            extEvals++;
            const spec = [...cur.spec, { idx: c.idx, A: c.A, B: c.B, n }];
            const r = evalSpec(spec);
            if (r.totalBars !== cur.res.totalBars) continue;   // cùng mức số cây; bớt cây là việc của mức sau
            const gain = netOf(cur.res) - netOf(r);
            if (gain + 1e-6 < colMin) continue;
            // đủ ngưỡng thì dừng: ưu tiên thêm ÍT mối nối nhất, bằng nhau mới xét tiết kiệm nhiều hơn
            const cand = { ...pack(spec, r), gain };
            if (!best || cand.n < best.n || (cand.n === best.n && gain > best.gain)) best = cand;
            break;
          }
        }
        if (best) break;
      }
      if (!best) break;
      cur = best;
    }
    return cur;
  }

  const levels = [];
  if (cands.length) {
    const levelAt = T => {
      const single = minSplices(T, false);
      const P = single || minSplices(T, true);       // không sản phẩm nào tự đạt -> phối hợp
      if (!P) return null;
      const X = extendMulti(P, T);
      return { main: X, alt: X === P ? null : P };   // alt: chỉ nối 1 sản phẩm – giữ để so chi phí
    };
    let lv = levelAt(base.totalBars - 1);
    while (lv) {
      const cur = lv.main, label = 'Bớt ' + (base.totalBars - cur.res.totalBars) + ' cây';
      levels.push({ key: 'lv' + levels.length, label, spec: cur.spec, splices: cur.n, result: cur.res });
      if (lv.alt) levels.push({ key: 'lv' + levels.length, label, spec: lv.alt.spec, splices: lv.alt.n, result: lv.alt.res, alt: true });
      if (busy()) break;
      lv = levelAt(cur.res.totalBars - 1);
    }
    const mains = levels.filter(l => !l.alt);
    if (mains.length) {
      plans.push({ ...mains[0], key: 'few', label: 'Nối ít' });
      if (mains.length > 1) plans.push({ ...mains[mains.length - 1], key: 'many', label: 'Nối nhiều' });
    }
  }
  const named = p => p.spec.forEach(s => { s.L = input.parts[s.idx].length; s.name = input.parts[s.idx].name; s.ratio = 100 * s.B / s.L; });
  plans.forEach(named); levels.forEach(named);
  return { plans, levels, searchComplete: !busy(), evals, ms: Date.now() - t0 };
}

/** Phương án do người dùng chỉnh A / B / số cột nối. */
export function calculateCustomSplice(input, spec) {
  for (const s of spec) {
    const p = input.parts[s.idx];
    if (!p) fail('Chi tiết nối không còn trong danh sách.');
    if (!(s.A > 0 && s.B > 0) || Math.abs(s.A + s.B - p.length) > 1e-6) fail(`Đoạn nối ${p.name}: A + B phải bằng ${p.length} mm.`);
    if (!Number.isInteger(s.n) || s.n < 0 || s.n > p.qty) fail(`Số cột nối ${p.name} phải từ 0 đến ${p.qty}.`);
  }
  const r = calculateBars(expandSplices(input, spec));
  spec.forEach(s => { s.L = input.parts[s.idx].length; s.name = input.parts[s.idx].name; s.ratio = 100 * s.B / s.L; });
  return { spec, splices: spec.reduce((a, s) => a + s.n, 0), result: r };
}

// Worker chạy chính file này (không cần file thuật toán thứ hai)
if (typeof document === 'undefined' && typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.addEventListener('message', e => {
    try {
      const d = e.data || {};
      const result = d.mode === 'promax' ? calculateProMax(d.input, d.opts)
        : d.mode === 'custom' ? calculateCustomSplice(d.input, d.spec)
        : calculateBars(d);
      self.postMessage({ ok: true, result });
    } catch (err) { self.postMessage({ ok: false, error: String(err?.message || 'Không tính được.') }); }
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
const COLORS = [['#afa2eb', '#5c47b3'], ['#9bcffc', '#326bab'], ['#f6c58f', '#b06a12'], ['#a6e3c8', '#1f7a55'], ['#f4b2c6', '#a3365a']];
// Màu cho chi tiết thứ t: 5 màu chuẩn, sau đó tự sinh theo vòng màu (không giới hạn số chi tiết).
// Xuất mã HEX để file SVG mở được trên mọi phần mềm.
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
      const w = res.cutL[t] * sc, [fill, edge] = colorOf(res.parts[t].color ?? t);
      const dash = res.parts[t].splice === 'B' ? ' stroke-dasharray="5 3" stroke-width="2"' : ' stroke-width="1"';
      g += `<rect x="${(x0 + x * sc).toFixed(2)}" y="${y}" width="${w.toFixed(2)}" height="${rowH}" fill="${fill}" stroke="${edge}"${dash}/>`;
      const cx = (x0 + (x + res.cutL[t] / 2) * sc).toFixed(2), nm = esc(res.parts[t].name || '');
      if (w > 120 && nm) g += `<text x="${cx}" y="${y + rowH / 2 - 3}" text-anchor="middle" font-size="16" font-weight="700" fill="#1d1652" font-family="Arial,sans-serif">${nm}</text><text x="${cx}" y="${y + rowH / 2 + 13}" text-anchor="middle" font-size="16" fill="#1d1652" font-family="Arial,sans-serif">${pretty(res.cutL[t])}</text>`;
      else if (w > 46) g += `<text x="${cx}" y="${y + rowH / 2 + 5}" text-anchor="middle" font-size="16" fill="#1d1652" font-family="Arial,sans-serif">${pretty(res.cutL[t])}</text>`;
      x += res.cutL[t] + res.input.kerf;
    }
    if (b.leftover > 0) {
      const lx = x0 + (L - b.leftover) * sc, w = b.leftover * sc;
      g += `<rect x="${lx.toFixed(2)}" y="${y}" width="${w.toFixed(2)}" height="${rowH}" fill="${b.recovered ? '#e3f8eb' : '#eeeeee'}" stroke="${b.recovered ? '#169a70' : '#9a9a9a'}" stroke-width="1"/>`;
      if (w > 60) g += `<text x="${(lx + w / 2).toFixed(2)}" y="${y + rowH / 2 + 5}" text-anchor="middle" font-size="16" font-weight="700" fill="${b.recovered ? '#147451' : '#6b6b6b'}" font-family="Arial,sans-serif">${b.recovered ? 'CÂY LẺ ' : 'DƯ '}${pretty(b.leftover)}</text>`;
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cutting Plan Section – sơ đồ cắt ${res.totalBars} cây thép">${'<rect width="' + W + '" height="' + H + '" fill="#faf7ff"/>' + g}</svg>`;
  return svg;
}

/** Chú giải chi tiết có trong các kiểu cắt: màu, tên, dài cắt, số chiếc. */
function barsLegend(res, groups = res.groups) {
  const cnt = new Map();
  for (const b of groups) for (const t of b.pieces) cnt.set(t, (cnt.get(t) || 0) + b.n);
  return [...cnt.keys()].sort((a, b) => a - b).map(t => { const [fill, edge] = colorOf(res.parts[t].color ?? t);
    return { fill, edge, dash: res.parts[t].splice === 'B', text: `${res.parts[t].name || 'CT' + (t + 1)} – dài cắt ${pretty(res.cutL[t])} × ${pretty(cnt.get(t))}` }; });
}
const barsTotals = res => `${res.totalBars} cây · xuất kho ${pretty(res.issuedKG)} kg · cây lẻ thu hồi ${pretty(res.recoveredKG)} kg`
  + `${res.recovered.length ? ` (${res.recovered.length} cây: ${res.recovered.slice(0, 6).map(pretty).join('; ')}${res.recovered.length > 6 ? '…' : ''} mm)` : ''}`
  + ` · thành phẩm ${pretty(res.finishedKG)} kg · hao phí / TP ${res.wastePercent.toFixed(2)} %`;
/** SVG tải về (mở nhanh bằng trình duyệt, không cần CAD): tiêu đề + sơ đồ cắt + chú giải + số liệu. */
function barsSVGFile(res, meta = {}) {
  const fig = drawBars(res), [, fw, fh] = fig.match(/viewBox="0 0 (\S+) (\S+)"/).map(Number), F = 'font-family="Arial,Helvetica,sans-serif"';
  const leg = barsLegend(res), per = Math.ceil(leg.length / 2) || 1, top = 96, legY = top + fh + 40, H = legY + per * 32 + 50;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fw}" height="${H}" viewBox="0 0 ${fw} ${H}"><rect width="${fw}" height="${H}" fill="#ffffff"/>`
    + `<text x="20" y="38" font-size="24" font-weight="700" fill="#2e1b70" ${F}>${esc(`SƠ ĐỒ CẮT THÉP HÌNH ${meta.spec || ''} – CÂY ${pretty(res.input.stockL)} mm`.replace(/\s+/g, ' '))}</text>`
    + `<text x="20" y="68" font-size="16" fill="#4a4470" ${F}>${esc([meta.planLabel, `mạch cưa ${pretty(res.input.kerf)} mm`, meta.date].filter(Boolean).join(' · '))}</text>`
    + pdfEmbed(fig, 0, top - 14, fw, fh)
    + `<text x="20" y="${legY - 10}" font-size="16" font-weight="700" fill="#2e1b70" ${F}>${esc(barsTotals(res))}</text>`
    + `<g transform="translate(20 ${legY + 18}) scale(0.8)">${pdfLegend(leg, 0, 0, 640, per)}</g></svg>`;
}

/* ========================================================================= */
/* XUẤT FILE: DXF SƠ ĐỒ TRẢI PHÔI + EXCEL DANH SÁCH CHI TIẾT CẮT              */
/* DXF R12 (AutoCAD / mọi phần mềm CAD đọc được), tỷ lệ 1:1 mm theo chiều dài */
/* cây. Bản vẽ SẠCH – không nét thừa:                                        */
/*  - mỗi kiểu cắt: 1 khung cây (polyline kín) + 1 vạch tại mỗi nhát cưa      */
/*    (đặt giữa mạch cưa), không vẽ chồng hình chữ nhật từng đoạn;           */
/*  - chữ: tên + dài cắt trong từng đoạn, số cây bên trái, cây lẻ / dư cuối.  */
/* ========================================================================= */
const dxfNum = v => { const s = (Math.round(v * 1e4) / 1e4).toFixed(4).replace(/\.?0+$/, ''); return s === '-0' ? '0' : s; };
/** Ký tự ngoài ASCII -> \U+XXXX (AutoCAD hiểu trong mọi phiên bản). */
const dxfText = s => String(s ?? '').replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7e]/g, c => '\\U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
function dxfWriter(layers) {
  const out = [], mn = [Infinity, Infinity], mx = [-Infinity, -Infinity];
  const g = (c, v) => out.push(String(c), String(v));
  const ext = (x, y) => { mn[0] = Math.min(mn[0], x); mn[1] = Math.min(mn[1], y); mx[0] = Math.max(mx[0], x); mx[1] = Math.max(mx[1], y); };
  return {
    line(l, x1, y1, x2, y2) { g(0, 'LINE'); g(8, l); g(10, dxfNum(x1)); g(20, dxfNum(y1)); g(30, 0); g(11, dxfNum(x2)); g(21, dxfNum(y2)); g(31, 0); ext(x1, y1); ext(x2, y2); },
    rect(l, x, y, w, h) {
      g(0, 'POLYLINE'); g(8, l); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, 1);
      for (const [px, py] of [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]) { g(0, 'VERTEX'); g(8, l); g(10, dxfNum(px)); g(20, dxfNum(py)); g(30, 0); ext(px, py); }
      g(0, 'SEQEND'); g(8, l);
    },
    /** align: 'l' trái | 'c' giữa | 'r' phải (căn giữa theo chiều cao) */
    text(l, x, y, h, s, align = 'l') {
      g(0, 'TEXT'); g(8, l); g(10, dxfNum(x)); g(20, dxfNum(y)); g(30, 0); g(40, dxfNum(h)); g(1, dxfText(s));
      if (align !== 'l') { g(72, align === 'c' ? 1 : 2); g(11, dxfNum(x)); g(21, dxfNum(y)); g(31, 0); g(73, 2); }
      ext(x, y); ext(x + (align === 'l' ? 1 : 0) * h * String(s).length * 0.7, y + h);
    },
    toString() {
      const h = [], p = (c, v) => h.push(String(c), String(v));
      p(0, 'SECTION'); p(2, 'HEADER'); p(9, '$ACADVER'); p(1, 'AC1009'); p(9, '$INSBASE'); p(10, 0); p(20, 0); p(30, 0);
      p(9, '$EXTMIN'); p(10, dxfNum(mn[0])); p(20, dxfNum(mn[1])); p(30, 0); p(9, '$EXTMAX'); p(10, dxfNum(mx[0])); p(20, dxfNum(mx[1])); p(30, 0); p(0, 'ENDSEC');
      p(0, 'SECTION'); p(2, 'TABLES');
      p(0, 'TABLE'); p(2, 'LTYPE'); p(70, 1); p(0, 'LTYPE'); p(2, 'CONTINUOUS'); p(70, 0); p(3, 'Solid line'); p(72, 65); p(73, 0); p(40, 0); p(0, 'ENDTAB');
      p(0, 'TABLE'); p(2, 'LAYER'); p(70, layers.length);
      for (const [name, color] of layers) { p(0, 'LAYER'); p(2, name); p(70, 0); p(62, color); p(6, 'CONTINUOUS'); }
      p(0, 'ENDTAB');
      p(0, 'TABLE'); p(2, 'STYLE'); p(70, 1); p(0, 'STYLE'); p(2, 'STANDARD'); p(70, 0); p(40, 0); p(41, 1); p(50, 0); p(71, 0); p(42, 2.5); p(3, 'arial.ttf'); p(4, ''); p(0, 'ENDTAB');   // font Arial: hiện đúng tiếng Việt trong AutoCAD
      p(0, 'ENDSEC'); p(0, 'SECTION'); p(2, 'ENTITIES');
      return h.concat(out, ['0', 'ENDSEC', '0', 'EOF']).join('\r\n') + '\r\n';
    },
  };
}
/** Toạ độ từng đoạn trên một cây: [{k, x0, x1}] (x0..x1 = đoạn cắt), các vị trí nhát cưa, phần dư. */
function barLayout(res, b) {
  const { trim, kerf, stockL } = res.input, segs = [], cuts = [];
  let x = trim;
  if (trim > 0) cuts.push(trim);                                      // nhát cắt bỏ đầu cây
  for (const k of b.pieces) {
    const x1 = x + res.cutL[k];
    segs.push({ k, x0: x, x1 });
    if (x1 + kerf / 2 < stockL - 1e-6) cuts.push(x1 + kerf / 2);       // nhát cưa đặt giữa mạch cưa
    x = x1 + kerf;
  }
  return { segs, cuts, restFrom: Math.min(stockL, x), rest: b.leftover };
}
/**
 * DXF sơ đồ trải phôi. meta: { spec, project, drawnBy, date, planLabel }.
 * Layer: CAY (khung cây), NHAT_CAT (vạch cưa), CHI_TIET (tên + dài đoạn), CAY_LE (cây lẻ / dư), KHUNG_TEN (tiêu đề, số cây).
 */
export function barsDXF(res, meta = {}) {
  const d = dxfWriter([['CAY', 7], ['NHAT_CAT', 1], ['CHI_TIET', 3], ['CAY_LE', 30], ['KHUNG_TEN', 2]]);
  const L = res.input.stockL, band = Math.max(120, Math.round(L / 60));   // bề cao dải biểu diễn một cây
  const th = Math.round(band * 0.28), gap = Math.round(band * 1.1);
  // tiêu đề
  let y = 0;
  d.text('KHUNG_TEN', 0, y + 2.6 * th, th * 1.4, `SƠ ĐỒ TRẢI PHÔI THÉP HÌNH ${meta.spec || ''} – CÂY ${L} mm`.replace(/\s+/g, ' '));
  d.text('KHUNG_TEN', 0, y + 0.6 * th, th * 0.9,
    `${res.totalBars} cây · ${res.groups.length} kiểu cắt · mạch cưa ${res.input.kerf} mm · cắt đầu cây ${res.input.trim} mm · ` +
    `xuất ${res.issuedKG.toFixed(1)} kg · thu hồi ${res.recoveredKG.toFixed(1)} kg · hao phí / TP ${res.wastePercent.toFixed(2)} %` +
    (meta.planLabel ? ` · ${meta.planLabel}` : ''));
  y -= gap;
  let first = 1;
  res.groups.forEach((b, gi) => {
    const top = y, bot = y - band, last = first + b.n - 1;
    // số cây bên trái
    d.text('KHUNG_TEN', -th * 0.8, bot + band / 2 + th * 0.55, th, `KIỂU ${gi + 1}`, 'r');
    d.text('KHUNG_TEN', -th * 0.8, bot + band / 2 - th * 0.75, th * 0.85, `${b.n} cây (${first === last ? 'cây ' + first : 'cây ' + first + '–' + last})`, 'r');
    // khung cây + vạch cưa
    d.rect('CAY', 0, bot, L, band);
    const lay = barLayout(res, b);
    for (const x of lay.cuts) d.line('NHAT_CAT', x, bot, x, top);
    // tên + dài cắt trong từng đoạn (thu nhỏ chữ cho đoạn ngắn, không vượt khỏi đoạn)
    for (const s of lay.segs) {
      const p = res.parts[s.k], len = s.x1 - s.x0, cx = (s.x0 + s.x1) / 2;
      const name = String(p.name || ''), num = String(res.cutL[s.k]);
      const h1 = Math.min(th, len / (Math.max(name.length, num.length) * 0.8 + 0.6));
      if (h1 >= 8) {
        if (name) d.text('CHI_TIET', cx, bot + band * 0.66, h1, name, 'c');
        d.text('CHI_TIET', cx, bot + band * (name ? 0.3 : 0.5), h1, num, 'c');
      } else {
        const h2 = Math.min(th, len / (num.length * 0.8 + 0.4));
        if (h2 >= 5) d.text('CHI_TIET', cx, bot + band * 0.5, h2, num, 'c');
      }
    }
    // phần dư cuối cây
    if (lay.rest > 0) {
      const cx = L - lay.rest / 2, label = `${b.recovered ? 'CÂY LẺ' : 'DƯ'} ${lay.rest}`;
      const h = Math.min(th, lay.rest / (label.length * 0.8 + 0.6));
      if (h >= 6) d.text('CAY_LE', cx, bot + band * 0.5, h, label, 'c');
      else if (lay.rest >= 1) d.text('CAY_LE', L + th * 0.5, bot + band * 0.5, th * 0.8, label);
    }
    y = bot - gap;
    first = last + 1;
  });
  // chú thích cuối bản vẽ
  d.text('KHUNG_TEN', 0, y + gap - band * 0.2 - th * 1.2, th * 0.8,
    `${meta.project ? 'Dự án: ' + meta.project + ' · ' : ''}${meta.drawnBy ? 'Người lập: ' + meta.drawnBy + ' · ' : ''}Ngày lập: ${meta.date || ''}`);
  return d.toString();
}

/* ---------- ZIP không nén + XLSX tối thiểu (Excel, LibreOffice, Google Sheets đều mở được) ---------- */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zipFiles(files) {
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
const xmlEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const colName = n => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
/**
 * sheets: [{ name, cols: [độ rộng], rows: [[ô…]] }]; ô = chuỗi | số | { v, s } với s: 'title' | 'head' | 'int' | 'dec' | 'pct' | 'bold' | 'note'.
 */
function xlsxBook(sheets) {
  const ST = { text: 1, title: 2, head: 3, int: 4, dec: 5, pct: 6, bold: 7, note: 8, boldint: 9, bolddec: 10 };
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="0.00&quot; %&quot;"/></numFmts>
<fonts count="4"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font><font><b/><sz val="14"/><color rgb="FF4A1FA8"/><name val="Arial"/></font><font><i/><sz val="10"/><color rgb="FF6A6691"/><name val="Arial"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDE6FC"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFB9A8E6"/></left><right style="thin"><color rgb="FFB9A8E6"/></right><top style="thin"><color rgb="FFB9A8E6"/></top><bottom style="thin"><color rgb="FFB9A8E6"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
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
/**
 * Excel danh sách chi tiết cắt – 3 sheet:
 *  1. Danh sách cắt: từng chi tiết (kể cả đoạn nối A/B), dài TP, dư, dài cắt, số lượng, tổng dài, KL.
 *  2. Sơ đồ cắt: từng kiểu cắt, số cây, cây số, thứ tự các đoạn, phần dư, thu hồi / phế.
 *  3. Tổng hợp: thông số, định mức xuất kho, thu hồi, hao phí, đoạn nối cột.
 */
export function barsXLSX(res, meta = {}) {
  const i = res.input, kgm = i.kgPerM, title = `${meta.spec || 'Thép hình'} – cây ${i.stockL} mm`;
  const head = arr => arr.map(v => ({ v, s: 'head' }));
  // 1. danh sách chi tiết
  const s1 = [[{ v: `DANH SÁCH CHI TIẾT CẮT – ${title}`, s: 'title' }], [{ v: meta.planLabel ? `Phương án: ${meta.planLabel}` : '', s: 'note' }],
    head(['STT', 'Mã chi tiết', 'Dài TP (mm)', 'Dư gia công (mm)', 'Dài cắt (mm)', 'Số lượng', 'Tổng dài cắt (m)', 'KL thành phẩm (kg)', 'Ghi chú'])];
  let sumQ = 0, sumL = 0, sumKg = 0;
  res.parts.forEach((p, k) => {
    const cut = res.cutL[k], totL = cut * p.qty / 1000, w = p.length / 1000 * kgm * p.qty;
    sumQ += p.qty; sumL += totL; sumKg += w;
    s1.push([{ v: k + 1, s: 'int' }, p.name, { v: p.length, s: 'int' }, { v: p.allowance, s: 'int' }, { v: cut, s: 'int' }, { v: p.qty, s: 'int' },
      { v: Math.round(totL * 1000) / 1000, s: 'dec' }, { v: Math.round(w * 100) / 100, s: 'dec' },
      p.splice === 'A' ? 'Đoạn dưới A (đầu có mặt bích)' : p.splice === 'B' ? 'Đoạn trên B (nối)' : '']);
  });
  s1.push([{ v: '', s: 'bold' }, { v: 'TỔNG', s: 'bold' }, { v: '', s: 'bold' }, { v: '', s: 'bold' }, { v: '', s: 'bold' },
    { v: sumQ, s: 'boldint' }, { v: Math.round(sumL * 1000) / 1000, s: 'bolddec' }, { v: Math.round(sumKg * 100) / 100, s: 'bolddec' }, { v: '', s: 'bold' }]);
  // 2. sơ đồ cắt
  const s2 = [[{ v: `SƠ ĐỒ CẮT – ${title}`, s: 'title' }], [{ v: `Mạch cưa ${i.kerf} mm · cắt đầu cây ${i.trim} mm · cây lẻ thu hồi khi ≥ ${i.remnantMin} mm`, s: 'note' }],
    head(['Kiểu cắt', 'Số cây', 'Cây số', 'Thứ tự các đoạn cắt (tên × dài cắt mm)', 'Số đoạn / cây', 'Tổng dài cắt / cây (mm)', 'Phần dư (mm)', 'Phần dư'])];
  let first = 1;
  res.groups.forEach((g, gi) => {
    const last = first + g.n - 1, cnt = new Map();
    g.pieces.forEach(k => cnt.set(k, (cnt.get(k) || 0) + 1));
    const list = [...cnt].map(([k, n]) => `${res.parts[k].name} × ${res.cutL[k]}${n > 1 ? ` (${n} đoạn)` : ''}`).join(' + ');
    const cutTot = g.pieces.reduce((s, k) => s + res.cutL[k], 0);
    s2.push([{ v: gi + 1, s: 'int' }, { v: g.n, s: 'int' }, first === last ? String(first) : `${first} – ${last}`, list, { v: g.pieces.length, s: 'int' },
      { v: cutTot, s: 'int' }, { v: g.leftover, s: 'int' }, g.leftover <= 0 ? '—' : g.recovered ? 'Cây lẻ thu hồi' : 'Phế liệu']);
    first = last + 1;
  });
  s2.push([{ v: 'TỔNG', s: 'bold' }, { v: res.totalBars, s: 'boldint' }, { v: '', s: 'bold' }, { v: '', s: 'bold' }, { v: '', s: 'bold' }, { v: '', s: 'bold' }, { v: '', s: 'bold' }, { v: '', s: 'bold' }]);
  // 3. tổng hợp
  const s3 = [[{ v: `TỔNG HỢP ĐỊNH MỨC – ${title}`, s: 'title' }], [],
    head(['Hạng mục', 'Giá trị', 'Đơn vị']),
    ['Quy cách', meta.spec || '', ''], ['Khối lượng mét', { v: kgm, s: 'dec' }, 'kg/m'], ['Dài cây', { v: i.stockL, s: 'int' }, 'mm'],
    ['Mạch cưa', { v: i.kerf, s: 'dec' }, 'mm'], ['Cắt bỏ đầu cây', { v: i.trim, s: 'dec' }, 'mm'], ['Ngưỡng thu hồi cây lẻ', { v: i.remnantMin, s: 'int' }, 'mm'],
    ['Số cây xuất', { v: res.totalBars, s: 'int' }, 'cây'], ['Số kiểu cắt', { v: res.groups.length, s: 'int' }, 'kiểu'],
    ['Khối lượng xuất kho', { v: Math.round(res.issuedKG * 100) / 100, s: 'dec' }, 'kg'],
    ['Cây lẻ thu hồi', { v: Math.round(res.recoveredKG * 100) / 100, s: 'dec' }, `kg (${res.recovered.length} cây${res.recovered.length ? ': ' + res.recovered.join('; ') + ' mm' : ''})`],
    ['Khối lượng thành phẩm', { v: Math.round(res.finishedKG * 100) / 100, s: 'dec' }, 'kg'],
    ['Hao phí / thành phẩm', { v: Math.round(res.wastePercent * 100) / 100, s: 'pct' }, '(xuất − thu hồi − TP) / TP'],
    ['Hao phí nếu không thu hồi', { v: Math.round(res.wasteNoRecoveryPercent * 100) / 100, s: 'pct' }, ''],
    ['Số cây tối thiểu', res.proven ? 'Đã chứng minh' : `Cận dưới ${res.lowerBound} cây`, ''],
  ];
  if (meta.planLabel) s3.push(['Phương án', meta.planLabel, '']);
  if (meta.splices?.length) {
    s3.push([], head(['Cột nối', 'Dài TP (mm)', 'Đoạn dưới A (mm)', 'Đoạn trên B (mm)', 'B / dài cột (%)', 'Số cột nối']));
    for (const s of meta.splices) s3.push([s.name, { v: s.L, s: 'int' }, { v: s.A, s: 'int' }, { v: s.B, s: 'int' }, { v: Math.round(1000 * s.B / s.L) / 10, s: 'pct' }, { v: s.n, s: 'int' }]);
  }
  if (meta.project || meta.date) s3.push([], [{ v: `${meta.project ? 'Dự án: ' + meta.project + ' · ' : ''}Ngày lập: ${meta.date || ''}`, s: 'note' }]);
  return xlsxBook([
    { name: 'Danh sách cắt', cols: [6, 24, 12, 12, 12, 10, 14, 16, 28], rows: s1, freeze: 3 },
    { name: 'Sơ đồ cắt', cols: [9, 8, 10, 60, 10, 14, 12, 16], rows: s2, freeze: 3 },
    { name: 'Tổng hợp', cols: [28, 16, 40, 16, 14, 12], rows: s3 },
  ]);
}

/** Hướng dẫn sử dụng – chỉ nói làm được gì và dùng thế nào (không nêu cách máy tính).
 *  Trang chủ (app.js) đọc GUIDE để hiện tab "Hướng dẫn sử dụng" cạnh tên tool; nếu trang chủ chưa hỗ trợ, tool tự hiện nút. */
export const GUIDE = `
<h3>Chức năng</h3>
<ul><li>Tính <b>định mức xuất thép hình</b> (H, I, U, V, hộp, ống…) từ danh sách chiều dài thành phẩm: số cây, sơ đồ cắt từng cây, cây lẻ thu hồi, khối lượng xuất kho và <b>hệ số hao phí</b> (tính trên khối lượng thành phẩm).</li>
<li>Không giới hạn số loại chi tiết. Với chi tiết được phép nối (ví dụ cột), máy đưa thêm phương án <b>không nối / nối ít / nối nhiều</b> để so sánh.</li>
<li>Phần dư dồn về một cây cuối; đoạn dư đủ dài được giữ làm cây lẻ, ngắn hơn tính vào hao phí.</li>
<li>Xuất: Excel danh sách cắt, DXF sơ đồ trải phôi, SVG, PDF sơ đồ cắt in xưởng.</li></ul>
<h3>Cách dùng</h3>
<ol><li>Chọn <b>quy cách</b> thép hình (khối lượng kg/m lấy theo thư viện; tích “Chỉnh KL/m dài” để nhập theo nhà cung cấp), chiều dài cây, mạch cưa, phần cắt bỏ đầu cây, ngưỡng cây lẻ.</li>
<li>Nhập chi tiết theo một trong hai cách:
 <ul><li><b>Nhập tay</b>: tên, chiều dài thành phẩm, dư gia công, số lượng, có cho phép nối hay không.</li>
 <li><b>Nhập Excel</b>: dùng form mẫu cutting plan (các dòng Thép hình ở sheet 1_BOM), chọn trình cắt theo quy cách rồi bấm “Nạp”.</li></ul></li>
<li>Kết quả cập nhật ngay: số cây, hao phí, cây lẻ, sơ đồ từng kiểu cắt. Chọn phương án nối phù hợp với yêu cầu kỹ thuật của kết cấu.</li>
<li>Xuất Excel / DXF / PDF để giao xưởng và kho.</li></ol>
<h3>Lưu ý</h3>
<ul><li>Chiều dài nhập là <b>thành phẩm</b>; dư gia công là tổng cho mỗi chi tiết.</li>
<li>Vị trí và số mối nối phải phù hợp bản vẽ và tiêu chuẩn kết cấu – người có thẩm quyền duyệt trước khi cắt.</li>
<li>Máy ghi “Số cây tối thiểu – đã chứng minh” khi không thể ít cây hơn.</li></ul>`;

const CSS = `
.bar-pro{font-size:16px;color:#191c69;min-width:0}.bar-pro *{box-sizing:border-box}
.bar-pro .bp-sub{font-size:16px;color:#706d99;margin:0 0 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.bar-pro .bp-grid{display:grid;grid-template-columns:minmax(430px,min(39%,555px)) minmax(0,1fr);gap:12px;align-items:stretch}
.bar-pro .bp-panel{background:#fff;border:1px solid #e4d3ff;border-radius:16px;padding:15px 16px;min-width:0}
.bar-pro .bp-title{color:#592ac1;font-size:20px;margin:0 0 12px;font-weight:850}
.bar-pro .bp-row{display:grid;gap:9px;margin-bottom:12px}.bar-pro .bp-row.three{grid-template-columns:repeat(3,minmax(0,1fr))}.bar-pro .bp-row.four{grid-template-columns:1.3fr 1fr 1fr 1fr}
.bar-pro label span{font-size:16px;font-weight:750;color:#251973;display:block;margin-bottom:4px;white-space:nowrap}
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
/* Danh sách chi tiết gắn với phương án cắt mới nhất. */
.bar-pro .bp-cut-list{margin-top:17px;border:1px solid #e6dafa;border-radius:12px;background:#fff;overflow:hidden}
.bar-pro .bp-cut-list[hidden]{display:none}
.bar-pro .bp-cut-title{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;background:#f8f5ff;color:#5a2bb8;font-size:17px;font-weight:800}
.bar-pro .bp-cut-title small{font-size:16px;color:#655587;font-weight:700}
.bar-pro .bp-cut-scroll{overflow-x:auto}
.bar-pro .bp-cut-table{width:100%;border-collapse:collapse;font-size:16px;color:#29234f;text-align:left}
.bar-pro .bp-cut-table th{background:#fcfaff;color:#695494;font-weight:750;border-bottom:1px solid #e8dff6;padding:9px 12px;white-space:nowrap}
.bar-pro .bp-cut-table td{border-bottom:1px solid #f0eaf9;padding:9px 12px;font-variant-numeric:tabular-nums}
.bar-pro .bp-cut-table tr:last-child td{border-bottom:none}
.bar-pro .bp-cut-table .bp-num{text-align:right;white-space:nowrap}
.bar-pro .bp-cut-chip{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:8px;vertical-align:middle;border:1px solid #8878a5}
.bar-pro .bp-cut-total td{font-weight:850;background:#f8f5ff;color:#5328a9}
.bar-pro .bp-results{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}
.bar-pro .bp-res{background:#fff;border:1px solid #e1d5f9;border-radius:14px;padding:10px 13px;min-height:79px}
.bar-pro .bp-res.em{background:linear-gradient(115deg,#a943f7,#7930e8);color:#fff;border-color:transparent}
.bar-pro .bp-res strong{font-size:16px;display:block}.bar-pro .bp-res output{font-size:22px;font-weight:850;display:block;overflow-wrap:anywhere}
.bar-pro .bp-note{font-size:16px;color:#6a6691;text-align:center;margin:7px 0 0}
.bar-pro .bp-parts-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:4px 0 6px}
.bar-pro .bp-parts-head strong{font-size:18px;color:#5c29bf;font-weight:850}
.bar-pro .bp-parts-head small{font-size:16px;color:#6a598b;font-weight:700}
.bar-pro .bp-parts{max-height:520px;overflow:auto;padding-right:4px}
.bar-pro .bp-part h3{justify-content:space-between}
.bar-pro .bp-part h3 span.bp-ptitle{display:inline-flex;align-items:center;gap:8px}
.bar-pro .bp-del{background:#fff5f6;border:1px solid #f0b7c1;color:#b52441;border-radius:8px;padding:2px 9px;font-size:16px;font-weight:700;cursor:pointer}
.bar-pro .bp-del:hover{background:#ffe9ec}
.bar-pro .bp-add{width:100%;margin:4px 0 2px;min-height:40px;border:2px dashed #b59efc;border-radius:11px;background:#faf7ff;color:#632dd6;font-size:16px;font-weight:800;cursor:pointer}
.bar-pro .bp-add:hover{background:#f1ebfd}
.bar-pro .bp-busy{display:inline-block;width:15px;height:15px;border-radius:50%;border:2px solid #d1bef5;border-top-color:#662be8;animation:bp-spin .7s linear infinite;vertical-align:middle;margin-left:6px}
@keyframes bp-spin{to{transform:rotate(360deg)}}
.bar-pro .bp-sptg{display:inline-flex;align-items:center;gap:6px;font-size:16px;font-weight:700;color:#0f6e56;margin-left:auto;margin-right:10px;cursor:pointer}
.bar-pro .bp-sptg input{width:17px;height:17px;min-height:17px;accent-color:#0f6e56}
.bar-pro .bp-plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:10px}
.bar-pro .bp-plan{border:1.5px solid #e1d5f9;border-radius:13px;background:#fff;padding:9px 12px;text-align:left;cursor:pointer;color:#29234f}
.bar-pro .bp-plan:hover{border-color:#b59efc}
.bar-pro .bp-plan.is-active{border-color:#7930e8;background:#f6f0ff;box-shadow:0 0 0 3px #7542ff1c}
.bar-pro .bp-plan b{display:block;font-size:16px;color:#5c29bf;font-weight:850}
.bar-pro .bp-plan big{display:block;font-size:22px;font-weight:850;margin:2px 0}
.bar-pro .bp-plan small{display:block;font-size:16px;color:#655587;line-height:1.35}
.bar-pro .bp-plan .bp-save{color:#0f6e56;font-weight:800}
.bar-pro .bp-splice{border:1px solid #e6dafa;border-radius:12px;background:#fff;margin-bottom:10px;overflow:hidden}
.bar-pro .bp-splice[hidden]{display:none}
.bar-pro .bp-sp-head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 12px;background:#f8f5ff;color:#5a2bb8;font-weight:800;font-size:16px;flex-wrap:wrap}
.bar-pro .bp-sp-head button{background:#fff;border:1px solid #b59efc;border-radius:8px;color:#632dd6;font-weight:700;font-size:16px;padding:3px 10px;cursor:pointer}
.bar-pro .bp-sp-table{width:100%;border-collapse:collapse;font-size:16px}
.bar-pro .bp-sp-table th{color:#695494;font-weight:750;text-align:left;padding:7px 10px;border-bottom:1px solid #eee6fa;white-space:nowrap}
.bar-pro .bp-sp-table td{padding:6px 10px;border-bottom:1px solid #f3eefb;vertical-align:middle}
.bar-pro .bp-sp-table input{min-height:34px;font-size:16px;padding:4px 7px;max-width:110px}
.bar-pro .bp-pct{font-weight:800;white-space:nowrap}.bar-pro .bp-pct.ok{color:#0f6e56}.bar-pro .bp-pct.over{color:#b06a12}
.bar-pro .bp-pct small{display:block;font-weight:600;font-size:16px}
.bar-pro .bp-sp-note{font-size:16px;color:#6a598b;padding:7px 12px}
.bar-pro .bp-cost-head{font-size:17px;font-weight:850;color:#5c29bf;margin:2px 0 6px}
.bar-pro .bp-cost-head small{font-size:16px;font-weight:650;color:#6a598b}
.bar-pro .bp-cost-hint{font-size:16px;color:#6a598b;margin:-6px 0 12px}
.bar-pro .bp-plan .bp-money{color:#24156c;font-weight:800}
.bar-pro .bp-plan .bp-loss{color:#a3365a;font-weight:800}
.bar-pro .bp-sp-warn{font-size:16px;color:#a3500a;background:#fff7ea;border-top:1px solid #f6d9a8;padding:8px 12px;margin:0;font-weight:700}
.bar-pro .bp-sp-warn:empty{display:none}
.bar-pro .bp-sp-table input.is-bad{border:2px solid #e0902a;background:#fff9ef}

/* Readability floor: no UI text smaller than 16px, including native small/sup/sub. */
.bar-pro :is(small, sub, sup){font-size:max(16px, .833333em)}
@media(max-width:900px){.bar-pro .bp-plans{grid-template-columns:minmax(0,1fr)}}
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
.bar-pro .bp-guide-btn{border:1px solid #cdb8fb;background:#fff;color:#5c29bf;border-radius:10px;padding:6px 14px;font-size:16px;font-weight:800;cursor:pointer}
.bar-pro .bp-guide-btn[aria-expanded="true"]{background:#5c29bf;color:#fff}
.bar-pro .bp-guide{border:1px solid #d9c9fb;border-radius:14px;background:#fff;padding:12px 18px;margin:0 0 14px;font-size:16px;line-height:1.5;color:#2c2552}
.bar-pro .bp-guide[hidden]{display:none}.bar-pro .bp-guide h3{margin:10px 0 4px;font-size:16px;color:#4d21b8}.bar-pro .bp-guide h3:first-child{margin-top:0}
.bar-pro .bp-guide ol,.bar-pro .bp-guide ul{margin:2px 0 4px;padding-left:22px}.bar-pro .bp-guide li{margin:2px 0}
.bar-pro .bp-import{display:flex;flex-wrap:wrap;align-items:center;gap:8px;border:1px solid #e6dafa;background:#fbf9ff;border-radius:11px;padding:8px 10px;margin:0 0 12px}
.bar-pro .bp-import>b{color:#5c29bf;font-size:16px;font-weight:850}.bar-pro .bp-import small{color:#6a598b;font-size:16px}
.bar-pro .bp-imp{border:1px solid #d9c9fb;border-radius:12px;padding:10px 12px;margin:0 0 12px;background:#fff}.bar-pro .bp-imp[hidden]{display:none}
.bar-pro .bp-imp h4{margin:0 0 6px;font-size:16px;color:#4d21b8;display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.bar-pro .bp-imp p{font-size:16px;color:#65588b;margin:4px 0}
.bar-pro .bp-imp ul{margin:4px 0 6px;padding-left:20px;font-size:16px;line-height:1.4}.bar-pro .bp-imp .bad{color:#b52441}.bar-pro .bp-imp .warn{color:#8a5a00}.bar-pro .bp-imp .ok{color:#1f7a55}
.bar-pro .bp-imp-g{border:1px solid #eee5fb;border-radius:10px;padding:7px 10px;margin:6px 0;display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between}
.bar-pro .bp-imp-g b{color:#3e2391;font-size:16px}.bar-pro .bp-imp-g small{color:#6a598b;font-size:16px;display:block}.bar-pro .bp-imp-g.is-bad{border-color:#f0c2cc;background:#fff7f9}
`;

const DEFAULTS = {
  spec: 'H125', kgPerM: '23.8', stockL: '12000', kerf: '3', trim: '0', remnantMin: '1000',
  spIdeal: '10', spStep: '5', plan: 'none',
  parts: [{ name: 'CT1', length: '3060', allowance: '0', qty: '91', splice: true },
          { name: 'CT2', length: '2060', allowance: '0', qty: '63', splice: true },
          { name: 'CT3', length: '3360', allowance: '0', qty: '31', splice: true }],
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
  let last = null, lastSVG = '', timer = null, disposed = false, worker = null, serial = 0;
  let lastInput = null, plans = [], levels = [], basePlans = [], current = null, spTimer = null;
  let steelProfiles = [], profilesReady = false, profilesFailed = false;
  let profilesByCode = new Map();
  const fld = (name, label, val, cls = '') =>
    `<label class="${cls}"><span>${esc(label)}</span><input name="${name}" value="${esc(val)}" inputmode="decimal" autocomplete="off"></label>`;
  root.innerHTML = `<style>${CSS}</style><div class="bar-pro">
  ${ctx.hostGuide ? '' : '<p class="bp-sub"><button type="button" class="bp-guide-btn" id="bp-guide-btn" aria-expanded="false" aria-controls="bp-guide">📘 Hướng dẫn sử dụng</button></p>'}
  ${ctx.hostGuide ? '' : `<section class="bp-guide" id="bp-guide" hidden aria-label="Hướng dẫn sử dụng">${GUIDE}</section>`}
  <div class="bp-grid">
   <section class="bp-panel"><h2 class="bp-title">THÉP HÌNH &amp; CHI TIẾT</h2>
    <div class="bp-import" role="group" aria-label="Nhập dữ liệu"><b>Nhập dữ liệu</b>
     <button type="button" class="bp-export" id="bp-imp-xlsx" title="Form cutting plan 3 sheet – đọc các dòng Thép hình">📄 Nhập Excel</button>
     <small>hoặc nhập tay bên dưới</small>
     <input type="file" id="bp-file-xlsx" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></div>
    <div class="bp-imp" id="bp-imp" role="region" aria-label="Kết quả nhập file" hidden></div>
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
    <div class="bp-row three">${fld('spIdeal', 'Đoạn nối B lý tưởng ≤ (%)', st.spIdeal ?? '10')}${fld('spStep', 'Làm tròn đoạn nối (mm)', st.spStep ?? '5')}</div>
    <div class="bp-cost-head">Chi phí <small>(tùy chọn – nhập đủ để phần mềm chọn phương án lợi nhất về tiền)</small></div>
    <div class="bp-row three">${fld('giaThep', 'Giá thép (đ/kg)', st.giaThep ?? '')}${fld('giaPhe', 'Giá phế (đ/kg)', st.giaPhe ?? '')}${fld('giaNoi', 'Chi phí 1 mối nối (đ)', st.giaNoi ?? '')}</div>
    <p class="bp-cost-hint">Chi phí 1 mối nối gồm nhân công và dây hàn. Cây lẻ thu hồi tính theo giá thép, phế liệu tính theo giá phế.</p>
    <div class="bp-parts-head"><strong>Chi tiết cần cắt</strong><small id="bp-count"></small></div>
    <div class="bp-parts" id="bp-parts"></div>
    <button type="button" class="bp-add" id="bp-add">＋ Thêm chi tiết</button>
    <p class="bp-error" id="bp-error" role="alert"></p>
   </section>
   <section class="bp-panel">
    <div class="bp-plans" id="bp-plans"></div>
    <div class="bp-splice" id="bp-splice" hidden></div>
    <div class="bp-figure"><div class="bp-head" id="bp-head">SƠ ĐỒ CẮT</div><div id="bp-figure"></div></div>
    <div class="bp-caption"><strong class="bp-summary" id="bp-summary">—</strong><span class="bp-proof" id="bp-proof"></span></div>
    <div class="bp-caption"><p class="bp-strategy" id="bp-strategy">—</p><span><button class="bp-export" type="button" id="bp-csv" disabled title="Danh sách chi tiết cắt, sơ đồ cắt từng cây, tổng hợp định mức">↓ Excel danh sách cắt</button> <button class="bp-export" type="button" id="bp-export" disabled title="Sơ đồ trải phôi 1:1 mm, mở bằng AutoCAD">↓ DXF sơ đồ trải phôi</button> <button class="bp-export" type="button" id="bp-svg" disabled title="Sơ đồ cắt mở nhanh bằng trình duyệt, không cần CAD">↓ SVG sơ đồ</button> <button class="bp-export" type="button" id="bp-pdf" disabled title="Sơ đồ cắt khổ A3 ngang – in xưởng">↓ PDF sơ đồ cắt</button></span></div>
    <div class="bp-cut-list" id="bp-cut-list" hidden>
      <div class="bp-cut-title"><span>DANH SÁCH CHI TIẾT CẦN CẮT</span><small id="bp-cut-count"></small></div>
      <div class="bp-cut-scroll"><table class="bp-cut-table"><thead><tr><th>STT</th><th>Mã chi tiết</th><th class="bp-num">Dài TP (mm)</th><th class="bp-num">Dư gia công (mm)</th><th class="bp-num">Số lượng</th></tr></thead><tbody id="bp-cut-body"></tbody></table></div>
    </div>
   </section>
  </div>
  <section class="bp-results">
   <div class="bp-res"><strong>Xuất kho (kg)</strong><output id="bp-issued">—</output></div>
   <div class="bp-res"><strong>Thành phẩm (kg)</strong><output id="bp-finished">—</output></div>
   <div class="bp-res em"><strong>Hao phí / TP (%)</strong><output id="bp-waste">—</output></div>
   <div class="bp-res"><strong>Cây lẻ thu hồi (mm)</strong><output id="bp-remnant">—</output></div>
  </section>
  <p class="bp-note">Hao phí = (Xuất kho − Cây lẻ thu hồi − Thành phẩm) / Thành phẩm × 100. Cây lẻ chỉ tính thu hồi khi đạt ngưỡng. Số cây không giới hạn – ghép đến khi hết chi tiết.</p>
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

  function renderParts() {
    $('bp-parts').innerHTML = st.parts.map((p, t) => {
      const [fill, edge] = colorOf(t);
      return `<div class="bp-part" data-part="${t}"><h3><span class="bp-ptitle"><i style="background:${fill};border-color:${edge}"></i>Chi tiết ${t + 1}</span><label class="bp-sptg" title="Cho phép phần mềm đề xuất nối cột này"><input type="checkbox" data-splice="${t}" ${p.splice !== false ? 'checked' : ''}>Cho phép nối</label>${st.parts.length > 1 ? `<button type="button" class="bp-del" data-del="${t}" aria-label="Xóa chi tiết ${t + 1}">✕ Xóa</button>` : ''}</h3>
      <div class="bp-row four">${fld(`name${t}`, 'Tên / mã', p.name)}${fld(`length${t}`, 'Dài TP (mm)', p.length)}${fld(`allowance${t}`, 'Dư gia công', p.allowance, 'is-allow')}${fld(`qty${t}`, 'Số lượng', p.qty)}</div></div>`;
    }).join('');
    const total = st.parts.reduce((s, p) => s + (String(p.length).trim() ? (Number(String(p.qty).replaceAll(',', '')) || 0) : 0), 0);
    put('bp-count', `${st.parts.length} loại · ${total.toLocaleString('vi-VN')} chiếc`);
  }
  renderParts();
  function collect() {
    for (const k of ['spec', 'kgPerM', 'stockL', 'kerf', 'trim', 'remnantMin', 'spIdeal', 'spStep', 'giaThep', 'giaPhe', 'giaNoi']) st[k] = val(k);
    st.manualKg=weightEdit.checked;
    st.parts.forEach((p, t) => { p.name = val(`name${t}`); p.length = val(`length${t}`); p.allowance = val(`allowance${t}`); p.qty = val(`qty${t}`); p.splice = root.querySelector(`[data-splice="${t}"]`)?.checked !== false; });
    const total = st.parts.reduce((s, p) => s + (String(p.length).trim() ? (Number(String(p.qty).replaceAll(',', '')) || 0) : 0), 0);
    put('bp-count', `${st.parts.length} loại · ${total.toLocaleString('vi-VN')} chiếc`);
    saved = structuredClone(st);
  }
  function payload() {
    if(!st.manualKg && !profilesByCode.has(profileKey(st.spec)) && (profilesReady || profileKey(st.spec)!=='H125'))
      throw Error('Quy cách chưa có trong thư viện. Chọn quy cách có sẵn hoặc tích “Chỉnh KL/m dài”.');
    if(!String(st.kgPerM).trim()) throw Error('Chưa có khối lượng/m dài. Hãy chọn quy cách hoặc tích “Chỉnh KL/m dài”.');
    return {
      kgPerM: parseNum(st.kgPerM, 'Khối lượng mét'), stockL: parseNum(st.stockL, 'Dài cây'),
      kerf: parseNum(st.kerf, 'Mạch cưa'),
      trim: parseNum(st.trim, 'Cắt bỏ đầu cây'), remnantMin: parseNum(st.remnantMin, 'Ngưỡng cây lẻ'),
      parts: st.parts.filter(p => String(p.length).trim() && String(p.qty).trim() && Number(String(p.qty).replaceAll(',', '')) > 0)
        .map(p => ({ allowSplice: p.splice !== false, color: st.parts.indexOf(p), name: p.name || `CT${st.parts.indexOf(p) + 1}`, length: parseNum(p.length, `Dài chi tiết ${st.parts.indexOf(p) + 1}`),
        allowance: parseNum(p.allowance || '0', `Dư gia công chi tiết ${st.parts.indexOf(p) + 1}`), qty: parseNum(p.qty, `Số lượng chi tiết ${st.parts.indexOf(p) + 1}`, { integer: true }) })),
    };
  }
  function invalid(msg) {
    last = null; lastSVG = ''; $('bp-figure').textContent = ''; $('bp-export').disabled = true; $('bp-csv').disabled = true; $('bp-svg').disabled = true; $('bp-pdf').disabled = true; $('bp-cut-list').hidden = true; $('bp-cut-body').replaceChildren(); $('bp-plans').innerHTML = ''; $('bp-splice').hidden = true; plans = []; current = null;
    put('bp-error', msg); for (const id of ['bp-summary', 'bp-proof', 'bp-strategy', 'bp-issued', 'bp-finished', 'bp-waste', 'bp-remnant']) put(id, '—');
    put('bp-proof', '');
  }
  function present(res, plan = current) {
    last = res;
    const svg = drawBars(res);
    $('bp-figure').innerHTML = svg; lastSVG = svg; $('bp-export').disabled = false; $('bp-csv').disabled = false; $('bp-svg').disabled = false; $('bp-pdf').disabled = false;
    put('bp-head', `SƠ ĐỒ CẮT ${st.spec || ''} – CÂY ${pretty(res.input.stockL)} mm`);
    put('bp-summary', `${res.totalBars} cây ${pretty(res.input.stockL / 1000)} m` + (plan ? ` · ${plan.label}${plan.splices ? ` – ${plan.splices} mối nối` : ''}` : ''));
    put('bp-proof', res.proven ? '✓ Số cây tối thiểu – đã chứng minh'
      : `Cận dưới ${res.lowerBound} cây · phương án hơn cận dưới ${res.gap} cây`);
    const prc = prices();
    put('bp-strategy', `${res.groups.length} kiểu cắt · phần dư dồn về cây cuối` + (plan?.splices ? ' · đoạn B nét đứt = đoạn nối đầu cột' : '') +
      (prc && plan ? ` · Chi phí ${money(costOf({ result: res, splices: plan.splices || 0 }, prc))}` : '') +
      ` · Hao phí nếu không thu hồi: ${res.wasteNoRecoveryPercent.toFixed(2)} %`);
    put('bp-issued', pretty(res.issuedKG)); put('bp-finished', pretty(res.finishedKG));
    put('bp-waste', res.wastePercent.toFixed(2));
    const rec = res.recovered;
    put('bp-remnant', rec.length ? (rec.length > 4 ? `${rec.slice(0, 4).map(pretty).join(' ; ')} … (${rec.length} cây)` : rec.map(pretty).join(' ; ')) : 'Không có');
    // Danh sách dựa trên input đã được thuật toán xác nhận, không lấy từ ô đang nhập dở.
    const totalPieces = res.parts.reduce((sum, p) => sum + p.qty, 0);
    $('bp-cut-body').innerHTML = res.parts.map((p, idx) => {
      const [fill, edge] = colorOf(p.color ?? idx);
      return `<tr><td>${idx + 1}</td><td><i class="bp-cut-chip" style="background:${fill};border-color:${edge}"></i>${esc(p.name)}</td><td class="bp-num">${pretty(p.length)}</td><td class="bp-num">${pretty(p.allowance)}</td><td class="bp-num"><strong>${pretty(p.qty)}</strong></td></tr>`;
    }).join('') + `<tr class="bp-cut-total"><td colspan="4">TỔNG SỐ LƯỢNG</td><td class="bp-num">${pretty(totalPieces)}</td></tr>`;
    put('bp-cut-count', `${res.parts.length} loại · ${pretty(totalPieces)} chi tiết`);
    $('bp-cut-list').hidden = false;
    put('bp-error', '');
  }
  /* ---------- PRO-MAX: 3 phương án và chỉnh đoạn nối ---------- */
  const money = v => `${Math.round(v).toLocaleString('vi-VN')} đ`;
  /** Giá người dùng nhập; null nếu chưa đủ (cần giá thép và chi phí mối nối). */
  function prices() {
    const n = v => { const t = String(v ?? '').replaceAll(',', '').replaceAll('.', '').trim(); return t === '' ? NaN : Number(t); };
    const steel = n(st.giaThep), scrap = n(st.giaPhe), joint = n(st.giaNoi);
    if (!(steel > 0) || !(joint >= 0)) return null;
    return { steel, scrap: scrap >= 0 ? scrap : 0, joint };
  }
  /** Chi phí = (xuất − cây lẻ thu hồi) × giá thép − phế × giá phế + số mối nối × chi phí nối. */
  function costOf(p, pr) {
    const r = p.result, net = r.issuedKG - r.recoveredKG, scrap = Math.max(0, net - r.finishedKG);
    return net * pr.steel - scrap * pr.scrap + p.splices * pr.joint;
  }
  /** Dựng danh sách thẻ: có giá -> Không nối / Tối ưu tài chính / Tối ưu thép; chưa có giá -> không nối / ít / nhiều. */
  function buildPlans() {
    const pr = prices();
    if (!pr || !levels.length) { plans = basePlans.slice(); return; }
    const none = basePlans[0];
    let fin = none, finCost = costOf(none, pr);
    for (const p of levels) { const c = costOf(p, pr); if (c < finCost - 1e-6) { fin = p; finCost = c; } }
    const mains = levels.filter(l => !l.alt), most = mains[mains.length - 1];
    plans = [{ ...none, label: fin === none ? 'Không nối · tối ưu tài chính' : 'Không nối' }];
    if (fin !== none && fin !== most) plans.push({ ...fin, key: 'fin', label: 'Tối ưu tài chính' });
    plans.push({ ...most, key: 'many', label: fin === most ? 'Tối ưu thép & tài chính' : 'Tối ưu thép' });
  }
  function renderPlans() {
    const base = plans[0]?.result;
    $('bp-plans').innerHTML = plans.map(p => {
      const r = p.result, save = base ? base.totalBars - r.totalBars : 0, pr = prices();
      const sub = p.key === 'none' ? 'Cắt nguyên, không mối hàn'
        : `${p.splices} mối nối – cột ${p.spec.map(x => esc(x.name || '')).join(', ')}${p.spec.length > 1 ? ` (${p.spec.length} loại)` : ''} · <span class="bp-save">bớt ${save} cây</span>`;
      return `<button type="button" class="bp-plan${current?.key === p.key ? ' is-active' : ''}" data-plan="${p.key}">
        <b>${p.label}</b><big>${r.totalBars} cây</big><small>${sub}</small>
        <small>Hao phí ${r.wastePercent.toFixed(2)} %${r.recovered.length ? ` · ${r.recovered.length} cây lẻ` : ''}</small>
        ${pr ? (() => { const c = costOf(p, pr), d = costOf(plans[0], pr) - c;
          return `<small>Chi phí <span class="bp-money">${money(c)}</span></small>` +
            (p.key === 'none' ? '' : `<small>${d >= 0 ? `Lợi <span class="bp-save">${money(d)}</span>` : `Lỗ <span class="bp-loss">${money(-d)}</span>`} so với không nối</small>`); })() : ''}</button>`;
    }).join('') + (plans.length === 1 && lastInput?.parts.some(p => p.allowSplice)
      ? '<small class="bp-sp-note" style="grid-column:1/-1">Nối cột không bớt được cây nào cho đơn này – giữ phương án không nối.</small>' : '');
  }
  function pctCell(s) {
    const ideal = Number(st.spIdeal) || 10, pct = 100 * s.B / s.L, ok = pct <= ideal + 1e-9;
    return `<span class="bp-pct ${ok ? 'ok' : 'over'}">${pct.toFixed(1)} %<small>${ok ? 'trong ngưỡng lý tưởng' : `vượt ngưỡng ${ideal}% – vẫn cho phép`}</small></span>`;
  }
  function renderSplice() {
    const box = $('bp-splice');
    if (!current || !current.splices) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = `<div class="bp-sp-head"><span>ĐOẠN NỐI CỘT – ${current.label.toUpperCase()}${current.edited ? ' (đã chỉnh)' : ''}</span>
      <button type="button" id="bp-sp-reset">↺ Khôi phục gợi ý</button></div>
      <div class="bp-cut-scroll"><table class="bp-sp-table"><thead><tr><th>Cột</th><th>Dài TP</th><th>Đoạn dưới A</th><th>Đoạn trên B</th><th>B / dài cột</th><th>Số cột nối</th></tr></thead><tbody>
      ${current.spec.map((s, j) => `<tr><td><strong>${esc(s.name)}</strong></td><td>${pretty(s.L)}</td>
        <td><input data-sp-a="${j}" value="${s.A}" inputmode="decimal" aria-label="Đoạn dưới A của ${esc(s.name)}"></td>
        <td><input data-sp-b="${j}" value="${s.B}" inputmode="decimal" aria-label="Đoạn trên B của ${esc(s.name)}"></td>
        <td data-sp-pct="${j}">${pctCell(s)}</td>
        <td><input data-sp-n="${j}" value="${s.n}" inputmode="numeric" aria-label="Số cột nối ${esc(s.name)}"></td></tr>`).join('')}
      </tbody></table></div>
      <p class="bp-sp-warn" id="bp-sp-warn" role="status"></p>
      <p class="bp-sp-note">A + B = dài cột: sửa A thì B tự đổi, sửa B thì A tự đổi. Đoạn A ở dưới (hàn mặt bích), đoạn B nối ở đầu trên – mối nối cách đỉnh cột đúng bằng B.</p>`;
  }
  function showPlan(p) {
    current = p; st.plan = p.key; saved = structuredClone(st);
    renderPlans(); renderSplice(); present(p.result, p);
  }
  function runWorker(message, onDone, onError) {
    serial++; const job = serial;
    if (worker) { worker.terminate(); worker = null; }
    const done = (res, err) => {
      if (job !== serial || disposed || ctx.signal?.aborted) return;
      worker?.terminate(); worker = null;
      if (err) (onError || invalid)(err); else onDone(res);
    };
    const local = () => {
      try { done(message.mode === 'promax' ? calculateProMax(message.input, message.opts) : calculateCustomSplice(message.input, message.spec)); }
      catch (e) { done(null, e?.message || 'Không tính được.'); }
    };
    try {
      worker = new Worker(import.meta.url, { type: 'module', name: 'epsilon-thep-hinh-pro-max' });
      worker.addEventListener('message', e => done(e.data?.result, e.data?.ok ? null : e.data?.error || 'Không tính được.'), { once: true });
      worker.addEventListener('error', () => { if (job !== serial) return; worker?.terminate(); worker = null; local(); }, { once: true });
      worker.postMessage(message);
    } catch { worker = null; local(); }
  }
  function compute() {
    let input, opts;
    try {
      collect(); input = payload();
      opts = { idealRatio: parseNum(st.spIdeal || '10', 'Ngưỡng đoạn nối'), roundStep: Math.max(1, parseNum(st.spStep || '5', 'Làm tròn đoạn nối')) };
    } catch (e) { invalid(e?.message || 'Không tính được.'); return; }
    $('bp-proof').innerHTML = 'Đang tìm phương án nối<span class="bp-busy"></span>';
    runWorker({ mode: 'promax', input, opts }, res => {
      lastInput = input; basePlans = res.plans; levels = res.levels || [];
      buildPlans();
      showPlan(plans.find(p => p.key === st.plan) || plans[0]);
    });
  }
  /** Đọc bảng chỉnh nối. Trả { spec, warnings, ok }: ok = false thì KHÔNG tính lại,
   *  giữ nguyên sơ đồ đang có và chỉ hiện cảnh báo (không bao giờ xóa trắng màn hình). */
  function readSpliceEdits(changed) {
    const spec = current.spec.map(s => ({ ...s }));
    const raw = v => String(v ?? '').replaceAll(',', '').trim();
    const num = v => (raw(v) === '' ? NaN : Number(raw(v)));
    const warnings = []; let ok = true;
    spec.forEach((s, j) => {
      const A = root.querySelector(`[data-sp-a="${j}"]`), B = root.querySelector(`[data-sp-b="${j}"]`), N = root.querySelector(`[data-sp-n="${j}"]`);
      const qty = lastInput?.parts[s.idx]?.qty ?? Infinity;
      // liên kết A + B = dài cột (chỉ khi ô vừa sửa là số hợp lệ)
      if (changed === A && Number.isFinite(num(A.value))) B.value = String(Math.round((s.L - num(A.value)) * 1000) / 1000);
      if (changed === B && Number.isFinite(num(B.value))) A.value = String(Math.round((s.L - num(B.value)) * 1000) / 1000);
      s.A = num(A.value); s.B = num(B.value); s.n = num(N.value);
      let badA = false, badB = false, badN = false;
      if (!Number.isFinite(s.A) || !Number.isFinite(s.B)) { warnings.push(`${s.name}: nhập chiều dài đoạn nối bằng số.`); badA = badB = true; ok = false; }
      else if (s.B >= s.L || s.A <= 0) { warnings.push(`${s.name}: đoạn nối ${pretty(s.B)} mm dài hơn hoặc bằng chiều dài cột ${pretty(s.L)} mm – kiểm tra lại số vừa nhập.`); badA = badB = true; ok = false; }
      else if (s.B <= 0) { warnings.push(`${s.name}: đoạn nối B phải lớn hơn 0.`); badA = badB = true; ok = false; }
      else if (s.B > s.A) warnings.push(`${s.name}: đoạn trên B (${pretty(s.B)}) đang dài hơn đoạn dưới A (${pretty(s.A)}) – vẫn tính, cần kiểm tra lại.`);
      if (!Number.isInteger(s.n) || s.n < 0 || s.n > qty) { warnings.push(`${s.name}: số cột nối phải là số nguyên từ 0 đến ${qty}.`); badN = true; ok = false; }
      A.classList.toggle('is-bad', badA); B.classList.toggle('is-bad', badB); N.classList.toggle('is-bad', badN);
      const cell = root.querySelector(`[data-sp-pct="${j}"]`);
      if (cell && s.B > 0 && s.B < s.L) cell.innerHTML = pctCell(s);
    });
    return { spec, warnings, ok };
  }
  const spWarn = msg => { const el = root.querySelector('#bp-sp-warn'); if (el) el.textContent = msg || ''; };
  $('bp-splice').addEventListener('input', e => {
    if (!current || !e.target.matches('[data-sp-a],[data-sp-b],[data-sp-n]')) return;
    const { spec, warnings, ok } = readSpliceEdits(e.target);
    spWarn(warnings.join(' '));
    clearTimeout(spTimer);
    if (!ok) return;                                      // số sai: giữ nguyên kết quả đang có
    spTimer = setTimeout(() => {
      $('bp-proof').innerHTML = 'Đang tính lại<span class="bp-busy"></span>';
      const base = current, prevProof = last;
      runWorker({ mode: 'custom', input: lastInput, spec: spec.map(({ idx, A, B, n }) => ({ idx, A, B, n })) }, res => {
        current = { ...base, spec: res.spec, splices: res.splices, result: res.result, edited: true };
        renderPlans(); present(res.result, current);
        spWarn(warnings.join(' '));
        const head = root.querySelector('.bp-sp-head span');
        if (head) head.textContent = `ĐOẠN NỐI CỘT – ${current.label.toUpperCase()} (đã chỉnh)`;
      }, err => {                                          // lỗi khi tính: chỉ cảnh báo, giữ sơ đồ cũ
        spWarn(`Chưa tính được phương án chỉnh: ${err}`);
        if (prevProof) present(prevProof, current);
      });
    }, 350);
  }, ctx.signal ? { signal: ctx.signal } : undefined);
  $('bp-splice').addEventListener('click', e => {
    if (e.target.id !== 'bp-sp-reset') return;
    const p = plans.find(x => x.key === current?.key) || basePlans.find(x => x.key === current?.key);
    if (p) showPlan(p);
  }, ctx.signal ? { signal: ctx.signal } : undefined);
  $('bp-plans').addEventListener('click', e => {
    const btn = e.target.closest('[data-plan]');
    const p = btn && plans.find(x => x.key === btn.dataset.plan);
    if (p) showPlan(p);
  }, ctx.signal ? { signal: ctx.signal } : undefined);
  $('bp-parts').addEventListener('change', e => { if (e.target.matches('[data-splice]')) { collect(); schedule(); } },
    ctx.signal ? { signal: ctx.signal } : undefined);
  const schedule = () => { clearTimeout(timer); timer = setTimeout(compute, 200); };
  root.addEventListener('input', e => {
    if(!e.target.matches('input[name]'))return;
    if (['giaThep', 'giaPhe', 'giaNoi'].includes(e.target.name)) {
      collect(); saved = structuredClone(st);
      if (!basePlans.length) return;
      const keep = current;
      buildPlans();
      const p = plans.find(x => x.key === keep?.key) || plans.find(x => x.splices === keep?.splices && x.result.totalBars === keep?.result.totalBars);
      if (keep?.edited) { renderPlans(); present(keep.result, keep); }
      else showPlan(p || plans[0]);
      return;
    }
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
  $('bp-add').addEventListener('click', () => {
    collect();
    st.parts.push({ name: `CT${st.parts.length + 1}`, length: '', allowance: '0', qty: '1', splice: true });
    renderParts(); collect();
    root.querySelector(`[name="length${st.parts.length - 1}"]`)?.focus();
  }, ctx.signal ? { signal: ctx.signal } : undefined);
  $('bp-parts').addEventListener('click', e => {
    const btn = e.target.closest('[data-del]');
    if (!btn || st.parts.length <= 1) return;
    collect();
    st.parts.splice(Number(btn.dataset.del), 1);
    renderParts(); collect(); schedule();
  }, ctx.signal ? { signal: ctx.signal } : undefined);
  const today = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
  const exportMeta = () => ({ spec: st.spec || '', date: today(),
    planLabel: current ? current.label + (current.splices ? ` – ${current.splices} mối nối` : '') : '',
    splices: current?.splices ? current.spec.filter(s => s.n > 0) : [] });
  const fileBase = () => `${(st.spec || 'thep-hinh').replace(/[^\w.-]+/g, '_')}_cay${last?.input.stockL || ''}`;
  $('bp-csv').addEventListener('click', () => {
    if (!last) return;
    const blob = new Blob([barsXLSX(last, exportMeta())], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    if (downloadBlob) downloadBlob(blob, `${fileBase()}_danh_sach_cat.xlsx`);
    ctx.showToast?.('Đã tạo file Excel danh sách chi tiết cắt.');
  }, ctx.signal ? { signal: ctx.signal } : undefined);
  $('bp-export').addEventListener('click', () => {
    if (!last) return;
    const blob = new Blob([barsDXF(last, exportMeta())], { type: 'application/dxf' });
    if (downloadBlob) downloadBlob(blob, `${fileBase()}_so_do_trai_phoi.dxf`);
    ctx.showToast?.('Đã tạo DXF sơ đồ trải phôi.');
  }, ctx.signal ? { signal: ctx.signal } : undefined);
  $('bp-svg').addEventListener('click', () => {
    if (!last) return;
    const blob = new Blob([barsSVGFile(last, exportMeta())], { type: 'image/svg+xml;charset=utf-8' });
    if (downloadBlob) downloadBlob(blob, `${fileBase()}_so_do_cat.svg`);
    ctx.showToast?.('Đã tạo sơ đồ cắt SVG.');
  }, ctx.signal ? { signal: ctx.signal } : undefined);
  /** PDF sơ đồ cắt: A3 ngang, tối đa 8 kiểu cắt mỗi trang; mỗi trang có chú giải chi tiết của trang đó, chân trang là tổng trình cắt. */
  async function barsPDF(res, meta) {
    const W = PDF_PAGE.w, H = PDF_PAGE.h, PER = 8, F = 'font-family="Arial,Helvetica,sans-serif"', chunks = [];
    for (let k = 0; k < res.groups.length; k += PER) chunks.push(res.groups.slice(k, k + PER));
    const title = `SƠ ĐỒ CẮT THÉP HÌNH ${meta.spec || ''} – CÂY ${pretty(res.input.stockL)} mm`.replace(/\s+/g, ' ');
    const sub = [meta.planLabel ? 'Phương án: ' + meta.planLabel : '', `mạch cưa ${pretty(res.input.kerf)} mm`, res.input.trim ? `cắt đầu cây ${pretty(res.input.trim)} mm` : '', `Ngày: ${meta.date}`].filter(Boolean).join(' · ');
    const pages = [];
    for (let c = 0; c < chunks.length; c++) {
      const part = { ...res, groups: chunks[c] }, leg = barsLegend(res, chunks[c]);
      const rows = Math.min(6, Math.max(1, leg.length)), legY = H - 70 - rows * 32;
      const first = res.groups.indexOf(chunks[c][0]) + 1, lastK = first + chunks[c].length - 1;
      const body = `<text x="48" y="172" font-size="24" font-weight="700" fill="#5c29bf" ${F}>${esc(`KIỂU CẮT ${first}${lastK > first ? '–' + lastK : ''} / ${res.groups.length} · ${chunks[c].reduce((s, b) => s + b.n, 0)} cây`)}</text>`
        + pdfEmbed(drawBars(part), 48, 190, W - 96, legY - 190 - 50)
        + pdfLegend(leg, 48, legY + 6, 520, 6);
      pages.push(await pdfRaster(pdfPageSVG({ title, sub, page: c + 1, pages: chunks.length, body, foot: 'Tổng: ' + barsTotals(res) })));
    }
    return pdfBytes(pages, title);
  }
  $('bp-pdf').addEventListener('click', async () => {
    if (!last) return;
    const btn = $('bp-pdf'), res = last;
    btn.disabled = true;
    try {
      const pdf = await barsPDF(res, exportMeta());
      if (downloadBlob) downloadBlob(new Blob([pdf], { type: 'application/pdf' }), `${fileBase()}_so_do_cat.pdf`);
      ctx.showToast?.('Đã tạo PDF sơ đồ cắt.');
    } catch (err) { put('bp-error', 'Không tạo được PDF: ' + err.message); }
    finally { btn.disabled = !last; }
  }, ctx.signal ? { signal: ctx.signal } : undefined);
  /* ---------------- NHẬP EXCEL (cutting-plan-import.js nạp khi cần) ---------------- */
  const sig = ctx.signal ? { signal: ctx.signal } : undefined;
  let importer = null, imp = null;
  const loadImporter = () => importer ??= import(new URL('./cutting-plan-import.js', import.meta.url).href).catch(err => {
    importer = null; console.warn('cutting-plan-import.js:', err);
    throw Error('Không nạp được bộ nhập liệu cutting-plan-import.js – đặt file này cùng thư mục với cutting-plan-section.js.');
  });
  const n4 = v => (v == null || v === '' ? '' : String(Math.round(Number(v) * 1e4) / 1e4));
  const li = (list, cls) => list.length ? `<ul class="${cls}">${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  const setInput = (name, v) => { const el = root.querySelector(`[name="${name}"]`); if (el) el.value = v; };
  function impError(msg) {
    imp = null; $('bp-imp').hidden = false;
    $('bp-imp').innerHTML = `<h4>Không nhập được file <button type="button" class="bp-export" data-imp="close">Đóng</button></h4><ul class="bad"><li>${esc(msg)}</li></ul>`;
  }
  /** Chiều dài cây: dòng Chuẩn ở 2_Kho_phoi → bảng thép hình ở 3_Thong_so_cat → giữ ô đang nhập. Chương trình hiện tính MỘT chiều dài cây. */
  const stockOf = g => { const std = g.stocks.filter(s => !s.remnant); return std.length ? { L: std[0].W, many: new Set(std.map(s => s.W)).size > 1 } : g.profile?.stockL ? { L: g.profile.stockL } : null; };
  function renderImp() {
    const { file, data } = imp, box = $('bp-imp'); box.hidden = false;
    const blocked = data.errors.length > 0;
    const groups = data.profileGroups.map((g, k) => {
      const bad = blocked || g.errors.length > 0, so = stockOf(g), rem = g.stocks.filter(s => s.remnant).length;
      const kg = g.profile?.kgPerM ? `${g.profile.kgPerM} kg/m (theo file)` : 'kg/m theo thư viện quy cách';
      return `<div class="bp-imp-g${bad ? ' is-bad' : ''}"><span><b>${esc(g.label)}</b><small>${g.rows.length} loại · ${g.pieces.toLocaleString('vi-VN')} chiếc · ${kg} · cây ${so ? pretty(so.L) + ' mm' : 'theo ô đang nhập'}</small>
        ${so?.many ? '<small class="warn">Kho có nhiều chiều dài cây chuẩn – chương trình hiện tính một chiều dài, dùng dòng đầu.</small>' : ''}
        ${rem ? `<small class="warn">${rem} dòng cây lẻ trong kho: chương trình thép hình chưa tận dụng cây lẻ – bỏ qua.</small>` : ''}${li(g.errors.slice(0, 12), 'bad')}${g.errors.length > 12 ? `<small class="bad">… còn ${g.errors.length - 12} lỗi</small>` : ''}</span>
        <button type="button" class="bp-export" data-imp-group="${k}"${bad ? ' disabled' : ''}>Nạp trình cắt này</button></div>`;
    }).join('');
    const plates = data.plateGroups.length ? `<p>${data.plateGroups.length} trình cắt tôn tấm (${data.plateGroups.reduce((s, g) => s + g.rows.length, 0)} dòng) – nạp bằng công cụ Cutting plan tôn tấm.</p>` : '';
    box.innerHTML = `<h4>Excel: ${esc(file)} <button type="button" class="bp-export" data-imp="close">Đóng</button></h4>
      ${blocked ? '<p class="bad">Sửa các lỗi dưới đây trong file rồi nhập lại – chưa nạp được trình cắt nào.</p>' : ''}${li(data.errors, 'bad')}${li(data.warnings, 'warn')}
      ${data.profileGroups.length ? `<p>${data.profileGroups.length} trình cắt thép hình (nhóm theo Quy cách + Mác). Nạp sẽ THAY quy cách, chiều dài cây và danh sách chi tiết hiện tại.</p>` : '<p>File không có dòng thép hình.</p>'}
      ${groups}${plates}${imp.applied ? `<p class="ok">✓ ${esc(imp.applied.title)}</p>${li(imp.applied.notes, 'ok')}` : ''}`;
  }
  function applyGroup(k) {
    const { data } = imp, g = data.profileGroups[k], P = data.params;
    if (!g || data.errors.length || g.errors.length) return;
    collect();
    const notes = [];
    st.spec = g.spec;
    if (g.profile?.kgPerM) { st.manualKg = true; st.kgPerM = n4(g.profile.kgPerM); notes.push(`Khối lượng ${st.kgPerM} kg/m theo file`); }
    else st.manualKg = false;
    const so = stockOf(g);
    if (so) { if (String(st.stockL) !== n4(so.L)) notes.push(`Dài cây: ${st.stockL} → ${n4(so.L)} mm (theo file)`); st.stockL = n4(so.L); }
    const setP = (key, pKey, label) => { if (P[pKey] == null) return; const old = st[key]; st[key] = n4(P[pKey]); if (String(old) !== st[key]) notes.push(`${label}: ${old} → ${st[key]} mm (theo file)`); };
    setP('kerf', 'sawKerf', 'Mạch cưa'); setP('trim', 'sawTrim', 'Cắt bỏ đầu cây'); setP('remnantMin', 'barRemnantMin', 'Ngưỡng cây lẻ');
    st.parts = g.rows.map(r => ({ name: r.code, length: n4(r.length), allowance: r.allowance == null ? n4(P.allowBar ?? 0) : n4(r.allowance), qty: String(r.qty), splice: r.splice !== false }));
    renderParts();
    for (const key of ['spec', 'stockL', 'kerf', 'trim', 'remnantMin']) setInput(key, st[key]);
    weightEdit.checked = st.manualKg; if (st.manualKg) weightInput.value = st.kgPerM;
    updateReferenceWeight(); collect();
    if (!st.manualKg && !String(st.kgPerM).trim()) notes.push(`Quy cách "${g.spec}" chưa có trong thư viện – bổ sung kg/m ở sheet 3_Thong_so_cat hoặc tích "Chỉnh KL/m dài".`);
    imp.applied = { title: `Đã nạp ${g.label}: ${g.rows.length} loại, ${g.pieces.toLocaleString('vi-VN')} chiếc. Kết quả tính lại ở khung bên phải.`, notes };
    renderImp(); schedule();
  }
  $('bp-guide-btn')?.addEventListener('click', () => {
    const b = $('bp-guide-btn'), open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(open)); $('bp-guide').hidden = !open;
  }, sig);
  $('bp-imp-xlsx').addEventListener('click', () => { $('bp-file-xlsx').value = ''; $('bp-file-xlsx').click(); }, sig);
  $('bp-file-xlsx').addEventListener('change', async e => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const M = await loadImporter();
      const book = await M.readXlsx(await M.readFileBytes(file, M.LIMITS.xlsxBytes));
      imp = { file: file.name, data: M.parseCuttingPlanBook(book), applied: null };
      renderImp();
    } catch (err) { impError(err?.message || 'Không đọc được file.'); }
  }, sig);
  $('bp-imp').addEventListener('click', e => {
    const b = e.target.closest('[data-imp],[data-imp-group]'); if (!b) return;
    if (b.dataset.imp === 'close') { imp = null; $('bp-imp').hidden = true; $('bp-imp').innerHTML = ''; return; }
    if (b.dataset.impGroup != null && imp) applyGroup(Number(b.dataset.impGroup));
  }, sig);
  updateReferenceWeight();
  compute();
  void initProfiles();
  return () => {disposed=true;clearTimeout(timer);worker?.terminate();worker=null;};
}
