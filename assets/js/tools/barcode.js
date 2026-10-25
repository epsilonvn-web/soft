/**
 * Epsilon Soft · Tạo & đọc mã vạch.
 * Code 39, Code 128 (tự chuyển B/C), EAN-13 — bộ mã hóa tự viết, không cần tệp dữ liệu ngoài,
 * nên chạy được cả khi offline. Vẽ SVG thuần, không dùng ảnh.
 */
const { icon, downloadBlob, setText } = globalThis.EpsilonSoftShared || {};

/* ----------------------------------------------------------- Code 39 ---- */
const C39 = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw', 'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw', 'E': 'wnnnwwnnn',
  'F': 'nnwnwwnnn', 'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn', 'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn',
  'K': 'wnnnnnnww', 'L': 'nnwnnnnww', 'M': 'wnwnnnnwn', 'N': 'nnnnwnnww', 'O': 'wnnnwnnwn',
  'P': 'nnwnwnnwn', 'Q': 'nnnnnnwww', 'R': 'wnnnnnwwn', 'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn',
  'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw', 'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw', 'Y': 'wwnnwnnnn',
  'Z': 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
  '$': 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn',
};
function code39Elements(text) {
  const out = [];
  for (const ch of '*' + text + '*') {
    const p = C39[ch]; if (!p) throw new Error('Ký tự không hỗ trợ trong Code 39: ' + ch);
    [...p].forEach((e, i) => out.push({ w: e === 'w' ? 3 : 1, bar: i % 2 === 0 }));
    out.push({ w: 1, bar: false });
  }
  out.pop();
  return out;
}

/* ---------------------------------------------------------- Code 128 ---- */
const C128 = ['212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112'];
const START_B = 104, START_C = 105, STOP = 106, CODE_C = 99, CODE_B = 100;
function code128Values(text) {
  for (const ch of text) { const c = ch.charCodeAt(0); if (c < 32 || c > 126) throw new Error('Code 128 chỉ nhận ký tự ASCII in được (không dấu tiếng Việt).'); }
  const values = [];
  let i = 0, mode;
  const digitsRun = at => { let n = 0; while (at + n < text.length && text[at + n] >= '0' && text[at + n] <= '9') n++; return n; };
  const lead = digitsRun(0);
  if (lead >= 2 && (lead === text.length || lead >= 4)) { mode = 'C'; values.push(START_C); } else { mode = 'B'; values.push(START_B); }
  while (i < text.length) {
    if (mode === 'C') {
      if (i + 1 < text.length && text[i] >= '0' && text[i] <= '9' && text[i + 1] >= '0' && text[i + 1] <= '9') { values.push(Number(text[i] + text[i + 1])); i += 2; continue; }
      values.push(CODE_B); mode = 'B';
    } else {
      const run = digitsRun(i);
      if (run >= 4 && (run % 2 === 0 || run >= 6)) { values.push(CODE_C); mode = 'C'; continue; }
      values.push(text.charCodeAt(i) - 32); i++;
    }
  }
  let sum = values[0];
  for (let k = 1; k < values.length; k++) sum += values[k] * k;
  values.push(sum % 103);
  values.push(STOP);
  return values;
}
function code128Elements(text) {
  const out = [];
  for (const v of code128Values(text)) [...C128[v]].forEach((n, i) => out.push({ w: Number(n), bar: i % 2 === 0 }));
  return out;
}

/* ----------------------------------------------------------- EAN-13 ---- */
const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const EAN_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
function ean13Checksum(d12) { let s = 0; for (let i = 0; i < 12; i++) s += Number(d12[i]) * (i % 2 ? 3 : 1); return (10 - (s % 10)) % 10; }
function ean13Bits(raw) {
  const digits = raw.replace(/\s/g, '');
  if (!/^\d{12,13}$/.test(digits)) throw new Error('EAN-13 cần đúng 12 chữ số (tự thêm số kiểm) hoặc 13 chữ số.');
  let full = digits;
  if (digits.length === 12) full = digits + ean13Checksum(digits);
  else if (Number(digits[12]) !== ean13Checksum(digits.slice(0, 12))) throw new Error('Số kiểm tra (chữ số thứ 13) không đúng.');
  const parity = EAN_PARITY[Number(full[0])];
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === 'L' ? EAN_L : EAN_G)[Number(full[i])];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += EAN_R[Number(full[i])];
  bits += '101';
  return { bits, full };
}

/* ------------------------------------------------------------- render ---- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function elementsToSvg(elements, { thin, h, label }) {
  const quiet = thin * 12; let x = quiet, bars = '';
  for (const e of elements) { const w = e.w * thin; if (e.bar) bars += `<rect x="${x}" y="6" width="${w}" height="${h}" fill="#0b1c55"/>`; x += w; }
  const total = x + quiet;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${h + 42}" width="${total}" height="${h + 42}"><rect width="100%" height="100%" fill="white"/>${bars}<text x="${total / 2}" y="${h + 28}" fill="#192864" font-size="19" font-family="Arial,sans-serif" text-anchor="middle">${esc(label)}</text></svg>`;
}
function ean13Svg(bits, full, { thin, h }) {
  const quiet = thin * 11, guard = [0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94], ext = 10;
  let x = quiet, bars = '';
  for (let i = 0; i < bits.length; i++) { const tall = guard.includes(i) ? ext : 0; if (bits[i] === '1') bars += `<rect x="${x}" y="6" width="${thin}" height="${h + tall}" fill="#0b1c55"/>`; x += thin; }
  const total = x + quiet, baseY = h + 6 + ext + 15, fs = thin * 9;
  const digit = (d, px) => `<text x="${px}" y="${baseY}" fill="#192864" font-size="${fs}" font-family="Arial,sans-serif" text-anchor="middle">${d}</text>`;
  let text = digit(full[0], quiet - thin * 5);
  for (let i = 0; i < 6; i++) text += digit(full[1 + i], quiet + thin * 3 + thin * 7 * i + thin * 3.5);
  for (let i = 0; i < 6; i++) text += digit(full[7 + i], quiet + thin * 50 + thin * 7 * i + thin * 3.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${baseY + 8}" width="${total}" height="${baseY + 8}"><rect width="100%" height="100%" fill="white"/>${bars}${text}</svg>`;
}

/* --------------------------------------------------------------- mount --- */
export async function mount(root, ctx) {
  root.innerHTML = `<div class="tool-grid-2">
  <section class="tool-box">
   <h2 class="tool-box-heading">${icon('barcode')} Tạo mã vạch</h2>
   <label class="form-field"><span>Loại mã</span><select id="bc-type">
     <option value="128">Code 128 (kho hàng, đa năng)</option>
     <option value="39">Code 39 (chữ & số, đơn giản)</option>
     <option value="ean13">EAN-13 (sản phẩm bán lẻ)</option>
   </select></label>
   <p class="box-lead" id="bc-hint"></p>
   <label class="form-field"><span>Nội dung mã vạch</span><input type="text" id="bc-text" maxlength="64" value="EPSILON-2026" placeholder="ABC-123"></label>
   <div class="form-grid" style="margin-top:15px">
    <label class="form-field"><span>Độ cao vạch</span><select id="bc-height"><option value="80">80 px</option><option value="115" selected>115 px</option><option value="160">160 px</option></select></label>
    <label class="form-field"><span>Đơn vị mỏng</span><select id="bc-thin"><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option></select></label>
   </div>
   <div class="form-actions"><button class="button button-purple" id="bc-create" type="button">${icon('barcode')} Tạo mã vạch</button><button class="button button-outline" id="bc-save" type="button" disabled>${icon('download')} Tải SVG</button><button class="button button-outline" id="bc-png" type="button" disabled>${icon('download')} Tải PNG</button></div>
   <p class="tool-error" id="bc-error" role="alert"></p>
   <div class="separator"></div>
   <h3 class="tool-box-heading">${icon('search')} Đọc mã vạch từ ảnh</h3>
   <label class="form-field"><span>Chọn ảnh có mã vạch</span><input type="file" id="bc-file" accept="image/png,image/jpeg,image/webp"></label>
   <p class="tool-hint" id="bc-read">Quét ảnh cần trình duyệt hỗ trợ BarcodeDetector (Chrome, Edge). Không cần camera.</p>
  </section>
  <section class="tool-box">
   <h2 class="tool-box-heading">${icon('area')} Xem trước</h2>
   <div id="bc-preview" class="qr-output" style="min-height:245px"></div>
   <p class="shape-note">Kiểm tra bằng đầu đọc thật trước khi dùng cho kho hoặc sản phẩm. In đủ lớn để máy quét đọc tốt.</p>
  </section></div>`;
  const $ = s => root.querySelector(s);
  const HINTS = {
    '128': 'Nhận chữ, số và ký tự ASCII in được. Tự chọn chế độ tối ưu, mã gọn. Phổ biến nhất cho kho hàng.',
    '39': 'Nhận A–Z, 0–9, khoảng trắng và - . $ / + %. Đơn giản, mọi máy quét đều đọc. Không dấu tiếng Việt.',
    'ean13': 'Nhập 12 chữ số (tự thêm số kiểm) hoặc 13 chữ số. Dùng cho mã sản phẩm bán lẻ.',
  };
  const PLACEHOLDER = { '128': 'EPSILON-2026', '39': 'ABC-123', 'ean13': '893456789012' };
  let svg = '', name = 'epsilon-barcode';

  function draw() {
    const type = $('#bc-type').value, raw = $('#bc-text').value.trim(), h = Number($('#bc-height').value), thin = Number($('#bc-thin').value);
    try {
      if (!raw) throw new Error('Nhập nội dung mã vạch.');
      if (type === 'ean13') { const { bits, full } = ean13Bits(raw); svg = ean13Svg(bits, full, { thin: Math.max(thin, 2), h }); name = 'ean13-' + full; }
      else if (type === '128') { svg = elementsToSvg(code128Elements(raw), { thin, h, label: raw }); name = 'code128-' + raw.slice(0, 20); }
      else { const up = raw.toUpperCase(); svg = elementsToSvg(code39Elements(up), { thin, h, label: up }); name = 'code39-' + up.slice(0, 20); }
      $('#bc-preview').innerHTML = svg; $('#bc-error').textContent = ''; $('#bc-save').disabled = false; $('#bc-png').disabled = false;
    } catch (e) {
      svg = ''; $('#bc-preview').innerHTML = '<span style="color:#8893b5">Chưa tạo được mã vạch</span>';
      $('#bc-error').textContent = e.message; $('#bc-save').disabled = true; $('#bc-png').disabled = true;
    }
  }
  function applyType() {
    const type = $('#bc-type').value;
    $('#bc-hint').textContent = HINTS[type];
    $('#bc-text').placeholder = PLACEHOLDER[type];
    $('#bc-text').inputMode = type === 'ean13' ? 'numeric' : 'text';
    if (type === 'ean13' && !/^\d{12,13}$/.test($('#bc-text').value.replace(/\s/g, ''))) $('#bc-text').value = '893456789012';
    draw();
  }
  async function savePng() {
    if (!svg) return;
    const m = svg.match(/width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/);
    const w = Math.ceil(Number(m[1])), hh = Math.ceil(Number(m[2])), scale = 4;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), img = new Image();
    try {
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Không dựng được ảnh.')); img.src = url; });
      const c = document.createElement('canvas'); c.width = w * scale; c.height = hh * scale;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, 'image/png')); downloadBlob(blob, name + '.png'); ctx.showToast('Đã tạo mã vạch PNG.');
    } finally { URL.revokeObjectURL(url); }
  }

  root.addEventListener('input', e => { if (e.target.id === 'bc-text') draw(); }, { signal: ctx.signal });
  root.addEventListener('change', e => { const id = e.target.id; if (id === 'bc-type') applyType(); else if (id === 'bc-height' || id === 'bc-thin') draw(); }, { signal: ctx.signal });
  $('#bc-create').addEventListener('click', draw, { signal: ctx.signal });
  $('#bc-save').addEventListener('click', () => { if (!svg) return; downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), name + '.svg'); ctx.showToast('Đã tạo mã vạch SVG.'); }, { signal: ctx.signal });
  $('#bc-png').addEventListener('click', savePng, { signal: ctx.signal });
  $('#bc-file').addEventListener('change', async e => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setText(root, '#bc-read', 'Ảnh quá lớn (giới hạn 8 MB).'); return; }
    if (!('BarcodeDetector' in window)) { setText(root, '#bc-read', 'Trình duyệt này chưa hỗ trợ quét mã vạch. Hãy dùng Chrome hoặc Edge.'); return; }
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const detector = new BarcodeDetector({ formats: ['code_39', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'qr_code'] });
        const result = await detector.detect(bitmap);
        setText(root, '#bc-read', result.length ? `Đọc được: ${result.map(x => x.rawValue).join(' | ').slice(0, 250)}` : 'Không tìm thấy mã vạch trong ảnh.');
      } finally { bitmap.close(); }
    } catch { setText(root, '#bc-read', 'Không quét được ảnh này.'); }
  }, { signal: ctx.signal });

  applyType();
}
