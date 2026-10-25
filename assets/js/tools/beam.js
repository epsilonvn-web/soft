const {beamCalc} = globalThis.EpsilonSoftShared || {};

const {field, number, numeric, icon, setText} = globalThis.EpsilonSoftShared || {};

const BEAM_EDITION_STYLE = `
.es-beam-editions,.es-beam-editions *{box-sizing:border-box}
.es-beam-editions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin:0 0 14px;font-family:inherit}
.es-beam-edition{position:relative;min-width:0;overflow:hidden;border:1px solid #d7e3fc;border-radius:15px;padding:15px 17px 14px;background:linear-gradient(130deg,#f4f8ff 0%,#ffffff 100%);box-shadow:0 3px 12px rgba(25,50,118,.045)}
.es-beam-edition--pro{background:linear-gradient(128deg,#fffcf4 0%,#f7f2ff 100%);border-color:#e6daf5}
.es-beam-edition-heading{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px}
.es-beam-edition-badge{display:inline-flex;align-items:center;gap:6px;border-radius:99px;padding:5px 10px;background:#e1edff;border:1px solid #cbdcfa;color:#1743a8;font-weight:850;letter-spacing:.03em;font-size:11px;line-height:1.25}
.es-beam-edition-badge--pro{background:#efe6ff;border-color:#ddcdfa;color:#6132b8}
.es-beam-edition-state{border-radius:99px;background:#fff2db;color:#8a5507;border:1px solid #f1d9a8;padding:4px 8px;font-size:11px;font-weight:800;line-height:1.25}
.es-beam-edition-title{font-size:18px;font-weight:850;color:#17388c;line-height:1.32;margin:0 0 6px}
.es-beam-edition--pro .es-beam-edition-title{color:#5530a9}
.es-beam-edition-intro{font-size:14px;line-height:1.55;color:#526589;margin:0 0 10px}
.es-beam-edition-points{display:flex;align-items:flex-start;flex-wrap:wrap;gap:6px}
.es-beam-edition-points span{display:inline-flex;align-items:center;gap:5px;background:#eaf2ff;color:#254695;padding:6px 8px;border-radius:8px;font-size:13px;font-weight:700;line-height:1.35}
.es-beam-edition--pro .es-beam-edition-points span{background:#f0e9ff;color:#6140a0}
.es-beam-edition-symbol{color:#07886e;font-weight:900;font-size:14px}
.es-beam-edition--pro .es-beam-edition-symbol{color:#97661a}
.es-beam-pro-more{border-top:1px solid #e8ddf7;margin-top:11px;padding-top:8px;color:#514374}
.es-beam-pro-more summary{cursor:pointer;font-size:14px;font-weight:800;line-height:1.4;color:#5b36af;padding:5px 2px;border-radius:5px}
.es-beam-pro-more summary:focus-visible{outline:3px solid #bba4fa;outline-offset:1px}
.es-beam-pro-more ul{padding:0 0 0 20px;margin:7px 0 6px;line-height:1.6;font-size:13px;color:#47577c}
.es-beam-pro-more li+li{margin-top:5px}
.es-beam-pro-more strong{color:#4c3290}
.es-beam-disclaimer{font-size:12px;color:#735c83;line-height:1.55;margin:8px 0 0}
@media(max-width:880px){.es-beam-editions{grid-template-columns:1fr}}
@media(max-width:520px){.es-beam-edition{padding:12px 13px}.es-beam-edition-title{font-size:16px}.es-beam-edition-intro{font-size:13px}.es-beam-edition-points span{font-size:12px}.es-beam-pro-more summary{font-size:13px}}
`;

export function mount(root,ctx){
 root.innerHTML=`<style>${BEAM_EDITION_STYLE}</style>
 <section class="es-beam-editions" aria-label="Phạm vi Beam Basic và định hướng Beam Pro">
  <article class="es-beam-edition es-beam-edition--basic">
   <div class="es-beam-edition-heading"><span class="es-beam-edition-badge">EPSILON SOFT · BASIC MIỄN PHÍ</span></div>
   <h2 class="es-beam-edition-title">Tính nhanh dầm hai gối tựa</h2>
   <p class="es-beam-edition-intro">Phân tích sơ bộ dầm thẳng, tiết diện không đổi trong miền đàn hồi tuyến tính, với <strong>một trong hai</strong> trường hợp tải đơn giản.</p>
   <div class="es-beam-edition-points">
    <span><b class="es-beam-edition-symbol">✓</b> Tải đều toàn nhịp / lực giữa nhịp</span>
    <span><b class="es-beam-edition-symbol">✓</b> Mô men &amp; lực cắt lớn nhất</span>
    <span><b class="es-beam-edition-symbol">✓</b> Độ võng lớn nhất</span>
   </div>
  </article>
  <article class="es-beam-edition es-beam-edition--pro">
   <div class="es-beam-edition-heading"><span class="es-beam-edition-badge es-beam-edition-badge--pro">EPSILON LAB · BEAM PRO</span><span class="es-beam-edition-state">ĐỊNH HƯỚNG · CHƯA PHÁT HÀNH</span></div>
   <h2 class="es-beam-edition-title">Hướng mở rộng phân tích dầm</h2>
   <p class="es-beam-edition-intro">Beam Pro được định hướng mở rộng các bài toán dầm 1D có mô hình cơ học rõ ràng, triển khai và kiểm chứng được trước khi phát hành.</p>
   <div class="es-beam-edition-points">
    <span><b class="es-beam-edition-symbol">✦</b> Thêm sơ đồ dầm &amp; gối tựa</span>
    <span><b class="es-beam-edition-symbol">✦</b> Nhiều tải trên cùng một dầm</span>
    <span><b class="es-beam-edition-symbol">✦</b> Biểu đồ V–M &amp; độ võng</span>
   </div>
   <details class="es-beam-pro-more"><summary>Xem các hướng phát triển khả thi</summary>
    <ul>
     <li><strong>Sơ đồ dầm:</strong> dầm công xôn và dầm liên tục nhiều nhịp với các điều kiện gối tựa cơ bản.</li>
     <li><strong>Tải trọng:</strong> kết hợp nhiều lực tập trung, tải phân bố trên từng đoạn và mô men đặt.</li>
     <li><strong>Kết quả phân tích:</strong> phản lực gối, biểu đồ lực cắt (V), mô men (M), độ võng và góc xoay.</li>
     <li><strong>Hỗ trợ sử dụng:</strong> lưu phương án tính toán, xem lại đầu vào và xuất bảng kết quả, biểu đồ.</li>
    </ul>
    <p class="es-beam-disclaimer">Đây là các hướng phát triển đề xuất, không phải tính năng đã có hay cam kết phát hành. Kiểm tra độ bền, ổn định hoặc thiết kế theo tiêu chuẩn chỉ được giới thiệu cụ thể khi có phạm vi và kết quả kiểm chứng riêng.</p>
   </details>
  </article>
 </section>
 <div class="tool-grid-2"><section class="tool-box"><h2 class="tool-box-heading">${icon('beam')} Dầm hai gối tựa · Beam Basic</h2><label class="form-field"><span>Trường hợp tải</span><select id="beam-type"><option value="udl">Tải phân bố đều w (N/mm)</option><option value="point">Tải tập trung ở giữa nhịp P (kN)</option></select></label><div class="separator"></div><div class="form-grid">${field({name:'span',label:'Chiều dài nhịp L',value:3000,unit:'mm',min:1})}${field({name:'E',label:'Mô đun đàn hồi E',value:200000,unit:'N/mm²',min:1})}${field({name:'I',label:'Mô men quán tính I',value:8000000,unit:'mm⁴',min:1})}<div id="beam-load">${field({name:'w',label:'Tải phân bố w',value:2,unit:'N/mm',min:0})}</div></div><p class="tool-error" id="beam-error" role="alert"></p><p class="tool-hint"><strong>Giả định:</strong> Dầm thẳng, hai gối tựa đơn, vật liệu đàn hồi tuyến tính, tiết diện và E không đổi. Bỏ qua tự trọng nếu chưa cộng vào tải.</p></section><section class="tool-box"><h2 class="tool-box-heading">${icon('area')} Sơ đồ tải trọng</h2><div class="preview-canvas"><svg viewBox="0 0 520 230" role="img" aria-label="Dầm đơn giản chịu lực"><path d="M55 148h410" stroke="#234ace" stroke-width="7" stroke-linecap="round"/><path d="m70 156-19 25h38zm380 0-19 25h38z" stroke="#5a27cd" fill="#ded8fc" stroke-width="2"/><path id="beam-arrows" d="M120 48v90m-6-9 6 9 6-9M200 48v90m-6-9 6 9 6-9M280 48v90m-6-9 6 9 6-9M360 48v90m-6-9 6 9 6-9M440 48v90m-6-9 6 9 6-9" stroke="#ee692f" stroke-width="2" fill="none"/><text x="270" y="212" text-anchor="middle" fill="#2447ad" font-size="20">Dầm hai gối tựa · L</text></svg></div></section></div><section class="tool-box"><h2 class="tool-box-heading">${icon('chart')} Kết quả sơ bộ</h2><div class="results-grid three"><div class="result-tile"><strong>Mô men lớn nhất</strong><output id="beam-M">—</output><span class="mini-kpi">kN·m</span></div><div class="result-tile green"><strong>Lực cắt lớn nhất</strong><output id="beam-V">—</output><span class="mini-kpi">kN</span></div><div class="result-tile purple"><strong>Độ võng lớn nhất</strong><output id="beam-D">—</output><span class="mini-kpi">mm</span></div></div></section><div class="callout warning">${icon('info')} Chỉ là <strong>ước tính cơ học cơ bản</strong>, chưa kiểm tra độ bền, ổn định, tải động, hệ số an toàn hoặc tiêu chuẩn thiết kế. Không dùng riêng kết quả này để duyệt kết cấu chịu lực.</div>`;
 const type=root.querySelector('#beam-type');
 function updateType(){root.querySelector('#beam-load').innerHTML=type.value==='udl'?field({name:'w',label:'Tải phân bố w',value:2,unit:'N/mm',min:0}):field({name:'P',label:'Tải tập trung P',value:5,unit:'kN',min:0});root.querySelector('#beam-arrows').setAttribute('d',type.value==='udl'?'M120 48v90m-6-9 6 9 6-9M200 48v90m-6-9 6 9 6-9M280 48v90m-6-9 6 9 6-9M360 48v90m-6-9 6 9 6-9M440 48v90m-6-9 6 9 6-9':'M260 45v95m-8-11 8 11 8-11');calc();}
 function calc(){try{const obj={span:numeric(root.querySelector('[name=span]').value,'L',{positive:true}),E:numeric(root.querySelector('[name=E]').value,'E',{positive:true}),I:numeric(root.querySelector('[name=I]').value,'I',{positive:true}),loadType:type.value};const load=root.querySelector('#beam-load input');obj[load.name]=numeric(load.value,'Tải trọng',{positive:true});const res=beamCalc(obj);setText(root,'#beam-M',number(res.moment,4));setText(root,'#beam-V',number(res.shear,4));setText(root,'#beam-D',number(res.deflection,4));setText(root,'#beam-error','');}catch(e){setText(root,'#beam-error',e.message);['#beam-M','#beam-V','#beam-D'].forEach(s=>setText(root,s,'—'));}}
 type.addEventListener('change',updateType,{signal:ctx.signal});root.addEventListener('input',calc,{signal:ctx.signal});updateType();
}
