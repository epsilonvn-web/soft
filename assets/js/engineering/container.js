/**
 * Epsilon Blue Soft | Container specifications & carrier payload comparison.
 * Read-only engineering reference. Checked against official public carrier pages on 2026-10-28.
 * No external JS library, backend or user-data collection.
 * Published payload is NOT a Vietnam booking allowance or a certified VGM.
 */

export const SOURCE_CHECKED = '28/10/2026';

const SOURCES = Object.freeze({
  evergreen: 'https://www.evergreen-shipping.com.ph/container-specifications',
  maersk: 'https://www.maersk.com/support/faqs/cargo-weight-limit',
  cmacgm: 'https://www.cma-cgm.com/products-services/containers',
  hapag20: 'https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/20-standard.html',
  hapag40: 'https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/40-standard.html',
  hapag40hc: 'https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/40-standard-high-cube.html',
  one: 'https://vn-meo.one-line.com/dry-containers',
  oocl20: 'https://www.oocl.com/eng/ourservices/containers/containerspecifications/Pages/generalpurpose.aspx',
  oocl40hc: 'https://www.oocl.com/eng/ourservices/containers/containerspecifications/pages/highcube.aspx',
  yangming20: 'https://e-solution.yangming.com/service/service_network/container_equipment_detail_20DC.aspx',
  yangming40hc: 'https://e-solution.yangming.com/service/service_network/container_equipment_detail_40HQ.aspx',
  hmm: 'https://www.hmm21.com/e-service/information/containerInformation.do',
  pil: 'https://www.pilship.com/shipping-solutions/cargo-solutions/',
  imo: 'https://www.imo.org/en/ourwork/safety/pages/verification-of-the-gross-mass.aspx',
  vnlaw: 'https://vanban.chinhphu.vn/?docid=218379&pageid=27160',
});

const eq = (id, code, name, group, variant, outer, inner, door, gross, tare, published, note='') =>
  ({id,code,name,group,variant,outer,inner,door,gross,tare,net:gross-tare,published,note});

// All measurements mm, masses kg. Published=true: Evergreen table explicitly lists Net Weight.
// Published=false: Net is calculated from its published Gross Weight and Tare Weight.
export const EVERGREEN = Object.freeze([
  eq('20gp-h','20GP',"20' Dry",'dry','30.480 kg (heavy)',[6058,2438,2591],[5898,2352,2385],[2343,2280],30480,2400,true),
  eq('20gp-l','20GP',"20' Dry",'dry','24.000 kg (legacy)',[6058,2438,2591],[5898,2352,2385],[2343,2280],24000,2330,true,'Có cả biến thể 24 tấn; không mặc định mọi vỏ 20GP đều đạt 30,48 tấn.'),
  eq('40gp','40GP',"40' Dry",'dry','Tiêu chuẩn',[12192,2438,2591],[12032,2352,2385],[2343,2280],30480,4000,true),
  eq('40hc','40HC',"40' High Cube",'dry','Tiêu chuẩn',[12192,2438,2896],[12032,2352,2690],[2343,2585],30480,4200,true),
  eq('45hc-a','45HC',"45' High Cube",'dry','30.480 kg',[13716,2438,2896],[13556,2352,2698],[2340,2585],30480,4870,true),
  eq('45hc-b','45HC',"45' High Cube",'dry','32.500 kg',[13716,2438,2896],[13556,2352,2698],[2340,2585],32500,4700,true),
  eq('20rf-s','20RF',"20' Reefer",'reefer','MGSS',[6058,2438,2591],[5500,2298,2276],null,30480,3040,false,'Nguồn Evergreen không công bố kích thước mở cửa của mẫu này trong bảng tóm tắt.'),
  eq('20rf-a','20RF',"20' Reefer",'reefer','Nhôm',[6058,2438,2591],[5543,2286,2235],null,24000,2870,false),
  eq('40rh-s','40RH',"40' Reefer High Cube",'reefer','MGSS',[12192,2438,2896],[11579,2298,2544],null,34000,4150,false),
  eq('40rh-a','40RH',"40' Reefer High Cube",'reefer','Nhôm',[12192,2438,2896],[11618,2286,2507],null,30480,4300,false),
  eq('20ot-h','20OT',"20' Open Top",'special','30.480 kg',[6058,2438,2591],[5898,2351,2348],null,30480,2330,true,'Kích thước mở nóc không được nêu trên bảng Evergreen này.'),
  eq('20ot-l','20OT',"20' Open Top",'special','24.000 kg',[6058,2438,2591],[5898,2351,2348],null,24000,2410,true),
  eq('20fr-f','20FR',"20' Flat Rack",'special','4 trụ cố định',[6058,2438,2591],[5650,2030,2073],null,30000,2790,true,'Kích thước bên trong là khoảng cách sử dụng tham khảo, không phải cửa container kín.'),
  eq('20fr-c','20FR',"20' Flat Rack",'special','Đầu gập',[6058,2438,2591],[5638,2228,2233],null,34000,2890,true,'Hàng quá khổ cần kiểm tra phương án nâng hạ và chằng buộc riêng.'),
]);

const car = (id,name,p20,p40,p40h,source,note='',alternative={},sources={})=>
  ({id,name,payload:{'20GP':p20,'40GP':p40,'40HC':p40h},source,note,alternative,sources});
// 'Maximum payload / Net weight' from each line's official equipment page (kg).
// NO unverified values are silently assigned to missing cells.
export const CARRIERS = Object.freeze([
  car('evergreen','Evergreen',28080,26480,26280,SOURCES.evergreen,'Mốc so sánh: vỏ 20GP 30.480 kg; một số vỏ 20GP chỉ có net 21.670 kg.',{'20GP':'21.670 kg (vỏ 24 tấn)'}),
  car('maersk','Maersk',28300,28870,28690,SOURCES.maersk,'Hãng công bố tải hàng tối đa theo loại; mức chấp nhận thực tế thay đổi theo quốc gia/tuyến.'),
  car('cmacgm','CMA CGM',28250,26760,26760,SOURCES.cmacgm,'Bảng hãng ghi 26.760/28.780 kg cho 40GP và 40HC; hàng 40HC có sai khác với phép trừ gross − tare trung bình, cần xác minh vỏ cụ thể.',{'40GP':'28.780 kg (vỏ 32.500 kg)','40HC':'28.780 kg (vỏ 32.500 kg)'}),
  car('hapag','Hapag-Lloyd',28130,28750,28600,SOURCES.hapag20,'Mẫu container hãng nêu chỉ mang tính đại diện; xem riêng từng kích thước.',{}, {'20GP':SOURCES.hapag20,'40GP':SOURCES.hapag40,'40HC':SOURCES.hapag40hc}),
  car('one','ONE',28330,26840,28800,SOURCES.one,'Bảng ONE Việt Nam, số liệu mẫu tham khảo; vỏ thực tế có thể khác.'),
  car('oocl','OOCL',28200,26650,28700,SOURCES.oocl20,'Các mức 20GP/40GP do OOCL công bố không hoàn toàn khớp phép tính từ gross và tare trên cùng trang; phải xác nhận khi booking.',{}, {'20GP':SOURCES.oocl20,'40GP':SOURCES.oocl20,'40HC':SOURCES.oocl40hc}),
  car('yangming','Yang Ming',28110,null,26310,SOURCES.yangming20,'40HC có biến thể 32.500 kg đạt net 28.350 kg. Chưa có số 40GP được xác nhận từ trang độc lập.',{'40HC':'28.350 kg (vỏ 32.500 kg)'},{'20GP':SOURCES.yangming20,'40HC':SOURCES.yangming40hc}),
  car('hmm','HMM',28280,28900,28700,SOURCES.hmm,'Dữ liệu bảng thiết bị; trọng lượng vận chuyển thực tế còn phụ thuộc tuyến và phương thức.'),
  car('pil','PIL',28380,26830,28800,SOURCES.pil,'PIL yêu cầu đối chiếu số container cụ thể và điều kiện đường bộ tại nước sở tại.'),
]);

const fmt = n => Number.isFinite(n) ? new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(n) : '—';
const dim = a => Array.isArray(a) ? a.map(fmt).join(' × ') : 'Chưa công bố';
const safeUrl = u => /^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(u) ? u : '#';
const ext = (url,label='Nguồn gốc ↗') => `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
const first = id => EVERGREEN.find(e=>e.id===id) || EVERGREEN[0];
const carrier = id => CARRIERS.find(c=>c.id===id) || CARRIERS[0];
const maxNum = input => {const s=String(input??'').trim();if(!s)return null;const v=Number(s);return Number.isFinite(v)&&v>=0&&v<=1e7?v:NaN;};
export const effectivePayload = (published,booking) =>
  Number.isFinite(published)&&published>0 ? (Number.isFinite(booking)&&booking>0?Math.min(published,booking):published):null;

const styles = `
.container-tool{--ct-ink:#153077;--ct-border:#dce5fa;--ct-muted:#526b99;color:#14266f;font-size:16px;display:grid;gap:14px}
.container-tool *{box-sizing:border-box}
.container-tool button,.container-tool select,.container-tool input{font:inherit}
.ct-intro{border-radius:17px;border:1px solid #d7dafa;background:linear-gradient(110deg,#f1f4ff 0%,#eaf7ff 65%,#e8e2ff 100%);padding:19px 23px;display:flex;align-items:center;justify-content:space-between;gap:22px}
.ct-intro h2{font-size:clamp(22px,2.2vw,29px);line-height:1.2;margin:0 0 7px;color:#14299f;font-weight:900}
.ct-intro p{margin:0;color:var(--ct-muted);line-height:1.45;font-size:16px;max-width:800px}
.ct-stamp{padding:7px 13px;border-radius:999px;border:1px solid #d1c8ff;background:#fff9;white-space:nowrap;color:#5731a3;font-size:16px;font-weight:800}
.ct-tabs{display:flex;gap:7px;flex-wrap:wrap;border-bottom:1px solid var(--ct-border);padding-bottom:9px}
.ct-tab{border:1px solid #dadff8;background:white;color:#30408d;border-radius:10px;padding:10px 15px;font-weight:800;min-height:44px;cursor:pointer}
.ct-tab[aria-selected="true"]{background:#6330db;border-color:#6330db;color:white}
.ct-tab:not([aria-selected="true"]):hover{background:#f0edff}
.ct-panel[hidden]{display:none!important}
.ct-panel{display:grid;gap:14px}
.ct-box{border:1px solid var(--ct-border);border-radius:14px;background:#fff;padding:16px;min-width:0}
.ct-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:13px}
.ct-heading h3{margin:0;font-size:20px;color:#122a8c;line-height:1.3}
.ct-heading p{margin:3px 0 0;font-size:16px;color:var(--ct-muted)}
.ct-field{display:flex;flex-direction:column;gap:6px;color:#283c89;font-weight:800;min-width:0;font-size:16px}
.ct-field select,.ct-field input{width:100%;min-width:0;border:1px solid #cbd5fa;border-radius:10px;min-height:44px;background:white;color:#15286e;padding:8px 11px;font-size:16px;font-weight:600}
.ct-field input:focus-visible,.ct-field select:focus-visible{outline:2px solid #8b64ed;outline-offset:1px}
.ct-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.ct-badges{display:flex;gap:8px;flex-wrap:wrap}
.ct-chip{font-size:16px;border-radius:999px;padding:5px 10px;color:#26518f;background:#e8f2ff;border:1px solid #d4e6fc;font-weight:750}
.ct-chip.accent{color:#6032c3;background:#f1eaff;border-color:#e2d8fc}
.ct-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.ct-stat{border:1px solid #dae5f8;border-radius:12px;padding:14px 12px;background:linear-gradient(120deg,#f8faff,#eef4ff);min-width:0}
.ct-stat.ct-yellow{background:linear-gradient(120deg,#fff9df,#fff5cc);border-color:#f2dea1}
.ct-stat.ct-green{background:linear-gradient(120deg,#eafff3,#f5fff9);border-color:#bfe9d5}
.ct-stat span{display:block;color:#4d6692;font-weight:700;font-size:16px;line-height:1.2}
.ct-stat strong{display:block;color:#142d8d;font-size:clamp(19px,1.7vw,27px);font-weight:900;margin-top:5px;overflow-wrap:anywhere}
.ct-stat small{font-size:16px;font-weight:650;color:#687c9e}
.ct-split{display:grid;grid-template-columns:minmax(0,1.03fr) minmax(0,.97fr);gap:12px}
.ct-dimension{padding:12px;border:1px solid #d9e4fa;background:#fbfcff;border-radius:12px}
.ct-dimension h4{margin:0 0 7px;font-size:17px;color:#1b3296}
.ct-dimension .ct-fig{font-size:18px;color:#273b8e;font-weight:900;word-break:break-word}
.ct-dimension p{margin:4px 0 0;font-size:16px;color:#6b7fa4}
.ct-illustration{display:grid;place-items:center;min-height:130px;border-radius:13px;background:linear-gradient(125deg,#ecf2ff,#e2eafd);padding:16px;overflow:hidden}
.ct-container-art{width:min(100%,360px);height:86px;border:3px solid #4e58b9;border-radius:7px 12px 12px 7px;background:repeating-linear-gradient(90deg,#dee8ff 0 11px,#b4c7f1 11px 13px);box-shadow:9px 9px 0 #8496ce3d;position:relative}
.ct-container-art:after{content:'CONTAINER';font-size:16px;position:absolute;inset:0;display:grid;place-items:center;color:#23347c;font-weight:900;letter-spacing:2px;text-shadow:0 1px 2px white;background:#e9efffb3}
.ct-warning{border-radius:12px;background:#fff9ea;color:#694d12;border:1px solid #f0dba7;padding:13px 15px;font-size:16px;line-height:1.55}
.ct-note{color:#5d7098;font-size:16px;line-height:1.52;margin:0}
.ct-note strong{color:#273e92}
.ct-sources{display:flex;flex-wrap:wrap;gap:12px;align-items:center;font-size:16px}
.ct-sources a,.ct-table a,.ct-warning a,.ct-note a{color:#4c2dd3;font-weight:800;text-decoration:underline;text-underline-offset:3px}
.ct-table-wrap{max-width:100%;overflow-x:auto;border:1px solid #dae3f7;border-radius:12px}
.ct-table{border-collapse:collapse;width:100%;min-width:730px;font-size:16px}
.ct-table th{background:#f1f4ff;color:#213b9c;text-align:left;font-size:16px;font-weight:900;white-space:nowrap}
.ct-table td,.ct-table th{padding:10px 11px;border-bottom:1px solid #e5ecfa;vertical-align:middle}
.ct-table tbody tr:last-child td{border-bottom:0}
.ct-table tbody tr:hover{background:#f8f7ff}
.ct-table .ct-num{font-variant-numeric:tabular-nums;font-weight:800;white-space:nowrap}
.ct-table .ct-sub{display:block;color:#67799a;font-size:16px;font-weight:500;margin-top:3px}
.ct-table button{font-size:16px;font-weight:800;color:#5331bb;background:transparent;border:0;text-decoration:underline;text-underline-offset:3px;padding:1px;text-align:left}
.ct-diff{color:#10805f;font-weight:800}.ct-diff.minus{color:#b65b0a}.ct-diff.zero{color:#687b99}
.ct-toolbar{display:flex;align-items:flex-end;gap:12px;justify-content:space-between;flex-wrap:wrap}
.ct-toolbar .ct-field{min-width:min(280px,100%)}
.ct-button{background:#f1edff;color:#542abb;border:1px solid #d9cfff;border-radius:10px;min-height:44px;padding:7px 13px;font-size:16px;font-weight:800}
.ct-button:hover{background:#e9e2ff}
.ct-check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.ct-check-output{border:1px solid #cbdaf5;background:#f5f9ff;border-radius:13px;padding:17px;display:grid;gap:6px}
.ct-check-output.ok{border-color:#a2e4c4;background:#f0fff6}.ct-check-output.alert{border-color:#f4cc91;background:#fffaed}
.ct-check-output strong{font-size:22px;color:#153c87}
.ct-check-output p{margin:0;line-height:1.5;color:#4f628a}
.ct-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.ct-metrics>div{border:1px solid #dce6fa;border-radius:11px;padding:12px;min-width:0}
.ct-metrics span{font-size:16px;color:#526895;display:block}.ct-metrics b{font-size:21px;color:#1735a4;display:block;margin-top:4px;overflow-wrap:anywhere}
.ct-footer{color:#61749d;font-size:16px;line-height:1.5;margin:0}
@media(max-width:950px){.ct-split{grid-template-columns:1fr}.ct-stats{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:660px){.ct-intro{align-items:flex-start;flex-direction:column;padding:16px}.ct-fields,.ct-check-grid{grid-template-columns:1fr}.ct-stats,.ct-metrics{grid-template-columns:1fr}.ct-tab{flex:1}.ct-box{padding:13px}}
`;

export function mount(root,ctx={}){
  const icon = ctx.icon || ((name)=>({book:'▤',weight:'◧'}[name]||'▣'));
  root.innerHTML = `<section class="container-tool" aria-label="Tra cứu thông số container">
    <style>${styles}</style>
    <div class="ct-intro"><div><h2>${icon('box',25)} Tra cứu Container</h2><p>Thông số kích thước, khối lượng vỏ (Tare), tổng khối lượng tối đa (Max Gross), tải hàng tối đa (Net / Payload), và so sánh dữ liệu hãng tàu.</p></div><div class="ct-stamp">Dữ liệu tra cứu · ${SOURCE_CHECKED}</div></div>
    <div class="ct-tabs" role="tablist" aria-label="Nội dung tra cứu">
      <button type="button" class="ct-tab" role="tab" aria-controls="ct-tab-equip" aria-selected="true" data-ct-tab="equip">Evergreen · Thông số</button>
      <button type="button" class="ct-tab" role="tab" aria-controls="ct-tab-lines" aria-selected="false" data-ct-tab="lines">Net theo hãng tàu</button>
      <button type="button" class="ct-tab" role="tab" aria-controls="ct-tab-check" aria-selected="false" data-ct-tab="check">Kiểm tra tải nhanh</button>
    </div>
    <div class="ct-panel" id="ct-tab-equip" role="tabpanel" data-ct-panel="equip">
      <div class="ct-box"><div class="ct-heading"><div><h3>Thông số container Evergreen</h3><p>Chọn mẫu vỏ, loại và cấp Gross Weight đúng theo bảng công bố.</p></div>${ext(SOURCES.evergreen,'Bảng gốc Evergreen ↗')}</div>
        <label class="ct-field"><span>Loại và cấu hình container</span><select id="ct-equipment">${EVERGREEN.map(e=>`<option value="${e.id}">${e.code} · ${e.name} · ${e.variant}</option>`).join('')}</select></label>
        <div class="ct-badges" id="ct-badges" style="margin:13px 0"></div>
        <div class="ct-illustration"><div class="ct-container-art" role="img" aria-label="Hình khối minh họa container"></div></div>
        <div class="ct-stats" style="margin:13px 0"><div class="ct-stat"><span>Max Gross · Tổng tối đa</span><strong id="ct-gross"></strong><small>kg · cả vỏ + hàng</small></div><div class="ct-stat ct-yellow"><span>Tare · Khối lượng vỏ</span><strong id="ct-tare"></strong><small>kg · vỏ rỗng</small></div><div class="ct-stat ct-green"><span>Net / Payload · Hàng tối đa</span><strong id="ct-net"></strong><small>kg · Gross − Tare</small></div></div>
        <div class="ct-split"><div class="ct-dimension"><h4>Kích thước ngoài · D × R × C</h4><div class="ct-fig" id="ct-outer"></div><p>mm · kích thước phủ bì</p></div><div class="ct-dimension"><h4>Kích thước trong · D × R × C</h4><div class="ct-fig" id="ct-inner"></div><p>mm · kích thước lòng container</p></div><div class="ct-dimension"><h4>Cửa container · R × C</h4><div class="ct-fig" id="ct-door"></div><p>mm · cần xét thêm khi đưa hàng vào</p></div><div class="ct-dimension"><h4>Thể tích lòng · tính gần đúng</h4><div class="ct-fig" id="ct-volume"></div><p>m³ · tích ba kích thước trong</p></div></div>
        <p class="ct-note" id="ct-equip-note" style="margin-top:12px"></p>
      </div>
      <div class="ct-box"><div class="ct-heading"><h3>Toàn bộ cấu hình Evergreen đã trích</h3><span class="ct-chip">${EVERGREEN.length} cấu hình</span></div><div class="ct-table-wrap"><table class="ct-table"><thead><tr><th>Loại</th><th>Max Gross (kg)</th><th>Tare (kg)</th><th>Net / Payload (kg)</th><th>Trong lòng (mm)</th></tr></thead><tbody id="ct-equipment-table"></tbody></table></div></div>
    </div>
    <div class="ct-panel" id="ct-tab-lines" role="tabpanel" data-ct-panel="lines" hidden>
      <div class="ct-box"><div class="ct-heading"><div><h3>So sánh Net / Payload theo hãng tàu</h3><p>Dữ liệu được trích từ trang chính thức của mỗi hãng; không phải giới hạn booking áp dụng đồng loạt tại Việt Nam.</p></div><button type="button" id="ct-export" class="ct-button">${icon('download',17)} Xuất CSV</button></div>
      <div class="ct-toolbar" style="margin-bottom:12px"><label class="ct-field"><span>Đối chiếu chênh lệch theo loại</span><select id="ct-compare-type"><option value="20GP">20GP · 20 feet Dry</option><option value="40GP">40GP · 40 feet Dry</option><option value="40HC">40HC · 40 feet High Cube</option></select></label><span class="ct-chip" id="ct-carriers-counter"></span></div>
      <div class="ct-table-wrap"><table class="ct-table"><thead><tr><th>Hãng tàu</th><th>20GP (kg)</th><th>40GP (kg)</th><th>40HC (kg)</th><th>So với Evergreen (kg)</th><th>Nguồn</th></tr></thead><tbody id="ct-carriers-table"></tbody></table></div>
      <div class="ct-warning" style="margin-top:13px"><strong>Chú ý dữ liệu:</strong> Tải hàng tối đa theo đặc tính vỏ khác với mức nhận hàng do hãng tàu, cảng, tàu, đường bộ hoặc booking quyết định. Một số bảng hãng công bố số Net và Tare/Gross không hoàn toàn khớp; tool giữ nguyên Net đã công bố và ghi chú khác biệt, không âm thầm sửa dữ liệu.</div>
      <div class="ct-sources" style="margin-top:13px">${ext(SOURCES.imo,'IMO · VGM & SOLAS ↗')}${ext(SOURCES.vnlaw,'Việt Nam · giới hạn đường bộ ↗')}</div></div>
    </div>
    <div class="ct-panel" id="ct-tab-check" role="tabpanel" data-ct-panel="check" hidden>
      <div class="ct-box"><div class="ct-heading"><div><h3>Kiểm tra tải hàng sơ bộ</h3><p>Nhập khối lượng gồm hàng, pallet, đai, vật liệu lót và chèn buộc. Không thay cho xác nhận booking hoặc chứng nhận VGM.</p></div></div>
        <div class="ct-check-grid">
          <label class="ct-field"><span>Hãng tàu</span><select id="ct-carrier-check">${CARRIERS.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></label>
          <label class="ct-field"><span>Loại container</span><select id="ct-type-check"><option value="20GP">20GP</option><option value="40GP">40GP</option><option value="40HC">40HC</option></select></label>
          <label class="ct-field"><span>Hàng + bao bì + chèn buộc (kg)</span><input id="ct-cargo" type="number" inputmode="decimal" min="0" max="1000000" step="1" value="24000"></label>
          <label class="ct-field"><span>Giới hạn booking thực tế (kg) · nếu có</span><input id="ct-booking" type="number" inputmode="decimal" min="0" max="1000000" step="1" placeholder="Để trống nếu chưa xác nhận"></label>
          <label class="ct-field"><span>Tare vỏ thực tế (kg) · nếu có</span><input id="ct-actual-tare" type="number" inputmode="decimal" min="0" max="100000" step="1" placeholder="Đọc trên cửa vỏ container"></label>
          <label class="ct-field"><span>Max Gross trên cửa vỏ (kg) · nếu có</span><input id="ct-real-gross" type="number" inputmode="decimal" min="0" max="1000000" step="1" placeholder="Đọc trên cửa vỏ container"></label>
        </div>
        <div class="ct-check-output" id="ct-check-result" role="status" aria-live="polite" style="margin-top:13px"></div>
        <div class="ct-metrics" style="margin-top:11px"><div><span>Payload tham khảo</span><b id="ct-allow"></b></div><div><span>Dư tải tham khảo</span><b id="ct-remaining"></b></div><div><span>Gross dự tính (nếu có Tare thực tế)</span><b id="ct-estimated-gross"></b></div></div>
        <p class="ct-note" id="ct-calc-note" style="margin-top:12px"></p>
      </div>
      <div class="ct-warning"><strong>Nguyên tắc:</strong> VGM được xác minh bằng cân vỏ đóng hàng hoặc phương pháp cân thành phần theo quy định và gồm cả Tare. Không được dùng phép cộng trong công cụ này để tự khai VGM khi không có phương pháp xác minh hợp lệ. ${ext(SOURCES.imo,'Xem IMO ↗')}</div>
    </div>
    <p class="ct-footer"><strong>Nguồn tra cứu:</strong> Evergreen Shipping Agency, trang thiết bị của từng hãng tàu và hướng dẫn IMO. Cập nhật nguồn thủ công tại thời điểm ${SOURCE_CHECKED}. Không bảo đảm thiết bị sẵn có, mức nhận hàng hoặc tính phù hợp để xếp/đóng/chằng buộc hàng cụ thể. Hãy xác nhận biển thông số trên <strong>cửa bên phải vỏ container</strong> và booking của hãng.</p>
  </section>`;
  const $=sel=>root.querySelector(sel);
  const qsa=sel=>[...root.querySelectorAll(sel)];
  const signal=ctx.signal;
  const on=(el,event,fn)=>el.addEventListener(event,fn,signal?{signal}:undefined);
  function activate(name){
    for(const btn of qsa('[data-ct-tab]')){const yes=btn.dataset.ctTab===name;btn.setAttribute('aria-selected',String(yes));btn.tabIndex=yes?0:-1;}
    for(const panel of qsa('[data-ct-panel]'))panel.hidden=panel.dataset.ctPanel!==name;
  }
  function selectEquipment(id){
    const e=first(id);$('#ct-equipment').value=e.id;
    $('#ct-gross').textContent=fmt(e.gross);$('#ct-tare').textContent=fmt(e.tare);$('#ct-net').textContent=fmt(e.net);
    $('#ct-outer').textContent=dim(e.outer);$('#ct-inner').textContent=dim(e.inner);$('#ct-door').textContent=e.door?dim(e.door):'Không áp dụng / không có số';
    $('#ct-volume').textContent=e.code.endsWith('FR')?'Không áp dụng':fmt(Math.round(e.inner.reduce((a,b)=>a*b,1)/1e9*10)/10)+' m³';
    $('#ct-badges').innerHTML=`<span class="ct-chip">${e.code}</span><span class="ct-chip accent">${e.variant}</span><span class="ct-chip">Net: ${e.published?'Hãng công bố':'Tính từ Gross − Tare'}</span>`;
    $('#ct-equip-note').textContent=(e.note?e.note+' ':'')+'Số liệu điển hình của Evergreen, không thay thế biển thông số vỏ thực tế, VGM hoặc xác nhận hãng tàu.';
    qsa('[data-ct-equip]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.ctEquip===e.id)));
  }
  function renderEquipTable(){
    const rows=$('#ct-equipment-table');
    rows.innerHTML=EVERGREEN.map(e=>`<tr><td><button type="button" data-ct-equip="${e.id}" title="Xem chi tiết">${e.code} · ${e.variant}</button></td><td class="ct-num">${fmt(e.gross)}</td><td class="ct-num">${fmt(e.tare)}</td><td class="ct-num">${fmt(e.net)}${e.published?'':' <span class="ct-sub">(*) tính</span>'}</td><td>${dim(e.inner)}</td></tr>`).join('');
    for(const btn of qsa('[data-ct-equip]'))on(btn,'click',()=>{selectEquipment(btn.dataset.ctEquip);$('#ct-equipment').scrollIntoView({block:'nearest',behavior:'smooth'});});
  }
  function renderCarrierTable(){
    const type=$('#ct-compare-type').value;const base=CARRIERS[0].payload[type];
    const rows=$('#ct-carriers-table');
    rows.innerHTML=CARRIERS.map(c=>{
      const n=c.payload[type],diff=Number.isFinite(n)?n-base:null;
      const difference=diff===null?'—':`${diff>0?'+':''}${fmt(diff)}`;
      const url=c.sources[type]||c.source;
      return `<tr><td><button type="button" data-ct-use-carrier="${c.id}" title="Kiểm tra tải với hãng này">${c.name}</button>${c.note?`<span class="ct-sub">${c.note}</span>`:''}</td>${['20GP','40GP','40HC'].map(t=>`<td class="ct-num">${fmt(c.payload[t])}${c.alternative[t]?`<span class="ct-sub">Khác: ${c.alternative[t]}</span>`:''}</td>`).join('')}<td class="ct-num"><span class="ct-diff ${diff===null||diff===0?'zero':diff<0?'minus':''}">${difference}</span></td><td>${ext(url,'Xem hãng ↗')}</td></tr>`;
    }).join('');
    $('#ct-carriers-counter').textContent=CARRIERS.length+' hãng · mốc '+fmt(base)+' kg';
    for(const b of qsa('[data-ct-use-carrier]'))on(b,'click',()=>{$('#ct-carrier-check').value=b.dataset.ctUseCarrier;$('#ct-type-check').value=type;activate('check');renderCheck();});
  }
  function renderCheck(){
    const c=carrier($('#ct-carrier-check').value),type=$('#ct-type-check').value,published=c.payload[type];
    const cargo=maxNum($('#ct-cargo').value),booking=maxNum($('#ct-booking').value),tare=maxNum($('#ct-actual-tare').value),grossPlate=maxNum($('#ct-real-gross').value);
    const invalid=[cargo,booking,tare,grossPlate].some(Number.isNaN)||(Number.isFinite(grossPlate)&&grossPlate>0&&Number.isFinite(tare)&&tare>0&&grossPlate<=tare);
    const equipmentPayload=(Number.isFinite(grossPlate)&&grossPlate>0&&Number.isFinite(tare)&&tare>0&&grossPlate>tare)?grossPlate-tare:null;
    const baseAllowed=effectivePayload(published,booking);
    const allowed=Number.isFinite(baseAllowed)&&Number.isFinite(equipmentPayload)?Math.min(baseAllowed,equipmentPayload):baseAllowed;
    const output=$('#ct-check-result'),calcNote=$('#ct-calc-note');
    $('#ct-allow').textContent=Number.isFinite(allowed)?fmt(allowed)+' kg':'Chưa có dữ liệu';
    $('#ct-remaining').textContent=Number.isFinite(allowed)&&Number.isFinite(cargo)?fmt(allowed-cargo)+' kg':'—';
    $('#ct-estimated-gross').textContent=Number.isFinite(cargo)&&Number.isFinite(tare)&&tare>0?fmt(cargo+tare)+' kg':'Chưa nhập Tare';
    const override=Number.isFinite(booking)&&booking>0&&Number.isFinite(published)&&booking<published;const plateRestricts=Number.isFinite(equipmentPayload)&&Number.isFinite(allowed)&&equipmentPayload<=allowed;
    if(invalid||!Number.isFinite(cargo)||cargo===null){output.className='ct-check-output alert';output.innerHTML='<strong>Dữ liệu chưa hợp lệ</strong><p>Nhập khối lượng hàng bằng số không âm, không vượt giới hạn nhập liệu.</p>';}
    else if(!Number.isFinite(allowed)){output.className='ct-check-output alert';output.innerHTML='<strong>Chưa đủ thông số để kết luận</strong><p>Hãng chưa có mức payload được kiểm chứng cho loại vỏ này trong bảng. Vui lòng hỏi hãng/forwarder và đối chiếu biển vỏ thực tế.</p>';}
    else if(cargo>allowed){output.className='ct-check-output alert';output.innerHTML=`<strong>Vượt mức tham khảo ${fmt(cargo-allowed)} kg</strong><p>Tải hàng nhập (${fmt(cargo)} kg) lớn hơn mức đang dùng (${fmt(allowed)} kg). Cần giảm tải hoặc xác nhận lại thiết bị, tuyến, booking trước khi xếp hàng.</p>`;}
    else{output.className='ct-check-output ok';output.innerHTML=`<strong>Trong ngưỡng số liệu tham khảo</strong><p>Hàng ${fmt(cargo)} kg ≤ mức ${fmt(allowed)} kg (${plateRestricts?'ưu tiên tải hàng theo biển container':override?'ưu tiên giới hạn booking đã nhập':'theo trang hãng công bố'}). Chưa đồng nghĩa được phép vận chuyển hoặc VGM hợp lệ.</p>`;}
    calcNote.textContent=`${c.name} / ${type}. ${c.note||'Giới hạn hãng có thể thay đổi theo tuyến.'} ` + (Number.isFinite(tare)&&tare>0?'Gross hiển thị là phép cộng từ Tare nhập tay, KHÔNG phải VGM đã xác minh. Nếu nhập cả Max Gross trên cửa, tool lấy mức payload thấp hơn để kiểm tra.':'Chỉ nhập Tare đã xác nhận từ cửa container để tính Gross dự tính.');
  }
  function exportCSV(){
    const heading=['Hãng tàu','20GP Net (kg)','40GP Net (kg)','40HC Net (kg)','Ghi chú','Nguồn 20GP','Nguồn 40GP','Nguồn 40HC'];
    const safe=s=>'"'+(/^[\s]*[=+@-]/.test(String(s??''))?"'":'')+String(s??'').replace(/"/g,'""')+'"';
    const lines=[heading,...CARRIERS.map(c=>[c.name,...['20GP','40GP','40HC'].map(t=>c.payload[t]??''),c.note,...['20GP','40GP','40HC'].map(t=>c.sources[t]||c.source)])];
    const csv='\ufeff'+lines.map(r=>r.map(safe).join(';')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='epsilon-container-carrier-payload.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);ctx.showToast?.('Đã xuất bảng tải hàng tham khảo.');
  }
  for(const b of qsa('[data-ct-tab]'))on(b,'click',()=>activate(b.dataset.ctTab));
  on($('#ct-equipment'),'change',e=>selectEquipment(e.target.value));
  on($('#ct-compare-type'),'change',renderCarrierTable);
  for(const id of ['ct-carrier-check','ct-type-check','ct-cargo','ct-booking','ct-actual-tare','ct-real-gross'])on($('#'+id),'input',renderCheck);
  on($('#ct-export'),'click',exportCSV);
  renderEquipTable();selectEquipment('20gp-h');renderCarrierTable();renderCheck();
}
