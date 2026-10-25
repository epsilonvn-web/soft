/**
 * EPSILON SOFT - K-CALC for Web.
 * Reference: ES TOOLKIT V1.0/core/calculator.go,
 * ui_windows.go/drawCalculator(), main_windows.go/calcKey/evaluate,
 * calc_tokens.go, calc_grouping.go and display_format.go.
 * Only this tool is changed. No backend, eval(), Function() or third-party scripts.
 */
const { icon } = globalThis.EpsilonSoftShared || {};

const KEYS_SCIENCE = [
  ['DEG','RAD','MC','MR','CLR'],
  ['sin','cos','tan','log','ln'],
  ['√','x²','x³','xʸ','1/x'],
  ['π','e','(',')','%'],
  ['7','8','9','÷','AC'],
  ['4','5','6','×','DEL'],
  ['1','2','3','−','M+'],
  ['0','.','±','+','=']
];
const KEYS_SIMPLE = [
  ['7','8','9','÷'],
  ['4','5','6','×'],
  ['1','2','3','−'],
  ['0','.','(',')'],
  ['DEL','AC','+','=']
];

// Keep the same state while navigating to other tools, as the native Portable does.
// This is intentionally NOT persisted to localStorage or sent to a server.
const HISTORY_LIMIT = 5; // Keep the most recent five successful calculations only.

const session = {
  science: true, deg: true, ans: 0, memory: 0, hasMemory: false,
  expr: '', result: '0', error: '', history: [], finished: false
};

function isDigit(c) { return !!c && c >= '0' && c <= '9'; }
function isLetter(c) { return !!c && /^[a-z]$/i.test(c); }

/** Display-only thousands grouping ported from calc_grouping.go. */
export function groupCalculatorExpression(expression) {
  const s = String(expression);
  let out = '';
  for (let i = 0; i < s.length;) {
    // The fraction after a leading decimal dot has no integer part to group.
    if (isDigit(s[i]) && i > 0 && s[i - 1] === '.') {
      while (i < s.length && isDigit(s[i])) out += s[i++];
      continue;
    }
    if (!isDigit(s[i])) { out += s[i++]; continue; }
    let whole = '';
    while (i < s.length && (isDigit(s[i]) || s[i] === ',')) whole += s[i++];
    const digits = whole.replace(/,/g, '');
    out += digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (s[i] === '.') {
      out += s[i++];
      while (i < s.length && isDigit(s[i])) out += s[i++];
    }
    if (s[i] === 'e' || s[i] === 'E') {
      out += s[i++];
      if (s[i] === '+' || s[i] === '-') out += s[i++];
      while (i < s.length && isDigit(s[i])) out += s[i++];
    }
  }
  return out;
}

function rebaseCaret(before, after, caret) {
  let semantic = 0;
  for (let i = 0; i < Math.min(caret, before.length); i++) if (before[i] !== ',') semantic++;
  if (!semantic) return 0;
  let seen = 0;
  for (let i = 0; i < after.length; i++) {
    if (after[i] !== ',') seen++;
    if (seen === semantic) return i + 1;
  }
  return after.length;
}

/**
 * Exact operator order of core/calculator.go:
 * add > mul > unary > power > primitive; percent binds before exponent.
 * Supports grouping commas, Ans and the Portable functions including inverse trig.
 * A historical web-only postfix ! expression is retained for backward compatibility;
 * it is not exposed as a button and does not change native Portable operations.
 */
export function calculate(expression, angle = 'deg', ans = 0) {
  const s = String(expression ?? '')
    .replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-')
    .replaceAll('π', 'pi').replaceAll('√', 'sqrt')
    .replaceAll('，', ',').replaceAll('％', '%')
    .replaceAll('²', '^2').replaceAll('³', '^3').replaceAll(',', '');
  if (!s.trim()) throw new Error('Biểu thức chưa hoàn chỉnh');
  if (s.length > 512) throw new Error('Biểu thức dài quá 512 ký tự');
  if (!Number.isFinite(ans)) throw new Error('Ans không hợp lệ');
  const deg = angle !== 'rad' && angle !== false;
  let i = 0, depth = 0;
  function space() { while (i < s.length && /\s/u.test(s[i])) i++; }
  function eat(c) {
    space();
    if (s.startsWith(c, i)) { i += c.length; return true; }
    return false;
  }
  function primitive() {
    space();
    if (i >= s.length) throw new Error('Biểu thức chưa hoàn chỉnh');
    if (depth > 48) throw new Error('Biểu thức quá nhiều ngoặc');
    if (eat('(')) {
      depth++;
      const v = add();
      depth--;
      if (!eat(')')) throw new Error('Thiếu dấu ngoặc đóng');
      return v;
    }
    const start = i;
    while (isLetter(s[i])) i++;
    if (i > start) {
      const id = s.slice(start, i).toLowerCase();
      if (id === 'pi') return Math.PI;
      if (id === 'e') return Math.E;
      if (id === 'ans') return ans;
      if (!eat('(')) throw new Error(`Dùng ${id}(...)`);
      depth++;
      const v = add();
      depth--;
      if (!eat(')')) throw new Error(`Thiếu dấu ) sau ${id}`);
      const rad = deg ? v * Math.PI / 180 : v;
      switch (id) {
        case 'sin': return Math.sin(rad);
        case 'cos': return Math.cos(rad);
        case 'tan':
          if (Math.abs(Math.cos(rad)) < 1e-13) throw new Error('tan không xác định');
          return Math.tan(rad);
        case 'asin':
          if (v < -1 || v > 1) throw new Error('asin ngoài miền xác định');
          return Math.asin(v) * (deg ? 180 / Math.PI : 1);
        case 'acos':
          if (v < -1 || v > 1) throw new Error('acos ngoài miền xác định');
          return Math.acos(v) * (deg ? 180 / Math.PI : 1);
        case 'atan': return Math.atan(v) * (deg ? 180 / Math.PI : 1);
        case 'sqrt':
          if (v < 0) throw new Error('Không lấy căn số âm');
          return Math.sqrt(v);
        case 'ln':
          if (v <= 0) throw new Error('ln cần x > 0');
          return Math.log(v);
        case 'log':
          if (v <= 0) throw new Error('log cần x > 0');
          return Math.log10(v);
        case 'abs': return Math.abs(v);
        default: throw new Error(`Hàm không hỗ trợ: ${id}`);
      }
    }
    // Parse an ASCII decimal with an optional scientific exponent like the Go source.
    i = start;
    let dot = false, exponent = false;
    while (i < s.length) {
      const c = s[i];
      if (isDigit(c)) { i++; continue; }
      if (c === '.' && !dot && !exponent) { dot = true; i++; continue; }
      if ((c === 'e' || c === 'E') && !exponent) {
        exponent = true; i++;
        if (s[i] === '+' || s[i] === '-') i++;
        continue;
      }
      break;
    }
    if (i === start) throw new Error(`Ký tự không hợp lệ: ${s[i]}`);
    const raw = s.slice(start, i);
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) throw new Error('Số không hợp lệ');
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error('Kết quả không xác định');
    return value;
  }
  function power() {
    let v = primitive();
    for (;;) {
      if (eat('%')) { v /= 100; continue; }
      // Legacy, buttonless support for previously accepted web expressions.
      if (eat('!')) {
        if (!Number.isInteger(v) || v < 0 || v > 170) throw new Error('Giai thừa chỉ nhận số nguyên từ 0 đến 170');
        let n = 1;
        for (let j = 2; j <= v; j++) n *= j;
        v = n;
        continue;
      }
      break;
    }
    if (eat('^')) v = Math.pow(v, unary());
    return v;
  }
  function unary() {
    if (eat('+')) return unary();
    if (eat('-')) return -unary();
    return power();
  }
  function mul() {
    let v = unary();
    for (;;) {
      if (eat('*')) v *= unary();
      else if (eat('/')) {
        const right = unary();
        if (right === 0) throw new Error('Không thể chia cho 0');
        v /= right;
      } else break;
    }
    return v;
  }
  function add() {
    let v = mul();
    for (;;) {
      if (eat('+')) v += mul();
      else if (eat('-')) v -= mul();
      else break;
    }
    return v;
  }
  const result = add();
  space();
  if (i < s.length) throw new Error(`Ký tự không hợp lệ tại vị trí ${i + 1}`);
  if (!Number.isFinite(result)) throw new Error('Kết quả không xác định');
  return result;
}

/** Four decimals for the result, exactly the user's Portable display rule. */
export function formatCalculatorResult(value) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const ab = Math.abs(value);
  if (ab < 0.00005 || ab >= 1e14) {
    return value.toExponential(4).replace(/(\.\d*?[1-9])0+e/, '$1e').replace(/\.0+e/, 'e');
  }
  const raw = value.toFixed(4).replace(/\.?0+$/, '');
  if (raw === '-0') return '0';
  const [a, b] = raw.split('.');
  const grouped = a.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return b === undefined ? grouped : `${grouped}.${b}`;
}

const STYLES = `
.epsilon-kcalc{--kc-purple:#7532ec;--kc-deep:#31218e;--kc-blue:#314cdb;--kc-border:#e3d6fa;--kc-muted:#6674a6;color:#21167b;font-size:16px}
.epsilon-kcalc *{box-sizing:border-box}
.epsilon-kcalc .kc-header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:13px;flex-wrap:wrap}
.epsilon-kcalc .kc-title h2{font-size:27px;font-weight:850;color:#6327c9;margin:0 0 3px}
.epsilon-kcalc .kc-title p{margin:0;color:var(--kc-muted);font-size:16px}
.epsilon-kcalc .kc-mode{display:flex;gap:7px;padding:4px;background:#f3efff;border:1px solid #e0d4fc;border-radius:13px}
.epsilon-kcalc .kc-mode button{border:1px solid transparent;border-radius:9px;min-width:120px;height:45px;background:transparent;color:#663cc5;font-size:17px;font-weight:800}
.epsilon-kcalc .kc-mode button[aria-pressed="true"]{color:white;background:linear-gradient(110deg,#a747ed,#7026e6);box-shadow:0 5px 14px #6732b426}
.epsilon-kcalc .kc-columns{display:grid;grid-template-columns:minmax(340px,44%) minmax(0,1fr);gap:14px;align-items:stretch}
.epsilon-kcalc .kc-card{background:white;border:1px solid var(--kc-border);border-radius:18px;padding:16px;box-shadow:0 4px 12px #4731a108;min-width:0}
.epsilon-kcalc .kc-history-card{display:flex;flex-direction:column;min-height:642px}
.epsilon-kcalc .kc-pad-card{align-self:stretch}
.epsilon-kcalc .kc-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}
.epsilon-kcalc .kc-wordmark{color:#5027af;font-size:23px;font-weight:900;letter-spacing:1.2px}
.epsilon-kcalc .kc-angle{border-radius:10px;background:#efe6ff;color:#6924bd;padding:5px 17px;font-weight:850;font-size:16px}
.epsilon-kcalc .kc-history{flex:1;min-height:250px;max-height:420px;overflow:auto;border:1px solid #ead9fb;border-radius:15px;background:#faf6ff;padding:12px;display:flex;flex-direction:column;gap:5px;scrollbar-color:#c3a6e9 transparent}
.epsilon-kcalc .kc-history-empty{margin:auto;color:#789;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;font-size:17px}
.epsilon-kcalc .kc-history-empty .kc-sigma{font-size:43px;font-weight:900;color:#d3bafa}
.epsilon-kcalc .kc-history-line{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:baseline;padding:7px 9px;border-bottom:1px solid #ecdff8;font-size:18px}
.epsilon-kcalc .kc-history-line span{overflow-wrap:anywhere;color:#272038}
.epsilon-kcalc .kc-history-line b{color:#7026df;text-align:right;white-space:nowrap;font-weight:800}
.epsilon-kcalc .kc-expression-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0 8px;flex-wrap:wrap}
.epsilon-kcalc .kc-expression-head label{color:#251989;font-size:17px;font-weight:850;letter-spacing:.15px}
.epsilon-kcalc .kc-controls{display:flex;align-items:center;justify-content:flex-end;gap:6px;min-width:0}
.epsilon-kcalc .kc-controls button{border:1px solid #cfb0fb;background:#f4eaff;color:#5d22c5;border-radius:9px;min-height:35px;padding:5px 11px;font-size:16px;font-weight:750;line-height:1.2;white-space:nowrap}
.epsilon-kcalc .kc-controls button:hover{background:#e9ddff;border-color:#b99af5}
.epsilon-kcalc .kc-controls #kc-edit{background:#eff3ff;color:#2846b9;border-color:#ccdaff}
.epsilon-kcalc .kc-controls #kc-copy{background:#fff;color:#5a2dbb}
.epsilon-kcalc .kc-screen{border:1.5px solid #cba5f9;border-radius:12px;background:linear-gradient(145deg,#ffffff,#faf8ff);overflow:hidden;min-width:0;transition:border-color .15s,box-shadow .15s}
.epsilon-kcalc .kc-screen:focus-within{border-color:#9f65ef;box-shadow:0 0 0 3px #d5bfff55}
.epsilon-kcalc .kc-entry-wrap{position:relative;min-width:0}
.epsilon-kcalc .kc-input{display:block;width:100%;height:49px;border:0;border-radius:0;background:transparent;padding:9px 13px;text-align:left;color:#1b173c;font-size:21px;outline:none;min-width:0;caret-color:var(--kc-purple);font-variant-numeric:tabular-nums}
.epsilon-kcalc .kc-input:focus{outline:none;box-shadow:none}
.epsilon-kcalc.kc-finished .kc-input,.epsilon-kcalc.kc-touch .kc-input{caret-color:transparent}
.epsilon-kcalc .kc-mobile-caret{display:none;position:absolute;top:50%;left:13px;height:25px;width:2px;border-radius:2px;transform:translateY(-50%);background:#7631e9;pointer-events:none;animation:kc-blink 1s steps(1,end) infinite}
.epsilon-kcalc.kc-touch:not(.kc-finished) .kc-mobile-caret{display:block}
@keyframes kc-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
.epsilon-kcalc .kc-screen-divider{height:1px;margin:0 12px;background:#dfdaf4}
.epsilon-kcalc .kc-result{display:flex;align-items:center;justify-content:flex-end;min-height:47px;overflow-wrap:anywhere;padding:7px 13px;border:0;background:transparent;text-align:right;color:#0b1463;font-size:clamp(24px,2.1vw,32px);font-weight:900;line-height:1.16;width:100%;font-variant-numeric:tabular-nums}
.epsilon-kcalc .kc-result.is-error{font-size:16px;color:#bb2b37;text-align:left;justify-content:flex-start;font-weight:700;line-height:1.35}
.epsilon-kcalc .kc-notice{min-height:0;font-size:16px;color:#1a8574;text-align:left}
.epsilon-kcalc .kc-notice:empty{display:none}
@media(prefers-reduced-motion:reduce){.epsilon-kcalc .kc-mobile-caret{animation:none;opacity:1}}
.epsilon-kcalc .kc-keypad{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
.epsilon-kcalc .kc-keypad[data-cols="4"]{grid-template-columns:repeat(4,minmax(0,1fr))}
.epsilon-kcalc .kc-key{min-width:0;height:59px;padding:4px 7px;border-radius:10px;background:#fbfaff;color:#2e2089;border:1px solid #e6d8fc;font-weight:800;font-size:21px;transition:background .15s,box-shadow .15s}
.epsilon-kcalc .kc-key:hover{background:#f0e6ff;box-shadow:0 2px 8px #3e0c5f0e}
.epsilon-kcalc .kc-key:active{transform:scale(.985)}
.epsilon-kcalc .kc-key.modifier{color:#5a2fba;background:#efe9fc;font-size:18px}
.epsilon-kcalc .kc-key.modifier[aria-pressed="true"],.epsilon-kcalc .kc-key.equals{background:linear-gradient(125deg,#b24bf3,#7432eb);color:#fff;border-color:#9658ef}
.epsilon-kcalc .kc-key.op{font-size:30px;font-weight:900;line-height:1;color:#2433c8;background:#eef3ff;border-color:#d6dfff;text-shadow:0 1px 0 rgba(255,255,255,.45)}
.epsilon-kcalc .kc-key[data-key="÷"]{background:#e9f2ff;border-color:#bfd4ff;color:#0f58cd}
.epsilon-kcalc .kc-key[data-key="×"]{background:#e8fcfb;border-color:#bdeae6;color:#008f9d}
.epsilon-kcalc .kc-key[data-key="−"]{background:#fff3e9;border-color:#ffd8b8;color:#ef7a00}
.epsilon-kcalc .kc-key[data-key="+"]{background:#fff8df;border-color:#ffe59a;color:#bb7b00}
.epsilon-kcalc .kc-key.danger{color:#b12f52;background:#fff0f4;border-color:#f3ced8}
.epsilon-kcalc .kc-keypad[data-cols="4"] .kc-key{height:68px}
.epsilon-kcalc .kc-caption{margin:11px 4px 0;font-size:16px;color:#6575a9;line-height:1.5}
.epsilon-kcalc button:focus-visible{outline:3px solid #ffd700;outline-offset:2px}
@media(max-width:1030px){.epsilon-kcalc .kc-columns{grid-template-columns:minmax(0,1fr) minmax(0,1.05fr)}.epsilon-kcalc .kc-history-card{min-height:630px}.epsilon-kcalc .kc-key{height:58px}}
@media(max-width:780px){.epsilon-kcalc .kc-columns{grid-template-columns:1fr}.epsilon-kcalc .kc-history-card{min-height:0}.epsilon-kcalc .kc-history{min-height:165px;max-height:240px}.epsilon-kcalc .kc-pad-card{padding:12px}.epsilon-kcalc .kc-title h2{font-size:24px}}
@media(max-width:400px){.epsilon-kcalc .kc-keypad{gap:5px}.epsilon-kcalc .kc-key{font-size:18px;height:55px;padding:4px 2px}.epsilon-kcalc .kc-key.op{font-size:31px}.epsilon-kcalc .kc-mode button{min-width:105px}.epsilon-kcalc .kc-history-line{font-size:16px}}
@media(max-width:780px){
 .epsilon-kcalc .kc-expression-head{gap:5px;margin:11px 0 7px}
 .epsilon-kcalc .kc-expression-head label{font-size:16px}
 .epsilon-kcalc .kc-controls{gap:4px}
 .epsilon-kcalc .kc-controls button{padding:5px 9px;min-height:34px;font-size:16px}
 .epsilon-kcalc .kc-input{height:43px;font-size:19px}
 .epsilon-kcalc .kc-result{min-height:42px;font-size:27px}
 .epsilon-kcalc .kc-history{max-height:185px}
}
@media(max-width:360px){.epsilon-kcalc .kc-controls button{padding:5px 7px;font-size:16px}}

/* Desktop/laptop density aligned with ES TOOLKIT Portable: typography >=16px,
 * same keys, same calculations, mobile retains its approved sizes. */
@media (min-width: 1024px) and (max-height: 900px) {
.epsilon-kcalc .kc-header{gap:13px;margin-bottom:8px}
.epsilon-kcalc .kc-title h2{font-size:24px;margin-bottom:2px}
.epsilon-kcalc .kc-mode{gap:5px;padding:3px;border-radius:11px}
.epsilon-kcalc .kc-mode button{min-width:112px;height:38px;font-size:16px}
.epsilon-kcalc .kc-columns{gap:10px}
.epsilon-kcalc .kc-card{border-radius:14px;padding:11px}
.epsilon-kcalc .kc-history-card{min-height:0}
.epsilon-kcalc .kc-card-head{margin-bottom:7px}
.epsilon-kcalc .kc-wordmark{font-size:21px}
.epsilon-kcalc .kc-angle{padding:4px 13px}
.epsilon-kcalc .kc-history{min-height:160px;max-height:380px;padding:9px;border-radius:12px}
.epsilon-kcalc .kc-expression-head{margin:8px 0 5px}
.epsilon-kcalc .kc-expression-head label{font-size:17px}
.epsilon-kcalc .kc-controls button{min-height:30px;padding:4px 10px}
.epsilon-kcalc .kc-input{height:39px;padding:7px 12px;font-size:19px}
.epsilon-kcalc .kc-result{min-height:40px;padding:5px 12px;font-size:clamp(23px,2vw,29px)}
.epsilon-kcalc .kc-mobile-caret{height:22px}
.epsilon-kcalc .kc-keypad{gap:4px}
.epsilon-kcalc .kc-key{height:44px;padding:3px 6px;border-radius:9px;font-size:18px}
.epsilon-kcalc .kc-key.op{font-size:27px}
.epsilon-kcalc .kc-key.modifier{font-size:17px}
.epsilon-kcalc .kc-keypad[data-cols="4"] .kc-key{height:55px}
.epsilon-kcalc .kc-caption{margin:6px 2px 0;line-height:1.3}
}
`;

function keyClass(key, rowIndex, isScience, deg) {
  if (key === '=') return 'equals';
  if (key === 'AC' || key === 'DEL') return 'danger';
  if (['+','−','×','÷'].includes(key)) return 'op';
  if (isScience && rowIndex === 0) return 'modifier';
  return '';
}
function mapping(key) {
  const table = {
    'sin':'sin(', 'cos':'cos(', 'tan':'tan(', 'log':'log(', 'ln':'ln(',
    '√':'sqrt(', 'x²':'^2', 'x³':'^3', 'xʸ':'^',
    'π':'pi', '×':'*', '÷':'/', '−':'-', 'Ans':'ans'
  };
  if (Object.hasOwn(table, key)) return table[key];
  return /^[0-9.+*/()%e-]$/.test(key) ? key : null;
}

/** Use K-CALC's own keypad on touch-first phones/tablets, in both orientations. */
function usesTouchKeypad() {
  const points = navigator.maxTouchPoints || 0;
  const primaryTouch = typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const touchWithoutHover = points > 0 && typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: none)').matches;
  // iPadOS may report a desktop Mac user agent when using a trackpad.
  const ipadOS = navigator.platform === 'MacIntel' && points > 1;
  const mobileOS = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return primaryTouch || touchWithoutHover || ipadOS || mobileOS;
}

export function mount(root, ctx) {
  if (!icon) throw new Error('Thiếu thành phần giao diện EpsilonSoftShared.');
  root.innerHTML = `<style>${STYLES}</style>
  <section class="epsilon-kcalc" aria-label="Máy tính K-CALC">
    <div class="kc-header">
      <div class="kc-title"><h2 id="kc-title">Máy tính khoa học</h2><p id="kc-subtitle">Lịch sử · DEG / RAD · Bộ nhớ · Công thức khoa học</p></div>
      <div class="kc-mode" role="group" aria-label="Chọn chế độ máy tính">
        <button type="button" data-mode="science" aria-pressed="true">Science</button>
        <button type="button" data-mode="simple" aria-pressed="false">Simple</button>
      </div>
    </div>
    <div class="kc-columns">
      <section class="kc-card kc-history-card" aria-label="Lịch sử và phép tính">
        <div class="kc-card-head"><strong class="kc-wordmark">K-CALC</strong><span id="kc-badge" class="kc-angle">DEG</span></div>
        <div class="kc-history" id="kc-history" aria-label="Lịch sử tính toán"></div>
        <div class="kc-expression-head"><label for="kc-input">PHÉP TÍNH</label>
          <div class="kc-controls" role="group" aria-label="Thao tác với phép tính">
            <button type="button" id="kc-new" title="Bắt đầu phép tính mới">New</button>
            <button type="button" id="kc-edit" title="Sửa hoặc tính tiếp phép tính hiện tại">Edit</button>
            <button type="button" id="kc-copy" title="Sao chép kết quả">Copy</button>
          </div>
        </div>
        <div class="kc-screen" id="kc-screen" aria-label="Màn hình máy tính hai dòng">
          <div class="kc-entry-wrap"><input id="kc-input" class="kc-input" aria-label="Nhập biểu thức" inputmode="none" spellcheck="false" autocomplete="off" maxlength="500" placeholder="Nhập phép tính..." ><span id="kc-mobile-caret" class="kc-mobile-caret" aria-hidden="true"></span></div>
          <div class="kc-screen-divider" aria-hidden="true"></div>
          <output id="kc-result" class="kc-result" aria-label="Kết quả" aria-live="polite">0</output>
        </div>
        <div id="kc-notice" class="kc-notice" role="status" aria-live="polite"></div>
      </section>
      <section class="kc-card kc-pad-card" aria-label="Bàn phím máy tính"><div class="kc-keypad" id="kc-keypad"></div><p class="kc-caption" id="kc-caption">Có thể nhập bằng bàn phím. Enter hoặc = để tính. Nhập asin(...), acos(...), atan(...), abs(...) nếu cần.</p></section>
    </div>
  </section>`;
  const $ = s => root.querySelector(s);
  const input = $('#kc-input');
  const touchKeypadOnly = usesTouchKeypad();
  const surface = root.querySelector('.epsilon-kcalc');
  surface.classList.toggle('kc-touch', touchKeypadOnly);
  // Hide the native OS keyboard on touch devices. A CSS caret is positioned
  // separately because read-only mobile inputs often have no visible caret.
  input.readOnly = touchKeypadOnly || session.finished;
  input.inputMode = touchKeypadOnly ? 'none' : 'text';
  if (touchKeypadOnly) {
    input.setAttribute('aria-description', 'Chạm các phím K-CALC để nhập, không dùng bàn phím hệ thống.');
  }
  // Read-only touch inputs can reset their DOM selection to 0 when a keypad
  // button receives focus. Store the actual edit range separately.
  let touchCaretStart = 0;
  let touchCaretEnd = 0;
  const history = $('#kc-history');
  const result = $('#kc-result');
  const notice = $('#kc-notice');
  const badge = $('#kc-badge');
  const keypad = $('#kc-keypad');
  const modeButtons = [...root.querySelectorAll('[data-mode]')];
  const mobileCaret = $('#kc-mobile-caret');
  const caretCanvas = touchKeypadOnly ? document.createElement('canvas') : null;
  const caretMeasure = caretCanvas?.getContext('2d');

  function setFinished(done) {
    session.finished = Boolean(done);
    surface.classList.toggle('kc-finished', session.finished);
    input.readOnly = touchKeypadOnly || session.finished;
    updateMobileCaret();
  }

  function updateMobileCaret() {
    if (!touchKeypadOnly || !caretMeasure) return;
    const style = getComputedStyle(input);
    caretMeasure.font = style.font;
    const textBeforeCaret = input.value.slice(0, Math.max(0, touchCaretStart));
    const padding = parseFloat(style.paddingLeft) || 0;
    const left = padding + caretMeasure.measureText(textBeforeCaret).width - input.scrollLeft;
    // Never let a long expression paint the cursor outside the input.
    mobileCaret.style.left = Math.max(2, Math.min(input.clientWidth - 4, left)) + 'px';
  }

  function setNotice(text, error = false) {
    notice.textContent = text;
    notice.style.color = error ? '#b12f52' : '#08785d';
  }
  function renderHistory() {
    history.replaceChildren();
    if (session.history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'kc-history-empty';
      const sigma = document.createElement('div');
      sigma.className = 'kc-sigma'; sigma.textContent = '∑';
      const description = document.createElement('div');
      description.textContent = 'Lịch sử tính toán sẽ hiển thị tại đây';
      empty.append(sigma, description);
      history.append(empty);
      return;
    }
    for (const line of session.history) {
      const row = document.createElement('div');
      row.className = 'kc-history-line';
      const expr = document.createElement('span');
      expr.textContent = line.expr;
      const value = document.createElement('b');
      value.textContent = '=  ' + line.result;
      row.append(expr, value);
      history.append(row);
    }
    history.scrollTop = history.scrollHeight;
  }
  function renderResult() {
    let shown = session.result;
    if (!session.finished && !session.error) {
      // Preview is display-only: never changes Ans, history or stored result.
      const draft = input.value.trim();
      if (draft) {
        try { shown = formatCalculatorResult(calculate(draft, session.deg ? 'deg' : 'rad', session.ans)); }
        catch { shown = '—'; }
      } else shown = '0';
    }
    result.textContent = session.error || shown;
    result.classList.toggle('is-error', !!session.error);
    result.classList.toggle('is-preview-empty', shown === '—' && !session.error);
    updateMobileCaret();
  }
  function updateMode() {
    modeButtons.forEach(btn => btn.setAttribute('aria-pressed', String((btn.dataset.mode === 'science') === session.science)));
    $('#kc-title').textContent = session.science ? 'Máy tính khoa học' : 'Máy tính cơ bản';
    $('#kc-subtitle').textContent = session.science
      ? 'Lịch sử · DEG / RAD · Bộ nhớ · Công thức khoa học'
      : 'Cộng · Trừ · Nhân · Chia  |  Enter hoặc = để tính';
    badge.textContent = session.science ? (session.deg ? 'DEG' : 'RAD') : 'SIMPLE';
    const rows = session.science ? KEYS_SCIENCE : KEYS_SIMPLE;
    keypad.dataset.cols = String(rows[0].length);
    keypad.replaceChildren();
    rows.forEach((row, rowIndex) => row.forEach(key => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `kc-key ${keyClass(key, rowIndex, session.science, session.deg)}`;
      b.textContent = key;
      b.dataset.key = key;
      b.setAttribute('aria-label', key);
      if (key === 'DEG' || key === 'RAD') b.setAttribute('aria-pressed', String((key === 'DEG') === session.deg));
      keypad.append(b);
    }));
    $('#kc-caption').textContent = touchKeypadOnly
      ? 'Chạm các phím K-CALC để nhập phép tính. Bàn phím hệ thống được tắt trên thiết bị cảm ứng.'
      : session.science
        ? 'Có thể nhập bằng bàn phím. Enter hoặc = để tính. Nhập asin(...), acos(...), atan(...), abs(...) nếu cần.'
        : 'Máy tính cơ bản: cộng, trừ, nhân, chia, ngoặc và xóa. Enter hoặc = để tính.';
  }
  function focusInput() {
    // No OS keyboard on touch; focus the desktop editor without page jumping.
    if (touchKeypadOnly) return;
    try { input.focus({preventScroll:true}); } catch { input.focus(); }
  }
  function editRange() {
    if (touchKeypadOnly) return {start: touchCaretStart, end: touchCaretEnd};
    const start = input.selectionStart ?? input.value.length;
    return {start, end: input.selectionEnd ?? start};
  }
  function setEditRange(start, end = start) {
    if (touchKeypadOnly) { touchCaretStart = start; touchCaretEnd = end; }
    input.setSelectionRange(start, end);
    updateMobileCaret();
  }
  function regroup(start, end) {
    const before = input.value;
    const after = groupCalculatorExpression(before);
    if (before !== after) {
      input.value = after;
      start = rebaseCaret(before, after, start);
      end = rebaseCaret(before, after, end);
      input.setSelectionRange(start, end);
    }
    if (touchKeypadOnly) { touchCaretStart = start; touchCaretEnd = end; }
    session.expr = input.value;
    updateMobileCaret();
  }
  function replaceSelection(token) {
    const {start, end} = editRange();
    if (input.value.length - (end-start) + token.length > 500) {
      setNotice('Biểu thức chỉ được dài tối đa 500 ký tự.', true);
      return;
    }
    input.setRangeText(token, start, end, 'end');
    regroup(touchKeypadOnly ? start + token.length : input.selectionStart ?? input.value.length,
      touchKeypadOnly ? start + token.length : input.selectionEnd ?? input.value.length);
    session.error = '';
    renderResult(); setNotice(''); focusInput();
  }
  function resetExpression() {
    setFinished(false);
    input.value = '';
    setEditRange(0);
    session.expr = '';
    session.result = '0'; session.error = '';
    renderResult(); setNotice(''); focusInput();
  }
  function editExpression() {
    if (session.finished) setFinished(false);
    session.error = '';
    setEditRange(input.value.length);
    renderResult(); setNotice(''); focusInput();
  }
  // A digit begins a new calculation after equals; operators continue from Ans.
  // Edit is the explicit path for changing or extending the old expression.
  function prepareToken(key) {
    if (!session.finished) return;
    if (['+', '−', '×', '÷', '%', 'xʸ', 'x²', 'x³', '±'].includes(key)) {
      const previous = session.result.replaceAll(',', '');
      resetExpression();
      input.value = previous;
      session.expr = previous;
      setEditRange(input.value.length);
    } else {
      resetExpression();
    }
  }
  function execute() {
    const expr = input.value.trim();
    if (!expr || session.finished) return;
    try {
      const num = calculate(expr, session.deg ? 'deg' : 'rad', session.ans);
      const out = formatCalculatorResult(num);
      session.ans = num;
      session.result = out; session.error = '';
      session.history.push({expr, result:out});
      if (session.history.length > HISTORY_LIMIT) {
         session.history.splice(0, session.history.length - HISTORY_LIMIT);
       }
      setFinished(true);
      renderHistory(); renderResult();
      setNotice('');
    } catch (e) {
      session.error = 'Biểu thức không hợp lệ: ' + (e instanceof Error ? e.message : String(e));
      renderResult();setNotice('Vui lòng kiểm tra phép tính.', true);
    }
    focusInput();
  }
  function keyPress(key) {
    switch (key) {
      case 'New': case 'AC': resetExpression(); return;
      case 'Edit': editExpression(); return;
      case 'DEG': session.deg = true; updateMode(); renderResult(); break;
      case 'RAD': session.deg = false; updateMode(); renderResult(); break;
      case 'MC': session.memory = 0; session.hasMemory = false; setNotice('Đã xóa bộ nhớ'); break;
      case 'MR': prepareToken('MR'); replaceSelection(Number(session.memory.toPrecision(14)).toString()); break;
      case 'M+': session.memory += session.ans; session.hasMemory = true; setNotice('Đã cộng Ans vào bộ nhớ'); break;
      case 'CLR': session.history = []; session.error = ''; session.result = '0'; session.ans = 0; renderHistory(); renderResult(); setNotice('Đã xóa lịch sử'); break;
      case 'DEL': {
        if (session.finished) return; // Use Edit to change an evaluated expression.
        const {start: p, end} = editRange();
        // A thousands comma is visual only: backspace removes the nearest digit,
        // not just a separator that would immediately be reinserted.
        let start = p;
        if (p === end && p > 0) {
          while (start > 0 && input.value[start - 1] === ',') start--;
          start = Math.max(0, start - 1);
        }
        input.setRangeText('', start, end, 'end');
        regroup(touchKeypadOnly ? start : input.selectionStart ?? input.value.length,
          touchKeypadOnly ? start : input.selectionEnd ?? input.value.length);
        session.error = ''; renderResult(); setNotice(''); break;
      }
      case '=': execute(); return;
      case '1/x': {
        prepareToken('÷');
        const expr = input.value;
        input.value = expr ? `1/(${expr})` : '1/(';
        session.expr = input.value;
        setEditRange(input.value.length);
        session.error = ''; renderResult();setNotice('');break;
      }
      case '±': {
        prepareToken('±');
        const expr = input.value;
        input.value = expr.startsWith('-') ? expr.slice(1) : expr ? `-(${expr})` : '';
        session.expr = input.value;
        setEditRange(input.value.length);
        session.error = '';renderResult();setNotice('');break;
      }
      default: {
        const token = mapping(key);
        if (token !== null) { prepareToken(key); replaceSelection(token); }
      }
    }
    focusInput();
  }

  input.value = session.expr;
  setFinished(session.finished);
  setEditRange(input.value.length);
  updateMode();renderHistory();renderResult();
  if (touchKeypadOnly) {
    // A direct tap may move the caret without opening the OS keyboard.
    input.addEventListener('click', () => {
      touchCaretStart = input.selectionStart ?? input.value.length;
      touchCaretEnd = input.selectionEnd ?? touchCaretStart;
      updateMobileCaret();
    }, {signal:ctx.signal});
  }
  modeButtons.forEach(btn => btn.addEventListener('click', () => {session.science = btn.dataset.mode === 'science';updateMode();}, {signal:ctx.signal}));
  keypad.addEventListener('click', e => {
    const btn = e.target.closest('[data-key]');
    if (btn && keypad.contains(btn)) keyPress(btn.dataset.key);
  }, {signal:ctx.signal});
  $('#kc-new').addEventListener('click', () => keyPress('New'), {signal:ctx.signal});
  $('#kc-edit').addEventListener('click', () => keyPress('Edit'), {signal:ctx.signal});
  input.addEventListener('input', () => {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    regroup(start, end);
    session.error = '';renderResult();setNotice('');
  }, {signal:ctx.signal});
  input.addEventListener('keydown', e => {
    if (session.finished && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // After =, typing a number directly must start a new calculation,
      // including on a computer with a physical keyboard.
      if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault();
        resetExpression();
        replaceSelection(e.key);
        return;
      }
      const symbols = {'+': '+', '-':'−', '*':'×', '/':'÷'};
      if (Object.hasOwn(symbols, e.key)) {
        e.preventDefault(); keyPress(symbols[e.key]); return;
      }
    }
    if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); keyPress('DEL'); return;
    }
    if (e.key === 'Enter' || (e.key === '=' && !e.ctrlKey && !e.altKey)) {
      e.preventDefault();
      if (e.key === '=') { // Accept a literal = shortcut as the Go keypad does.
        execute();
      } else execute();
    }
    if (e.key === 'Escape') {e.preventDefault();resetExpression();}
  }, {signal:ctx.signal});
  $('#kc-copy').addEventListener('click', async () => {
    const visibleResult = result.textContent.trim();
    if (session.error || visibleResult === '—') return setNotice('Chưa có kết quả hợp lệ để sao chép.', true);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard không hỗ trợ');
      await navigator.clipboard.writeText(visibleResult);
      if (ctx.signal.aborted) return;
      setNotice('Đã sao chép kết quả');
    } catch {setNotice('Trình duyệt chưa cho phép sao chép. Hãy chọn kết quả và sao chép thủ công.', true);}
  }, {signal:ctx.signal});
}
