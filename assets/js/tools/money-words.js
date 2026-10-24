/**
 * Epsilon Soft – Đọc số tiền thành chữ.
 * Pure logic (exported for tests) + mount(root, ctx) UI, same contract as PDF Studio.
 * Uses BigInt so very large amounts never lose precision.
 */
const shared = globalThis.EpsilonSoftShared || {};
const ic = (name, size) => { try { return shared.icon ? shared.icon(name, size) : ''; } catch { return ''; } };

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const MAX_INT_DIGITS = 21;

export const CURRENCIES = {
  VND: { label: 'Đồng Việt Nam (VND)', vi: 'đồng', viSub: '', en: 'dong', enPlural: 'dong', enSub: '', decimals: 0 },
  USD: { label: 'Đô la Mỹ (USD)', vi: 'đô la Mỹ', viSub: 'xu', en: 'US dollar', enPlural: 'US dollars', enSub: 'cent', decimals: 2 },
  EUR: { label: 'Euro (EUR)', vi: 'euro', viSub: 'xu', en: 'euro', enPlural: 'euros', enSub: 'cent', decimals: 2 },
  NONE: { label: 'Chỉ đọc số', vi: '', viSub: '', en: '', enPlural: '', enSub: '', decimals: 6 },
};

/**
 * Parse "1.250.000", "1,250,000.50", "1 250 000,5", "-3,05"...
 * format: 'auto' | 'vn' (dot thousands, comma decimal) | 'intl' (comma thousands, dot decimal)
 * Returns { negative, int: '1250000', frac: '50' } with no leading zeros in int.
 */
export function parseAmount(input, format = 'auto', currency = 'VND') {
  let s = String(input ?? '').trim().replace(/\s+/g, '').replace(/(đồng|đ|vnd|usd|eur|\$|€)$/i, '');
  if (!s) throw new Error('Nhập số tiền cần đọc.');
  let negative = false;
  if (/^[-−]/.test(s)) { negative = true; s = s.slice(1); }
  else if (s.startsWith('+')) s = s.slice(1);
  if (!/^[0-9.,]+$/.test(s)) throw new Error('Số tiền chỉ gồm chữ số và dấu chấm/phẩy, ví dụ 1.250.000 hoặc 1,250,000.50.');
  if (!/[0-9]/.test(s)) throw new Error('Số tiền chưa có chữ số nào.');

  let dec = null; // decimal separator, or null when none
  const dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length;
  if (format === 'vn') dec = ',';
  else if (format === 'intl') dec = '.';
  else if (dots && commas) dec = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
  else if (dots + commas === 0) dec = null;
  else {
    const sep = dots ? '.' : ',', count = dots || commas;
    const tail = s.split(sep).pop();
    // "1.250.000" or "1.250" read as thousands; "12,5" or "3.05" read as decimals.
    if (count > 1) dec = null;
    else if (tail.length === 3) dec = null; // Vietnamese habit: 1.250 = một nghìn hai trăm năm mươi
    else dec = sep;
  }
  const thousands = dec === ',' ? '.' : dec === '.' ? ',' : null;
  let intRaw = s, fracRaw = '', hasDec = false;
  if (dec) {
    const at = s.lastIndexOf(dec);
    if (s.indexOf(dec) !== at) throw new Error(`Dấu thập phân "${dec}" chỉ được xuất hiện một lần.`);
    if (at >= 0) { intRaw = s.slice(0, at); fracRaw = s.slice(at + 1); hasDec = true; }
  }
  if (thousands && intRaw.includes(thousands)) {
    const parts = intRaw.split(thousands);
    if (!parts[0] || parts[0].length > 3 || parts.slice(1).some(p => p.length !== 3)) {
      throw new Error(`Nhóm hàng nghìn chưa đúng: mỗi nhóm sau dấu "${thousands}" phải có 3 chữ số.`);
    }
    intRaw = parts.join('');
  } else if (!dec) {
    // No decimal: every separator is a thousands separator.
    const parts = intRaw.split(/[.,]/);
    if (parts.length > 1 && (!parts[0] || parts[0].length > 3 || parts.slice(1).some(p => p.length !== 3))) {
      throw new Error('Nhóm hàng nghìn chưa đúng: mỗi nhóm sau dấu phân cách phải có 3 chữ số.');
    }
    intRaw = parts.join('');
  }
  if (/[.,]/.test(intRaw) || /[.,]/.test(fracRaw)) throw new Error('Không nhận dạng được dấu phân cách. Hãy chọn kiểu số Việt Nam hoặc Quốc tế.');
  if (hasDec && fracRaw === '') throw new Error('Thiếu chữ số sau dấu thập phân.');
  if (hasDec && intRaw === '') intRaw = '0';
  const int = (intRaw.replace(/^0+/, '') || '0');
  if (int.length > MAX_INT_DIGITS) throw new Error(`Số quá lớn: tối đa ${MAX_INT_DIGITS} chữ số phần nguyên.`);
  const frac = fracRaw.replace(/0+$/, '');
  if (int === '0' && !frac) negative = false;
  return { negative, int, frac };
}

/** Read 3 digits. `full`: the group is not the leading one, so "không trăm" / "lẻ" are spoken. */
function readTriple(h, t, u, full, opt) {
  if (!h && !t && !u) return '';
  const out = [];
  if (h || full) out.push(DIGITS[h], 'trăm');
  if (t === 0) {
    if (u) { if (h || full) out.push(opt.le); out.push(DIGITS[u]); }
  } else if (t === 1) {
    out.push('mười');
    if (u === 5) out.push('lăm');
    else if (u) out.push(DIGITS[u]);
  } else {
    out.push(DIGITS[t], 'mươi');
    if (u === 1) out.push('mốt');
    else if (u === 4) out.push(opt.four);
    else if (u === 5) out.push('lăm');
    else if (u) out.push(DIGITS[u]);
  }
  return out.join(' ');
}

const BILLION = 1000000000n;
function readBig(n, leading, opt) {
  if (n >= BILLION) {
    const high = n / BILLION, low = n % BILLION;
    let s = readBig(high, leading, opt) + ' tỷ';
    if (low > 0n) s += ' ' + readBig(low, false, opt);
    return s;
  }
  const groups = [[n / 1000000n, 'triệu'], [(n / 1000n) % 1000n, 'nghìn'], [n % 1000n, '']];
  const out = [];
  let started = !leading;
  for (const [g, unit] of groups) {
    const v = Number(g);
    if (!v) continue;
    const words = readTriple(Math.floor(v / 100), Math.floor(v / 10) % 10, v % 10, started, opt);
    out.push(unit ? words + ' ' + unit : words);
    started = true;
  }
  return out.join(' ');
}

export function readIntegerVi(digits, options = {}) {
  const opt = { le: options.le || 'lẻ', four: options.four || 'tư' };
  const n = BigInt(digits);
  if (n === 0n) return 'không';
  return readBig(n, true, opt);
}

/** Decimal digits after the point: leading zeros spoken one by one, the rest as a number. */
export function readFractionVi(frac, options = {}) {
  if (!frac) return '';
  const zeros = frac.match(/^0*/)[0].length;
  const rest = frac.slice(zeros);
  return [...Array(zeros).fill('không'), ...(rest ? [readIntegerVi(rest, options)] : [])].join(' ');
}

const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const EN_SCALES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion'];
function enTriple(v) {
  const h = Math.floor(v / 100), r = v % 100, out = [];
  if (h) out.push(EN_ONES[h], 'hundred');
  if (r) out.push(r < 20 ? EN_ONES[r] : EN_TENS[Math.floor(r / 10)] + (r % 10 ? '-' + EN_ONES[r % 10] : ''));
  return out.join(' ');
}
export function readIntegerEn(digits) {
  let n = BigInt(digits);
  if (n === 0n) return 'zero';
  const parts = [];
  for (let i = 0; n > 0n; i++, n /= 1000n) {
    const v = Number(n % 1000n);
    if (v) parts.unshift(enTriple(v) + (EN_SCALES[i] ? ' ' + EN_SCALES[i] : ''));
  }
  return parts.join(' ');
}

const capitalize = s => s ? s.charAt(0).toLocaleUpperCase('vi') + s.slice(1) : s;

/** Full Vietnamese + English reading of an amount. */
export function amountToWords(input, { currency = 'VND', format = 'auto', le = 'lẻ', four = 'tư', even = false } = {}) {
  const cur = CURRENCIES[currency] || CURRENCIES.VND;
  const parsed = parseAmount(input, format, currency);
  let { int, frac } = parsed;
  if (cur.decimals === 0 && frac) throw new Error('Tiền đồng không có phần thập phân. Hãy làm tròn hoặc chọn "Chỉ đọc số".');
  if (cur.decimals === 2 && frac.length > 2) throw new Error(`${cur.label} chỉ có 2 chữ số thập phân (xu/cent).`);
  if (cur.decimals === 6 && frac.length > 6) throw new Error('Tối đa 6 chữ số sau dấu thập phân.');
  const opt = { le, four };
  const sign = parsed.negative ? 'âm ' : '';
  const signEn = parsed.negative ? 'minus ' : '';
  let vi, en;
  if (currency === 'NONE') {
    vi = sign + readIntegerVi(int, opt) + (frac ? ' phẩy ' + readFractionVi(frac, opt) : '');
    en = signEn + readIntegerEn(int) + (frac ? ' point ' + [...frac].map(d => EN_ONES[+d]).join(' ') : '');
  } else {
    const cents = cur.decimals === 2 ? (frac + '00').slice(0, 2).replace(/^0/, '') || '0' : '0';
    const hasCents = cents !== '0';
    vi = sign + readIntegerVi(int, opt) + ' ' + cur.vi;
    if (hasCents) vi += ' và ' + readIntegerVi(cents, opt) + ' ' + cur.viSub;
    else if (even) vi += ' chẵn';
    const unitEn = int === '1' ? cur.en : cur.enPlural;
    en = signEn + readIntegerEn(int) + ' ' + unitEn;
    if (hasCents) en += ' and ' + readIntegerEn(cents) + ' ' + cur.enSub + (cents === '1' ? '' : 's');
    else if (even) en += ' only';
  }
  return { vi: capitalize(vi), en: capitalize(en), parsed, formatted: formatAmount(parsed, currency) };
}

export function formatAmount({ negative, int, frac }, currency = 'VND') {
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cur = CURRENCIES[currency] || CURRENCIES.VND;
  let fracOut = frac;
  if (cur.decimals === 2 && frac) fracOut = (frac + '00').slice(0, 2);
  return (negative ? '-' : '') + grouped + (fracOut ? ',' + fracOut : '');
}

/* ---------------------------------------------------------------- UI ---- */
// Layout uses the Epsilon Soft app classes (tool-box, form-grid, form-field, button-*).
// The app already shows the tool title, so this module starts with its content.
const STYLE_ID = 'es-money-style';
const CSS = `
.es-money .es-money-amount{font-size:28px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:.01em}
.es-money .es-money-check{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;color:#122766;margin-top:14px}
.es-money .es-money-check input{width:20px;height:20px;accent-color:var(--purple,#5a20db)}
.es-money .es-money-samples{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.es-money .es-money-number{font-size:18px;font-weight:800;color:#264caa;font-variant-numeric:tabular-nums;margin:0 0 6px}
.es-money .es-money-block{padding:14px 0;border-top:1px solid #e3e8f9}
.es-money .es-money-block:first-of-type{border-top:0;padding-top:4px}
.es-money .es-money-head{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:16px;font-weight:850;color:#264caa;margin-bottom:8px}
.es-money .es-money-vi{font-size:24px;line-height:1.4;font-weight:850;color:#03279b;margin:0;min-height:2.8em;overflow-wrap:anywhere}
.es-money .es-money-en{font-size:18px;line-height:1.5;font-weight:650;color:#1d2f7a;margin:0;min-height:1.5em;overflow-wrap:anywhere}

/* Compact Web-app scale; preserve labels, values and reading rules. */
.es-money{gap:12px}
.es-money .tool-box{padding:13px}
.es-money .tool-box-heading{margin-bottom:9px}
.es-money .form-grid{gap:9px;margin-top:10px!important}
.es-money .form-field select,.es-money .form-field>input{min-height:42px;padding:8px 10px}
.es-money .es-money-amount{font-size:24px}
.es-money .es-money-check{margin-top:9px}
.es-money .es-money-samples{margin-top:10px;gap:6px}
.es-money .es-money-block{padding:11px 0}
.es-money .es-money-vi{font-size:22px;min-height:2.2em}
.es-money .es-money-en{font-size:18px}
`;

export async function mount(root, ctx = {}) {
  if (!document.getElementById(STYLE_ID)) {
    const st = document.createElement('style'); st.id = STYLE_ID; st.textContent = CSS; document.head.append(st);
  }
  const signal = ctx.signal;
  const toast = (m, t = 'success') => ctx.showToast ? ctx.showToast(m, t) : console.log(m);
  root.innerHTML = `<div class="tool-grid-2 es-money">
   <section class="tool-box">
    <h2 class="tool-box-heading">${ic('calculator')} Số tiền cần đọc</h2>
    <label class="form-field"><span>Số tiền</span><input class="es-money-amount" id="mw-input" type="text" inputmode="decimal" autocomplete="off" maxlength="40" placeholder="1.250.000" value="1.250.000"></label>
    <div class="form-grid" style="margin-top:14px">
     <label class="form-field"><span>Loại tiền</span><select id="mw-currency">${Object.entries(CURRENCIES).map(([k, c]) => `<option value="${k}">${c.label}</option>`).join('')}</select></label>
     <label class="form-field"><span>Kiểu viết số</span><select id="mw-format"><option value="auto">Tự nhận dạng</option><option value="vn">Việt Nam: 1.250.000,50</option><option value="intl">Quốc tế: 1,250,000.50</option></select></label>
     <label class="form-field"><span>Số 0 ở hàng chục</span><select id="mw-le"><option value="lẻ">lẻ (một trăm lẻ năm)</option><option value="linh">linh (một trăm linh năm)</option></select></label>
     <label class="form-field"><span>Số 4 sau hàng chục</span><select id="mw-four"><option value="tư">tư (hai mươi tư)</option><option value="bốn">bốn (hai mươi bốn)</option></select></label>
    </div>
    <label class="es-money-check"><input type="checkbox" id="mw-even"> Thêm "chẵn" khi không có số lẻ</label>
    <div class="es-money-samples" aria-label="Ví dụ">${['1.250.000', '25.000.000', '1.000.000.005', '2.105.000', '15.500,25 USD'].map(v => `<button class="button button-soft button-sm" type="button" data-sample="${v}">${v}</button>`).join('')}</div>
   </section>
   <section class="tool-box" aria-live="polite">
    <h2 class="tool-box-heading">${ic('file')} Kết quả</h2>
    <p class="es-money-number" id="mw-num"></p>
    <p class="tool-error" id="mw-error" hidden></p>
    <div class="es-money-block"><div class="es-money-head"><span>Bằng chữ</span><button class="button button-outline button-sm" type="button" data-copy="vi">${ic('copy', 18)} Sao chép</button></div><p class="es-money-vi" id="mw-vi"></p></div>
    <div class="es-money-block"><div class="es-money-head"><span>In words (English)</span><button class="button button-outline button-sm" type="button" data-copy="en">${ic('copy', 18)} Copy</button></div><p class="es-money-en" id="mw-en"></p></div>
    <p class="tool-hint">Đọc theo cách viết phổ biến trên chứng từ kế toán. Hãy đối chiếu lại trước khi in hóa đơn chính thức.</p>
   </section>
  </div>`;
  const $ = s => root.querySelector(s);
  let current = null;
  function update() {
    const raw = $('#mw-input').value;
    let currency = $('#mw-currency').value;
    let text = raw;
    const m = raw.match(/\s*(usd|eur|vnd)\s*$/i);
    if (m) { currency = m[1].toUpperCase(); text = raw.slice(0, m.index); $('#mw-currency').value = currency; $('#mw-input').value = text; }
    try {
      current = amountToWords(text, { currency, format: $('#mw-format').value, le: $('#mw-le').value, four: $('#mw-four').value, even: $('#mw-even').checked });
      $('#mw-error').hidden = true;
      $('#mw-num').textContent = current.formatted + (currency === 'NONE' ? '' : ' ' + currency);
      $('#mw-vi').textContent = current.vi + '.';
      $('#mw-en').textContent = current.en + '.';
    } catch (e) {
      current = null;
      $('#mw-error').hidden = !text.trim();
      $('#mw-error').textContent = e.message;
      $('#mw-num').textContent = ''; $('#mw-vi').textContent = ''; $('#mw-en').textContent = '';
    }
    root.querySelectorAll('[data-copy]').forEach(b => { b.disabled = !current; });
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Đã sao chép.'); }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.append(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove();
      toast(ok ? 'Đã sao chép.' : 'Trình duyệt không cho sao chép, hãy bôi đen để chép.', ok ? 'success' : 'error');
    }
  }
  root.addEventListener('input', update, { signal });
  root.addEventListener('change', update, { signal });
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.sample) {
      const [num, cur] = b.dataset.sample.split(' ');
      $('#mw-input').value = num; $('#mw-currency').value = cur || 'VND'; update(); $('#mw-input').focus();
    }
    if (b.dataset.copy && current) copy((b.dataset.copy === 'vi' ? current.vi : current.en) + '.');
  }, { signal });
  update();
  return () => { root.innerHTML = ''; };
}
