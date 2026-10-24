/** Epsilon Soft - Khối lượng riêng; reads the ONE shared materials.json. */
const {icon,normalize,number,setText,downloadBlob}=globalThis.EpsilonSoftShared||{};
const lookupMaterials=()=>{
 const loader=globalThis.EpsilonSoftShared?.loadMaterialsCatalog;
 if(typeof loader==='function')return loader();
 return fetch(new URL('./assets/data/materials.json',document.baseURI),{cache:'no-cache'}).then(r=>{
  if(!r.ok)throw Error('HTTP '+r.status);return r.json();
 });
};
export async function mount(root,ctx){
 root.innerHTML=`<style>
 .density-sticky-table { border-collapse: separate; border-spacing: 0; }
 .density-sticky-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f3f5ff;
  box-shadow: inset 0 -1px 0 #d6e0f8;
 }
</style><section class="tool-box"><h2 class="tool-box-heading">${icon('database')} Khối lượng riêng của vật liệu</h2>
 <p class="box-lead">Danh mục tham khảo thống nhất cho <strong>Khối lượng vật liệu</strong> và <strong>Trải phôi 2D</strong>. Đơn vị: kg/m³. Giá trị có thể thay đổi theo mác, độ ẩm, trạng thái và nhiệt độ.</p>
 <div class="form-grid"><label class="form-field"><span>Tìm kiếm vật liệu (Việt / Anh)</span><input type="search" id="mat-search" placeholder="Thép, inox, nhựa, đồng..." maxlength="100"></label>
 <div class="form-field"><span>Xuất dữ liệu tham khảo</span><button class="button button-outline" id="mat-download" type="button" disabled>${icon('download')} Tải CSV</button></div></div>
 <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:12px 0"><p class="mini-kpi" id="mat-count" style="margin:0" role="status" aria-live="polite">Đang tải dữ liệu…</p><button class="button button-outline" id="mat-retry" type="button" hidden>Tải lại danh mục</button></div>
 <div class="data-table-scroll"><table class="demo-table density-sticky-table"><thead><tr><th>STT</th><th>Vật liệu</th><th>Tên tiếng Anh</th><th>Khối lượng riêng (kg/m³)</th></tr></thead><tbody id="mat-rows"></tbody></table></div>
 <div class="callout" style="margin-top:12px">20 vật liệu đầu là dữ liệu gốc Portable; các vật liệu bổ sung là giá trị tham khảo. Khi tính toán kỹ thuật quan trọng, hãy đối chiếu thông số của đúng mác vật liệu.</div></section>`;
 let data=[];
 const search=root.querySelector('#mat-search'),retry=root.querySelector('#mat-retry'),download=root.querySelector('#mat-download');
 const rows=root.querySelector('#mat-rows'),count=root.querySelector('#mat-count');
 const csvSafe=s=>{const v=String(s??'');return '"'+(/^[\s]*[=+@-]/.test(v)?"'":"")+v.replaceAll('"','""')+'"';};
 function render(){
  const q=normalize(search.value);
  const visible=data.map((row,index)=>({...row,index:index+1})).filter(row=>!q||normalize(row.name+' '+row.en).includes(q));
  const fragment=document.createDocumentFragment();
  for(const d of visible){const tr=document.createElement('tr');for(const v of [d.index,d.name,d.en,number(d.density,0)]){const td=document.createElement('td');td.textContent=String(v);tr.append(td);}fragment.append(tr);}
  rows.replaceChildren(fragment);
  setText(root,'#mat-count',`${visible.length} / ${data.length} vật liệu`);
 }
 async function populate(){
  retry.hidden=true;download.disabled=true;count.textContent='Đang tải danh mục vật liệu…';
  try{
   const result=await lookupMaterials();
   if(ctx.signal.aborted)return;
   if(!Array.isArray(result)||result.length<4||!result.every(r=>r&&typeof r.name==='string'&&typeof r.en==='string'&&Number.isFinite(r.density)&&r.density>0))throw Error('Dữ liệu vật liệu không hợp lệ.');
   data=result;download.disabled=false;render();
  }catch(error){
   if(ctx.signal.aborted)return;
   data=[];rows.replaceChildren();count.textContent='Không tải được assets/data/materials.json.';retry.hidden=false;
   console.warn('Epsilon Soft Density Lookup:',error);
  }
 }
 search.addEventListener('input',render,{signal:ctx.signal});
 retry.addEventListener('click',()=>void populate(),{signal:ctx.signal});
 download.addEventListener('click',()=>{
  if(!data.length)return;
  const csv='\uFEFFSTT;Vật liệu;Tên tiếng Anh;Khối lượng riêng (kg/m3)\n'+data.map((row,i)=>[i+1,csvSafe(row.name),csvSafe(row.en),row.density].join(';')).join('\n');
  downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),'epsilon-soft-khoi-luong-rieng.csv');ctx.showToast?.('Đã tạo bảng khối lượng riêng (CSV).');
 },{signal:ctx.signal});
 void populate();
}
