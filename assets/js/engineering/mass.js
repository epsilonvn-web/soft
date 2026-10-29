/**
 * Epsilon Soft · KHOI LUONG VAT THE
 * Reference: ES TOOLKIT V1.0/core/geometry.go, ui_windows.go/drawMassPage(),
 * main_windows.go/loadMassInputs, draw_windows.go/drawDiagram + drawMassSideView.
 * Standalone module; does NOT alter app.js, HTML, or any other tool.
 */
const MASS_NAMES = ['Tấm chữ nhật','Tấm vuông','Tấm tròn','Tấm tam giác','Tấm lục giác đều','Trụ tròn đặc','Ống tròn','Hộp rỗng','Tấm tam giác vuông'];
const MASS_FIELDS = [
 [['a','Chiều dài a'],['b','Chiều rộng b'],['t','Chiều dày t']],
 [['a','Cạnh a'],['t','Chiều dày t']],
 [['d','Đường kính D'],['t','Chiều dày t']],
 [['a','Cạnh a'],['b','Cạnh b'],['c','Cạnh c'],['t','Chiều dày t']],
 [['f','Hai cạnh đối F'],['a','Cạnh a'],['t','Chiều dày t']],
 [['d','Đường kính D'],['l','Chiều dài L']],
 [['d','Đường kính ngoài D'],['t','Chiều dày t'],['l','Chiều dài L']],
 [['a','Rộng ngoài a'],['b','Cao ngoài b'],['t','Chiều dày t'],['l','Chiều dài L'],['r','Bán kính góc R']],
 [['a','Cạnh vuông a'],['b','Cạnh vuông b'],['t','Chiều dày t']]
];
const MASS_FORMULAS = [
 'S = a × b; V = S × t','S = a²; V = S × t','S = πD²/4; V = S × t',
 'S = √[p(p−a)(p−b)(p−c)]','S = √3×F²/2 hoặc 3√3×a²/2','S = πD²/4; V = S × L',
 'S = π[D²−(D−2t)²]/4','S = S ngoài − S trong (có thể bo góc)','S = a × b / 2; V = S × t'
];
const massSession = {
 shape:5, material:0, density:'7850', qty:'1',
 values:Array.from({length:9},()=>({}))
};
massSession.values[5] = {d:'60',l:'300'};
const escaped=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fail=()=>{throw Error('Kích thước không hợp lệ hoặc không đủ dữ liệu');};
const positive=n=>n>0&&Number.isFinite(n);
const val=(p,k,optional=false)=>{
 if(!Object.hasOwn(p,k))return optional?0:fail();
 const n=p[k];if(!Number.isFinite(n)||n<0||(!optional&&n===0))return fail();return n;
};
/** Exact physical equations of Portable V1.0; f/a alternative hexagon input. */
export function calculateMassPortable(shape,p,density,qty){
 if(!Number.isInteger(shape)||shape<0||shape>=9)return fail();
 if(!positive(density)||density>1_000_000)throw Error('Khối lượng riêng cần > 0 và ≤ 1.000.000 kg/m³');
 if(!positive(qty)||!Number.isInteger(qty)||qty>10_000_000)throw Error('Số lượng phải là số nguyên từ 1 đến 10.000.000');
 const g=k=>val(p,k),opt=k=>val(p,k,true);
 const tube=(d,t)=>{if(!positive(t)||2*t>=d)throw Error('Chiều dày ống phải nhỏ hơn D/2');return Math.PI/4*(d*d-(d-2*t)**2);};
 const rect=(a,b,r)=>{if(r<0||r>Math.min(a,b)/2)throw Error('Bán kính góc phải nằm trong 0…min(a,b)/2');return a*b-(4-Math.PI)*r*r;};
 const box=(a,b,t,r)=>{if(!positive(t)||t>=Math.min(a,b)/2)throw Error('Chiều dày phải nhỏ hơn nửa cạnh nhỏ nhất');if(r>0&&r<t)throw Error('Bán kính R cần ≥ chiều dày t (hoặc R = 0)');return rect(a,b,r)-rect(a-2*t,b-2*t,r>0?r-t:0);};
 let a,b,c,d,t,f,s;
 switch(shape){
  case 0:s=g('a')*g('b');break;
  case 1:s=g('a')**2;break;
  case 2:case 5:s=Math.PI*g('d')**2/4;break;
  case 3:{a=g('a');b=g('b');c=g('c');if(a+b<=c||a+c<=b||b+c<=a)throw Error('Ba cạnh không tạo thành tam giác');const h=(a+b+c)/2;s=Math.sqrt(h*(h-a)*(h-b)*(h-c));break;}
  case 4:{f=opt('f');a=opt('a');if(f>0)s=Math.sqrt(3)*f*f/2;else if(a>0)s=3*Math.sqrt(3)*a*a/2;else throw Error('Nhập khoảng cách F hoặc cạnh a');break;}
  case 6:s=tube(g('d'),g('t'));break;
  case 7:s=box(g('a'),g('b'),g('t'),opt('r'));break;
  case 8:s=g('a')*g('b')/2;break;
 }
 if(!positive(s))return fail();
 t=(shape<=4||shape===8)?g('t'):g('l');
 const volumeMM3=s*t,unitKG=volumeMM3*density/1e9,totalKG=unitKG*qty;
 if(!Number.isFinite(totalKG))throw Error('Kết quả vượt giới hạn tính toán');
 return {areaMM2:s,volumeMM3,unitKG,totalKG};
}
function parseText(text){
 const s=String(text??'').trim().replace(/\s/g,'');if(!s)return null;if(s.length>45)return NaN;
 let v=s;
 if(/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(v))v=v.replaceAll(',','');
 else if(/^[-+]?\d+,\d+$/.test(v))v=v.replace(',','.');
 else if(v.includes(','))return NaN;
 if(!/^[+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v))return NaN;
 return Number(v);
}
function formatResult(value){
 if(!Number.isFinite(value))return '—';if(value===0)return '0';
 if(Math.abs(value)<0.00005||Math.abs(value)>=1e14)return value.toExponential(4).replace(/(\.\d*?)0+(?=e)/,'$1').replace(/\.e/,'e');
 const [int,dec]=value.toFixed(4).replace(/\.?0+$/,'').split('.');return int.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(dec?'.'+dec:'');
}
function formatInput(n){return Number.isFinite(n)?String(Number(n.toPrecision(13))):'';}
function hexReference(key,store){
 if(key==='a'&&store.f?.trim()){const f=parseText(store.f);return {source:'f',value:positive(f)?f/Math.sqrt(3):null};}
 if(key==='f'&&store.a?.trim()){const a=parseText(store.a);return {source:'a',value:positive(a)?a*Math.sqrt(3):null};}
 return null;
}
const materialSafe=d=>!!d&&typeof d.name==='string'&&typeof d.density==='number'&&Number.isFinite(d.density)&&d.density>0;
// Engineering illustration: dimensioned cross-section + shaded 3D solid.
// The visuals are schematic (not proportional to entered measurements).
function drawing(shape,store){
 const val=k=>parseText(store[k]);
 const radiusActive=shape===7&&Number.isFinite(val('r'))&&val('r')>0;
 const P='#6338dd', K='#bc2d99';
 const caption=(x,y,s,anchor='middle',size=19)=>`<text x="${x}" y="${y}" fill="#5129b7" font-family="inherit" font-size="${size}" font-weight="760" text-anchor="${anchor}" paint-order="stroke" stroke="#fdfbff" stroke-width="5" stroke-linejoin="round">${s}</text>`;
 const ext=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="#bda9e8" stroke-width="1.25"/>`;
 const arr=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${K}" stroke-width="1.9" fill="none" marker-start="url(#em-tip)" marker-end="url(#em-tip)"/>`;
 const hd=(x1,x2,y,label,sourceY=null)=>`${sourceY===null?'':ext(x1,sourceY,x1,y+6)+ext(x2,sourceY,x2,y+6)}${arr(x1,y,x2,y)}${caption((x1+x2)/2,y+26,label)}`;
 const vd=(x,y1,y2,label,sourceX=null)=>`${sourceX===null?'':ext(sourceX,y1,x-6,y1)+ext(sourceX,y2,x-6,y2)}${arr(x,y1,x,y2)}${caption(x-17,(y1+y2)/2+6,label,'end')}`;
 const arrowTo=(px,py,ax,ay,bx,by,label)=>`<path d="M${px} ${py}L${ax} ${ay}L${bx} ${by}" fill="none" stroke="${K}" stroke-width="2" marker-start="url(#em-tip)"/>${caption(bx+7,by-6,label,'start')}`;
 const roundArrow=(x,y,w,r,label)=>{if(!r)return '';const cx=x+w-r,cy=y+r,p=r/Math.SQRT2;return `<circle cx="${cx}" cy="${cy}" r="2" fill="#9b7bd6"/>${arrowTo(cx+p,cy-p,x+w+14,y-13,x+w+32,y-27,label)}`;};
 const face=`fill="url(#em-face)" stroke="${P}" stroke-width="2.8" stroke-linejoin="round"`;
 const dash=d=>`<path d="${d}" fill="none" stroke="#b8a0e7" stroke-width="1.3" stroke-dasharray="6 5"/>`;
 let section='';
 switch(shape){
 case 0:section=`<rect x="119" y="117" width="220" height="149" rx="2" ${face}/>${hd(119,339,313,'a',266)}${vd(91,117,266,'b',119)}`;break;
 case 1:section=`<rect x="149" y="100" width="174" height="174" rx="2" ${face}/>${hd(149,323,312,'a',274)}`;break;
 case 2:section=`<circle cx="229" cy="185" r="88" ${face}/>${dash('M129 185H329M229 85V285')}${hd(141,317,314,'D',273)}`;break;
 case 3:section=`<polygon points="129,267 333,267 229,102" ${face}/>${hd(129,333,314,'a',267)}${caption(148,183,'b')}${caption(311,183,'c')}`;break;
 case 4:{const cx=231,cy=185,r=94,points=Array.from({length:6},(_,i)=>{const th=Math.PI*i/3;return `${(cx+r*Math.cos(th)).toFixed(3)},${(cy+r*Math.sin(th)).toFixed(3)}`;}).join(' ');const rflat=r*Math.sqrt(3)/2;section=`<polygon points="${points}" ${face}/>${vd(112,cy-rflat,cy+rflat,'F',cx-r/2)}${caption(293,137,'a')}`;break;}
 case 5:section=`<circle cx="229" cy="185" r="88" ${face}/>${dash('M129 185H329M229 85V285')}${hd(141,317,314,'D',273)}`;break;
 case 6:section=`<circle cx="229" cy="187" r="89" ${face}/><circle cx="229" cy="187" r="54" fill="#fff" stroke="${P}" stroke-width="2.8"/>${dash('M130 187H328M229 88V285')}${hd(140,318,316,'D',276)}${arr(175,198,283,198)}${caption(229,185,'d')}${arr(283,157,318,157)}${caption(301,145,'t')}`;break;
 case 7:{
   const x=131,y=116,w=195,h=143,r=radiusActive?24:0,wall=22,ri=r?Math.max(0,r-wall):0;
   section=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${face}/><rect x="${x+wall}" y="${y+wall}" width="${w-2*wall}" height="${h-2*wall}" rx="${ri}" fill="#fff" stroke="${P}" stroke-width="2.8"/>${hd(x,x+w,313,'a',y+h)}${vd(97,y,y+h,'b',x)}${arr(x+w-wall,188,x+w,188)}${caption(x+w-wall/2,176,'t')}${roundArrow(x,y,w,r,'R')}`;break;
 }
 case 8:section=`<polygon points="136,272 136,109 335,272" ${face}/>${hd(136,335,316,'a',272)}${vd(107,109,272,'b',136)}<path d="M136 252h20v20" fill="none" stroke="${K}" stroke-width="2"/>`;break;
 }
 const pts=p=>p.map(x=>x.map(v=>+v.toFixed(2)).join(',')).join(' ');
 const xy=p=>`${p[0]} ${p[1]}`;
 const extrude=(vertices,dx,dy)=>{
    const b=vertices.map(([x,y])=>[x+dx,y+dy]);
    let output=`<polygon points="${pts(b)}" fill="#b3a6e7" stroke="#8265c7" stroke-width="2"/>`;
    for(let i=0;i<vertices.length;i++){
      const a=vertices[i],c=vertices[(i+1)%vertices.length],ab=b[i],cb=b[(i+1)%vertices.length];
      const cross=(c[0]-a[0])*dy-(c[1]-a[1])*dx;
      if(cross<0) output+=`<polygon points="${pts([a,c,cb,ab])}" fill="${c[1]===a[1]?'url(#em-top)':'url(#em-side)'}" stroke="#8265c7" stroke-width="1.6" stroke-linejoin="round"/>`;
    }
    return output+`<polygon points="${pts(vertices)}" fill="url(#em-face)" stroke="${P}" stroke-width="2.7" stroke-linejoin="round"/>`;
 };
 const depthDim=(startX,startY,dx,dy,label)=>{
   const a=[startX,startY],b=[startX+dx,startY+dy],ofs=[0,19];
   return ext(a[0],a[1],a[0]+ofs[0],a[1]+ofs[1])+ext(b[0],b[1],b[0]+ofs[0],b[1]+ofs[1])+arr(a[0]+ofs[0],a[1]+ofs[1],b[0]+ofs[0],b[1]+ofs[1])+caption((a[0]+b[0])/2-13,(a[1]+b[1])/2+37,label);
 };
 const thicknessCallout=(x,y,dx,dy)=>{const px=x+dx/2,py=y+dy/2;return arrowTo(px,py,px+24,py-23,px+32,py-34,'t');};
 const slantedCylinder=(length, hollow)=>{
  const fx=500,fy=206,rx=30,ry=64,dx=length?172:43,dy=length?-54:-29,bx=fx+dx,by=fy+dy;
  let d=`<ellipse cx="${bx}" cy="${by}" rx="${rx}" ry="${ry}" fill="#b7a8db" stroke="#846dba" stroke-width="2"/>`;
  d+=`<path d="M${fx} ${fy-ry}L${bx} ${by-ry}A${rx} ${ry} 0 0 1 ${bx} ${by+ry}L${fx} ${fy+ry}A${rx} ${ry} 0 0 0 ${fx} ${fy-ry}Z" fill="url(#em-cylinder)" stroke="#7f64ba" stroke-width="2.6"/>`;
  d+=`<path d="M${fx+3} ${fy-ry+16}L${bx+3} ${by-ry+16}" stroke="#fff" stroke-opacity=".8" stroke-width="4"/><path d="M${fx+6} ${fy+ry-15}L${bx+6} ${by+ry-15}" stroke="#6855b3" stroke-opacity=".3" stroke-width="4"/>`;
  d+=`<ellipse cx="${fx}" cy="${fy}" rx="${rx}" ry="${ry}" fill="url(#em-cap)" stroke="${P}" stroke-width="2.8"/>`;
  if(hollow){
    d+=`<ellipse cx="${fx}" cy="${fy}" rx="${rx*.59}" ry="${ry*.65}" fill="#7467b3" stroke="#6538bc" stroke-width="2.2"/>`;
    d+=`<path d="M${fx} ${fy-ry*.65}C${fx+16} ${fy-ry*.65} ${fx+16} ${fy+ry*.65} ${fx} ${fy+ry*.65}" fill="none" stroke="#f5edff" stroke-width="3" opacity=".85"/>`;
    d+=`<ellipse cx="${fx-3}" cy="${fy}" rx="${rx*.35}" ry="${ry*.46}" fill="#4c478f" opacity=".3"/>`;
  } else {
    d+=`<path d="M${fx-8} ${fy-ry+12}Q${fx-23} ${fy} ${fx-7} ${fy+ry-12}" fill="none" stroke="#fff" stroke-width="2.8" stroke-opacity=".65"/>`;
  }
  return d+(length?depthDim(fx+rx+8,fy+ry+10,dx,dy,'L'):thicknessCallout(fx+rx,fy-ry+9,dx,dy));
 };
 let solid='';
 switch(shape){
 case 0:solid=extrude([[476,156],[638,156],[638,252],[476,252]],31,-29)+thicknessCallout(638,160,31,-29);break;
 case 1:solid=extrude([[495,139],[638,139],[638,274],[495,274]],29,-29)+thicknessCallout(638,139,29,-29);break;
 case 2:solid=slantedCylinder(false,false);break;
 case 3:solid=extrude([[467,258],[646,258],[556,135]],32,-26)+thicknessCallout(646,258,32,-26);break;
 case 4:{const cx=559,cy=199,r=77,p=Array.from({length:6},(_,i)=>[cx+r*Math.cos(i*Math.PI/3),cy+r*Math.sin(i*Math.PI/3)]);solid=extrude(p,30,-27)+thicknessCallout(634,191,30,-27);break;}
 case 5:solid=slantedCylinder(true,false);break;
 case 6:solid=slantedCylinder(true,true);break;
 case 7: {
  const x=477,y=165,w=108,h=109,dx=139,dy=-60,r=radiusActive?13:2,ri=radiusActive?3:2;
  const o=(xx,yy,ww,hh,rr)=>`M${xx+rr} ${yy}H${xx+ww-rr}Q${xx+ww} ${yy} ${xx+ww} ${yy+rr}V${yy+hh-rr}Q${xx+ww} ${yy+hh} ${xx+ww-rr} ${yy+hh}H${xx+rr}Q${xx} ${yy+hh} ${xx} ${yy+hh-rr}V${yy+rr}Q${xx} ${yy} ${xx+rr} ${yy}Z`;
  solid=`<rect x="${x+dx}" y="${y+dy}" width="${w}" height="${h}" rx="${r}" fill="#aca0dc" stroke="#7a60c4" stroke-width="2"/>`;
  solid+=`<path d="M${x} ${y}L${x+dx} ${y+dy}H${x+w+dx}L${x+w} ${y}Z" fill="url(#em-top)" stroke="#8168c0" stroke-width="2"/>`;
  solid+=`<path d="M${x+w} ${y}L${x+w+dx} ${y+dy}V${y+h+dy}L${x+w} ${y+h}Z" fill="url(#em-side)" stroke="#8168c0" stroke-width="2"/>`;
  solid+=`<rect x="${x+15}" y="${y+16}" width="${w-30}" height="${h-32}" rx="${ri}" fill="#63579d"/>`;
  solid+=`<path d="M${x+15} ${y+16}L${x+15+dx*.34} ${y+16+dy*.34}H${x+w-15+dx*.34}L${x+w-15} ${y+16}Z" fill="#a89cdb" opacity=".8"/>`;
  solid+=`<path d="${o(x,y,w,h,r)} ${o(x+15,y+16,w-30,h-32,ri)}" fill="url(#em-face)" fill-rule="evenodd" stroke="${P}" stroke-width="2.3"/>`;
  solid+=`<rect x="${x+15}" y="${y+16}" width="${w-30}" height="${h-32}" rx="${ri}" fill="none" stroke="#6439be" stroke-width="2.8"/>`;
  solid+=depthDim(x+w+7,y+h+12,dx,dy,'L');break;
 }
 case 8:solid=extrude([[474,273],[474,132],[647,273]],32,-26)+thicknessCallout(647,273,32,-26);break;
 }
 const defs=`<defs>
 <linearGradient id="em-face" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0eaff"/><stop offset=".49" stop-color="#c4b8f5"/><stop offset="1" stop-color="#aa94e0"/></linearGradient>
 <linearGradient id="em-top" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#c0aee8"/></linearGradient>
 <linearGradient id="em-side" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#9f8acb"/><stop offset="1" stop-color="#6b5cae"/></linearGradient>
 <linearGradient id="em-cylinder" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f8f4ff"/><stop offset=".27" stop-color="#cbd6f7"/><stop offset=".55" stop-color="#807dbb"/><stop offset=".85" stop-color="#b0ace0"/><stop offset="1" stop-color="#7468b8"/></linearGradient>
 <radialGradient id="em-cap" cx="35%" cy="28%" r="80%"><stop stop-color="#fff"/><stop offset=".55" stop-color="#e2ddfc"/><stop offset="1" stop-color="#9988cf"/></radialGradient>
 <marker id="em-tip" markerUnits="userSpaceOnUse" viewBox="0 0 10 10" markerWidth="8" markerHeight="8" refX="8" refY="5" orient="auto-start-reverse"><path d="M0 1 L8 5 L0 9 Z" fill="${K}"/></marker></defs>`;
 const wideSvg=`<svg viewBox="0 0 820 385" role="img" aria-label="${escaped(MASS_NAMES[shape])}: mat cat 2D va hinh khoi 3D" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">${defs}
 <text x="218" y="39" text-anchor="middle" fill="#4a289f" font-size="19" font-weight="800">M&#7862;T C&#7854;T 2D</text>
 <text x="605" y="39" text-anchor="middle" fill="#4a289f" font-size="19" font-weight="800">H&#204;NH KH&#7888;I 3D</text>
 <path d="M401 60V330" stroke="#d5c9ef" stroke-width="1.5" stroke-dasharray="7 7"/>${section}${solid}
 </svg>`;
 const scopeIds=(xml,key)=>xml.replaceAll('id="em-',`id="em-${key}-`).replaceAll('url(#em-',`url(#em-${key}-`);
 const mobileFace=`<svg viewBox="58 34 326 308" role="img" aria-label="Mat cat 2D" xmlns="http://www.w3.org/2000/svg">${scopeIds(defs+section,'face')}</svg>`;
 const mobileSolid=`<svg viewBox="412 39 377 299" role="img" aria-label="Hinh khoi 3D" xmlns="http://www.w3.org/2000/svg">${scopeIds(defs+solid,'solid')}</svg>`;
 return `<div class="em-view-wide">${wideSvg}</div><div class="em-view-mobile"><div class="em-mobile-sketch"><strong>M&#7862;T C&#7854;T 2D</strong>${mobileFace}</div><div class="em-mobile-sketch"><strong>H&#204;NH KH&#7888;I 3D</strong>${mobileSolid}</div></div>`;
}
const MASS_STYLE=`<style>
.em-root{font-size:16px;color:#142578;--em-p:#6e2fea;--em-muted:#6776a3}.em-root *{box-sizing:border-box}.em-title{margin:0;color:#6926ce;font-size:25px;font-weight:850}.em-subtitle{font-size:16px;color:var(--em-muted);margin:1px 0 13px}
.em-card{background:#fff;border:1px solid #e3d7fa;border-radius:17px;padding:15px 17px;min-width:0}.em-header-controls{display:grid;grid-template-columns:1fr 1fr;gap:13px;position:relative;margin-bottom:12px}.em-control{display:flex;flex-direction:column;gap:5px;min-width:0;font-weight:760;color:#5028b4}.em-control label{font-size:16px}.em-control select{width:100%;height:45px;border-radius:11px;border:1px solid #d8c6fc;padding:8px 12px;background:#fff;color:#4821ac;font-size:17px;font-weight:730}
.em-topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap}.em-topbar h3{margin:0;color:#5421b7;font-size:19px;font-weight:830}.em-reset{border:1px solid #d9ccff;border-radius:10px;background:#f2edff;color:#6130d2;font-size:16px;font-weight:770;padding:8px 12px;min-height:39px}
.em-panels{display:grid;grid-template-columns:minmax(0,.96fr) minmax(0,1.04fr);gap:13px}.em-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 11px;align-content:start}.em-field{min-width:0}.em-field-label{display:block;font-size:16px;font-weight:760;color:#192884;margin-bottom:5px}.em-inputbox{display:flex;align-items:center;overflow:hidden;height:44px;border:1px solid #dcc6ff;border-radius:11px;background:#fff}.em-inputbox:focus-within{border-color:#7c4bea;box-shadow:0 0 0 3px #7c4bea1a}.em-inputbox input{width:100%;flex:1;min-width:0;height:100%;font-size:17px;border:0;background:transparent;outline:none;padding:6px 11px;color:#17257e}.em-inputbox .em-unit{font-size:16px;color:#6936db;font-weight:720;padding:0 9px;white-space:nowrap}.em-separator{height:1px;background:#ebe6fa;margin:17px 0}
.em-refs{min-height:44px;border:1px solid #e1d4ff;border-radius:11px;background:#f8f3ff;display:flex;align-items:center;justify-content:space-between;padding:6px 9px;gap:7px}.em-refs output{color:#5b26c6;font-weight:750;font-size:16px}.em-refs button{border:0;background:#e5daff;color:#5c2dc5;border-radius:8px;padding:6px 8px;font-size:16px;font-weight:700}
.em-visual-heading{color:#5421b7;font-size:19px;font-weight:830;margin:0}.em-drawing{margin-top:10px;min-height:280px;border:1px solid #e5dcfa;border-radius:14px;background:linear-gradient(120deg,#fffaff,#f8f6ff);display:flex;align-items:center;justify-content:center;overflow:hidden}.em-drawing svg{width:100%;height:auto;max-height:350px;display:block}.em-view-wide{width:100%}.em-view-mobile{display:none}.em-diagram-note{font-size:16px;color:#7280a4;text-align:center;margin:9px 0 0}.em-formula{font-size:16px;color:#5e3abe;background:#f4eeff;border-radius:11px;padding:10px 12px;margin:13px 0 0;font-weight:710}.em-status{font-size:16px;margin:13px 0 0;min-height:44px;padding:10px 11px;border-radius:11px;background:#f4efff;color:#6127c7;font-weight:710}.em-status[data-error="true"]{background:#fff2ee;border:1px solid #efccbd;color:#a03930}
.em-results{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:12px}.em-result{min-width:0;min-height:102px;text-align:left;display:flex;flex-direction:column;gap:5px;border-radius:14px;padding:14px;border:1px solid #ded3ff;color:#452397;background:#fff}.em-result span{font-size:16px;font-weight:780}.em-result output{font-size:clamp(18px,1.7vw,23px);color:#162177;font-weight:860;overflow-wrap:anywhere}.em-result .em-kpi-unit{font-size:16px;font-weight:790;color:#6430d4}.em-result.em-primary{background:linear-gradient(120deg,#ac48fa,#722eeb);color:white}.em-result.em-primary output,.em-result.em-primary .em-kpi-unit{color:white}.em-foot{margin:9px 0 0;color:#697ba7;font-size:16px}
@media(max-width:900px){.em-panels{grid-template-columns:1fr}.em-results{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:540px){.em-view-wide{display:none!important}.em-view-mobile{display:grid!important;width:100%;gap:8px;padding:9px}.em-mobile-sketch{border:1px solid #e6dcff;border-radius:11px;background:#fff;padding:8px 3px;min-width:0}.em-mobile-sketch strong{display:block;text-align:center;font-size:16px;color:#5130ae}.em-mobile-sketch svg{width:100%;max-height:none;height:auto}.em-header-controls{grid-template-columns:1fr}.em-card{padding:13px}.em-fields{grid-template-columns:1fr}.em-results .em-result{min-height:86px;padding:11px}.em-results .em-result output{font-size:19px}.em-drawing{min-height:160px}}

/* Portable desktop density: same 9 shapes, 44 material choices, inputs, 2D + 3D and equations. */
@media (min-width: 1040px) and (max-height: 900px) {
.em-root .em-title{font-size:23px;line-height:1.2}
.em-root .em-subtitle{margin:1px 0 7px;line-height:1.25}
.em-root .em-card{padding:10px 12px;border-radius:12px}
.em-root .em-card[style*="margin-bottom"]{margin-bottom:8px!important}
.em-root .em-topbar{margin-bottom:6px;gap:9px}
.em-root .em-reset{min-height:32px;padding:4px 9px}
.em-root .em-header-controls{gap:9px;margin-bottom:0}
.em-root .em-control{gap:3px}
.em-root .em-control select{height:37px;padding:4px 9px;font-size:16px}
.em-root .em-panels{gap:9px}
.em-root .em-fields{gap:8px 9px}
.em-root .em-field-label{margin-bottom:2px}
.em-root .em-inputbox{height:37px;border-radius:9px}
.em-root .em-inputbox input{padding:5px 9px;font-size:16px}
.em-root .em-separator{margin:9px 0}
.em-root .em-refs{min-height:37px;padding:3px 6px}
.em-root .em-refs button{padding:3px 6px}
.em-root .em-drawing{margin-top:7px;min-height:205px;border-radius:11px}
.em-root .em-drawing svg{max-height:242px}
.em-root .em-diagram-note{margin:4px 0 0}
.em-root .em-status{margin-top:8px;min-height:34px;padding:6px 9px;line-height:1.3}
.em-root .em-formula{margin-top:7px;padding:6px 9px;line-height:1.3}
.em-root .em-results{gap:8px;margin-top:8px}
.em-root .em-result{min-height:66px;padding:8px 10px;gap:1px;border-radius:10px}
.em-root .em-result output{font-size:19px}
.em-root .em-foot{margin-top:5px;line-height:1.25}
}
</style>`;
export async function mount(root, ctx){
 root.innerHTML=MASS_STYLE+`<section class="em-root"><h2 class="em-title">Tính khối lượng vật thể</h2><p class="em-subtitle">9 hình dạng · 44 vật liệu · Chỉnh khối lượng riêng</p>
  <section class="em-card" style="margin-bottom:12px"><div class="em-topbar"><strong>HÌNH DẠNG VẬT THỂ & VẬT LIỆU</strong><button class="em-reset" id="em-reset" type="button">↻ Khôi phục ρ</button></div><div class="em-header-controls"><div class="em-control"><label for="em-shape">HÌNH DẠNG VẬT THỂ</label><select id="em-shape">${MASS_NAMES.map((s,i)=>`<option value="${i}">${escaped(s)}</option>`).join('')}</select></div><div class="em-control"><label for="em-material">VẬT LIỆU</label><select id="em-material"><option value="0">Thép</option></select></div></div></section>
  <div class="em-panels"><section class="em-card"><div class="em-topbar"><h3>KÍCH THƯỚC VÀ SỐ LƯỢNG</h3></div><div class="em-fields" id="em-fields"></div><div class="em-separator"></div><div class="em-fields" id="em-common">${[['density','Khối lượng riêng ρ','kg/m³'],['qty','Số lượng','pcs']].map(([k,label,unit])=>`<label class="em-field"><span class="em-field-label">${label}</span><span class="em-inputbox"><input type="text" name="${k}" maxlength="45" autocomplete="off" inputmode="decimal" aria-label="${label}"/><span class="em-unit">${unit}</span></span></label>`).join('')}</div><p class="em-status" id="em-status" role="status" aria-live="polite"></p><p class="em-formula" id="em-formula"></p></section>
  <section class="em-card"><h3 class="em-visual-heading">BẢN VẼ MẶT CẮT VÀ HÌNH KHỐI 3D</h3><div class="em-drawing" id="em-drawing"></div><p class="em-diagram-note">Mặt cắt 2D / Hình khối 3D (không theo tỷ lệ)</p></section></div>
  <div class="em-results" id="em-results">${[['Mặt cắt','mm²'],['Thể tích / chi tiết','cm³'],['Kg / chi tiết','kg'],['Tổng (kg)','kg']].map(([title,unit],i)=>`<button type="button" data-copy="${i}" class="em-result ${i===3?'em-primary':''}" title="Nhấn để sao chép kết quả"><span>${title}</span><output>—</output><span class="em-kpi-unit">${unit}</span></button>`).join('')}</div>
  <p class="em-foot">Kích thước tính bằng mm, khối lượng riêng theo kg/m³. Giá trị vật liệu chỉ để tham khảo; có thể sửa ρ theo vật liệu thực tế.</p>
 </section>`;
 const wrap=root.querySelector('.em-root'),fields=wrap.querySelector('#em-fields'),shape=wrap.querySelector('#em-shape'),material=wrap.querySelector('#em-material'),status=wrap.querySelector('#em-status'),outputs=[...wrap.querySelectorAll('.em-result output')],rho=wrap.querySelector('[name=density]'),quantity=wrap.querySelector('[name=qty]');
 let catalog=[],results=[],materialError='';
 const current=()=>massSession.values[massSession.shape];
 const toast=s=>typeof ctx.showToast==='function'&&ctx.showToast(s);
 function parseGeometry(){const p={};for(const [key] of MASS_FIELDS[massSession.shape]){const n=parseText(current()[key]);if(n!==null){if(!Number.isFinite(n))throw Error(`Giá trị ${key} không hợp lệ`);p[key]=n;}}return p;}
 function evaluate(){
  let message='',err=false;
  try{const dens=parseText(massSession.density),qty=parseText(massSession.qty);if(dens===null||qty===null)throw Error('Nhập khối lượng riêng và số lượng hợp lệ');
   const result=calculateMassPortable(massSession.shape,parseGeometry(),dens,qty);results=[result.areaMM2,result.volumeMM3/1000,result.unitKG,result.totalKG];outputs.forEach((el,i)=>el.textContent=formatResult(results[i]));message=materialError||'Công thức và kết quả cập nhật tức thời.';}
  catch(e){results=[];outputs.forEach(el=>el.textContent='—');message=e.message==='Kích thước không hợp lệ hoặc không đủ dữ liệu'?'Nhập đầy đủ kích thước để tính khối lượng':`⚠ ${e.message}`;err=!message.startsWith('Nhập');}
  status.textContent=message;status.dataset.error=String(err);
  wrap.querySelector('#em-formula').textContent='Công thức: '+MASS_FORMULAS[massSession.shape];
  wrap.querySelector('#em-drawing').innerHTML=drawing(massSession.shape,current());
 }
 function renderFields(focus=''){
  fields.innerHTML=MASS_FIELDS[massSession.shape].map(([key,label])=>{
   const alt=massSession.shape===4?hexReference(key,current()):null;
   if(alt)return `<div class="em-field"><span class="em-field-label">${escaped(label)}</span><div class="em-refs"><output>${alt.value===null?'—':escaped(formatInput(alt.value))} mm</output><button type="button" data-switch="${key}">Đổi nhập</button></div></div>`;
   return `<label class="em-field"><span class="em-field-label">${escaped(label)}</span><span class="em-inputbox"><input type="text" name="${key}" maxlength="45" inputmode="decimal" autocomplete="off" value="${escaped(current()[key]??'')}" aria-label="${escaped(label)}"><span class="em-unit">mm</span></span></label>`;
  }).join('');
  if(focus){const el=fields.querySelector(`input[name="${focus}"]`);if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}}
 }
 shape.addEventListener('change',()=>{massSession.shape=Number(shape.value);renderFields();evaluate();},{signal:ctx.signal});
 fields.addEventListener('input',ev=>{const e=ev.target;if(!e.matches('input[name]'))return;current()[e.name]=e.value;if(massSession.shape===4&&(e.name==='f'||e.name==='a')){if(String(e.value).trim())current()[e.name==='a'?'f':'a']='';renderFields(e.name);}evaluate();},{signal:ctx.signal});
 fields.addEventListener('click',ev=>{const b=ev.target.closest('[data-switch]');if(!b)return;const alt=hexReference(b.dataset.switch,current());if(!alt)return;current()[alt.source]='';current()[b.dataset.switch]=alt.value===null?'':formatInput(alt.value);renderFields(b.dataset.switch);evaluate();},{signal:ctx.signal});
 rho.value=massSession.density;quantity.value=massSession.qty;
 wrap.querySelector('#em-common').addEventListener('input',ev=>{if(ev.target===rho)massSession.density=rho.value;if(ev.target===quantity)massSession.qty=quantity.value;evaluate();},{signal:ctx.signal});
 material.addEventListener('change',()=>{massSession.material=Number(material.value);const selected=catalog[massSession.material];if(selected){massSession.density=String(selected.density);rho.value=massSession.density;}evaluate();},{signal:ctx.signal});
 wrap.querySelector('#em-reset').addEventListener('click',()=>{const selected=catalog[massSession.material]||{density:7850};rho.value=massSession.density=String(selected.density);evaluate();toast('Đã khôi phục khối lượng riêng ρ.');},{signal:ctx.signal});
 wrap.querySelector('#em-results').addEventListener('click',async ev=>{const b=ev.target.closest('[data-copy]');if(!b||results.length!==4)return;try{await navigator.clipboard.writeText(formatResult(results[Number(b.dataset.copy)]));toast('Đã sao chép kết quả khối lượng.');}catch{toast('Không sao chép được kết quả.');}},{signal:ctx.signal});
 shape.value=String(massSession.shape);renderFields();evaluate();
 try{const res=await fetch('./assets/data/materials.json',{signal:ctx.signal,cache:'no-cache'});if(!res.ok)throw Error('HTTP '+res.status);const json=await res.json();if(!Array.isArray(json)||json.length!==44||!json.every(materialSafe))throw Error('Danh mục 44 vật liệu không đầy đủ');
  if(ctx.signal.aborted)return;
  catalog=json;material.innerHTML=catalog.map((x,i)=>`<option value="${i}">${escaped(x.name)}</option>`).join('');material.value=String(massSession.material);evaluate();
 }catch(e){if(ctx.signal.aborted)return;material.innerHTML='<option value="-1">Tùy chỉnh ρ thủ công</option>';massSession.material=-1;materialError='Không tải được danh mục 44 vật liệu. Vẫn có thể nhập ρ thủ công.';evaluate();}
}
