/**
 * EPSILON SOFT - Paint Studio Basic v2.3
 * Free tier for Epsilon Soft. Advanced multi-coat/industrial features are NOT bundled.
 * Module contract: export function mount(root, ctx)
 * Self-contained, offline, no API calls, no local storage, no remote dependencies.
 * Calculations are illustrative. Manufacturer TDS and project specs take precedence.
 */

const ACTIVE_MOUNTS = new WeakMap();
const format = (x, digits = 2) => Number.isFinite(x)
  ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(x) : '—';

function numberInRange(value, label, min, max, integer = false) {
  const normalized = typeof value === 'string' ? value.trim().replace(',', '.') : value;
  if (normalized === '' || normalized == null) throw new Error(`Vui lòng nhập ${label}.`);
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    throw new Error(`${label}: cần ${integer ? 'số nguyên ' : ''}từ ${format(min)} đến ${format(max)}.`);
  }
  return n;
}

/** For one coating product with a manufacturer-supplied spreading rate in m²/L. */
export function calculateQuick(p) {
  const area = numberInRange(p.area, 'diện tích', 0, 1e8);
  const coats = numberInRange(p.coats, 'số lượt sơn', 1, 30, true);
  const coverage = numberInRange(p.coverage, 'định mức phủ mỗi lượt', 0.01, 1000);
  const loss = numberInRange(p.loss, 'hao hụt', 0, 94.99);
  const density = numberInRange(p.density, 'tỷ trọng sơn', 0.01, 10);
  const pack = numberInRange(p.pack, 'dung tích mỗi lon', 0.1, 1000);
  const theoretical = area * coats / coverage;
  // Loss is the fraction of all paint prepared that does not reach the surface.
  const practical = theoretical / (1 - loss / 100);
  const cans = practical === 0 ? 0 : Math.ceil(practical / pack - 1e-10);
  return { area, coats, coverage, loss, density, pack, theoretical, practical,
    kg: practical * density, cans, purchased: cans * pack, surplus: cans * pack - practical };
}

/** WFT / DFT approximation using Volume Solids of correctly mixed base product. */
export function calculateFilmThickness(p) {
  const solids = numberInRange(p.solids, 'Volume Solids (VS)', 1, 100);
  const thinning = numberInRange(p.thinning ?? 0, 'dung môi pha thêm', 0, 100);
  const direction = p.direction || 'wft';
  const tableMode = p.tableMode || 'wft';
  if (!['wft', 'dft'].includes(direction) || !['wft', 'dft'].includes(tableMode)) {
    throw new Error('Chiều quy đổi không hợp lệ.');
  }
  const value = numberInRange(p.value, direction === 'wft' ? 'WFT' : 'DFT', 0.1, 10000);
  const step = numberInRange(p.step ?? 50, 'bước bảng tra', 25, 100, true);
  if (![25, 50, 100].includes(step)) throw new Error('Bước bảng tra không hợp lệ.');
  const effectiveSolids = solids / (1 + thinning / 100);
  const fraction = effectiveSolids / 100;
  const wft = direction === 'wft' ? value : value / fraction;
  const dft = direction === 'wft' ? value * fraction : value;
  const table = Array.from({ length: 10 }, (_, index) => {
    const input = step * (index + 1);
    return tableMode === 'wft'
      ? { input, unthinned: input * solids / 100, thinned: input * fraction }
      : { input, unthinned: input * 100 / solids, thinned: input / fraction };
  });
  return { solids, thinning, direction, tableMode, value, step, effectiveSolids,
    wft, dft, unthinnedDFTAtSameWFT: wft * solids / 100, table };
}

/** Simple single-part geometry, dimensions in millimetres. */
export function calculateSimpleArea(p) {
  const shape = String(p.shape || 'plate');
  if (!['plate', 'box', 'cylinder', 'pipe'].includes(shape)) throw new Error('Loại chi tiết không hợp lệ.');
  const qty = numberInRange(p.qty ?? 1, 'số lượng', 1, 1000000, true);
  const a = numberInRange(p.a, 'kích thước A', 0.01, 1e7);
  const b = numberInRange(p.b, 'kích thước B', 0.01, 1e7);
  const c = ['plate', 'box', 'pipe'].includes(shape)
    ? numberInRange(p.c, 'kích thước C', shape === 'plate' ? 0 : 0.01, 1e7) : 0;
  let mm2 = 0;
  if (shape === 'plate') {
    mm2 = a * b * (p.bothFaces ? 2 : 1);
    if (p.edges) mm2 += 2 * (a + b) * c;
  } else if (shape === 'box') {
    mm2 = 2 * (a * b + a * c + b * c);
  } else if (shape === 'cylinder') {
    mm2 = Math.PI * a * b;
    if (p.ends) mm2 += Math.PI * a * a / 2;
  } else {
    if (c >= a) throw new Error('Đường kính trong phải nhỏ hơn đường kính ngoài.');
    mm2 = Math.PI * a * b;
    if (p.inside) mm2 += Math.PI * c * b;
    if (p.ends) mm2 += Math.PI * (a * a - c * c) / 2;
  }
  const single = mm2 / 1e6;
  const total = single * qty;
  if (!Number.isFinite(total) || total > 1e12) throw new Error('Diện tích quá lớn. Kiểm tra đơn vị mm.');
  return { shape, qty, single, total };
}

const STYLE = `
.epb,.epb *{box-sizing:border-box}
.epb{--epb-navy:#142b82;--epb-blue:#2145cd;--epb-violet:#6744df;--epb-gold:#ffdc35;--epb-ink:#182a59;--epb-muted:#64759b;--epb-border:#dbe5fa;font:14px/1.48 system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:var(--epb-ink);max-width:1320px;width:100%;margin:0 auto}
.epb button,.epb input,.epb select{font:inherit}
.epb button{cursor:pointer}
.epb button:focus-visible,.epb input:focus-visible,.epb select:focus-visible{outline:3px solid #99b4ff;outline-offset:2px}
.epb :is(h2,h3,p){margin:0}
.epb .epb-hero{background:linear-gradient(119deg,#10268f 0%,#2544d3 49%,#6e42df 100%);border-radius:16px;color:white;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:19px 22px;overflow:hidden;position:relative}
.epb .epb-hero:before{content:'';position:absolute;width:230px;height:230px;right:40px;top:-175px;border-radius:50%;background:#ffffff24;pointer-events:none}
.epb .epb-eyebrow{color:#d2e4ff;font-size:11px;font-weight:750;letter-spacing:.11em}
.epb .epb-hero h2{font-size:clamp(22px,2.5vw,29px);letter-spacing:-.6px;color:white;line-height:1.2;margin:5px 0}
.epb .epb-hero h2 span{color:var(--epb-gold)}
.epb .epb-hero p{color:#e3ecff;font-size:13px;max-width:760px}
.epb .epb-brand-icon{height:58px;width:58px;flex-shrink:0;display:grid;place-items:center;color:#ffd72d;border:2px solid #ffd72d;background:#0a1679;border-radius:15px;font-size:34px;font-family:'Segoe UI Emoji',system-ui,sans-serif;font-weight:600;font-style:normal;box-shadow:0 8px 20px #111d6a70}
.epb .epb-tabs{display:flex;gap:8px;flex-wrap:wrap;background:#f4f6ff;padding:10px;border:1px solid var(--epb-border);border-radius:14px;margin:13px 0}
.epb .epb-tab{border:1px solid #d9e3fa;background:white;padding:9px 16px;border-radius:11px;font-weight:750;color:#42538a;min-height:42px;transition:background .15s,border-color .15s}
.epb .epb-tab[aria-selected=true]{color:white;background:linear-gradient(105deg,#5542e5,#1e44d1);border-color:transparent;box-shadow:0 4px 11px #493bdf30}
.epb .epb-panel[hidden]{display:none!important}
.epb .epb-columns{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(270px,.9fr);gap:13px;align-items:start}
.epb .epb-card{border:1px solid var(--epb-border);background:white;border-radius:15px;padding:17px;box-shadow:0 3px 14px #1f3b8710;min-width:0}
.epb .epb-card h3{font-size:17px;font-weight:820;color:#132d8d;margin-bottom:5px}
.epb .epb-hint{font-size:12px;color:var(--epb-muted);line-height:1.65;margin-bottom:13px}
.epb .epb-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
.epb .epb-field{display:flex;flex-direction:column;gap:5px;min-width:0;font-size:12px;font-weight:700;color:#3b4a75}
.epb .epb-field input,.epb .epb-field select{width:100%;height:41px;border-radius:9px;border:1px solid #d3dff6;color:#162c76;background:#fbfdff;padding:0 11px;min-width:0;font-size:14px;font-weight:650;outline:none}
.epb .epb-field input:focus,.epb .epb-field select:focus{border-color:#654ee7;box-shadow:0 0 0 3px #6744df18}
.epb .epb-field .epb-unit{color:#7181a5;font-weight:500}
.epb .epb-span-2{grid-column:1/-1}
.epb .epb-results{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:13px}
.epb .epb-kpi{background:#f3f6ff;border:1px solid #e0e9fa;border-radius:12px;padding:12px;min-width:0}
.epb .epb-kpi.epb-prime{background:linear-gradient(135deg,#edfaf6,#e5f5ee);border-color:#c7efdf}
.epb .epb-kpi.epb-purple{background:#f4f0ff;border-color:#e8dfff}
.epb .epb-kpi small{display:block;font-size:11px;color:#566897;font-weight:650;min-height:30px}
.epb .epb-kpi strong{font-size:clamp(19px,2vw,25px);color:#123798;line-height:1.3;display:block;word-break:break-word;font-variant-numeric:tabular-nums}
.epb .epb-prime strong{color:#078b6b}
.epb .epb-purple strong{color:#6b43cb}
.epb .epb-kpi em{font-size:11px;color:#687ba6;font-style:normal}
.epb .epb-info{margin-top:13px;background:#f1f5ff;border:1px solid #dde7ff;padding:11px 13px;border-radius:11px;font-size:12px;color:#475d93;line-height:1.65}
.epb .epb-info strong{color:#263d91}
.epb .epb-error{margin-top:12px;font-size:12px;color:#9a3150;background:#fff0f4;border:1px solid #ffd3df;padding:9px 11px;border-radius:9px;line-height:1.5}
.epb .epb-error[hidden],.epb .epb-note[hidden]{display:none!important}
.epb .epb-film-main{display:grid;grid-template-columns:1.05fr .95fr;gap:13px}
.epb .epb-film-values{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:13px}
.epb .epb-film-values .epb-kpi{padding:15px 12px}
.epb .epb-solidsbar{display:flex;overflow:hidden;height:14px;border-radius:99px;background:#f7e0a8;margin:13px 0 8px}
.epb .epb-solidsbar i{display:block;height:100%;background:linear-gradient(90deg,#2464ed,#51b7ff);width:65%;border-radius:99px;transition:width .15s}
.epb .epb-barlegend{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:11px;color:#647398}
.epb .epb-gridtable{border:1px solid #e0e8fa;border-radius:11px;overflow:auto;margin-top:12px;max-width:100%}
.epb table{border-collapse:collapse;width:100%;min-width:500px;font-size:12px;text-align:right}
.epb th{background:#edf3ff;color:#25429a;padding:10px 9px;white-space:nowrap;font-size:11px}
.epb td{padding:9px;border-top:1px solid #eef1f8;color:#304776;font-variant-numeric:tabular-nums}
.epb tr:nth-child(even) td{background:#fafbff}
.epb th:first-child,.epb td:first-child{text-align:left}
.epb .epb-opts{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:13px;padding:10px 12px;background:#f6f8ff;border:1px solid #e3eafb;border-radius:11px;color:#415483;font-weight:600;font-size:12px}
.epb .epb-opts label{display:flex;gap:7px;align-items:center;cursor:pointer}
.epb .epb-opts input{accent-color:#523ce4;width:16px;height:16px}
.epb .epb-btn{border:1px solid #d6e1fa;border-radius:10px;padding:11px 16px;background:white;color:#2144be;font-weight:780;min-height:42px}
.epb .epb-btn-primary{color:white;background:linear-gradient(105deg,#563ce2,#2241cc);border:0;box-shadow:0 4px 10px #3a3bd52b}
.epb .epb-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:13px}
.epb .epb-note{margin-top:12px;border-radius:10px;padding:10px 12px;border:1px solid #bde8d7;color:#13644f;background:#eafaf3;font-size:12px;font-weight:650}
.epb .epb-bottom{margin-top:13px;padding:12px 15px;border-radius:12px;border:1px solid #e5e6fc;background:linear-gradient(96deg,#f4f6ff,#fdf9e9);font-size:12px;color:#4e618c;line-height:1.65}
.epb .epb-bottom strong{color:#26388f}
/* Free/Pro feature introduction: informational only; no unavailable functions are enabled. */
.epb .epb-editions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0 2px;align-items:start}
.epb .epb-edition{border:1px solid #dbe6fc;border-radius:14px;padding:15px 16px 14px;min-width:0;overflow:hidden;position:relative;background:linear-gradient(135deg,#ffffff,#f5f8ff)}
.epb .epb-edition-pro{background:linear-gradient(119deg,#fffefa 0%,#fffaf0 53%,#f4f0ff 100%);border-color:#e9ddfd}
.epb .epb-edition-head{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
.epb .epb-edition-chip{display:inline-flex;align-items:center;gap:5px;line-height:1.2;padding:5px 9px;border-radius:100px;font-size:10px;font-weight:850;letter-spacing:.02em;background:#e8f2ff;border:1px solid #d5e5ff;color:#1846a9}
.epb .epb-edition-chip-pro{color:#5532b6;background:#eee5ff;border-color:#ddd0fa}
.epb .epb-edition-status{font-size:10px;font-weight:720;color:#7b568f;background:#f7edff;border:1px solid #eadcf6;padding:4px 8px;border-radius:100px}
.epb .epb-edition h3{font-size:16px;line-height:1.3;font-weight:850;letter-spacing:-.2px;color:#17379d;margin:0 0 5px}
.epb .epb-edition-pro h3{color:#5d36b4}
.epb .epb-edition-lead{font-size:12px;line-height:1.55;color:#51658e;margin:0}
.epb .epb-edition-points{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.epb .epb-edition-points span{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:5px 8px;border-radius:8px;background:#eff5ff;color:#25469f;font-weight:700;font-size:11px;line-height:1.35}
.epb .epb-edition-pro .epb-edition-points span{background:#f5edff;color:#643bb0}
.epb .epb-edition-points b{color:#079a74;font-weight:900}
.epb .epb-edition-pro .epb-edition-points b{color:#a27800}
.epb .epb-edition-more{margin-top:10px;border-top:1px solid #eae0f8;padding-top:8px;font-size:12px;color:#594784}
.epb .epb-edition-more summary{cursor:pointer;display:list-item;list-style-position:inside;font-weight:800;color:#5237b9;padding:3px 0;user-select:none}
.epb .epb-edition-more summary:focus-visible{outline:3px solid #b4a0ff;border-radius:5px;outline-offset:2px}
.epb .epb-edition-more ul{margin:7px 0 4px;padding:0 0 0 21px;line-height:1.75;color:#56628b}
.epb .epb-edition-more li+li{margin-top:2px}
.epb .epb-edition-more strong{color:#4e388b}
.epb .epb-edition-foot{font-size:11px;line-height:1.55;color:#8b6c9f;margin-top:7px}
@media(max-width:720px){.epb .epb-editions{grid-template-columns:1fr}.epb .epb-edition{padding:13px 14px}.epb .epb-edition h3{font-size:15px}}
@media(max-width:880px){.epb .epb-columns,.epb .epb-film-main{grid-template-columns:1fr}.epb .epb-hero{padding:17px}.epb .epb-card{padding:14px}}
@media(max-width:530px){.epb table{min-width:0;table-layout:fixed;font-size:11px}.epb th{white-space:normal;line-height:1.3;padding:7px 5px}.epb td{padding:8px 5px}.epb{font-size:13px}.epb .epb-brand-icon{height:43px;width:43px;font-size:27px;border-radius:11px}.epb .epb-tabs{gap:5px;padding:7px}.epb .epb-tab{flex:1 1 auto;padding:9px 8px;min-height:40px;font-size:12px}.epb .epb-form{gap:9px}.epb .epb-field{font-size:11px}.epb .epb-results,.epb .epb-film-values{gap:8px}.epb .epb-kpi{padding:10px}.epb .epb-kpi small{min-height:36px}}
`;

function inputField(label, key, value, unit = '', attrs = '') {
  return `<label class="epb-field"><span>${label}${unit ? ` <span class="epb-unit">(${unit})</span>` : ''}</span><input type="number" data-epb-field="${key}" inputmode="decimal" value="${value}" ${attrs}></label>`;
}
function kpi(label, key, unit, color = '') {
  return `<div class="epb-kpi ${color}"><small>${label}</small><strong data-epb-out="${key}">—</strong><em>${unit}</em></div>`;
}

export function mount(root, ctx = {}) {
  if (!root || typeof root.querySelector !== 'function') throw new Error('Không tìm thấy vùng hiển thị Paint Studio.');
  ACTIVE_MOUNTS.get(root)?.abort();
  const controller = new AbortController();
  ACTIVE_MOUNTS.set(root, controller);
  if (ctx?.signal) {
    if (ctx.signal.aborted) controller.abort();
    else ctx.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  root.innerHTML = `<style>${STYLE}</style><div class="epb">
    <header class="epb-hero">
      <div><div class="epb-eyebrow">EPSILON SOFT · TIỆN ÍCH MIỄN PHÍ</div>
        <h2>Paint Studio <span>Basic</span></h2>
        <p>Tính lượng sơn nhanh, quy đổi chiều dày sơn ướt – khô và tính diện tích chi tiết cơ bản.</p></div>
      <div class="epb-brand-icon" aria-hidden="true">🎨</div>
    </header>
    <section class="epb-editions" aria-label="Giới thiệu tính năng Basic và kế hoạch Pro">
      <article class="epb-edition epb-edition-basic">
        <div class="epb-edition-head"><span class="epb-edition-chip">✓ BASIC · MIỄN PHÍ</span></div>
        <h3>3 công cụ thiết thực, sử dụng ngay</h3>
        <p class="epb-edition-lead">Dành cho dự toán nhanh một loại sơn và các phép tính kỹ thuật thường dùng. Không cần đăng nhập, không tải dữ liệu lên máy chủ.</p>
        <div class="epb-edition-points">
          <span><b>✓</b> Lượng sơn · số lon · kg</span>
          <span><b>✓</b> Quy đổi WFT ↔ DFT</span>
          <span><b>✓</b> Diện tích hình cơ bản</span>
        </div>
      </article>
      <article class="epb-edition epb-edition-pro">
        <div class="epb-edition-head"><span class="epb-edition-chip epb-edition-chip-pro">✦ PRO · EPSILON LAB</span><span class="epb-edition-status">ĐỊNH HƯỚNG · CHƯA PHÁT HÀNH</span></div>
        <h3>Giải pháp chuyên sâu cho sơn công nghiệp</h3>
        <p class="epb-edition-lead">Phát triển quy trình sơn và định mức theo hệ sơn thực tế, có quản lý sản phẩm và tài liệu của hãng.</p>
        <div class="epb-edition-points">
          <span><b>✦</b> Thư viện Hempel / International Paint</span>
          <span><b>✦</b> Quy trình thi công & QC</span>
          <span><b>✦</b> Định mức, pha sơn & dự toán</span>
        </div>
        <details class="epb-edition-more">
          <summary>Xem phạm vi tính năng Pro dự kiến</summary>
          <ul>
            <li><strong>TDS và vật tư:</strong> quản lý mã sơn, VS, DFT, tỷ trọng, thinner, quy cách và phiên bản tài liệu.</li>
            <li><strong>Pha chế:</strong> tỷ lệ A/B theo thể tích hoặc khối lượng, pot life và số mẻ pha.</li>
            <li><strong>Hệ sơn:</strong> nhiều lớp, định mức từng lớp, hao hụt theo phương pháp thi công.</li>
            <li><strong>Quy trình:</strong> chuẩn bị bề mặt, môi trường, thi công, thời gian sơn phủ và checklist.</li>
            <li><strong>Chất lượng:</strong> WFT/DFT thực đo, ghi nhận sai lệch, hồ sơ và báo cáo nghiệm thu.</li>
            <li><strong>Dự án:</strong> dự toán vật tư, chi phí, tiêu hao thực tế và rút kinh nghiệm định mức.</li>
          </ul>
          <p class="epb-edition-foot">Thông số và điều kiện áp dụng sẽ dựa trên TDS, quy trình hãng sơn và specification được duyệt; đây là kế hoạch, không phải chức năng của Basic.</p>
        </details>
      </article>
    </section>
    <nav class="epb-tabs" role="tablist" aria-label="Chức năng Paint Studio">
      <button type="button" class="epb-tab" role="tab" data-epb-tab="quick" aria-selected="true">▣ Lượng sơn</button>
      <button type="button" class="epb-tab" role="tab" data-epb-tab="film" aria-selected="false">↔ WFT / DFT</button>
      <button type="button" class="epb-tab" role="tab" data-epb-tab="area" aria-selected="false">▱ Diện tích</button>
    </nav>
    <section class="epb-panel" data-epb-panel="quick" role="tabpanel">
      <div class="epb-columns">
        <div class="epb-card"><h3>Ước tính lượng sơn</h3>
          <p class="epb-hint">Tính cho <b>một loại sơn có cùng định mức mỗi lượt</b>. Nhập diện tích thực tế và thông số hãng sơn cung cấp.</p>
          <div class="epb-form">
            ${inputField('Diện tích cần sơn','area',100,'m²','min="0" step="any"')}
            ${inputField('Số lượt sơn','coats',2,'lượt','min="1" max="30" step="1"')}
            ${inputField('Định mức mỗi lượt','coverage',10,'m²/L','min="0.01" step="any"')}
            ${inputField('Hao hụt khi thi công','loss',10,'% lượng sơn chuẩn bị','min="0" max="94" step="any"')}
            ${inputField('Tỷ trọng sơn','density',1.2,'kg/L','min="0.01" step="any"')}
            ${inputField('Quy cách đóng lon','pack',5,'L/lon','min="0.1" step="any"')}
          </div>
          <p class="epb-error" data-epb-error="quick" hidden role="alert"></p>
          <div class="epb-info"><strong>Cách tính:</strong> Lượng lý thuyết = diện tích × số lượt / định mức.
            Lượng chuẩn bị = lý thuyết ÷ (1 − hao hụt/100). Số lon làm tròn lên theo dung tích.</div>
        </div>
        <div class="epb-card"><h3>Kết quả dự toán</h3><p class="epb-hint">Giá trị ước lượng cho loại sơn đang nhập.</p>
          <div class="epb-results">
            ${kpi('Lượng sơn cần chuẩn bị','quick-practical','L','epb-prime')}
            ${kpi('Khối lượng tương ứng','quick-kg','kg','epb-purple')}
            ${kpi('Lượng sơn lý thuyết','quick-theoretical','L')}
            ${kpi('Số lon cần mua','quick-cans','lon')}
            ${kpi('Tổng lượng mua','quick-purchased','L')}
            ${kpi('Phần dư theo quy cách','quick-surplus','L')}
          </div>
          <div class="epb-info">Định mức là <strong>m²/L cho một lượt</strong>, không phải tổng nhiều lớp sơn khác sản phẩm. Dự toán không thay thế định mức thi công được phê duyệt.</div>
        </div>
      </div>
    </section>
    <section class="epb-panel" data-epb-panel="film" role="tabpanel" hidden>
      <div class="epb-film-main">
        <div class="epb-card"><h3>Quy đổi chiều dày WFT ↔ DFT</h3>
          <p class="epb-hint">Dùng <strong>Volume Solids (VS theo thể tích)</strong> của sơn đã trộn đúng tỷ lệ A/B từ TDS.</p>
          <div class="epb-form">
            <label class="epb-field epb-span-2"><span>Chiều quy đổi</span>
              <select data-epb-field="direction"><option value="wft">WFT đo → DFT dự kiến</option><option value="dft">DFT mục tiêu → WFT cần đạt</option></select></label>
            ${inputField('WFT đã đo','film-value',200,'µm','min="0.1" step="any"')}
            ${inputField('Volume Solids (VS)','solids',65,'% thể tích','min="1" max="100" step="any"')}
            ${inputField('Dung môi pha thêm','thinning',0,'% so với sơn gốc','min="0" max="100" step="any"')}
            <label class="epb-field"><span>Bước bảng tra <span class="epb-unit">(µm)</span></span>
              <select data-epb-field="step"><option value="25">25</option><option value="50" selected>50</option><option value="100">100</option></select></label>
          </div><p class="epb-error" data-epb-error="film" hidden role="alert"></p>
          <div class="epb-info"><strong>Nguyên lý:</strong> DFT = WFT × VS / (100 + % dung môi pha thêm).
            Dung môi tính theo % thể tích sơn gốc <em>đã pha đúng tỷ lệ A/B</em>, không phải tổng hỗn hợp sau pha thêm.</div>
        </div>
        <div class="epb-card"><h3>Kết quả quy đổi</h3><p class="epb-hint">Giá trị lý thuyết, chưa tính sai số đo và điều kiện thi công.</p>
          <div class="epb-film-values">${kpi('Chiều dày màng ướt','film-wft','µm')}
            ${kpi('Chiều dày màng khô','film-dft','µm','epb-prime')}</div>
          <div class="epb-solidsbar"><i data-epb-solidsbar></i></div>
          <div class="epb-barlegend"><span>🟦 Chất rắn hiệu dụng: <b data-epb-out="film-solids">—</b>%</span>
          <span>🟨 Phần bay hơi lý thuyết: <b data-epb-out="film-volatile">—</b>%</span></div>
          <div class="epb-info">Để đạt DFT mục tiêu, nên tính WFT cần thi công rồi kiểm tra thực tế theo TDS và specification.</div>
        </div>
      </div>
      <div class="epb-card" style="margin-top:13px"><h3>Bảng tra nhanh</h3>
        <div class="epb-actions" style="margin-top:3px"><label class="epb-field" style="min-width:185px"><span>Hướng bảng tra</span>
        <select data-epb-field="tableMode"><option value="wft">WFT → DFT</option><option value="dft">DFT → WFT</option></select></label></div>
        <div class="epb-gridtable"><table><thead><tr><th data-epb-table-head>WFT đầu vào (µm)</th><th data-epb-table-unthin>DFT không pha (µm)</th><th data-epb-table-thin>DFT sau pha (µm)</th></tr></thead><tbody data-epb-table-body></tbody></table></div>
        <p class="epb-hint" style="margin-top:10px">Các giá trị chỉ mang tính lý thuyết. Không lấy VS theo khối lượng thay cho VS theo thể tích.</p>
      </div>
    </section>
    <section class="epb-panel" data-epb-panel="area" role="tabpanel" hidden>
      <div class="epb-columns">
        <div class="epb-card"><h3>Diện tích một loại chi tiết</h3><p class="epb-hint">Đơn vị kích thước là <strong>mm</strong>. Chọn hình cơ bản, nhập số lượng để ước tính tổng diện tích sơn.</p>
          <div class="epb-form">
            <label class="epb-field epb-span-2"><span>Hình dạng</span><select data-epb-field="shape">
              <option value="plate">Tấm phẳng</option><option value="box">Hộp chữ nhật kín</option>
              <option value="cylinder">Trụ tròn</option><option value="pipe">Ống tròn</option></select></label>
            ${inputField('Chiều dài A','geom-a',2000,'mm','min="0.01" step="any"')}
            ${inputField('Chiều rộng B','geom-b',1000,'mm','min="0.01" step="any"')}
            <div data-epb-c-wrap>${inputField('Chiều dày C','geom-c',8,'mm','min="0" step="any"')}</div>
            ${inputField('Số lượng chi tiết','geom-qty',1,'chi tiết','min="1" max="1000000" step="1"')}
          </div>
          <div class="epb-opts" data-epb-geom-opts></div>
          <p class="epb-error" data-epb-error="area" hidden role="alert"></p>
          <div class="epb-info">Diện tích hình học <strong>chưa trừ lỗ rỗng, vùng che khuất, bề mặt tiếp xúc hoặc diện tích chồng lấn</strong>. Hệ sơn thực tế cần kiểm tra bản vẽ và yêu cầu kỹ thuật.</div>
        </div>
        <div class="epb-card"><h3>Kết quả diện tích</h3><p class="epb-hint">Ước tính hình học cho một loại chi tiết.</p>
          <div class="epb-results">
            ${kpi('Diện tích một chi tiết','geom-single','m²','epb-purple')}
            ${kpi('Tổng diện tích','geom-total','m²','epb-prime')}
          </div><div class="epb-actions"><button class="epb-btn epb-btn-primary" type="button" data-epb-apply>✓ Dùng diện tích này để tính sơn</button></div>
          <p class="epb-note" data-epb-note hidden role="status"></p>
        </div>
      </div>
    </section>
    <footer class="epb-bottom"><strong>Lưu ý kỹ thuật:</strong> Các kết quả Basic là ước tính phục vụ tra cứu nhanh; luôn ưu tiên <strong>TDS/PDS của hãng sơn</strong> và specification của dự án. <strong>Paint Studio Pro – Epsilon Lab</strong> là kế hoạch phát triển chuyên sâu, chưa phát hành.</footer>
  </div>`;

  const $ = selector => root.querySelector(selector);
  const $$ = selector => Array.from(root.querySelectorAll(selector));
  const read = name => $(`[data-epb-field="${name}"]`)?.value;
  const output = (key, text) => {
    const el = $(`[data-epb-out="${key}"]`);
    if (el) el.textContent = text;
  };
  const err = (mode, message) => {
    const el = $(`[data-epb-error="${mode}"]`);
    el.textContent = message || '';
    el.hidden = !message;
  };
  let currentMode = 'quick';
  let lastArea = null;

  function showMode(mode) {
    if (!['quick', 'film', 'area'].includes(mode)) return;
    currentMode = mode;
    $$('[data-epb-tab]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.epbTab === mode)));
    $$('[data-epb-panel]').forEach(panel => panel.hidden = panel.dataset.epbPanel !== mode);
    update();
  }

  function updateQuick() {
    try {
      const result = calculateQuick({area:read('area'),coats:read('coats'),coverage:read('coverage'),
        loss:read('loss'),density:read('density'),pack:read('pack')});
      output('quick-practical',format(result.practical,2));
      output('quick-kg',format(result.kg,2));
      output('quick-theoretical',format(result.theoretical,2));
      output('quick-cans',format(result.cans,0));
      output('quick-purchased',format(result.purchased,2));
      output('quick-surplus',format(Math.max(0,result.surplus),2));
      err('quick', '');
    } catch (e) {
      ['quick-practical','quick-kg','quick-theoretical','quick-cans','quick-purchased','quick-surplus'].forEach(key=>output(key,'—'));
      err('quick',e.message);
    }
  }
  function updateFilm() {
    try {
      const r = calculateFilmThickness({direction:read('direction'),value:read('film-value'),
        solids:read('solids'),thinning:read('thinning'),tableMode:read('tableMode'),step:read('step')});
      const valueLabel = $('[data-epb-field="film-value"]').closest('label').querySelector('span');
      valueLabel.innerHTML = r.direction === 'wft' ? 'WFT đã đo <span class="epb-unit">(µm)</span>' : 'DFT mục tiêu <span class="epb-unit">(µm)</span>';
      output('film-wft',format(r.wft,1));
      output('film-dft',format(r.dft,1));
      output('film-solids',format(r.effectiveSolids,1));
      output('film-volatile',format(100-r.effectiveSolids,1));
      $('[data-epb-solidsbar]').style.width = `${r.effectiveSolids}%`;
      $('[data-epb-table-head]').textContent = `${r.tableMode.toUpperCase()} đầu vào (µm)`;
      const resultType = r.tableMode==='wft'?'DFT':'WFT';
      $('[data-epb-table-unthin]').textContent=`${resultType} không pha (µm)`;
      $('[data-epb-table-thin]').textContent=`${resultType} sau pha (µm)`;
      // All table content is computed from validated numeric input.
      $('[data-epb-table-body]').innerHTML = r.table.map(row =>
        `<tr><td>${format(row.input,0)}</td><td>${format(row.unthinned,1)}</td><td>${format(row.thinned,1)}</td></tr>`).join('');
      err('film','');
    } catch(e) {
      ['film-wft','film-dft','film-solids','film-volatile'].forEach(key=>output(key,'—'));
      $('[data-epb-solidsbar]').style.width='0';
      $('[data-epb-table-body]').textContent='';
      err('film',e.message);
    }
  }

  function updateAreaOpts() {
    const shape = read('shape');
    const captions = {
      plate:['Chiều dài A','Chiều rộng B','Chiều dày C'],
      box:['Chiều dài A','Chiều rộng B','Chiều cao C'],
      cylinder:['Đường kính D','Chiều dài L',''],
      pipe:['Đường kính ngoài D','Chiều dài L','Đường kính trong d']
    };
    const labels = captions[shape] || captions.plate;
    ['geom-a','geom-b','geom-c'].forEach((key,index)=>{
      const field = $(`[data-epb-field="${key}"]`);
      const title = field?.closest('label')?.querySelector('span');
      if (title) title.textContent = `${labels[index]} (mm)`;
    });
    $('[data-epb-c-wrap]').hidden = shape === 'cylinder';
    const opts = $('[data-epb-geom-opts]');
    if (shape === 'plate') opts.innerHTML = `<label><input type="checkbox" data-epb-flag="bothFaces" checked> Sơn cả 2 mặt</label><label><input type="checkbox" data-epb-flag="edges"> Tính cả cạnh</label>`;
    else if (shape === 'box') opts.textContent = 'Tính 6 mặt ngoài của hộp kín.';
    else if (shape === 'cylinder') opts.innerHTML = `<label><input type="checkbox" data-epb-flag="ends"> Tính cả 2 đáy</label>`;
    else opts.innerHTML = `<label><input type="checkbox" data-epb-flag="inside"> Sơn cả mặt trong</label><label><input type="checkbox" data-epb-flag="ends"> Tính vành 2 đầu</label>`;
  }
  function updateArea() {
    try {
      const flag = name => Boolean($(`[data-epb-flag="${name}"]`)?.checked);
      lastArea = calculateSimpleArea({shape:read('shape'),a:read('geom-a'),b:read('geom-b'),
        c:read('geom-c'),qty:read('geom-qty'),bothFaces:flag('bothFaces'),edges:flag('edges'),
        ends:flag('ends'),inside:flag('inside')});
      output('geom-single',format(lastArea.single,4));
      output('geom-total',format(lastArea.total,4));
      $('[data-epb-apply]').disabled = false;
      err('area','');
    } catch(e) {
      lastArea = null;
      output('geom-single','—');output('geom-total','—');
      $('[data-epb-apply]').disabled = true;
      err('area',e.message);
    }
  }
  function update() {
    if (currentMode === 'quick') updateQuick();
    else if (currentMode === 'film') updateFilm();
    else updateArea();
  }
  root.addEventListener('click', event => {
    const tab = event.target.closest('[data-epb-tab]');
    if (tab && root.contains(tab)) { showMode(tab.dataset.epbTab); return; }
    const apply = event.target.closest('[data-epb-apply]');
    if (apply && root.contains(apply) && lastArea) {
      $('[data-epb-field="area"]').value = String(lastArea.total);
      showMode('quick');
    }
  }, {signal:controller.signal});
  root.addEventListener('input', event => {
    if (!event.target.closest('[data-epb]') && !event.target.closest('.epb')) return;
    update();
  }, {signal:controller.signal});
  root.addEventListener('change', event => {
    if (event.target.matches('[data-epb-field="shape"]')) updateAreaOpts();
    update();
  }, {signal:controller.signal});
  updateAreaOpts();
  updateQuick();
}
