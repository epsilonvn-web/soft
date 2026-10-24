/**
 * Epsilon Soft PDF Studio – browser-side document workspace.
 * A document is loaded once and remains intact when switching Studio tabs.
 * User documents are never sent to a server by this module.
 * PDF.js + pdf-lib are loaded from pinned CDN URLs, or from globalThis.EpsilonSoftVendor
 * when the host bundles them (offline / portable build).
 * See docs/PDF_STUDIO_SECURITY_AND_LIMITS.md before production deployment.
 */
const { icon = () => '', downloadBlob } = globalThis.EpsilonSoftShared || {};

/* ------------------------------------------------------------- ZIP ------ */
/** Minimal ZIP file writer (STORE/CRC32), no third-party dependency. */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(bytes) { let c = 0xffffffff; for (const x of bytes) c = CRC_TABLE[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function makeZip(files) {
  const enc = new TextEncoder(), chunks = [], central = []; let offset = 0;
  const u16 = (d, o, n) => d.setUint16(o, n, true), u32 = (d, o, n) => d.setUint32(o, n, true);
  if (!Array.isArray(files) || files.length === 0 || files.length > 250) throw Error('Cần 1–250 tệp để tạo ZIP.');
  for (const item of files) {
    const name = String(item.name || 'file').replace(/[\\/]/g, '_'); const path = enc.encode(name), data = item.data instanceof Uint8Array ? item.data : new Uint8Array(item.data);
    if (path.length > 65535 || data.length > 0xffffffff) throw Error('Tên hoặc nội dung tệp quá lớn.');
    const crc = crc32(data), local = new Uint8Array(30 + path.length), v = new DataView(local.buffer); u32(v, 0, 0x04034b50); u16(v, 4, 20); u16(v, 6, 0x0800); u16(v, 8, 0); u32(v, 14, crc); u32(v, 18, data.length); u32(v, 22, data.length); u16(v, 26, path.length); local.set(path, 30);
    const entry = new Uint8Array(46 + path.length), q = new DataView(entry.buffer); u32(q, 0, 0x02014b50); u16(q, 4, 20); u16(q, 6, 20); u16(q, 8, 0x0800); u16(q, 10, 0); u32(q, 16, crc); u32(q, 20, data.length); u32(q, 24, data.length); u16(q, 28, path.length); u32(q, 42, offset); entry.set(path, 46);
    chunks.push(local, data); central.push(entry); offset += local.length + data.length;
  }
  const centralBytes = central.reduce((sum, e) => sum + e.length, 0), end = new Uint8Array(22), v = new DataView(end.buffer); u32(v, 0, 0x06054b50); u16(v, 8, files.length); u16(v, 10, files.length); u32(v, 12, centralBytes); u32(v, 16, offset); return new Blob([...chunks, ...central, end], { type: 'application/zip' });
}
function parsePages(spec, max) {
  const s = String(spec ?? '').trim(); if (!s) throw Error('Nhập số trang, ví dụ 1,3-5.'); if (!/^\d+(\s*-\s*\d+)?(\s*,\s*\d+(\s*-\s*\d+)?)*$/.test(s)) throw Error('Dãy trang không đúng định dạng. Ví dụ: 1,3-5.');
  const out = [], found = new Set(); for (const chunk of s.split(',')) { const pieces = chunk.split('-').map(x => Number(x.trim())); let from = pieces[0], to = pieces.length === 2 ? pieces[1] : from; if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 1 || to > max || to < from) throw Error(`Trang phải nằm trong 1–${max} và theo thứ tự tăng.`); for (let page = from; page <= to; page++) { if (!found.has(page)) { found.add(page); out.push(page - 1); } } } return out;
}

/* ------------------------------------------------------- page geometry --- */
/**
 * Map a point on the page *as the reader sees it* (u right, v down, in points,
 * after /Rotate and inside the CropBox) to unrotated PDF user space.
 */
function displayToUser(box, rotation, du, dv) {
  const { x: cx, y: cy, width: W, height: H } = box, side = rotation % 180 !== 0;
  const nu = du / (side ? H : W), nv = dv / (side ? W : H);
  let px, py;
  if (rotation === 90) { px = nv * W; py = nu * H; }
  else if (rotation === 180) { px = (1 - nu) * W; py = nv * H; }
  else if (rotation === 270) { px = (1 - nv) * W; py = (1 - nu) * H; }
  else { px = nu * W; py = (1 - nv) * H; }
  return { x: cx + px, y: cy + py };
}
/** Visible size of a page in points (CropBox, after rotation). */
function displaySize(page) {
  const box = page.getCropBox(), rot = normRotation(page.getRotation().angle), side = rot % 180 !== 0;
  return { box, rot, w: side ? box.height : box.width, h: side ? box.width : box.height };
}
/** pdf.js 5+ documents have no destroy(); the loading task owns the worker resources. */
async function destroyView(view) { try { await (view?.loadingTask?.destroy?.() ?? view?.destroy?.()); } catch { /* already closed */ } }
const normRotation = a => ((Math.round(a / 90) * 90) % 360 + 360) % 360;
/**
 * pdf-lib draw options so that an item of visible size w×h appears upright, centred at
 * display point (du, dv), optionally turned by `extra` degrees (counter-clockwise) for the reader.
 */
function placeCentered(page, du, dv, w, h, extra = 0) {
  const { box, rot } = displaySize(page), c = displayToUser(box, rot, du, dv);
  const t = (rot + extra) * Math.PI / 180, cos = Math.cos(t), sin = Math.sin(t);
  return { x: c.x - (w / 2 * cos - h / 2 * sin), y: c.y - (w / 2 * sin + h / 2 * cos), angle: rot + extra };
}
/** pdf-lib draw options ({x, y, rotate: Degrees}) from a placement. */
const drawOpts = (at, PDFLib) => ({ x: at.x, y: at.y, rotate: PDFLib.degrees(at.angle) });
/** Same, but positioned by the item's visible top-left corner, kept inside the page. */
function placeTopLeft(page, du, dv, w, h) {
  const { w: Dw, h: Dh } = displaySize(page);
  const u = clamp(du, 0, Math.max(0, Dw - w)), v = clamp(dv, 0, Math.max(0, Dh - h));
  return placeCentered(page, u + w / 2, v + h / 2, w, h);
}

/* ----------------------------------------------------------- libraries --- */
const VERSION = '2026.10.24-protect2';
const CDN = 'https://cdn.jsdelivr.net/npm/';
const PDFLIB_CDN = CDN + 'pdf-lib@1.17.1/dist/pdf-lib.min.js';
// Legacy build: includes polyfills (Math.sumPrecise, Map#getOrInsertComputed...) that the modern
// pdf.js 6 build expects, so older Chrome/Edge still found in many offices keep working.
const PDFJS_CDN = CDN + 'pdfjs-dist@6.4.299/legacy/build/pdf.min.mjs';
const PDFWORKER_CDN = CDN + 'pdfjs-dist@6.4.299/legacy/build/pdf.worker.min.mjs';
let librariesLoading = null, qpdfLoading = null;
const QPDF_CDN = CDN + '@jspawn/qpdf-wasm@0.0.2/';
/** qpdf (Apache-2.0) compiled to WebAssembly, loaded only when the Mật khẩu task is first used. */
async function loadQpdf() {
  if (qpdfLoading) return qpdfLoading;
  qpdfLoading = (async () => {
    const vendor = globalThis.EpsilonSoftVendor || {};
    const base = vendor.qpdfBase || QPDF_CDN;
    const createModule = vendor.qpdf || (await import(/* @vite-ignore */ base + 'qpdf.mjs')).default;
    const mod = await createModule({ locateFile: p => base + p, noInitialRun: true, print: () => {}, printErr: () => {} });
    return mod;
  })().catch(err => { qpdfLoading = null; throw new Error('Không tải được thư viện mã hóa PDF (qpdf) từ CDN. Tính năng mật khẩu cần Internet để lấy thư viện; tài liệu vẫn chỉ xử lý trong trình duyệt. Chi tiết: ' + String(err?.message || err)); });
  return qpdfLoading;
}
/** Run one qpdf CLI command on in-memory bytes. Returns the output bytes, or throws with qpdf's message. */
async function runQpdf(args, inputBytes, outName = 'out.pdf') {
  const mod = await loadQpdf();
  const inName = 'in.pdf';
  for (const f of [inName, outName]) { try { mod.FS.unlink('/' + f); } catch { /* not there */ } }
  mod.FS.writeFile('/' + inName, inputBytes);
  let log = ''; const cap = s2 => { log += s2 + '\n'; };
  mod.printErr = cap; mod.print = cap;
  let code; try { code = mod.callMain(args); } catch (e) { code = typeof e?.status === 'number' ? e.status : 1; if (!log) log = String(e); }
  if (code !== 0) throw new Error('qpdf: ' + (log.trim() || 'mã lỗi ' + code));
  const out = mod.FS.readFile('/' + outName); try { mod.FS.unlink('/' + outName); mod.FS.unlink('/' + inName); } catch { /* ignore */ }
  return out;
}
async function attachScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = src; s.async = true; s.referrerPolicy = 'no-referrer';
    s.onload = () => resolve(); s.onerror = () => reject(new Error('Không tải được ' + src)); document.head.append(s);
  });
}
async function loadLibraries() {
  if (librariesLoading) return librariesLoading;
  librariesLoading = (async () => {
    const vendor = globalThis.EpsilonSoftVendor || {};
    // Offline / portable build: the host may bundle both libraries.
    if (vendor.PDFLib?.PDFDocument && vendor.pdfjs?.getDocument) {
      if (vendor.pdfWorkerSrc) vendor.pdfjs.GlobalWorkerOptions.workerSrc = vendor.pdfWorkerSrc;
      return { PDFLib: vendor.PDFLib, pdfjs: vendor.pdfjs, remote: false };
    }
    if (!window.PDFLib?.PDFDocument) await attachScript(PDFLIB_CDN);
    if (!window.PDFLib?.PDFDocument) throw Error('Không nhận được thư viện pdf-lib.');
    const pdfjs = await import(/* @vite-ignore */ PDFJS_CDN);
    pdfjs.GlobalWorkerOptions.workerSrc = PDFWORKER_CDN;
    return { PDFLib: window.PDFLib, pdfjs, remote: true };
  })().catch(err => { librariesLoading = null; throw new Error('Không tải được thư viện PDF.js/pdf-lib từ CDN. Công cụ PDF cần Internet để lấy thư viện; tài liệu chỉ được xử lý trong trình duyệt. Chi tiết: ' + String(err?.message || err)); });
  return librariesLoading;
}

/* ------------------------------------------------------------- helpers --- */
function humanBytes(bytes) { return bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`; }
function cleanName(name) { return String(name || 'tai-lieu').replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 100) || 'tai-lieu'; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function rgbHex(v, PDFLib) { const n = (String(v || '#1b2c75').match(/^#([a-f0-9]{6})$/i) || [])[1] || '1b2c75'; return PDFLib.rgb(parseInt(n.slice(0, 2), 16) / 255, parseInt(n.slice(2, 4), 16) / 255, parseInt(n.slice(4, 6), 16) / 255); }
const MM = 72 / 25.4;
const isEncryptedError = e => e?.name === 'EncryptedPDFError' || /is encrypted/i.test(String(e?.message));
const latin1 = bytes => new TextDecoder('latin1').decode(bytes);

async function canvasToBytes(canvas, type = 'image/png', quality = .9) {
  const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error('Không tạo được ảnh xuất.')), type, quality));
  return new Uint8Array(await blob.arrayBuffer());
}
/** Render text (Vietnamese safe) to a PNG; pdf-lib standard fonts cannot draw Vietnamese. */
async function pngFromText(text, { size = 24, color = '#142d91', opacity = 1 } = {}) {
  // Resizing a canvas resets its 2D state (font included), so keep the font string separately.
  const ratio = 3, font = `700 ${size * ratio}px Arial, "Segoe UI", sans-serif`, lines = String(text).split('\n').slice(0, 10);
  const canvas = document.createElement('canvas'), measure = canvas.getContext('2d'); measure.font = font;
  const width = clamp(Math.ceil(Math.max(...lines.map(l => measure.measureText(l || ' ').width)) + 12 * ratio), 30, 4096), height = Math.ceil((size * 1.35 * lines.length + 6) * ratio);
  canvas.width = width; canvas.height = height; const c = canvas.getContext('2d'); c.globalAlpha = opacity; c.font = font; c.fillStyle = color; c.textBaseline = 'top'; lines.forEach((line, i) => c.fillText(line, 6 * ratio, (3 + size * 1.35 * i) * ratio));
  return { data: await canvasToBytes(canvas), width: width / ratio, height: height / ratio };
}
/** Crop a transparent canvas to its visible pixels (signature pad leaves big empty margins). */
function trimCanvas(src, pad = 6) {
  const g = src.getContext('2d', { willReadFrequently: true }), { width: W, height: H } = src, d = g.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1; out.getContext('2d').drawImage(src, x0, y0, out.width, out.height, 0, 0, out.width, out.height); return out;
}
/** EXIF orientation of a JPEG (1 when absent). Phone photos are often stored sideways with a tag. */
function jpegOrientation(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return 1;
  let p = 2;
  while (p + 4 < b.length) {
    if (b[p] !== 0xff) return 1;
    const marker = b[p + 1], len = (b[p + 2] << 8) | b[p + 3];
    if (marker === 0xe1 && latin1(b.subarray(p + 4, p + 8)) === 'Exif') {
      const t = p + 10, le = b[t] === 0x49; const r16 = o => le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1];
      const r32 = o => le ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0 : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
      const ifd = t + r32(t + 4), n = r16(ifd);
      for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (e + 10 > b.length) break; if (r16(e) === 0x0112) return r16(e + 8) || 1; }
      return 1;
    }
    if (marker === 0xda) return 1;
    p += 2 + len;
  }
  return 1;
}
/**
 * Prepare any browser-readable image for pdf-lib: JPEG/PNG bytes are embedded as-is when safe;
 * rotated phone photos, WebP, GIF, BMP, AVIF... are re-encoded through a canvas.
 */
async function prepareImage(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (isJpg && jpegOrientation(bytes) === 1) return { kind: 'jpg', bytes };
  if (isPng) return { kind: 'png', bytes, fallback: () => reencode(file, 'image/png') };
  return reencode(file, isJpg ? 'image/jpeg' : (/png|gif|webp|avif|bmp|svg/i.test(file.type) ? 'image/png' : 'image/jpeg'));
}
async function reencode(file, type) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { throw Error(/\.(heic|heif)$/i.test(file.name) ? `Ảnh HEIC (${file.name}) chưa đọc được trên trình duyệt này. Hãy chuyển sang JPG bằng Image Studio trên Safari, hoặc đặt iPhone chụp ở chế độ "Tương thích nhất".` : `Không đọc được ảnh ${file.name}.`); }
  const k = Math.min(1, 6000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext('2d'); if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
  g.drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
  return { kind: type === 'image/png' ? 'png' : 'jpg', bytes: await canvasToBytes(c, type, 0.92) };
}
async function embedPrepared(doc, img) {
  try { return img.kind === 'png' ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes); }
  catch (e) { if (img.fallback) { const again = await img.fallback(); return again.kind === 'png' ? doc.embedPng(again.bytes) : doc.embedJpg(again.bytes); } throw e; }
}

/* ------------------------------------------------------------ template --- */
/*
 * Layout (desktop, laptop, tablet landscape): three columns that fill one screen.
 *   left  = task list   |  centre = the document (page grid, file list or page viewer)  |  right = options of the task
 * The page never needs scrolling: only lists inside a column scroll. Below 1024px the columns stack.
 * Host classes reused from app.js: button*, pdf-fileline, pdf-fileicon, pdf-topactions, pdf-dropzone,
 * pdf-drop-icon, pdf-drop-actions, pdf-viewer-toolbar, pdf-icon-btn, pdf-preview-area, pdf-busy, pdf-message.
 */
const EXTRA_STYLE_ID = 'es-pdf-studio-layout-v2';
const EXTRA_CSS = `
.pdf-studio.ps{--ps-line:#dfe3fb;display:flex;flex-direction:column;gap:8px;min-height:0;color:#132565;font-size:16px}
.ps.ps-fit{height:var(--ps-h,auto)}
.ps .ps-top{display:flex;align-items:center;gap:12px;justify-content:space-between;padding:7px 10px 7px 12px;background:#fff;border:1px solid var(--ps-line);border-radius:14px;flex-wrap:wrap}
.ps .pdf-fileline b{font-size:17px;max-width:520px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ps .pdf-fileicon{padding:7px}
.ps .pdf-topactions{gap:6px}
.ps .pdf-topactions .button{min-height:40px;padding:6px 12px}
.ps .pdf-notice{margin:0;padding:7px 12px;border-radius:10px;background:#fff7e6;border:1px solid #f3d9a4;color:#7a4a00;font-size:16px;line-height:1.4}
.ps .pdf-notice:empty{display:none}
.ps .pdf-message{margin:0}
.ps .ps-body{flex:1;min-height:0;display:grid;grid-template-columns:clamp(200px,14vw,236px) minmax(0,1fr) clamp(296px,22vw,350px);gap:8px}
.ps .ps-col{background:#fff;border:1px solid var(--ps-line);border-radius:14px;min-height:0;min-width:0}
.ps .ps-tasks{padding:8px;overflow:hidden;display:flex;flex-direction:column;gap:0}
/* Keep My Files outside the scrollable list: always accessible while browsing tasks. */
.ps .ps-tasks-pin{flex:0 0 auto;padding-bottom:8px;background:#fff;border-bottom:1px solid var(--ps-line)}
.ps .ps-tasks-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:2px;padding-top:6px}
.ps .ps-task.ps-task-files{margin:0;padding:12px 12px;border-radius:12px;background:linear-gradient(115deg,#6a34ea,#8450f4);color:#fff;font-size:17px;font-weight:850;box-shadow:0 6px 16px #5121bc33;border:0}
.ps .ps-task-files .svg-icon{width:22px;height:22px;color:#fff}
.ps .ps-task-files:hover{filter:brightness(1.05)}
.ps .ps-task-files[aria-current="true"]{outline:3px solid #d8c7ff;outline-offset:1px}
.ps .ps-task-files .ps-files-badge{margin-left:auto;background:#ffffff33;border-radius:999px;padding:1px 10px;font-size:16px;font-weight:800}
.ps .ps-task-files .ps-files-badge:empty{display:none}
.ps .ps-group{font-size:16px;font-weight:850;color:#8590b8;padding:8px 10px 3px}
.ps .ps-group:first-child{padding-top:4px}
.ps .ps-task{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;border-radius:10px;padding:8px 10px;text-align:left;font-size:16px;font-weight:750;color:#22348f;line-height:1.25;white-space:nowrap}
.ps .ps-task .svg-icon{width:20px;height:20px;flex-shrink:0;color:#6a4be0}
.ps .ps-task:hover{background:#f1efff}
.ps .ps-task[aria-current="true"]{background:linear-gradient(115deg,#5825d9,#6b34ee);color:#fff;box-shadow:0 5px 12px #5121bc2e}
.ps .ps-task[aria-current="true"] .svg-icon{color:#fff}
.ps .ps-task.ps-task-files:hover{background:linear-gradient(115deg,#6a34ea,#8450f4);color:#fff}
.ps .ps-task.ps-task-files .svg-icon{color:#fff}
.ps .ps-tasks-foot{margin-top:auto;padding-top:8px;border-top:1px solid var(--ps-line)}
.ps .ps-center{background:#f3f4fc;display:flex;flex-direction:column;overflow:hidden}
.ps .ps-view{flex:1;min-height:0;display:flex;flex-direction:column}
.ps .ps-view[hidden]{display:none!important}
.ps .ps-viewbar{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:7px 12px;background:#fff;border-bottom:1px solid var(--ps-line);min-height:52px;flex-wrap:wrap}
.ps .ps-viewbar b{font-size:16px;color:#1d2f8f}
.ps .ps-viewbar .ps-chips .button{min-height:36px;padding:4px 11px}
.ps .ps-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.ps .ps-grid{flex:1;min-height:0;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:14px;align-content:start}
.ps .ps-card{position:relative;background:#fff;border:2px solid #e1e6f8;border-radius:12px;padding:10px 8px 8px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:7px;cursor:pointer;user-select:none}
.ps .ps-card:hover{border-color:#b9a6f4}
.ps .ps-card:focus-visible{outline:3px solid #ffb900;outline-offset:2px}
.ps .ps-card canvas{max-width:100%;max-height:160px;width:auto;height:auto;box-shadow:0 2px 8px #1c31611f;background:#fff;flex-shrink:0}
.ps .ps-card span:last-child{line-height:1.2}
.ps .ps-card span{font-weight:800;font-size:16px;color:#273c8b}
.ps .ps-card.selected{border-color:#6930df;background:#f3edff}
.ps .ps-card.current{box-shadow:0 0 0 3px #ffdc0899}
.ps .ps-card.dragover{outline:3px dashed #8b6cf0;outline-offset:2px}
.ps .ps-check{position:absolute;top:6px;right:6px;width:28px;height:28px;border-radius:50%;background:#fff;border:2px solid #c3b6f3;display:grid;place-items:center;color:transparent}
.ps .ps-check .svg-icon{width:16px;height:16px;opacity:0}
.ps .ps-card.selected .ps-check .svg-icon{opacity:1}
.ps .ps-card.selected .ps-check{background:#6930df;border-color:#6930df;color:#fff}
.ps .ps-merge{flex:1;min-height:0;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:8px}
.ps .ps-mrow{display:grid;grid-template-columns:34px minmax(0,1fr) 84px 96px 120px;align-items:center;gap:10px;background:#fff;border:1px solid #e1e6f8;border-radius:12px;padding:9px 10px;font-size:16px}
.ps .ps-mrow.head{background:transparent;border:0;padding:0 10px;font-weight:850;color:#5a6aa0}
.ps .ps-mrow.current{border-color:#c9b8ff;background:#f8f5ff}
.ps .ps-mrow.dragover{outline:3px dashed #8b6cf0}
.ps .ps-mrow b{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.ps .ps-mrow small{display:block;color:#6a4be0;font-size:16px;font-weight:700}
.ps .ps-mrow .ps-num{font-weight:900;color:#6a4be0;text-align:center;cursor:grab}
.ps .ps-mactions{display:flex;gap:4px}
.ps .ps-mini{width:36px;height:36px;display:grid;place-items:center;border:1px solid #d7dcf6;border-radius:9px;background:#fff;color:#4b39c9;padding:0}
.ps .ps-mini:hover:not(:disabled){background:#f1efff}
.ps .ps-mini .svg-icon{width:18px;height:18px}
.ps .ps-mini.up .svg-icon{transform:rotate(-90deg)}.ps .ps-mini.down .svg-icon{transform:rotate(90deg)}
.ps .ps-mempty{flex:1;display:grid;place-items:center;text-align:center;color:#5a6aa0;border:2px dashed #c9bcf7;border-radius:14px;padding:24px;background:#fbfaff;min-height:180px}
.ps .ps-mempty p{margin:6px 0 12px}
.ps .ps-dropview{flex:1;display:flex;padding:14px;min-height:0}
.ps .ps-dropview .pdf-dropzone{flex:1;align-content:center;padding:24px 16px}
.ps .pdf-viewer-toolbar{padding:7px 12px;min-height:52px;flex-wrap:wrap;gap:8px}
.ps .pdf-viewer-toolbar>div{align-items:center;gap:6px}
.ps .ps-zoom{min-height:36px;padding:4px 11px}
.ps .pdf-preview-area{flex:1;min-height:0;padding:12px;align-items:center;justify-content:center}
.ps #pdf-canvas{max-width:none;max-height:none}
.ps #pdf-canvas.placing{cursor:crosshair}
.ps .ps-options{display:flex;flex-direction:column;overflow:hidden}
.ps .ps-panel{display:flex;flex-direction:column;min-height:0;flex:1}
.ps .ps-panel[hidden]{display:none!important}
.ps .ps-phead{padding:12px 14px 4px}
.ps .ps-phead h3{margin:0;font-size:19px;line-height:1.25;color:#19278c;display:flex;align-items:center;gap:8px}
.ps .ps-phead p{margin:5px 0 0;color:#5a6eaa;font-size:16px;line-height:1.45}
.ps .ps-pbody{flex:1;min-height:0;overflow:auto;padding:8px 14px 12px;display:flex;flex-direction:column;gap:12px}
.ps .ps-pfoot{padding:10px 14px 12px;border-top:1px solid var(--ps-line);display:grid;gap:7px;background:#fbfaff}
.ps .ps-pfoot .button{width:100%;min-height:44px}
.ps .ps-pfoot:empty{display:none}
.ps .ps-field{display:flex;flex-direction:column;gap:5px;font-weight:800;font-size:16px;color:#182a88;min-width:0}
.ps .ps-field input:not([type=color]):not([type=checkbox]):not([type=radio]),.ps .ps-field select{height:42px;border:1px solid #cbd5f9;border-radius:9px;padding:6px 10px;font-size:16px;color:#243d84;background:#fff;width:100%;min-width:0}
.ps .ps-field input[type=color]{height:42px;width:100%;padding:3px;border:1px solid #cbd5f9;border-radius:9px;background:#fff}
.ps .ps-field :focus-visible{outline:3px solid #b9a4f7;outline-offset:1px}
.ps .ps-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ps .ps-radio{display:flex;gap:9px;align-items:flex-start;font-weight:700;font-size:16px;padding:9px 10px;border:1px solid #e1e6ff;border-radius:10px;cursor:pointer;line-height:1.35;color:#1f2f80}
.ps .ps-radio:has(input:checked){border-color:#6930df;background:#f5f0ff}
.ps .ps-radio input[type=radio]{accent-color:#6429e3;width:18px;height:18px;margin:2px 0 0;flex-shrink:0}
.ps .ps-radio input[type=text],.ps .ps-radio input[type=number]{height:38px;border:1px solid #cbd5f9;border-radius:8px;padding:4px 8px;font-size:16px;color:#243d84;margin-top:6px;width:100%}
.ps .ps-radio input[type=number]{width:5.2em;margin:0 6px}
.ps .ps-inline{display:flex;align-items:center;font-weight:700;margin-top:6px}
.ps .ps-note{font-size:16px;line-height:1.45;color:#5a6eaa;margin:0}
.ps .ps-note.warn{color:#8c5711;background:#fff8e4;border:1px solid #f3d99a;border-radius:10px;padding:9px 11px}
.ps .ps-preview{font-weight:800;color:#087b65;background:#eefcf5;border:1px solid #b4ebd3;border-radius:10px;padding:9px 11px;margin:0;line-height:1.4}
.ps .ps-preview.bad{color:#a02349;background:#fff1f3;border-color:#f3b7c3}
.ps .ps-section{border-top:1px solid var(--ps-line);padding-top:12px;display:flex;flex-direction:column;gap:10px}
.ps .ps-section h4{margin:0;font-size:17px;color:#1d2f8f}
.ps .ps-btns{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ps .ps-btns .button{min-height:42px;padding:6px 9px;justify-content:flex-start;font-size:16px;white-space:nowrap}
.ps .ps-btns .button.wide{grid-column:1/-1}
.ps .ps-btns .button.is-on{background:#efe8ff;border-color:#6930df;color:#3d1aa8}
.ps #pdf-signature{width:100%;height:auto;aspect-ratio:8/3;background:#fff;border:1px dashed #9ea7f2;border-radius:11px;touch-action:none;cursor:crosshair;display:block}
.ps .ps-sign-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.ps .ps-sign-tools .button{min-height:38px;padding:5px 10px}
.ps .ps-sign-preview{max-height:54px;max-width:100%;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/10px 10px;border-radius:6px;border:1px solid #e2dcf7}
.ps .ps-check-line{display:flex;align-items:center;gap:9px;font-size:16px;font-weight:700;color:#1f2f80}
.ps .ps-check-line input{width:19px;height:19px;accent-color:#6429e3}
.ps .ps-dragging-files .ps-center{outline:3px dashed #8b6cf0;outline-offset:-4px}
.pdf-studio .pdf-dialog-backdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgba(14,13,58,.6);padding:16px;backdrop-filter:blur(4px)}
.pdf-studio .pdf-dialog{width:min(480px,100%);border-radius:18px;background:#fff;color:#142778;border:1px solid #d6ccff;padding:22px;box-shadow:0 28px 70px #10134f55}
.pdf-studio .pdf-dialog h3{font-size:21px;line-height:1.3;margin:0 0 9px;color:#231492}
.pdf-studio .pdf-dialog p{font-size:16px;line-height:1.5;margin:0 0 13px;color:#586a9b;overflow-wrap:anywhere}
.pdf-studio .pdf-dialog input{display:block;width:100%;min-height:44px;border:1px solid #c6b9ff;background:#faf9ff;border-radius:10px;padding:9px 12px;color:#142778;font-size:16px;margin:8px 0 16px}
.pdf-studio .pdf-dialog-actions{display:flex;flex-wrap:wrap;gap:9px;justify-content:flex-end}
.pdf-studio .pdf-dialog-actions button{min-height:42px;padding:8px 15px;font-size:16px}
@media (max-width:1200px){.ps .ps-body{grid-template-columns:186px minmax(0,1fr) 286px}.ps .ps-grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}.ps .ps-mrow{grid-template-columns:30px minmax(0,1fr) 78px 120px}.ps .ps-mrow .ps-size{display:none}}
@media (max-width:1023px){.ps.ps-fit{height:auto}.ps .ps-body{grid-template-columns:1fr}.ps .ps-tasks{flex-direction:row;flex-wrap:wrap;gap:2px;overflow:visible}.ps .ps-tasks-pin,.ps .ps-tasks-scroll{display:contents}.ps .ps-group,.ps .ps-tasks-foot{display:none}.ps .ps-task{width:auto}.ps .ps-center{height:68vh;min-height:420px}.ps .ps-options{overflow:visible}.ps .ps-pbody{overflow:visible}}
.ps .ps-files{flex:1;min-height:0;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.ps .ps-sec-head{display:flex;align-items:center;justify-content:space-between;gap:10px;font-weight:850;color:#1d2f8f;font-size:17px;padding:2px 2px 0}
.ps .ps-sec-head small{font-size:16px;font-weight:700;color:#6a76a8}
.ps .ps-sec-sep{border:0;border-top:2px dashed #cdc3f5;margin:6px 0 2px}
.ps .ps-fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:10px}
.ps .ps-fcard{position:relative;display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;align-items:center;background:#fff;border:2px solid #e1e6f8;border-radius:13px;padding:9px 10px 9px 9px;cursor:pointer;user-select:none;min-height:104px}
.ps .ps-fcard:hover{border-color:#b9a6f4}
.ps .ps-fcard.checked{border-color:#6930df;background:#f5f0ff}
.ps .ps-fcard.flash{animation:psflash 1.6s ease}
@keyframes psflash{0%,40%{box-shadow:0 0 0 4px #ffdc08}100%{box-shadow:none}}
.ps .ps-fthumb{width:72px;height:86px;border-radius:7px;background:#f1f3fb;border:1px solid #e3e7f6;object-fit:contain;display:block}
.ps .ps-fcard input[type=checkbox]{position:absolute;top:8px;left:8px;width:22px;height:22px;accent-color:#6429e3;margin:0;z-index:2;cursor:pointer}
.ps .ps-finfo{min-width:0;display:flex;flex-direction:column;gap:2px}
.ps .ps-finfo b{font-size:16px;line-height:1.25;font-weight:800;color:#172a86;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.ps .ps-finfo span{font-size:16px;color:#5f6c9c;line-height:1.3}
.ps .ps-finfo .origin{color:#6a4be0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ps .ps-factions{display:flex;gap:4px;margin-top:4px}
.ps .ps-fempty{border:2px dashed #d7cff7;border-radius:12px;padding:14px;text-align:center;color:#6a76a8;background:#fbfaff}
.ps .ps-target{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:7px 12px;background:#fffbe8;border-bottom:1px solid #f1e3a6;min-height:48px}
.ps .ps-target>span{font-weight:800;color:#7a5a00}
.ps .ps-target b{font-size:17px;color:#172a86;overflow-wrap:anywhere}
.ps .ps-target small{font-size:16px;color:#5f6c9c}
.ps .ps-target select{height:38px;border:1px solid #e3cf7a;border-radius:9px;padding:4px 10px;font-size:16px;font-weight:800;color:#172a86;background:#fff;max-width:100%}
.ps .ps-tag{display:inline-block;font-size:16px;font-weight:800;border-radius:999px;padding:1px 9px;background:#efe9ff;color:#5b2fd3}
.ps .ps-tag.new{background:#e6f9f0;color:#087b65}
.ps .ps-empty{flex:1;display:grid;place-items:center;text-align:center;padding:24px;color:#4e5d92}
.ps .ps-empty h3{margin:10px 0 6px;font-size:22px;color:#21259a}
.ps .ps-empty p{margin:0 0 14px;font-size:16px;line-height:1.5;max-width:520px}
.ps .ps-sel-list{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:4px;font-size:16px;color:#1f2f80}
.ps .ps-sel-list li{overflow-wrap:anywhere}
.ps .ps-scope{display:flex;flex-direction:column;gap:6px;border:1px solid #f1e3a6;background:#fffbe8;border-radius:11px;padding:9px 10px}
.ps .ps-scope:empty{display:none}
.ps .ps-scope>b{font-size:16px;color:#7a5a00}
.ps .ps-scope label{display:flex;gap:8px;align-items:flex-start;font-size:16px;font-weight:700;color:#1f2f80;cursor:pointer;line-height:1.35}
.ps .ps-scope input{accent-color:#6429e3;width:18px;height:18px;margin-top:2px;flex-shrink:0}
.ps .ps-pad{width:100%;height:auto;aspect-ratio:8/3;background:#fff;border:1px dashed #9ea7f2;border-radius:11px;touch-action:none;cursor:crosshair;display:block}
.ps .ps-sign-tools .ps-sign-preview{max-height:46px}
`;

/** Task list. `single`: works on one ticked file. `view`: what the centre column shows. */
const TASKS = [
  { id: 'files', icon: 'files', label: 'My Files', view: 'files' },
  { group: 'Trang & tệp' },
  { id: 'merge', icon: 'stamp', label: 'Ghép PDF', view: 'merge' },
  { id: 'split', icon: 'scissors', label: 'Cắt / Trích trang', view: 'grid', single: true },
  { id: 'organize', icon: 'grid', label: 'Sắp xếp trang', view: 'grid', single: true },
  { id: 'scan', icon: 'refresh', label: 'Sửa bản scan', view: 'grid', single: true, batch: true },
  { group: 'Chỉnh sửa' },
  { id: 'sign', icon: 'pen', label: 'Ký tên', view: 'viewer', single: true },
  { id: 'initial', icon: 'check', label: 'Ký nháy', view: 'viewer', single: true, batch: true },
  { id: 'seal', icon: 'stamp', label: 'Đóng dấu', view: 'viewer', single: true, batch: true },
  { id: 'stamp', icon: 'file', label: 'Số trang, dấu mờ', view: 'viewer', single: true, batch: true },
  { id: 'edit', icon: 'notes', label: 'Chèn chữ, hình', view: 'viewer', single: true },
  { group: 'Tối ưu & chuyển đổi' },
  { id: 'compress', icon: 'settings', label: 'Nén PDF', view: 'viewer', single: true },
  { id: 'protect', icon: 'shield', label: 'Mật khẩu & bảo vệ', view: 'viewer', single: true, batch: true },
  { id: 'toimg', icon: 'image', label: 'PDF → Ảnh, chữ', view: 'viewer', single: true },
  { id: 'fromimg', icon: 'upload', label: 'Ảnh → PDF', view: 'images' },
];
const TASK_BY_ID = Object.fromEntries(TASKS.filter(t => t.id).map(t => [t.id, t]));
TASK_BY_ID.about = { id: 'about', icon: 'info', label: 'Lưu ý sử dụng', view: 'note' };
TASK_BY_ID.merge.icon = 'files'; TASK_BY_ID.files.icon = 'box';
const MAX_FILES = 40;

function template() {
  const taskButton = t => t.id === 'files'
    ? `<button class="ps-task ps-task-files" type="button" data-task="files" aria-current="false">${icon('box', 22)}<span>My Files</span><span class="ps-files-badge" id="ps-files-badge"></span></button>`
    : `<button class="ps-task" type="button" data-task="${t.id}" aria-current="false">${icon(t.icon, 20)}<span>${t.label}</span></button>`;
  return `<section class="pdf-studio ps" aria-label="PDF Studio">
 <header class="ps-top">
  <div class="pdf-fileline"><span class="pdf-fileicon">${icon('pdf', 22)}</span><div><b id="pdf-file-name">My Files trống</b><small id="pdf-file-meta">Tệp chỉ nằm trong bộ nhớ trình duyệt, không tải lên mạng</small></div></div>
  <div class="pdf-topactions">
   <button class="button button-outline" type="button" id="ps-upload">${icon('upload', 20)} Tải lên PDF</button>
   <button class="button button-outline" type="button" id="pdf-undo" disabled title="Hoàn tác (Ctrl+Z)">${icon('rotate', 18)} Hoàn tác</button>
   <button class="button button-outline" type="button" id="pdf-redo" disabled title="Làm lại (Ctrl+Y)">${icon('refresh', 18)} Làm lại</button>
   <button class="button button-purple" type="button" id="pdf-save" disabled>${icon('download', 20)} Tải tệp này</button>
  </div>
 </header>
 <p class="pdf-notice" id="pdf-notice" role="note"></p>
 <div class="pdf-message" role="alert" id="pdf-error" hidden></div>
 <div class="ps-body">
  <nav class="ps-col ps-tasks" aria-label="Chọn tác vụ">
   <div class="ps-tasks-pin">${taskButton(TASK_BY_ID.files)}</div>
   <div class="ps-tasks-scroll">
    ${TASKS.filter(t => t.id !== 'files').map(t => t.group ? `<div class="ps-group">${t.group}</div>` : taskButton(t)).join('')}
    <div class="ps-tasks-foot">${taskButton(TASK_BY_ID.about)}</div>
   </div>
  </nav>
  <main class="ps-col ps-center" aria-label="Vùng làm việc">
   <div class="ps-target" id="ps-target" hidden></div>
   <div class="ps-view" data-view="files">
    <div class="ps-viewbar"><b id="ps-files-title">My Files</b><div class="ps-chips">
     <button class="button button-purple button-sm" type="button" data-op="upload">${icon('upload', 18)} Tải lên PDF</button>
     <button class="button button-soft button-sm" type="button" data-check="all">Chọn tất cả</button>
     <button class="button button-plain button-sm" type="button" data-check="none">Bỏ chọn</button></div></div>
    <div class="ps-files" id="ps-files"></div>
   </div>
   <div class="ps-view" data-view="empty" hidden><div class="ps-empty" id="ps-empty"></div></div>
   <div class="ps-view" data-view="grid" hidden>
    <div class="ps-viewbar"><b id="ps-grid-title">Chọn trang</b><div class="ps-chips">
     <button class="button button-soft button-sm" type="button" data-select="all">Tất cả</button>
     <button class="button button-soft button-sm" type="button" data-select="odd">Trang lẻ</button>
     <button class="button button-soft button-sm" type="button" data-select="even">Trang chẵn</button>
     <button class="button button-plain button-sm" type="button" data-select="none">Bỏ chọn</button></div></div>
    <div class="ps-grid" id="ps-grid" aria-label="Các trang của tệp" aria-multiselectable="true" role="listbox"></div>
   </div>
   <div class="ps-view" data-view="merge" hidden>
    <div class="ps-viewbar"><b id="ps-merge-title">Thứ tự ghép</b><div class="ps-chips"><button class="button button-soft button-sm" type="button" data-task-go="files">${icon('box', 18)} Chọn tệp ở My Files</button></div></div>
    <div class="ps-merge" id="ps-merge"></div>
   </div>
   <div class="ps-view" data-view="images" hidden>
    <div class="ps-viewbar"><b id="ps-img-title">Ảnh sẽ ghép thành PDF</b><div class="ps-chips"><button class="button button-purple button-sm" type="button" data-op="images">${icon('upload', 18)} Thêm ảnh</button><button class="button button-plain button-sm" type="button" data-op="images-clear">${icon('trash', 18)} Bỏ hết</button></div></div>
    <div class="ps-merge" id="ps-images"></div>
   </div>
   <div class="ps-view" data-view="viewer" hidden>
    <div class="pdf-viewer-toolbar"><b id="pdf-view-info">Trang 1</b><div>
     <button class="button button-plain button-sm ps-zoom" type="button" id="ps-zoom">Vừa chiều rộng</button>
     <button class="pdf-icon-btn" data-preview="prev" type="button" aria-label="Trang trước">${icon('arrow', 19)}</button>
     <button class="pdf-icon-btn" data-preview="next" type="button" aria-label="Trang sau">${icon('arrow', 19)}</button></div></div>
    <div class="pdf-preview-area" id="pdf-preview-area"><div class="pdf-preview-message" id="pdf-preview-message" hidden></div><canvas id="pdf-canvas" aria-label="Nội dung trang PDF"></canvas></div>
   </div>
  </main>
  <aside class="ps-col ps-options" id="ps-options" aria-label="Tùy chọn của tác vụ"></aside>
 </div>
 <input id="pdf-open-input" type="file" accept="application/pdf,.pdf" multiple hidden>
 <input id="pdf-images-input" type="file" accept="image/*" multiple hidden>
 <input id="pdf-append-images-input" type="file" accept="image/*" multiple hidden>
 <input id="pdf-stamp-input" type="file" accept="image/*" hidden>
 <input id="pdf-signfile-input" type="file" accept="image/png,image/*" hidden>
 <input id="pdf-initialfile-input" type="file" accept="image/png,image/*" hidden>
 <input id="pdf-sealfile-input" type="file" accept="image/png,image/*" hidden>
 <div class="pdf-busy" id="pdf-busy" hidden role="status"><span class="spin"></span><span id="pdf-busy-label">Đang xử lý tài liệu...</span></div>
</section>`;
}
const field = (label, control) => `<label class="ps-field"><span>${label}</span>${control}</label>`;
const downloadNow = id => `<label class="ps-check-line"><input type="checkbox" id="${id}"> Tải về máy ngay sau khi tạo</label>`;
/** Right-column panels: head (what the task does), body (its options), foot (its main actions). */
const PANELS = {
  files: {
    title: 'My Files', desc: 'Mọi tệp trong phiên làm việc. Tích chọn tệp, rồi chọn tác vụ bên trái: tác vụ chỉ xử lý tệp đã tích.',
    body: `<p class="ps-preview" id="ps-files-count"></p>
     <ol class="ps-sel-list" id="ps-sel-list"></ol>
     <p class="ps-note">Tệp tải lên được tích sẵn. Tệp mới tạo (ghép, trích, bản sửa) nằm ở ngăn dưới; tích vào để xử lý tiếp. Tệp gốc không bao giờ bị sửa: chỉnh sửa luôn tạo bản mới.</p>`,
    foot: `<button class="button button-purple" type="button" data-op="download-checked">${icon('download', 20)} <span id="ps-dl-label">Tải tệp đã chọn</span></button>
     <button class="button button-outline" type="button" data-op="remove-checked">${icon('trash', 20)} Xóa tệp đã chọn khỏi phiên</button>`,
  },
  merge: {
    title: 'Ghép PDF', desc: 'Ghép các tệp đã tích ở My Files. Sắp thứ tự ở giữa bằng kéo thả hoặc nút lên/xuống.',
    body: `${field('Tên tệp kết quả', '<input id="ps-merge-name" type="text" maxlength="100" placeholder="tai-lieu-da-ghep">')}
     <p class="ps-preview" id="ps-merge-preview"></p>
     ${downloadNow('ps-merge-dl')}
     <p class="ps-note">Kết quả là tệp mới trong My Files (ngăn "Tệp mới tạo"). Các tệp nguồn giữ nguyên.</p>`,
    foot: `<button class="button button-purple" type="button" data-op="merge-run">${icon('files', 20)} Ghép thành tệp mới</button>`,
  },
  split: {
    title: 'Cắt / Trích trang', desc: 'Bấm vào trang ở giữa để chọn. Giữ Shift để chọn một dải liên tiếp.',
    body: `${field('Trang đã chọn', '<input id="ps-range" type="text" maxlength="200" placeholder="VD: 1,3-5" autocomplete="off">')}
     <div class="ps-field"><span>Cách tách</span>
      <label class="ps-radio"><input type="radio" name="ps-split" value="one" checked><span>Trang đã chọn → 1 tệp</span></label>
      <label class="ps-radio"><input type="radio" name="ps-split" value="each"><span>Mỗi trang đã chọn → 1 tệp</span></label>
      <label class="ps-radio"><input type="radio" name="ps-split" value="every"><span>Chia đều cả tệp<span class="ps-inline">mỗi<input id="ps-split-n" type="number" min="1" max="500" value="2">trang</span></span></label>
      <label class="ps-radio"><input type="radio" name="ps-split" value="ranges"><span style="flex:1">Theo nhiều khoảng<input id="ps-split-ranges" type="text" maxlength="300" placeholder="1-3; 4-8; 9-12"></span></label>
     </div>
     <p class="ps-preview" id="ps-split-preview"></p>
     ${downloadNow('ps-split-dl')}`,
    foot: `<button class="button button-purple" type="button" data-op="split-run">${icon('scissors', 20)} Tạo tệp mới</button>`,
  },
  organize: {
    title: 'Sắp xếp trang', desc: 'Kéo thả hình trang để đổi thứ tự. Chọn trang rồi dùng các nút bên dưới.',
    body: `<p class="ps-preview" id="ps-org-info"></p>
     <div class="ps-btns">
      <button class="button button-outline" data-op="rotate-left" type="button">${icon('rotate', 18)} Xoay trái</button>
      <button class="button button-outline" data-op="rotate-right" type="button">${icon('refresh', 18)} Xoay phải</button>
      <button class="button button-outline" data-op="move-left" type="button">${icon('arrow', 18)} Lên trước</button>
      <button class="button button-outline" data-op="move-right" type="button">${icon('arrow', 18)} Xuống sau</button>
      <button class="button button-outline wide" data-op="delete" type="button">${icon('trash', 18)} Xóa trang đã chọn</button>
     </div>
     <div class="ps-section"><h4>Cắt lề trang đã chọn</h4>
      <div class="ps-row2">${field('Lề (mm)', '<input id="pdf-crop-mm" type="number" min="0" max="30" value="5">')}<div class="ps-field"><span>&nbsp;</span><button class="button button-outline" data-op="crop" type="button">${icon('scissors', 18)} Cắt lề</button></div></div></div>
     <div class="ps-section"><h4>Thêm ảnh vào cuối tệp</h4><button class="button button-outline" data-op="append-images" type="button">${icon('image', 18)} Chọn ảnh</button></div>
     <p class="ps-note">Sửa tệp tải lên sẽ tạo bản sửa trong "Tệp mới tạo"; tệp gốc giữ nguyên.</p>`,
    foot: '',
  },
  edit: {
    title: 'Chèn chữ, hình', desc: 'Bấm nút nội dung cần chèn, rồi nhấp vào vị trí trên trang ở giữa.',
    body: `${field('Nội dung chữ', '<input type="text" id="pdf-text" maxlength="300" value="Ghi chú của tôi" placeholder="Nội dung tiếng Việt">')}
     <div class="ps-row2">${field('Cỡ chữ (pt)', '<input type="number" id="pdf-text-size" min="6" max="100" value="14">')}${field('Màu', '<input type="color" id="pdf-color" value="#182d93">')}</div>
     <div class="ps-btns">
      <button class="button button-outline" data-op="place-text" type="button">${icon('pen', 18)} Chữ</button>
      <button class="button button-outline" data-op="place-date" type="button">${icon('calendar', 18)} Ngày</button>
      <button class="button button-outline" data-op="place-highlight" type="button">${icon('lightbulb', 18)} Tô sáng</button>
      <button class="button button-outline" data-op="place-rect" type="button">${icon('area', 18)} Khung</button>
      <button class="button button-outline" data-op="place-whiteout" type="button">${icon('area', 18)} Che trắng</button>
      <button class="button button-outline" data-op="place-image" type="button">${icon('image', 18)} Ảnh, dấu</button>
     </div>
     ${field('Rộng ảnh / con dấu (mm)', '<input type="number" id="pdf-item-mm" min="5" max="200" value="40">')}
     <p class="ps-note" id="pdf-place-status">Chưa chọn nội dung để chèn.</p>
     <p class="ps-note">"Che trắng" chỉ che phần nhìn thấy, chữ bên dưới vẫn trích xuất được.</p>`,
    foot: '',
  },
  sign: {
    title: 'Ký tên', desc: 'Ký trong khung (hoặc tải ảnh chữ ký), bấm "Đặt chữ ký", rồi nhấp lên trang.',
    body: `<canvas id="pdf-signature" width="960" height="360" aria-label="Vùng ký tay"></canvas>
     <div class="ps-sign-tools"><button class="button button-plain" data-op="clear-sign" type="button">${icon('trash', 18)} Xóa</button><button class="button button-plain" data-op="sign-file" type="button">${icon('upload', 18)} Tải ảnh</button><input type="color" id="pdf-ink" value="#1a2fa0" aria-label="Màu nét ký" title="Màu nét ký" style="width:46px;height:38px;border:1px solid #cbd5f9;border-radius:8px;padding:2px"></div>
     <img class="ps-sign-preview" id="pdf-sign-preview" alt="Ảnh chữ ký đã tải" hidden>
     ${field('Rộng chữ ký khi đặt (mm)', '<input type="number" id="pdf-sign-mm" min="10" max="200" value="45">')}
     <p class="ps-note" id="pdf-sign-status">Ảnh chữ ký nền trong suốt có thể tạo bằng Image Studio → Tách nền chữ ký.</p>
     <p class="ps-note">Đây là chữ ký dạng hình ảnh, không phải chữ ký số có chứng thực.</p>`,
    foot: `<button class="button button-purple" data-op="place-sign" type="button">${icon('pen', 20)} Đặt chữ ký lên trang</button>`,
  },
  scan: {
    title: 'Sửa bản scan', desc: 'Các lỗi hay gặp khi scan giấy: sai thứ tự, scan hai mặt rời, trang trắng, nền xám.',
    body: `<div class="ps-scope" data-scope></div>
     <div class="ps-section" style="border:0;padding:0"><h4>Ghép xen kẽ hai mặt</h4>
      <p class="ps-note">Scan mặt trước cả xấp thành 1 tệp, mặt sau thành 1 tệp. Tích cả 2 tệp ở My Files rồi chọn:</p>
      <div class="ps-row2">${field('Mặt trước', '<select id="dup-front"></select>')}${field('Mặt sau', '<select id="dup-back"></select>')}</div>
      <label class="ps-check-line"><input type="checkbox" id="dup-reverse" checked> Mặt sau bị ngược (trang cuối trước)</label>
      <p class="ps-preview" id="dup-preview"></p>
      <button class="button button-outline" data-op="duplex" type="button">${icon('files', 18)} Ghép xen kẽ thành tệp mới</button></div>
     <div class="ps-section"><h4>Trang trắng</h4>
      ${field('Độ nhạy', '<select id="blank-sens"><option value="0.0015">Chỉ trang thật trắng</option><option value="0.004" selected>Vừa (bỏ qua bụi, vết bẩn nhỏ)</option><option value="0.01">Mạnh (cả trang gần trắng)</option></select>')}
      <div class="ps-btns"><button class="button button-outline" data-op="blank-find" type="button">${icon('search', 18)} Tìm, đánh dấu</button><button class="button button-outline" data-op="delete" type="button">${icon('trash', 18)} Xóa trang chọn</button>
      <button class="button button-outline wide" data-op="blank-remove" type="button">${icon('trash', 18)} <span id="blank-run-label">Tự xóa trang trắng</span></button></div>
      <p class="ps-note" id="blank-info">"Tìm, đánh dấu" chọn sẵn các trang trắng ở lưới để anh xem lại trước khi xóa.</p></div>
     <div class="ps-section"><h4>Thứ tự trang</h4><button class="button button-outline" data-op="reverse" type="button">${icon('swap', 18)} <span id="reverse-label">Đảo ngược thứ tự trang</span></button></div>
     <div class="ps-section"><h4>Làm sạch bản scan</h4>
      ${field('Kiểu', '<select id="clean-mode"><option value="white">Làm trắng nền, giữ màu</option><option value="bw">Đen trắng, chữ rõ nét</option></select>')}
      ${field('Độ phân giải', '<select id="clean-dpi"><option value="150">150 dpi (nhẹ)</option><option value="200" selected>200 dpi (rõ)</option><option value="300">300 dpi (in ấn)</option></select>')}
      <button class="button button-outline" data-op="clean" type="button">${icon('lightbulb', 18)} <span id="clean-label">Làm sạch</span></button>
      <p class="ps-note warn">Làm sạch chuyển trang thành ảnh: không chọn được chữ. Dùng cho tài liệu scan, không dùng cho PDF có chữ gốc.</p></div>`,
    foot: '',
  },
  initial: {
    title: 'Ký nháy', desc: 'Chữ ký nhỏ ở góc từng trang. Xem trước ở giữa, rồi chạy cho một hoặc nhiều tệp.',
    body: `<div class="ps-scope" data-scope></div>
     <canvas id="pdf-initial" class="ps-pad" width="720" height="270" aria-label="Vùng ký nháy"></canvas>
     <div class="ps-sign-tools"><button class="button button-plain" data-op="clear-initial" type="button">${icon('trash', 18)} Xóa</button><button class="button button-plain" data-op="initial-file" type="button">${icon('upload', 18)} Tải ảnh</button><input type="color" id="pdf-initial-ink" value="#1a2fa0" aria-label="Màu nét ký nháy" title="Màu nét" style="width:46px;height:38px;border:1px solid #cbd5f9;border-radius:8px;padding:2px"></div>
     <img class="ps-sign-preview" id="pdf-initial-preview" alt="Ảnh chữ ký nháy đã tải" hidden>
     ${field('Vị trí', '<select id="ini-pos"><option value="br">Góc dưới phải</option><option value="bl">Góc dưới trái</option><option value="tr">Góc trên phải</option><option value="mr">Lề phải, giữa trang</option></select>')}
     <div class="ps-row2">${field('Rộng (mm)', '<input id="ini-mm" type="number" min="6" max="80" value="18">')}${field('Cách mép (mm)', '<input id="ini-margin" type="number" min="0" max="60" value="8">')}</div>
     ${field('Trang ký nháy', '<select id="ini-pages"><option value="skip-last">Mọi trang, trừ trang cuối</option><option value="all">Mọi trang</option><option value="skip-first">Mọi trang, trừ trang đầu</option><option value="custom">Tự chọn trang</option></select>')}
     <label class="ps-field" id="ini-range-wrap" hidden><span>Trang (áp cho mọi tệp)</span><input id="ini-range" type="text" maxlength="200" placeholder="VD: 1-3,5"></label>
     <p class="ps-preview" id="ini-preview"></p>`,
    foot: `<button class="button button-purple" data-op="initial-run" type="button">${icon('check', 20)} <span data-run-label>Ký nháy</span></button>`,
  },
  seal: {
    title: 'Đóng dấu', desc: 'Dấu treo ở trang đầu và dấu giáp lai ở mép phải các trang. Xem trước ở giữa.',
    body: `<div class="ps-scope" data-scope></div>
     <div class="ps-sign-tools"><button class="button button-outline" data-op="seal-file" type="button">${icon('upload', 18)} Tải ảnh con dấu</button><img class="ps-sign-preview" id="pdf-seal-preview" alt="Ảnh con dấu" hidden></div>
     <label class="ps-check-line"><input type="checkbox" id="seal-clean" checked> Tự xóa nền trắng của ảnh dấu</label>
     ${field('Đường kính dấu (mm)', '<input id="seal-mm" type="number" min="15" max="80" value="36">')}
     <div class="ps-section"><label class="ps-check-line"><input type="checkbox" id="hang-on" checked> <b>Dấu treo</b></label>
      <div class="ps-row2">${field('Cách trái (mm)', '<input id="hang-x" type="number" min="0" max="400" value="18">')}${field('Cách trên (mm)', '<input id="hang-y" type="number" min="0" max="400" value="10">')}</div>
      ${field('Trang', '<select id="hang-pages"><option value="first">Trang đầu</option><option value="all">Mọi trang</option></select>')}
      <p class="ps-note">Nhấp lên trang xem trước để đặt vị trí dấu treo.</p></div>
     <div class="ps-section"><label class="ps-check-line"><input type="checkbox" id="seam-on" checked> <b>Dấu giáp lai</b> (mép phải)</label>
      <div class="ps-row2">${field('Vị trí dọc', '<select id="seam-pos"><option value="center">Giữa trang</option><option value="upper">Phần trên</option><option value="lower">Phần dưới</option></select>')}${field('Tối đa trang/dấu', '<input id="seam-group" type="number" min="0" max="500" value="0" title="0 = mọi trang trong một dấu">')}</div>
      <p class="ps-note">Con dấu được chia đều cho các trang, xếp chồng mép phải lại là thành dấu hoàn chỉnh. "Tối đa trang/dấu" = 0: mọi trang chung một dấu.</p></div>
     <p class="ps-preview" id="seal-preview"></p>`,
    foot: `<button class="button button-purple" data-op="seal-run" type="button">${icon('stamp', 20)} <span data-run-label>Đóng dấu</span></button>`,
  },
  stamp: {
    title: 'Số trang, dấu mờ', desc: 'Áp dụng cho mọi trang của tệp. Chạy được cho một hoặc nhiều tệp.',
    body: `<div class="ps-scope" data-scope></div><div class="ps-section" style="border:0;padding:0"><h4>Đánh số trang</h4>
      <div class="ps-row2">${field('Kiểu số', '<select id="pdf-number-format"><option value="n">1</option><option value="trang">Trang 1</option><option value="nN">1 / 10</option><option value="trangN">Trang 1 / 10</option></select>')}${field('Bắt đầu từ', '<input id="pdf-number-start" type="number" min="0" max="99999" value="1">')}</div>
      ${field('Vị trí', '<select id="pdf-number-position"><option value="bottom">Giữa cuối trang</option><option value="bottom-right">Góc dưới phải</option><option value="top">Giữa đầu trang</option><option value="top-right">Góc trên phải</option></select>')}
      <button class="button button-outline" data-op="number-pages" type="button">${icon('file', 18)} Đánh số trang</button></div>
     <div class="ps-section"><h4>Đóng dấu mờ</h4>
      ${field('Chữ đóng dấu', '<input id="pdf-watermark" type="text" maxlength="120" value="BẢN SAO" placeholder="BẢN SAO, MẬT, NỘI BỘ">')}
      <div class="ps-row2">${field('Kiểu', '<select id="pdf-wm-style"><option value="45">Chéo trang</option><option value="0">Nằm ngang</option></select>')}${field('Độ đậm', '<select id="pdf-wm-opacity"><option value="0.18">Nhạt</option><option value="0.3" selected>Vừa</option><option value="0.5">Đậm</option></select>')}</div>
      <button class="button button-outline" data-op="watermark" type="button">${icon('stamp', 18)} Đóng dấu mọi trang</button></div>`,
    foot: '',
  },
  protect: {
    title: 'Mật khẩu & bảo vệ', desc: 'Đặt mật khẩu, khóa quyền in/copy, hoặc gỡ bảo vệ khỏi tệp bạn mở được.',
    body: `<div class="ps-scope" data-scope></div>
     <div class="ps-field"><span>Việc cần làm</span>
      <label class="ps-radio"><input type="radio" name="ps-protect" value="set" checked><span>Đặt mật khẩu / khóa quyền</span></label>
      <label class="ps-radio"><input type="radio" name="ps-protect" value="remove"><span>Gỡ mật khẩu, bỏ khóa quyền</span></label></div>
     <div data-protect="set">
      ${field('Mật khẩu mở tệp', '<input id="pw-open" type="text" maxlength="100" autocomplete="off" placeholder="Để trống nếu chỉ khóa quyền">')}
      ${field('Nhập lại mật khẩu mở', '<input id="pw-open2" type="text" maxlength="100" autocomplete="off">')}
      <div class="ps-section"><label class="ps-check-line"><input type="checkbox" id="pw-restrict"> <b>Khóa quyền</b> (cần mật khẩu chủ để bỏ)</label>
       <div id="pw-restrict-box" hidden>
        ${field('Mật khẩu chủ', '<input id="pw-owner" type="text" maxlength="100" autocomplete="off" placeholder="Khác mật khẩu mở">')}
        <label class="ps-check-line"><input type="checkbox" id="pw-noprint"> Cấm in</label>
        <label class="ps-check-line"><input type="checkbox" id="pw-nocopy"> Cấm sao chép nội dung</label>
        <label class="ps-check-line"><input type="checkbox" id="pw-nomodify"> Cấm chỉnh sửa</label></div></div>
      <p class="ps-note">Mã hóa AES-256. Quên mật khẩu thì không mở lại được, hãy lưu kỹ.</p></div>
     <div data-protect="remove" hidden>
      <p class="ps-note">Chỉ gỡ được tệp bạn mở được: tệp không mật khẩu nhưng bị khóa quyền (sao kê, hóa đơn), hoặc tệp bạn biết mật khẩu. Tệp đang mở trong My Files vốn đã mở được, nên gỡ trực tiếp. Công cụ này không bẻ khóa tệp không rõ mật khẩu.</p></div>
     <p class="ps-preview" id="pw-preview"></p>
     ${downloadNow('pw-dl')}`,
    foot: `<button class="button button-purple" data-op="protect-run" type="button">${icon('shield', 20)} <span data-run-label>Áp dụng</span></button>`,
  },
  compress: {
    title: 'Nén PDF', desc: 'Giảm dung lượng tài liệu scan, làm phẳng biểu mẫu.',
    body: `<p class="ps-preview" id="ps-size-info"></p>
     ${field('Mức nén', '<select id="pdf-quality"><option value="150|0.75">Cân bằng – 150 dpi</option><option value="110|0.6">Nhỏ nhất – 110 dpi</option><option value="200|0.85">Rõ nét – 200 dpi</option></select>')}
     <p class="ps-note warn">Nén theo ảnh chuyển mỗi trang thành ảnh JPG: mất khả năng chọn chữ, tìm kiếm và biểu mẫu. Nếu bản nén không nhỏ hơn, không tạo tệp mới.</p>
     <div class="ps-section"><h4>Biểu mẫu</h4><button class="button button-outline" data-op="flatten" type="button">${icon('file', 18)} Làm phẳng biểu mẫu</button><p class="ps-note">Biến ô điền thành nội dung cố định, tránh hiển thị sai sau khi ghép hoặc tách.</p></div>`,
    foot: `<button class="button button-purple" data-op="compress" type="button">${icon('download', 20)} Nén PDF</button>`,
  },
  toimg: {
    title: 'PDF → Ảnh, chữ', desc: 'Xuất trang thành ảnh, hoặc lấy nội dung chữ. Tải thẳng về máy.',
    body: `<div class="ps-row2">${field('Định dạng', '<select id="pdf-image-format"><option value="png">PNG (rõ chữ)</option><option value="jpeg">JPG (nhẹ)</option></select>')}${field('Độ phân giải', '<select id="pdf-image-scale"><option value="2.0833">150 dpi</option><option value="4.1667">300 dpi</option><option value="1.3889">100 dpi</option></select>')}</div>
     <button class="button button-outline" data-op="page-image" type="button">${icon('image', 18)} Xuất trang đang xem</button>
     <div class="ps-section"><h4>Lấy nội dung chữ</h4><button class="button button-outline" data-op="to-text" type="button">${icon('file', 18)} PDF → TXT</button><p class="ps-note">Chỉ lấy được chữ có sẵn trong PDF; tài liệu scan ảnh cần OCR (chưa hỗ trợ).</p></div>`,
    foot: `<button class="button button-purple" data-op="all-images" type="button">${icon('download', 20)} Tất cả trang → ZIP ảnh</button>`,
  },
  fromimg: {
    title: 'Ảnh → PDF', desc: 'Thêm ảnh vào danh sách ở giữa, sắp thứ tự, rồi bấm tạo PDF. Ảnh chụp điện thoại được tự xoay đúng chiều.',
    body: `${field('Tên tệp PDF', '<input id="ps-img-name" type="text" maxlength="100" placeholder="anh-thanh-pdf">')}
     ${field('Khổ trang', '<select id="pdf-img-page"><option value="a4">A4, ảnh vừa trang</option><option value="fit">Theo kích thước ảnh</option></select>')}
     <p class="ps-preview" id="ps-img-preview"></p>
     <p class="ps-note" id="ps-img-done" hidden style="color:#087b65;font-weight:700"></p>
     ${downloadNow('ps-img-dl')}
     <p class="ps-note">Nhận JPG, PNG, WebP, GIF, BMP. Mỗi ảnh là một trang. Kết quả là tệp mới trong My Files.</p>`,
    foot: `<button class="button button-purple" data-op="images-run" type="button">${icon('pdf', 20)} <span id="ps-img-run">Tạo PDF</span></button>`,
  },
  about: {
    title: 'Lưu ý sử dụng', desc: 'Những điều nên biết trước khi dùng tài liệu chính thức.',
    body: `<p class="ps-note"><b>Quyền riêng tư.</b> Tài liệu chỉ được xử lý trong trình duyệt, không tải lên máy chủ. PDF Studio tải thư viện PDF.js và pdf-lib từ CDN (cần mạng). My Files không lưu lại: sau F5 hoặc đóng tab cần mở lại, nhớ tải các tệp mới tạo về máy.</p>
     <p class="ps-note"><b>Chữ ký số.</b> Chỉnh sửa tệp có chữ ký số làm chữ ký đó mất hiệu lực trên bản mới; tệp gốc vẫn nguyên vẹn.</p>
     <p class="ps-note"><b>Tệp có mật khẩu</b> được chuyển sang bản ảnh để xem, ghép, ký được.</p>
     <p class="ps-note"><b>Phiên bản:</b> <span id="ps-version"></span></p>
     <p class="ps-note"><b>Chưa hỗ trợ:</b> sửa chữ gốc trong PDF, OCR, chuyển Word/Excel chính xác, PDF/A, chữ ký số, xóa dữ liệu thật (redaction). "Che trắng" chỉ che phần nhìn thấy.</p>`,
    foot: '',
  },
};
/** "1,2,3,5,7,8" → "1-3, 5, 7-8" (1-based). */
function formatRanges(indexes) {
  const a = [...indexes].sort((x, y) => x - y), out = [];
  for (let i = 0; i < a.length; i++) {
    let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++;
    out.push(j > i ? `${a[i] + 1}-${a[j] + 1}` : `${a[i] + 1}`); i = j;
  }
  return out.join(', ');
}

/* --------------------------------------------------------------- mount --- */

/* --------------------------------------------------------------- mount --- */
export async function mount(root, ctx) {
  if (!document.getElementById(EXTRA_STYLE_ID)) { const st = document.createElement('style'); st.id = EXTRA_STYLE_ID; st.textContent = EXTRA_CSS; document.head.append(st); }
  root.innerHTML = template();
  const studio = root.querySelector('.pdf-studio');
  const find = s => studio.querySelector(s);
  /*
   * Session model ("My Files"): every uploaded or produced PDF is a record. Tasks only work on
   * ticked records (state.checked keeps the tick order, used as the merge order). Single-file
   * tasks work on state.activeId, one of the ticked records. Uploaded files are never modified:
   * the first edit makes a copy in "Tệp mới tạo" and work continues on that copy.
   */
  const state = { files: [], checked: [], activeId: null, seq: 0, task: 'files', libs: null, pdfView: null, viewFor: null, renderSerial: 0, thumbObserver: null, selected: new Set(), anchor: null, placed: null, stampFile: null, inked: false, signImage: null, dragFrom: null, busy: false, disposed: false, zoom: 'page', flash: new Set(), scopeAll: true, initialImage: null, seal: null, sliceCache: new Map(), images: [], imageSeq: 0 };
  const MAX_INPUT = 50 * 1024 * 1024;

  const optionsCol = find('#ps-options');
  for (const [id, p] of Object.entries(PANELS)) {
    const panel = document.createElement('section'); panel.className = 'ps-panel'; panel.dataset.panel = id; panel.hidden = true;
    panel.innerHTML = `<div class="ps-phead"><h3>${icon(TASK_BY_ID[id].icon, 22)} ${p.title}</h3><p>${p.desc}</p></div><div class="ps-pbody">${p.body}</div><div class="ps-pfoot">${p.foot}</div>`;
    optionsCol.append(panel);
  }

  /* ---- small helpers ---- */
  function showError(msg) { const el = find('#pdf-error'); el.hidden = false; el.textContent = String(msg); }
  function clearError() { const el = find('#pdf-error'); el.hidden = true; el.textContent = ''; }
  function say(msg) { ctx.showToast(msg, 'success'); }
  function progress(label) { find('#pdf-busy-label').textContent = label; }
  const recById = id => state.files.find(f => f.id === id) || null;
  const checkedRecs = () => state.checked.map(recById).filter(Boolean);
  function active() {
    if (!state.checked.includes(state.activeId)) state.activeId = state.checked[0] ?? null;
    return recById(state.activeId);
  }
  const pageCount = () => active()?.doc.getPageCount() || 0;
  const sortedSelection = () => [...state.selected].filter(i => i >= 0 && i < pageCount()).sort((a, b) => a - b);
  function selectedIndexes() { const a = sortedSelection(); return a.length ? a : [active()?.current || 0]; }
  function askDialog(kind, message) {
    return new Promise(resolve => {
      if (state.disposed || ctx.signal?.aborted) { resolve(null); return; }
      const modal = document.createElement('div');
      modal.className = 'pdf-dialog-backdrop';
      modal.innerHTML = `<section class="pdf-dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-dialog-title" aria-describedby="pdf-dialog-message">
        <h3 id="pdf-dialog-title"></h3><p id="pdf-dialog-message"></p>
        <input id="pdf-dialog-value" type="password" maxlength="128" autocomplete="off" aria-label="Mật khẩu PDF">
        <div class="pdf-dialog-actions"><button type="button" class="button button-outline" data-dialog="cancel">Hủy</button><button type="button" class="button button-purple" data-dialog="ok">${kind === 'password' ? 'Mở tệp' : 'Tiếp tục'}</button></div>
      </section>`;
      modal.querySelector('#pdf-dialog-title').textContent = kind === 'password' ? 'Nhập mật khẩu PDF' : 'Xác nhận';
      modal.querySelector('#pdf-dialog-message').textContent = message;
      const input = modal.querySelector('#pdf-dialog-value');
      if (kind !== 'password') input.hidden = true;
      const previous = document.activeElement;
      let settled = false;
      const finish = value => { if (settled) return; settled = true; ctx.signal?.removeEventListener('abort', onAbort); modal.remove(); if (previous?.isConnected) previous.focus?.(); resolve(value); };
      const onAbort = () => finish(null);
      modal.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); finish(null); }
        else if (event.key === 'Enter') { event.preventDefault(); finish(kind === 'password' ? input.value : true); }
        else if (event.key === 'Tab') {
          const controls = [...modal.querySelectorAll('input:not([hidden]),button')], from = controls.indexOf(document.activeElement);
          if (event.shiftKey && from === 0) { event.preventDefault(); controls.at(-1).focus(); }
          else if (!event.shiftKey && from === controls.length - 1) { event.preventDefault(); controls[0].focus(); }
        }
      });
      modal.addEventListener('click', e => {
        const action = e.target.closest('[data-dialog]');
        if (action) finish(action.dataset.dialog === 'cancel' ? null : (kind === 'password' ? input.value : true));
        else if (e.target === modal) finish(null);
      });
      ctx.signal?.addEventListener('abort', onAbort, { once: true });
      studio.append(modal);
      (kind === 'password' ? input : modal.querySelector('[data-dialog="ok"]')).focus();
    });
  }
  function setBusy(value, label = 'Đang xử lý tài liệu...') {
    state.busy = value; find('#pdf-busy').hidden = !value; find('#pdf-busy-label').textContent = label;
    studio.querySelectorAll('button').forEach(b => { if (!b.closest('.pdf-dialog')) b.disabled = value; });
    if (!value && !state.disposed) refreshChrome();
  }
  async function task(label, fn) { if (state.busy || state.disposed) return; setBusy(true, label); clearError(); try { await fn(); } catch (error) { console.error('PDF Studio:', error); showError(error?.message || 'Không thể thực hiện thao tác.'); ctx.showToast('Thao tác PDF không thành công.', 'error'); } finally { if (!state.disposed) setBusy(false); } }
  async function library() { if (state.libs) return state.libs; const libs = await loadLibraries(); if (state.disposed) throw Error('Phiên làm việc đã đóng.'); state.libs = libs; return libs; }

  /** Top bar, notice, undo/redo and download buttons follow the active file (or My Files totals). */
  function updateFilesBadge() { const el = find('#ps-files-badge'); if (el) el.textContent = state.files.length ? String(state.files.length) : ''; }
  function refreshChrome() {
    updateFilesBadge();
    const single = !!TASK_BY_ID[state.task].single, r = single ? active() : null;
    if (r) {
      find('#pdf-file-name').textContent = r.name; find('#pdf-file-name').title = r.name;
      find('#pdf-file-meta').textContent = `${r.doc.getPageCount()} trang · ${humanBytes(r.bytes.length)} · ${r.kind === 'upload' ? 'Tệp tải lên (gốc, không bị sửa)' : r.downloaded ? 'Tệp mới tạo, đã tải về' : 'Tệp mới tạo, chưa tải về'}`;
    } else {
      const n = state.files.length, c = state.checked.length;
      find('#pdf-file-name').textContent = n ? `My Files · ${n} tệp` : 'My Files trống';
      find('#pdf-file-meta').textContent = n ? `Đã chọn ${c} tệp · tệp chỉ nằm trong bộ nhớ trình duyệt` : 'Tệp chỉ nằm trong bộ nhớ trình duyệt, không tải lên mạng';
    }
    find('#pdf-undo').disabled = state.busy || !r || !r.history.length;
    find('#pdf-redo').disabled = state.busy || !r || !r.future.length;
    find('#pdf-save').disabled = state.busy || !r;
    const n = r?.notes || {}, out = [];
    if (n.raster) out.push('Tệp gốc có mật khẩu nên đã được chuyển thành bản ảnh: xem, ghép, ký được nhưng không chọn được chữ.');
    if (n.signed) out.push('Tệp có chữ ký số: bản sửa sẽ không còn hiệu lực chữ ký số (tệp gốc vẫn nguyên).');
    if (n.form) out.push('Tệp có ô biểu mẫu: nếu hiển thị sai sau khi ghép/tách, dùng "Làm phẳng biểu mẫu" ở mục Nén PDF.');
    find('#pdf-notice').textContent = out.join(' ');
    find('#ps-size-info').textContent = r ? `Dung lượng hiện tại: ${humanBytes(r.bytes.length)} · ${r.doc.getPageCount()} trang` : '';
    if (state.task === 'merge') renderMerge();
    if (state.task === 'files') renderFilesPanel();
  }

  /* ---- one-screen height ---- */
  let fitScroll = false;
  function fitHeight() {
    if (state.disposed) return;
    if (window.innerWidth < 1024) { studio.classList.remove('ps-fit'); fitScroll = false; return; }
    const top = studio.getBoundingClientRect().top + window.scrollY, below = window.innerHeight - top - 14;
    fitScroll = below < 600;
    studio.style.setProperty('--ps-h', `${Math.max(560, fitScroll ? window.innerHeight - 16 : below)}px`);
    studio.classList.add('ps-fit');
  }
  function bringIntoView() { if (fitScroll && studio.classList.contains('ps-fit')) studio.scrollIntoView({ block: 'start', behavior: 'smooth' }); }

  /* ---- reading files ---- */
  async function rasterizeLocked(bytes, name) {
    const { PDFLib, pdfjs } = state.libs;
    let password = '', view = null;
    for (let attempt = 0; attempt < 4 && !view; attempt++) {
      try { view = await pdfjs.getDocument({ data: bytes.slice(), password, isEvalSupported: false, useSystemFonts: true }).promise; }
      catch (e) {
        if (e?.name !== 'PasswordException') throw Error('Không mở được tệp PDF có bảo vệ: ' + (e?.message || e));
        find('#pdf-busy').hidden = true;
        password = await askDialog('password', attempt === 0 ? `"${name}" cần mật khẩu để mở.` : 'Mật khẩu chưa đúng, vui lòng nhập lại.');
        find('#pdf-busy').hidden = false; progress('Đang mở tệp có mật khẩu...');
        if (password === null) throw Error(`Đã hủy mở "${name}".`);
      }
    }
    if (!view) throw Error('Mật khẩu không đúng.');
    if (view.numPages > 200) { await destroyView(view); throw Error('Tệp khóa mật khẩu quá 200 trang, chưa hỗ trợ chuyển sang bản ảnh.'); }
    const out = await PDFLib.PDFDocument.create();
    for (let i = 1; i <= view.numPages; i++) {
      progress(`Đang chuyển trang ${i}/${view.numPages} sang bản ảnh...`);
      const page = await view.getPage(i), base = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: 2 });
      const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      await page.render({ canvasContext: c.getContext('2d'), canvas: c, viewport: vp }).promise;
      const img = await out.embedJpg(await canvasToBytes(c, 'image/jpeg', 0.85));
      out.addPage([base.width, base.height]).drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
      c.width = c.height = 0;
    }
    await destroyView(view);
    return out;
  }
  async function loadPdfBytes(bytes, name) {
    const { PDFLib } = await library();
    if (!latin1(bytes.subarray(0, 1024)).includes('%PDF-')) throw Error(`"${name}" không phải tệp PDF hợp lệ.`);
    try { return { doc: await PDFLib.PDFDocument.load(bytes, { updateMetadata: false }), raster: false }; }
    catch (e) {
      if (!isEncryptedError(e)) throw Error(`Không đọc được "${name}": tệp PDF bị hỏng hoặc dùng cấu trúc chưa hỗ trợ.`);
      return { doc: await rasterizeLocked(bytes, name), raster: true };
    }
  }
  const isPdfFile = f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
  function uniqueName(name) {
    const base = name.replace(/\.pdf$/i, ''), taken = new Set(state.files.map(f => f.name.toLowerCase()));
    let out = `${base}.pdf`, n = 2; while (taken.has(out.toLowerCase())) out = `${base} (${n++}).pdf`; return out;
  }
  /** Add a record to My Files. `doc` is kept in memory; `bytes` is its saved form. */
  async function addRecord({ name, kind, doc, bytes, notes, origin }) {
    if (state.files.length >= MAX_FILES) throw Error(`My Files tối đa ${MAX_FILES} tệp. Hãy xóa bớt tệp không cần.`);
    const rec = { id: ++state.seq, name: uniqueName(name), kind, doc, bytes: bytes || await doc.save({ useObjectStreams: true }), notes: notes || {}, origin: origin || '', history: [], future: [], current: 0, thumb: '', downloaded: kind === 'upload' };
    state.files.push(rec);
    if (kind === 'new') state.flash.add(rec.id);
    makeThumb(rec);
    return rec;
  }
  async function makeThumb(rec) {
    try {
      const view = await state.libs.pdfjs.getDocument({ data: rec.bytes.slice(), isEvalSupported: false, useSystemFonts: true }).promise;
      const page = await view.getPage(1), base = page.getViewport({ scale: 1 }), k = Math.min(144 / base.width, 172 / base.height);
      const vp = page.getViewport({ scale: k }), c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      await page.render({ canvasContext: c.getContext('2d'), canvas: c, viewport: vp }).promise;
      rec.thumb = c.toDataURL('image/jpeg', 0.8); await destroyView(view);
      const img = studio.querySelector(`.ps-fcard[data-file="${rec.id}"] img`); if (img) img.src = rec.thumb;
    } catch { /* thumbnail is cosmetic */ }
  }
  async function uploadFiles(files) {
    const list = [...files].filter(isPdfFile); if (!list.length) throw Error('Hãy chọn tệp PDF.');
    await library();
    const added = [], errors = [];
    for (const [n, f] of list.entries()) {
      progress(`Đang đọc tệp ${n + 1}/${list.length}: ${f.name}`);
      try {
        if (f.size > MAX_INPUT) throw Error(`"${f.name}" vượt quá 50 MB.`);
        const bytes = new Uint8Array(await f.arrayBuffer()), { doc, raster } = await loadPdfBytes(bytes, f.name);
        if (doc.getPageCount() === 0) throw Error(`"${f.name}" không có trang nào.`);
        let form = false; try { form = doc.getForm().getFields().length > 0; } catch { form = false; }
        const rec = await addRecord({ name: f.name, kind: 'upload', doc, bytes: raster ? null : bytes, notes: { raster, form, signed: !raster && /\/ByteRange\s*\[/.test(latin1(bytes)) } });
        state.checked.push(rec.id); added.push(rec);
      } catch (e) { errors.push(e.message); }
    }
    if (added.length) { if (!state.activeId) state.activeId = added[0].id; say(`Đã thêm ${added.length} tệp vào My Files và tích chọn sẵn.`); }
    if (errors.length) showError(errors.join(' '));
    renderAll(); bringIntoView();
  }
  async function imagesToPdf(files, target = null) {
    const list = [...files].filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|heic|heif)$/i.test(f.name)); if (!list.length) throw Error('Hãy chọn ảnh JPG, PNG hoặc WebP.'); if (list.length > 80) throw Error('Tối đa 80 ảnh mỗi lượt.'); for (const f of list) { if (f.size > MAX_INPUT) throw Error(`Ảnh ${f.name} vượt quá 50 MB.`); }
    const { PDFLib } = await library();
    const fitToImage = find('#pdf-img-page').value === 'fit';
    const doc = target || await PDFLib.PDFDocument.create();
    for (const [n, file] of list.entries()) {
      progress(`Đang thêm ảnh ${n + 1}/${list.length}...`);
      const image = await embedPrepared(doc, await prepareImage(file));
      if (fitToImage) {
        let w = image.width * 72 / 150, h = image.height * 72 / 150; const k = Math.min(1, 1190.55 / Math.max(w, h)); w *= k; h *= k;
        doc.addPage([w, h]).drawImage(image, { x: 0, y: 0, width: w, height: h });
      } else {
        const portrait = image.height >= image.width;
        const page = doc.addPage(portrait ? [595.28, 841.89] : [841.89, 595.28]), w = page.getWidth(), h = page.getHeight(); const scale = Math.min((w - 36) / image.width, (h - 36) / image.height); page.drawImage(image, { x: (w - image.width * scale) / 2, y: (h - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
      }
    }
    if (target) return list.length;
    doc.setTitle('Epsilon Soft PDF Studio');
    const rec = await addRecord({ name: cleanName(find('#ps-img-name').value.trim() || list[0].name) + '.pdf', kind: 'new', doc, origin: `Tạo từ ${list.length} ảnh` });
    if (find('#ps-img-dl').checked) await downloadRecs([rec]);
    // Keep the image list: the user may build another version (other order, page size). "Bỏ hết" starts over.
    const done = find('#ps-img-done'); done.hidden = false;
    done.textContent = `Đã tạo "${rec.name}" (${list.length} trang) trong My Files → Tệp mới tạo. Danh sách ảnh vẫn giữ lại; bấm "Bỏ hết" để làm bộ ảnh mới.`;
    say(`Đã tạo "${rec.name}" trong My Files.`); renderImages();
  }

  /* ---- editing: copy-on-first-edit, per-file undo ---- */
  /** Uploaded files are never modified: make a copy in "Tệp mới tạo" that takes the original's tick. */
  async function copyForEdit(r, suffix = 'ban-sua', origin = 'Bản sửa của') {
    if (r.kind === 'new') return r;
    const copy = await state.libs.PDFLib.PDFDocument.load(r.bytes, { updateMetadata: false });
    const rec = await addRecord({ name: `${cleanName(r.name)}-${suffix}.pdf`, kind: 'new', doc: copy, bytes: r.bytes.slice(), notes: { ...r.notes, signed: false }, origin: `${origin} ${r.name}` });
    rec.current = r.current;
    const at = state.checked.indexOf(r.id); if (at >= 0) state.checked[at] = rec.id;
    if (state.activeId === r.id) state.activeId = rec.id;
    return rec;
  }
  async function beginEdit() {
    const r = active(); if (!r) throw Error('Chưa chọn tệp nào. Vào My Files và tích tệp cần xử lý.');
    if (r.kind === 'new') return r;
    const rec = await copyForEdit(r);
    say(`Tệp gốc giữ nguyên. Đang sửa trên bản mới "${rec.name}" (My Files → Tệp mới tạo).`);
    return rec;
  }
  /** Run one edit on several files. Each upload gets its own new copy; files already new are edited in place (with undo). */
  async function batchEdit(list, { suffix, origin, label }, change) {
    if (!list.length) throw Error('Chưa chọn tệp nào. Vào My Files và tích tệp cần xử lý.');
    const done = [];
    for (const [n, r] of list.entries()) {
      progress(`Đang xử lý tệp ${n + 1}/${list.length}: ${r.name}`);
      const rec = await copyForEdit(r, suffix, origin);
      await commit(rec, () => change(rec, r), '', { render: false });
      done.push(rec);
    }
    await reRender(true);
    say(list.length === 1 ? `${label}: "${done[0].name}".` : `${label} cho ${list.length} tệp. Kết quả ở My Files → Tệp mới tạo.`);
    return done;
  }
  async function commit(rec, change, label, { render = true } = {}) {
    const prior = rec.bytes.slice(), priorPage = rec.current;
    try {
      await change(); if (rec.doc.getPageCount() < 1) throw Error('PDF phải giữ ít nhất một trang.');
      progress('Đang lưu thay đổi...');
      const out = await rec.doc.save({ useObjectStreams: true }); const next = await state.libs.PDFLib.PDFDocument.load(out, { updateMetadata: false });
      rec.history.push({ bytes: prior, page: priorPage }); while (rec.history.length > 8 || rec.history.reduce((s, h) => s + h.bytes.byteLength, 0) > 48 * 1024 * 1024) { if (rec.history.length === 1) break; rec.history.shift(); }
      rec.future = []; rec.doc = next; rec.bytes = out; rec.current = clamp(rec.current, 0, next.getPageCount() - 1); rec.downloaded = false;
      makeThumb(rec); if (render) await reRender(true); if (label) say(label);
    } catch (error) { rec.doc = await state.libs.PDFLib.PDFDocument.load(prior, { updateMetadata: false }); rec.bytes = prior; rec.current = priorPage; throw error; }
  }
  async function editActive(change, label) { const rec = await beginEdit(); await commit(rec, () => change(rec), label); }
  async function swapHistory(redo) {
    const rec = active(); if (!rec) return; const from = redo ? rec.future : rec.history, to = redo ? rec.history : rec.future;
    if (!from.length) return; const record = from.pop(); to.push({ bytes: rec.bytes.slice(), page: rec.current });
    rec.bytes = record.bytes.slice(); rec.doc = await state.libs.PDFLib.PDFDocument.load(rec.bytes, { updateMetadata: false }); rec.current = clamp(record.page, 0, rec.doc.getPageCount() - 1); rec.downloaded = false;
    makeThumb(rec); await reRender(true);
  }

  /* ---- centre column ---- */
  function currentView() {
    const t = TASK_BY_ID[state.task];
    if (t.view === 'files' || t.view === 'merge' || t.view === 'images') return t.view;
    if (t.view === 'note') return 'empty';
    return state.checked.length ? t.view : 'empty';
  }
  async function reRender(keepSelection = false) {
    if (state.disposed) return;
    const r = TASK_BY_ID[state.task].single ? active() : null;
    if (!keepSelection || state.viewFor !== r?.id) { state.selected.clear(); state.anchor = null; }
    const serial = ++state.renderSerial;
    state.thumbObserver?.disconnect(); state.thumbObserver = null;
    const old = state.pdfView; state.pdfView = null; state.viewFor = null;
    if (old) await destroyView(old);
    if (r && currentView() !== 'empty') {
      const view = await state.libs.pdfjs.getDocument({ data: r.bytes.slice(), isEvalSupported: false, useSystemFonts: true, stopAtErrors: false }).promise;
      if (serial !== state.renderSerial || state.disposed) { await destroyView(view); return; }
      state.pdfView = view; state.viewFor = r.id;
    }
    renderCenter();
  }
  function renderAll() { refreshChrome(); return reRender(); }
  function renderCenter() {
    const v = currentView();
    studio.querySelectorAll('.ps-view').forEach(el => { el.hidden = el.dataset.view !== v; });
    renderTarget();
    if (v === 'files') renderFiles();
    else if (v === 'merge') renderMerge();
    else if (v === 'images') renderImages();
    else if (v === 'grid') buildGrid();
    else if (v === 'viewer') drawPage();
    else renderEmpty();
    updateSelectionUI(); refreshChrome(); if (TASK_BY_ID[state.task].batch) renderScope();
  }
  function renderTarget() {
    const bar = find('#ps-target'), single = TASK_BY_ID[state.task].single, list = checkedRecs(), r = active();
    bar.hidden = !(single && r);
    if (bar.hidden) return;
    const tag = r.kind === 'upload' ? '<span class="ps-tag">Tệp tải lên</span>' : '<span class="ps-tag new">Tệp mới tạo</span>';
    bar.innerHTML = list.length > 1
      ? `<span>Đang làm với</span><select id="ps-target-select" aria-label="Chọn tệp đang làm">${list.map(f => `<option value="${f.id}" ${f.id === r.id ? 'selected' : ''}>${escapeHtml(f.name)} (${f.doc.getPageCount()} trang)</option>`).join('')}</select>${tag}<small>${list.length} tệp đang tích</small>`
      : `<span>Đang làm với</span><b>${escapeHtml(r.name)}</b><small>${r.doc.getPageCount()} trang · ${humanBytes(r.bytes.length)}</small>${tag}`;
  }
  function renderEmpty() {
    const box = find('#ps-empty');
    if (state.task === 'fromimg') box.innerHTML = `<div>${icon('image', 40)}<h3>Tạo PDF từ ảnh</h3><p>Chọn khổ trang ở cột phải rồi bấm "Chọn ảnh". Kết quả là một tệp PDF mới trong My Files.</p></div>`;
    else if (state.task === 'about') box.innerHTML = `<div>${icon('info', 40)}<h3>Lưu ý sử dụng</h3><p>Xem các lưu ý ở cột phải.</p></div>`;
    else box.innerHTML = `<div>${icon('box', 40)}<h3>Chưa chọn tệp nào</h3><p>Tác vụ chỉ xử lý tệp đã tích. Vào My Files, tích tệp cần làm, rồi quay lại đây.</p><button class="button button-purple" type="button" data-task-go="files">${icon('box', 20)} Mở My Files</button></div>`;
  }

  /* ---- My Files ---- */
  function fileCard(f) {
    const checked = state.checked.includes(f.id), order = checked ? state.checked.indexOf(f.id) + 1 : 0;
    return `<div class="ps-fcard ${checked ? 'checked' : ''} ${state.flash.has(f.id) ? 'flash' : ''}" data-file="${f.id}">
      <input type="checkbox" data-tick="${f.id}" ${checked ? 'checked' : ''} aria-label="Chọn ${escapeHtml(f.name)}">
      <img class="ps-fthumb" alt="" src="${f.thumb || 'data:image/gif;base64,R0lGODlhAQABAAAAACw='}">
      <div class="ps-finfo"><b title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</b>
       <span>${f.doc.getPageCount()} trang · ${humanBytes(f.bytes.length)}${checked ? ` · <b style="display:inline;color:#6429e3">#${order}</b>` : ''}</span>
       ${f.origin ? `<span class="origin" title="${escapeHtml(f.origin)}">${escapeHtml(f.origin)}</span>` : ''}
       <span class="ps-factions"><button class="ps-mini" type="button" data-file-dl="${f.id}" title="Tải về" aria-label="Tải ${escapeHtml(f.name)}">${icon('download', 18)}</button><button class="ps-mini" type="button" data-file-rm="${f.id}" title="Xóa khỏi phiên" aria-label="Xóa ${escapeHtml(f.name)} khỏi phiên">${icon('trash', 18)}</button></span></div></div>`;
  }
  function renderFiles() {
    const box = find('#ps-files'), ups = state.files.filter(f => f.kind === 'upload'), news = state.files.filter(f => f.kind === 'new');
    find('#ps-files-title').textContent = `My Files · ${state.files.length} tệp · đã chọn ${state.checked.length}`;
    if (!state.files.length) {
      box.innerHTML = `<section class="pdf-dropzone" id="pdf-dropzone" style="flex:1;align-content:center"><div class="pdf-drop-icon">${icon('pdf', 38)}</div><h3>Kéo thả các tệp PDF vào đây</h3><p>Tải lên một hoặc nhiều tệp. Tích chọn tệp nào thì các tác vụ (ghép, cắt, ký...) xử lý tệp đó.</p><div class="pdf-drop-actions"><button class="button button-purple" type="button" data-op="upload">${icon('upload')} Chọn tệp PDF</button><button class="button button-outline" type="button" data-task-go="fromimg">${icon('image')} Tạo PDF từ ảnh</button></div><p>Mỗi tệp tối đa 50 MB. Không tải lên mạng.</p></section>`;
    } else {
      box.innerHTML = `<div class="ps-sec-head"><span>Tệp tải lên <small>(${ups.length})</small></span><button class="button button-plain button-sm" type="button" data-check-group="upload">Tích cả ngăn</button></div>
        ${ups.length ? `<div class="ps-fgrid">${ups.map(fileCard).join('')}</div>` : '<div class="ps-fempty">Chưa có tệp tải lên.</div>'}
        <hr class="ps-sec-sep">
        <div class="ps-sec-head"><span>Tệp mới tạo <small>(${news.length})</small></span>${news.length ? '<button class="button button-plain button-sm" type="button" data-check-group="new">Tích cả ngăn</button>' : ''}</div>
        ${news.length ? `<div class="ps-fgrid">${news.map(fileCard).join('')}</div>` : '<div class="ps-fempty">Kết quả ghép, trích trang và các bản sửa sẽ xuất hiện ở đây.</div>'}`;
    }
    state.flash.clear();
    renderFilesPanel();
  }
  function renderFilesPanel() {
    const list = checkedRecs(), notDownloaded = state.files.filter(f => f.kind === 'new' && !f.downloaded).length;
    find('#ps-files-count').textContent = `Đã chọn ${list.length}/${state.files.length} tệp` + (notDownloaded ? ` · ${notDownloaded} tệp mới chưa tải về` : '');
    find('#ps-sel-list').innerHTML = list.map(f => `<li>${escapeHtml(f.name)}</li>`).join('');
    find('#ps-dl-label').textContent = list.length > 1 ? `Tải ${list.length} tệp đã chọn (ZIP)` : 'Tải tệp đã chọn';
  }
  function toggleTick(id, on = !state.checked.includes(id)) {
    if (on && !state.checked.includes(id)) state.checked.push(id);
    if (!on) state.checked = state.checked.filter(x => x !== id);
    active(); renderFiles(); refreshChrome();
  }
  async function downloadRecs(list) {
    if (!list.length) throw Error('Chưa tích tệp nào để tải.');
    if (list.length === 1) { downloadBlob(new Blob([list[0].bytes], { type: 'application/pdf' }), list[0].name); }
    else downloadBlob(makeZip(list.map(f => ({ name: f.name, data: f.bytes }))), 'epsilon-pdf-studio.zip');
    list.forEach(f => { f.downloaded = true; }); renderAll();
  }
  async function removeRecs(ids) {
    const list = ids.map(recById).filter(Boolean); if (!list.length) throw Error('Chưa tích tệp nào để xóa.');
    const unsaved = list.filter(f => f.kind === 'new' && !f.downloaded).length;
    const ok = await askDialog('confirm', `Xóa ${list.length} tệp khỏi My Files?${unsaved ? ` Có ${unsaved} tệp mới tạo chưa tải về sẽ mất.` : ''} Tệp trên máy bạn không bị ảnh hưởng.`);
    if (!ok) return;
    state.files = state.files.filter(f => !ids.includes(f.id)); state.checked = state.checked.filter(id => !ids.includes(id));
    say(`Đã xóa ${list.length} tệp khỏi phiên.`); await renderAll();
  }

  /* ---- page grid (split / organize) ---- */
  function buildGrid() {
    const grid = find('#ps-grid'); grid.replaceChildren(); state.thumbObserver?.disconnect();
    if (!state.pdfView) return;
    const total = pageCount(), organize = state.task === 'organize', frag = document.createDocumentFragment();
    for (let i = 0; i < total; i++) {
      const card = document.createElement('div'); card.className = 'ps-card'; card.dataset.page = String(i); card.tabIndex = 0; card.setAttribute('role', 'option'); card.draggable = organize;
      const check = document.createElement('span'); check.className = 'ps-check'; check.innerHTML = icon('check', 16);
      const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 160; canvas.dataset.thumb = String(i);
      const label = document.createElement('span'); label.textContent = `Trang ${i + 1}`;
      card.append(check, canvas, label); frag.append(card);
    }
    grid.append(frag);
    const serial = state.renderSerial;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { observer.unobserve(entry.target); renderThumbnail(entry.target, Number(entry.target.dataset.thumb), serial); }
    }, { root: grid, rootMargin: '200px' });
    state.thumbObserver = observer; grid.querySelectorAll('canvas').forEach(c => observer.observe(c));
    find('#ps-grid-title').textContent = organize ? 'Kéo thả để đổi thứ tự trang' : 'Bấm để chọn trang';
  }
  async function renderThumbnail(canvas, i, serial) {
    try {
      const p = await state.pdfView.getPage(i + 1); if (state.disposed || serial !== state.renderSerial) return;
      const base = p.getViewport({ scale: 1 }), dpr = Math.min(window.devicePixelRatio || 1, 2), k = Math.min(150 / base.width, 160 / base.height) * dpr;
      const v = p.getViewport({ scale: k }); canvas.width = Math.ceil(v.width); canvas.height = Math.ceil(v.height); canvas.style.width = `${Math.round(v.width / dpr)}px`;
      await p.render({ canvasContext: canvas.getContext('2d'), canvas, viewport: v }).promise;
    } catch { /* cosmetic */ }
  }
  function updateSelectionUI() {
    const sel = state.selected, cur = active()?.current ?? -1;
    find('#ps-grid').querySelectorAll('.ps-card').forEach(card => {
      const i = Number(card.dataset.page), on = sel.has(i);
      card.classList.toggle('selected', on); card.classList.toggle('current', i === cur); card.setAttribute('aria-selected', String(on));
    });
    const rangeInput = find('#ps-range');
    if (document.activeElement !== rangeInput) rangeInput.value = formatRanges(sel);
    updateSplitPreview();
    const n = sortedSelection().length;
    find('#ps-org-info').textContent = !active() ? 'Chưa chọn tệp nào.' : n ? `Đã chọn ${n} trang: ${formatRanges(sel)}` : `Chưa chọn trang nào: các nút áp dụng cho trang ${cur + 1}.`;
  }
  function splitGroups() {
    const count = pageCount(), mode = studio.querySelector('input[name="ps-split"]:checked').value, sel = sortedSelection();
    if (!count) throw Error('Chưa chọn tệp nào.');
    if (mode === 'one') { if (!sel.length) throw Error('Chưa chọn trang nào. Bấm vào trang ở giữa để chọn.'); return { mode, groups: [sel] }; }
    if (mode === 'each') { if (!sel.length) throw Error('Chưa chọn trang nào. Bấm vào trang ở giữa để chọn.'); return { mode, groups: sel.map(i => [i]) }; }
    if (mode === 'every') {
      const n = Math.floor(Number(find('#ps-split-n').value)); if (!Number.isFinite(n) || n < 1) throw Error('Số trang mỗi tệp phải từ 1 trở lên.');
      if (n >= count) throw Error(`Tệp chỉ có ${count} trang; hãy nhập số nhỏ hơn ${count}.`);
      const groups = []; for (let i = 0; i < count; i += n) groups.push(Array.from({ length: Math.min(n, count - i) }, (_, k) => i + k));
      return { mode, groups };
    }
    const parts = find('#ps-split-ranges').value.split(/[;\n]+/).map(s => s.trim()).filter(Boolean);
    if (!parts.length) throw Error('Nhập các khoảng trang, cách nhau bằng dấu chấm phẩy. Ví dụ: 1-3; 4-8.');
    return { mode, groups: parts.map(p => parsePages(p, count)) };
  }
  function updateSplitPreview() {
    const el = find('#ps-split-preview');
    if (!active()) { el.textContent = 'Chưa chọn tệp nào ở My Files.'; el.classList.add('bad'); return; }
    try {
      const { groups } = splitGroups(), pages = groups.reduce((s, g) => s + g.length, 0), from = active().name;
      el.textContent = groups.length === 1 ? `Sẽ tạo 1 tệp mới từ ${from}, gồm ${pages} trang.` : `Sẽ tạo ${groups.length} tệp mới từ ${from} (tổng ${pages} trang).`;
      el.classList.remove('bad');
    } catch (e) { el.textContent = e.message; el.classList.add('bad'); }
  }

  /* ---- images → PDF list ---- */
  const isImageFile = f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|heic|heif)$/i.test(f.name);
  function addImages(files) {
    const list = [...files].filter(isImageFile); if (!list.length) throw Error('Hãy chọn ảnh JPG, PNG hoặc WebP.');
    if (state.images.length + list.length > 80) throw Error('Tối đa 80 ảnh mỗi lượt.');
    for (const f of list) { if (f.size > MAX_INPUT) throw Error(`Ảnh ${f.name} vượt quá 50 MB.`); }
    list.forEach(file => state.images.push({ id: ++state.imageSeq, file, url: URL.createObjectURL(file) }));
    if (!find('#ps-img-name').value) find('#ps-img-name').placeholder = cleanName(state.images[0].file.name);
    renderImages();
  }
  function clearImages() { state.images.forEach(i => URL.revokeObjectURL(i.url)); state.images = []; }
  function renderImages() {
    const box = find('#ps-images'), list = state.images;
    find('#ps-img-title').textContent = `Ảnh sẽ ghép thành PDF (${list.length})`;
    box.innerHTML = !list.length
      ? `<div class="ps-mempty"><div>${icon('image', 40)}<p>Chưa có ảnh. Bấm "Thêm ảnh" hoặc kéo thả ảnh vào đây.</p><button class="button button-purple" type="button" data-op="images">${icon('upload', 20)} Thêm ảnh</button></div></div>`
      : `<div class="ps-mrow head"><span>#</span><span>Ảnh</span><span>Trang</span><span class="ps-size">Dung lượng</span><span></span></div>` + list.map((im, i) => `<div class="ps-mrow" draggable="true" data-img-row="${i}"><span class="ps-num" title="Kéo để đổi thứ tự">${i + 1}</span>
         <div style="min-width:0;display:flex;gap:10px;align-items:center"><img src="${im.url}" alt="" style="width:54px;height:54px;object-fit:contain;border-radius:7px;background:#f1f3fb;flex-shrink:0"><b title="${escapeHtml(im.file.name)}">${escapeHtml(im.file.name)}</b></div>
         <span>Trang ${i + 1}</span><span class="ps-size">${humanBytes(im.file.size)}</span>
         <span class="ps-mactions"><button class="ps-mini up" type="button" data-img-up="${i}" aria-label="Lên trên" ${i === 0 ? 'disabled' : ''}>${icon('arrow', 18)}</button><button class="ps-mini down" type="button" data-img-down="${i}" aria-label="Xuống dưới" ${i === list.length - 1 ? 'disabled' : ''}>${icon('arrow', 18)}</button><button class="ps-mini" type="button" data-img-remove="${i}" aria-label="Bỏ ảnh này">${icon('close', 18)}</button></span></div>`).join('')
        + `<div class="ps-mempty" style="flex:0 0 auto;min-height:0;padding:14px"><span>Kéo thả thêm ảnh vào đây, hoặc <button class="button button-soft button-sm" type="button" data-op="images">${icon('upload', 18)} Thêm ảnh</button></span></div>`;
    const prev = find('#ps-img-preview');
    prev.textContent = list.length ? `Sẽ tạo 1 tệp PDF ${list.length} trang.` : 'Chưa có ảnh nào.'; prev.classList.toggle('bad', !list.length);
    find('#ps-img-run').textContent = list.length ? `Tạo PDF (${list.length} ảnh)` : 'Tạo PDF';
  }

  /* ---- merge ---- */
  function renderMerge() {
    const list = checkedRecs(), box = find('#ps-merge');
    find('#ps-merge-title').textContent = `Thứ tự ghép (${list.length} tệp đã tích)`;
    if (!list.length) box.innerHTML = `<div class="ps-mempty"><div>${icon('files', 40)}<p>Chưa tích tệp nào. Vào My Files, tích từ 2 tệp trở lên.</p><button class="button button-purple" type="button" data-task-go="files">${icon('box', 20)} Mở My Files</button></div></div>`;
    else box.innerHTML = `<div class="ps-mrow head"><span>#</span><span>Tên tệp</span><span>Số trang</span><span class="ps-size">Dung lượng</span><span></span></div>` + list.map((f, i) => `<div class="ps-mrow ${f.kind === 'new' ? 'current' : ''}" draggable="true" data-merge="${i}"><span class="ps-num" title="Kéo để đổi thứ tự">${i + 1}</span>
         <div style="min-width:0"><b title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</b>${f.kind === 'new' ? `<small>${escapeHtml(f.origin || 'Tệp mới tạo')}</small>` : ''}</div>
         <span>${f.doc.getPageCount()} trang</span><span class="ps-size">${humanBytes(f.bytes.length)}</span>
         <span class="ps-mactions"><button class="ps-mini up" type="button" data-merge-up="${i}" aria-label="Lên trên" ${i === 0 ? 'disabled' : ''}>${icon('arrow', 18)}</button><button class="ps-mini down" type="button" data-merge-down="${i}" aria-label="Xuống dưới" ${i === list.length - 1 ? 'disabled' : ''}>${icon('arrow', 18)}</button><button class="ps-mini" type="button" data-merge-remove="${i}" aria-label="Bỏ tích tệp này" title="Bỏ tích">${icon('close', 18)}</button></span></div>`).join('');
    const total = list.reduce((s, f) => s + f.doc.getPageCount(), 0), prev = find('#ps-merge-preview');
    prev.textContent = list.length >= 2 ? `Sẽ ghép ${list.length} tệp thành 1 tệp mới gồm ${total} trang.` : 'Cần tích ít nhất 2 tệp ở My Files để ghép.';
    prev.classList.toggle('bad', list.length < 2);
    if (list.length) find('#ps-merge-name').placeholder = cleanName(list[0].name) + '-da-ghep';
  }
  async function runMerge() {
    const list = checkedRecs(); if (list.length < 2) throw Error('Cần tích ít nhất 2 tệp ở My Files để ghép.');
    const { PDFLib } = await library(), out = await PDFLib.PDFDocument.create();
    for (const [n, f] of list.entries()) { progress(`Đang ghép tệp ${n + 1}/${list.length}...`); (await out.copyPages(f.doc, f.doc.getPageIndices())).forEach(p => out.addPage(p)); }
    const name = cleanName(find('#ps-merge-name').value.trim() || find('#ps-merge-name').placeholder) + '.pdf';
    const rec = await addRecord({ name, kind: 'new', doc: out, origin: `Ghép từ ${list.length} tệp`, notes: { raster: list.some(f => f.notes.raster) } });
    if (find('#ps-merge-dl').checked) await downloadRecs([rec]);
    say(`Đã tạo "${rec.name}" (${out.getPageCount()} trang) trong My Files.`); setTask('files');
  }
  async function runSplit() {
    const r = active(), { mode, groups } = splitGroups(); if (groups.length > 100) throw Error('Tối đa 100 tệp mỗi lần tách.');
    const made = [];
    for (const [n, g] of groups.entries()) {
      progress(`Đang tạo tệp ${n + 1}/${groups.length}...`);
      const out = await state.libs.PDFLib.PDFDocument.create(); (await out.copyPages(r.doc, g)).forEach(p => out.addPage(p));
      const label = mode === 'one' ? `trang-${formatRanges(g).replace(/\s+/g, '')}` : groups.length > 1 && mode !== 'each' ? `phan-${n + 1}` : `trang-${g[0] + 1}`;
      made.push(await addRecord({ name: `${cleanName(r.name)}-${label}`.slice(0, 120) + '.pdf', kind: 'new', doc: out, origin: `Trích từ ${r.name}, trang ${formatRanges(g)}`, notes: { raster: r.notes.raster } }));
    }
    if (find('#ps-split-dl').checked) await downloadRecs(made);
    say(made.length === 1 ? `Đã tạo "${made[0].name}" từ ${r.name} trong My Files.` : `Đã tạo ${made.length} tệp mới từ ${r.name} trong My Files.`); setTask('files');
  }

  /* ---- viewer ---- */
  async function drawPage(serial = state.renderSerial) {
    const r = active(); if (!r || !state.pdfView || state.disposed) return; const canvas = find('#pdf-canvas'), message = find('#pdf-preview-message');
    try {
      const page = await state.pdfView.getPage(r.current + 1); if (serial !== state.renderSerial || state.disposed) return;
      const area = find('#pdf-preview-area'), aw = Math.max(200, area.clientWidth - 24), ah = Math.max(200, area.clientHeight - 24);
      const dpr = Math.min(window.devicePixelRatio || 1, 2), basic = page.getViewport({ scale: 1 });
      const scale = state.zoom === 'width' ? aw / basic.width : Math.min(aw / basic.width, ah / basic.height);
      const viewport = page.getViewport({ scale: scale * dpr }); canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height); canvas.style.width = Math.round(viewport.width / dpr) + 'px'; canvas.style.height = Math.round(viewport.height / dpr) + 'px';
      area.style.alignItems = state.zoom === 'width' ? 'flex-start' : 'center';
      await page.render({ canvasContext: canvas.getContext('2d'), canvas, viewport }).promise; if (serial !== state.renderSerial || state.disposed) return;
      const overlays = overlaysFor(r, r.current);
      if (overlays.length) {
        const g = canvas.getContext('2d'), k = scale * dpr; g.save(); g.globalCompositeOperation = 'multiply';
        for (const o of overlays) g.drawImage(o.canvas, o.u * k, o.v * k, o.w * k, o.h * k);
        g.restore();
      }
      message.hidden = true; find('#pdf-view-info').textContent = `Trang ${r.current + 1} / ${r.doc.getPageCount()}`;
    } catch (error) { message.hidden = false; message.textContent = 'Không hiển thị được trang này: ' + (error?.message || 'Lỗi PDF'); }
  }
  const drawIfViewer = () => { if (currentView() === 'viewer') drawPage(); };
  function goPage(i) { const r = active(); if (!r) return; const next = clamp(i, 0, r.doc.getPageCount() - 1); if (next === r.current) return; r.current = next; drawIfViewer(); updateSelectionUI(); }
  function setTask(id) {
    if (!TASK_BY_ID[id]) return;
    const changedFileContext = TASK_BY_ID[state.task].single !== TASK_BY_ID[id].single;
    state.task = id; setPlacing(null);
    studio.querySelectorAll('.ps-task').forEach(b => b.setAttribute('aria-current', String(b.dataset.task === id)));
    studio.querySelectorAll('.ps-panel').forEach(p => { p.hidden = p.dataset.panel !== id; });
    clearError();
    if (TASK_BY_ID[id].single && (changedFileContext || state.viewFor !== active()?.id || !state.pdfView)) reRender(true); else renderCenter();
  }

  /* ---- operations ---- */
  async function rasterPage(i, scale = 1.4, type = 'image/png', quality = .9) {
    const p = await state.pdfView.getPage(i + 1), view = p.getViewport({ scale }), canvas = document.createElement('canvas');
    const size = view.width * view.height; if (size > 40e6) throw Error('Trang quá lớn để xuất ảnh ở độ phân giải này; hãy chọn độ phân giải thấp hơn.'); canvas.width = Math.ceil(view.width); canvas.height = Math.ceil(view.height);
    const g = canvas.getContext('2d'); if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); }
    await p.render({ canvasContext: g, canvas, viewport: view, background: type === 'image/jpeg' ? 'rgb(255,255,255)' : undefined }).promise;
    const bytes = await canvasToBytes(canvas, type, quality); canvas.width = canvas.height = 0; return { bytes, width: view.width, height: view.height };
  }
  async function signatureBytes() {
    if (state.signImage) return state.signImage;
    if (!state.inked) throw Error('Vẽ chữ ký trong khung, hoặc bấm "Tải ảnh".');
    const trimmed = trimCanvas(find('#pdf-signature')); if (!trimmed) throw Error('Khung chữ ký đang trống.');
    return { bytes: await canvasToBytes(trimmed), width: trimmed.width, height: trimmed.height };
  }
  async function placeAt(x, y) {
    const item = state.placed; if (!item) return;
    const itemWidth = clamp(Number(find('#pdf-item-mm').value) || 40, 5, 200) * MM;
    await editActive(async rec => {
      const lib = state.libs.PDFLib, doc = rec.doc, page = doc.getPage(rec.current);
      const { w: Dw, h: Dh } = displaySize(page), du = x * Dw, dv = y * Dh;
      const drawPng = async (png, w) => { const img = await doc.embedPng(png.data); const h = w * img.height / img.width; page.drawImage(img, { ...drawOpts(placeTopLeft(page, du, dv, w, h), lib), width: w, height: h }); };
      if (item === 'text' || item === 'date') {
        const text = item === 'date' ? new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : find('#pdf-text').value;
        if (!text.trim()) throw Error('Nhập nội dung chữ cần chèn.');
        const png = await pngFromText(text, { size: clamp(Number(find('#pdf-text-size').value) || 14, 6, 100), color: find('#pdf-color').value });
        await drawPng(png, Math.min(png.width, Dw)); return;
      }
      if (item === 'image') {
        if (!state.stampFile) throw Error('Vui lòng chọn ảnh để chèn.');
        const img = await embedPrepared(doc, await prepareImage(state.stampFile)); const w = Math.min(itemWidth, Dw), h = w * img.height / img.width;
        page.drawImage(img, { ...drawOpts(placeTopLeft(page, du, dv, w, h), lib), width: w, height: h }); return;
      }
      if (item === 'sign') { const s = await signatureBytes(), w = clamp(Number(find('#pdf-sign-mm').value) || 45, 10, 200) * MM; await drawPng({ data: s.bytes }, Math.min(w, Dw)); return; }
      if (item === 'highlight') { const w = 110, h = 18; page.drawRectangle({ ...drawOpts(placeTopLeft(page, du, dv, w, h), lib), width: w, height: h, color: lib.rgb(1, .88, .1), opacity: .36 }); return; }
      if (item === 'rect') { const w = 140, h = 70; page.drawRectangle({ ...drawOpts(placeTopLeft(page, du, dv, w, h), lib), width: w, height: h, borderColor: rgbHex(find('#pdf-color').value, lib), borderWidth: 2 }); return; }
      if (item === 'whiteout') { const w = Math.min(itemWidth, Dw), h = clamp(Number(find('#pdf-text-size').value) || 14, 6, 100) * 1.4; page.drawRectangle({ ...drawOpts(placeTopLeft(page, du, dv, w, h), lib), width: w, height: h, color: lib.rgb(1, 1, 1) }); return; }
      throw Error('Hãy chọn nội dung cần chèn.');
    }, 'Đã chèn vào trang.');
  }
  const PLACE_LABEL = { text: 'Chữ', date: 'Ngày hôm nay', highlight: 'Tô sáng', rect: 'Khung', whiteout: 'Che trắng', sign: 'Chữ ký', image: 'Ảnh / con dấu' };
  function setPlacing(kind) {
    state.placed = kind; find('#pdf-canvas').classList.toggle('placing', !!kind);
    studio.querySelectorAll('[data-op^="place-"]').forEach(b => b.classList.toggle('is-on', !!kind && b.dataset.op === 'place-' + kind));
    find('#pdf-place-status').textContent = kind && kind !== 'sign' ? `Đang chèn: ${PLACE_LABEL[kind]}. Nhấp lên trang ở giữa để đặt (nhấp nhiều lần để đặt nhiều chỗ, Esc để thôi).` : 'Chưa chọn nội dung để chèn.';
    find('#pdf-sign-status').textContent = kind === 'sign' ? 'Nhấp lên trang ở giữa để đặt chữ ký (nhấp nhiều lần để ký nhiều chỗ, Esc để thôi).' : 'Ảnh chữ ký nền trong suốt có thể tạo bằng Image Studio → Tách nền chữ ký.';
  }
  function requireActive() { const r = active(); if (!r) throw Error('Chưa chọn tệp nào. Vào My Files và tích tệp cần xử lý.'); return r; }
  /* ---- batch scope: the file being viewed, or every ticked file ---- */
  const scopeRecs = () => { const list = checkedRecs(); return state.scopeAll && list.length > 1 ? list : (active() ? [active()] : []); };
  function renderScope() {
    const list = checkedRecs(), r = active();
    studio.querySelectorAll('[data-scope]').forEach(box => {
      if (!r) { box.innerHTML = ''; return; }
      box.innerHTML = list.length > 1
        ? `<b>Áp dụng cho</b><label><input type="radio" name="ps-scope-${box.closest('.ps-panel').dataset.panel}" value="all" ${state.scopeAll ? 'checked' : ''}> Tất cả ${list.length} tệp đã tích</label><label><input type="radio" name="ps-scope-${box.closest('.ps-panel').dataset.panel}" value="one" ${state.scopeAll ? '' : 'checked'}> Chỉ tệp đang xem: ${escapeHtml(r.name)}</label>`
        : `<b>Áp dụng cho</b><span>${escapeHtml(r.name)}</span>`;
    });
    const n = scopeRecs().length;
    const many = n > 1 ? ` (${n} tệp)` : '';
    find('#blank-run-label').textContent = `Tự xóa trang trắng${many}`; find('#reverse-label').textContent = `Đảo ngược thứ tự trang${many}`; find('#clean-label').textContent = `Làm sạch${many}`;
    renderDuplex();
    studio.querySelectorAll('[data-run-label]').forEach(el => { const op = el.closest('[data-op]').dataset.op; const base = op === 'initial-run' ? 'Ký nháy' : op === 'seal-run' ? 'Đóng dấu' : (studio.querySelector('input[name=ps-protect]:checked')?.value === 'remove' ? 'Gỡ bảo vệ' : 'Đặt mật khẩu'); el.textContent = n > 1 ? `${base} ${n} tệp` : base; });
    updateProtectPreview();
    updateBatchPreview();
  }

  /* ---- signature pads (Ký tên, Ký nháy) ---- */
  function setupPad(canvas, inkInput, onDraw) {
    const g = canvas.getContext('2d', { willReadFrequently: true }); g.lineWidth = 7; g.lineJoin = 'round'; g.lineCap = 'round';
    let down = false, last = null, inked = false;
    const at = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * canvas.width, y: (e.clientY - r.top) / r.height * canvas.height }; };
    canvas.addEventListener('pointerdown', e => { down = true; last = at(e); canvas.setPointerCapture(e.pointerId); g.strokeStyle = inkInput.value; onDraw('start'); }, { signal: ctx.signal });
    canvas.addEventListener('pointermove', e => { if (!down) return; const p = at(e); g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke(); last = p; inked = true; }, { signal: ctx.signal });
    const up = () => { if (down && inked) onDraw('end'); down = false; last = null; };
    canvas.addEventListener('pointerup', up, { signal: ctx.signal }); canvas.addEventListener('pointercancel', up, { signal: ctx.signal });
    return { get inked() { return inked; }, clear() { g.clearRect(0, 0, canvas.width, canvas.height); inked = false; }, trimmed() { return inked ? trimCanvas(canvas) : null; } };
  }
  /** Image file → canvas (oriented, ≤1600px), optionally turning near-white paper transparent, trimmed. */
  async function imageFileToCanvas(file, removeWhite) {
    let bmp; try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { throw Error(`Không đọc được ảnh ${file.name}.`); }
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
    if (removeWhite) {
      const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
      for (let i = 0; i < px.length; i += 4) { const m = Math.min(px[i], px[i + 1], px[i + 2]); if (m >= 238) px[i + 3] = 0; else if (m > 200) px[i + 3] = Math.round(px[i + 3] * (238 - m) / 38); }
      g.putImageData(d, 0, 0);
    }
    return trimCanvas(c, 2) || c;
  }
  const initialSource = () => state.initialImage || initialPad.trimmed();
  const pngOf = async canvas => canvasToBytes(canvas, 'image/png');

  /* ---- scan repair helpers ---- */
  async function withView(rec, fn) {
    if (state.viewFor === rec.id && state.pdfView) return fn(state.pdfView);
    const view = await state.libs.pdfjs.getDocument({ data: rec.bytes.slice(), isEvalSupported: false, useSystemFonts: true }).promise;
    try { return await fn(view); } finally { await destroyView(view); }
  }
  async function renderToCanvas(view, i, scale) {
    const page = await view.getPage(i + 1), vp = page.getViewport({ scale }), c = document.createElement('canvas');
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height); const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: g, canvas: c, viewport: vp, background: 'rgb(255,255,255)' }).promise; return c;
  }
  /** Share of "ink" pixels inside the page (margins ignored: scanner shadows and punch holes). */
  function inkShare(c) {
    const g = c.getContext('2d', { willReadFrequently: true }), { width: W, height: H } = c, d = g.getImageData(0, 0, W, H).data, lum = new Uint8Array(W * H);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) lum[p] = (d[i] * 3 + d[i + 1] * 6 + d[i + 2]) / 10;
    const hist = new Uint32Array(256); lum.forEach(v => hist[v]++);
    let acc = 0, paper = 255; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > W * H * 0.5) { paper = v; break; } }
    const mx = Math.round(W * 0.06), my = Math.round(H * 0.05), thr = paper - Math.max(45, paper * 0.25); let ink = 0, n = 0;
    for (let y = my; y < H - my; y++) for (let x = mx; x < W - mx; x++) { n++; if (lum[y * W + x] < thr) ink++; }
    return n ? ink / n : 0;
  }
  async function findBlankPages(rec, sens) {
    return withView(rec, async view => {
      const out = [];
      for (let i = 0; i < view.numPages; i++) { progress(`Đang kiểm tra trang ${i + 1}/${view.numPages} của ${rec.name}...`); const c = await renderToCanvas(view, i, 0.5); if (inkShare(c) < sens) out.push(i); c.width = c.height = 0; }
      return out;
    });
  }
  /** Even out uneven paper colour, push paper to white, optionally threshold to black and white. */
  function cleanCanvas(c, mode) {
    const g = c.getContext('2d', { willReadFrequently: true }), { width: W, height: H } = c, img = g.getImageData(0, 0, W, H), px = img.data;
    const sw = Math.max(8, Math.round(W / 32)), sh = Math.max(8, Math.round(H / 32)), small = document.createElement('canvas'); small.width = sw; small.height = sh;
    const sg = small.getContext('2d', { willReadFrequently: true }); sg.drawImage(c, 0, 0, sw, sh);
    const sd = sg.getImageData(0, 0, sw, sh), mx = new Uint8ClampedArray(sd.data);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) for (let ch = 0; ch < 3; ch++) { let m = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = clamp(x + dx, 0, sw - 1), yy = clamp(y + dy, 0, sh - 1); m = Math.max(m, sd.data[(yy * sw + xx) * 4 + ch]); } mx[(y * sw + x) * 4 + ch] = m; }
    sd.data.set(mx); sg.putImageData(sd, 0, 0);
    const big = document.createElement('canvas'); big.width = W; big.height = H; const bg2 = big.getContext('2d', { willReadFrequently: true }); bg2.imageSmoothingQuality = 'high'; bg2.drawImage(small, 0, 0, W, H);
    const back = bg2.getImageData(0, 0, W, H).data;
    for (let i = 0; i < px.length; i += 4) {
      if (mode === 'bw') {
        const l = (px[i] * 3 + px[i + 1] * 6 + px[i + 2]) / 10, b = Math.max(60, (back[i] * 3 + back[i + 1] * 6 + back[i + 2]) / 10), r = l / b;
        const v = r > 0.78 ? 255 : r < 0.55 ? 0 : Math.round((r - 0.55) / 0.23 * 255); px[i] = px[i + 1] = px[i + 2] = v;
      } else for (let ch = 0; ch < 3; ch++) {
        const r = px[i + ch] / Math.max(60, back[i + ch]); px[i + ch] = r >= 0.92 ? 255 : clamp(Math.round(Math.pow(r / 0.92, 1.35) * 255), 0, 255);
      }
    }
    // Scanner shadows: walk in from each edge and whiten columns/rows that are almost entirely dark.
    const dark = i => px[i] + px[i + 1] + px[i + 2] < 300;
    const colDark = x => { let n = 0; for (let y = 0; y < H; y += 2) if (dark((y * W + x) * 4)) n++; return n / Math.ceil(H / 2) > 0.6; };
    const rowDark = y => { let n = 0; for (let x = 0; x < W; x += 2) if (dark((y * W + x) * 4)) n++; return n / Math.ceil(W / 2) > 0.6; };
    const whiteCol = x => { for (let y = 0; y < H; y++) { const i = (y * W + x) * 4; px[i] = px[i + 1] = px[i + 2] = 255; } };
    const whiteRow = y => { for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; px[i] = px[i + 1] = px[i + 2] = 255; } };
    const limX = Math.round(W * 0.08), limY = Math.round(H * 0.06);
    for (let x = 0; x < limX && colDark(x); x++) whiteCol(x);
    for (let x = W - 1; x >= W - limX && colDark(x); x--) whiteCol(x);
    for (let y = 0; y < limY && rowDark(y); y++) whiteRow(y);
    for (let y = H - 1; y >= H - limY && rowDark(y); y--) whiteRow(y);
    g.putImageData(img, 0, 0); small.width = big.width = 0; return c;
  }

  /* ---- batch placements, in visible page points (shared by preview and output) ---- */
  function pageSetFor(rec, mode, rangeText) {
    const n = rec.doc.getPageCount(), all = Array.from({ length: n }, (_, i) => i);
    if (mode === 'skip-last') return n > 1 ? all.slice(0, -1) : all;
    if (mode === 'skip-first') return n > 1 ? all.slice(1) : all;
    if (mode === 'custom') {
      const text = String(rangeText || '').trim(); if (!text) return [];
      const out = new Set();
      for (const part of text.split(',')) { const [a, b] = part.split('-').map(x => Number(x.trim())); if (!Number.isSafeInteger(a)) continue; for (let p = a; p <= (Number.isSafeInteger(b) ? b : a); p++) if (p >= 1 && p <= n) out.add(p - 1); }
      return [...out].sort((x, y) => x - y);
    }
    return all;
  }
  function initialPlacement(rec, i, src) {
    if (!src || !pageSetFor(rec, find('#ini-pages').value, find('#ini-range').value).includes(i)) return null;
    const { w: Dw, h: Dh } = displaySize(rec.doc.getPage(i)), m = clamp(Number(find('#ini-margin').value) || 0, 0, 60) * MM;
    const w = Math.min(clamp(Number(find('#ini-mm').value) || 18, 6, 80) * MM, Dw / 3), h = w * src.height / src.width, pos = find('#ini-pos').value;
    const u = pos === 'bl' ? m : Dw - m - w, v = pos === 'tr' ? m : pos === 'mr' ? (Dh - h) / 2 : Dh - m - h;
    return { u, v, w, h };
  }
  function sealSize(src) { const w = clamp(Number(find('#seal-mm').value) || 36, 15, 80) * MM; return { w, h: w * src.height / src.width }; }
  function hangPlacement(rec, i, src) {
    if (!src || !find('#hang-on').checked || (find('#hang-pages').value === 'first' && i !== 0)) return null;
    const { w, h } = sealSize(src); return { u: clamp(Number(find('#hang-x').value) || 0, 0, 400) * MM, v: clamp(Number(find('#hang-y').value) || 0, 0, 400) * MM, w, h };
  }
  /** Giáp lai: page k of a group of `len` pages carries the k-th vertical slice of the stamp, flush with the right edge. */
  function seamPlacement(rec, i, src) {
    if (!src || !find('#seam-on').checked) return null;
    const count = rec.doc.getPageCount(); if (count < 2) return null;
    const G = Math.floor(Number(find('#seam-group').value)) || 0, size = G >= 2 ? G : count;
    const g = Math.floor(i / size), k = i - g * size, len = Math.min(size, count - g * size);
    if (len < 2) return null;
    const { w: Dw, h: Dh } = displaySize(rec.doc.getPage(i)), { w, h } = sealSize(src), sw = w / len, pos = find('#seam-pos').value;
    const cy = pos === 'upper' ? Dh * 0.3 : pos === 'lower' ? Dh * 0.7 : Dh / 2;
    return { u: Dw - sw, v: clamp(cy - h / 2, 0, Math.max(0, Dh - h)), w: sw, h, slice: [k, len] };
  }
  function sliceCanvas(src, k, len) {
    const key = `${k}/${len}`; if (state.sliceCache.has(key)) return state.sliceCache.get(key);
    const x0 = Math.floor(src.width * k / len), x1 = Math.ceil(src.width * (k + 1) / len), c = document.createElement('canvas');
    c.width = Math.max(1, x1 - x0); c.height = src.height; c.getContext('2d').drawImage(src, x0, 0, c.width, c.height, 0, 0, c.width, c.height);
    state.sliceCache.set(key, c); return c;
  }
  function overlaysFor(rec, i) {
    const out = [];
    if (state.task === 'initial') { const src = initialSource(), p = initialPlacement(rec, i, src); if (p) out.push({ ...p, canvas: src }); }
    if (state.task === 'seal' && state.seal) {
      const hp = hangPlacement(rec, i, state.seal); if (hp) out.push({ ...hp, canvas: state.seal });
      const sp = seamPlacement(rec, i, state.seal); if (sp) out.push({ ...sp, canvas: sliceCanvas(state.seal, ...sp.slice) });
    }
    return out;
  }
  function renderDuplex() {
    const list = checkedRecs(), f = find('#dup-front'), b = find('#dup-back'), keepF = Number(f.value), keepB = Number(b.value);
    const opts = list.map(r => `<option value="${r.id}">${escapeHtml(r.name)} (${r.doc.getPageCount()} tr)</option>`).join('');
    f.innerHTML = opts; b.innerHTML = opts;
    if (list.some(r => r.id === keepF)) f.value = String(keepF); else if (list[0]) f.value = String(list[0].id);
    if (list.some(r => r.id === keepB) && keepB !== Number(f.value)) b.value = String(keepB); else if (list[1]) b.value = String(list.find(r => r.id !== Number(f.value))?.id ?? list[1].id);
    updateDuplexPreview();
  }
  function updateDuplexPreview() {
    const el = find('#dup-preview'), F = recById(Number(find('#dup-front').value)), B = recById(Number(find('#dup-back').value));
    if (checkedRecs().length < 2 || !F || !B) { el.textContent = 'Cần tích 2 tệp (mặt trước, mặt sau) ở My Files.'; el.classList.add('bad'); return; }
    if (F === B) { el.textContent = 'Mặt trước và mặt sau phải là 2 tệp khác nhau.'; el.classList.add('bad'); return; }
    const nf = F.doc.getPageCount(), nb = B.doc.getPageCount();
    if (nb !== nf && nb !== nf - 1) { el.textContent = `Số trang không khớp: mặt trước ${nf}, mặt sau ${nb} (mặt sau phải bằng hoặc ít hơn 1 trang).`; el.classList.add('bad'); return; }
    el.textContent = `Sẽ tạo 1 tệp ${nf + nb} trang: trước 1, sau 1, trước 2, sau 2...`; el.classList.remove('bad');
  }
  function updateProtectPreview() {
    const el = find('#pw-preview'); if (!el) return; const n = scopeRecs().length, mode = studio.querySelector('input[name=ps-protect]:checked')?.value;
    find('#pw-restrict-box').hidden = !find('#pw-restrict').checked;
    if (!n) { el.textContent = 'Chưa chọn tệp nào.'; el.classList.add('bad'); return; }
    if (mode === 'remove') { el.textContent = `Sẽ gỡ mật khẩu và khóa quyền cho ${n} tệp, tạo bản mới mở tự do.`; el.classList.remove('bad'); return; }
    const open = find('#pw-open').value, restrict = find('#pw-restrict').checked;
    if (!open && !restrict) { el.textContent = 'Nhập mật khẩu mở, hoặc bật "Khóa quyền".'; el.classList.add('bad'); return; }
    if (open && open !== find('#pw-open2').value) { el.textContent = 'Hai ô mật khẩu mở chưa khớp.'; el.classList.add('bad'); return; }
    el.textContent = `Sẽ tạo bản bảo vệ cho ${n} tệp` + (open ? ', cần mật khẩu để mở' : ', khóa quyền (mở tự do)') + '.'; el.classList.remove('bad');
  }
  function updateBatchPreview() {
    const list = scopeRecs(), files = list.length, el1 = find('#ini-preview'), el2 = find('#seal-preview');
    if (!files) { el1.textContent = el2.textContent = 'Chưa chọn tệp nào.'; return; }
    find('#ini-range-wrap').hidden = find('#ini-pages').value !== 'custom';
    const src = initialSource();
    const iniPages = list.reduce((s, r) => s + r.doc.getPageIndices().filter(i => initialPlacement(r, i, src || { width: 1, height: 1 })).length, 0);
    el1.textContent = !src ? 'Hãy ký vào khung hoặc tải ảnh chữ ký nháy.' : `Sẽ ký nháy ${iniPages} trang trên ${files} tệp.`;
    el1.classList.toggle('bad', !src || !iniPages);
    if (!state.seal) { el2.textContent = 'Hãy tải ảnh con dấu (nên là PNG nền trong suốt; ảnh nền trắng sẽ được tự xóa nền).'; el2.classList.add('bad'); return; }
    const hang = find('#hang-on').checked, seam = find('#seam-on').checked;
    if (!hang && !seam) { el2.textContent = 'Hãy bật ít nhất một loại: dấu treo hoặc giáp lai.'; el2.classList.add('bad'); return; }
    const short = seam ? list.filter(r => r.doc.getPageCount() < 2).length : 0;
    el2.textContent = `Sẽ đóng ${[hang && 'dấu treo', seam && 'dấu giáp lai'].filter(Boolean).join(' và ')} cho ${files} tệp.` + (short ? ` ${short} tệp chỉ có 1 trang sẽ không có giáp lai.` : '');
    el2.classList.remove('bad');
  }
  async function stampOverlays(rec, placementsOf) {
    const lib = state.libs.PDFLib, cache = new Map(), blend = lib.BlendMode?.Multiply;
    for (const i of rec.doc.getPageIndices()) {
      const page = rec.doc.getPage(i);
      for (const p of placementsOf(i)) {
        let img = cache.get(p.canvas); if (!img) { img = await rec.doc.embedPng(await pngOf(p.canvas)); cache.set(p.canvas, img); }
        page.drawImage(img, { ...drawOpts(placeTopLeft(page, p.u, p.v, p.w, p.h), lib), width: p.w, height: p.h, ...(blend ? { blendMode: blend } : {}) });
      }
    }
  }
  async function execute(operation) {
    switch (operation) {
      case 'upload': find('#pdf-open-input').click(); return;
      case 'images': find('#pdf-images-input').click(); return;
      case 'download-checked': await downloadRecs(checkedRecs()); return;
      case 'remove-checked': await removeRecs([...state.checked]); return;
      case 'merge-run': await runMerge(); return;
      case 'images-clear': clearImages(); find('#ps-img-done').hidden = true; find('#ps-img-name').value = ''; renderImages(); return;
      case 'images-run': if (!state.images.length) throw Error('Chưa có ảnh nào. Bấm "Thêm ảnh".'); await imagesToPdf(state.images.map(i => i.file)); return;
    }
    const r = requireActive(), lib = state.libs.PDFLib, count = r.doc.getPageCount();
    switch (operation) {
      case 'split-run': await runSplit(); break;
      case 'append-images': find('#pdf-append-images-input').click(); break;
      case 'rotate-left': case 'rotate-right': {
        const pages = selectedIndexes(), amount = operation === 'rotate-left' ? -90 : 90;
        await editActive(async rec => { for (const i of pages) { const p = rec.doc.getPage(i); p.setRotation(lib.degrees(normRotation(p.getRotation().angle + amount))); } }, `Đã xoay ${pages.length} trang.`); break;
      }
      case 'delete': {
        const pages = selectedIndexes(); if (pages.length >= count) throw Error('Không thể xóa hết tất cả trang của tệp.');
        await editActive(async rec => { pages.slice().reverse().forEach(i => rec.doc.removePage(i)); state.selected.clear(); }, `Đã xóa ${pages.length} trang. Có thể hoàn tác.`); break;
      }
      case 'move-left': case 'move-right': {
        const pages = selectedIndexes(); if (pages.length !== 1) throw Error('Chọn đúng một trang để chuyển vị trí (hoặc kéo thả trang).'); const from = pages[0], to = from + (operation === 'move-left' ? -1 : 1); if (to < 0 || to >= count) throw Error('Trang đã ở đầu hoặc cuối tệp.'); await applyOrder(from, to); break;
      }
      case 'crop': {
        const pages = selectedIndexes(), mm = Number(find('#pdf-crop-mm').value); if (!Number.isFinite(mm) || mm < 0 || mm > 30) throw Error('Lề cắt phải trong khoảng 0–30 mm.'); const margin = mm * MM;
        await editActive(async rec => { for (const i of pages) { const p = rec.doc.getPage(i), { x, y, width, height } = p.getCropBox(); if (width <= margin * 2 + 20 || height <= margin * 2 + 20) throw Error('Lề cắt quá lớn với kích thước trang.'); p.setCropBox(x + margin, y + margin, width - 2 * margin, height - 2 * margin); } }, `Đã cắt lề ${pages.length} trang.`); break;
      }
      case 'place-text': case 'place-date': case 'place-highlight': case 'place-rect': case 'place-whiteout': case 'place-sign': {
        if (operation === 'place-sign' && !state.signImage && !state.inked) throw Error('Vẽ chữ ký trong khung, hoặc bấm "Tải ảnh" trước.');
        setPlacing(operation.slice(6)); break;
      }
      case 'place-image': setPlacing('image'); find('#pdf-place-status').textContent = 'Chọn ảnh (con dấu nên dùng PNG nền trong suốt) rồi nhấp vào vị trí trên trang.'; find('#pdf-stamp-input').click(); break;
      case 'clear-sign': { signPad.clear(); state.inked = false; state.signImage = null; find('#pdf-sign-preview').hidden = true; break; }
      case 'sign-file': find('#pdf-signfile-input').click(); break;
      case 'reverse':
        await batchEdit(scopeRecs(), { suffix: 'dao-trang', origin: 'Đảo thứ tự từ', label: 'Đã đảo ngược thứ tự trang' }, async rec => {
          const out = await lib.PDFDocument.create(), order = rec.doc.getPageIndices().reverse(); (await out.copyPages(rec.doc, order)).forEach(p => out.addPage(p)); rec.doc = out; rec.current = 0;
        }); break;
      case 'duplex': {
        const F = recById(Number(find('#dup-front').value)), B = recById(Number(find('#dup-back').value));
        if (checkedRecs().length < 2 || !F || !B || F === B) throw Error('Hãy tích 2 tệp ở My Files và chọn đúng mặt trước, mặt sau.');
        const nf = F.doc.getPageCount(), nb = B.doc.getPageCount(); if (nb !== nf && nb !== nf - 1) throw Error(`Số trang không khớp: mặt trước ${nf}, mặt sau ${nb}.`);
        const back = B.doc.getPageIndices(); if (find('#dup-reverse').checked) back.reverse();
        const out = await lib.PDFDocument.create(), fp = await out.copyPages(F.doc, F.doc.getPageIndices()), bp = await out.copyPages(B.doc, back);
        for (let i = 0; i < nf; i++) { out.addPage(fp[i]); if (bp[i]) out.addPage(bp[i]); }
        const rec = await addRecord({ name: `${cleanName(F.name)}-2-mat.pdf`, kind: 'new', doc: out, origin: `Ghép 2 mặt: ${F.name} + ${B.name}` });
        say(`Đã tạo "${rec.name}" (${out.getPageCount()} trang) trong My Files.`); setTask('files'); break;
      }
      case 'blank-find': {
        const sens = Number(find('#blank-sens').value), blanks = await findBlankPages(r, sens);
        state.selected = new Set(blanks); updateSelectionUI();
        find('#blank-info').textContent = blanks.length ? `Tìm thấy ${blanks.length} trang trắng trong ${r.name}: ${formatRanges(blanks)}. Đã chọn sẵn ở lưới, xem lại rồi bấm "Xóa trang chọn".` : `Không thấy trang trắng nào trong ${r.name}.`;
        break;
      }
      case 'blank-remove': {
        const sens = Number(find('#blank-sens').value), list = scopeRecs(), plan = new Map();
        for (const rec of list) { const b = await findBlankPages(rec, sens); if (b.length && b.length < rec.doc.getPageCount()) plan.set(rec.id, b); }
        if (!plan.size) { find('#blank-info').textContent = 'Không thấy trang trắng nào để xóa.'; say('Không thấy trang trắng nào.'); break; }
        const total = [...plan.values()].reduce((s2, b) => s2 + b.length, 0);
        await batchEdit(list.filter(rec => plan.has(rec.id)), { suffix: 'bo-trang-trang', origin: 'Bỏ trang trắng từ', label: `Đã xóa ${total} trang trắng` }, async (rec, src) => {
          const blanks = plan.get(src.id);
          blanks.slice().reverse().forEach(i => rec.doc.removePage(i)); state.selected.clear();
        });
        find('#blank-info').textContent = `Đã xóa ${total} trang trắng ở ${plan.size} tệp.`; break;
      }
      case 'clean': {
        const mode = find('#clean-mode').value, dpi = Number(find('#clean-dpi').value), list = scopeRecs();
        if (list.reduce((s2, rec) => s2 + rec.doc.getPageCount(), 0) > 300) throw Error('Tối đa 300 trang mỗi lần làm sạch.');
        const built = new Map();
        for (const rec of list) {
          built.set(rec.id, await withView(rec, async view => {
            const out = await lib.PDFDocument.create();
            for (let i = 0; i < view.numPages; i++) {
              progress(`Đang làm sạch ${rec.name}: trang ${i + 1}/${view.numPages}...`);
              const { w, h } = displaySize(rec.doc.getPage(i)), c = cleanCanvas(await renderToCanvas(view, i, dpi / 72), mode);
              const img = mode === 'bw' ? await out.embedPng(await canvasToBytes(c, 'image/png')) : await out.embedJpg(await canvasToBytes(c, 'image/jpeg', 0.8));
              out.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h }); c.width = c.height = 0;
            }
            return out;
          }));
        }
        await batchEdit(list, { suffix: 'lam-sach', origin: 'Làm sạch từ', label: 'Đã làm sạch bản scan' }, async (rec, src) => {
          rec.doc = built.get(src.id); rec.notes = { ...rec.notes, raster: true };
        });
        break;
      }
      case 'clear-initial': initialPad.clear(); state.initialImage = null; find('#pdf-initial-preview').hidden = true; updateBatchPreview(); drawIfViewer(); break;
      case 'initial-file': find('#pdf-initialfile-input').click(); break;
      case 'seal-file': find('#pdf-sealfile-input').click(); break;
      case 'initial-run': {
        const src = initialSource(); if (!src) throw Error('Hãy ký vào khung hoặc tải ảnh chữ ký nháy.');
        const list = scopeRecs();
        if (!list.some(rec => rec.doc.getPageIndices().some(i => initialPlacement(rec, i, src)))) throw Error('Không có trang nào để ký nháy với lựa chọn trang hiện tại.');
        await batchEdit(list, { suffix: 'ky-nhay', origin: 'Ký nháy từ', label: 'Đã ký nháy' }, rec => stampOverlays(rec, i => { const p = initialPlacement(rec, i, src); return p ? [{ ...p, canvas: src }] : []; }));
        break;
      }
      case 'seal-run': {
        if (!state.seal) throw Error('Hãy tải ảnh con dấu trước.');
        if (!find('#hang-on').checked && !find('#seam-on').checked) throw Error('Hãy bật dấu treo hoặc dấu giáp lai.');
        const seal = state.seal;
        await batchEdit(scopeRecs(), { suffix: 'dong-dau', origin: 'Đóng dấu từ', label: 'Đã đóng dấu' }, rec => stampOverlays(rec, i => {
          const out = [], hp = hangPlacement(rec, i, seal), sp = seamPlacement(rec, i, seal);
          if (hp) out.push({ ...hp, canvas: seal }); if (sp) out.push({ ...sp, canvas: sliceCanvas(seal, ...sp.slice) }); return out;
        }));
        break;
      }
      case 'protect-run': {
        const mode = studio.querySelector('input[name=ps-protect]:checked').value, list = scopeRecs();
        if (mode === 'set') {
          const open = find('#pw-open').value, restrict = find('#pw-restrict').checked;
          if (!open && !restrict) throw Error('Nhập mật khẩu mở, hoặc bật "Khóa quyền".');
          if (open && open !== find('#pw-open2').value) throw Error('Hai ô mật khẩu mở chưa khớp.');
          const owner = restrict ? (find('#pw-owner').value || open) : open;
          if (!owner) throw Error('Khóa quyền cần mật khẩu chủ (hoặc đặt kèm mật khẩu mở).');
          const args = ['--encrypt', open, owner, '256'];
          if (restrict) { if (find('#pw-noprint').checked) args.push('--print=none'); if (find('#pw-nocopy').checked) args.push('--extract=n'); if (find('#pw-nomodify').checked) args.push('--modify=none'); }
          args.push('--', 'in.pdf', 'out.pdf');
          const made = [];
          for (const [i, r] of list.entries()) { progress(`Đang bảo vệ tệp ${i + 1}/${list.length}: ${r.name}`); const out = await runQpdf(args, r.bytes); made.push(await addRecord({ name: `${cleanName(r.name)}-bao-ve.pdf`, kind: 'new', doc: await state.libs.PDFLib.PDFDocument.load(out, { updateMetadata: false, ignoreEncryption: true }), bytes: out, origin: `Bảo vệ từ ${r.name}`, notes: { ...r.notes, encrypted: true } })); }
          if (find('#pw-dl').checked) await downloadRecs(made);
          await renderAll(); say(list.length === 1 ? `Đã tạo "${made[0].name}".` : `Đã bảo vệ ${list.length} tệp.`);
        } else {
          const made = [];
          for (const [i, r] of list.entries()) { progress(`Đang gỡ bảo vệ tệp ${i + 1}/${list.length}: ${r.name}`); const out = await runQpdf(['--decrypt', '--', 'in.pdf', 'out.pdf'], r.bytes); made.push(await addRecord({ name: `${cleanName(r.name)}-da-go.pdf`, kind: 'new', doc: await state.libs.PDFLib.PDFDocument.load(out, { updateMetadata: false }), bytes: out, origin: `Gỡ bảo vệ từ ${r.name}` })); }
          if (find('#pw-dl').checked) await downloadRecs(made);
          await renderAll(); say(list.length === 1 ? `Đã gỡ bảo vệ "${made[0].name}".` : `Đã gỡ bảo vệ ${list.length} tệp.`);
        }
        setTask('files'); break;
      }
      case 'page-image': {
        const type = find('#pdf-image-format').value === 'png' ? 'image/png' : 'image/jpeg', ext = type === 'image/png' ? 'png' : 'jpg', scale = Number(find('#pdf-image-scale').value);
        const { bytes } = await rasterPage(r.current, scale, type, .87); downloadBlob(new Blob([bytes], { type }), cleanName(r.name) + `-trang-${r.current + 1}.${ext}`); say('Đã xuất ảnh trang đang xem.'); break;
      }
      case 'all-images': {
        if (count > 150) throw Error('Giới hạn 150 trang mỗi lượt xuất ảnh để tránh hết bộ nhớ.'); const type = find('#pdf-image-format').value === 'png' ? 'image/png' : 'image/jpeg', ext = type === 'image/png' ? 'png' : 'jpg', scale = Number(find('#pdf-image-scale').value);
        const files = []; for (let i = 0; i < count; i++) { progress(`Đang xuất ảnh trang ${i + 1}/${count}...`); const { bytes } = await rasterPage(i, scale, type, .86); files.push({ name: `trang-${String(i + 1).padStart(3, '0')}.${ext}`, data: bytes }); }
        downloadBlob(makeZip(files), cleanName(r.name) + `-${ext}.zip`); say(`Đã xuất ${count} trang thành ảnh.`); break;
      }
      case 'to-text': {
        let text = '';
        for (let i = 1; i <= count; i++) {
          const page = await state.pdfView.getPage(i), data = await page.getTextContent(); let line = '';
          text += `--- Trang ${i} ---\n`;
          for (const item of data.items) { if (!('str' in item)) continue; line += item.str; if (item.hasEOL) { text += line.trimEnd() + '\n'; line = ''; } }
          text += (line ? line.trimEnd() + '\n' : '') + '\n';
        }
        if (text.replace(/--- Trang \d+ ---/g, '').trim() === '') throw Error('Không tìm thấy nội dung chữ. Tài liệu scan ảnh cần OCR, hiện chưa hỗ trợ.');
        downloadBlob(new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' }), cleanName(r.name) + '.txt'); say('Đã xuất nội dung chữ TXT.'); break;
      }
      case 'watermark': {
        const value = find('#pdf-watermark').value.trim(); if (!value) throw Error('Hãy nhập chữ đóng dấu.');
        const angle = Number(find('#pdf-wm-style').value) || 0, opacity = Number(find('#pdf-wm-opacity').value) || .3;
        const png = await pngFromText(value, { size: 48, color: '#7a2a2a' });
        await batchEdit(scopeRecs(), { suffix: 'dau-mo', origin: 'Đóng dấu mờ từ', label: 'Đã đóng dấu mờ' }, async rec => {
          const image = await rec.doc.embedPng(png.data);
          for (const p of rec.doc.getPages()) {
            const { w: Dw, h: Dh } = displaySize(p), diag = angle ? Math.hypot(Dw, Dh) * .62 : Dw * .7;
            const width = Math.min(diag, png.width * 6), height = width * image.height / image.width;
            p.drawImage(image, { ...drawOpts(placeCentered(p, Dw / 2, Dh / 2, width, height, angle ? Math.atan2(Dh, Dw) * 180 / Math.PI : 0), lib), width, height, opacity });
          }
        }); break;
      }
      case 'number-pages': {
        const pos = find('#pdf-number-position').value, fmt = find('#pdf-number-format').value, start = Math.floor(Number(find('#pdf-number-start').value) || 1);
        await batchEdit(scopeRecs(), { suffix: 'danh-so', origin: 'Đánh số từ', label: 'Đã đánh số trang' }, async rec => {
          const total = rec.doc.getPageCount(), label = i => { const n = start + i, N = start + total - 1; return fmt === 'trang' ? `Trang ${n}` : fmt === 'nN' ? `${n} / ${N}` : fmt === 'trangN' ? `Trang ${n} / ${N}` : String(n); };
          const font = await rec.doc.embedFont(lib.StandardFonts.Helvetica), size = 10.5;
          for (let i = 0; i < total; i++) {
            const p = rec.doc.getPage(i), t = label(i), w = font.widthOfTextAtSize(t, size), { w: Dw, h: Dh } = displaySize(p);
            const right = pos.endsWith('right'), top = pos.startsWith('top');
            const du = right ? Dw - 36 - w / 2 : Dw / 2, dv = top ? 20 + size / 2 : Dh - 20 - size / 2;
            p.drawText(t, { ...drawOpts(placeCentered(p, du, dv, w, size), lib), font, size, color: lib.rgb(.18, .23, .49) });
          }
        }); break;
      }
      case 'flatten': {
        let fields = 0; try { fields = r.doc.getForm().getFields().length; } catch { fields = 0; }
        if (!fields) throw Error('Tệp không có ô biểu mẫu để làm phẳng.');
        await editActive(async rec => { try { rec.doc.getForm().flatten(); } catch (e) { throw Error('Không làm phẳng được biểu mẫu này: ' + (e?.message || e)); } rec.notes.form = false; }, `Đã làm phẳng ${fields} ô biểu mẫu.`); break;
      }
      case 'compress': {
        if (count > 200) throw Error('Tối đa 200 trang cho mỗi lần nén ảnh.'); const [dpiText, qText] = find('#pdf-quality').value.split('|'); const dpi = Number(dpiText), quality = Number(qText);
        const target = await lib.PDFDocument.create();
        for (let i = 0; i < count; i++) {
          progress(`Đang nén trang ${i + 1}/${count}...`);
          const { w, h } = displaySize(r.doc.getPage(i)); const { bytes } = await rasterPage(i, dpi / 72, 'image/jpeg', quality); const image = await target.embedJpg(bytes); target.addPage([w, h]).drawImage(image, { x: 0, y: 0, width: w, height: h });
        }
        const before = r.bytes.length, after = (await target.save({ useObjectStreams: true })).length;
        if (after >= before * 0.97) throw Error(`Bản nén không nhỏ hơn (${humanBytes(before)} → ${humanBytes(after)}), không tạo tệp mới. Tệp này có lẽ đã tối ưu sẵn.`);
        const rec = await addRecord({ name: `${cleanName(r.name)}-da-nen.pdf`, kind: 'new', doc: target, origin: `Nén từ ${r.name} (${humanBytes(before)} → ${humanBytes(after)})`, notes: { raster: true } });
        say(`Đã tạo "${rec.name}": ${humanBytes(before)} → ${humanBytes(after)}.`); setTask('files'); break;
      }
      default: break;
    }
  }
  async function applyOrder(from, to) {
    const count = pageCount(); if (from === to || from < 0 || to < 0 || from >= count || to >= count) return;
    await editActive(async rec => {
      const order = Array.from({ length: count }, (_, i) => i); order.splice(to, 0, order.splice(from, 1)[0]);
      const result = await state.libs.PDFLib.PDFDocument.create(); (await result.copyPages(rec.doc, order)).forEach(p => result.addPage(p)); rec.doc = result; rec.current = to;
      state.selected = state.selected.size === 1 && state.selected.has(from) ? new Set([to]) : new Set();
    }, 'Đã sắp xếp lại trang.');
  }
  const uploadInput = files => task('Đang đọc các tệp PDF...', () => uploadFiles(files));
  async function handleDroppedFiles(files) {
    const pdfs = files.filter(isPdfFile), images = files.filter(f => !isPdfFile(f));
    if (pdfs.length) await uploadInput(pdfs);
    if (images.length) await task('Đang thêm ảnh...', async () => { if (state.task !== 'fromimg') setTask('fromimg'); addImages(images); say(`Đã thêm ${images.length} ảnh vào danh sách Ảnh → PDF.`); });
  }

  /* ---- events ---- */
  const signal = ctx.signal;
  const signPad = setupPad(find('#pdf-signature'), find('#pdf-ink'), phase => { if (phase === 'start' && state.signImage) { state.signImage = null; find('#pdf-sign-preview').hidden = true; } if (phase === 'end') state.inked = true; });
  const initialPad = setupPad(find('#pdf-initial'), find('#pdf-initial-ink'), phase => { if (phase === 'start' && state.initialImage) { state.initialImage = null; find('#pdf-initial-preview').hidden = true; } if (phase === 'end') { updateBatchPreview(); drawIfViewer(); } });

  studio.addEventListener('click', async event => {
    if (state.busy) return;
    const fcard = event.target.closest('.ps-fcard');
    if (fcard && !event.target.closest('button') && !event.target.matches('input')) { toggleTick(Number(fcard.dataset.file)); return; }
    const card = event.target.closest('.ps-card');
    if (card) {
      const r = active(), i = Number(card.dataset.page);
      if (event.shiftKey && state.anchor !== null) { const [a, b] = [Math.min(state.anchor, i), Math.max(state.anchor, i)]; for (let k = a; k <= b; k++) state.selected.add(k); }
      else { if (state.selected.has(i)) state.selected.delete(i); else state.selected.add(i); state.anchor = i; }
      if (r) r.current = i; updateSelectionUI(); return;
    }
    const t = event.target.closest('button'); if (!t || t.disabled) return;
    if (t.dataset.task) { setTask(t.dataset.task); return; }
    if (t.dataset.taskGo) { setTask(t.dataset.taskGo); return; }
    if (t.dataset.check) { state.checked = t.dataset.check === 'all' ? state.files.map(f => f.id) : []; active(); renderFiles(); refreshChrome(); return; }
    if (t.dataset.checkGroup) { state.files.filter(f => f.kind === t.dataset.checkGroup).forEach(f => { if (!state.checked.includes(f.id)) state.checked.push(f.id); }); active(); renderFiles(); refreshChrome(); return; }
    if (t.dataset.fileDl) { await task('Đang tải tệp...', () => downloadRecs([recById(Number(t.dataset.fileDl))])); return; }
    if (t.dataset.fileRm) { await task('Đang xóa tệp...', () => removeRecs([Number(t.dataset.fileRm)])); return; }
    if (t.dataset.select) {
      if (!active()) return; const n = pageCount(), s = t.dataset.select;
      state.selected = new Set(s === 'none' ? [] : Array.from({ length: n }, (_, i) => i).filter(i => s === 'all' || (s === 'odd' ? i % 2 === 0 : i % 2 === 1)));
      updateSelectionUI(); return;
    }
    if (t.dataset.mergeUp !== undefined || t.dataset.mergeDown !== undefined) {
      const i = Number(t.dataset.mergeUp ?? t.dataset.mergeDown), j = i + (t.dataset.mergeUp !== undefined ? -1 : 1);
      if (j < 0 || j >= state.checked.length) return; [state.checked[i], state.checked[j]] = [state.checked[j], state.checked[i]]; renderMerge(); return;
    }
    if (t.dataset.imgUp !== undefined || t.dataset.imgDown !== undefined) {
      const i = Number(t.dataset.imgUp ?? t.dataset.imgDown), j = i + (t.dataset.imgUp !== undefined ? -1 : 1);
      if (j < 0 || j >= state.images.length) return; [state.images[i], state.images[j]] = [state.images[j], state.images[i]]; renderImages(); return;
    }
    if (t.dataset.imgRemove !== undefined) { const [im] = state.images.splice(Number(t.dataset.imgRemove), 1); URL.revokeObjectURL(im.url); renderImages(); return; }
    if (t.dataset.mergeRemove !== undefined) { state.checked.splice(Number(t.dataset.mergeRemove), 1); active(); renderMerge(); refreshChrome(); return; }
    if (t.id === 'ps-upload') { find('#pdf-open-input').click(); return; }
    if (t.id === 'ps-zoom') { state.zoom = state.zoom === 'page' ? 'width' : 'page'; t.textContent = state.zoom === 'page' ? 'Vừa chiều rộng' : 'Vừa trang'; drawPage(); return; }
    if (t.id === 'pdf-save') { await task('Đang tải tệp...', async () => downloadRecs([requireActive()])); return; }
    if (t.id === 'pdf-undo') { await task('Đang hoàn tác...', async () => { await swapHistory(false); say('Đã hoàn tác.'); }); return; }
    if (t.id === 'pdf-redo') { await task('Đang làm lại...', async () => { await swapHistory(true); say('Đã làm lại.'); }); return; }
    if (t.dataset.op) { const op = t.dataset.op; await task(`Đang xử lý: ${t.textContent.trim()}...`, () => execute(op)); return; }
    if (t.dataset.preview) { const r = active(); if (r) goPage(r.current + (t.dataset.preview === 'prev' ? -1 : 1)); }
  }, { signal });
  studio.addEventListener('input', event => {
    const el = event.target;
    if (el.id === 'ps-range') {
      if (!active()) return; const v = el.value.replace(/\s+/g, '');
      try { state.selected = new Set(v ? parsePages(v, pageCount()) : []); updateSelectionUI(); }
      catch (e) { const p = find('#ps-split-preview'); p.textContent = e.message; p.classList.add('bad'); }
      return;
    }
    if (el.id === 'ps-split-n' || el.id === 'ps-split-ranges') updateSplitPreview();
    if (/^(ini|hang|seam|seal)-/.test(el.id) && el.type !== 'checkbox') { updateBatchPreview(); clearTimeout(previewTimer); previewTimer = setTimeout(drawIfViewer, 150); }
    if (/^pw-/.test(el.id)) updateProtectPreview();
  }, { signal });
  let previewTimer = 0;
  function loadSeal(file) {
    task('Đang đọc ảnh con dấu...', async () => {
      state.seal = await imageFileToCanvas(file, find('#seal-clean').checked); state.sliceCache.clear();
      const pv = find('#pdf-seal-preview'); pv.src = state.seal.toDataURL(); pv.hidden = false; updateBatchPreview(); drawIfViewer();
    });
  }
  studio.addEventListener('change', event => {
    const el = event.target;
    if (el.dataset.tick) { toggleTick(Number(el.dataset.tick), el.checked); return; }
    if (el.name?.startsWith('ps-scope-')) { state.scopeAll = el.value === 'all'; renderScope(); return; }
    if (el.id === 'dup-front' || el.id === 'dup-back' || el.id === 'dup-reverse') { updateDuplexPreview(); return; }
    if (el.name === 'ps-protect') { studio.querySelectorAll('[data-protect]').forEach(x => x.hidden = x.dataset.protect !== el.value); renderScope(); updateProtectPreview(); return; }
    if (/^pw-/.test(el.id)) { updateProtectPreview(); return; }
    if (/^(ini|hang|seam|seal)-/.test(el.id)) { if (el.id === 'seal-clean' && state.sealFile) loadSeal(state.sealFile); updateBatchPreview(); drawIfViewer(); return; }
    if (el.id === 'pdf-initialfile-input' || el.id === 'pdf-sealfile-input') {
      const f = el.files?.[0]; el.value = ''; if (!f) return;
      if (el.id === 'pdf-sealfile-input') { state.sealFile = f; loadSeal(f); return; }
      task('Đang đọc ảnh chữ ký nháy...', async () => { state.initialImage = await imageFileToCanvas(f, true); initialPad.clear(); const pv = find('#pdf-initial-preview'); pv.src = state.initialImage.toDataURL(); pv.hidden = false; updateBatchPreview(); drawIfViewer(); });
      return;
    }
    if (el.id === 'ps-target-select') { state.activeId = Number(el.value); reRender(); return; }
    if (el.name === 'ps-split') { updateSplitPreview(); if (el.value === 'ranges') find('#ps-split-ranges').focus(); return; }
    if (el.id === 'ps-range') { updateSelectionUI(); return; }
    if (el.id === 'pdf-open-input') { const f = [...el.files]; el.value = ''; if (f.length) uploadInput(f); return; }
    if (el.id === 'pdf-images-input') { const f = [...el.files]; el.value = ''; if (f.length) task('Đang thêm ảnh...', async () => { if (state.task !== 'fromimg') setTask('fromimg'); addImages(f); }); return; }
    if (el.id === 'pdf-append-images-input') { const f = [...el.files]; el.value = ''; if (f.length) task('Đang thêm ảnh...', () => editActive(async rec => { await imagesToPdf(f, rec.doc); rec.current = rec.doc.getPageCount() - 1; }, `Đã thêm ${f.length} ảnh vào cuối tệp.`)); return; }
    if (el.id === 'pdf-stamp-input') { const f = el.files?.[0]; el.value = ''; if (f) { state.stampFile = f; say('Đã nhận ảnh. Nhấp vào vị trí trên trang để chèn.'); } return; }
    if (el.id === 'pdf-signfile-input') {
      const f = el.files?.[0]; el.value = ''; if (!f) return;
      task('Đang đọc ảnh chữ ký...', async () => {
        const img = await reencode(f, 'image/png'), url = URL.createObjectURL(new Blob([img.bytes], { type: 'image/png' })), probe = new Image();
        await new Promise((res, rej) => { probe.onload = res; probe.onerror = () => rej(Error('Ảnh chữ ký không hợp lệ.')); probe.src = url; });
        state.signImage = { bytes: img.bytes, width: probe.naturalWidth, height: probe.naturalHeight };
        const prev = find('#pdf-sign-preview'); if (prev.src.startsWith('blob:')) URL.revokeObjectURL(prev.src); prev.src = url; prev.hidden = false;
        say('Đã nhận ảnh chữ ký. Bấm "Đặt chữ ký lên trang" rồi nhấp lên trang.');
      });
    }
  }, { signal });
  const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
  let dragRow = null, dragImg = null;
  studio.addEventListener('dragstart', e => {
    const imgRow = e.target.closest('.ps-mrow[data-img-row]');
    if (imgRow) { dragImg = Number(imgRow.dataset.imgRow); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'img'); return; }
    const card = e.target.closest('.ps-card'), row = e.target.closest('.ps-mrow[data-merge]');
    if (card && state.task === 'organize') { state.dragFrom = Number(card.dataset.page); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'page'); }
    else if (row) { dragRow = Number(row.dataset.merge); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'row'); }
  }, { signal });
  studio.addEventListener('dragover', e => {
    if (hasFiles(e)) { e.preventDefault(); studio.classList.add('ps-dragging-files'); return; }
    const target = e.target.closest('.ps-card, .ps-mrow[data-merge], .ps-mrow[data-img-row]'); if (!target) return;
    if ((target.classList.contains('ps-card') && state.dragFrom !== null) || (target.dataset.merge !== undefined && dragRow !== null) || (target.dataset.imgRow !== undefined && dragImg !== null)) {
      e.preventDefault(); studio.querySelectorAll('.dragover').forEach(el => el !== target && el.classList.remove('dragover')); target.classList.add('dragover');
    }
  }, { signal });
  studio.addEventListener('dragleave', e => { if (!studio.contains(e.relatedTarget)) studio.classList.remove('ps-dragging-files'); }, { signal });
  studio.addEventListener('dragend', () => { state.dragFrom = null; dragRow = null; dragImg = null; studio.querySelectorAll('.dragover').forEach(el => el.classList.remove('dragover')); }, { signal });
  studio.addEventListener('drop', e => {
    studio.classList.remove('ps-dragging-files'); studio.querySelectorAll('.dragover').forEach(el => el.classList.remove('dragover'));
    if (hasFiles(e)) { e.preventDefault(); if (!state.busy) handleDroppedFiles([...e.dataTransfer.files]); return; }
    const card = e.target.closest('.ps-card'), row = e.target.closest('.ps-mrow[data-merge]');
    if (card && state.dragFrom !== null) { e.preventDefault(); const from = state.dragFrom, to = Number(card.dataset.page); state.dragFrom = null; task('Đang chuyển vị trí trang...', () => applyOrder(from, to)); return; }
    const imgRow = e.target.closest('.ps-mrow[data-img-row]');
    if (imgRow && dragImg !== null) { e.preventDefault(); const to = Number(imgRow.dataset.imgRow); state.images.splice(to, 0, state.images.splice(dragImg, 1)[0]); dragImg = null; renderImages(); return; }
    if (row && dragRow !== null) { e.preventDefault(); const to = Number(row.dataset.merge); state.checked.splice(to, 0, state.checked.splice(dragRow, 1)[0]); dragRow = null; renderMerge(); }
  }, { signal });
  find('#pdf-canvas').addEventListener('click', async event => {
    if (state.task === 'seal' && state.seal && find('#hang-on').checked && active() && !state.busy) {
      // Click sets where the hanging stamp sits (its centre), same position for every file.
      const r = active(), b = find('#pdf-canvas').getBoundingClientRect(), { w: Dw, h: Dh } = displaySize(r.doc.getPage(r.current)), { w, h } = sealSize(state.seal);
      const u = clamp((event.clientX - b.left) / b.width * Dw - w / 2, 0, Math.max(0, Dw - w)), v = clamp((event.clientY - b.top) / b.height * Dh - h / 2, 0, Math.max(0, Dh - h));
      find('#hang-x').value = (u / MM).toFixed(0); find('#hang-y').value = (v / MM).toFixed(0); updateBatchPreview(); drawIfViewer(); return;
    }
    if (!state.placed || !active() || state.busy) return;
    const b = find('#pdf-canvas').getBoundingClientRect(); if (!b.width || !b.height) return;
    const x = clamp((event.clientX - b.left) / b.width, 0, 1), y = clamp((event.clientY - b.top) / b.height, 0, 1);
    await task('Đang chèn vào trang...', () => placeAt(x, y));
  }, { signal });
  document.addEventListener('keydown', e => {
    if (!studio.isConnected || state.busy || studio.querySelector('.pdf-dialog')) return;
    const typing = e.target.closest?.('input,textarea,select,[contenteditable]');
    if (e.key === 'Escape' && state.placed) { setPlacing(null); return; }
    if (typing || !active()) return;
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === 'z' && !find('#pdf-undo').disabled) { e.preventDefault(); find('#pdf-undo').click(); return; }
    if ((e.ctrlKey || e.metaKey) && key === 'y' && !find('#pdf-redo').disabled) { e.preventDefault(); find('#pdf-redo').click(); return; }
    if ((e.ctrlKey || e.metaKey) && key === 'a' && currentView() === 'grid') { e.preventDefault(); studio.querySelector('[data-select="all"]').click(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('ps-card')) { e.preventDefault(); e.target.click(); return; }
    const step = { ArrowLeft: -1, PageUp: -1, ArrowRight: 1, PageDown: 1 }[e.key];
    if (step && !e.ctrlKey && !e.altKey && currentView() === 'viewer') { e.preventDefault(); goPage(active().current + step); }
  }, { signal });
  window.addEventListener('beforeunload', e => { if (studio.isConnected && state.files.some(f => f.kind === 'new' && !f.downloaded)) { e.preventDefault(); e.returnValue = ''; } }, { signal });
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { fitHeight(); drawIfViewer(); }, 120); }, { signal });
  const ro = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawIfViewer, 120); });
  ro.observe(find('#pdf-preview-area'));

  find('#ps-version').textContent = VERSION;
  setTask('files'); fitHeight();
  library().catch(err => showError(err.message));
  // Explicit cleanup: discard in-memory documents when leaving PDF Studio, never persist PDFs.
  return async () => { state.disposed = true; state.renderSerial++; ro.disconnect(); clearTimeout(resizeTimer); state.thumbObserver?.disconnect(); await destroyView(state.pdfView); const prev = find('#pdf-sign-preview'); if (prev?.src.startsWith('blob:')) URL.revokeObjectURL(prev.src); state.files = []; state.checked = []; state.signImage = null; clearImages(); };
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// Safe exports for automated regression tests (no runtime change).
export { makeZip, parsePages, displayToUser, placeCentered, jpegOrientation, formatRanges, VERSION };
