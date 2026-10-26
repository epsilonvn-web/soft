/**
 * Epsilon Soft - THÉP HÌNH PRO-MAX – Cắt thép hình 1D + ĐỀ XUẤT NỐI CỘT (Web) – BẢN TEST NỘI BỘ
 * Tên file: thep_hinh_pro_max.js. Kế thừa bản PRO, thêm 3 phương án: không nối / nối ít / nối nhiều.
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
 * Bản quyền © Epsilon Lab.
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
/* Quy tắc (đã chốt với anh):                                                */
/*  - Cột nối = đoạn dưới A (hàn mặt bích) + đoạn trên B ngắn; A + B = dài TP.*/
/*  - A lấy từ ĐOẠN THỪA hay gặp khi cắt cột nguyên, làm tròn XUỐNG theo bước */
/*    (mặc định 5 mm); B = dài cột − A.                                       */
/*  - B ≤ 10% dài cột là lý tưởng – chỉ cảnh báo, vẫn cho phép vượt.          */
/*  - 3 phương án: KHÔNG NỐI · NỐI ÍT (bớt 1 cây, ít mối nối nhất)            */
/*    · NỐI NHIỀU (ít cây nhất, ít mối nối nhất cho mức đó).                  */
/*    Mỗi phương án phải ít hơn phương án trước ít nhất 1 cây.               */
/* ========================================================================= */
const SEARCH_RATIO = 0.3;            // tìm đoạn B tới 30% dài cột (trên 10% chỉ cảnh báo)
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
  const better = (x, y) => !y || x.n < y.n || (x.n === y.n && ((x.over - y.over) || (x.res.wastePercent - y.res.wastePercent)) < 0);
  const pack = (spec, res) => ({ spec, res, n: spec.reduce((s, x) => s + x.n, 0), over: spec.some(x => x.B / input.parts[x.idx].length > ideal + 1e-9) ? 1 : 0 });

  const cands = spliceCandidates(input, base, step);
  // Cận dưới khi nối tùy ý: nối chỉ làm tăng mạch cưa, nên không thể ít hơn số này
  const C = input.stockL - input.trim + input.kerf;
  const floorBars = Math.ceil(input.parts.reduce((s, p) => s + p.qty * (p.length + p.allowance + input.kerf), 0) / C - 1e-9);
  /** Ít mối nối nhất để còn ≤ T cây.
   *  Ưu tiên nối MỘT loại cột (anh chốt: hạn chế nối từ 2 loại trở lên); chỉ khi không
   *  loại cột nào tự đạt được mức T thì mới thử phối hợp hai loại cột. */
  function minSplices(T) {
    if (T < floorBars) return null;
    let best = null;
    for (const c of cands) {
      if (busy()) break;
      const q = input.parts[c.idx].qty;
      const at = n => evalSpec([{ idx: c.idx, A: c.A, B: c.B, n }]);
      // chỉ tìm số mối nối ít hơn phương án đang có (bằng thì chỉ khi phương án cũ vượt 10%)
      const limit = best ? Math.min(q, best.over && !(c.ratio > ideal) ? best.n : best.n - 1) : q;
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
    if (best) return best;
    // một loại cột không đủ -> thử phối hợp hai loại cột
    const top = cands.slice(0, 24);
    for (let a = 0; a < top.length && !busy(); a++) for (let b = a + 1; b < top.length && !busy(); b++) {
      const x = top[a], y = top[b];
      if (x.idx === y.idx) continue;
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
  if (cands.length) {
    const few = minSplices(base.totalBars - 1);
    if (few) {
      plans.push({ key: 'few', label: 'Nối ít', spec: few.spec, splices: few.n, result: few.res });
      let many = few;
      while (!busy()) {
        const next = minSplices(many.res.totalBars - 1);
        if (!next) break;
        many = next;
      }
      if (many !== few) plans.push({ key: 'many', label: 'Nối nhiều', spec: many.spec, splices: many.n, result: many.res });
    }
  }
  plans.forEach(p => p.spec.forEach(s => { s.L = input.parts[s.idx].length; s.name = input.parts[s.idx].name; s.ratio = 100 * s.B / s.L; }));
  return { plans, searchComplete: !busy(), evals, ms: Date.now() - t0 };
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
      if (w > 120 && nm) g += `<text x="${cx}" y="${y + rowH / 2 - 3}" text-anchor="middle" font-size="12" font-weight="700" fill="#1d1652" font-family="Arial,sans-serif">${nm}</text><text x="${cx}" y="${y + rowH / 2 + 13}" text-anchor="middle" font-size="13" fill="#1d1652" font-family="Arial,sans-serif">${pretty(res.cutL[t])}</text>`;
      else if (w > 46) g += `<text x="${cx}" y="${y + rowH / 2 + 5}" text-anchor="middle" font-size="14" fill="#1d1652" font-family="Arial,sans-serif">${pretty(res.cutL[t])}</text>`;
      x += res.cutL[t] + res.input.kerf;
    }
    if (b.leftover > 0) {
      const lx = x0 + (L - b.leftover) * sc, w = b.leftover * sc;
      g += `<rect x="${lx.toFixed(2)}" y="${y}" width="${w.toFixed(2)}" height="${rowH}" fill="${b.recovered ? '#e3f8eb' : '#eeeeee'}" stroke="${b.recovered ? '#169a70' : '#9a9a9a'}" stroke-width="1"/>`;
      if (w > 60) g += `<text x="${(lx + w / 2).toFixed(2)}" y="${y + rowH / 2 + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="${b.recovered ? '#147451' : '#6b6b6b'}" font-family="Arial,sans-serif">${b.recovered ? 'CÂY LẺ ' : 'DƯ '}${pretty(b.leftover)}</text>`;
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Epsilon Soft Thép hình PRO-MAX – sơ đồ cắt ${res.totalBars} cây thép">${'<rect width="' + W + '" height="' + H + '" fill="#faf7ff"/>' + g}</svg>`;
  return svg;
}

const CSS = `
.bar-pro{font-size:16px;color:#191c69;min-width:0}.bar-pro *{box-sizing:border-box}
.bar-pro .bp-sub{font-size:16px;color:#706d99;margin:0 0 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.bar-pro .bp-pro{display:inline-block;background:linear-gradient(115deg,#a943f7,#7930e8);color:#fff;font-weight:900;font-size:14px;letter-spacing:.08em;border-radius:7px;padding:2px 9px}
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
/* Danh sách chi tiết gắn với phương án cắt mới nhất. */
.bar-pro .bp-cut-list{margin-top:17px;border:1px solid #e6dafa;border-radius:12px;background:#fff;overflow:hidden}
.bar-pro .bp-cut-list[hidden]{display:none}
.bar-pro .bp-cut-title{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;background:#f8f5ff;color:#5a2bb8;font-size:17px;font-weight:800}
.bar-pro .bp-cut-title small{font-size:15px;color:#655587;font-weight:700}
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
.bar-pro .bp-note{font-size:15px;color:#6a6691;text-align:center;margin:7px 0 0}
.bar-pro .bp-parts-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:4px 0 6px}
.bar-pro .bp-parts-head strong{font-size:18px;color:#5c29bf;font-weight:850}
.bar-pro .bp-parts-head small{font-size:15px;color:#6a598b;font-weight:700}
.bar-pro .bp-parts{max-height:520px;overflow:auto;padding-right:4px}
.bar-pro .bp-part h3{justify-content:space-between}
.bar-pro .bp-part h3 span.bp-ptitle{display:inline-flex;align-items:center;gap:8px}
.bar-pro .bp-del{background:#fff5f6;border:1px solid #f0b7c1;color:#b52441;border-radius:8px;padding:2px 9px;font-size:15px;font-weight:700;cursor:pointer}
.bar-pro .bp-del:hover{background:#ffe9ec}
.bar-pro .bp-add{width:100%;margin:4px 0 2px;min-height:40px;border:2px dashed #b59efc;border-radius:11px;background:#faf7ff;color:#632dd6;font-size:16px;font-weight:800;cursor:pointer}
.bar-pro .bp-add:hover{background:#f1ebfd}
.bar-pro .bp-busy{display:inline-block;width:15px;height:15px;border-radius:50%;border:2px solid #d1bef5;border-top-color:#662be8;animation:bp-spin .7s linear infinite;vertical-align:middle;margin-left:6px}
@keyframes bp-spin{to{transform:rotate(360deg)}}
.bar-pro .bp-sptg{display:inline-flex;align-items:center;gap:6px;font-size:15px;font-weight:700;color:#0f6e56;margin-left:auto;margin-right:10px;cursor:pointer}
.bar-pro .bp-sptg input{width:17px;height:17px;min-height:17px;accent-color:#0f6e56}
.bar-pro .bp-plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:10px}
.bar-pro .bp-plan{border:1.5px solid #e1d5f9;border-radius:13px;background:#fff;padding:9px 12px;text-align:left;cursor:pointer;color:#29234f}
.bar-pro .bp-plan:hover{border-color:#b59efc}
.bar-pro .bp-plan.is-active{border-color:#7930e8;background:#f6f0ff;box-shadow:0 0 0 3px #7542ff1c}
.bar-pro .bp-plan b{display:block;font-size:16px;color:#5c29bf;font-weight:850}
.bar-pro .bp-plan big{display:block;font-size:22px;font-weight:850;margin:2px 0}
.bar-pro .bp-plan small{display:block;font-size:14.5px;color:#655587;line-height:1.35}
.bar-pro .bp-plan .bp-save{color:#0f6e56;font-weight:800}
.bar-pro .bp-splice{border:1px solid #e6dafa;border-radius:12px;background:#fff;margin-bottom:10px;overflow:hidden}
.bar-pro .bp-splice[hidden]{display:none}
.bar-pro .bp-sp-head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 12px;background:#f8f5ff;color:#5a2bb8;font-weight:800;font-size:16px;flex-wrap:wrap}
.bar-pro .bp-sp-head button{background:#fff;border:1px solid #b59efc;border-radius:8px;color:#632dd6;font-weight:700;font-size:14.5px;padding:3px 10px;cursor:pointer}
.bar-pro .bp-sp-table{width:100%;border-collapse:collapse;font-size:15.5px}
.bar-pro .bp-sp-table th{color:#695494;font-weight:750;text-align:left;padding:7px 10px;border-bottom:1px solid #eee6fa;white-space:nowrap}
.bar-pro .bp-sp-table td{padding:6px 10px;border-bottom:1px solid #f3eefb;vertical-align:middle}
.bar-pro .bp-sp-table input{min-height:34px;font-size:16px;padding:4px 7px;max-width:110px}
.bar-pro .bp-pct{font-weight:800;white-space:nowrap}.bar-pro .bp-pct.ok{color:#0f6e56}.bar-pro .bp-pct.over{color:#b06a12}
.bar-pro .bp-pct small{display:block;font-weight:600;font-size:13px}
.bar-pro .bp-sp-note{font-size:14.5px;color:#6a598b;padding:7px 12px}
.bar-pro .bp-sp-warn{font-size:15px;color:#a3500a;background:#fff7ea;border-top:1px solid #f6d9a8;padding:8px 12px;margin:0;font-weight:700}
.bar-pro .bp-sp-warn:empty{display:none}
.bar-pro .bp-sp-table input.is-bad{border:2px solid #e0902a;background:#fff9ef}
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
  let lastInput = null, plans = [], current = null, spTimer = null;
  let steelProfiles = [], profilesReady = false, profilesFailed = false;
  let profilesByCode = new Map();
  const fld = (name, label, val, cls = '') =>
    `<label class="${cls}"><span>${esc(label)}</span><input name="${name}" value="${esc(val)}" inputmode="decimal" autocomplete="off"></label>`;
  root.innerHTML = `<style>${CSS}</style><div class="bar-pro">
  <p class="bp-sub"><span class="bp-pro">PRO-MAX</span> Cắt thép hình 1D · Không giới hạn chi tiết · Đề xuất nối cột · Tối ưu số cây</p>
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
    <div class="bp-row three">${fld('spIdeal', 'Đoạn nối B lý tưởng ≤ (%)', st.spIdeal ?? '10')}${fld('spStep', 'Làm tròn đoạn nối (mm)', st.spStep ?? '5')}</div>
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
    <div class="bp-caption"><p class="bp-strategy" id="bp-strategy">—</p><span><button class="bp-export" type="button" id="bp-csv" disabled>↓ Bảng cắt CSV</button> <button class="bp-export" type="button" id="bp-export" disabled>↓ Tải sơ đồ SVG</button></span></div>
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
    for (const k of ['spec', 'kgPerM', 'stockL', 'kerf', 'trim', 'remnantMin', 'spIdeal', 'spStep']) st[k] = val(k);
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
    last = null; lastSVG = ''; $('bp-figure').textContent = ''; $('bp-export').disabled = true; $('bp-csv').disabled = true; $('bp-cut-list').hidden = true; $('bp-cut-body').replaceChildren(); $('bp-plans').innerHTML = ''; $('bp-splice').hidden = true; plans = []; current = null;
    put('bp-error', msg); for (const id of ['bp-summary', 'bp-proof', 'bp-strategy', 'bp-issued', 'bp-finished', 'bp-waste', 'bp-remnant']) put(id, '—');
    put('bp-proof', '');
  }
  function present(res, plan = current) {
    last = res;
    const svg = drawBars(res);
    $('bp-figure').innerHTML = svg; lastSVG = svg; $('bp-export').disabled = false; $('bp-csv').disabled = false;
    put('bp-head', `SƠ ĐỒ CẮT ${st.spec || ''} – CÂY ${pretty(res.input.stockL)} mm`);
    put('bp-summary', `${res.totalBars} cây ${pretty(res.input.stockL / 1000)} m` + (plan ? ` · ${plan.label}${plan.splices ? ` – ${plan.splices} mối nối` : ''}` : ''));
    put('bp-proof', res.proven ? '✓ Số cây tối thiểu – đã chứng minh'
      : `Cận dưới ${res.lowerBound} cây · phương án hơn cận dưới ${res.gap} cây`);
    put('bp-strategy', `${res.groups.length} kiểu cắt · phần dư dồn về cây cuối` + (plan?.splices ? ' · đoạn B nét đứt = đoạn nối đầu cột' : '') +
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
  function renderPlans() {
    const base = plans[0]?.result;
    $('bp-plans').innerHTML = plans.map(p => {
      const r = p.result, save = base ? base.totalBars - r.totalBars : 0;
      const sub = p.key === 'none' ? 'Cắt nguyên, không mối hàn'
        : `${p.splices} mối nối${p.spec.length > 1 ? ` (${p.spec.length} loại cột)` : ` – cột ${esc(p.spec[0]?.name || '')}`} · <span class="bp-save">bớt ${save} cây</span>`;
      return `<button type="button" class="bp-plan${current?.key === p.key ? ' is-active' : ''}" data-plan="${p.key}">
        <b>${p.label}</b><big>${r.totalBars} cây</big><small>${sub}</small>
        <small>Hao phí ${r.wastePercent.toFixed(2)} %${r.recovered.length ? ` · ${r.recovered.length} cây lẻ` : ''}</small></button>`;
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
      lastInput = input; plans = res.plans;
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
    const p = plans.find(x => x.key === current?.key);
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
  $('bp-csv').addEventListener('click', () => {
    if (!last) return;
    const q = v => `"${String(v).replaceAll('"', '""')}"`;
    const rows = [['Kiểu cắt', 'Số cây', 'Các đoạn cắt (tên × dài cắt mm)', 'Phần dư (mm)', 'Thu hồi'].map(q).join(',')];
    last.groups.forEach((g, i) => {
      const cnt = new Map(); g.pieces.forEach(k => cnt.set(k, (cnt.get(k) || 0) + 1));
      const list = [...cnt].map(([k, n]) => `${last.parts[k].name} × ${last.cutL[k]}${n > 1 ? ` (${n} đoạn)` : ''}`).join(' + ');
      rows.push([i + 1, g.n, list, g.leftover, g.recovered ? 'Cây lẻ' : 'Phế liệu'].map(q).join(','));
    });
    if (current?.splices) {
      rows.push('');
      rows.push(['Phương án', 'Cột', 'Dài TP (mm)', 'Đoạn dưới A (mm)', 'Đoạn trên B (mm)', 'B / dài cột (%)', 'Số cột nối'].map(q).join(','));
      current.spec.forEach(s => rows.push([current.label, s.name, s.L, s.A, s.B, (100 * s.B / s.L).toFixed(1), s.n].map(q).join(',')));
    }
    rows.push('');
    rows.push([q('Tổng số cây'), last.totalBars].join(','));
    rows.push([q('Hao phí / TP (%)'), last.wastePercent.toFixed(2)].join(','));
    const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    if (downloadBlob) downloadBlob(blob, 'epsilon-soft-bang-cat-thep-hinh-pro-max.csv');
    ctx.showToast?.('Đã tạo bảng cắt CSV.');
  }, ctx.signal ? { signal: ctx.signal } : undefined);
  $('bp-export').addEventListener('click', () => {
    if (!lastSVG) return;
    const blob = new Blob([lastSVG], { type: 'image/svg+xml;charset=utf-8' });
    if (downloadBlob) downloadBlob(blob, 'epsilon-soft-cat-thep-hinh-pro-max.svg');
    ctx.showToast?.('Đã tạo sơ đồ SVG.');
  }, ctx.signal ? { signal: ctx.signal } : undefined);
  updateReferenceWeight();
  compute();
  void initProfiles();
  return () => {disposed=true;clearTimeout(timer);worker?.terminate();worker=null;};
}
