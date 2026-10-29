/**
 * EPSILON SOFT / DOi DON VI DO - Web edition, 2026-10-23.
 * Baseline: ES TOOLKIT V1.0 Portable (core/converter.go, ui_windows.go:drawConverter,
 * main_windows.go:quickPairs, display_format.go, converter_icons_windows.go).
 * Self-contained: only this module needs replacing, no extra CSS/JS dependencies.
 * All 8 categories, original labels, conversion constants and quick pairs are retained.
 */

const CATEGORIES = Object.freeze([
  {vi:'Chiều dài',en:'Length',units:[['Milimét','Millimeter','mm',.001],['Centimét','Centimeter','cm',.01],['Mét','Meter','m',1],['Kilômét','Kilometer','km',1000],['Micrômét','Micrometer','µm',1e-6],['Inch','Inch','in',.0254],['Foot','Foot','ft',.3048],['Yard','Yard','yd',.9144],['Mile','Mile','mi',1609.344]]},
  {vi:'Diện tích',en:'Area',units:[['Milimét vuông','Square millimeter','mm²',1e-6],['Centimét vuông','Square centimeter','cm²',1e-4],['Mét vuông','Square meter','m²',1],['Kilômét vuông','Square kilometer','km²',1e6],['Inch vuông','Square inch','in²',.00064516],['Foot vuông','Square foot','ft²',.09290304],['Hecta','Hectare','ha',1e4],['Acre','Acre','acre',4046.8564224]]},
  {vi:'Thể tích',en:'Volume',units:[['Milimét khối','Cubic millimeter','mm³',1e-9],['Centimét khối','Cubic centimeter','cm³',1e-6],['Mét khối','Cubic meter','m³',1],['Lít','Liter','L',1e-3],['Mililít','Milliliter','mL',1e-6],['Inch khối','Cubic inch','in³',.000016387064],['Foot khối','Cubic foot','ft³',.028316846592],['Gallon Mỹ','US gallon','gal',.003785411784]]},
  {vi:'Khối lượng',en:'Mass',units:[['Miligam','Milligram','mg',1e-6],['Gam','Gram','g',.001],['Kilôgam','Kilogram','kg',1],['Tấn','Tonne','t',1000],['Pound','Pound','lb',.45359237],['Ounce','Ounce','oz',.028349523125]]},
  {vi:'Nhiệt độ',en:'Temperature',units:[['Độ C','Celsius','°C',1],['Độ F','Fahrenheit','°F',1],['Kelvin','Kelvin','K',1]]},
  {vi:'Tốc độ',en:'Speed',units:[['Mét/giây','Meter per second','m/s',1],['Kilômét/giờ','Kilometer per hour','km/h',1/3.6],['Mile/giờ','Mile per hour','mph',.44704],['Hải lý/giờ','Knot','kn',1852/3600],['Foot/giây','Foot per second','ft/s',.3048]]},
  {vi:'Thời gian',en:'Time',units:[['Mili giây','Millisecond','ms',.001],['Giây','Second','s',1],['Phút','Minute','min',60],['Giờ','Hour','h',3600],['Ngày','Day','day',86400],['Tuần','Week','week',604800]]},
  {vi:'Áp suất',en:'Pressure',units:[['Pascal','Pascal','Pa',1],['Kilopascal','Kilopascal','kPa',1000],['Megapascal','Megapascal','MPa',1e6],['Bar','Bar','bar',1e5],['PSI','PSI','psi',6894.757293168],['Atmôtphe','Atmosphere','atm',101325],['Milimét thủy ngân','Millimeter of mercury','mmHg',133.322387415]]}
]);
// From ES TOOLKIT Portable, main_windows.go:quickPairs (exact order).
const QUICK_PAIRS = Object.freeze([
 [[5,2],[2,0],[1,5],[3,8]],
 [[0,1],[2,5],[6,2],[4,0]],
 [[1,3],[2,3],[5,1],[6,2]],
 [[2,4],[3,2],[1,2],[5,1]],
 [[0,1],[0,2],[1,2],[2,0]],
 [[1,2],[0,1],[3,1],[4,0]],
 [[2,1],[3,2],[4,3],[5,4]],
 [[3,4],[2,3],[1,4],[5,3]]
]);

// Direct port of core.Convert. All operations remain local/offline.
export function convertPortable(cat,from,to,x){
 if(!Number.isInteger(cat)||cat<0||cat>=CATEGORIES.length||
    !Number.isInteger(from)||!Number.isInteger(to)||
    from<0||to<0||from>=CATEGORIES[cat].units.length||
    to>=CATEGORIES[cat].units.length||!Number.isFinite(x)){
   throw new Error('Đơn vị hoặc giá trị không hợp lệ');
 }
 if(cat===4){
   let kelvin=x;
   if(from===0) kelvin=x+273.15;
   else if(from===1) kelvin=(x+459.67)*5/9;
   if(kelvin<0&&kelvin>-1e-9)kelvin=0;
   if(kelvin<0)throw new Error('Nhiệt độ thấp hơn độ không tuyệt đối');
   if(to===0)return kelvin-273.15;
   if(to===1)return kelvin*9/5-459.67;
   return kelvin;
 }
 const out=x*CATEGORIES[cat].units[from][3]/CATEGORIES[cat].units[to][3];
 if(!Number.isFinite(out)) throw new Error('Kết quả vượt giới hạn');
 return out;
}

export function formatPortable(value){
 if(!Number.isFinite(value)) return '—';
 if(value===0)return '0';
 const abs=Math.abs(value);
 if(abs<0.00005||abs>=1e14){
   const t=value.toExponential(4);
   const m=t.match(/^(.+?)e([+-])(\d+)$/);
   if(!m) return t;
   return `${m[1].replace(/0+$/,'').replace(/\.$/,'')}e${m[2]}${m[3].padStart(2,'0')}`;
 }
 // Go strconv.FormatFloat(..., 'f', 4, 64) uses round-to-even at exact ties.
 // Number.toFixed(4) does not; use the exact binary64 fraction for matching
 // Portable even for large numbers ending at a four-decimal midpoint.
 const view=new DataView(new ArrayBuffer(8));
 view.setFloat64(0,abs,false);
 const bits=view.getBigUint64(0,false);
 const exponentBits=Number((bits>>52n)&2047n);
 const fractionBits=bits&((1n<<52n)-1n);
 const mantissa=exponentBits===0?fractionBits:(fractionBits|(1n<<52n));
 const exponent=exponentBits===0?-1074:exponentBits-1075;
 let numerator=mantissa*10000n;
 let rounded;
 if(exponent>=0){rounded=numerator<<BigInt(exponent);}
 else{
   const denominator=1n<<BigInt(-exponent);
   let q=numerator/denominator;
   const rem=numerator%denominator;
   if(rem*2n>denominator || (rem*2n===denominator && q%2n===1n))q++;
   rounded=q;
 }
 const digits=rounded.toString().padStart(5,'0');
 const whole=digits.slice(0,-4).replace(/\B(?=(\d{3})+(?!\d))/g,',');
 const frac=digits.slice(-4).replace(/0+$/,'');
 const sign=value<0 && rounded!==0n?'-':'';
 return sign+whole+(frac?'.'+frac:'');
}

function parsePortable(raw){
 const text=String(raw??'').trim();
 if(!text||text.length>60)throw new Error('Nhập giá trị hợp lệ để chuyển đổi');
 const normalized=text.replace(/[ ,]/g,'');
 if(!normalized || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized))throw new Error('Nhập giá trị hợp lệ để chuyển đổi');
 const val=Number(normalized);
 if(!Number.isFinite(val)) throw new Error('Đơn vị hoặc giá trị không hợp lệ');
 return val;
}
// Mirrors Portable groupEditorDigits, without changing the numeric value or cursor position.
function inputGrouping(el){
 const original=el.value;
 if(!/^[+-]?(?:\d{1,18})(?:\.\d*)?$/.test(original.replace(/,/g,'')))return;
 const caret=el.selectionStart??original.length;
 const before=original.slice(0,caret).replace(/,/g,'');
 const s=original.replace(/,/g,'');
 const dot=s.indexOf('.');
 const head=dot>=0?s.slice(0,dot):s;
 const tail=dot>=0?s.slice(dot):'';
 const grouped=head.replace(/\B(?=(\d{3})+(?!\d))/g,',')+tail;
 if(grouped===original)return;
 el.value=grouped;
 // Restore caret by counting all characters other than grouping commas.
 let i=0,seen=0;
 while(i<grouped.length&&seen<before.length){if(grouped[i]!==',')seen++;i++;}
 if(grouped[i]===','&&seen===before.length)i++;
 el.setSelectionRange(i,i);
}

const state={cat:0,from:2,to:0,input:'1'};
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const glyph=(id)=>{
 const attrs='fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
 const paths=[
  '<path d="M3 12h26M3 12l6-5M3 12l6 5M29 12l-6-5M29 12l-6 5"/>',
  '<rect x="4" y="5" width="24" height="22" rx="2"/><path d="m11 20 10-10"/>',
  '<path d="m4 10 12-7 12 7-12 7-12-7Zm0 0v14l12 7 12-7V10m-12 7v14"/>',
  '<path d="M16 4v25M5 10h22M7 10 2 20h10L7 10Zm18 0-5 10h10l-5-10ZM10 29h12"/>',
  '<path d="M13 8V5a3 3 0 0 1 6 0v16a7 7 0 1 1-6 0V8Zm3 5v13"/>',
  '<path d="M7 26a13 13 0 1 1 18 0M16 19l8-8M6 26h20"/>',
  '<circle cx="16" cy="16" r="13"/><path d="M16 7v9l7 5"/>',
  '<circle cx="16" cy="15" r="12"/><path d="m16 15 7-8M5 28h22M12 23h8"/>'
 ];
 return `<svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true" ${attrs}>${paths[id]||paths[0]}</svg>`;
};
const swapIcon=`<svg viewBox="0 0 48 48" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 16h34m-8-8 8 8-8 8M41 32H7m8-8-8 8 8 8"/></svg>`;
const copyIcon=`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>`;

const CSS = `
.esconv{--ec-ink:#161c82;--ec-purple:#7128e7;--ec-border:#ddd2ff;--ec-light:#f4edff;color:var(--ec-ink);font-size:16px;width:100%;min-width:0}
.esconv .ec-top{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin:0 0 18px}
.esconv .ec-top h2{margin:0 0 3px;color:#231399;font-size:27px;font-weight:900;line-height:1.25}
.esconv .ec-top p{margin:0;color:#64729f;line-height:1.5}
.esconv .ec-categories{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:17px}
.esconv .ec-category{min-width:0;min-height:65px;border:1px solid #dfd7fb;border-radius:14px;display:flex;align-items:center;gap:13px;padding:11px 14px;text-align:left;background:#fff;color:#5a2ac3;font-weight:800;font-size:17px;box-shadow:0 3px 10px rgba(40,28,105,.045);transition:transform .14s,box-shadow .14s,border-color .14s}
.esconv .ec-category:hover{border-color:#ad81ff;transform:translateY(-1px);box-shadow:0 6px 14px #6031ca19}
.esconv .ec-category[aria-pressed="true"]{background:linear-gradient(120deg,#a848f7 0%,#7431ed 100%);border-color:#8d39f5;color:#fff;box-shadow:0 8px 18px #7838e930}
.esconv .ec-category svg{flex:none;width:29px;height:29px}
.esconv .ec-main{border:1px solid var(--ec-border);background:linear-gradient(155deg,#fff,#fdfbff);border-radius:19px;padding:26px 24px 23px;box-shadow:0 6px 22px #3218900c}
.esconv .ec-units,.esconv .ec-values{display:grid;grid-template-columns:minmax(0,1fr) 56px minmax(0,1fr);gap:14px;align-items:end}
.esconv .ec-unit-from{grid-column:1}.esconv .ec-unit-to{grid-column:3}
.esconv .ec-field{display:flex;flex-direction:column;gap:8px;min-width:0}
.esconv .ec-label{font-size:17px;font-weight:850;color:#3d259f;letter-spacing:.25px;line-height:1.25}
.esconv .ec-select{min-width:0;width:100%;height:54px;border:1px solid #cbb8ff;border-radius:11px;background:white;color:#20148a;font-size:17px;font-weight:650;padding:0 14px;outline:none;cursor:pointer}
.esconv .ec-select:focus-visible,.esconv .ec-input:focus-visible{box-shadow:0 0 0 4px #7135e824;border-color:#9b69ee;outline:none}
.esconv .ec-values{margin-top:26px;align-items:center;position:relative}
.esconv .ec-input-wrap{height:64px;display:flex;align-items:center;min-width:0;border:1.5px solid #c9b5ff;border-radius:12px;background:#fff;overflow:hidden;transition:border-color .14s,box-shadow .14s}
.esconv .ec-input-wrap:focus-within{border-color:#7930ec;box-shadow:0 0 0 4px #7135e821}
.esconv .ec-input{min-width:0;flex:1;width:10%;height:100%;border:0;outline:0;padding:0 15px;font-size:25px;font-weight:750;color:#17146d;font-variant-numeric:tabular-nums;background:transparent}
.esconv .ec-input-wrap .ec-unit-chip{flex:0 0 auto;background:#f1eaff;color:#6020d4;padding:9px 11px;margin-right:8px;border-radius:7px;font-size:16px;font-weight:850}
.esconv .ec-output{height:64px;min-width:0;width:100%;background:linear-gradient(115deg,#f0e6ff,#f9f6ff);border:1px solid #d5b6ff;border-radius:12px;padding:5px 12px;display:flex;align-items:center;justify-content:space-between;gap:9px;text-align:left;color:#5a24ca;cursor:copy;transition:box-shadow .2s,border-color .2s}
.esconv .ec-output:hover:not(:disabled){border-color:#8950f5;box-shadow:0 5px 18px #7b3bdf23}
.esconv .ec-output:disabled{cursor:default;opacity:.75}
.esconv .ec-output-number{flex:1;min-width:0;overflow-x:auto;scrollbar-width:thin;white-space:nowrap;font-weight:850;font-size:clamp(21px,2.1vw,29px);font-variant-numeric:tabular-nums;line-height:1.4}
.esconv .ec-output-unit{font-size:17px;white-space:nowrap;font-weight:850;color:#392197}
.esconv .ec-output-copy{flex:none;display:grid;place-items:center;color:#956acc}
.esconv .ec-swap{width:54px;height:54px;justify-self:center;border:0;border-radius:100%;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#ec4ea7,#8c39e8);box-shadow:0 6px 16px #c946a14a;transition:transform .2s,box-shadow .2s}
.esconv .ec-swap:hover{transform:rotate(180deg);box-shadow:0 8px 18px #9d3ed450}
.esconv .ec-equality{margin-top:20px;border:1px solid #e3d6ff;padding:11px 17px;border-radius:12px;background:#f6efff;display:flex;align-items:center;gap:10px;font-size:17px;line-height:1.5;color:#392399;font-weight:650;overflow-wrap:anywhere}
.esconv .ec-equality::before{content:'✓';background:#eee3ff;border:1px solid #d4c4f8;color:#6329d9;border-radius:50%;width:26px;height:26px;display:grid;place-items:center;flex:none;font-weight:900}
.esconv .ec-equality.is-error{background:#fff5f0;border-color:#ffd2bc;color:#9a401a}
.esconv .ec-equality.is-error::before{content:'!';background:#ffe4cf;border-color:#ffd2bc;color:#ac4b20}
.esconv .ec-shortcuts{border:1px solid var(--ec-border);background:#fff;border-radius:19px;padding:17px 21px 19px;margin-top:16px;box-shadow:0 6px 16px #3218900a}
.esconv .ec-shortcuts h3{margin:0 0 11px;color:#351b9f;font-size:18px;font-weight:900;letter-spacing:.35px}
.esconv .ec-quickgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.esconv .ec-quick{min-width:0;min-height:52px;border-radius:11px;border:1px solid #cfc0fa;background:#fdfbff;font-size:17px;color:#3e1a9f;font-weight:800;transition:transform .16s,border-color .16s,background .16s}
.esconv .ec-quick:hover{border-color:#925bf4;background:#f0e9ff;transform:translateY(-1px)}
.esconv .ec-quick[aria-pressed="true"]{color:white;background:#7431e8;border-color:#7431e8}
.esconv .ec-foot{color:#62749e;text-align:center;font-size:16px;margin:13px 0 0;line-height:1.5}
@media(max-width:920px){.esconv .ec-categories{grid-template-columns:repeat(2,minmax(0,1fr))}.esconv .ec-category{min-height:58px}}
@media(max-width:680px){.esconv .ec-main{padding:18px 15px}.esconv .ec-units{grid-template-columns:1fr;gap:13px}.esconv .ec-unit-from,.esconv .ec-unit-to{grid-column:1}.esconv .ec-values{grid-template-columns:minmax(0,1fr);gap:10px;margin-top:17px}.esconv .ec-swap{width:49px;height:49px;transform:rotate(90deg);margin-block:0}.esconv .ec-swap:hover{transform:rotate(270deg)}.esconv .ec-quickgrid{grid-template-columns:repeat(2,minmax(0,1fr))}.esconv .ec-category{padding:10px;gap:8px;font-size:16px}.esconv .ec-category svg{width:25px;height:25px}.esconv .ec-input,.esconv .ec-output-number{font-size:23px}.esconv .ec-shortcuts{padding:14px}.esconv .ec-equality{font-size:16px}.esconv .ec-top h2{font-size:24px}}
@media(max-width:365px){.esconv .ec-categories{gap:6px}.esconv .ec-category{font-size:16px;padding:8px 7px}.esconv .ec-category svg{width:21px;height:21px}}

/* Match the Portable 2x4 category grid + pair of inputs + 4 quick presets on desktop. */
@media (min-width: 1040px) and (max-height: 900px) {
.esconv .ec-top{margin-bottom:8px}
.esconv .ec-top h2{font-size:24px;line-height:1.2}
.esconv .ec-top p{line-height:1.25}
.esconv .ec-categories{gap:7px;margin-bottom:9px}
.esconv .ec-category{min-height:45px;gap:8px;padding:5px 10px;border-radius:10px;font-size:16px}
.esconv .ec-category svg{width:24px;height:24px}
.esconv .ec-main{padding:11px 14px 12px;border-radius:13px}
.esconv .ec-units,.esconv .ec-values{grid-template-columns:minmax(0,1fr) 48px minmax(0,1fr);gap:10px}
.esconv .ec-field{gap:4px}
.esconv .ec-label{font-size:16px}
.esconv .ec-select{height:40px;padding:0 11px;font-size:16px}
.esconv .ec-values{margin-top:10px}
.esconv .ec-input-wrap,.esconv .ec-output{height:44px;border-radius:9px}
.esconv .ec-input{font-size:21px;padding:0 11px}
.esconv .ec-output-number{font-size:22px}
.esconv .ec-swap{width:44px;height:44px}
.esconv .ec-equality{margin-top:9px;padding:6px 10px;font-size:16px;line-height:1.3}
.esconv .ec-shortcuts{padding:10px 14px 11px;margin-top:9px;border-radius:13px}
.esconv .ec-shortcuts h3{margin-bottom:7px}
.esconv .ec-quickgrid{gap:8px}
.esconv .ec-quick{min-height:40px;font-size:16px;border-radius:9px}
.esconv .ec-foot{margin:6px 0 0;line-height:1.3}
}

`;

export function mount(root,ctx={}){
 const signal=ctx.signal;
 const names=CATEGORIES.map((c,i)=>`<button type="button" class="ec-category" data-cat="${i}" aria-pressed="${i===state.cat}" title="${esc(c.vi)}">${glyph(i)}<span>${esc(c.vi)}</span></button>`).join('');
 root.innerHTML=`<div class="esconv"><style>${CSS}</style>
  <div class="ec-top"><div><h2>Đổi đơn vị đo</h2><p>8 nhóm đơn vị · Chuyển đổi hai chiều · Kết quả tức thời</p></div></div>
  <div class="ec-categories" role="group" aria-label="Chọn nhóm đơn vị">${names}</div>
  <section class="ec-main" aria-label="Chuyển đổi đơn vị">
    <div class="ec-units">
      <label class="ec-field ec-unit-from"><span class="ec-label">TỪ ĐƠN VỊ</span><select class="ec-select" id="ec-from"></select></label>
      <label class="ec-field ec-unit-to"><span class="ec-label">SANG ĐƠN VỊ</span><select class="ec-select" id="ec-to"></select></label>
    </div>
    <div class="ec-values">
      <label class="ec-field"><span class="ec-label">GIÁ TRỊ NHẬP</span><span class="ec-input-wrap"><input class="ec-input" id="ec-input" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" maxlength="60" aria-label="Giá trị nhập" value="${esc(state.input)}"><span id="ec-input-unit" class="ec-unit-chip">m</span></span></label>
      <button type="button" class="ec-swap" id="ec-swap" aria-label="Đảo chiều chuyển đổi" title="Đảo chiều chuyển đổi">${swapIcon}</button>
      <div class="ec-field"><span class="ec-label">KẾT QUẢ CHUYỂN ĐỔI</span><button type="button" class="ec-output" id="ec-output" title="Nhấn để sao chép kết quả" aria-label="Nhấn để sao chép kết quả"><span class="ec-output-number" id="ec-result">—</span><span class="ec-output-unit" id="ec-output-unit">mm</span><span class="ec-output-copy">${copyIcon}</span></button></div>
    </div>
    <div class="ec-equality" id="ec-status" aria-live="polite" aria-atomic="true">Đang tính toán…</div>
  </section>
  <section class="ec-shortcuts" aria-label="Đổi đơn vị nhanh"><h3>ĐỔI NHANH</h3><div class="ec-quickgrid" id="ec-quick"></div></section>
  <p class="ec-foot">Nhấn vào kết quả để sao chép. Dấu chấm: thập phân; dấu phẩy: hàng nghìn. Hoạt động offline.</p>
 </div>`;
 const $=sel=>root.querySelector(sel);
 const cBtns=[...root.querySelectorAll('[data-cat]')];
 const from=$('#ec-from'),to=$('#ec-to'),input=$('#ec-input');
 const result=$('#ec-result'),outUnit=$('#ec-output-unit'),inUnit=$('#ec-input-unit');
 const output=$('#ec-output'),status=$('#ec-status'),quick=$('#ec-quick');
 let lastResult=null;
 const units=()=>CATEGORIES[state.cat].units;
 const unitLabel=i=>`${units()[i][0]} (${units()[i][2]})`;
 function renderButtons(){cBtns.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===state.cat)));}
 function renderDropdowns(){
   const markup=units().map((u,i)=>`<option value="${i}">${esc(unitLabel(i))}</option>`).join('');
   from.innerHTML=markup;to.innerHTML=markup;from.value=String(state.from);to.value=String(state.to);
 }
 function renderShortcuts(){
   quick.innerHTML=QUICK_PAIRS[state.cat].map(([f,t],i)=>`<button type="button" class="ec-quick" data-quick="${i}" aria-pressed="${state.from===f&&state.to===t}">${esc(units()[f][2])} ↔ ${esc(units()[t][2])}</button>`).join('');
 }
 function updateQuickSelection(){quick.querySelectorAll('[data-quick]').forEach((b,i)=>{const [f,t]=QUICK_PAIRS[state.cat][i];b.setAttribute('aria-pressed',String(state.from===f&&state.to===t));});}
 function compute(){
   inUnit.textContent=units()[state.from][2];outUnit.textContent=units()[state.to][2];
   try{
     const x=parsePortable(state.input);const val=convertPortable(state.cat,state.from,state.to,x);
     lastResult=val;
     result.textContent=formatPortable(val);
     output.disabled=false;
     output.setAttribute('aria-label',`Sao chép kết quả ${formatPortable(val)} ${units()[state.to][2]}`);
     const rate=convertPortable(state.cat,state.from,state.to,1);
     status.classList.remove('is-error');
     status.textContent=`Kết quả: 1 ${units()[state.from][2]} = ${formatPortable(rate)} ${units()[state.to][2]}`;
   }catch(error){
     lastResult=null;result.textContent='—';output.disabled=true;
     status.classList.add('is-error');status.textContent=error.message;
   }
 }
 function sync(){renderButtons();renderDropdowns();renderShortcuts();compute();}
 // Default exactly as Portable: 1 m -> mm; category change: first unit -> second unit.
 cBtns.forEach((btn,i)=>btn.addEventListener('click',()=>{
   if(state.cat===i)return;
   state.cat=i;state.from=0;state.to=Math.min(1,units().length-1);sync();
 },{signal}));
 from.addEventListener('change',()=>{state.from=Number(from.value);updateQuickSelection();compute();},{signal});
 to.addEventListener('change',()=>{state.to=Number(to.value);updateQuickSelection();compute();},{signal});
 input.addEventListener('input',()=>{inputGrouping(input);state.input=input.value;compute();},{signal});
 input.addEventListener('blur',()=>{inputGrouping(input);state.input=input.value;},{signal});
 $('#ec-swap').addEventListener('click',()=>{[state.from,state.to]=[state.to,state.from];renderDropdowns();updateQuickSelection();compute();},{signal});
 quick.addEventListener('click',e=>{
   const btn=e.target.closest('[data-quick]');if(!btn)return;
   const [f,t]=QUICK_PAIRS[state.cat][Number(btn.dataset.quick)];state.from=f;state.to=t;
   renderDropdowns();updateQuickSelection();compute();
 },{signal});
 output.addEventListener('click',async()=>{
   if(lastResult===null)return;
   const text=formatPortable(lastResult);
   try{
     if(!navigator.clipboard?.writeText)throw new Error('No Clipboard API');
     await navigator.clipboard.writeText(text);
     ctx.showToast?.('Đã sao chép kết quả');
   }catch{
     // Compatibility fallback on local Live Server / browsers without clipboard permissions.
     const field=document.createElement('textarea');field.value=text;field.setAttribute('readonly','');
     field.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';document.body.appendChild(field);
     field.select();const ok=document.execCommand?.('copy');field.remove();
     ctx.showToast?.(ok?'Đã sao chép kết quả':'Trình duyệt không cho phép sao chép. Hãy thử lại. ',ok?'success':'warning');
   }
 },{signal});
 sync();
}
