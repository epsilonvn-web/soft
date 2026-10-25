/**
 * Epsilon Soft - Trải phôi 2D (Web) – PHẦN GIAO DIỆN
 * File này CHỈ chứa giao diện. Lõi tính chạy trên máy chủ Epsilon Soft (API /api/nesting);
 * trình duyệt chỉ gửi thông số và nhận về sơ đồ – thuật toán không bao giờ có mặt ở đây.
 * Bản quyền © Epsilon Lab.
 */
const {field, number: pretty, numeric, icon, setText, downloadBlob} = globalThis.EpsilonSoftShared || {};

const MAX_PREVIEW=900, LIMIT=1e6;
// Địa chỉ API tính toán; trang web có thể đặt EpsilonSoftShared.nestingEndpoint để đổi.
const NEST_API=globalThis.EpsilonSoftShared?.nestingEndpoint||'/api/nesting';
// The four Portable presets are UI shortcuts only; names and densities load from materials.json.
const quickMaterialLabels=['Thép','Inox','Nhôm','Đồng'];
const loadMaterials=()=>{
 const shared=globalThis.EpsilonSoftShared?.loadMaterialsCatalog;
 if(typeof shared==='function')return shared();
 return fetch(new URL('./assets/data/materials.json',document.baseURI),{cache:'no-cache'}).then(r=>{
  if(!r.ok)throw Error('Không đọc được materials.json (HTTP '+r.status+').');return r.json();
 });
};
// -----------------------------------------------------------------------------
// UI parity with ES TOOLKIT V1.0 Portable / extensions_windows.go.
// Lõi tính nằm trên máy chủ; file này chỉ hiển thị kết quả.
// -----------------------------------------------------------------------------
const DEFAULT_STATE={
 sheetW:'6000',sheetH:'2000',thickness:'20',partW:'300',partH:'200',diameter:'310',
 allowance:'0',gap:'3',margin:'10',quantity:'20',density:'7850',
 shape:'rect',cutMethod:'laser',autoMax:true,material:0,customDensity:false,
 sheets:{laser:['6000','2000','20'],shear:['2440','1220','3']},
 gaps:{laser:'3',shear:'0'},allowances:{rect:'0',circle:'5'}
};
let savedState=null;
const htmlEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prettyPortable=n=>{
 if(!Number.isFinite(n))return '—';
 if(n===0)return '0';
 const abs=Math.abs(n);
 if(abs<0.00005||abs>=1e14)return n.toExponential(4).replace(/(?:\.0+|(?<=\d)0+)e/,'e');
 return new Intl.NumberFormat('en-US',{minimumFractionDigits:0,maximumFractionDigits:4,useGrouping:true}).format(n);
};
const percentagePortable=n=>Number.isFinite(n)?n.toFixed(2):'—';
const parseNestNumber=(raw,label,{strictPositive=false,integer=false}={})=>{
 const rawText=String(raw??'').trim();
 if(!rawText||rawText.length>60)throw Error(`Kiểm tra ô: ${label}`);
 const cleaned=rawText.replace(/[\s,]/g,'');
 if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(cleaned))throw Error(`Kiểm tra ô: ${label}`);
 const v=Number(cleaned);
 if(!Number.isFinite(v)||v<0||v>LIMIT||(strictPositive&&v<=0)||(integer&&!Number.isInteger(v)))throw Error(`Kiểm tra ô: ${label}`);
 return v;
};
const nestField=(name,label,value,{accent='',unit='mm',readOnly=false}={})=>`<label class="nest-field ${accent?'is-'+accent:''}"><span class="nest-field-label">${htmlEscape(label)}</span><span class="nest-input-wrap"><input type="text" name="${htmlEscape(name)}" value="${htmlEscape(prettyPortable(Number(value)))}" inputmode="decimal" autocomplete="off" spellcheck="false" ${readOnly?'readonly aria-readonly="true"':''} aria-label="${htmlEscape(label)}"><small>${htmlEscape(unit)}</small></span></label>`;
function previewDrawing(res){
 const i=res.input, SW=1080, SH=376;
 const insetX=11,insetY=12,plotW=SW-2*insetX,plotH=SH-2*insetY;
 const scale=Math.min(plotW/i.sheetW,plotH/i.sheetH);
 const W=i.sheetW*scale,H=i.sheetH*scale;
 const x0=insetX+(plotW-W)/2,y0=insetY+(plotH-H)/2;
 const pt=n=>Number(n).toFixed(3);
 let shapes='',remnant='',cuts='',unrotated=false,rotated=false,drawn=0;
 if(!i.autoMax&&res.remnantL>0){
  const cutX=x0+res.issuedLastLength*scale,restWidth=Math.max(0,W-(cutX-x0));
  if(restWidth>.2){
   remnant=`<rect x="${pt(cutX)}" y="${pt(y0)}" width="${pt(restWidth)}" height="${pt(H)}" fill="#e3f8eb"/><line x1="${pt(cutX)}" y1="${pt(y0)}" x2="${pt(cutX)}" y2="${pt(y0+H)}" stroke="#169a70" stroke-width="2.5"/>`;
   if(restWidth>120&&H>70)remnant+=`<text x="${pt(cutX+restWidth/2)}" y="${pt(y0+H/2)}" font-size="21" fill="#147451" font-weight="700" font-family="Arial,sans-serif" text-anchor="middle">TẤM LẺ</text>`;
  }
 }
 const maxDraw=Math.min(res.previewDrawn||0,res.layout?.length||0,MAX_PREVIEW);
 for(let j=0;j<maxDraw;j++){
  const p=res.layout[j],xx=x0+p.x*scale,yy=y0+p.y*scale,ww=p.w*scale,hh=p.h*scale;
  if(ww<.65||hh<.65)continue;
  drawn++;
  if(i.shape==='circle'){
   shapes+=`<ellipse cx="${pt(xx+ww/2)}" cy="${pt(yy+hh/2)}" rx="${pt(ww/2)}" ry="${pt(hh/2)}" fill="#baa7f3" stroke="#6145ac" stroke-width="1.1"/>`;
   const inner=i.allowance/2*scale;
   if(inner>1.4&&ww-2*inner>3)shapes+=`<ellipse cx="${pt(xx+ww/2)}" cy="${pt(yy+hh/2)}" rx="${pt(ww/2-inner)}" ry="${pt(hh/2-inner)}" fill="#ddd4ff"/>`;
  }else{
   const r=Math.abs(p.w-res.cutH)<1e-7&&Math.abs(p.h-res.cutW)<1e-7&&Math.abs(res.cutH-res.cutW)>1e-7;
   const color=r?'#9bcffc':'#afa2eb',edge=r?'#326bab':'#5c47b3';
   if(r)rotated=true;else unrotated=true;
   shapes+=`<rect x="${pt(xx)}" y="${pt(yy)}" width="${pt(ww)}" height="${pt(hh)}" rx="${pt(Math.min(1,ww*.08))}" fill="${color}" stroke="${edge}" stroke-width="0.92"/>`;
   const inner=i.allowance/2*scale;
   if(inner>1.4&&ww-2*inner>3&&hh-2*inner>3)shapes+=`<rect x="${pt(xx+inner)}" y="${pt(yy+inner)}" width="${pt(ww-2*inner)}" height="${pt(hh-2*inner)}" rx=".8" fill="#e1dbff"/>`;
  }
 }
 if(i.cutMethod==='shear')for(const c of res.cutLines||[]){
  if(!i.autoMax&&Math.min(c.x1,c.x2)>res.issuedLastLength-1e-6)continue;
  cuts+=`<line x1="${pt(x0+c.x1*scale)}" y1="${pt(y0+c.y1*scale)}" x2="${pt(x0+c.x2*scale)}" y2="${pt(y0+c.y2*scale)}" stroke="#d58027" stroke-width="1.2"/>`;
 }
 const m=i.margin*scale;
 const boundary=(m>=3&&W>2*m&&H>2*m)?`<rect x="${pt(x0+m)}" y="${pt(y0+m)}" width="${pt(W-2*m)}" height="${pt(H-2*m)}" fill="none" stroke="#ddc9fa" stroke-width="1"/>`:'';
 const diagram=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" role="img" aria-label="Sơ đồ tấm phôi ${prettyPortable(i.sheetW)} × ${prettyPortable(i.sheetH)} mm, ${prettyPortable(res.shownOnSheet)} chi tiết" preserveAspectRatio="xMidYMid meet"><rect width="${SW}" height="${SH}" fill="#faf7ff"/><rect x="${pt(x0)}" y="${pt(y0)}" width="${pt(W)}" height="${pt(H)}" fill="#f1ebfd" stroke="#793afa" stroke-width="2"/>${remnant}${boundary}${shapes}${cuts}</svg>`;
 const title=`TẤM PHÔI ${prettyPortable(i.sheetW)} × ${prettyPortable(i.sheetH)} × ${prettyPortable(i.thickness)} mm`;
 let legend='';
 if(i.shape==='circle')legend=`<span class="nest-legend-item"><i class="nest-dot nest-dot-round"></i>Phôi cắt D${prettyPortable(res.cutW)} mm</span>`;
 else{
  if(unrotated)legend+=`<span class="nest-legend-item"><i class="nest-dot nest-dot-zero"></i>0° &nbsp; ${prettyPortable(res.cutW)} × ${prettyPortable(res.cutH)} mm</span>`;
  if(rotated)legend+=`<span class="nest-legend-item"><i class="nest-dot nest-dot-rot"></i>90° &nbsp; ${prettyPortable(res.cutH)} × ${prettyPortable(res.cutW)} mm</span>`;
 }
 // Export the exact sheet geometry, plus the annotations useful outside the Web App.
 const fullSVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH+82}"><rect width="${SW}" height="${SH+82}" fill="#faf7ff"/><text x="540" y="26" fill="#675295" font-size="21" text-anchor="middle" font-weight="700" font-family="Arial,sans-serif">${htmlEscape(title)}</text><svg x="0" y="35" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">${diagram.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</svg><text x="22" y="${SH+61}" fill="#63489a" font-size="19" font-family="Arial,sans-serif">${htmlEscape(prettyPortable(res.shownOnSheet)+' chi tiết / tấm hiển thị')}</text></svg>`;
 return {svg:diagram,download:fullSVG,title,legend,drawn};
}
function nestingStrategy(r){
 const base={guillotine:'Phối hợp 0°/90° – chia vùng nhiều cấp',rotary:'Phối hợp 0°/90° – bố trí xoay vòng',
  shear:'Nhát chặt chạy suốt – chia dải nhiều cấp',staggered:'Hình tròn xếp so le'}[r.strategy]||(r.rotated?'Lưới xoay 90°':'Lưới thẳng 0°');
 if(r.upperBound==null)return base;
 return r.slack===0?`${base} · ✓ Đã đạt số chiếc tối đa có thể`:`${base} · Theo diện tích còn tối đa ${r.slack} chiếc`;
}
const NEST_CSS=`
.nest-pro{font-size:16px;color:#191c69;min-width:0}
.nest-pro *{box-sizing:border-box}
.nest-pro .nest-top{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin:0 0 12px}
.nest-pro .nest-subtitle{font-size:16px;color:#706d99;margin:0}
.nest-pro .nest-materials{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end;margin-left:auto}
.nest-pro .nest-materials>strong{font-weight:800;margin-right:4px}
.nest-pro .nest-materials button,.nest-pro .nest-toggle button{border:1px solid #dfd3fc;border-radius:11px;background:white;color:#2e1b70;min-height:40px;padding:7px 12px;font-weight:750;font-size:16px;white-space:nowrap}
.nest-pro .nest-materials button.is-active,.nest-pro .nest-toggle button.is-active{color:white;border-color:transparent;background:linear-gradient(120deg,#aa42f9,#7732e9);box-shadow:0 2px 8px #6627af1e}
.nest-pro .nest-materials button:disabled{opacity:.52}
.nest-pro .nest-material-list{background:white;min-height:40px;max-width:198px;min-width:145px;font-size:16px;font-weight:650;color:#5324b4;border:1px solid #dac6fb;border-radius:11px;padding:6px 9px}
.nest-pro .nest-material-list:disabled{opacity:.6}
.nest-pro .nest-material-retry{color:#5c2bdd;background:#f0eaff;border:1px solid #cfbafb;border-radius:10px;padding:6px 10px;font-size:16px}
.nest-pro .nest-material-warning{font-size:16px;color:#aa3c3c;margin:0 0 8px}
.nest-pro .nest-material-warning[hidden]{display:none!important}
.nest-pro .nest-panelgrid{display:grid;grid-template-columns:minmax(430px,min(39%,555px)) minmax(0,1fr);gap:12px;align-items:stretch}
.nest-pro .nest-panel{background:#fff;border:1px solid #e4d3ff;border-radius:16px;padding:15px 16px;min-width:0;box-shadow:0 2px 5px #4c2b8a08}
.nest-pro .nest-parameters{display:flex;flex-direction:column}
.nest-pro .nest-panel-title{color:#592ac1;font-size:20px;margin:0 0 12px;font-weight:850}
.nest-pro .nest-grid{display:grid;gap:9px;min-width:0}
.nest-pro .nest-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
.nest-pro .nest-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}
.nest-pro .nest-grid + .nest-grid{margin-top:17px}
.nest-pro .nest-field{min-width:0;display:block}
.nest-pro .nest-field-label{font-size:16px;font-weight:750;color:#251973;display:block;margin-bottom:4px;white-space:nowrap}
.nest-pro .nest-input-wrap{display:flex;align-items:center;min-width:0;position:relative}
.nest-pro .nest-input-wrap input,.nest-pro .nest-shape{background:#fff;border:1px solid #d4b7ff;border-radius:10px;min-height:42px;width:100%;font-size:18px;color:#24156c;padding:7px 10px;min-width:0;outline:none;box-shadow:none;line-height:1.24}
.nest-pro .nest-input-wrap input:focus,.nest-pro .nest-shape:focus-visible{border-color:#7442ff;box-shadow:0 0 0 3px #7542ff21}
.nest-pro .nest-input-wrap input{padding-right:36px;font-variant-numeric:tabular-nums}
.nest-pro .nest-input-wrap input:read-only{background:#efe8fc;color:#6424d4;font-weight:750;cursor:default}
.nest-pro .nest-input-wrap small{position:absolute;right:9px;font-size:16px;font-weight:700;color:#6f36df;pointer-events:none}
.nest-pro .nest-field.is-allowance .nest-field-label{color:#a36a07}
.nest-pro .nest-field.is-allowance input{border:2px solid #f3a535;background:#fffcf5;padding-left:9px}
.nest-pro .nest-field.is-kerf .nest-field-label{color:#2568bb}
.nest-pro .nest-field.is-kerf input{border:2px solid #5a9eff;background:#fafdff;padding-left:9px}
.nest-pro .nest-methods{margin-top:18px}
.nest-pro .nest-methods h3{font-size:18px;margin:0 0 9px;color:#5c29bf;font-weight:850}
.nest-pro .nest-toggle{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.nest-pro .nest-toggle button{width:100%;padding:6px 8px}
.nest-pro .nest-qty-switch{margin-top:6px}
.nest-pro .nest-hint{font-size:16px;color:#65588b;margin:8px 0 0;min-height:0}
.nest-pro .nest-error{font-size:16px;color:#b52441;font-weight:650;margin:12px 0 0;line-height:1.4}
.nest-pro .nest-error:empty{display:none}
.nest-pro .nest-output{display:flex;flex-direction:column}
.nest-pro .nest-figure{background:#faf7ff;border:1px solid #e7dafa;border-radius:12px;min-width:0;padding:10px;flex:1;display:flex;flex-direction:column;min-height:405px}
.nest-pro .nest-figure-title{text-align:center;font-size:18px;line-height:1.3;color:#675295;font-weight:800;margin:0 0 10px}
.nest-pro .nest-preview{flex:1;display:flex;justify-content:center;align-items:center;min-width:0;overflow:hidden}
.nest-pro .nest-preview svg{width:100%;height:auto;display:block;min-height:225px;max-height:390px}
.nest-pro .nest-legend{display:flex;justify-content:flex-start;align-items:center;gap:24px;flex-wrap:wrap;min-height:32px;color:#58438f;font-size:16px;font-weight:700;margin:8px 0 0;padding-left:5px}
.nest-pro .nest-legend-item{display:inline-flex;align-items:center;gap:7px}
.nest-pro .nest-dot{display:inline-block;width:20px;height:15px;flex:0 0 auto;border:1px solid #6850aa}
.nest-pro .nest-dot-zero{background:#afa2eb}.nest-pro .nest-dot-rot{background:#9bcffc;border-color:#316bb1}.nest-pro .nest-dot-round{background:#baa7f3;border-radius:100%}
.nest-pro .nest-preview-note{margin:4px 0 0;font-size:16px;color:#9f3348;text-align:center}
.nest-pro .nest-preview-note:empty{display:none}
.nest-pro .nest-caption{display:flex;justify-content:space-between;gap:9px;margin-top:10px;align-items:baseline;flex-wrap:wrap;color:#5b2eb7;font-size:18px}
.nest-pro .nest-summary{font-size:20px;font-weight:850}
.nest-pro .nest-sizing{font-size:16px;font-weight:800;color:#655399;text-align:right}
.nest-pro .nest-footrow{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;min-height:35px}
.nest-pro .nest-strategy{color:#6a598b;font-size:16px;flex:1;margin:1px 0}
.nest-pro .nest-export{background:#f9f6ff;border:1px solid #b59efc;border-radius:9px;color:#632dd6;padding:5px 12px;min-height:35px;font-size:16px;font-weight:700}
.nest-pro .nest-status{font-size:16px;color:#65539e;min-height:0}
.nest-pro .nest-status:empty{display:none}
.nest-pro .nest-spinner{width:16px;height:16px;border-radius:50%;border:2px solid #d1bef5;border-top-color:#662be8;display:inline-block;animation:nest-spin .7s linear infinite;margin-left:7px;vertical-align:middle}
@keyframes nest-spin{to{transform:rotate(360deg)}}
.nest-pro .nest-result-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}
.nest-pro .nest-result{background:white;border:1px solid #e1d5f9;border-radius:14px;padding:10px 13px;min-width:0;min-height:79px}
.nest-pro .nest-result.emphasis{background:linear-gradient(115deg,#a943f7,#7930e8);border-color:transparent;color:white}
.nest-pro .nest-result strong{font-size:16px;display:block;font-weight:750}
.nest-pro .nest-result output{font-size:23px;font-weight:850;display:block;line-height:1.35;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.nest-pro .nest-result button{display:block;background:none;border:0;color:inherit;text-align:left;padding:0;cursor:pointer;width:100%}
.nest-pro .nest-note{font-size:16px;color:#6a6691;text-align:center;margin:7px 0 0;line-height:1.4}
@media(max-width:1260px){.nest-pro .nest-panelgrid{grid-template-columns:minmax(0,1fr)}.nest-pro .nest-figure{min-height:330px}.nest-pro .nest-materials{justify-content:flex-start;margin-left:0}}
@media(max-width:680px){.nest-pro .nest-grid.three{grid-template-columns:repeat(2,minmax(0,1fr))}.nest-pro .nest-grid.three .nest-field:first-child{grid-column:1/-1}.nest-pro .nest-panel{padding:12px}.nest-pro .nest-panel-title{font-size:18px}.nest-pro .nest-field-label{white-space:normal}.nest-pro .nest-materials{gap:6px}.nest-pro .nest-materials button{padding:6px 10px}.nest-pro .nest-material-list{max-width:100%;width:100%}.nest-pro .nest-figure{min-height:0;padding:8px}.nest-pro .nest-preview svg{min-height:0}.nest-pro .nest-result-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.nest-pro .nest-result output{font-size:20px}.nest-pro .nest-caption{display:block}.nest-pro .nest-summary,.nest-pro .nest-sizing{display:block;text-align:left;line-height:1.45;margin:2px 0 4px}.nest-pro .nest-legend{gap:11px}.nest-pro .nest-toggle button{font-size:16px}}

/* Portable-proportion layout on laptops; all nesting logic / coordinates / source data intact. */
@media (min-width: 1040px) and (max-height: 900px) {
.nest-pro .nest-top{gap:10px;margin-bottom:7px}
.nest-pro .nest-materials{gap:5px}
.nest-pro .nest-materials button,.nest-pro .nest-toggle button{min-height:33px;padding:5px 9px;border-radius:9px}
.nest-pro .nest-material-list{min-height:33px;padding:4px 8px}
.nest-pro .nest-panelgrid{gap:8px}
.nest-pro .nest-panel{padding:10px 11px;border-radius:12px}
.nest-pro .nest-panel-title{font-size:18px;margin-bottom:7px}
.nest-pro .nest-grid{gap:7px}
.nest-pro .nest-grid + .nest-grid{margin-top:9px}
.nest-pro .nest-field-label{margin-bottom:2px;line-height:1.2}
.nest-pro .nest-input-wrap input,.nest-pro .nest-shape{min-height:35px;font-size:17px;padding:5px 9px;border-radius:8px}
.nest-pro .nest-qty-switch{margin-top:4px}
.nest-pro .nest-methods{margin-top:10px}
.nest-pro .nest-methods h3{font-size:17px;margin-bottom:6px}
.nest-pro .nest-toggle{gap:6px}
.nest-pro .nest-hint{margin-top:4px;line-height:1.25}
.nest-pro .nest-figure{min-height:305px;padding:7px}
.nest-pro .nest-figure-title{font-size:17px;margin-bottom:4px}
.nest-pro .nest-preview svg{min-height:175px;max-height:255px}
.nest-pro .nest-legend{min-height:25px;gap:14px;margin-top:4px}
.nest-pro .nest-caption{margin-top:6px;gap:6px}
.nest-pro .nest-summary{font-size:18px}
.nest-pro .nest-footrow{min-height:31px;gap:7px}
.nest-pro .nest-export{min-height:31px;padding:4px 9px}
.nest-pro .nest-result-grid{gap:8px;margin-top:8px}
.nest-pro .nest-result{min-height:65px;padding:7px 10px;border-radius:10px}
.nest-pro .nest-result output{font-size:20px}
.nest-pro .nest-note{margin-top:5px;line-height:1.3}
}

`;

export function mount(root,ctx){
 // Giao diện; mọi phép tính gửi lên máy chủ qua NEST_API.
 const state=savedState?structuredClone(savedState):structuredClone(DEFAULT_STATE);
 state.sheets??=structuredClone(DEFAULT_STATE.sheets);
 state.gaps??=structuredClone(DEFAULT_STATE.gaps);
 state.allowances??=structuredClone(DEFAULT_STATE.allowances);
 if(!['rect','circle'].includes(state.shape))state.shape='rect';
 if(!['laser','shear'].includes(state.cutMethod))state.cutMethod='laser';
 let materialCatalog=null,request=null,timer=null,serial=0,last=null,lastSVG='';
 root.innerHTML=`<style>${NEST_CSS}</style><div class="nest-pro">
  <div class="nest-top"><p class="nest-subtitle">1 loại chi tiết · Thành phẩm (mm) · Đường bao ngoài</p>
   <div class="nest-materials" role="group" aria-label="Vật liệu"><strong>Vật liệu</strong>
    ${quickMaterialLabels.map((v,i)=>`<button type="button" data-nest-material="${i}" aria-pressed="false" disabled>${v}</button>`).join('')}
    <select class="nest-material-list" id="nest-all-materials" aria-label="Danh mục khối lượng riêng dùng chung" disabled><option value="">Đang tải vật liệu...</option></select>
    <button class="nest-material-retry" type="button" id="nest-material-retry" hidden>Tải lại</button>
   </div>
  </div><p class="nest-material-warning" id="nest-material-warning" role="alert" hidden></p>
  <div class="nest-panelgrid">
   <section class="nest-panel nest-parameters"><h2 class="nest-panel-title">TẤM PHÔI &amp; CHI TIẾT</h2>
    <div class="nest-grid three">
     ${nestField('sheetW','Dài tấm (mm)',state.sheetW,{unit:''})}${nestField('sheetH','Rộng tấm (mm)',state.sheetH,{unit:''})}${nestField('thickness','Dày (mm)',state.thickness,{unit:''})}
    </div>
    <div class="nest-grid three">
     <label class="nest-field"><span class="nest-field-label">Hình dạng</span><select class="nest-shape" name="shape"><option value="rect">Chữ nhật</option><option value="circle">Hình tròn</option></select></label>
     <div data-nest-part="rect">${nestField('partW','Dài TP (mm)',state.partW,{unit:''})}</div>
     <div data-nest-part="rect">${nestField('partH','Rộng TP (mm)',state.partH,{unit:''})}</div>
     <div data-nest-part="circle">${nestField('diameter','D TP (mm)',state.diameter,{unit:''})}</div>
    </div>
    <div class="nest-grid two">
     ${nestField('allowance','Dư gia công (mm)',state.allowance,{unit:'',accent:'allowance'})}
     ${nestField('gap','Mạch cắt (mm)',state.gap,{unit:'',accent:'kerf'})}
    </div>
    <div class="nest-grid two">
     ${nestField('margin','Chừa mép (mm)',state.margin,{unit:''})}
     <div class="nest-qty-box">${nestField('quantity','Số lượng',state.quantity,{unit:'',readOnly:true})}
      <div class="nest-toggle nest-qty-switch" role="group" aria-label="Chế độ số lượng">
       <button type="button" data-nest-mode="auto">Tự động</button><button type="button" data-nest-mode="manual">Điền tay</button>
      </div></div>
    </div>
    <div class="nest-methods"><h3>PHƯƠNG PHÁP CẮT</h3><div class="nest-toggle" role="group" aria-label="Phương pháp cắt">
     <button type="button" data-nest-cut="laser">Laser / Plasma</button><button type="button" data-nest-cut="shear">Chặt sấn</button>
    </div><p class="nest-hint" id="nest-cut-hint"></p></div>
    <p class="nest-error" id="nest-error" role="alert"></p>
   </section>
   <section class="nest-panel nest-output" aria-label="Sơ đồ trải phôi">
    <div class="nest-figure">
     <div class="nest-figure-title" id="nest-figure-title">TẤM PHÔI 6,000 × 2,000 × 20 mm</div>
     <div class="nest-preview" id="nest-preview">Đang lập sơ đồ…</div>
     <div class="nest-legend" id="nest-legend"></div><p class="nest-preview-note" id="nest-preview-note"></p>
    </div>
    <div class="nest-caption"><strong class="nest-summary" id="nest-summary">—</strong><span class="nest-sizing" id="nest-sizing">—</span></div>
    <div class="nest-footrow"><p class="nest-strategy" id="nest-strategy">—</p>
     <button class="nest-export" type="button" id="nest-svg-export" disabled>↓ Tải sơ đồ SVG</button></div>
    <div class="nest-status" id="nest-status" role="status" aria-live="polite"></div>
   </section>
  </div>
  <section class="nest-result-grid" aria-label="Kết quả trải phôi">
   <div class="nest-result"><strong>Xuất phôi (kg)</strong><output id="nest-issued">—</output></div>
   <div class="nest-result"><strong>Thành phẩm* (kg)</strong><output id="nest-finished">—</output></div>
   <div class="nest-result emphasis"><button id="nest-copy" type="button" title="Sao chép kết quả"><strong>Hao phí / TP (%)</strong><output id="nest-waste">—</output></button></div>
   <div class="nest-result"><strong>Tấm lẻ còn lại (mm)</strong><output id="nest-remnant">—</output></div>
  </section>
  <p class="nest-note">* Thành phẩm tính theo đường bao ngoài. Hao phí = (Xuất phôi − TP) / TP × 100. Tấm lẻ (cạnh ≥ 200 mm) được giữ lại, không tính xuất.</p>
 </div>`;
 const getField=name=>root.querySelector(`[name="${name}"]`);
 const getById=id=>root.querySelector('#'+id);
 function collectFields(){
  for(const key of ['sheetW','sheetH','thickness','partW','partH','diameter','allowance','gap','margin'])state[key]=getField(key).value;
  if(!state.autoMax)state.quantity=getField('quantity').value;
  state.allowances[state.shape]=state.allowance;
  savedState=structuredClone(state);
 }
 function syncUI(){
  getField('shape').value=state.shape;
  for(const key of ['sheetW','sheetH','thickness','partW','partH','diameter','allowance','gap','margin','quantity'])getField(key).value=prettyPortable(Number(String(state[key]).replaceAll(',','')));
  getField('quantity').readOnly=state.autoMax;
  getField('quantity').setAttribute('aria-readonly',String(state.autoMax));
  root.querySelectorAll('[data-nest-part]').forEach(el=>el.hidden=el.dataset.nestPart!==state.shape);
  root.querySelectorAll('[data-nest-mode]').forEach(b=>{const yes=(b.dataset.nestMode==='auto')===state.autoMax;b.classList.toggle('is-active',yes);b.setAttribute('aria-pressed',String(yes));});
  root.querySelectorAll('[data-nest-cut]').forEach(b=>{const yes=b.dataset.nestCut===state.cutMethod;b.classList.toggle('is-active',yes);b.setAttribute('aria-pressed',String(yes));b.disabled=b.dataset.nestCut==='shear'&&state.shape==='circle';});
  root.querySelectorAll('[data-nest-material]').forEach(b=>{const yes=Number(b.dataset.nestMaterial)===state.material;b.classList.toggle('is-active',yes);b.setAttribute('aria-pressed',String(yes));});
  const chooser=getById('nest-all-materials');
  if(materialCatalog)chooser.value=state.material>=4?String(state.material):'';
  const kerf=getField('gap').closest('.nest-field').querySelector('.nest-field-label');
  kerf.textContent=state.cutMethod==='shear'?'Khe hở (mm)':'Mạch cắt (mm)';
  setText(root,'#nest-cut-hint',state.cutMethod==='shear'?'Nhát chặt chạy suốt → chia dải nhiều cấp':'');
 }
 function payload(){
  const names={sheetW:'Dài tấm',sheetH:'Rộng tấm',thickness:'Dày',partW:'Dài TP',partH:'Rộng TP',diameter:'D TP',allowance:'Dư gia công',gap:state.cutMethod==='shear'?'Khe hở':'Mạch cắt',margin:'Chừa mép',quantity:'Số lượng'};
  const inputs=['sheetW','sheetH','thickness',...(state.shape==='rect'?['partW','partH']:['diameter']),'allowance','gap','margin'];
  const vals=Object.fromEntries(inputs.map(key=>[key,parseNestNumber(state[key],names[key],{strictPositive:['sheetW','sheetH','thickness','partW','partH','diameter'].includes(key)})]));
  const density=Number(state.density);
  if(!Number.isFinite(density)||density<=0||density>LIMIT)throw Error('Kiểm tra vật liệu và khối lượng riêng.');
  return {shape:state.shape,cutMethod:state.cutMethod,autoMax:state.autoMax,density,...vals,quantity:state.autoMax?1:parseNestNumber(state.quantity,'Số lượng',{strictPositive:true,integer:true})};
 }
 function status(message='',busy=false){const box=getById('nest-status');box.textContent=message;if(busy)box.insertAdjacentHTML('beforeend','<span class="nest-spinner" aria-hidden="true"></span>');getById('nest-svg-export').disabled=busy||!lastSVG;}
 function invalid(message){last=null;lastSVG='';getById('nest-preview').textContent='Không thể lập sơ đồ với thông số hiện tại.';getById('nest-legend').textContent='';getById('nest-figure-title').textContent='TẤM PHÔI';setText(root,'#nest-error',message);for(const id of ['nest-issued','nest-finished','nest-waste','nest-remnant','nest-summary','nest-sizing','nest-strategy','nest-preview-note'])getById(id).textContent='—';getById('nest-preview-note').textContent='';status('');}
 function present(res){
  last=res;
  const pic=previewDrawing(res);lastSVG=pic.download;
  getById('nest-preview').innerHTML=pic.svg;
  getById('nest-figure-title').textContent=pic.title;
  getById('nest-legend').innerHTML=pic.legend;
  const count=res.shownOnSheet;
  getById('nest-preview-note').textContent=res.previewDrawn<count?`Minh họa ${prettyPortable(res.previewDrawn)}/${prettyPortable(count)} chi tiết đầu tiên`:'';
  if(state.autoMax)getField('quantity').value=prettyPortable(res.partsPerSheet);
  setText(root,'#nest-issued',prettyPortable(res.issuedKG));
  setText(root,'#nest-finished',prettyPortable(res.finishedKG));
  setText(root,'#nest-waste',percentagePortable(res.wasteOverFinishedPercent));
  setText(root,'#nest-remnant',state.autoMax?'—':res.remnantL>0?`${prettyPortable(res.remnantL)} × ${prettyPortable(res.remnantW)}`:'Không có');
  setText(root,'#nest-summary',state.autoMax?`${prettyPortable(res.partsPerSheet)} chi tiết / tấm`:`Tấm cuối: ${prettyPortable(res.lastSheetParts)} / ${prettyPortable(res.partsPerSheet)} chi tiết`);
  const i=res.input;
  setText(root,'#nest-sizing',i.shape==='circle'?`TP D${prettyPortable(i.diameter)} → Cắt D${prettyPortable(res.cutW)} mm`:`TP ${prettyPortable(i.partW)} × ${prettyPortable(i.partH)} → Cắt ${prettyPortable(res.cutW)} × ${prettyPortable(res.cutH)} mm`);
  setText(root,'#nest-strategy',!i.autoMax&&res.remnantL>0?`Xuất dài ${prettyPortable(res.issuedLastLength)} mm · Tấm lẻ giữ lại ${prettyPortable(res.remnantL)} × ${prettyPortable(res.remnantW)} mm`:nestingStrategy(res));
  getById('nest-error').textContent='';status('');
 }
 function compute(){
  serial++;const job=serial;
  request?.abort();request=new AbortController();const mine=request;
  let args;try{collectFields();args=payload();}catch(e){invalid(e.message);return;}
  last=null;lastSVG='';status('Đang tính sơ đồ…',true);
  const timeout=setTimeout(()=>mine.abort(),25000);
  fetch(NEST_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args),signal:mine.signal,cache:'no-store',credentials:'omit'})
   .then(async r=>{
    const data=await r.json().catch(()=>null);
    if(!r.ok||!data?.ok)throw Error(data?.error||(r.status===429?'Bạn thao tác quá nhanh, vui lòng thử lại sau ít giây.':'Máy chủ tính toán chưa phản hồi. Vui lòng thử lại.'));
    return data.result;
   })
   .then(res=>{if(job!==serial||ctx.signal?.aborted)return;present(res);})
   .catch(err=>{
    if(job!==serial||ctx.signal?.aborted)return;
    invalid(err?.name==='AbortError'?'Hết thời gian chờ máy chủ tính toán.':(err?.message||'Không thể tính trải phôi.'));
   })
   .finally(()=>clearTimeout(timeout));
 }
 function schedule(){clearTimeout(timer);request?.abort();serial++;status('Đang cập nhật…',true);timer=setTimeout(compute,250);}
 root.addEventListener('input',e=>{
  if(!e.target.matches('input[name]'))return;
  collectFields();if(e.target.name==='quantity'&&state.autoMax)return;schedule();
 },{signal:ctx.signal});
 root.addEventListener('focusout',e=>{
  if(!e.target.matches('input[name]')||e.target.readOnly)return;
  const key=e.target.name;
  try{e.target.value=prettyPortable(parseNestNumber(e.target.value,key));collectFields();}catch{}
 },{signal:ctx.signal});
 getField('shape').addEventListener('change',e=>{
  collectFields();state.shape=e.target.value;
  state.allowance=state.allowances[state.shape]??DEFAULT_STATE.allowances[state.shape];
  if(state.shape==='circle'&&state.cutMethod==='shear'){
   state.sheets.shear=[state.sheetW,state.sheetH,state.thickness];state.gaps.shear=state.gap;
   state.cutMethod='laser';[state.sheetW,state.sheetH,state.thickness]=state.sheets.laser;state.gap=state.gaps.laser;
  }
  savedState=structuredClone(state);syncUI();schedule();
 },{signal:ctx.signal});
 root.addEventListener('click',e=>{
  const mat=e.target.closest('[data-nest-material]');
  if(mat){if(!materialCatalog){ctx.showToast?.('Danh mục vật liệu chưa tải xong.','error');return;}collectFields();state.material=Number(mat.dataset.nestMaterial);state.density=String(materialCatalog[state.material].density);state.customDensity=false;savedState=structuredClone(state);syncUI();schedule();return;}
  const mode=e.target.closest('[data-nest-mode]');
  if(mode){collectFields();state.autoMax=mode.dataset.nestMode==='auto';savedState=structuredClone(state);syncUI();schedule();return;}
  const cut=e.target.closest('[data-nest-cut]');
  if(cut&&!cut.disabled){collectFields();const next=cut.dataset.nestCut;if(next!==state.cutMethod){
   state.sheets[state.cutMethod]=[state.sheetW,state.sheetH,state.thickness];state.gaps[state.cutMethod]=state.gap;
   state.cutMethod=next;[state.sheetW,state.sheetH,state.thickness]=state.sheets[next];state.gap=state.gaps[next];
   savedState=structuredClone(state);syncUI();schedule();}return;}
 },{signal:ctx.signal});
 const select=getById('nest-all-materials'),retry=getById('nest-material-retry');
 select.addEventListener('change',()=>{
  const idx=Number(select.value),item=materialCatalog?.[idx];if(!select.value||!item)return;
  collectFields();state.material=idx;state.density=String(item.density);state.customDensity=false;savedState=structuredClone(state);syncUI();schedule();
 },{signal:ctx.signal});
 async function loadCatalog(){
  const warning=getById('nest-material-warning');retry.hidden=true;warning.hidden=true;
  select.disabled=true;select.innerHTML='<option value="">Đang tải vật liệu...</option>';
  try{
   const catalog=await loadMaterials();
   if(ctx.signal?.aborted)return;
   if(!Array.isArray(catalog)||catalog.length<4||!catalog.every(v=>v&&typeof v.name==='string'&&Number.isFinite(v.density)&&v.density>0))throw Error('Danh mục vật liệu không hợp lệ');
   materialCatalog=catalog;
   select.replaceChildren(new Option(`Danh mục ${catalog.length} vật liệu`,'') ,...catalog.map((v,i)=>new Option(v.name,String(i))));
   select.disabled=false;
   root.querySelectorAll('[data-nest-material]').forEach((b,i)=>{b.disabled=false;b.textContent=catalog[i].name;});
   if(!Number.isInteger(state.material)||state.material<0||state.material>=catalog.length)state.material=0;
   state.density=String(catalog[state.material].density);state.customDensity=false;savedState=structuredClone(state);syncUI();schedule();
  }catch(error){if(ctx.signal?.aborted)return;materialCatalog=null;select.disabled=true;retry.hidden=false;warning.hidden=false;warning.textContent='Không tải được materials.json; đang dùng khối lượng riêng đã lưu. Kiểm tra dữ liệu và nhấn Tải lại.';console.warn('Nesting catalog:',error);}
 }
 retry.addEventListener('click',()=>void loadCatalog(),{signal:ctx.signal});
 getById('nest-svg-export').addEventListener('click',()=>{
  if(!last||!lastSVG){ctx.showToast?.('Chưa có sơ đồ hợp lệ để xuất.','error');return;}
  downloadBlob(new Blob([lastSVG],{type:'image/svg+xml;charset=utf-8'}),'epsilon-soft-trai-phoi-2d.svg');ctx.showToast?.('Đã tạo sơ đồ SVG.');
 },{signal:ctx.signal});
 getById('nest-copy').addEventListener('click',()=>{
  if(!last)return;
  const text=`ES TOOLKIT Nesting | capacity ${last.partsPerSheet}/sheet | ${last.sheets} sheets | issued ${prettyPortable(last.issuedKG)} kg | finished ${prettyPortable(last.finishedKG)} kg | waste ${prettyPortable(last.wasteKG)} kg | waste/finished ${percentagePortable(last.wasteOverFinishedPercent)}% | last remnant ${prettyPortable(last.remnantL)} x ${prettyPortable(last.remnantW)} mm | last issued length ${prettyPortable(last.issuedLastLength)} mm`;
  if(!navigator.clipboard?.writeText){ctx.showToast?.('Không thể sao chép khi trình duyệt không hỗ trợ.','error');return;}
  navigator.clipboard.writeText(text).then(()=>ctx.showToast?.('Đã sao chép kết quả.'),()=>ctx.showToast?.('Không sao chép được kết quả.','error'));
 },{signal:ctx.signal});
 syncUI();compute();void loadCatalog();
 return ()=>{clearTimeout(timer);serial++;request?.abort();request=null;};
}
