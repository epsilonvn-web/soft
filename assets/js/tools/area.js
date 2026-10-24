/**
 * Epsilon Soft · DIEN TICH HINH HOC
 * Reference: ES TOOLKIT V1.0/core/geometry.go, ui_windows.go/drawAreaPage(),
 * main_windows.go/areaUnit, area_alternatives_windows.go, draw_windows.go.
 * One standalone tool; no changes required in app.js / index.html / other tools.
 */
const AREA_NAMES = ['Hình vuông','Hình chữ nhật','Hình tam giác','Hình bình hành','Hình thang','Hình tròn','Hình bán nguyệt','Hình elip','Hình quạt tròn','Ống thép tròn','Ống thép hộp'];
const AREA_FIELDS = [
 [['a','Chiều dài cạnh a'],['r','Bán kính bo góc r']],
 [['a','Chiều dài a'],['b','Chiều rộng b'],['r','Bán kính bo góc r']],
 [['a','Cạnh đáy a'],['h','Chiều cao h']],
 [['a','Cạnh đáy a'],['h','Chiều cao h']],
 [['a','Đáy lớn a'],['b','Đáy nhỏ b'],['h','Chiều cao h']],
 [['d','Đường kính D'],['r','Bán kính r']],
 [['d','Đường kính D'],['r','Bán kính r']],
 [['a','Đường kính lớn a'],['b','Đường kính nhỏ b']],
 [['r','Bán kính r'],['theta','Góc ở tâm α']],
 [['d','Đường kính ngoài D'],['t','Chiều dày t'],['di','Đường kính trong d']],
 [['a','Chiều rộng ngoài a'],['b','Chiều cao ngoài b'],['t','Chiều dày t'],['r','Bán kính góc ngoài R']]
];
const AREA_FORMULAS = [
 'S = a² − (4−π)r²','S = a×b − (4−π)r²','S = a×h/2','S = a×h',
 'S = (a+b)×h/2','S = π×D²/4 = πr²','S = π×D²/8 = πr²/2',
 'S = π×a×b/4','S = π×r²×α/360','S = π(D²−d²)/4; d = D−2t','S = S ngoài − S trong'
];
const AREA_UNITS = [ ['mm',1], ['cm',10], ['m',1000], ['in',25.4] ];
const areaSession = {shape:1, unit:0, values:Array.from({length:11},()=>({}))};
areaSession.values[1] = {a:'100',b:'50',r:'0'};
const escaped = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const isNum = n => Number.isFinite(n) && n>0;
const bad = () => { throw Error('Kích thước không hợp lệ hoặc không đủ dữ liệu'); };
const getP = (p,k,optional=false) => {
 if (!Object.prototype.hasOwnProperty.call(p,k)) return optional ? 0 : bad();
 const n = p[k]; if(!Number.isFinite(n) || n<0 || (!optional && n<=0))return bad();return n;
};
/** Mirrors native geometry.go; accepts D or r and D+t or D+d. */
export function calculateAreaPortable(shape, p){
 if(!Number.isInteger(shape)||shape<0||shape>=11)return bad();
 const g=(k)=>getP(p,k), o=(k)=>getP(p,k,true);
 const rectangle=(a,b,r)=>{if(r>Math.min(a,b)/2)throw Error('Bán kính góc phải nằm trong 0…min(a,b)/2');return a*b-(4-Math.PI)*r*r;};
 const tube=(d,t)=>{if(!isNum(t)||2*t>=d)throw Error('Chiều dày ống phải nhỏ hơn D/2');return Math.PI/4*(d*d-(d-2*t)**2);};
 const box=(a,b,t,r)=>{if(!isNum(t)||t>=Math.min(a,b)/2)throw Error('Chiều dày phải nhỏ hơn nửa cạnh nhỏ nhất');if(r>0&&r<t)throw Error('Bán kính R cần ≥ chiều dày t (hoặc R = 0)');return rectangle(a,b,r)-rectangle(a-2*t,b-2*t,r>0?r-t:0);};
 const circD=()=>{
  const hasD=Object.hasOwn(p,'d'),hasR=Object.hasOwn(p,'r');if(!hasD&&!hasR)return bad();
  if(hasD&&!isNum(p.d)||hasR&&!isNum(p.r))return bad();
  if(hasD&&hasR&&Math.abs(p.d-2*p.r)>1e-9*Math.max(1,p.d))throw Error('Đường kính D phải bằng 2 lần bán kính r');
  return hasD?p.d:2*p.r;
 };
 const tubeT=(d)=>{
  const hasT=Object.hasOwn(p,'t'),hasDi=Object.hasOwn(p,'di');if(!hasT&&!hasDi)return bad();
  if(hasT&&(!isNum(p.t)||2*p.t>=d))throw Error('Chiều dày t phải nằm trong (0, D/2)');
  if(hasDi&&(!isNum(p.di)||p.di>=d))throw Error('Đường kính trong d phải nằm trong (0, D)');
  if(hasT&&hasDi&&Math.abs(d-2*p.t-p.di)>1e-9*Math.max(1,d))throw Error('Đường kính trong d phải bằng D - 2t');
  return hasT?p.t:(d-p.di)/2;
 };
 let s;
 switch(shape){
  case 0: s=rectangle(g('a'),g('a'),o('r'));break;
  case 1: s=rectangle(g('a'),g('b'),o('r'));break;
  case 2: s=g('a')*g('h')/2;break;
  case 3: s=g('a')*g('h');break;
  case 4: s=(g('a')+g('b'))*g('h')/2;break;
  case 5: {const d=circD();s=Math.PI*d*d/4;break;}
  case 6: {const d=circD();s=Math.PI*d*d/8;break;}
  case 7: s=Math.PI*g('a')*g('b')/4;break;
  case 8: {const r=g('r'),angle=g('theta');if(angle>360)throw Error('Góc cần lớn hơn 0° và không vượt 360°');s=Math.PI*r*r*angle/360;break;}
  case 9: {const d=g('d');s=tube(d,tubeT(d));break;}
  case 10:s=box(g('a'),g('b'),g('t'),o('r'));break;
 }
 if(!isNum(s))return bad();return s;
}
function parseText(text){
 const s=String(text??'').trim().replace(/\s/g,'');if(!s)return null;if(s.length>45)return NaN;
 let v=s;
 if(/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(v))v=v.replace(/,/g,'');
 else if(/^[-+]?\d+,\d+$/.test(v))v=v.replace(',','.');
 else if(v.includes(','))return NaN;
 if(!/^[+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v))return NaN;
 return Number(v);
}
function formatResult(value){
 if(!Number.isFinite(value))return '—';if(value===0)return '0';
 if(Math.abs(value)<0.00005||Math.abs(value)>=1e14)return value.toExponential(4).replace(/(\.\d*?)0+(?=e)/,'$1').replace(/\.e/,'e');
 const [integer,dec] = value.toFixed(4).replace(/\.?0+$/,'').split('.');
 return integer.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(dec?'.'+dec:'');
}
function formatInput(value){return Number.isFinite(value)?String(Number(value.toPrecision(13))):'';}
function reference(shape,key,v){
 const num=k=>parseText(v[k]);const valid=x=>Number.isFinite(x)&&x>0;
 if((shape===5||shape===6)&&key==='r'&&v.d?.trim()){const n=num('d');return {source:'d',value:valid(n)?n/2:null};}
 if((shape===5||shape===6)&&key==='d'&&v.r?.trim()){const n=num('r');return {source:'r',value:valid(n)?2*n:null};}
 if(shape===9&&key==='di'&&v.t?.trim()){const d=num('d'),t=num('t');return {source:'t',value:valid(d)&&valid(t)&&d>2*t?d-2*t:null};}
 if(shape===9&&key==='t'&&v.di?.trim()){const d=num('d'),di=num('di');return {source:'di',value:valid(d)&&valid(di)&&di<d?(d-di)/2:null};}
 return null;
}
// Precise, scalable 2D technical diagrams. Pure SVG; no image resources.
function areaDiagram(shape, values) {
 const value = key => parseText(values[key]);
 const hasR = (shape === 0 || shape === 1 || shape === 10) && Number.isFinite(value('r')) && value('r') > 0;
 const C = {edge:'#663be6', dim:'#c7339a', detail:'#7c64cc', fill:'#e4dbff'};
 const text = (x,y,label,anchor='middle',size=20) => `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="#5727bd" font-size="${size}" font-weight="760" paint-order="stroke" stroke="#fdfbff" stroke-width="5" stroke-linejoin="round">${label}</text>`;
 const ext = (x1,y1,x2,y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="#b8a2ec" stroke-width="1.4"/>`;
 const arrow = (x1,y1,x2,y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${C.dim}" stroke-width="1.9" marker-start="url(#ea-arrow)" marker-end="url(#ea-arrow)"/>`;
 const hdim = (x1,x2,y,caption,sourceY=null,above=false) => `${sourceY===null?'':ext(x1,sourceY,x1,y+(y>sourceY?7:-7))+ext(x2,sourceY,x2,y+(y>sourceY?7:-7))}${arrow(x1,y,x2,y)}${text((x1+x2)/2,y+(above?-13:28),caption)}`;
 const vdim = (x,y1,y2,caption,sourceX=null) => `${sourceX===null?'':ext(sourceX,y1,x-7,y1)+ext(sourceX,y2,x-7,y2)}${arrow(x,y1,x,y2)}${text(x-20,(y1+y2)/2+7,caption,'end')}`;
 const outline = `fill="url(#ea-fill)" stroke="${C.edge}" stroke-width="3.2" stroke-linejoin="round"`;
 const guide = (d) => `<path d="${d}" fill="none" stroke="#b6a0e7" stroke-width="1.4" stroke-dasharray="6 5"/>`;
 const leader = (px,py,ax,ay,bx,by,label) => `<path d="M${px} ${py}L${ax} ${ay}L${bx} ${by}" stroke="${C.dim}" stroke-width="2.2" fill="none" stroke-linejoin="round" marker-start="url(#ea-arrow)"/>${text(bx+8,by-7,label,'start',21)}`;
 // The pointed end is always computed on the real quarter-circle, not on a sharp corner.
 const corner = (x,y,w,rx,caption='R') => {
   if (!rx) return '';
   const cx=x+w-rx, cy=y+rx, p=rx/Math.SQRT2;
   return `<circle cx="${cx}" cy="${cy}" r="2.3" fill="${C.detail}" opacity="0.75"/>${guide(`M${cx} ${cy}L${cx+p} ${cy-p}`)}${leader(cx+p,cy-p,x+w+19,y-12,x+w+45,y-30,caption)}`;
 };
 const tube = (cx,cy,outer,inner) => `<circle cx="${cx}" cy="${cy}" r="${outer}" ${outline}/><circle cx="${cx}" cy="${cy}" r="${inner}" fill="#fff" stroke="${C.edge}" stroke-width="3"/>${guide(`M${cx-outer-13} ${cy}H${cx+outer+13}M${cx} ${cy-outer-13}V${cy+outer+13}`)}`;
 let svg='';
 switch (shape) {
 case 0: {
   const x=243,y=76,w=214,h=214,r=hasR?28:0;
   svg=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${outline}/>${hdim(x,x+w,325,'a',y+h)}${corner(x,y,w,r,'r')}`;
   break;
 }
 case 1: {
   const x=198,y=94,w=302,h=183,r=hasR?29:0;
   svg=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${outline}/>${hdim(x,x+w,315,'a',y+h)}${vdim(165,y,y+h,'b',x)}${corner(x,y,w,r,'r')}`;
   break;
 }
 case 2:
   svg=`<polygon points="349,70 198,276 503,276" ${outline}/>${hdim(198,503,314,'a',276)}${guide('M349 70V276')}<path d="M349 259h17v17" stroke="${C.dim}" stroke-width="2" fill="none"/>${text(368,180,'h','start')}`;break;
 case 3:
   svg=`<polygon points="256,96 513,96 446,275 190,275" ${outline}/>${hdim(190,446,316,'a',275)}${guide('M256 96V275')}<path d="M256 258h17v17" stroke="${C.dim}" stroke-width="2" fill="none"/>${text(268,178,'h','start')}`;break;
 case 4:
   svg=`<polygon points="266,100 434,100 502,275 195,275" ${outline}/>${hdim(195,502,317,'a',275)}${hdim(266,434,71,'b',100,true)}${guide('M266 100V275')}<path d="M266 258h17v17" stroke="${C.dim}" stroke-width="2" fill="none"/>${text(278,187,'h','start')}`;break;
 case 5: {
   const cx=350,cy=180,r=103;
   svg=`<circle cx="${cx}" cy="${cy}" r="${r}" ${outline}/>${guide(`M${cx-r-12} ${cy}H${cx+r+12}M${cx} ${cy-r-12}V${cy+r+12}`)}${hdim(cx-r,cx+r,319,'D',cy+r)}<circle cx="${cx}" cy="${cy}" r="3" fill="${C.dim}"/><path d="M350 180L421 109" fill="none" stroke="${C.dim}" stroke-width="2" marker-end="url(#ea-arrow)"/>${text(404,138,'r','start')}`;break;
 }
 case 6: {
   const cx=350,cy=277,r=127;
   svg=`<path d="M${cx-r} ${cy} A${r} ${r} 0 0 1 ${cx+r} ${cy} Z" ${outline}/>${hdim(cx-r,cx+r,316,'D',cy)}${guide('M350 150V277')}<circle cx="${cx}" cy="${cy}" r="3" fill="${C.dim}"/><path d="M350 277L439 188" fill="none" stroke="${C.dim}" stroke-width="2" marker-end="url(#ea-arrow)"/>${text(412,208,'r','start')}`;break;
 }
 case 7: {
   const cx=350,cy=175,rx=163,ry=101;
   svg=`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${outline}/>${guide('M350 65V285M176 175H524')}${hdim(cx-rx,cx+rx,314,'a',cy+ry)}${vdim(160,cy-ry,cy+ry,'b',cx-rx)}`;break;
 }
 case 8: {
   const raw=value('theta'); const deg=Number.isFinite(raw)&&raw>0&&raw<=360?raw:105;
   const cx=333,cy=274,r=123,alpha=deg*Math.PI/180,ex=cx+r*Math.cos(-alpha),ey=cy+r*Math.sin(-alpha);
   svg = deg>=359.999?`<circle cx="${cx}" cy="${cy-24}" r="${r}" ${outline}/>`:`<path d="M${cx} ${cy}L${cx+r} ${cy}A${r} ${r} 0 ${deg>180?1:0} 0 ${ex.toFixed(3)} ${ey.toFixed(3)}Z" ${outline}/>`;
   svg+=deg>=359.999?`<circle cx="${cx}" cy="${cy-24}" r="3" fill="${C.dim}"/><path d="M${cx} ${cy-24}L${cx+r} ${cy-24}" stroke="${C.dim}" stroke-width="2" marker-end="url(#ea-arrow)"/>${text(cx+70,cy-37,'r')}`:`<circle cx="${cx}" cy="${cy}" r="3" fill="${C.dim}"/><path d="M${cx} ${cy}L${cx+88} ${cy-86}" stroke="${C.dim}" stroke-width="2" marker-end="url(#ea-arrow)"/>${text(cx+60,cy-70,'r')}${svgArcAngle(cx,cy,deg)}`;
   break;
 }
 case 9: {
   const cx=350,cy=177,outer=103,inner=66;
   svg=tube(cx,cy,outer,inner)+hdim(cx-outer,cx+outer,319,'D',cy+outer)+arrow(cx-inner,cy+12,cx+inner,cy+12)+text(cx,cy-3,'d')+arrow(cx+inner,cy-30,cx+outer,cy-30)+text(cx+inner+(outer-inner)/2,cy-41,'t');break;
 }
 case 10: {
   const x=224,y=90,w=252,h=191,r=hasR?28:0,wall=27,ri=r?Math.max(0,r-wall):0;
   svg=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${outline}/><rect x="${x+wall}" y="${y+wall}" width="${w-2*wall}" height="${h-2*wall}" rx="${ri}" fill="#fff" stroke="${C.edge}" stroke-width="3"/>${hdim(x,x+w,320,'a',y+h)}${vdim(185,y,y+h,'b',x)}${arrow(x+w-wall,y+106,x+w,y+106)}${text(x+w-wall/2,y+94,'t')}${corner(x,y,w,r,'R')}`;break;
 }
 }
 const mobile=typeof window!=='undefined'&&window.matchMedia?.('(max-width:540px)').matches;
 return `<svg class="ea-svg" viewBox="${mobile?'120 12 460 356':'0 0 700 360'}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escaped(AREA_NAMES[shape])}: mat cat 2D va kich thuoc" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="ea-fill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3edff"/><stop offset="0.55" stop-color="#ddd0ff"/><stop offset="1" stop-color="#c9bbff"/></linearGradient><marker id="ea-arrow" markerUnits="userSpaceOnUse" viewBox="0 0 10 10" markerWidth="8" markerHeight="8" refX="8" refY="5" orient="auto-start-reverse"><path d="M0 1 L8 5 L0 9 Z" fill="${C.dim}"/></marker></defs>${svg}</svg>`;
}
function svgArcAngle(cx,cy,deg){
 const a=Math.min(deg,360)*Math.PI/180, r=33, mid=-Math.min(a,1.7)/2;
 const ex=cx+r*Math.cos(-a),ey=cy+r*Math.sin(-a);
 return `<path d="M${cx+r} ${cy}A${r} ${r} 0 ${deg>180?1:0} 0 ${ex} ${ey}" fill="none" stroke="#c7339a" stroke-width="1.8"/>`+
 `<text x="${cx+52*Math.cos(mid)}" y="${cy+52*Math.sin(mid)}" fill="#5727bd" font-size="20" font-weight="760" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="4">&#945;</text>`;
}
const AREA_STYLE = `<style>
.ea-root{font-size:16px;color:#142578;--ea-p:#6b2fec;--ea-border:#e1d7ff;--ea-muted:#6072a0}
.ea-root *{box-sizing:border-box}.ea-title{font-size:25px;font-weight:850;color:#6c24d0;margin:0 0 2px}.ea-subtitle{margin:0 0 14px;color:var(--ea-muted);font-size:16px}
.ea-shapes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:0 0 14px}
.ea-choice{border:1px solid #dcd4fa;background:#fff;color:#4c22b8;border-radius:13px;padding:10px 5px;min-height:46px;line-height:1.25;font-size:16px;font-weight:740;transition:background .15s,box-shadow .15s,border-color .15s}
.ea-choice:hover{border-color:#ac83ff;box-shadow:0 5px 16px #6128ba18}.ea-choice[aria-pressed="true"]{background:linear-gradient(110deg,#bb4af8,#722df0);color:#fff;border-color:transparent;box-shadow:0 6px 14px #6936cd2b}
.ea-panels{display:grid;grid-template-columns:minmax(0,.94fr) minmax(0,1.06fr);gap:14px}.ea-card{border:1px solid var(--ea-border);background:#fff;border-radius:17px;padding:16px 18px;min-width:0}.ea-panehead{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:16px}.ea-panehead h3{margin:0;font-size:19px;font-weight:850;color:#4f22ae}.ea-unit{display:flex;align-items:center;gap:9px;font-size:16px;font-weight:750}.ea-unit select{border:1px solid #d5c3ff;color:#6228d5;background:#f9f6ff;padding:8px 12px;border-radius:11px;min-width:90px;height:43px;font-weight:800}
.ea-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px 11px;align-content:start}.ea-field{display:block;min-width:0}.ea-field-label{display:block;font-size:16px;font-weight:750;color:#182b87;margin-bottom:5px}.ea-inputbox{display:flex;align-items:center;width:100%;height:45px;border:1px solid #d9c2fd;border-radius:11px;background:#fff;overflow:hidden}.ea-inputbox:focus-within{border-color:#7544e9;box-shadow:0 0 0 3px #7e50ed18}.ea-inputbox input{width:100%;min-width:0;flex:1;border:0;background:transparent;padding:8px 10px;color:#192679;font-size:17px;outline:none;height:100%}.ea-inputbox .ea-suffix{color:#6530d4;font-weight:760;padding:0 9px;white-space:nowrap}
.ea-ref{border:1px solid #e2d3ff;border-radius:11px;display:flex;align-items:center;justify-content:space-between;background:#f7f2ff;min-height:45px;padding:4px 8px 4px 11px;gap:7px}.ea-ref output{font-size:17px;color:#5a32c5;font-weight:750;min-width:0;overflow-wrap:anywhere}.ea-ref button{border:0;background:#e3d7ff;border-radius:7px;padding:5px 7px;color:#5624ca;font-weight:700;white-space:nowrap;font-size:16px}
.ea-status{margin:16px 0 0;padding:12px 13px;border-radius:12px;min-height:46px;background:#f3edff;color:#5d2cbb;font-weight:720;font-size:16px;line-height:1.4}.ea-status[data-error="true"]{background:#fff0ed;color:#a93b2c;border:1px solid #f2c8bb}
.ea-sketch-title{font-size:19px;font-weight:800;color:#5629c7;margin:0}.ea-sketch-note{font-size:16px;color:#7182aa;margin:2px 0 0}.ea-graphic{display:flex;align-items:center;justify-content:center;min-height:280px;margin-top:11px;background:linear-gradient(140deg,#fcfaff,#f8f5ff);border:1px solid #e7dcff;border-radius:14px;overflow:hidden}.ea-svg{display:block;width:100%;height:auto;max-height:345px}.ea-results{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:12px}.ea-result{display:flex;flex-direction:column;justify-content:space-between;gap:5px;text-align:left;min-height:95px;border-radius:14px;padding:15px;border:1px solid #e0d5ff;color:#33228d;background:#fff;overflow:hidden}.ea-result span{font-size:16px;font-weight:750}.ea-result output{font-size:clamp(18px,1.7vw,24px);font-weight:850;overflow-wrap:anywhere;color:#101c6b}.ea-result.ea-primary{background:linear-gradient(130deg,#aa45fb,#7434ea);color:#fff;border-color:#8144ea}.ea-result.ea-primary output{color:#fff}.ea-result:focus-visible{outline:3px solid #efae21;outline-offset:2px}.ea-foot{color:#6779a7;font-size:16px;margin:9px 0 0}
@media(max-width:900px){.ea-panels{grid-template-columns:1fr}.ea-shapes{grid-template-columns:repeat(3,minmax(0,1fr))}.ea-results{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:530px){.ea-card{padding:14px}.ea-shapes{grid-template-columns:repeat(2,minmax(0,1fr))}.ea-choice{padding:9px 3px;font-size:16px}.ea-fields{grid-template-columns:1fr}.ea-graphic{min-height:180px}.ea-result{min-height:81px;padding:11px}.ea-result output{font-size:20px}.ea-panehead{margin-bottom:13px}}

/* Desktop-only density matching ES TOOLKIT Portable; no math, labels, SVG paths or mobile changes. */
@media (min-width: 1040px) and (max-height: 900px) {
.ea-root .ea-title{font-size:23px;line-height:1.2}
.ea-root .ea-subtitle{margin:1px 0 7px;line-height:1.2}
.ea-root .ea-shapes{gap:6px;margin-bottom:9px}
.ea-root .ea-choice{min-height:35px;padding:4px 5px;border-radius:9px;line-height:1.15;font-size:16px}
.ea-root .ea-panels{gap:10px}
.ea-root .ea-card{padding:10px 12px;border-radius:12px}
.ea-root .ea-panehead{margin-bottom:8px}
.ea-root .ea-unit select{height:37px;padding:4px 9px;min-width:77px}
.ea-root .ea-fields{gap:8px 9px}
.ea-root .ea-field-label{margin-bottom:3px}
.ea-root .ea-inputbox{height:38px;border-radius:9px}
.ea-root .ea-inputbox input{padding:5px 8px;font-size:16px}
.ea-root .ea-ref{min-height:38px;padding:3px 7px;border-radius:9px}
.ea-root .ea-ref button{padding:3px 6px}
.ea-root .ea-status{margin-top:8px;min-height:35px;padding:6px 9px;line-height:1.3}
.ea-root .ea-graphic{min-height:205px;margin-top:7px}
.ea-root .ea-svg{max-height:250px}
.ea-root .ea-results{gap:8px;margin-top:8px}
.ea-root .ea-result{min-height:68px;padding:9px 10px;gap:2px;border-radius:10px}
.ea-root .ea-result output{font-size:19px}
.ea-root .ea-foot{margin-top:5px}
}
</style>`;

export function mount(root, ctx){
 root.innerHTML=AREA_STYLE+`<section class="ea-root"><h2 class="ea-title">Tính diện tích hình học</h2><p class="ea-subtitle">11 hình học · Hình minh họa · Quy đổi tức thời</p>
  <nav class="ea-shapes" id="ea-shapes" aria-label="Chọn hình học">${AREA_NAMES.map((name,i)=>`<button class="ea-choice" type="button" data-shape="${i}" aria-pressed="false">${escaped(name)}</button>`).join('')}</nav>
  <div class="ea-panels"><section class="ea-card"><div class="ea-panehead"><h3>THÔNG SỐ HÌNH HỌC</h3><label class="ea-unit">Đơn vị <select id="ea-unit">${AREA_UNITS.map(([symbol],i)=>`<option value="${i}">${symbol}</option>`).join('')}</select></label></div><div class="ea-fields" id="ea-fields"></div><p class="ea-status" id="ea-status" role="status" aria-live="polite"></p></section>
  <section class="ea-card"><h3 class="ea-sketch-title" id="ea-sketch-title"></h3><p class="ea-sketch-note">Sơ đồ minh họa · Không theo tỷ lệ</p><div class="ea-graphic" id="ea-graphic"></div></section></div>
  <div class="ea-results" id="ea-results">${['Diện tích (mm²)','Diện tích (cm²)','Diện tích (m²)','Diện tích (ft²)'].map((label,i)=>`<button type="button" data-copy="${i}" class="ea-result ${i===0?'ea-primary':''}" title="Nhấn để sao chép kết quả"><span>${label}</span><output>—</output></button>`).join('')}</div>
  <p class="ea-foot">Kích thước nhập được quy đổi về mm. Nhấn vào một kết quả để sao chép.</p></section>`;
 const wrap=root.querySelector('.ea-root'), unit=wrap.querySelector('#ea-unit'), shapes=wrap.querySelector('#ea-shapes'), fields=wrap.querySelector('#ea-fields'), msg=wrap.querySelector('#ea-status'), outputs=[...wrap.querySelectorAll('.ea-result output')];
 let results=[];
 const current=()=>areaSession.values[areaSession.shape];
 const toast=(s)=>typeof ctx.showToast==='function'&&ctx.showToast(s);
 function readValues(){const p={};for(const [key] of AREA_FIELDS[areaSession.shape]){const val=parseText(current()[key]);if(val!==null){if(!Number.isFinite(val))throw Error(`Giá trị ${key} không hợp lệ`);p[key]=key==='theta'?val:val*AREA_UNITS[areaSession.unit][1];}}return p;}
 function evaluate(){
  let message='',error=false;
  try{const s=calculateAreaPortable(areaSession.shape,readValues());results=[s,s/100,s/1e6,s/92903.04];outputs.forEach((out,i)=>out.textContent=formatResult(results[i]));message='Công thức: '+AREA_FORMULAS[areaSession.shape];}
  catch(e){results=[];outputs.forEach(el=>el.textContent='—');message=e.message==='Kích thước không hợp lệ hoặc không đủ dữ liệu' ? (areaSession.shape===5||areaSession.shape===6?'Nhập D hoặc r; ô còn lại tự hiển thị tham chiếu':areaSession.shape===9?'Nhập D và t hoặc d; ô còn lại tự tính':'Nhập đầy đủ số đo để tính diện tích') : '⚠ '+e.message;error=!message.startsWith('Nhập');}
  msg.textContent=message;msg.dataset.error=String(error);
  wrap.querySelector('#ea-graphic').innerHTML=areaDiagram(areaSession.shape,current());
 }
 function updateActive(){shapes.querySelectorAll('[data-shape]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.shape)===areaSession.shape)));wrap.querySelector('#ea-sketch-title').textContent=AREA_NAMES[areaSession.shape];unit.value=String(areaSession.unit);}
 function renderFields(focus=''){
  fields.innerHTML=AREA_FIELDS[areaSession.shape].map(([key,label])=>{
   const alt=reference(areaSession.shape,key,current());
   if(alt)return `<div class="ea-field" data-field="${key}"><span class="ea-field-label">${escaped(label)}</span><div class="ea-ref"><output>${alt.value===null?'—':escaped(formatInput(alt.value))} ${AREA_UNITS[areaSession.unit][0]}</output><button type="button" data-switch="${key}" title="Nhập ${escaped(label)} thay cho kích thước kia">Đổi nhập</button></div></div>`;
   return `<label class="ea-field" data-field="${key}"><span class="ea-field-label">${escaped(label)}${key==='theta'?' (°)':''}</span><span class="ea-inputbox"><input type="text" name="${key}" maxlength="45" inputmode="decimal" autocomplete="off" value="${escaped(current()[key]??'')}" aria-label="${escaped(label)}"><span class="ea-suffix">${key==='theta'?'°':AREA_UNITS[areaSession.unit][0]}</span></span></label>`;
  }).join('');
  if(focus){const el=fields.querySelector(`input[name="${focus}"]`);if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}}
 }
 function syncAlternatives(source){
  const list=(areaSession.shape===5||areaSession.shape===6)?[['d','r']]:areaSession.shape===9?[['t','di']]:[];
  for(const [a,b] of list){if(source!==a&&source!==b)continue;
   if(String(current()[source]??'').trim()){const other=source===a?b:a;current()[other]='';}
   renderFields(source);break;}
 }
 shapes.addEventListener('click',ev=>{const b=ev.target.closest('[data-shape]');if(!b)return;areaSession.shape=Number(b.dataset.shape);updateActive();renderFields();evaluate();},{signal:ctx.signal});
 fields.addEventListener('input',ev=>{const el=ev.target;if(!el.matches('input[name]'))return;current()[el.name]=el.value;syncAlternatives(el.name);evaluate();},{signal:ctx.signal});
 fields.addEventListener('click',ev=>{const b=ev.target.closest('[data-switch]');if(!b)return;const dest=b.dataset.switch;const alt=reference(areaSession.shape,dest,current());if(!alt)return;current()[alt.source]='';current()[dest]=alt.value===null?'':formatInput(alt.value);renderFields(dest);evaluate();},{signal:ctx.signal});
 unit.addEventListener('change',()=>{const oldFactor=AREA_UNITS[areaSession.unit][1],newIndex=Number(unit.value),newFactor=AREA_UNITS[newIndex][1];
  // Each saved shape keeps the same physical dimensions upon unit changes.
  for(const [i,store] of areaSession.values.entries()){for(const [key] of AREA_FIELDS[i]){if(key==='theta')continue;const val=parseText(store[key]);if(val!==null&&Number.isFinite(val))store[key]=formatInput(val*oldFactor/newFactor);}}
  areaSession.unit=newIndex;updateActive();renderFields();evaluate();},{signal:ctx.signal});
 wrap.querySelector('#ea-results').addEventListener('click',async ev=>{const b=ev.target.closest('[data-copy]');if(!b||results.length!==4)return;try{await navigator.clipboard.writeText(formatResult(results[Number(b.dataset.copy)]));toast('Đã sao chép kết quả diện tích.');}catch{toast('Không sao chép được. Anh có thể chọn kết quả và sao chép thủ công.');}},{signal:ctx.signal});
 updateActive();renderFields();evaluate();
}
