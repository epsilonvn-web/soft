import { icon as epsilonIcon } from '../ui-icons.js';
/**
 * Epsilon Soft - Color Mixer (RGB / CMYK)
 * Runs entirely in the browser. No remote requests or user-data uploads.
 * RGB uses weighted sRGB channel interpolation; CMYK uses weighted channel interpolation.
 * CMYK output is a screen simulation, NOT an ICC-based printing prediction.
 */

const PAIR_PRESETS = Object.freeze([
  { name: 'Biển & nắng', a: '#1479F5', b: '#FFD238' },
  { name: 'Đỏ & xanh', a: '#FF435B', b: '#3066F5' },
  { name: 'Tím & hồng', a: '#6C38DD', b: '#F75FB6' },
  { name: 'Xanh & kem', a: '#079C88', b: '#FFF1CC' },
]);
const CHANNELS = Object.freeze({
  rgb: [{ key: 'r', label: 'R', desc: 'Red', max: 255 }, { key: 'g', label: 'G', desc: 'Green', max: 255 }, { key: 'b', label: 'B', desc: 'Blue', max: 255 }],
  cmyk: [{ key: 'c', label: 'C', desc: 'Cyan', max: 100 }, { key: 'm', label: 'M', desc: 'Magenta', max: 100 }, { key: 'y', label: 'Y', desc: 'Yellow', max: 100 }, { key: 'k', label: 'K', desc: 'Black', max: 100 }],
});
const CLAMP = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 0) => Number(value.toFixed(digits));

export function rgbToCmyk(rgb) {
  if (!Array.isArray(rgb) || rgb.length !== 3 || rgb.some(x => !Number.isFinite(x) || x < 0 || x > 255)) throw new RangeError('RGB must contain three numbers from 0 to 255.');
  const [r, g, b] = rgb.map(v => v / 255);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1 - 1e-10) return [0, 0, 0, 100];
  return [((1 - r - k) / (1 - k)) * 100, ((1 - g - k) / (1 - k)) * 100, ((1 - b - k) / (1 - k)) * 100, k * 100];
}
export function cmykToRgb(cmyk) {
  if (!Array.isArray(cmyk) || cmyk.length !== 4 || cmyk.some(x => !Number.isFinite(x) || x < 0 || x > 100)) throw new RangeError('CMYK must contain four numbers from 0 to 100.');
  const [c, m, y, k] = cmyk.map(v => v / 100);
  return [c, m, y].map(v => Math.round(255 * (1 - v) * (1 - k)));
}
export function normalizeHex(input) {
  const normalized = String(input ?? '').trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{3}$/.test(normalized)) return '#' + [...normalized].map(ch => ch + ch).join('');
  if (/^[0-9A-F]{6}$/.test(normalized)) return '#' + normalized;
  return null;
}
export function hexToRgb(hex) {
  const valid = normalizeHex(hex);
  if (!valid) throw new RangeError('Invalid HEX color.');
  return [1, 3, 5].map(i => Number.parseInt(valid.slice(i, i + 2), 16));
}
export function rgbToHex(rgb) {
  if (!Array.isArray(rgb) || rgb.length !== 3 || rgb.some(n => !Number.isFinite(n))) throw new RangeError('Invalid RGB channels.');
  return '#' + rgb.map(n => Math.round(CLAMP(n, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function mixColors(a, b, weightB, mode = 'rgb') {
  const ratio = CLAMP(Number(weightB), 0, 1);
  if (!Number.isFinite(ratio) || !['rgb', 'cmyk'].includes(mode)) throw new RangeError('Invalid mixing mode or ratio.');
  const channels = mode === 'rgb' ? 3 : 4;
  if (![a, b].every(color => Array.isArray(color) && color.length === channels && color.every(Number.isFinite))) throw new RangeError('Invalid source channels.');
  return a.map((v, i) => v * (1 - ratio) + b[i] * ratio);
}

function rgbToHsl([r0, g0, b0]) {
  const r = r0 / 255, g = g0 / 255, b = b0 / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (min + max) / 2;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) { case r: h = ((g - b) / d) % 6; break; case g: h = (b - r) / d + 2; break; default: h = (r - g) / d + 4; }
    h = (h * 60 + 360) % 360;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - chroma / 2;
  const sector = Math.floor(hue / 60);
  const [r, g, b] = [[chroma, x, 0], [x, chroma, 0], [0, chroma, x], [0, x, chroma], [x, 0, chroma], [chroma, 0, x]][sector];
  return [r, g, b].map(v => Math.round(CLAMP(v + m, 0, 1) * 255));
}
function buildPalette(rgb, harmony) {
  const [h, s, l] = rgbToHsl(rgb);
  const swatches = {
    analogous: [[h - 60, s, l], [h - 30, s, l], [h, s, l], [h + 30, s, l], [h + 60, s, l]],
    complementary: [[h, s, CLAMP(l - .18, .08, .9)], [h, s, l], [h + 180, s, l], [h + 180, s, CLAMP(l + .16, .08, .9)], [h + 180, s, CLAMP(l - .18, .08, .9)]],
    triadic: [[h, s, l], [h + 120, s, l], [h + 240, s, l], [h + 120, s, CLAMP(l + .18, .08, .92)], [h + 240, s, CLAMP(l + .18, .08, .92)]],
    monochrome: [-.30, -.15, 0, .15, .30].map(offset => [h, s, CLAMP(l + offset, .06, .94)]),
  };
  return swatches[harmony].map(([hue, sat, light]) => rgbToHex(hslToRgb(hue, sat, light)));
}
function luminance(rgb) {
  const linear = rgb.map(channel => { const v = channel / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
}
function ratioFor(rgb, other) {
  const l1 = luminance(rgb), l2 = luminance(other);
  return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
}
function makeSource(hex) { const rgb = hexToRgb(hex); return { rgb, cmyk: rgbToCmyk(rgb) }; }
function formatRgb(values) { return 'RGB ' + values.map(v => Math.round(v)).join(', '); }
function formatCmyk(values) { return 'CMYK ' + values.map(v => `${round(v, 1)}%`).join(' · '); }
function safeSvg(name, size = 19) {return epsilonIcon(name,size);}

const STYLES = `
.epsilon-colorlab {--cl-ink:#111f66;--cl-muted:#60729d;--cl-purple:#6930de;--cl-border:#dfe5fa;color:var(--cl-ink);font-size:15px;max-width:1600px;margin:0 auto}
.epsilon-colorlab *{box-sizing:border-box}
.epsilon-colorlab button,.epsilon-colorlab input{font:inherit}
.epsilon-colorlab button{cursor:pointer}
.epsilon-colorlab button:focus-visible,.epsilon-colorlab input:focus-visible{outline:3px solid #ffcf26;outline-offset:2px}
.epsilon-colorlab .cl-head,.epsilon-colorlab .cl-panel,.epsilon-colorlab .cl-palette-panel{background:#fff;border:1px solid var(--cl-border);border-radius:17px;box-shadow:0 5px 20px #15266508}
.epsilon-colorlab .cl-head{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:17px 19px;margin-bottom:13px;background:linear-gradient(115deg,#fff 30%,#f1efff 100%)}
.epsilon-colorlab .cl-title{display:flex;align-items:center;gap:12px;min-width:0}
.epsilon-colorlab .cl-title-icon{background:linear-gradient(140deg,#9257f7,#4e2ad7);color:white;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;flex-shrink:0}
.epsilon-colorlab h2{font-size:22px;line-height:1.18;margin:0;font-weight:900;letter-spacing:-.5px}
.epsilon-colorlab .cl-sub{color:var(--cl-muted);margin:4px 0 0;line-height:1.4}
.epsilon-colorlab .cl-mode{display:flex;gap:4px;background:#eeedff;border-radius:12px;border:1px solid #dcd7fc;padding:4px;flex-shrink:0}
.epsilon-colorlab .cl-mode button{border:0;border-radius:9px;color:#5235a4;background:transparent;min-width:108px;min-height:41px;padding:7px 13px;font-weight:850;white-space:nowrap}
.epsilon-colorlab .cl-mode button[aria-pressed="true"]{color:#fff;background:linear-gradient(135deg,#813bf0,#542bd6);box-shadow:0 3px 10px #5f3bc63d}
.epsilon-colorlab .cl-cols{display:grid;grid-template-columns:minmax(0,1.04fr) minmax(0,.96fr);gap:13px;align-items:stretch}
.epsilon-colorlab .cl-panel{padding:18px;min-width:0}
.epsilon-colorlab .cl-section-heading{margin:0 0 13px;font-size:17px;font-weight:900;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.epsilon-colorlab .cl-muted{color:var(--cl-muted);font-weight:650;font-size:13px}
.epsilon-colorlab .cl-sources{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px}
.epsilon-colorlab .cl-source{display:flex;align-items:center;text-align:left;gap:9px;padding:10px;border-radius:13px;border:2px solid #e6e8fa;background:#fff;min-width:0;color:var(--cl-ink)}
.epsilon-colorlab .cl-source[aria-pressed="true"]{border-color:#7947eb;background:#f7f3ff;box-shadow:0 0 0 2px #e4daff}
.epsilon-colorlab .cl-source-swatch{width:45px;height:45px;border-radius:11px;flex:0 0 45px;box-shadow:inset 0 0 0 1px #00000012}
.epsilon-colorlab .cl-source-label{display:flex;flex-direction:column;min-width:0;gap:2px}
.epsilon-colorlab .cl-source-label b{font-size:15px}
.epsilon-colorlab .cl-source-label small{font-size:14px;font-weight:800;color:#4f60a2;white-space:nowrap}
.epsilon-colorlab .cl-editor{border:1px solid #e1e5fa;border-radius:13px;padding:13px;background:#f9faff}
.epsilon-colorlab .cl-editor-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.epsilon-colorlab .cl-editor-head b{color:#2f2597}
.epsilon-colorlab .cl-editor-main{display:grid;grid-template-columns:55px minmax(0,1fr);gap:10px;align-items:end;margin-bottom:10px}
.epsilon-colorlab .cl-picker{width:55px;height:45px;padding:4px;border-radius:10px;border:1px solid #ccd4f3;background:#fff;cursor:pointer}
.epsilon-colorlab .cl-hex-wrap{display:flex;flex-direction:column;gap:4px;font-weight:800;font-size:13px;color:#4d5c94}
.epsilon-colorlab .cl-hex-input{height:45px;width:100%;border-radius:9px;border:1px solid #cbd3f5;padding:7px 12px;background:#fff;color:#17216d;font-weight:900;letter-spacing:.5px;text-transform:uppercase}
.epsilon-colorlab .cl-channels{display:grid;gap:7px}
.epsilon-colorlab .cl-channel{display:grid;grid-template-columns:69px minmax(0,1fr) 70px;align-items:center;gap:9px}
.epsilon-colorlab .cl-channel label{font-size:13px;font-weight:900;color:#2b3b96}
.epsilon-colorlab .cl-range{width:100%;accent-color:#6c35da;cursor:pointer;min-width:0}
.epsilon-colorlab .cl-number{height:34px;min-width:0;width:100%;border:1px solid #d0d9f6;border-radius:8px;text-align:center;background:#fff;font-weight:850;color:#1f2f83;font-size:14px}
.epsilon-colorlab .cl-channel-unit{font-size:12px;color:#6675a4}
.epsilon-colorlab .cl-mix-controls{margin-top:17px}
.epsilon-colorlab .cl-mix-head{display:flex;align-items:center;justify-content:space-between;font-weight:900;gap:10px}
.epsilon-colorlab .cl-mix-head output{font-size:18px;color:#6030d4}
.epsilon-colorlab .cl-mix-range{display:block;width:100%;height:23px;accent-color:#6d34e5;cursor:pointer;margin:12px 0 4px}
.epsilon-colorlab .cl-mix-ends{display:flex;justify-content:space-between;color:#60709b;font-size:13px;font-weight:800}
.epsilon-colorlab .cl-mix-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}
.epsilon-colorlab .cl-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:39px;border:1px solid #cfcffa;border-radius:10px;padding:7px 12px;background:#fff;color:#4a2db2;font-weight:850}
.epsilon-colorlab .cl-btn:hover{background:#f2edff;border-color:#a997f9}
.epsilon-colorlab .cl-btn-primary{background:linear-gradient(120deg,#6930e1,#4d42da);color:#fff;border-color:transparent}
.epsilon-colorlab .cl-btn-primary:hover{background:#5421cf}
.epsilon-colorlab .cl-presets{margin-top:16px;border-top:1px solid #e6eafb;padding-top:13px}
.epsilon-colorlab .cl-preset-list{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
.epsilon-colorlab .cl-preset{display:inline-flex;align-items:center;gap:7px;border:1px solid #e0e4f7;background:#fff;border-radius:999px;padding:7px 11px;color:#3b4c93;font-weight:750;font-size:13px}
.epsilon-colorlab .cl-preset-pair{display:flex}
.epsilon-colorlab .cl-preset-pair i{display:block;width:15px;height:15px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #d8def1}
.epsilon-colorlab .cl-preset-pair i+i{margin-left:-6px}
.epsilon-colorlab .cl-right{display:flex;flex-direction:column;gap:12px;min-width:0}
.epsilon-colorlab .cl-result{position:relative;min-height:225px;border-radius:15px;display:flex;flex-direction:column;justify-content:space-between;padding:18px 20px;overflow:hidden;background:#813bd5;isolation:isolate}
.epsilon-colorlab .cl-result:after{content:"";position:absolute;width:220px;height:220px;border:1px solid currentColor;opacity:.13;right:-45px;top:-60px;border-radius:50%;box-shadow:0 0 0 25px #ffffff0a,0 0 0 52px #ffffff12;z-index:-1}
.epsilon-colorlab .cl-result-caption{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:850;letter-spacing:1.5px;text-transform:uppercase}
.epsilon-colorlab .cl-result-name{font-size:clamp(33px,4vw,55px);font-weight:950;letter-spacing:-1.6px;line-height:1;word-break:break-word}
.epsilon-colorlab .cl-result-under{font-weight:700;font-size:14px;opacity:.85}
.epsilon-colorlab .cl-result-values{display:grid;gap:8px}
.epsilon-colorlab .cl-value{display:flex;align-items:center;gap:9px;justify-content:space-between;padding:9px 10px;border-radius:10px;border:1px solid #e3e7fa;background:#f9faff;min-height:49px}
.epsilon-colorlab .cl-value div{min-width:0}
.epsilon-colorlab .cl-value b{display:block;color:#62739c;font-size:11px;letter-spacing:1px;text-transform:uppercase}
.epsilon-colorlab .cl-value code{display:block;color:#111e70;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:850;font-size:clamp(14px,1.15vw,17px);overflow-wrap:anywhere}
.epsilon-colorlab .cl-copy{min-height:34px;flex-shrink:0;font-size:12px;padding:5px 9px}
.epsilon-colorlab .cl-contrast{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.epsilon-colorlab .cl-contrast-sample{display:flex;align-items:center;justify-content:space-between;gap:5px;padding:12px;border-radius:12px;border:1px solid #dce3fa;font-weight:850;font-size:14px}
.epsilon-colorlab .cl-contrast-sample small{font-size:12px;font-weight:800}
.epsilon-colorlab .cl-palette-panel{margin-top:13px;padding:18px}
.epsilon-colorlab .cl-palette-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.epsilon-colorlab .cl-pal-options{display:flex;gap:6px;flex-wrap:wrap;margin:13px 0 14px}
.epsilon-colorlab .cl-pal-options button{border:1px solid #dfe2fb;padding:8px 12px;border-radius:10px;background:#fff;color:#4d5c91;font-weight:800;font-size:13px}
.epsilon-colorlab .cl-pal-options button[aria-pressed="true"]{background:#ede7ff;border-color:#9b77f7;color:#5421c5}
.epsilon-colorlab .cl-palette-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}
.epsilon-colorlab .cl-palette-tile{padding:0;border:1px solid #dfe4f6;border-radius:12px;background:#fff;overflow:hidden;min-width:0;text-align:left;color:#263783;font-weight:900}
.epsilon-colorlab .cl-palette-tile:hover{border-color:#956ded;box-shadow:0 4px 12px #2f1e9e14}
.epsilon-colorlab .cl-palette-color{display:block;height:100px}
.epsilon-colorlab .cl-palette-code{display:flex;justify-content:space-between;align-items:center;gap:4px;padding:10px 9px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px}
.epsilon-colorlab .cl-palette-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:14px}
.epsilon-colorlab .cl-warning{display:flex;gap:9px;align-items:flex-start;margin:13px 0 0;color:#58698b;font-size:13px;line-height:1.45;background:#f5f8ff;border:1px solid #e0e8fc;padding:10px 12px;border-radius:11px}
.epsilon-colorlab .cl-warning svg{color:#6140dd;flex-shrink:0;margin-top:1px}
@media(max-width:1100px){.epsilon-colorlab .cl-cols{grid-template-columns:1fr 1fr}.epsilon-colorlab .cl-panel{padding:13px}.epsilon-colorlab .cl-result{min-height:218px}}
@media(max-width:850px){.epsilon-colorlab .cl-cols{grid-template-columns:1fr}.epsilon-colorlab .cl-right{display:grid;grid-template-columns:1fr 1fr;align-content:start}.epsilon-colorlab .cl-result{grid-row:span 2;min-height:240px}.epsilon-colorlab .cl-contrast{grid-column:1/-1}}
@media(max-width:620px){.epsilon-colorlab .cl-head{flex-wrap:wrap;padding:13px}.epsilon-colorlab h2{font-size:20px}.epsilon-colorlab .cl-mode{width:100%}.epsilon-colorlab .cl-mode button{flex:1}.epsilon-colorlab .cl-panel,.epsilon-colorlab .cl-palette-panel{padding:12px}.epsilon-colorlab .cl-right{display:flex}.epsilon-colorlab .cl-result{min-height:205px}.epsilon-colorlab .cl-palette-color{height:75px}.epsilon-colorlab .cl-palette-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.epsilon-colorlab .cl-palette-code{font-size:10px;padding:9px 3px}.epsilon-colorlab .cl-palette-code svg{display:none}.epsilon-colorlab .cl-channel{grid-template-columns:48px minmax(0,1fr) 60px;gap:5px}.epsilon-colorlab .cl-channel label{font-size:12px}.epsilon-colorlab .cl-source{padding:7px;gap:7px}.epsilon-colorlab .cl-source-swatch{height:37px;width:37px;flex-basis:37px}.epsilon-colorlab .cl-source-label small{font-size:12px}.epsilon-colorlab .cl-palette-head{align-items:flex-start}}
@media(max-width:350px){.epsilon-colorlab .cl-source-swatch{height:30px;width:30px;flex-basis:30px}.epsilon-colorlab .cl-source-label small{font-size:11px}.epsilon-colorlab .cl-palette-code{font-size:9px}}
`;

function sourceButton(index, letter) {
  return `<button type="button" class="cl-source" data-source="${index}" aria-pressed="${index === 0}" aria-label="Chỉnh màu ${letter}"><span class="cl-source-swatch" data-source-patch="${index}"></span><span class="cl-source-label"><b>Màu ${letter}</b><small data-source-code="${index}"></small></span></button>`;
}
function template() {
  return `<style>${STYLES}</style><section class="epsilon-colorlab" aria-label="Phối màu RGB và CMYK">
    <div class="cl-head"><div class="cl-title"><span class="cl-title-icon">${safeSvg('palette', 28)}</span><div><h2>Phối màu RGB & CMYK</h2><p class="cl-sub">Pha màu, đổi mã và tạo bảng phối hài hòa</p></div></div><div class="cl-mode" role="group" aria-label="Chọn mô hình phối màu"><button type="button" data-color-mode="rgb" aria-pressed="true">RGB · Màn hình</button><button type="button" data-color-mode="cmyk" aria-pressed="false">CMYK · In ấn</button></div></div>
    <div class="cl-cols"><section class="cl-panel"><h3 class="cl-section-heading">${safeSvg('palette', 20)} Pha 2 màu <span class="cl-muted">· Điều chỉnh từng màu và tỷ lệ</span></h3>
      <div class="cl-sources">${sourceButton(0, 'A')}${sourceButton(1, 'B')}</div>
      <div class="cl-editor"><div class="cl-editor-head"><b id="cl-editing">Chỉnh màu A</b><span class="cl-muted" id="cl-current-model">RGB · 0–255</span></div><div class="cl-editor-main"><input id="cl-picker" class="cl-picker" type="color" aria-label="Chọn màu bằng bảng màu"><label class="cl-hex-wrap">Mã HEX<input id="cl-input-hex" class="cl-hex-input" inputmode="text" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Mã màu HEX"></label></div><div class="cl-channels" id="cl-channels"></div></div>
      <div class="cl-mix-controls"><div class="cl-mix-head"><label for="cl-ratio">Tỷ lệ pha</label><output for="cl-ratio" id="cl-ratio-label">50% / 50%</output></div><input id="cl-ratio" class="cl-mix-range" type="range" min="0" max="100" step="1" value="50" aria-label="Tỷ lệ màu B"><div class="cl-mix-ends"><span id="cl-a-share">A · 50%</span><span id="cl-b-share">B · 50%</span></div><div class="cl-mix-actions"><button type="button" class="cl-btn" data-action="swap">${safeSvg('swap')} Đổi màu A / B</button><button type="button" class="cl-btn" data-action="reset">${safeSvg('reset')} Đặt lại</button></div></div>
      <div class="cl-presets"><b>Phối màu mẫu</b><div class="cl-preset-list">${PAIR_PRESETS.map((p, i) => `<button type="button" class="cl-preset" data-preset="${i}"><span class="cl-preset-pair"><i style="background:${p.a}"></i><i style="background:${p.b}"></i></span>${p.name}</button>`).join('')}</div></div></section>
      <section class="cl-panel cl-right"><div class="cl-result" id="cl-result-preview" role="img" aria-label="Màu kết quả"><span class="cl-result-caption">${safeSvg('palette', 17)} Màu sau khi pha</span><div><div class="cl-result-name" id="cl-result-hex">#000000</div><div class="cl-result-under" id="cl-result-mode">Pha theo RGB</div></div></div><div class="cl-result-values"><div class="cl-value"><div><b>HEX</b><code id="cl-hex">#000000</code></div><button class="cl-btn cl-copy" type="button" data-copy="hex">${safeSvg('copy', 15)} Sao chép</button></div><div class="cl-value"><div><b>RGB</b><code id="cl-rgb"></code></div><button class="cl-btn cl-copy" type="button" data-copy="rgb">${safeSvg('copy', 15)} Sao chép</button></div><div class="cl-value"><div><b>CMYK</b><code id="cl-cmyk"></code></div><button class="cl-btn cl-copy" type="button" data-copy="cmyk">${safeSvg('copy', 15)} Sao chép</button></div></div><div class="cl-contrast"><div class="cl-contrast-sample" id="cl-contrast-light"><span>Chữ trắng</span><small></small></div><div class="cl-contrast-sample" id="cl-contrast-dark"><span>Chữ đen</span><small></small></div></div></section>
    </div><section class="cl-palette-panel"><div class="cl-palette-head"><h3 class="cl-section-heading" style="margin:0">${safeSvg('palette', 20)} Gợi ý bảng phối</h3><span class="cl-muted">Chạm vào ô màu để sao chép mã HEX</span></div><div class="cl-pal-options" role="group" aria-label="Kiểu phối màu"><button type="button" data-harmony="analogous" aria-pressed="true">Tương đồng</button><button type="button" data-harmony="complementary" aria-pressed="false">Bổ túc</button><button type="button" data-harmony="triadic" aria-pressed="false">Tam giác</button><button type="button" data-harmony="monochrome" aria-pressed="false">Đơn sắc</button></div><div class="cl-palette-grid" id="cl-palette-grid"></div><div class="cl-palette-actions"><span class="cl-muted">Từ màu kết quả · 5 gợi ý</span><div class="cl-mix-actions" style="margin:0"><button class="cl-btn" type="button" data-action="css">${safeSvg('copy', 16)} Sao chép CSS</button><button class="cl-btn cl-btn-primary" type="button" data-action="png">${safeSvg('download', 16)} Tải bảng màu PNG</button></div></div><p class="cl-warning">${safeSvg('info', 18)} RGB và CMYK tại đây là mô phỏng số. Màu in thực tế còn phụ thuộc máy in, mực, giấy và hồ sơ ICC; công cụ không thay thế bảng màu in thử.</p></section>
    <span id="cl-live" role="status" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)"></span>
  </section>`;
}

export function mount(root, ctx = {}) {
  root.innerHTML = template();
  const $ = selector => root.querySelector(selector);
  const state = { mode: 'rgb', sources: [makeSource('#1479F5'), makeSource('#FFD238')], selected: 0, ratio: 50, harmony: 'analogous' };
  let colors = [], resultRGB = [], resultCMYK = [], resultHex = '';
  const listen = (element, type, handler) => element?.addEventListener(type, handler, ctx.signal ? { signal: ctx.signal } : undefined);
  const notify = (message, kind = 'success') => { $('#cl-live').textContent = message; ctx.showToast?.(message, kind); };
  const updateSource = (rgb, cmyk, index = state.selected) => { state.sources[index] = { rgb, cmyk }; render(); };
  function getChannels() { return state.mode === 'rgb' ? state.sources[state.selected].rgb : state.sources[state.selected].cmyk; }
  function renderEditorChannels(rebuild = true) {
    const selected = state.sources[state.selected];
    $('#cl-editing').textContent = 'Chỉnh màu ' + (state.selected === 0 ? 'A' : 'B');
    $('#cl-current-model').textContent = state.mode === 'rgb' ? 'RGB · 0–255' : 'CMYK · 0–100%';
    const rgbHex = rgbToHex(selected.rgb);
    $('#cl-picker').value = rgbHex.toLowerCase();
    $('#cl-input-hex').value = rgbHex;
    const channels = CHANNELS[state.mode];
    const values = getChannels();
    if (rebuild || $('#cl-channels').children.length !== channels.length) {
      $('#cl-channels').innerHTML = channels.map((ch, i) => `<div class="cl-channel"><label for="cl-range-${ch.key}" title="${ch.desc}">${ch.label} · ${ch.desc.slice(0, 3)}</label><input id="cl-range-${ch.key}" class="cl-range" type="range" data-channel="${i}" min="0" max="${ch.max}" step="1" value="${Math.round(values[i])}" aria-label="${ch.desc}"><input class="cl-number" data-number-channel="${i}" type="number" inputmode="numeric" min="0" max="${ch.max}" step="1" value="${Math.round(values[i])}" aria-label="${ch.desc} dạng số"></div>`).join('');
    } else {
      $('#cl-channels').querySelectorAll('[data-channel]').forEach((input, i) => { input.value = String(Math.round(values[i])); });
      $('#cl-channels').querySelectorAll('[data-number-channel]').forEach((input, i) => {
        if (document.activeElement !== input) input.value = String(Math.round(values[i]));
      });
    }
  }
  function render(rebuildChannels = true) {
    const [a, b] = state.sources;
    for (let i = 0; i < 2; i++) {
      const source = state.sources[i];
      const patch = $(`[data-source-patch="${i}"]`);
      patch.style.background = rgbToHex(source.rgb);
      $(`[data-source-code="${i}"]`).textContent = rgbToHex(source.rgb);
      $(`[data-source="${i}"]`).setAttribute('aria-pressed', String(state.selected === i));
    }
    renderEditorChannels(rebuildChannels);
    $('#cl-ratio').value = String(state.ratio);
    $('#cl-ratio-label').textContent = `${100 - state.ratio}% / ${state.ratio}%`;
    $('#cl-a-share').textContent = `A · ${100 - state.ratio}%`;
    $('#cl-b-share').textContent = `B · ${state.ratio}%`;
    $('#cl-ratio').style.background = `linear-gradient(to right, ${rgbToHex(a.rgb)}, ${rgbToHex(b.rgb)})`;
    const mix = mixColors(state.mode === 'rgb' ? a.rgb : a.cmyk, state.mode === 'rgb' ? b.rgb : b.cmyk, state.ratio / 100, state.mode);
    resultRGB = state.mode === 'rgb' ? mix.map(Math.round) : cmykToRgb(mix);
    resultCMYK = state.mode === 'rgb' ? rgbToCmyk(resultRGB) : mix;
    resultHex = rgbToHex(resultRGB);
    const preview = $('#cl-result-preview');
    preview.style.background = resultHex;
    const textColor = ratioFor(resultRGB, [255, 255, 255]) >= ratioFor(resultRGB, [0, 0, 0]) ? '#FFFFFF' : '#11142F';
    preview.style.color = textColor;
    preview.setAttribute('aria-label', `Màu kết quả ${resultHex}`);
    $('#cl-result-hex').textContent = resultHex;
    $('#cl-result-mode').textContent = state.mode === 'rgb' ? 'Pha theo kênh RGB' : 'Pha theo kênh CMYK (mô phỏng)';
    $('#cl-hex').textContent = resultHex;
    $('#cl-rgb').textContent = formatRgb(resultRGB);
    $('#cl-cmyk').textContent = formatCmyk(resultCMYK);
    for (const [id, text] of [['light', '#FFFFFF'], ['dark', '#000000']]) {
      const contrast = ratioFor(resultRGB, hexToRgb(text));
      const el = $(`#cl-contrast-${id}`);
      el.style.background = resultHex;
      el.style.color = text;
      el.querySelector('small').textContent = `${contrast.toFixed(2)}:1 · ${contrast >= 7 ? 'AAA' : contrast >= 4.5 ? 'AA' : 'Chưa đạt AA'}`;
    }
    root.querySelectorAll('[data-color-mode]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.colorMode === state.mode)));
    root.querySelectorAll('[data-harmony]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.harmony === state.harmony)));
    colors = buildPalette(resultRGB, state.harmony);
    $('#cl-palette-grid').innerHTML = colors.map((hex, i) => `<button type="button" class="cl-palette-tile" data-swatch-index="${i}" aria-label="Sao chép ${hex}"><span class="cl-palette-color" style="background:${hex}"></span><span class="cl-palette-code">${hex}${safeSvg('copy', 13)}</span></button>`).join('');
  }
  function editChannel(i, raw) {
    const max = state.mode === 'rgb' ? 255 : 100;
    if (raw === '' || !Number.isFinite(Number(raw))) return;
    const value = Math.round(CLAMP(Number(raw), 0, max));
    const next = getChannels().slice();
    next[i] = value;
    if (state.mode === 'rgb') state.sources[state.selected] = { rgb: next, cmyk: rgbToCmyk(next) };
    else state.sources[state.selected] = { rgb: cmykToRgb(next), cmyk: next };
    render(false);
  }
  async function copyValue(value, label) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(value);
      notify(`Đã sao chép ${label}`);
    } catch { notify('Trình duyệt chưa cho phép sao chép. Anh có thể chọn và sao chép mã màu thủ công.', 'error'); }
  }
  async function downloadPalette() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 480;
    const context = canvas.getContext('2d');
    if (!context) { notify('Thiết bị không hỗ trợ xuất bảng màu.', 'error'); return; }
    context.fillStyle = '#F7F8FF'; context.fillRect(0, 0, 1200, 480);
    context.fillStyle = '#142369'; context.font = 'bold 36px Arial, sans-serif'; context.fillText('EPSILON SOFT  /  COLOR PALETTE', 44, 65);
    context.fillStyle = '#5B6789'; context.font = '24px Arial, sans-serif';
    context.fillText(`${state.harmony.toUpperCase()}     |     ${resultHex}     |     ${state.mode.toUpperCase()}`, 44, 105);
    colors.forEach((hex, i) => {
      const left = 44 + 226 * i;
      context.fillStyle = hex; context.beginPath();
      if (typeof context.roundRect === 'function') context.roundRect(left, 145, 214, 236, 15);
      else context.rect(left, 145, 214, 236);
      context.fill();
      context.fillStyle = '#142369'; context.font = 'bold 24px Consolas, monospace'; context.fillText(hex, left + 20, 420);
    });
    canvas.toBlob(blob => {
      if (!blob) { notify('Không xuất được ảnh bảng màu.', 'error'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.download = 'epsilon-soft-bang-phoi-mau.png'; a.href = url; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Đã tạo ảnh bảng màu PNG');
    }, 'image/png');
  }

  listen(root, 'click', event => {
    const source = event.target.closest('[data-source]');
    if (source && root.contains(source)) { state.selected = Number(source.dataset.source); render(); return; }
    const mode = event.target.closest('[data-color-mode]');
    if (mode && root.contains(mode)) { state.mode = mode.dataset.colorMode; render(); return; }
    const preset = event.target.closest('[data-preset]');
    if (preset && root.contains(preset)) { const p = PAIR_PRESETS[Number(preset.dataset.preset)]; state.sources = [makeSource(p.a), makeSource(p.b)]; state.selected = 0; state.ratio = 50; render(); return; }
    const harmony = event.target.closest('[data-harmony]');
    if (harmony && root.contains(harmony)) { state.harmony = harmony.dataset.harmony; render(); return; }
    const swatch = event.target.closest('[data-swatch-index]');
    if (swatch && root.contains(swatch)) { const hex = colors[Number(swatch.dataset.swatchIndex)]; if (hex) void copyValue(hex, hex); return; }
    const copy = event.target.closest('[data-copy]');
    if (copy && root.contains(copy)) { const k = copy.dataset.copy; const value = { hex: resultHex, rgb: formatRgb(resultRGB), cmyk: formatCmyk(resultCMYK) }[k]; if (value) void copyValue(value, k.toUpperCase()); return; }
    const action = event.target.closest('[data-action]');
    if (!action || !root.contains(action)) return;
    switch (action.dataset.action) {
      case 'swap': state.sources.reverse(); state.ratio = 100 - state.ratio; state.selected = 1 - state.selected; render(); break;
      case 'reset': state.sources = [makeSource('#1479F5'), makeSource('#FFD238')]; state.ratio = 50; state.selected = 0; state.mode = 'rgb'; state.harmony = 'analogous'; render(); break;
      case 'css': void copyValue(colors.map((hex, i) => `  --epsilon-color-${i + 1}: ${hex};`).join('\n').replace(/^/, ':root {\n') + '\n}', 'CSS'); break;
      case 'png': void downloadPalette(); break;
    }
  });
  listen(root, 'input', event => {
    const el = event.target;
    if (el.id === 'cl-ratio') { state.ratio = Number(el.value); render(); return; }
    if (el.id === 'cl-picker') { const rgb = hexToRgb(el.value); updateSource(rgb, rgbToCmyk(rgb)); return; }
    if (el.matches('[data-channel]')) { editChannel(Number(el.dataset.channel), el.value); return; }
    if (el.matches('[data-number-channel]') && el.value !== '') editChannel(Number(el.dataset.numberChannel), el.value);
  });
  listen(root, 'change', event => {
    const el = event.target;
    if (el.id === 'cl-input-hex') {
      const hex = normalizeHex(el.value);
      if (!hex) { render(); notify('Mã HEX phải có 3 hoặc 6 ký tự 0–9, A–F.', 'error'); return; }
      const rgb = hexToRgb(hex); updateSource(rgb, rgbToCmyk(rgb));
    }
    if (el.matches('[data-number-channel]')) renderEditorChannels();
  });
  listen(root, 'keydown', event => {
    if (event.target.id === 'cl-input-hex' && event.key === 'Enter') { event.preventDefault(); event.target.blur(); }
  });
  render();
  return () => { root.replaceChildren(); };
}
