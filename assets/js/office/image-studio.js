/**
 * Epsilon Soft – Image Studio.
 * Nén, đổi định dạng, đổi kích thước hàng loạt; cắt, xoay, làm thẳng; tách nền chữ ký / con dấu.
 * Everything runs in the browser with Canvas; no library and no upload.
 * Contract: export async function mount(root, ctx) → cleanup().
 */
const shared = globalThis.EpsilonSoftShared || {};
const ic = (name, size) => { try { return shared.icon ? shared.icon(name, size) : ''; } catch { return ''; } };

const MAX_FILES = 100;
const MAX_FILE_BYTES = 40 * 1024 * 1024;
const MAX_PIXELS = 50e6;          // decoded pixels per image
const MAX_EDGE = 12000;           // canvas edge safety
const SIGN_EDGE = 2400;           // working resolution for signature extraction

/* ----------------------------------------------------------- helpers ---- */
export const humanBytes = b => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} KB` : `${(b / 1048576).toFixed(1)} MB`;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const baseName = n => String(n || 'anh').replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 90) || 'anh';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(bytes) { let c = 0xffffffff; for (const x of bytes) c = CRC_TABLE[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
/** Minimal STORE zip writer (images are already compressed). */
export function makeZip(files) {
  const enc = new TextEncoder(), chunks = [], central = []; let offset = 0;
  const used = new Set();
  for (const f of files) {
    let name = String(f.name).replace(/[\\/]/g, '_'), n = 1;
    while (used.has(name.toLowerCase())) name = String(f.name).replace(/(\.[^.]+)?$/, m => `-${++n}${m}`);
    used.add(name.toLowerCase());
    const path = enc.encode(name), data = f.data, crc = crc32(data);
    const local = new Uint8Array(30 + path.length), v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint32(14, crc, true);
    v.setUint32(18, data.length, true); v.setUint32(22, data.length, true); v.setUint16(26, path.length, true); local.set(path, 30);
    const entry = new Uint8Array(46 + path.length), q = new DataView(entry.buffer);
    q.setUint32(0, 0x02014b50, true); q.setUint16(4, 20, true); q.setUint16(6, 20, true); q.setUint16(8, 0x0800, true); q.setUint32(16, crc, true);
    q.setUint32(20, data.length, true); q.setUint32(24, data.length, true); q.setUint16(28, path.length, true); q.setUint32(42, offset, true); entry.set(path, 46);
    chunks.push(local, data); central.push(entry); offset += local.length + data.length;
  }
  const size = central.reduce((s, e) => s + e.length, 0), end = new Uint8Array(22), v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true); v.setUint16(8, files.length, true); v.setUint16(10, files.length, true); v.setUint32(12, size, true); v.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, end], { type: 'application/zip' });
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c;
}
// Always fetch the 2D context the same way, so repeat getContext calls never return null on attribute mismatch.
const ctx2d = c => c.getContext('2d');
const canvasBlob = (c, type, q) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Trình duyệt không tạo được ảnh (có thể ảnh quá lớn).')), type, q));
const isHeic = f => /\.(heic|heif)$/i.test(f.name) || /image\/hei[cf]/i.test(f.type);

async function decode(file) {
  if (file.size > MAX_FILE_BYTES) throw new Error(`Ảnh vượt quá ${humanBytes(MAX_FILE_BYTES)}.`);
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    if (isHeic(file)) throw new Error('Trình duyệt này chưa đọc được ảnh HEIC của iPhone. Hãy mở bằng Safari, hoặc trên iPhone chọn Cài đặt → Camera → Định dạng → "Tương thích nhất".');
    throw new Error('Không đọc được ảnh. Định dạng hỗ trợ: JPG, PNG, WebP, GIF, BMP, AVIF.');
  }
  if (bmp.width * bmp.height > MAX_PIXELS) {
    const s = Math.sqrt(MAX_PIXELS / (bmp.width * bmp.height)), w = Math.floor(bmp.width * s), h = Math.floor(bmp.height * s);
    bmp.close(); bmp = await createImageBitmap(file, { imageOrientation: 'from-image', resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
  }
  return bmp;
}

/** Full-resolution canvas after 90° rotation, flips and fine straightening. */
function renderBase(item) {
  const { bmp } = item, quarter = ((item.rot % 360) + 360) % 360, side = quarter % 180 !== 0;
  const w0 = side ? bmp.height : bmp.width, h0 = side ? bmp.width : bmp.height;
  const rad = (item.angle || 0) * Math.PI / 180, cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
  const W = Math.ceil(w0 * cos + h0 * sin), H = Math.ceil(w0 * sin + h0 * cos);
  const c = makeCanvas(W, H), g = c.getContext('2d');
  if (item.angle) { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }
  g.imageSmoothingQuality = 'high';
  g.translate(W / 2, H / 2); g.rotate(rad + quarter * Math.PI / 180); g.scale(item.flipH ? -1 : 1, item.flipV ? -1 : 1);
  g.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
  return c;
}
function cropTo(src, r) {
  if (!r) return src;
  const x = clamp(Math.round(r.x), 0, src.width - 1), y = clamp(Math.round(r.y), 0, src.height - 1);
  const w = clamp(Math.round(r.w), 1, src.width - x), h = clamp(Math.round(r.h), 1, src.height - y);
  const c = makeCanvas(w, h); c.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h); return c;
}
/** Good-quality downscale: halve repeatedly, then one final smooth draw. */
function resizeTo(src, w, h) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  if (w === src.width && h === src.height) return src;
  let cur = src;
  while (cur.width / 2 >= w && cur.height / 2 >= h) {
    const n = makeCanvas(cur.width / 2, cur.height / 2), g = n.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, n.width, n.height); cur = n;
  }
  const out = makeCanvas(w, h), g = out.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, w, h); return out;
}
export function targetSize(w, h, s) {
  let tw = w, th = h;
  if (s.resize === 'edge' && s.edge > 0) { const k = Math.min(1, s.edge / Math.max(w, h)); tw = w * k; th = h * k; }
  else if (s.resize === 'percent' && s.percent > 0) { tw = w * s.percent / 100; th = h * s.percent / 100; }
  else if (s.resize === 'exact' && s.ew > 0 && s.eh > 0) { tw = s.ew; th = s.eh; }
  const k = Math.min(1, MAX_EDGE / Math.max(tw, th));
  return [Math.max(1, Math.round(tw * k)), Math.max(1, Math.round(th * k))];
}
/** "exact" size keeps proportions by centre-cropping to the requested ratio first. */
function coverCrop(src, w, h) {
  const r = w / h, sr = src.width / src.height;
  if (Math.abs(r - sr) < 1e-3) return src;
  return sr > r ? cropTo(src, { x: (src.width - src.height * r) / 2, y: 0, w: src.height * r, h: src.height })
    : cropTo(src, { x: 0, y: (src.height - src.width / r) / 2, w: src.width, h: src.width / r });
}
function placeByPos(cw, ch, w, h, pos, pad) {
  let x = cw - w - pad, y = ch - h - pad;
  if (pos === 'bl') x = pad; else if (pos === 'tl') { x = pad; y = pad; } else if (pos === 'tr') y = pad;
  else if (pos === 'center') { x = (cw - w) / 2; y = (ch - h) / 2; }
  return { x, y };
}
function addBorder(c, s) {
  const bw = Math.max(0, Math.round(Math.min(c.width, c.height) * (s.borderPct || 0) / 100)); if (!bw && !s.borderRadius) return c;
  const W = c.width + bw * 2, H = c.height + bw * 2, out = makeCanvas(W, H), g = out.getContext('2d');
  g.fillStyle = s.borderColor || '#ffffff'; g.fillRect(0, 0, W, H);
  if (s.borderRadius) { const r = Math.round(Math.min(c.width, c.height) * s.borderRadius / 100), x = bw, y = bw, w = c.width, h = c.height; g.save(); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.clip(); }
  g.drawImage(c, bw, bw); if (s.borderRadius) g.restore(); return out;
}
/** In-place brightness (−100..100), contrast (−100..100), saturation (0..200%). */
function adjustColors(c, s) {
  const b = (s.brightness || 0), ct = (s.contrast || 0), sat = (s.saturation ?? 100) / 100;
  if (!b && !ct && sat === 1) return c;
  const g = ctx2d(c), img = g.getImageData(0, 0, c.width, c.height), px = img.data;
  const cf = (259 * (ct + 255)) / (255 * (259 - ct)); // standard contrast factor
  for (let i = 0; i < px.length; i += 4) {
    for (let k = 0; k < 3; k++) { let v = px[i + k] + b; v = cf * (v - 128) + 128; px[i + k] = v < 0 ? 0 : v > 255 ? 255 : v; }
    if (sat !== 1) { const gray = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114; for (let k = 0; k < 3; k++) px[i + k] = clamp(gray + (px[i + k] - gray) * sat, 0, 255); }
  }
  g.putImageData(img, 0, 0); return c;
}
/** Unsharp-like sharpen via a 3x3 convolution, amount 0..100. */
function sharpen(c, amount) {
  if (!amount) return c;
  const a = amount / 100, g = ctx2d(c), W = c.width, H = c.height, src = g.getImageData(0, 0, W, H), out = g.createImageData(W, H), s2 = src.data, d = out.data;
  const center = 1 + 4 * a, side = -a;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    for (let k = 0; k < 3; k++) {
      const up = y > 0 ? s2[i - W * 4 + k] : s2[i + k], dn = y < H - 1 ? s2[i + W * 4 + k] : s2[i + k], lf = x > 0 ? s2[i - 4 + k] : s2[i + k], rt = x < W - 1 ? s2[i + 4 + k] : s2[i + k];
      d[i + k] = clamp(center * s2[i + k] + side * (up + dn + lf + rt), 0, 255);
    }
    d[i + 3] = s2[i + 3];
  }
  g.putImageData(out, 0, 0); return c;
}
/** Black-out or blur rectangular regions (fractions of the canvas): hide CCCD, plates, faces... */
function maskRegions(c, regions, mode) {
  if (!regions?.length) return c;
  const g = ctx2d(c), W = c.width, H = c.height;
  for (const r of regions) {
    const x = clamp(Math.round(r.x * W), 0, W - 1), y = clamp(Math.round(r.y * H), 0, H - 1), w = clamp(Math.round(r.w * W), 1, W - x), h = clamp(Math.round(r.h * H), 1, H - y);
    if (mode === 'blur') {
      const tiny = makeCanvas(Math.max(1, Math.round(w / 18)), Math.max(1, Math.round(h / 18)));
      tiny.getContext('2d').drawImage(c, x, y, w, h, 0, 0, tiny.width, tiny.height);
      const up = makeCanvas(w, h), ug = up.getContext('2d'); ug.imageSmoothingEnabled = false; ug.drawImage(tiny, 0, 0, tiny.width, tiny.height, 0, 0, w, h);
      g.drawImage(up, x, y);
    } else {
      // Write black pixels directly (fillRect can be a no-op on some reused canvases).
      const blk = new ImageData(w, h); const d = blk.data; for (let i = 0; i < d.length; i += 4) { d[i + 3] = 255; } g.putImageData(blk, x, y);
    }
  }
  return c;
}
function stamp(c, s) {
  if (s.wmLogo) {
    const g = c.getContext('2d'), w = Math.round(Math.min(c.width, c.height) * (s.wmLogoSize || 18) / 100), h = w * s.wmLogo.height / s.wmLogo.width;
    const pad = Math.round(Math.min(c.width, c.height) * 0.03), { x, y } = placeByPos(c.width, c.height, w, h, s.wmLogoPos || 'br', pad);
    g.save(); g.globalAlpha = s.wmLogoOpacity ?? 0.9; g.imageSmoothingQuality = 'high'; g.drawImage(s.wmLogo, x, y, w, h); g.restore();
  }
  const text = (s.wmText || '').trim(); if (!text) return c;
  const g = c.getContext('2d'), size = Math.max(12, Math.round(Math.min(c.width, c.height) * (s.wmSize || 4) / 100));
  g.save(); g.font = `700 ${size}px system-ui, "Segoe UI", Arial, sans-serif`; g.globalAlpha = s.wmOpacity ?? 0.55;
  const m = g.measureText(text), pad = size * 0.7, tw = m.width;
  let x = c.width - tw - pad, y = c.height - pad;
  if (s.wmPos === 'bl') x = pad; else if (s.wmPos === 'tl') { x = pad; y = pad + size; } else if (s.wmPos === 'tr') y = pad + size;
  else if (s.wmPos === 'center') { x = (c.width - tw) / 2; y = (c.height + size * .7) / 2; }
  g.lineWidth = Math.max(2, size / 9); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineJoin = 'round'; g.strokeText(text, x, y);
  g.fillStyle = '#fff'; g.fillText(text, x, y); g.restore(); return c;
}
function flatten(c) {
  const out = makeCanvas(c.width, c.height), g = out.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(c, 0, 0); return out;
}
function outType(item, s) {
  if (s.format !== 'keep') return s.format;
  const t = item.file.type;
  return t === 'image/png' || t === 'image/gif' ? 'image/png' : t === 'image/webp' ? 'image/webp' : 'image/jpeg';
}

/** Process one image with the batch settings. Returns { blob, w, h, type, note }. */
export async function processItem(item, s) {
  let c = cropTo(renderBase(item), item.crop);
  let [w, h] = targetSize(c.width, c.height, s);
  c = s.resize === 'exact' ? resizeTo(coverCrop(c, w, h), w, h) : resizeTo(c, w, h);
  adjustColors(c, s); sharpen(c, s.sharpen || 0); maskRegions(c, item.masks, s.maskMode || 'black');
  c = addBorder(c, s); stamp(c, s);
  let type = outType(item, s);
  if (type === 'image/jpeg') c = flatten(c);
  const q = clamp(s.quality / 100, 0.3, 1);
  let blob = await canvasBlob(c, type, q), note = '';
  if (blob.type !== type) { note = 'Trình duyệt không hỗ trợ ' + EXT[type]?.toUpperCase() + ', đã lưu PNG.'; type = blob.type; }
  const target = s.targetKB > 0 ? s.targetKB * 1024 : 0;
  if (target && blob.size > target) {
    if (type === 'image/png') { c = flatten(c); type = 'image/jpeg'; note = 'Đổi sang JPG để đạt dung lượng.'; blob = await canvasBlob(c, type, q); }
    let cur = c, best = blob, lo = 0.35, hi = q;
    for (let round = 0; round < 8 && best.size > target; round++) {
      // Binary-search the quality, then shrink dimensions if quality alone is not enough.
      let found = null;
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2, b = await canvasBlob(cur, type, mid);
        if (b.size <= target) { found = b; lo = mid; } else hi = mid;
      }
      if (found) { best = found; break; }
      const low = await canvasBlob(cur, type, 0.35);
      if (low.size <= target) { best = low; break; }
      if (Math.max(cur.width, cur.height) < 320) { best = low; note = 'Chưa đạt dung lượng mục tiêu dù đã nén tối đa.'; break; }
      const k = Math.max(0.5, Math.sqrt(target / low.size) * 0.95);
      cur = resizeTo(cur, cur.width * k, cur.height * k); lo = 0.35; hi = q; best = low;
      note = 'Đã giảm kích thước để đạt dung lượng.';
    }
    if (best.size <= target && note === '') note = 'Đạt dung lượng mục tiêu.';
    blob = best; w = cur.width; h = cur.height;
    return { blob, w, h, type, note };
  }
  return { blob, w: c.width, h: c.height, type, note };
}

/* ---------------------------------------------------------------- montage --- */
/** Combine canvases into one. mode: 'h' row, 'v' column, 'grid' with `cols` columns. */
export function montage(canvases, { mode = 'h', cols = 2, gap = 10, bg = '#ffffff', cell = 600 } = {}) {
  if (!canvases.length) throw new Error('Chưa có ảnh để ghép.');
  const ncols = mode === 'h' ? canvases.length : mode === 'v' ? 1 : Math.max(1, cols), nrows = Math.ceil(canvases.length / ncols), cw = cell, ch = cell;
  const W = ncols * cw + (ncols + 1) * gap, H = nrows * ch + (nrows + 1) * gap, out = makeCanvas(W, H), g = out.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, W, H); g.imageSmoothingQuality = 'high';
  canvases.forEach((src, i) => {
    const r = Math.floor(i / ncols), col = i % ncols, bx = gap + col * (cw + gap), by = gap + r * (ch + gap);
    const k = Math.min(cw / src.width, ch / src.height), w = Math.round(src.width * k), h = Math.round(src.height * k);
    g.drawImage(src, bx + (cw - w) / 2, by + (ch - h) / 2, w, h);
  });
  return out;
}

/** Arrange ID photos on an A4 sheet (300 dpi). items: [{canvas, copies}], photo size in mm. */
export function photoSheet(entries, { wmm = 30, hmm = 40, gapmm = 4, marginmm = 10, dpi = 300 } = {}) {
  const px = mm => Math.round(mm * dpi / 25.4), W = px(210), H = px(297), pw = px(wmm), ph = px(hmm), gap = px(gapmm), m = px(marginmm);
  const out = makeCanvas(W, H), g = out.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.imageSmoothingQuality = 'high';
  const cols = Math.max(1, Math.floor((W - 2 * m + gap) / (pw + gap)));
  let n = 0; const cells = [];
  for (const e of entries) for (let k = 0; k < (e.copies || 1); k++) cells.push(e.canvas);
  for (const src of cells) {
    const col = n % cols, row = Math.floor(n / cols), x = m + col * (pw + gap), y = m + row * (ph + gap);
    if (y + ph > H - m) break;
    // cover-crop each photo into the ID cell so proportions are right
    const k = Math.max(pw / src.width, ph / src.height), sw = pw / k, sh = ph / k, sx = (src.width - sw) / 2, sy = (src.height - sh) / 2;
    g.drawImage(src, sx, sy, sw, sh, x, y, pw, ph); g.strokeStyle = '#ddd'; g.strokeRect(x, y, pw, ph); n++;
  }
  return { canvas: out, placed: n };
}
/** Slice one canvas into rows×cols tiles (left→right, top→bottom). */
export function sliceGrid(src, rows, cols) {
  const out = []; const tw = Math.floor(src.width / cols), th = Math.floor(src.height / rows);
  for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
    const c = makeCanvas(tw, th); c.getContext('2d').drawImage(src, col * tw, r * th, tw, th, 0, 0, tw, th); out.push(c);
  }
  return out;
}

/* ------------------------------------------------- signature extraction --- */
/**
 * Make paper transparent and keep ink. Works on uneven lighting by comparing each
 * pixel with a blurred estimate of the local paper colour.
 * opts: { sensitivity 1–100, color 'keep'|'#rrggbb', bold 0–2, despeckle bool, trim bool }
 */
export function extractInk(src, opts) {
  const k = Math.min(1, SIGN_EDGE / Math.max(src.width, src.height));
  const work = k < 1 ? resizeTo(src, src.width * k, src.height * k) : src;
  const W = work.width, H = work.height;
  const data = ctx2d(work).getImageData(0, 0, W, H);
  // Background estimate: tiny blurred copy upscaled back.
  const small = makeCanvas(Math.max(8, Math.round(W / 24)), Math.max(8, Math.round(H / 24)));
  const sg = small.getContext('2d'); sg.filter = 'blur(3px)'; sg.drawImage(work, 0, 0, small.width, small.height);
  // Max-filter the small image so dark ink does not darken the paper estimate.
  const sd = sg.getImageData(0, 0, small.width, small.height), sw = small.width, sh = small.height, mx = new Uint8ClampedArray(sd.data);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) for (let ch = 0; ch < 3; ch++) {
    let m = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = clamp(x + dx, 0, sw - 1), yy = clamp(y + dy, 0, sh - 1); m = Math.max(m, sd.data[(yy * sw + xx) * 4 + ch]);
    }
    mx[(y * sw + x) * 4 + ch] = m;
  }
  sd.data.set(mx); sg.filter = 'none'; sg.putImageData(sd, 0, 0);
  const big = makeCanvas(W, H), bg = big.getContext('2d'); bg.imageSmoothingQuality = 'high'; bg.drawImage(small, 0, 0, W, H);
  const back = bg.getImageData(0, 0, W, H).data, px = data.data;
  const s = clamp(opts.sensitivity ?? 50, 1, 100) / 100;
  const t0 = 0.34 - s * 0.26, t1 = t0 + 0.16;
  const col = opts.color && opts.color !== 'keep' ? [1, 3, 5].map(i => parseInt(opts.color.slice(i, i + 2), 16)) : null;
  const alpha = new Float32Array(W * H);
  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    let strength = 0;
    for (let ch = 0; ch < 3; ch++) { const b = Math.max(back[i + ch], 40); strength = Math.max(strength, (b - px[i + ch]) / b); }
    alpha[p] = clamp((strength - t0) / (t1 - t0), 0, 1);
  }
  if (opts.despeckle) removeSpecks(alpha, W, H, Math.max(6, Math.round(W * H / 60000)));
  const out = new ImageData(W, H), o = out.data;
  const bold = clamp(opts.bold ?? 0, 0, 2);
  for (let i = 0, p = 0; i < o.length; i += 4, p++) {
    let a = alpha[p];
    if (bold) a = 1 - Math.pow(1 - a, 1 + bold * 1.5);
    if (col) { o[i] = col[0]; o[i + 1] = col[1]; o[i + 2] = col[2]; }
    else {
      // Un-blend the paper so the kept ink keeps its true colour without a white fringe.
      for (let ch = 0; ch < 3; ch++) {
        const b = back[i + ch], v = px[i + ch];
        o[i + ch] = a > 0.02 ? clamp(Math.round(b - (b - v) / Math.max(a, 0.35)), 0, 255) : v;
      }
    }
    o[i + 3] = Math.round(a * 255);
  }
  let res = makeCanvas(W, H); res.getContext('2d').putImageData(out, 0, 0);
  if (opts.trim) {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[y * W + x] > 0.15) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 >= 0) { const pad = Math.round(Math.max(W, H) * 0.015) + 4; res = cropTo(res, { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad }); }
  }
  const inkShare = alpha.reduce((s2, a) => s2 + (a > 0.5 ? 1 : 0), 0) / alpha.length;
  return { canvas: res, inkShare };
}
function removeSpecks(alpha, W, H, minSize) {
  const seen = new Uint8Array(W * H), stack = new Int32Array(W * H), comp = new Int32Array(W * H);
  for (let start = 0; start < W * H; start++) {
    if (seen[start] || alpha[start] < 0.3) continue;
    let top = 0, n = 0; stack[top++] = start; seen[start] = 1;
    while (top) {
      const p = stack[--top]; comp[n++] = p; const x = p % W, y = (p - x) / W;
      if (x > 0 && !seen[p - 1] && alpha[p - 1] >= 0.3) { seen[p - 1] = 1; stack[top++] = p - 1; }
      if (x < W - 1 && !seen[p + 1] && alpha[p + 1] >= 0.3) { seen[p + 1] = 1; stack[top++] = p + 1; }
      if (y > 0 && !seen[p - W] && alpha[p - W] >= 0.3) { seen[p - W] = 1; stack[top++] = p - W; }
      if (y < H - 1 && !seen[p + W] && alpha[p + W] >= 0.3) { seen[p + W] = 1; stack[top++] = p + W; }
    }
    if (n < minSize) for (let i = 0; i < n; i++) alpha[comp[i]] = 0;
  }
}

/* ------------------------------------------------------------------ UI ---- */
// Layout uses the Epsilon Soft app classes (tool-box, form-grid, form-field, button-*, callout).
// The app already shows the tool title, so this module starts with its content. All text >= 16px.
const STYLE_ID = 'es-img-style';
const CSS = `
.es-img{display:grid;gap:15px;color:var(--navy,#07185e);font-size:16px}
.es-img .es-img-drop{display:grid;justify-items:center;gap:12px;padding:50px 20px;border:2px dashed #b9a4ff;border-radius:20px;background:linear-gradient(135deg,#fbfaff,#f4f6ff);text-align:center;transition:background .2s,border-color .2s}
.es-img .es-img-drop.dragging{border-color:#6f2be3;background:#e9dffe}
.es-img .es-img-drop h3{font-size:26px;margin:0;color:#21259a}
.es-img .es-img-drop p{max-width:600px;margin:0;color:#5571a4;font-size:17px;line-height:1.6}
.es-img .es-img-drop-icon{width:84px;height:84px;color:#662bdb;background:linear-gradient(135deg,#eadbff,#c6e6ff);display:grid;place-items:center;border-radius:23px}
.es-img .es-img-work{display:grid;grid-template-columns:minmax(260px,330px) minmax(0,1fr);gap:15px;align-items:start}
@media(max-width:1070px){.es-img .es-img-work{grid-template-columns:1fr}}
.es-img .es-img-list{display:grid;gap:8px;max-height:min(70vh,700px);overflow:auto;margin-top:12px;padding:2px}
.es-img .es-img-item{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid #e1e8f5;border-radius:13px;padding:7px;cursor:pointer;background:#fff}
.es-img .es-img-item:hover{border-color:#b8c8ff}
.es-img .es-img-item.active{border-color:#6930df;background:#f6f2ff;box-shadow:0 0 0 2px #e2d6ff}
.es-img .es-img-item img{width:64px;height:64px;object-fit:contain;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/12px 12px;border-radius:9px}
.es-img .es-img-item b{display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.es-img .es-img-item span{display:block;color:#607297;font-size:16px;line-height:1.3;font-variant-numeric:tabular-nums}
.es-img .es-img-item .res{color:#087b65;font-weight:750}.es-img .es-img-item .res.up{color:#8c5711}
.es-img .es-img-remove{border:0;background:transparent;color:#7a8bb0;padding:6px;border-radius:9px;display:grid;place-items:center}
.es-img .es-img-remove:hover{background:#ffebee;color:#a02349}
.es-img .es-img-tabs{display:flex;flex-wrap:wrap;gap:7px;border:1px solid #d5dcf8;border-radius:16px;background:#f5f5ff;padding:8px;margin-bottom:16px}
.es-img .es-img-tab{display:flex;align-items:center;gap:8px;border:0;border-radius:11px;padding:11px 15px;background:transparent;color:#344a91;font-size:16px;font-weight:850}
.es-img .es-img-tab:hover{background:#e8e8fc}
.es-img .es-img-tab[aria-selected=true]{color:#fff;background:linear-gradient(115deg,#5825d9,#6b34ee);box-shadow:0 6px 14px #5121bc31}
.es-img .es-img-range{display:flex;align-items:center;gap:10px;min-height:48px}
.es-img .es-img-range input{flex:1;accent-color:var(--purple,#5a20db)}
.es-img .es-img-range output{min-width:52px;font-weight:800;color:#5326dc;text-align:right}
.es-img .es-img-pair{display:flex;gap:8px}
.es-img .es-img-pair input{min-width:0;width:50%;min-height:48px;border:1px solid #c7d5fa;border-radius:10px;padding:10px 12px;color:#13266d}
.es-img .es-img-check{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;color:#122766}
.es-img .es-img-check input{width:20px;height:20px;accent-color:var(--purple,#5a20db)}
.es-img details{margin-top:14px;border:1px solid #e1e6ff;border-radius:12px;background:#f6f8ff;padding:12px 14px}
.es-img summary{cursor:pointer;font-weight:800;color:#182a88}
.es-img .es-img-stage{display:grid;place-items:center;background:repeating-conic-gradient(#f1eef9 0 25%,#fff 0 50%) 0 0/18px 18px;border:1px solid #e1e5fc;border-radius:14px;min-height:280px;overflow:hidden;touch-action:none;margin-top:14px}
.es-img .es-img-stage canvas{max-width:100%;height:auto;display:block}
.es-img .es-img-compare{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:750px){.es-img .es-img-compare{grid-template-columns:1fr}}
.es-img .es-img-compare .es-img-stage{min-height:200px}
.es-img .es-img-cap{font-size:16px;color:#607297;margin:6px 0 0;text-align:center}
.es-img .es-img-busy{position:fixed;z-index:200;bottom:25px;right:25px;max-width:min(440px,90vw);border-radius:13px;background:#5624cb;color:#fff;display:flex;align-items:center;gap:10px;padding:14px 18px;font-size:16px;font-weight:800;box-shadow:0 14px 40px #3d258257}

/* Same compact density as the other Epsilon Soft desktop tools. */
.es-img{gap:12px}
.es-img .es-img-drop{padding:24px 18px;gap:8px}
.es-img .es-img-drop-icon{width:64px;height:64px;border-radius:17px}
.es-img .es-img-drop h3{font-size:24px}
.es-img .es-img-drop p{font-size:16px;line-height:1.45}
.es-img .es-img-work{gap:12px}
.es-img .tool-box{padding:13px}
.es-img .es-img-tabs{margin-bottom:10px;padding:5px;gap:5px}
.es-img .es-img-tab{padding:9px 12px}
.es-img .form-grid{gap:9px}
.es-img .form-field select,.es-img .form-field>input,.es-img .es-img-pair input{min-height:42px;padding:8px 10px}
.es-img .es-img-list{margin-top:8px}
.es-img .es-img-stage{min-height:235px;margin-top:10px}
@media(max-width:750px){.es-img .es-img-drop{padding:24px 14px}.es-img .es-img-tabs{flex-direction:column;align-items:stretch}.es-img .es-img-tab{justify-content:center}}
`;

const DEFAULTS = { format: 'keep', quality: 82, resize: 'edge', edge: 2000, percent: 50, ew: 354, eh: 472, targetKB: 0, wmText: '', wmPos: 'br', wmSize: 4, wmOpacity: 0.6, wmLogo: null, wmLogoPos: 'br', wmLogoSize: 18, wmLogoOpacity: 0.9, borderPct: 0, borderColor: '#ffffff', borderRadius: 0, baseName: '', startNo: 1, brightness: 0, contrast: 0, saturation: 100, sharpen: 0, maskMode: 'black' };
const ASPECTS = { free: 0, '1:1': 1, '3:4': 3 / 4, '4:6': 4 / 6, '2:3': 2 / 3, '4:3': 4 / 3, '16:9': 16 / 9, a4: 1 / Math.SQRT2 };

export async function mount(root, ctx = {}) {
  if (!document.getElementById(STYLE_ID)) { const st = document.createElement('style'); st.id = STYLE_ID; st.textContent = CSS; document.head.append(st); }
  const signal = ctx.signal;
  const toast = (m, t = 'success') => ctx.showToast ? ctx.showToast(m, t) : console.log(m);
  const download = (blob, name) => {
    if (shared.downloadBlob) return shared.downloadBlob(blob, name);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  root.innerHTML = `<div class="es-img">
  <section class="es-img-drop" id="im-drop">
   <div class="es-img-drop-icon">${ic('image', 38)}</div>
   <h3>Kéo thả ảnh vào đây</h3>
   <p>JPG, PNG, WebP, GIF, BMP, AVIF. Tối đa ${MAX_FILES} ảnh, mỗi ảnh ${humanBytes(MAX_FILE_BYTES)}. Có thể dán ảnh bằng Ctrl + V.</p>
   <div class="form-actions" style="justify-content:center;margin-top:0"><button class="button button-purple" type="button" id="im-pick">${ic('upload', 20)} Chọn ảnh từ máy</button></div>
   <p>Ảnh chụp điện thoại được tự xoay đúng chiều. Thông tin vị trí GPS trong ảnh bị loại bỏ khi xuất. Ảnh không rời khỏi máy bạn.</p>
  </section>
  <div class="es-img-work" id="im-work" hidden>
   <aside class="tool-box">
    <h2 class="tool-box-heading">${ic('files')} <span id="im-count"></span></h2>
    <div class="form-actions" style="margin-top:0"><button class="button button-outline button-sm" type="button" id="im-add">${ic('upload', 18)} Thêm ảnh</button><button class="button button-plain button-sm" type="button" id="im-clear">${ic('trash', 18)} Xóa hết</button></div>
    <div class="es-img-list" id="im-list" role="listbox" aria-label="Danh sách ảnh"></div>
   </aside>
   <section class="tool-box">
    <div class="es-img-tabs" role="tablist">
     <button class="es-img-tab" type="button" role="tab" data-tab="batch" aria-selected="true">${ic('settings', 20)} Nén & đổi định dạng</button>
     <button class="es-img-tab" type="button" role="tab" data-tab="crop" aria-selected="false">${ic('scissors', 20)} Cắt, xoay, làm thẳng</button>
     <button class="es-img-tab" type="button" role="tab" data-tab="adjust" aria-selected="false">${ic('lightbulb', 20)} Chỉnh màu</button>
     <button class="es-img-tab" type="button" role="tab" data-tab="mask" aria-selected="false">${ic('area', 20)} Che & cắt</button>
     <button class="es-img-tab" type="button" role="tab" data-tab="montage" aria-selected="false">${ic('grid', 20)} Ghép ảnh</button>
     <button class="es-img-tab" type="button" role="tab" data-tab="idphoto" aria-selected="false">${ic('image', 20)} Ảnh thẻ</button>
     <button class="es-img-tab" type="button" role="tab" data-tab="sign" aria-selected="false">${ic('pen', 20)} Tách nền chữ ký / con dấu</button>
    </div>
    <div data-panel="batch">
     <div class="form-grid three">
      <label class="form-field"><span>Định dạng xuất</span><select id="im-format"><option value="keep">Giữ như ảnh gốc</option><option value="image/jpeg">JPG – ảnh chụp</option><option value="image/png">PNG – nền trong suốt</option><option value="image/webp">WebP – nhẹ nhất</option></select></label>
      <div class="form-field"><span>Chất lượng</span><span class="es-img-range"><input type="range" id="im-quality" min="40" max="100" step="1" aria-label="Chất lượng"><output id="im-quality-val"></output></span></div>
      <label class="form-field"><span>Tối đa mỗi ảnh (KB, 0 = không giới hạn)</span><input type="number" id="im-target" min="0" max="50000" step="10"></label>
      <label class="form-field"><span>Kích thước</span><select id="im-resize"><option value="none">Giữ nguyên</option><option value="edge">Cạnh dài tối đa</option><option value="percent">Theo phần trăm</option><option value="exact">Chính xác (cắt giữa)</option></select></label>
      <label class="form-field" data-show="edge"><span>Cạnh dài tối đa (px)</span><input type="number" id="im-edge" min="16" max="12000" step="10"></label>
      <label class="form-field" data-show="percent"><span>Phần trăm (%)</span><input type="number" id="im-percent" min="1" max="400"></label>
      <div class="form-field" data-show="exact"><span>Rộng × cao (px) · 354 × 472 = ảnh thẻ 3×4</span><span class="es-img-pair"><input type="number" id="im-ew" min="1" max="12000" aria-label="Rộng"><input type="number" id="im-eh" min="1" max="12000" aria-label="Cao"></span></div>
     </div>
     <div class="form-grid" style="grid-template-columns:2fr 1fr;margin-top:4px">
      <label class="form-field"><span>Đổi tên hàng loạt (để trống = giữ tên gốc)</span><input type="text" id="im-basename" maxlength="80" placeholder="VD: cong-trinh"></label>
      <label class="form-field"><span>Bắt đầu từ số</span><input type="number" id="im-startno" min="0" max="99999" value="1"></label>
     </div>
     <details><summary>Đóng chữ / logo lên ảnh (ngày chụp, tên công trình, dấu bản quyền)</summary>
      <div class="form-grid three" style="margin-top:12px">
       <label class="form-field"><span>Nội dung chữ</span><input type="text" id="im-wm" maxlength="80" placeholder="Công trình A – 23/10/2026"></label>
       <label class="form-field"><span>Vị trí chữ</span><select id="im-wmpos"><option value="br">Góc dưới phải</option><option value="bl">Góc dưới trái</option><option value="tr">Góc trên phải</option><option value="tl">Góc trên trái</option><option value="center">Chính giữa</option></select></label>
       <label class="form-field"><span>Cỡ chữ (% cạnh ngắn)</span><input type="number" id="im-wmsize" min="1" max="20" step="0.5"></label>
      </div>
      <div class="form-actions" style="margin-top:10px"><button class="button button-outline button-sm" type="button" id="im-logo-pick">${ic('image', 18)} Chọn ảnh logo/dấu</button><button class="button button-plain button-sm" type="button" id="im-logo-clear" hidden>Bỏ logo</button><img id="im-logo-prev" alt="" hidden style="height:34px;border-radius:6px;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/8px 8px"></div>
      <div class="form-grid three" id="im-logo-opts" hidden style="margin-top:10px">
       <label class="form-field"><span>Vị trí logo</span><select id="im-logopos"><option value="br">Góc dưới phải</option><option value="bl">Góc dưới trái</option><option value="tr">Góc trên phải</option><option value="tl">Góc trên trái</option><option value="center">Chính giữa</option></select></label>
       <label class="form-field"><span>Cỡ logo (% cạnh ngắn)</span><input type="number" id="im-logosize" min="3" max="60" value="18"></label>
       <label class="form-field"><span>Độ đậm logo (%)</span><input type="number" id="im-logoop" min="10" max="100" value="90"></label>
      </div></details>
     <details><summary>Khung viền ảnh</summary>
      <div class="form-grid three" style="margin-top:12px">
       <label class="form-field"><span>Độ dày viền (% cạnh ngắn)</span><input type="number" id="im-border" min="0" max="25" step="0.5" value="0"></label>
       <label class="form-field"><span>Màu viền</span><input type="color" id="im-bordercolor" value="#ffffff"></label>
       <label class="form-field"><span>Bo góc (% cạnh ngắn)</span><input type="number" id="im-radius" min="0" max="50" value="0"></label>
      </div></details>
     <div class="form-actions">
      <button class="button button-purple" type="button" id="im-run">${ic('settings', 20)} Xử lý tất cả</button>
      <button class="button button-outline" type="button" id="im-zip" disabled>${ic('download', 20)} Tải tất cả (ZIP)</button>
      <button class="button button-outline" type="button" id="im-one" disabled>${ic('download', 20)} Tải ảnh đang chọn</button>
     </div>
     <div class="callout success" id="im-summary" aria-live="polite" hidden style="margin-top:14px"></div>
     <p class="tool-hint">Nộp hồ sơ trực tuyến thường yêu cầu ảnh dưới 200–500 KB: đặt "Tối đa mỗi ảnh" để công cụ tự tìm mức nén phù hợp.</p>
    </div>
    <div data-panel="crop" hidden>
     <div class="form-actions" style="margin-top:0">
      <button class="button button-outline button-sm" type="button" data-act="rotl">${ic('rotate', 18)} Xoay trái</button>
      <button class="button button-outline button-sm" type="button" data-act="rotr">${ic('refresh', 18)} Xoay phải</button>
      <button class="button button-outline button-sm" type="button" data-act="fliph">${ic('swap', 18)} Lật ngang</button>
      <button class="button button-outline button-sm" type="button" data-act="flipv">${ic('swap', 18)} Lật dọc</button>
     </div>
     <div class="form-grid three" style="margin-top:14px">
      <div class="form-field"><span>Làm thẳng ảnh</span><span class="es-img-range"><input type="range" id="im-angle" min="-15" max="15" step="0.5" value="0" aria-label="Góc làm thẳng"><output id="im-angle-val">0°</output></span></div>
      <label class="form-field"><span>Tỷ lệ khung cắt</span><select id="im-aspect"><option value="free">Tự do</option><option value="1:1">Vuông 1:1</option><option value="3:4">Ảnh thẻ 3:4</option><option value="4:6">Ảnh thẻ 4:6</option><option value="2:3">2:3</option><option value="4:3">4:3</option><option value="16:9">16:9</option><option value="a4">Khổ A4 (dọc)</option></select></label>
      <div class="form-field"><span>Khung cắt</span><span class="form-actions" style="margin-top:0"><button class="button button-plain button-sm" type="button" data-act="crop-reset">Bỏ khung cắt</button><button class="button button-plain button-sm" type="button" data-act="apply-all">Xoay/lật mọi ảnh</button></span></div>
     </div>
     <div class="es-img-stage" id="im-crop-stage"><canvas id="im-crop-canvas"></canvas></div>
     <p class="tool-hint" id="im-crop-info"></p>
    </div>
    <div data-panel="adjust" hidden>
     <div class="form-grid three">
      <div class="form-field"><span>Độ sáng</span><span class="es-img-range"><input type="range" id="im-brightness" min="-100" max="100" value="0"><output id="im-brightness-val">0</output></span></div>
      <div class="form-field"><span>Tương phản</span><span class="es-img-range"><input type="range" id="im-contrast" min="-100" max="100" value="0"><output id="im-contrast-val">0</output></span></div>
      <div class="form-field"><span>Độ tươi màu</span><span class="es-img-range"><input type="range" id="im-saturation" min="0" max="200" value="100"><output id="im-saturation-val">100%</output></span></div>
      <div class="form-field"><span>Độ nét</span><span class="es-img-range"><input type="range" id="im-sharpen" min="0" max="100" value="0"><output id="im-sharpen-val">0</output></span></div>
     </div>
     <div class="form-actions"><button class="button button-plain button-sm" type="button" data-act="adjust-reset">Đặt lại</button></div>
     <div class="es-img-compare">
      <div><div class="es-img-stage"><canvas id="im-adj-src"></canvas></div><p class="es-img-cap">Ảnh gốc</p></div>
      <div><div class="es-img-stage"><canvas id="im-adj-out"></canvas></div><p class="es-img-cap">Sau khi chỉnh (xem trước)</p></div>
     </div>
     <p class="tool-hint">Kéo thanh trượt để xem trước ảnh đang chọn. Bấm "Xử lý tất cả" ở tab Nén để áp cho mọi ảnh và xuất.</p>
    </div>
    <div data-panel="mask" hidden>
     <div class="form-grid three">
      <label class="form-field"><span>Kiểu che</span><select id="im-maskmode"><option value="black">Bôi đen</option><option value="blur">Làm mờ (pixel)</option></select></label>
      <div class="form-field"><span>&nbsp;</span><button class="button button-plain button-sm" type="button" data-act="mask-clear">Xóa hết vùng che</button></div>
      <div class="form-field"><span>Cắt thành lưới</span><span class="es-img-pair"><input type="number" id="im-grid-r" min="1" max="10" value="1" aria-label="Số hàng"><input type="number" id="im-grid-c" min="1" max="10" value="2" aria-label="Số cột"></span></div>
     </div>
     <div class="form-actions"><button class="button button-outline button-sm" type="button" data-act="grid-run">${ic('scissors', 18)} Cắt ảnh đang chọn theo lưới</button></div>
     <div class="es-img-stage" id="im-mask-stage"><canvas id="im-mask-canvas"></canvas></div>
     <p class="tool-hint">Kéo chuột trên ảnh để khoanh vùng cần che (số CCCD, biển số, mặt người...). Vùng che áp dụng cho ảnh đang chọn khi "Xử lý tất cả". Cắt lưới tạo nhiều ảnh mới ngay.</p>
    </div>
    <div data-panel="montage" hidden>
     <div class="form-grid three">
      <label class="form-field"><span>Kiểu ghép</span><select id="mo-mode"><option value="h">Hàng ngang</option><option value="v">Cột dọc</option><option value="grid">Lưới</option></select></label>
      <label class="form-field" id="mo-cols-wrap" hidden><span>Số cột</span><input type="number" id="mo-cols" min="1" max="10" value="2"></label>
      <label class="form-field"><span>Khoảng cách (px)</span><input type="number" id="mo-gap" min="0" max="120" value="10"></label>
      <label class="form-field"><span>Màu nền</span><input type="color" id="mo-bg" value="#ffffff"></label>
     </div>
     <p class="tool-hint">Ghép các ảnh trong danh sách theo thứ tự hiện tại thành một ảnh. Dùng cho ảnh hiện trường, ảnh so sánh trước/sau, ảnh nghiệm thu.</p>
     <div class="es-img-stage" id="mo-stage"><canvas id="mo-canvas"></canvas></div>
     <div class="form-actions"><button class="button button-purple" type="button" id="mo-download">${ic('download', 20)} Tải ảnh ghép (PNG)</button></div>
    </div>
    <div data-panel="idphoto" hidden>
     <div class="form-grid three">
      <label class="form-field"><span>Cỡ ảnh thẻ</span><select id="id-size"><option value="30x40">3 × 4 cm</option><option value="40x60">4 × 6 cm</option><option value="20x30">2 × 3 cm</option><option value="35x45">3.5 × 4.5 cm (visa)</option></select></label>
      <label class="form-field"><span>Số bản mỗi ảnh</span><input type="number" id="id-copies" min="1" max="40" value="8"></label>
      <div class="form-field"><span>&nbsp;</span><button class="button button-purple" type="button" id="id-make">${ic('image', 18)} Xếp lên A4 & tải</button></div>
     </div>
     <p class="tool-hint">Xếp các ảnh trong danh sách (mỗi ảnh × số bản) lên một tờ A4 để in. Ảnh được cắt vừa đúng tỉ lệ ảnh thẻ. Nên dùng ảnh đã đúng khuôn mặt, nền trơn.</p>
     <div class="es-img-stage" id="id-stage"><canvas id="id-canvas"></canvas></div>
    </div>
    <div data-panel="sign" hidden>
     <div class="form-grid three">
      <div class="form-field"><span>Độ nhạy nét</span><span class="es-img-range"><input type="range" id="im-sens" min="1" max="100" value="50" aria-label="Độ nhạy nét"><output id="im-sens-val">50</output></span></div>
      <label class="form-field"><span>Màu nét</span><select id="im-ink"><option value="keep">Giữ màu gốc</option><option value="#1a3fa8">Xanh mực ký</option><option value="#111111">Đen</option><option value="#d0161f">Đỏ con dấu</option></select></label>
      <label class="form-field"><span>Làm đậm nét</span><select id="im-bold"><option value="0">Không</option><option value="1">Vừa</option><option value="2">Đậm</option></select></label>
     </div>
     <div class="form-actions"><label class="es-img-check"><input type="checkbox" id="im-trim" checked> Cắt sát quanh nét</label><label class="es-img-check"><input type="checkbox" id="im-speck" checked> Xóa chấm bẩn nhỏ</label></div>
     <div class="es-img-compare">
      <div><div class="es-img-stage"><canvas id="im-sign-src"></canvas></div><p class="es-img-cap">Ảnh gốc</p></div>
      <div><div class="es-img-stage"><canvas id="im-sign-out"></canvas></div><p class="es-img-cap">Kết quả (nền trong suốt)</p></div>
     </div>
     <p class="tool-error" id="im-sign-err" hidden></p>
     <div class="form-actions"><button class="button button-purple" type="button" id="im-sign-dl">${ic('download', 20)} Tải PNG nền trong suốt</button></div>
     <p class="tool-hint">Chụp chữ ký hoặc con dấu trên giấy trắng, đủ sáng, không bóng đổ. Dùng file PNG này ở PDF Studio → Chỉnh sửa & Ký → "Tải ảnh chữ ký". Đây là chữ ký dạng hình ảnh, không thay thế chữ ký số.</p>
    </div>
   </section>
  </div>
  <input type="file" id="im-input" accept="image/*,.heic,.heif" multiple hidden>
  <input type="file" id="im-logo-input" accept="image/*" hidden>
  <div class="es-img-busy" id="im-busy" hidden role="status"><span class="spin"></span><span id="im-busy-label"></span></div>
 </div>`;
  const $ = s => root.querySelector(s);
  const items = []; let active = null, tab = 'batch', seq = 0, busy = false;
  const settings = { ...DEFAULTS };
  const setVal = (id, v) => { $(id).value = v; };
  setVal('#im-format', settings.format); setVal('#im-quality', settings.quality); setVal('#im-resize', settings.resize); setVal('#im-edge', settings.edge);
  setVal('#im-percent', settings.percent); setVal('#im-ew', settings.ew); setVal('#im-eh', settings.eh); setVal('#im-target', settings.targetKB);
  setVal('#im-wmpos', settings.wmPos); setVal('#im-wmsize', settings.wmSize);
  const CROP_HINT = 'Kéo chuột trên ảnh để vẽ khung cắt; kéo bên trong khung để di chuyển. Khung cắt được dùng khi bấm "Xử lý tất cả".';
  $('#im-crop-info').textContent = CROP_HINT;

  function readSettings() {
    const num = (id, d) => { const v = Number($(id).value); return Number.isFinite(v) ? v : d; };
    Object.assign(settings, {
      format: $('#im-format').value, quality: clamp(num('#im-quality', 82), 40, 100), resize: $('#im-resize').value,
      edge: clamp(num('#im-edge', 2000), 16, MAX_EDGE), percent: clamp(num('#im-percent', 50), 1, 400),
      ew: clamp(Math.round(num('#im-ew', 354)), 1, MAX_EDGE), eh: clamp(Math.round(num('#im-eh', 472)), 1, MAX_EDGE),
      targetKB: clamp(num('#im-target', 0), 0, 50000), wmText: $('#im-wm').value, wmPos: $('#im-wmpos').value, wmSize: clamp(num('#im-wmsize', 4), 1, 20),
      wmLogoPos: $('#im-logopos').value, wmLogoSize: clamp(num('#im-logosize', 18), 3, 60), wmLogoOpacity: clamp(num('#im-logoop', 90), 10, 100) / 100,
      borderPct: clamp(num('#im-border', 0), 0, 25), borderColor: $('#im-bordercolor').value, borderRadius: clamp(num('#im-radius', 0), 0, 50),
      baseName: $('#im-basename').value.trim(), startNo: Math.max(0, Math.floor(num('#im-startno', 1))),
      brightness: clamp(num('#im-brightness', 0), -100, 100), contrast: clamp(num('#im-contrast', 0), -100, 100),
      saturation: clamp(num('#im-saturation', 100), 0, 200), sharpen: clamp(num('#im-sharpen', 0), 0, 100), maskMode: $('#im-maskmode').value,
    });
    $('#im-quality-val').textContent = settings.quality + '%';
    $('#im-brightness-val').textContent = settings.brightness; $('#im-contrast-val').textContent = settings.contrast;
    $('#im-saturation-val').textContent = settings.saturation + '%'; $('#im-sharpen-val').textContent = settings.sharpen;
    root.querySelectorAll('[data-show]').forEach(el => { el.hidden = el.dataset.show !== settings.resize; });
  }
  readSettings();

  function setBusy(text) {
    busy = !!text; $('#im-busy').hidden = !text; $('#im-busy-label').textContent = text || '';
    root.querySelectorAll('button').forEach(b => { b.disabled = !!text; });
    if (!text) refreshButtons();
  }
  const progress = text => { $('#im-busy-label').textContent = text; };
  function refreshButtons() {
    const done = items.filter(i => i.result && !i.stale);
    $('#im-zip').disabled = busy || !done.length; $('#im-one').disabled = busy || !active?.result || active.stale;
  }
  function invalidate(list = items) { list.forEach(i => { if (i.result) i.stale = true; }); renderList(); }

  function renderList() {
    $('#im-count').textContent = `${items.length} ảnh`;
    $('#im-list').innerHTML = items.map(it => {
      const r = it.result && !it.stale ? it.result : null;
      const res = r ? `<span class="res ${r.blob.size > it.file.size ? 'up' : ''}">→ ${humanBytes(r.blob.size)} · ${r.w}×${r.h}${r.note ? ' · ' + esc(r.note) : ''}</span>` : '';
      return `<div class="es-img-item ${it === active ? 'active' : ''}" role="option" aria-selected="${it === active}" data-id="${it.id}" tabindex="0">
       <img src="${it.thumb}" alt=""><div><b title="${esc(it.file.name)}">${esc(it.file.name)}</b><span>${it.bmp.width}×${it.bmp.height} · ${humanBytes(it.file.size)}${it.crop ? ' · có khung cắt' : ''}</span>${res}</div>
       <button class="es-img-remove" type="button" data-remove="${it.id}" aria-label="Bỏ ảnh ${esc(it.file.name)}">${ic('close', 18)}</button></div>`;
    }).join('');
    const done = items.filter(i => i.result && !i.stale);
    if (done.length) {
      const before = done.reduce((s, i) => s + i.file.size, 0), after = done.reduce((s, i) => s + i.result.blob.size, 0);
      const pct = before ? Math.round((1 - after / before) * 100) : 0;
      $('#im-summary').hidden = false;
      $('#im-summary').textContent = `${done.length}/${items.length} ảnh đã xử lý: ${humanBytes(before)} → ${humanBytes(after)} (${pct >= 0 ? 'giảm ' + pct : 'tăng ' + -pct}%).`;
    } else $('#im-summary').hidden = true;
    refreshButtons();
  }

  async function addFiles(fileList) {
    const files = [...fileList].filter(f => f && (f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name)));
    if (!files.length) { toast('Không có tệp ảnh hợp lệ.', 'error'); return; }
    const room = MAX_FILES - items.length;
    if (room <= 0) { toast(`Tối đa ${MAX_FILES} ảnh mỗi lần.`, 'error'); return; }
    const errors = [];
    setBusy('Đang đọc ảnh...');
    try {
      for (const [n, file] of files.slice(0, room).entries()) {
        progress(`Đang đọc ảnh ${n + 1}/${Math.min(files.length, room)}...`);
        try {
          const bmp = await decode(file);
          const k = Math.min(1, 128 / Math.max(bmp.width, bmp.height)), t = makeCanvas(bmp.width * k, bmp.height * k);
          t.getContext('2d').drawImage(bmp, 0, 0, t.width, t.height);
          const thumb = URL.createObjectURL(await canvasBlob(t, 'image/png'));
          items.push({ id: ++seq, file, bmp, thumb, rot: 0, angle: 0, flipH: false, flipV: false, crop: null, masks: [], result: null, stale: false });
        } catch (e) { errors.push(`${file.name}: ${e.message}`); }
        if (signal?.aborted) return;
      }
    } finally { setBusy(''); }
    if (files.length > room) errors.push(`Chỉ nhận thêm ${room} ảnh (giới hạn ${MAX_FILES}).`);
    if (errors.length) toast(errors.slice(0, 3).join(' '), 'error');
    if (items.length) { if (!active) active = items[0]; $('#im-drop').hidden = true; $('#im-work').hidden = false; }
    renderList(); showActive(); if (tab === 'montage') drawMontage();
  }
  function removeItem(id) {
    const i = items.findIndex(x => x.id === id); if (i < 0) return;
    const [it] = items.splice(i, 1); it.bmp.close?.(); URL.revokeObjectURL(it.thumb);
    if (active === it) active = items[i] || items[i - 1] || null;
    if (!items.length) { $('#im-work').hidden = true; $('#im-drop').hidden = false; }
    renderList(); showActive(); if (tab === 'montage') drawMontage();
  }

  /* ---- crop editor ---- */
  const crop = { base: null, scale: 1, drag: null };
  function drawCropStage() {
    const cv = $('#im-crop-canvas');
    if (!active) { cv.width = 1; cv.height = 1; return; }
    crop.base = renderBase(active);
    const stage = $('#im-crop-stage'), maxW = Math.max(240, stage.clientWidth - 20), maxH = 560;
    crop.scale = Math.min(1, maxW / crop.base.width, maxH / crop.base.height);
    cv.width = Math.round(crop.base.width * crop.scale); cv.height = Math.round(crop.base.height * crop.scale);
    paintCrop();
  }
  function paintCrop() {
    const cv = $('#im-crop-canvas'), g = cv.getContext('2d'); if (!crop.base) return;
    g.clearRect(0, 0, cv.width, cv.height); g.drawImage(crop.base, 0, 0, cv.width, cv.height);
    const r = active?.crop;
    if (r) {
      const s = crop.scale, x = r.x * s, y = r.y * s, w = r.w * s, h = r.h * s;
      g.fillStyle = 'rgba(20,16,60,.55)'; g.beginPath(); g.rect(0, 0, cv.width, cv.height); g.rect(x, y, w, h); g.fill('evenodd');
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1;
      for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(x + w * i / 3, y); g.lineTo(x + w * i / 3, y + h); g.moveTo(x, y + h * i / 3); g.lineTo(x + w, y + h * i / 3); g.stroke(); }
      $('#im-crop-info').textContent = `Khung cắt ${Math.round(r.w)} × ${Math.round(r.h)} px. Kéo bên trong để di chuyển, kéo ngoài khung để vẽ lại.`;
    } else $('#im-crop-info').textContent = CROP_HINT;
  }
  function stagePoint(e) {
    const cv = $('#im-crop-canvas'), b = cv.getBoundingClientRect();
    return { x: clamp((e.clientX - b.left) / b.width * cv.width / crop.scale, 0, crop.base.width), y: clamp((e.clientY - b.top) / b.height * cv.height / crop.scale, 0, crop.base.height) };
  }
  function rectFrom(a, b) {
    const ratio = ASPECTS[$('#im-aspect').value] || 0, W = crop.base.width, H = crop.base.height;
    let w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    if (ratio) { if (w / h > ratio) w = h * ratio; else h = w / ratio; }
    let x = b.x < a.x ? a.x - w : a.x, y = b.y < a.y ? a.y - h : a.y;
    if (x < 0) { w += x; x = 0; if (ratio) h = w / ratio; } if (y < 0) { h += y; y = 0; if (ratio) w = h * ratio; }
    if (x + w > W) { w = W - x; if (ratio) h = w / ratio; } if (y + h > H) { h = H - y; if (ratio) w = h * ratio; }
    return { x, y, w, h };
  }
  const cv = $('#im-crop-canvas');
  cv.addEventListener('pointerdown', e => {
    if (!active || !crop.base) return; cv.setPointerCapture(e.pointerId);
    const p = stagePoint(e), r = active.crop;
    crop.drag = r && p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h ? { mode: 'move', p, r: { ...r } } : { mode: 'new', p };
  }, { signal });
  cv.addEventListener('pointermove', e => {
    if (!crop.drag) return; const p = stagePoint(e), d = crop.drag;
    if (d.mode === 'move') active.crop = { ...d.r, x: clamp(d.r.x + p.x - d.p.x, 0, crop.base.width - d.r.w), y: clamp(d.r.y + p.y - d.p.y, 0, crop.base.height - d.r.h) };
    else active.crop = rectFrom(d.p, p);
    paintCrop();
  }, { signal });
  const endDrag = () => {
    if (!crop.drag) return; crop.drag = null;
    if (active?.crop && (active.crop.w < 8 || active.crop.h < 8)) active.crop = null;
    invalidate([active]); paintCrop();
  };
  cv.addEventListener('pointerup', endDrag, { signal }); cv.addEventListener('pointercancel', endDrag, { signal });
  const mcv = $('#im-mask-canvas');
  mcv.addEventListener('pointerdown', e => { if (!active) return; mcv.setPointerCapture(e.pointerId); maskState.drag = { p: maskPoint(e) }; }, { signal });
  mcv.addEventListener('pointermove', e => { if (!maskState.drag) return; const p = maskPoint(e), a = maskState.drag.p; active._draft = { x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) }; paintMask(); const g = mcv.getContext('2d'); const d = active._draft, cv2 = mcv; g.strokeStyle = '#6930df'; g.lineWidth = 2; g.strokeRect(d.x * cv2.width, d.y * cv2.height, d.w * cv2.width, d.h * cv2.height); }, { signal });
  const endMask = () => { if (!maskState.drag) return; maskState.drag = null; const d = active?._draft; if (d && d.w > 0.01 && d.h > 0.01) { active.masks.push(d); invalidate([active]); } active && (active._draft = null); paintMask(); };
  mcv.addEventListener('pointerup', endMask, { signal }); mcv.addEventListener('pointercancel', endMask, { signal });

  /* ---- signature ---- */
  let signResult = null, signTimer = 0;
  function fitDraw(canvas, src, max = 520) {
    const k = Math.min(1, max / Math.max(src.width, src.height)); canvas.width = Math.max(1, Math.round(src.width * k)); canvas.height = Math.max(1, Math.round(src.height * k));
    const g = canvas.getContext('2d'); g.clearRect(0, 0, canvas.width, canvas.height); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, canvas.width, canvas.height);
  }
  function runSign() {
    clearTimeout(signTimer);
    signTimer = setTimeout(() => {
      if (!active || tab !== 'sign') return;
      $('#im-sens-val').textContent = $('#im-sens').value;
      try {
        const src = cropTo(renderBase(active), active.crop);
        fitDraw($('#im-sign-src'), src);
        signResult = extractInk(src, { sensitivity: +$('#im-sens').value, color: $('#im-ink').value, bold: +$('#im-bold').value, trim: $('#im-trim').checked, despeckle: $('#im-speck').checked });
        fitDraw($('#im-sign-out'), signResult.canvas);
        const err = $('#im-sign-err');
        err.hidden = !(signResult.inkShare > 0.35 || signResult.inkShare < 0.0005);
        err.textContent = signResult.inkShare > 0.35 ? 'Phần nét chiếm quá nhiều ảnh: hãy giảm độ nhạy hoặc cắt sát vùng chữ ký ở tab "Cắt, xoay, làm thẳng".' : 'Gần như không thấy nét: hãy tăng độ nhạy.';
      } catch (e) { $('#im-sign-err').hidden = false; $('#im-sign-err').textContent = e.message; signResult = null; }
    }, 60);
  }

  function showActive() {
    root.querySelectorAll('.es-img-item').forEach(el => { const on = active && +el.dataset.id === active.id; el.classList.toggle('active', on); el.setAttribute('aria-selected', String(!!on)); });
    if (active) { $('#im-angle').value = active.angle; $('#im-angle-val').textContent = `${active.angle}°`; }
    if (tab === 'crop') drawCropStage();
    if (tab === 'sign') runSign();
    if (tab === 'adjust') drawAdjust();
    if (tab === 'mask') drawMaskStage();
    if (tab === 'idphoto') drawIdSheet();
    refreshButtons();
  }
  function setTab(name) {
    tab = name;
    root.querySelectorAll('.es-img-tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    root.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== name; });
    if (name === 'montage') drawMontage();
    if (name === 'adjust') drawAdjust();
    if (name === 'mask') drawMaskStage();
    if (name === 'idphoto') drawIdSheet();
    showActive();
  }
  /* ---- adjust preview ---- */
  let adjustTimer = 0;
  function drawAdjust() {
    if (tab !== 'adjust') return; clearTimeout(adjustTimer);
    adjustTimer = setTimeout(() => {
      if (!active) { for (const id of ['#im-adj-src', '#im-adj-out']) { const c = $(id); c.width = 1; c.height = 1; } return; }
      readSettings();
      const base = cropTo(renderBase(active), active.crop), k = Math.min(1, 460 / Math.max(base.width, base.height));
      const show = (cv, src) => { cv.width = Math.round(src.width * k); cv.height = Math.round(src.height * k); const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, cv.width, cv.height); };
      show($('#im-adj-src'), base);
      const work = makeCanvas(base.width * k, base.height * k); work.getContext('2d').drawImage(base, 0, 0, work.width, work.height);
      adjustColors(work, settings); sharpen(work, settings.sharpen); const o = $('#im-adj-out'); o.width = work.width; o.height = work.height; o.getContext('2d').drawImage(work, 0, 0);
    }, 50);
  }
  /* ---- mask editor (draw rectangles to hide) ---- */
  const maskState = { base: null, scale: 1, drag: null };
  function drawMaskStage() {
    const cv = $('#im-mask-canvas'); if (!active) { cv.width = 1; cv.height = 1; return; }
    maskState.base = cropTo(renderBase(active), active.crop);
    const stage = $('#im-mask-stage'), maxW = Math.max(240, stage.clientWidth - 20), maxH = 440;
    maskState.scale = Math.min(1, maxW / maskState.base.width, maxH / maskState.base.height);
    cv.width = Math.round(maskState.base.width * maskState.scale); cv.height = Math.round(maskState.base.height * maskState.scale);
    paintMask();
  }
  function paintMask() {
    const cv = $('#im-mask-canvas'), g = cv.getContext('2d'); if (!maskState.base) return;
    g.clearRect(0, 0, cv.width, cv.height); g.drawImage(maskState.base, 0, 0, cv.width, cv.height);
    const mode = $('#im-maskmode').value;
    for (const r of (active?.masks || [])) {
      const x = r.x * cv.width, y = r.y * cv.height, w = r.w * cv.width, h = r.h * cv.height;
      if (mode === 'blur') { g.fillStyle = 'rgba(40,40,40,.5)'; g.fillRect(x, y, w, h); g.strokeStyle = '#fff'; g.setLineDash([6, 4]); g.strokeRect(x, y, w, h); g.setLineDash([]); }
      else { g.fillStyle = '#000'; g.fillRect(x, y, w, h); }
    }
  }
  function maskPoint(e) { const cv = $('#im-mask-canvas'), b = cv.getBoundingClientRect(); return { x: clamp((e.clientX - b.left) / b.width, 0, 1), y: clamp((e.clientY - b.top) / b.height, 0, 1) }; }
  /* ---- ID photo sheet ---- */
  let idSheet = null;
  function drawIdSheet() {
    if (tab !== 'idphoto') return;
    try {
      if (!items.length) { idSheet = null; const cv = $('#id-canvas'); cv.width = 1; cv.height = 1; return; }
      const [wmm, hmm] = $('#id-size').value.split('x').map(Number), copies = clamp(Number($('#id-copies').value) || 1, 1, 40);
      const entries = items.map(it => ({ canvas: cropTo(renderBase(it), it.crop), copies }));
      const res = photoSheet(entries, { wmm, hmm }); idSheet = res.canvas;
      const stage = $('#id-stage'), maxW = Math.max(240, stage.clientWidth - 20), maxH = 480, k = Math.min(1, maxW / idSheet.width, maxH / idSheet.height);
      const cv = $('#id-canvas'); cv.width = Math.round(idSheet.width * k); cv.height = Math.round(idSheet.height * k); cv.getContext('2d').drawImage(idSheet, 0, 0, cv.width, cv.height);
    } catch { idSheet = null; }
  }
  /* ---- montage preview ---- */
  let montageCanvas = null, montageTimer = 0;
  function drawMontage() {
    $('#mo-cols-wrap').hidden = $('#mo-mode').value !== 'grid';
    if (tab !== 'montage') return;
    clearTimeout(montageTimer);
    montageTimer = setTimeout(() => {
      try {
        if (items.length < 2) { montageCanvas = null; const cv = $('#mo-canvas'); cv.width = 1; cv.height = 1; $('#mo-download').disabled = true; return; }
        const sources = items.map(it => cropTo(renderBase(it), it.crop));
        montageCanvas = montage(sources, { mode: $('#mo-mode').value, cols: clamp(Number($('#mo-cols').value) || 2, 1, 10), gap: clamp(Number($('#mo-gap').value) || 0, 0, 120), bg: $('#mo-bg').value, cell: 600 });
        const stage = $('#mo-stage'), maxW = Math.max(240, stage.clientWidth - 20), maxH = 420, k = Math.min(1, maxW / montageCanvas.width, maxH / montageCanvas.height);
        const cv = $('#mo-canvas'); cv.width = Math.round(montageCanvas.width * k); cv.height = Math.round(montageCanvas.height * k);
        cv.getContext('2d').drawImage(montageCanvas, 0, 0, cv.width, cv.height); $('#mo-download').disabled = false;
      } catch { montageCanvas = null; $('#mo-download').disabled = true; }
    }, 60);
  }

  async function runBatch() {
    if (!items.length) return;
    readSettings(); setBusy('Đang xử lý...');
    let fail = 0;
    try {
      for (const [n, it] of items.entries()) {
        if (signal?.aborted) return;
        progress(`Đang xử lý ảnh ${n + 1}/${items.length}...`);
        try { it.result = await processItem(it, settings); it.stale = false; }
        catch (e) { fail++; it.result = null; console.error('Image Studio:', e); }
        if (n % 4 === 3) { renderList(); await new Promise(r => setTimeout(r)); }
      }
    } finally { setBusy(''); renderList(); }
    toast(fail ? `Xong, ${fail} ảnh lỗi (ảnh quá lớn hoặc hỏng).` : 'Đã xử lý xong. Bấm "Tải tất cả (ZIP)" để lưu.', fail ? 'error' : 'success');
  }
  function outName(it, idx) {
    const ext = EXT[it.result.type] || 'img';
    if (!settings.baseName) return `${baseName(it.file.name)}.${ext}`;
    const total = items.filter(i => i.result && !i.stale).length, pad = Math.max(2, String(settings.startNo + Math.max(0, total - 1)).length);
    return `${baseName(settings.baseName)}-${String(settings.startNo + idx).padStart(pad, '0')}.${ext}`;
  }

  root.addEventListener('click', async e => {
    const b = e.target.closest('button'), row = e.target.closest('.es-img-item');
    if (b?.dataset.remove) { e.stopPropagation(); if (!busy) removeItem(+b.dataset.remove); return; }
    if (row && !b) { active = items.find(i => i.id === +row.dataset.id) || active; showActive(); return; }
    if (!b || busy) return;
    if (b.id === 'im-pick' || b.id === 'im-add') $('#im-input').click();
    else if (b.id === 'im-logo-pick') $('#im-logo-input').click();
    else if (b.id === 'im-logo-clear') { settings.wmLogo = null; $('#im-logo-prev').hidden = true; $('#im-logo-clear').hidden = true; $('#im-logo-opts').hidden = true; invalidate(); }
    else if (b.id === 'mo-download' && montageCanvas) download(await canvasBlob(montageCanvas, 'image/png'), (settings.baseName ? baseName(settings.baseName) : 'ghep-anh') + '.png');
    else if (b.id === 'id-make') { if (!idSheet) { toast('Chưa có ảnh để xếp.', 'error'); return; } download(await canvasBlob(idSheet, 'image/jpeg', 0.92), 'anh-the-A4.jpg'); toast('Đã tạo tờ A4 ảnh thẻ.'); }
    else if (b.id === 'im-clear') { [...items].forEach(i => removeItem(i.id)); }
    else if (b.dataset.tab) setTab(b.dataset.tab);
    else if (b.id === 'im-run') runBatch();
    else if (b.id === 'im-one' && active?.result) download(active.result.blob, outName(active, items.filter(i => i.result && !i.stale).indexOf(active)));
    else if (b.id === 'im-zip') {
      const done = items.filter(i => i.result && !i.stale);
      setBusy('Đang đóng gói ZIP...');
      try { const files = []; for (const [i, it] of done.entries()) files.push({ name: outName(it, i), data: new Uint8Array(await it.result.blob.arrayBuffer()) }); download(makeZip(files), 'epsilon-image-studio.zip'); }
      finally { setBusy(''); }
    }
    else if (b.id === 'im-sign-dl') {
      if (!signResult) return; download(await canvasBlob(signResult.canvas, 'image/png'), `${baseName(active.file.name)}-tach-nen.png`); toast('Đã tạo PNG nền trong suốt.');
    }
    else if (b.dataset.act === 'adjust-reset') { for (const [id, v] of [['#im-brightness', 0], ['#im-contrast', 0], ['#im-saturation', 100], ['#im-sharpen', 0]]) $(id).value = v; readSettings(); invalidate(); drawAdjust(); }
    else if (b.dataset.act === 'mask-clear' && active) { active.masks = []; invalidate([active]); paintMask(); }
    else if (b.dataset.act === 'grid-run' && active) {
      const rows = clamp(Number($('#im-grid-r').value) || 1, 1, 10), cols = clamp(Number($('#im-grid-c').value) || 1, 1, 10);
      if (rows * cols < 2) { toast('Chọn ít nhất 2 ô (hàng × cột).', 'error'); return; }
      setBusy('Đang cắt ảnh...');
      try {
        const tiles = sliceGrid(cropTo(renderBase(active), active.crop), rows, cols), made = [];
        for (const [i, t] of tiles.entries()) { const blob = await canvasBlob(t, 'image/png'); made.push({ name: `${baseName(active.file.name)}-o${i + 1}.png`, data: new Uint8Array(await blob.arrayBuffer()) }); }
        download(makeZip(made), `${baseName(active.file.name)}-luoi.zip`); toast(`Đã cắt thành ${tiles.length} ảnh (ZIP).`);
      } finally { setBusy(''); }
    }
    else if (b.dataset.act && active) {
      const a = b.dataset.act;
      if (a === 'rotl' || a === 'rotr') { active.rot = (active.rot + (a === 'rotl' ? 270 : 90)) % 360; active.crop = null; }
      if (a === 'fliph') { active.flipH = !active.flipH; active.crop = null; }
      if (a === 'flipv') { active.flipV = !active.flipV; active.crop = null; }
      if (a === 'crop-reset') active.crop = null;
      if (a === 'apply-all') { items.forEach(i => { if (i !== active) { i.rot = active.rot; i.flipH = active.flipH; i.flipV = active.flipV; i.angle = active.angle; i.crop = null; } }); invalidate(); toast('Đã áp dụng xoay/lật cho mọi ảnh.'); }
      invalidate([active]); showActive();
    }
  }, { signal });
  root.addEventListener('keydown', e => {
    const row = e.target.closest('.es-img-item'); if (!row || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); active = items.find(i => i.id === +row.dataset.id) || active; showActive();
  }, { signal });
  root.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'im-angle' && active) { active.angle = +e.target.value; active.crop = null; $('#im-angle-val').textContent = `${active.angle}°`; invalidate([active]); drawCropStage(); return; }
    if (['im-sens', 'im-ink', 'im-bold', 'im-trim', 'im-speck'].includes(id)) { runSign(); return; }
    if (id?.startsWith('mo-')) { drawMontage(); return; }
    if (id?.startsWith('id-')) { drawIdSheet(); return; }
    if (['im-brightness', 'im-contrast', 'im-saturation', 'im-sharpen'].includes(id)) { readSettings(); invalidate(); drawAdjust(); return; }
    if (id === 'im-maskmode') { readSettings(); invalidate(); paintMask(); return; }
    if (id === 'im-aspect' || id === 'im-input') return;
    if (id && id.startsWith('im-')) { readSettings(); invalidate(); if (tab === 'montage') drawMontage(); }
  }, { signal });
  root.addEventListener('change', e => {
    const id = e.target.id;
    if (id === 'im-input') { const f = [...e.target.files]; e.target.value = ''; if (f.length) addFiles(f); return; }
    if (id === 'im-logo-input') {
      const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
      createImageBitmap(f).then(bmp => { const c = makeCanvas(bmp.width, bmp.height); c.getContext('2d').drawImage(bmp, 0, 0); bmp.close?.(); settings.wmLogo = c; $('#im-logo-prev').src = c.toDataURL('image/png'); $('#im-logo-prev').hidden = false; $('#im-logo-clear').hidden = false; $('#im-logo-opts').hidden = false; invalidate(); }).catch(() => toast('Không đọc được ảnh logo.', 'error'));
      return;
    }
    if (id?.startsWith('mo-')) { drawMontage(); return; }
    if (id === 'im-aspect') { if (active?.crop) { const r = active.crop; active.crop = rectFrom({ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h }); invalidate([active]); paintCrop(); } return; }
    if (['im-sens', 'im-ink', 'im-bold', 'im-trim', 'im-speck'].includes(id)) { runSign(); return; }
    if (id === 'im-angle') return;
    if (id?.startsWith('id-')) { drawIdSheet(); return; }
    if (id === 'im-maskmode') { readSettings(); invalidate(); paintMask(); return; }
    if (id?.startsWith('im-')) { readSettings(); invalidate(); if (tab === 'montage') drawMontage(); if (tab === 'adjust') drawAdjust(); }
  }, { signal });
  // Accept drops anywhere in the tool, and never let the browser navigate away to a dropped file.
  const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
  root.addEventListener('dragover', e => { if (hasFiles(e)) { e.preventDefault(); $('#im-drop').classList.add('dragging'); } }, { signal });
  root.addEventListener('dragleave', e => { if (!root.contains(e.relatedTarget)) $('#im-drop').classList.remove('dragging'); }, { signal });
  root.addEventListener('drop', e => { if (!hasFiles(e)) return; e.preventDefault(); $('#im-drop').classList.remove('dragging'); if (!busy) addFiles(e.dataTransfer.files); }, { signal });
  document.addEventListener('paste', e => {
    if (!root.isConnected || busy) return;
    const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); addFiles(files); toast('Đã dán ảnh từ bộ nhớ tạm.'); }
  }, { signal });
  window.addEventListener('resize', () => { if (tab === 'crop') drawCropStage(); if (tab === 'montage') drawMontage(); if (tab === 'mask') drawMaskStage(); if (tab === 'idphoto') drawIdSheet(); if (tab === 'adjust') drawAdjust(); }, { signal });

  return () => { clearTimeout(signTimer); items.forEach(i => { i.bmp.close?.(); URL.revokeObjectURL(i.thumb); }); items.length = 0; root.innerHTML = ''; };
}
