const {icon, setText} = globalThis.EpsilonSoftShared || {};

/** Port of core/lunar.go (ES TOOLKIT V1.0): Vietnamese lunar calendar, GMT+7; 1900–2100. */
const rad=d=>d*Math.PI/180;
function jdn(d,m,y){const a=Math.floor((14-m)/12),yy=y+4800-a,mm=m+12*a-3;let j=d+Math.floor((153*mm+2)/5)+365*yy+Math.floor(yy/4)-Math.floor(yy/100)+Math.floor(yy/400)-32045;if(j<2299161)j=d+Math.floor((153*mm+2)/5)+365*yy+Math.floor(yy/4)-32083;return j;}
function newMoon(k){const t=k/1236.85,t2=t*t,t3=t2*t;
 let jd1=2415020.75933+29.53058868*k+.0001178*t2-.000000155*t3;
 jd1+=.00033*Math.sin(rad(166.56+132.87*t-.009173*t2));
 const m=359.2242+29.10535608*k-.0000333*t2-.00000347*t3,mp=306.0253+385.81691806*k+.0107306*t2+.00001236*t3,f=21.2964+390.67050646*k-.0016528*t2-.00000239*t3;
 let c=(.1734-.000393*t)*Math.sin(rad(m))+.0021*Math.sin(rad(2*m));
 c-=.4068*Math.sin(rad(mp));c+=.0161*Math.sin(rad(2*mp));c-=.0004*Math.sin(rad(3*mp));c+=.0104*Math.sin(rad(2*f))-.0051*Math.sin(rad(m+mp))-.0074*Math.sin(rad(m-mp));c+=.0004*Math.sin(rad(2*f+m))-.0004*Math.sin(rad(2*f-m));c-=.0006*Math.sin(rad(2*f+mp));c+=.0010*Math.sin(rad(2*f-mp));c+=.0005*Math.sin(rad(2*mp+m));
 const dt=t< -11?.001+.000839*t+.0002261*t2-.00000845*t3-.000000081*t*t3:-.000278+.000265*t+.000262*t2;
 return Math.floor(jd1+c-dt+.5+7/24);
}
function sunSector(j){const t=(j-.5-7/24-2451545)/36525,t2=t*t,m=357.52910+35999.05030*t-.0001559*t2-.00000048*t2*t,l0=280.46645+36000.76983*t+.0003032*t2;let dl=(1.914600-.004817*t-.000014*t2)*Math.sin(rad(m));dl+=(.019993-.000101*t)*Math.sin(rad(2*m))+.000290*Math.sin(rad(3*m));const longitude=(rad(l0+dl)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);return Math.floor(longitude/Math.PI*6);}
function month11(year){const off=jdn(31,12,year)-2415021,k=Math.floor(off/29.530588853);let nm=newMoon(k);if(sunSector(nm)>=9)nm=newMoon(k-1);return nm;}
function leapOffset(a11){const k=Math.floor(.5+(a11-2415021.076998695)/29.530588853);let last=0,i=1,arc=sunSector(newMoon(k+i));do{last=arc;i++;arc=sunSector(newMoon(k+i));}while(arc!==last&&i<14);return i-1;}
export function solarToLunar(d,m,y){
 if(!Number.isInteger(y)||y<1900||y>2100||!Number.isInteger(m)||m<1||m>12||!Number.isInteger(d)||d<1||d>31)return null;
 const dt=new Date(Date.UTC(y,m-1,d));if(dt.getUTCFullYear()!==y||dt.getUTCMonth()+1!==m||dt.getUTCDate()!==d)return null;
 const jd=jdn(d,m,y),k=Math.floor((jd-2415021.076998695)/29.530588853);let ms=newMoon(k+1);if(ms>jd)ms=newMoon(k);
 let a11=month11(y),b11=a11,ly=y;if(a11>=ms){ly=y;a11=month11(y-1);}else{ly=y+1;b11=month11(y+1);}
 const day=jd-ms+1,diff=Math.floor((ms-a11)/29);let lm=diff+11,leap=false;
 if(b11-a11>365){const leapMonthDiff=leapOffset(a11);if(diff>=leapMonthDiff){lm=diff+10;if(diff===leapMonthDiff)leap=true;}}
 if(lm>12)lm-=12;if(lm>=11&&diff<4)ly--;
 if(day<1||day>30||lm<1||lm>12)return null;
 return {day,month:lm,year:ly,leap};
}
export function mount(root,ctx){
 const today=new Date(),selected={day:today.getDate(),month:today.getMonth()+1,year:today.getFullYear()};let month=selected.month,year=selected.year;
 root.innerHTML=`<div class="tool-grid-2"><section class="tool-box"><h2 class="tool-box-heading">${icon('calendar')} Tra cứu ngày Dương – Âm</h2><label class="form-field"><span>Chọn ngày dương lịch</span><input type="date" id="cal-date" min="1900-01-01" max="2100-12-31"></label><div class="separator"></div><div class="result-tile purple"><strong>Ngày âm lịch Việt Nam (GMT+7)</strong><output id="lunar-date">—</output><p class="tool-hint" id="lunar-description"></p></div><div class="callout" style="margin-top:15px">${icon('info')} Thuật toán thiên văn tham khảo theo múi giờ Việt Nam GMT+7, khoảng năm 1900–2100. Không dùng như chứng nhận lịch pháp hoặc thủ tục pháp lý.</div></section><section class="tool-box"><div class="calendar-toolbar"><button class="button button-plain button-sm" id="cal-prev" type="button" aria-label="Tháng trước">‹</button><h2 class="tool-box-heading" id="cal-month-label">Tháng</h2><button class="button button-plain button-sm" id="cal-next" type="button" aria-label="Tháng sau">›</button></div><div id="calendar-days" class="cal-month"></div></section></div>`;
 const picker=root.querySelector('#cal-date');
 function iso(){return `${selected.year}-${String(selected.month).padStart(2,'0')}-${String(selected.day).padStart(2,'0')}`;}
 function updateSelected(){picker.value=iso();const lunar=solarToLunar(selected.day,selected.month,selected.year);setText(root,'#lunar-date',lunar?`${lunar.day}/${lunar.month}/${lunar.year}`:'—');setText(root,'#lunar-description',lunar?`Ngày ${lunar.day} tháng ${lunar.month}${lunar.leap?' nhuận':''} năm ${lunar.year} (Âm lịch)`:'Ngày ngoài khoảng hỗ trợ.');}
 function render(){setText(root,'#cal-month-label',`Tháng ${month} / ${year}`);const out=root.querySelector('#calendar-days');const frag=document.createDocumentFragment();for(const label of ['T2','T3','T4','T5','T6','T7','CN']){const h=document.createElement('span');h.className='cal-dow';h.textContent=label;frag.append(h);}const first=new Date(year,month-1,1);const offset=(first.getDay()+6)%7;const count=new Date(year,month,0).getDate();for(let cell=0;cell<Math.ceil((offset+count)/7)*7;cell++){
  const day=cell-offset+1,valid=day>=1&&day<=count;const btn=document.createElement('button');btn.type='button';btn.className='cal-cell';if(!valid){btn.disabled=true;btn.classList.add('is-other');frag.append(btn);continue;}
  const lunar=solarToLunar(day,month,year);btn.dataset.day=String(day);if(selected.day===day&&selected.month===month&&selected.year===year)btn.classList.add('is-selected');if(today.getDate()===day&&today.getMonth()+1===month&&today.getFullYear()===year)btn.classList.add('is-today');btn.setAttribute('aria-label',`Ngày ${day}/${month}/${year}, âm lịch ${lunar?`${lunar.day}/${lunar.month}`:'không rõ'}`);
  const num=document.createElement('span');num.className='day-solar';num.textContent=String(day);const sub=document.createElement('span');sub.className='day-lunar';sub.textContent=lunar?`${lunar.day}/${lunar.month}`:'';btn.append(num,sub);frag.append(btn);
 }out.replaceChildren(frag);}
 picker.addEventListener('change',()=>{const [yy,mm,dd]=picker.value.split('-').map(Number);if(!solarToLunar(dd,mm,yy))return;Object.assign(selected,{day:dd,month:mm,year:yy});month=mm;year=yy;updateSelected();render();},{signal:ctx.signal});
 root.querySelector('#calendar-days').addEventListener('click',event=>{const b=event.target.closest('[data-day]');if(!b)return;Object.assign(selected,{day:Number(b.dataset.day),month,year});updateSelected();render();},{signal:ctx.signal});
 function move(dir){let y=year,m=month+dir;if(m<1){m=12;y--;}else if(m>12){m=1;y++;}if(y<1900||y>2100)return;year=y;month=m;render();}
 root.querySelector('#cal-prev').addEventListener('click',()=>move(-1),{signal:ctx.signal});root.querySelector('#cal-next').addEventListener('click',()=>move(1),{signal:ctx.signal});updateSelected();render();
}
