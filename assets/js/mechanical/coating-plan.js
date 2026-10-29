/**
 * COATING PLAN v2.3 (nhóm Cơ khí – VIP) – trước là "Paint Studio" (paint.js), đổi tên 28/10/2026.
 * Tên file: coating-plan.js. Gồm sơn công nghiệp nhiều lớp, mạ nhúng nóng, mạ điện phân, zinc flake và phun phủ kim loại.
 * Giữ nguyên các hàm tính sơn nhanh, WFT/DFT và diện tích của bản nền đã xác nhận.
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

/** Multi-layer paint system. The user must supply each product's TDS properties. */
export function calculateMultiCoat(p) {
  const area = numberInRange(p.area, 'diện tích hệ sơn', 0, 1e8);
  if (!Array.isArray(p.layers) || !p.layers.length || p.layers.length > 10) throw new Error('Hệ sơn cần từ 1 đến 10 lớp.');
  const layers = p.layers.map((layer, i) => {
    const name = String(layer.name || `Lớp ${i + 1}`).trim().slice(0, 80);
    const dft = numberInRange(layer.dft, `DFT lớp ${i + 1}`, 0.1, 3000);
    const solids = numberInRange(layer.solids, `VS lớp ${i + 1}`, 1, 100);
    const loss = numberInRange(layer.loss, `hao hụt lớp ${i + 1}`, 0, 94.99);
    const density = numberInRange(layer.density, `tỷ trọng lớp ${i + 1}`, 0.01, 10);
    const pack = numberInRange(layer.pack, `quy cách lon lớp ${i + 1}`, 0.1, 1000);
    // 1m² x 1µm = 1mL of dry coating. Theoretical volume L = area × DFT × 0.1 / VS(%).
    const theoretical = area * dft / (10 * solids);
    const practical = theoretical / (1 - loss / 100);
    const cans = practical === 0 ? 0 : Math.ceil(practical / pack - 1e-10);
    return {name, dft, solids, loss, density, pack, wft: dft * 100 / solids,
      coverage: solids * 10 / dft, theoretical, practical, kg: practical * density,
      cans, purchase: cans * pack};
  });
  return {area, layers, totalDFT:layers.reduce((s,l)=>s+l.dft,0),
    totalTheoretical:layers.reduce((s,l)=>s+l.theoretical,0),
    totalPractical:layers.reduce((s,l)=>s+l.practical,0),
    totalKg:layers.reduce((s,l)=>s+l.kg,0),
    totalCans:layers.reduce((s,l)=>s+l.cans,0)};
}

/** A/B mix ratios refer to the unit stated by the manufacturer: volume OR mass, never interchangeable. */
export function calculateMixing(p) {
  const totalBase = numberInRange(p.totalBase, 'lượng A+B', 0.01, 100000);
  const a = numberInRange(p.partA, 'tỷ lệ thành phần A', 0.001, 1000);
  const b = numberInRange(p.partB, 'tỷ lệ thành phần B', 0.001, 1000);
  const thinning = numberInRange(p.thinning ?? 0, 'dung môi pha thêm', 0, 100);
  const potLife = numberInRange(p.potLife, 'pot life', 0.05, 168);
  const consumption = numberInRange(p.consumption, 'tốc độ sử dụng', 0.01, 100000);
  const reserve = numberInRange(p.reserve, 'hệ số an toàn pot life', 10, 100);
  const unit = p.unit === 'kg' ? 'kg' : 'L';
  if (p.unit !== 'kg' && p.unit !== 'L') throw new Error('Đơn vị pha không hợp lệ.');
  const A = totalBase * a / (a + b), B = totalBase * b / (a + b);
  const thinner = totalBase * thinning / 100;
  const usableTime = potLife * reserve / 100;
  const suggestedBatch = Math.min(totalBase, usableTime * consumption);
  const batches = Math.ceil(totalBase / suggestedBatch - 1e-10);
  return {unit, A, B, thinner, totalBase, totalReady:totalBase+thinner, usableTime, suggestedBatch, batches};
}

/** Simple project-threshold screening, NOT ISO 19840 / SSPC-PA 2 acceptance sampling. */
export function calculateDFTScreen(p) {
  const lower = numberInRange(p.lower, 'DFT tối thiểu', 0, 10000);
  const upper = numberInRange(p.upper, 'DFT tối đa', 0, 10000);
  const correction = numberInRange(p.correction ?? 0, 'hiệu chỉnh thiết bị/độ nhám', 0, 100);
  if (lower > upper) throw new Error('DFT tối đa phải lớn hơn hoặc bằng DFT tối thiểu.');
  const tokens = String(p.readings ?? '').trim().split(/[\s,;]+/).filter(Boolean);
  if (!tokens.length || tokens.length > 1000) throw new Error('Nhập từ 1 đến 1000 giá trị DFT, cách nhau bằng dấu cách, dấu phẩy hoặc xuống dòng.');
  const rows = tokens.map((value,index) => {
    const measured = numberInRange(value, `kết quả đo ${index+1}`, 0, 10000);
    const adjusted = measured - correction;
    return {measured, adjusted, ok: adjusted >= lower && adjusted <= upper};
  });
  const adjusted = rows.map(x=>x.adjusted);
  return {rows, count:rows.length, pass:rows.filter(x=>x.ok).length,
    fail:rows.filter(x=>!x.ok).length,
    min:Math.min(...adjusted), max:Math.max(...adjusted),
    average:adjusted.reduce((a,b)=>a+b,0)/adjusted.length,
    lower, upper, correction};
}

/** ISO 1461:2022 Table 3: non-centrifuged fabricated steel and castings. µm values. */
export function hotDip1461Requirement(kind, thickness) {
  const t = numberInRange(thickness, 'chiều dày thép/chi tiết', 0.01, 1000);
  if (kind === 'steel') {
    if (t > 6) return {local:70, mean:85, band:'Thép > 6 mm'};
    if (t > 3) return {local:55, mean:70, band:'Thép > 3 đến ≤ 6 mm'};
    if (t >= 1.5) return {local:45, mean:55, band:'Thép ≥ 1,5 đến ≤ 3 mm'};
    return {local:35, mean:45, band:'Thép < 1,5 mm'};
  }
  if (kind === 'casting') return t > 6
    ? {local:70, mean:80, band:'Vật đúc > 6 mm'}
    : {local:60, mean:70, band:'Vật đúc ≤ 6 mm'};
  throw new Error('Chỉ hỗ trợ thép thành phẩm và vật đúc không quay ly tâm theo Bảng 3 ISO 1461:2022.');
}

/** Nominal zinc-coating density = 7.2 g/cm³ for ISO 1461 mass/thickness conversion. */
export function calculateHotDip(p) {
  const area = numberInRange(p.area, 'diện tích cần mạ', 0, 1e8);
  const steelThickness = numberInRange(p.steelThickness, 'chiều dày thép', 0.01, 1000);
  const kind = p.kind || 'steel';
  const reference = hotDip1461Requirement(kind, steelThickness);
  const thickness = numberInRange(p.thickness, 'chiều dày dự toán', 0.1, 1000);
  const steelMass = numberInRange(p.steelMass ?? 0, 'khối lượng chi tiết trước mạ', 0, 1e9);
  const nominalCoatingKg = area * thickness * 0.0072;
  const minReferenceCoatingKg = area * reference.mean * 0.0072;
  const local = p.local === '' || p.local == null ? null : numberInRange(p.local, 'DFT cục bộ', 0, 1000);
  const mean = p.mean === '' || p.mean == null ? null : numberInRange(p.mean, 'DFT trung bình', 0, 1000);
  const screening = local === null || mean === null ? null : (local >= reference.local && mean >= reference.mean);
  return {area,steelThickness,kind,reference,thickness,steelMass,nominalCoatingKg,
    minReferenceCoatingKg, massAfter:steelMass + nominalCoatingKg,
    increase:steelMass>0 ? nominalCoatingKg/steelMass*100 : null, local,mean,screening};
}

/** Pure metal data for a first-order Faraday-law estimate. Do not use for zinc-alloy deposition. */
export const ELECTRO_METALS = Object.freeze({
  zinc:{name:'Kẽm (Zn)',molarMass:65.38,valence:2,density:7.14},
  nickel:{name:'Niken (Ni)',molarMass:58.6934,valence:2,density:8.90},
  copper:{name:'Đồng (Cu)',molarMass:63.546,valence:2,density:8.96},
  tin:{name:'Thiếc (Sn²⁺)',molarMass:118.71,valence:2,density:7.31}
});
export function calculateElectro(p) {
  const metal = ELECTRO_METALS[p.metal];
  if (!metal) throw new Error('Kim loại điện phân không được hỗ trợ trong tính Faraday.');
  const area = numberInRange(p.area,'diện tích điện phân',0.001,1e8);
  const thickness = numberInRange(p.thickness,'chiều dày lớp mạ',0.01,500);
  const efficiency = numberInRange(p.efficiency,'hiệu suất dòng điện',0.01,100);
  const currentDensity = numberInRange(p.currentDensity,'mật độ dòng điện',0.001,200);
  const massGrams = area * thickness * metal.density;
  const current = area * 100 * currentDensity;
  const seconds = massGrams * metal.valence * 96485.33212 / (metal.molarMass * current * efficiency / 100);
  return {metal,area,thickness,efficiency,currentDensity,current,massGrams,massKg:massGrams/1000,
    seconds,minutes:seconds/60,hours:seconds/3600};
}

/** Zinc flake: generic dry-film mass estimate from specified density, not ISO 10683 acceptance. */
export function calculateFlake(p) {
  const area = numberInRange(p.area,'diện tích',0,1e8);
  const dft = numberInRange(p.dft,'tổng DFT',0.1,500);
  const coats = numberInRange(p.coats,'số lượt phủ',1,12,true);
  const density = numberInRange(p.density,'tỷ trọng màng khô do nhà cung cấp công bố',0.1,15);
  const loss = numberInRange(p.loss,'hao hụt',0,94.99);
  const massDryKg = area*dft*density/1000;
  return {area,dft,coats,density,loss,perCoatDFT:dft/coats,massDryKg,
    dryEquivalentPreparedKg:massDryKg/(1-loss/100)};
}

/** Thermal spray: first-order deposition mass balance, independent of powder/wire feed calibration. */
export const THERMAL_MATERIALS = Object.freeze({
  zinc:{name:'Zn',density:7.14},aluminium:{name:'Al',density:2.70},
  znal8515:{name:'Zn/Al 85:15 (khối lượng)',density:1/(.85/7.14+.15/2.70)}
});
export function calculateThermal(p) {
  const material=THERMAL_MATERIALS[p.material];if(!material)throw new Error('Vật liệu phun phủ không hợp lệ.');
  const area=numberInRange(p.area,'diện tích',0,1e8);
  const thickness=numberInRange(p.thickness,'chiều dày phun',0.1,2000);
  const deposition=numberInRange(p.deposition,'hiệu suất bám phủ',0.1,100);
  const depositedKg=area*thickness*material.density/1000;
  return {material,area,thickness,deposition,depositedKg,
    feedKg:depositedKg/(deposition/100),lossKg:depositedKg/(deposition/100)-depositedKg};
}

const escHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Source registry: only official ISO pages, no downloaded copyrighted standards. */
const COATING_SOURCES = Object.freeze([
  ['ISO 12944-5:2019 · Hệ sơn bảo vệ','https://www.iso.org/standard/77795.html'],
  ['ISO 19840:2012 · Đo và đánh giá DFT','https://www.iso.org/standard/59523.html'],
  ['ISO 1461:2022 · Mạ kẽm nhúng nóng','https://www.iso.org/standard/81435.html'],
  ['ISO 14713-2:2019 · Thiết kế cho mạ nhúng nóng','https://www.iso.org/standard/71136.html'],
  ['ISO 19598:2016 · Mạ điện phân Zn/Zn-alloy không Cr(VI)','https://www.iso.org/standard/65445.html'],
  ['ISO 4042:2022 + Amd 1:2026 · Mạ điện phân bu lông','https://www.iso.org/standard/77913.html'],
  ['ISO 10684:2004 · Mạ nhúng nóng bu lông','https://www.iso.org/standard/36897.html'],
  ['ISO 10683:2018 · Zinc flake cho bu lông','https://www.iso.org/standard/70609.html'],
  ['ISO 2063-2:2017 · Phun phủ kim loại','https://www.iso.org/standard/61894.html'],
  ['ISO 9227:2022 · Thử phun muối','https://www.iso.org/standard/81744.html']
]);

const STYLE = `
.epb,.epb *{box-sizing:border-box}
.epb{--epb-navy:#142b82;--epb-blue:#2145cd;--epb-violet:#6744df;--epb-gold:#ffdc35;--epb-ink:#182a59;--epb-muted:#64759b;--epb-border:#dbe5fa;font:16px/1.48 system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:var(--epb-ink);max-width:1320px;width:100%;margin:0 auto}
.epb button,.epb input,.epb select{font:inherit}
.epb button{cursor:pointer}
.epb button:focus-visible,.epb input:focus-visible,.epb select:focus-visible{outline:3px solid #99b4ff;outline-offset:2px}
.epb :is(h2,h3,p){margin:0}
.epb .epb-hero{background:linear-gradient(119deg,#10268f 0%,#2544d3 49%,#6e42df 100%);border-radius:16px;color:white;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:19px 22px;overflow:hidden;position:relative}
.epb .epb-hero:before{content:'';position:absolute;width:230px;height:230px;right:40px;top:-175px;border-radius:50%;background:#ffffff24;pointer-events:none}
.epb .epb-eyebrow{color:#d2e4ff;font-size:16px;font-weight:750;letter-spacing:.11em}
.epb .epb-hero h2{font-size:clamp(22px,2.5vw,29px);letter-spacing:-.6px;color:white;line-height:1.2;margin:5px 0}
.epb .epb-hero h2 span{color:var(--epb-gold)}
.epb .epb-hero p{color:#e3ecff;font-size:16px;max-width:760px}
.epb .epb-brand-icon{height:58px;width:58px;flex-shrink:0;display:grid;place-items:center;color:#ffd72d;border:2px solid #ffd72d;background:#0a1679;border-radius:15px;font-size:34px;font-family:'Segoe UI Emoji',system-ui,sans-serif;font-weight:600;font-style:normal;box-shadow:0 8px 20px #111d6a70}
.epb .epb-tabs{display:flex;gap:8px;flex-wrap:wrap;background:#f4f6ff;padding:10px;border:1px solid var(--epb-border);border-radius:14px;margin:13px 0}
.epb .epb-tab{border:1px solid #d9e3fa;background:white;padding:9px 16px;border-radius:11px;font-weight:750;color:#42538a;min-height:42px;transition:background .15s,border-color .15s}
.epb .epb-tab[aria-selected=true]{color:white;background:linear-gradient(105deg,#5542e5,#1e44d1);border-color:transparent;box-shadow:0 4px 11px #493bdf30}
.epb .epb-panel[hidden]{display:none!important}
.epb .epb-columns{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(270px,.9fr);gap:13px;align-items:start}
.epb .epb-card{border:1px solid var(--epb-border);background:white;border-radius:15px;padding:17px;box-shadow:0 3px 14px #1f3b8710;min-width:0}
.epb .epb-card h3{font-size:17px;font-weight:820;color:#132d8d;margin-bottom:5px}
.epb .epb-hint{font-size:16px;color:var(--epb-muted);line-height:1.65;margin-bottom:13px}
.epb .epb-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
.epb .epb-field{display:flex;flex-direction:column;gap:5px;min-width:0;font-size:16px;font-weight:700;color:#3b4a75}
.epb .epb-field input,.epb .epb-field select{width:100%;height:41px;border-radius:9px;border:1px solid #d3dff6;color:#162c76;background:#fbfdff;padding:0 11px;min-width:0;font-size:16px;font-weight:650;outline:none}
.epb .epb-field input:focus,.epb .epb-field select:focus{border-color:#654ee7;box-shadow:0 0 0 3px #6744df18}
.epb .epb-field .epb-unit{color:#7181a5;font-weight:500}
.epb .epb-span-2{grid-column:1/-1}
.epb .epb-results{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:13px}
.epb .epb-kpi{background:#f3f6ff;border:1px solid #e0e9fa;border-radius:12px;padding:12px;min-width:0}
.epb .epb-kpi.epb-prime{background:linear-gradient(135deg,#edfaf6,#e5f5ee);border-color:#c7efdf}
.epb .epb-kpi.epb-purple{background:#f4f0ff;border-color:#e8dfff}
.epb .epb-kpi small{display:block;font-size:16px;color:#566897;font-weight:650;min-height:30px}
.epb .epb-kpi strong{font-size:clamp(19px,2vw,25px);color:#123798;line-height:1.3;display:block;word-break:break-word;font-variant-numeric:tabular-nums}
.epb .epb-prime strong{color:#078b6b}
.epb .epb-purple strong{color:#6b43cb}
.epb .epb-kpi em{font-size:16px;color:#687ba6;font-style:normal}
.epb .epb-info{margin-top:13px;background:#f1f5ff;border:1px solid #dde7ff;padding:11px 13px;border-radius:11px;font-size:16px;color:#475d93;line-height:1.65}
.epb .epb-info strong{color:#263d91}
.epb .epb-error{margin-top:12px;font-size:16px;color:#9a3150;background:#fff0f4;border:1px solid #ffd3df;padding:9px 11px;border-radius:9px;line-height:1.5}
.epb .epb-error[hidden],.epb .epb-note[hidden]{display:none!important}
.epb .epb-film-main{display:grid;grid-template-columns:1.05fr .95fr;gap:13px}
.epb .epb-film-values{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:13px}
.epb .epb-film-values .epb-kpi{padding:15px 12px}
.epb .epb-solidsbar{display:flex;overflow:hidden;height:14px;border-radius:99px;background:#f7e0a8;margin:13px 0 8px}
.epb .epb-solidsbar i{display:block;height:100%;background:linear-gradient(90deg,#2464ed,#51b7ff);width:65%;border-radius:99px;transition:width .15s}
.epb .epb-barlegend{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:16px;color:#647398}
.epb .epb-gridtable{border:1px solid #e0e8fa;border-radius:11px;overflow:auto;margin-top:12px;max-width:100%}
.epb table{border-collapse:collapse;width:100%;min-width:500px;font-size:16px;text-align:right}
.epb th{background:#edf3ff;color:#25429a;padding:10px 9px;white-space:nowrap;font-size:16px}
.epb td{padding:9px;border-top:1px solid #eef1f8;color:#304776;font-variant-numeric:tabular-nums}
.epb tr:nth-child(even) td{background:#fafbff}
.epb th:first-child,.epb td:first-child{text-align:left}
.epb .epb-opts{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:13px;padding:10px 12px;background:#f6f8ff;border:1px solid #e3eafb;border-radius:11px;color:#415483;font-weight:600;font-size:16px}
.epb .epb-opts label{display:flex;gap:7px;align-items:center;cursor:pointer}
.epb .epb-opts input{accent-color:#523ce4;width:16px;height:16px}
.epb .epb-btn{border:1px solid #d6e1fa;border-radius:10px;padding:11px 16px;background:white;color:#2144be;font-weight:780;min-height:42px}
.epb .epb-btn-primary{color:white;background:linear-gradient(105deg,#563ce2,#2241cc);border:0;box-shadow:0 4px 10px #3a3bd52b}
.epb .epb-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:13px}
.epb .epb-note{margin-top:12px;border-radius:10px;padding:10px 12px;border:1px solid #bde8d7;color:#13644f;background:#eafaf3;font-size:16px;font-weight:650}
.epb .epb-bottom{margin-top:13px;padding:12px 15px;border-radius:12px;border:1px solid #e5e6fc;background:linear-gradient(96deg,#f4f6ff,#fdf9e9);font-size:16px;color:#4e618c;line-height:1.65}
.epb .epb-bottom strong{color:#26388f}
/* Free/Pro feature introduction: informational only; no unavailable functions are enabled. */
.epb .epb-editions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0 2px;align-items:start}
.epb .epb-edition{border:1px solid #dbe6fc;border-radius:14px;padding:15px 16px 14px;min-width:0;overflow:hidden;position:relative;background:linear-gradient(135deg,#ffffff,#f5f8ff)}
.epb .epb-edition-pro{background:linear-gradient(119deg,#fffefa 0%,#fffaf0 53%,#f4f0ff 100%);border-color:#e9ddfd}
.epb .epb-edition-head{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
.epb .epb-edition-chip{display:inline-flex;align-items:center;gap:5px;line-height:1.2;padding:5px 9px;border-radius:100px;font-size:16px;font-weight:850;letter-spacing:.02em;background:#e8f2ff;border:1px solid #d5e5ff;color:#1846a9}
.epb .epb-edition-chip-pro{color:#5532b6;background:#eee5ff;border-color:#ddd0fa}
.epb .epb-edition-status{font-size:16px;font-weight:720;color:#7b568f;background:#f7edff;border:1px solid #eadcf6;padding:4px 8px;border-radius:100px}
.epb .epb-edition h3{font-size:16px;line-height:1.3;font-weight:850;letter-spacing:-.2px;color:#17379d;margin:0 0 5px}
.epb .epb-edition-pro h3{color:#5d36b4}
.epb .epb-edition-lead{font-size:16px;line-height:1.55;color:#51658e;margin:0}
.epb .epb-edition-points{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.epb .epb-edition-points span{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:5px 8px;border-radius:8px;background:#eff5ff;color:#25469f;font-weight:700;font-size:16px;line-height:1.35}
.epb .epb-edition-pro .epb-edition-points span{background:#f5edff;color:#643bb0}
.epb .epb-edition-points b{color:#079a74;font-weight:900}
.epb .epb-edition-pro .epb-edition-points b{color:#a27800}
.epb .epb-edition-more{margin-top:10px;border-top:1px solid #eae0f8;padding-top:8px;font-size:16px;color:#594784}
.epb .epb-edition-more summary{cursor:pointer;display:list-item;list-style-position:inside;font-weight:800;color:#5237b9;padding:3px 0;user-select:none}
.epb .epb-edition-more summary:focus-visible{outline:3px solid #b4a0ff;border-radius:5px;outline-offset:2px}
.epb .epb-edition-more ul{margin:7px 0 4px;padding:0 0 0 21px;line-height:1.75;color:#56628b}
.epb .epb-edition-more li+li{margin-top:2px}
.epb .epb-edition-more strong{color:#4e388b}
.epb .epb-edition-foot{font-size:16px;line-height:1.55;color:#8b6c9f;margin-top:7px}

/* Readability floor: no UI text smaller than 16px, including native small/sup/sub. */
.epb :is(small, sub, sup){font-size:max(16px, .833333em)}
@media(max-width:720px){.epb .epb-editions{grid-template-columns:1fr}.epb .epb-edition{padding:13px 14px}.epb .epb-edition h3{font-size:16px}}
@media(max-width:880px){.epb .epb-columns,.epb .epb-film-main{grid-template-columns:1fr}.epb .epb-hero{padding:17px}.epb .epb-card{padding:14px}}
@media(max-width:530px){.epb table{min-width:500px;table-layout:auto;font-size:16px}.epb th{white-space:normal;line-height:1.3;padding:7px 5px}.epb td{padding:8px 5px}.epb{font-size:16px}.epb .epb-brand-icon{height:43px;width:43px;font-size:27px;border-radius:11px}.epb .epb-tabs{gap:5px;padding:7px}.epb .epb-tab{flex:1 1 auto;padding:9px 8px;min-height:40px;font-size:16px}.epb .epb-form{gap:9px}.epb .epb-field{font-size:16px}.epb .epb-results,.epb .epb-film-values{gap:8px}.epb .epb-kpi{padding:10px}.epb .epb-kpi small{min-height:36px}}
/* Expanded coating workspaces: independent top-level groups with nested work tabs. */
.epb .epb-mainnav{display:flex;gap:9px;flex-wrap:wrap;padding:11px;margin:13px 0 10px;border-radius:15px;background:#edf2ff;border:1px solid #d9e3ff}
.epb .epb-mainbtn{border:1px solid #d7dffb;background:#fff;border-radius:12px;min-height:45px;padding:9px 14px;font-weight:800;color:#304897;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-align:center;font-size:16px}
.epb .epb-mainbtn[aria-selected=true]{background:linear-gradient(108deg,#512ad9,#2145cc);border-color:transparent;color:#fff;box-shadow:0 4px 12px #3f28b821}
.epb .epb-mainpanel[hidden],.epb [data-epb-subpanel][hidden]{display:none!important}
.epb .epb-subtabs{margin:0 0 13px;background:transparent;padding:3px 0;border:0;border-bottom:1px solid #e1e7f8;border-radius:0}
.epb .epb-sectionhead{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.epb .epb-sectionhead h3{margin:0 0 5px}
.epb .epb-inputs-tight{margin:10px 0}.epb .epb-inputs-tight .epb-field{max-width:340px}
.epb .epb-wide table{min-width:860px}.epb .epb-comparetable table{min-width:930px;text-align:left}
.epb .epb-comparetable td{vertical-align:top;min-width:140px;line-height:1.55}.epb .epb-comparetable td:first-child{min-width:170px}
.epb [data-epb-layer-rows] input{width:100%;min-width:90px;height:42px;padding:8px;border:1px solid #d1dff5;border-radius:8px;background:#fbfdff;color:#132a79;font-size:16px}
.epb [data-epb-layer-rows] input[data-layer-key=name]{min-width:148px}
.epb [data-epb-layer-rows] td{padding:6px}.epb [data-epb-layer-rows] .epb-remove{min-height:40px;min-width:41px;padding:3px 7px;border:1px solid #f5d4d4;background:#fff8f8;color:#9b3251;border-radius:8px}
.epb .epb-results-four{grid-template-columns:repeat(4,minmax(0,1fr))}
.epb .epb-field-block{margin-top:15px}.epb textarea{display:block;width:100%;border:1px solid #cfddf5;border-radius:10px;background:#fbfdff;color:#152c76;padding:11px 13px;line-height:1.55;min-height:120px;font-size:16px;resize:vertical}
.epb .epb-comparegrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}
.epb .epb-comparegrid article{border:1px solid #e1e7fa;border-radius:12px;background:#f8faff;padding:14px}
.epb .epb-comparegrid article strong{color:#1a359d;font-size:17px}.epb .epb-comparegrid article p{margin:7px 0 0;line-height:1.65;color:#445982}
.epb .epb-source-card{margin-top:13px}.epb .epb-sources{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.epb .epb-sources a{display:block;background:#f4f7ff;color:#2049a8;border:1px solid #dbe4fb;padding:10px 12px;border-radius:10px;font-size:16px;font-weight:650;overflow-wrap:anywhere}
.epb .epb-sources a:hover{text-decoration:underline;background:#e9f0ff}
.epb .epb-hint strong{font-weight:750}.epb .epb-input-note{font-size:16px;color:#60749f}
.epb .epb-footer-note{margin-top:14px}.epb .epb-kpi em{overflow-wrap:anywhere}
@media(max-width:900px){.epb .epb-results-four{grid-template-columns:repeat(2,minmax(0,1fr))}.epb .epb-mainbtn{flex:1 1 160px}}
@media(max-width:720px){.epb .epb-comparegrid,.epb .epb-sources{grid-template-columns:1fr}.epb .epb-mainbtn{flex:1 1 130px}.epb .epb-mainnav{padding:7px;gap:6px}.epb .epb-mainbtn{padding:8px 9px;min-height:41px}.epb .epb-sectionhead{align-items:stretch}}

`;

function inputField(label, key, value, unit = '', attrs = '') {
  return `<label class="epb-field"><span>${label}${unit ? ` <span class="epb-unit">(${unit})</span>` : ''}</span><input type="number" data-epb-field="${key}" inputmode="decimal" value="${value}" ${attrs}></label>`;
}
function kpi(label, key, unit, color = '') {
  return `<div class="epb-kpi ${color}"><small>${label}</small><strong data-epb-out="${key}">—</strong><em>${unit}</em></div>`;
}

export function mount(root, ctx = {}) {
  if (!root || typeof root.querySelector !== 'function') throw new Error('Không tìm thấy vùng hiển thị Coating Plan.');
  ACTIVE_MOUNTS.get(root)?.abort();
  const controller = new AbortController();
  ACTIVE_MOUNTS.set(root, controller);
  if (ctx?.signal) {
    if (ctx.signal.aborted) controller.abort();
    else ctx.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  root.innerHTML = `<style>${STYLE}</style><div class="epb">
    <header class="epb-hero">
      <div><h2>Coating Plan <span>PRO</span></h2>
        <p>Sơn công nghiệp · Hệ sơn nhiều lớp · Mạ kẽm nhúng nóng · Mạ điện phân · Phun phủ kim loại.</p></div>
      <div class="epb-brand-icon" aria-hidden="true">🎨</div>
    </header>
    <nav class="epb-mainnav" role="tablist" aria-label="Nhóm công nghệ xử lý bề mặt">
      <button type="button" class="epb-mainbtn" role="tab" aria-selected="true" data-epb-main="paint">🎨 Sơn công nghiệp</button>
      <button type="button" class="epb-mainbtn" role="tab" aria-selected="false" data-epb-main="hotdip">♨ Mạ nhúng nóng</button>
      <button type="button" class="epb-mainbtn" role="tab" aria-selected="false" data-epb-main="electro">⚡ Mạ điện phân</button>
      <button type="button" class="epb-mainbtn" role="tab" aria-selected="false" data-epb-main="other">◈ Phủ kim loại khác</button>
      <button type="button" class="epb-mainbtn" role="tab" aria-selected="false" data-epb-main="compare">▤ So sánh &amp; nguồn</button>
    </nav>
    <section class="epb-mainpanel" data-epb-mainpanel="paint">
    <nav class="epb-tabs" role="tablist" aria-label="Chức năng Coating Plan">
      <button type="button" class="epb-tab" role="tab" data-epb-tab="quick" aria-selected="true">▣ Lượng sơn</button>
      <button type="button" class="epb-tab" role="tab" data-epb-tab="film" aria-selected="false">↔ WFT / DFT</button>
      <button type="button" class="epb-tab" role="tab" data-epb-tab="area" aria-selected="false">▱ Diện tích</button>
      <button type="button" class="epb-tab" role="tab" data-epb-tab="multi" aria-selected="false">▤ Hệ sơn nhiều lớp</button>
      <button type="button" class="epb-tab" role="tab" data-epb-tab="mix" aria-selected="false">⚗ Pha A/B</button>
      <button type="button" class="epb-tab" role="tab" data-epb-tab="qc" aria-selected="false">✓ QC · DFT</button>
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
    <section class="epb-panel" data-epb-panel="multi" role="tabpanel" hidden>
      <div class="epb-card">
        <div class="epb-sectionhead"><div><h3>Hệ sơn nhiều lớp · Dự toán vật tư</h3><p class="epb-hint">Mỗi lớp có DFT, Volume Solids, hao hụt và quy cách riêng. Các giá trị ban đầu chỉ là <strong>ví dụ nhập liệu</strong>, cần thay theo TDS.</p></div><button type="button" class="epb-btn" data-epb-add-layer>＋ Thêm lớp</button></div>
        <div class="epb-form epb-inputs-tight">${inputField('Diện tích toàn bộ hệ','multi-area',100,'m²','min="0" step="any"')}</div>
        <div class="epb-gridtable epb-wide"><table><thead><tr><th>Lớp / sản phẩm</th><th>DFT (µm)</th><th>VS (%)</th><th>Hao hụt (%)</th><th>Tỷ trọng (kg/L)</th><th>Quy cách (L)</th><th></th></tr></thead><tbody data-epb-layer-rows></tbody></table></div>
        <p class="epb-error" data-epb-error="multi" hidden role="alert"></p>
        <div class="epb-results epb-results-four">
          ${kpi('Tổng DFT thiết kế','multi-dft','µm','epb-prime')}
          ${kpi('Sơn cần chuẩn bị','multi-liters','L')}
          ${kpi('Khối lượng sơn','multi-kg','kg','epb-purple')}
          ${kpi('Tổng số lon','multi-cans','lon')}
        </div>
        <div class="epb-gridtable epb-wide"><table><thead><tr><th>Sản phẩm</th><th>Định mức LT (m²/L)</th><th>WFT (µm)</th><th>Lý thuyết (L)</th><th>Thực tế (L)</th><th>Số lon</th></tr></thead><tbody data-epb-multi-results></tbody></table></div>
        <div class="epb-actions"><button type="button" class="epb-btn epb-btn-primary" data-epb-export-layers>↓ Xuất bảng dự toán CSV</button></div>
        <div class="epb-info"><strong>Cơ sở tính:</strong> L lý thuyết = diện tích × DFT ÷ (10 × VS%). L thực tế = L lý thuyết ÷ (1 − hao hụt/100). Chưa tính stripe-coat riêng, over-spray không đồng đều, hạn sử dụng, giá mua hay điều kiện TDS.</div>
      </div>
    </section>
    <section class="epb-panel" data-epb-panel="mix" role="tabpanel" hidden>
      <div class="epb-columns">
        <div class="epb-card"><h3>Pha sơn 2 thành phần A/B</h3><p class="epb-hint">Nhập tỷ lệ theo đúng đơn vị TDS. <strong>Tỷ lệ thể tích không dùng thay tỷ lệ khối lượng</strong>.</p>
          <div class="epb-form">
            <label class="epb-field"><span>Đơn vị tỷ lệ và định mức</span><select data-epb-field="mix-unit"><option value="L">Theo thể tích (L)</option><option value="kg">Theo khối lượng (kg)</option></select></label>
            ${inputField('Tổng A+B cần pha','mix-base',10,'L hoặc kg','min="0.01" step="any"')}
            ${inputField('Tỷ lệ A','mix-a',4,'phần','min="0.001" step="any"')}
            ${inputField('Tỷ lệ B','mix-b',1,'phần','min="0.001" step="any"')}
            ${inputField('Thinner pha thêm','mix-thin',5,'% A+B','min="0" max="100" step="any"')}
            ${inputField('Pot life sau trộn','mix-pot',2,'giờ','min="0.05" step="any"')}
            ${inputField('Tốc độ dùng dự kiến','mix-rate',3,'L/h hoặc kg/h','min="0.01" step="any"')}
            ${inputField('Sử dụng pot life','mix-reserve',80,'% thời gian','min="10" max="100" step="any"')}
          </div><p class="epb-error" data-epb-error="mix" hidden role="alert"></p>
          <div class="epb-info">Các giá trị mẫu <b>4:1, 5%, 2 giờ</b> chỉ để minh họa cách sử dụng, <b>không</b> phải khuyến nghị pha bất kỳ sơn cụ thể nào.</div>
        </div>
        <div class="epb-card"><h3>Kết quả pha và chia mẻ</h3>
          <div class="epb-results">
            ${kpi('Thành phần A','mix-out-a','L / kg','epb-prime')}
            ${kpi('Thành phần B','mix-out-b','L / kg')}
            ${kpi('Dung môi thêm','mix-out-thin','L / kg')}
            ${kpi('Sau pha loãng','mix-out-total','L / kg','epb-purple')}
            ${kpi('Mẻ A+B tối đa gợi ý','mix-out-batch','L / kg')}
            ${kpi('Số mẻ tối thiểu','mix-out-count','mẻ')}
          </div>
          <div class="epb-info">Ước tính mẻ dựa trên tốc độ thi công và phần thời gian pot life anh cho phép sử dụng; chưa xét điều kiện nhiệt độ, thời gian cảm ứng (induction time), đóng gói và tương thích dung môi.</div>
        </div>
      </div>
    </section>
    <section class="epb-panel" data-epb-panel="qc" role="tabpanel" hidden>
      <div class="epb-columns">
        <div class="epb-card"><h3>Kiểm tra sơ bộ DFT thực đo</h3>
          <p class="epb-hint">So sánh từng kết quả đo với khoảng do dự án/TDS quy định. <b>Đây không phải quy trình lấy mẫu và nghiệm thu ISO 19840.</b></p>
          <div class="epb-form">
            ${inputField('DFT thấp nhất cho phép','qc-lower',120,'µm','min="0" step="any"')}
            ${inputField('DFT cao nhất cho phép','qc-upper',250,'µm','min="0" step="any"')}
            ${inputField('Giá trị hiệu chỉnh nếu áp dụng','qc-correction',0,'µm','min="0" max="100" step="any"')}
          </div>
          <label class="epb-field epb-field-block"><span>Danh sách số đọc DFT (µm)</span><textarea data-epb-field="qc-readings" rows="5" placeholder="128, 141, 150, 135, 162">128, 141, 150, 135, 162</textarea></label>
          <p class="epb-error" data-epb-error="qc" hidden role="alert"></p>
          <div class="epb-info">Nếu có giá trị hiệu chỉnh từ quy trình đo/thiết bị đã phê duyệt, số liệu dùng để so sánh = số đọc − giá trị hiệu chỉnh. Không tự chọn hiệu chỉnh theo phỏng đoán.</div>
        </div>
        <div class="epb-card"><h3>Thống kê kiểm tra</h3>
          <div class="epb-results">
            ${kpi('Số phép đo','qc-count','điểm')}
            ${kpi('Trong khoảng','qc-pass','điểm','epb-prime')}
            ${kpi('Ngoài khoảng','qc-fail','điểm','epb-purple')}
            ${kpi('Giá trị trung bình','qc-avg','µm')}
            ${kpi('Giá trị nhỏ nhất','qc-min','µm')}
            ${kpi('Giá trị lớn nhất','qc-max','µm')}
          </div>
          <p class="epb-note" data-epb-qc-status></p>
          <div class="epb-info">Muốn nghiệm thu chính thức cần kế hoạch lấy mẫu, hiệu chuẩn thiết bị và quy tắc chấp nhận của tiêu chuẩn/specification áp dụng; không dựa chỉ vào tỷ lệ điểm trong khoảng.</div>
        </div>
      </div>
    </section>
    </section>
    <section class="epb-mainpanel" data-epb-mainpanel="hotdip" hidden>
      <nav class="epb-tabs epb-subtabs" role="tablist" aria-label="Mạ kẽm nhúng nóng">
        <button type="button" class="epb-tab" role="tab" data-epb-subgroup="hotdip" data-epb-subtab="estimate" aria-selected="true">Khối lượng lớp mạ</button>
        <button type="button" class="epb-tab" role="tab" data-epb-subgroup="hotdip" data-epb-subtab="inspect" aria-selected="false">ISO 1461 &amp; QC</button>
      </nav>
      <section data-epb-subpanel="hotdip:estimate">
        <div class="epb-columns">
          <div class="epb-card"><h3>Mạ kẽm nhúng nóng · HDG</h3><p class="epb-hint">Dự toán khối lượng lớp phủ sau khi mạ, cho <b>chi tiết thép gia công hoặc vật đúc không quay ly tâm</b>.</p>
            <div class="epb-form">
              <label class="epb-field"><span>Loại chi tiết</span><select data-epb-field="hd-kind"><option value="steel">Chi tiết thép</option><option value="casting">Vật đúc</option></select></label>
              ${inputField('Chiều dày thành thép','hd-steel-t',8,'mm','min="0.01" step="any"')}
              ${inputField('Tổng diện tích cần mạ','hd-area',100,'m²','min="0" step="any"')}
              ${inputField('Chiều dày lớp phủ dự toán','hd-thickness',85,'µm','min="0.1" step="any"')}
              ${inputField('Khối lượng thép trước mạ','hd-mass',5000,'kg','min="0" step="any"')}
            </div><p class="epb-error" data-epb-error="hd" hidden role="alert"></p>
            <div class="epb-info">Dùng tỷ trọng quy đổi lớp mạ <b>7,2 g/cm³</b> theo cách quy đổi ISO 1461; đây là khối lượng lớp phủ <b>trên sản phẩm</b>, không phải lượng kẽm mua/bổ sung vào bể mạ.</div>
          </div>
          <div class="epb-card"><h3>Kết quả dự toán</h3>
            <div class="epb-results">
              ${kpi('Khối lượng lớp mạ dự toán','hd-out-zinc','kg','epb-prime')}
              ${kpi('Lớp mạ theo mức mean ISO','hd-out-min','kg')}
              ${kpi('Khối lượng sản phẩm sau mạ','hd-out-total','kg','epb-purple')}
              ${kpi('Tăng khối lượng','hd-out-pct','%')}
            </div>
            <div class="epb-info"><b>Chiều dày tham chiếu:</b> <span data-epb-out="hd-band">—</span><br>Local ≥ <b data-epb-out="hd-local">—</b> µm · Mean ≥ <b data-epb-out="hd-mean">—</b> µm.</div>
            <div class="epb-actions"><button type="button" class="epb-btn epb-btn-primary" data-epb-hd-usemean>↻ Dùng DFT mean tối thiểu theo bảng</button></div>
          </div>
        </div>
      </section>
      <section data-epb-subpanel="hotdip:inspect" hidden>
        <div class="epb-columns">
          <div class="epb-card"><h3>Đối chiếu chiều dày sơ bộ</h3><p class="epb-hint">Tra mức tối thiểu của <b>ISO 1461:2022, Bảng 3</b>. Dữ liệu hiển thị không áp dụng cho fastener mạ quay ly tâm hay tôn mạ liên tục.</p>
            <div class="epb-form">
              ${inputField('Giá trị local đo theo vùng tham chiếu','hd-local-measured',70,'µm','min="0" step="any"')}
              ${inputField('Giá trị mean toàn bộ vùng được chọn','hd-mean-measured',90,'µm','min="0" step="any"')}
            </div>
            <p class="epb-note" data-epb-hd-qc-state></p>
            <div class="epb-info">Lưu ý: <b>local</b> theo tiêu chuẩn là giá trị đại diện cho <i>vùng tham chiếu</i> với quy tắc đo tương ứng, không nhất thiết là một số đo lẻ. Việc đạt hai ngưỡng chưa đồng nghĩa nghiệm thu lô hàng.</div>
          </div>
          <div class="epb-card"><h3>Mức tham chiếu ISO 1461</h3><div class="epb-gridtable"><table><thead><tr><th>Độ dày thép</th><th>Local min (µm)</th><th>Mean min (µm)</th></tr></thead><tbody>
            <tr><td>&lt; 1,5 mm</td><td>35</td><td>45</td></tr><tr><td>1,5–3 mm</td><td>45</td><td>55</td></tr>
            <tr><td>&gt; 3–6 mm</td><td>55</td><td>70</td></tr><tr><td>&gt; 6 mm</td><td>70</td><td>85</td></tr>
          </tbody></table></div><p class="epb-hint">Bảng trên cho <strong>thép không quay ly tâm</strong>; khi chọn vật đúc phần tính sẽ dùng mức riêng.</p>
            <div class="epb-info">Kiểm tra khả năng mạ trước chế tạo: lỗ thoát khí/lỗ thoát kẽm, khoang kín, mối hàn, khe chồng và khả năng treo chi tiết. Xem ISO 14713-2.</div>
          </div>
        </div>
      </section>
    </section>

    <section class="epb-mainpanel" data-epb-mainpanel="electro" hidden>
      <nav class="epb-tabs epb-subtabs" role="tablist" aria-label="Mạ điện phân">
        <button type="button" class="epb-tab" role="tab" data-epb-subgroup="electro" data-epb-subtab="faraday" aria-selected="true">Tính chiều dày &amp; Faraday</button>
        <button type="button" class="epb-tab" role="tab" data-epb-subgroup="electro" data-epb-subtab="spec" aria-selected="false">Chọn hệ mạ &amp; lưu ý</button>
      </nav>
      <section data-epb-subpanel="electro:faraday">
        <div class="epb-columns">
          <div class="epb-card"><h3>Mạ điện phân · Tính khối lượng và thời gian</h3>
            <p class="epb-hint">Tính lý thuyết theo <strong>định luật Faraday</strong> cho kim loại đơn chất (Zn, Ni, Cu, Sn). Không dùng phép tính này cho Zn-Ni hoặc các hệ hợp kim mà chưa có thành phần điện kết tủa.</p>
            <div class="epb-form">
              <label class="epb-field"><span>Kim loại mạ</span><select data-epb-field="el-metal"><option value="zinc">Kẽm Zn²⁺</option><option value="nickel">Niken Ni²⁺</option><option value="copper">Đồng Cu²⁺</option><option value="tin">Thiếc Sn²⁺</option></select></label>
              ${inputField('Diện tích có dòng điện','el-area',1,'m²','min="0.001" step="any"')}
              ${inputField('Chiều dày danh nghĩa','el-thickness',12,'µm','min="0.01" step="any"')}
              ${inputField('Mật độ dòng catot','el-current-density',2,'A/dm²','min="0.001" step="any"')}
              ${inputField('Hiệu suất dòng điện','el-efficiency',90,'%','min="0.01" max="100" step="any"')}
            </div><p class="epb-error" data-epb-error="electro" hidden role="alert"></p>
            <div class="epb-info"><b>Công thức:</b> m = A·t·ρ; thời gian = m·n·F/(M·I·η), F = 96.485,332 C/mol. Trong thực tế phải hiệu chỉnh phân bố dòng, hình dạng chi tiết, mật độ dòng và hiệu suất bể mạ.</div>
          </div>
          <div class="epb-card"><h3>Kết quả lý thuyết</h3>
            <div class="epb-results">
              ${kpi('Khối lượng lớp mạ','el-mass','g','epb-prime')}
              ${kpi('Dòng điện tổng','el-current','A')}
              ${kpi('Thời gian mạ tính toán','el-time','phút','epb-purple')}
              ${kpi('Thời gian tương đương','el-hours','giờ')}
            </div>
            <div class="epb-info">Không dùng thời gian Faraday làm quy trình vận hành thực tế nếu thiếu dữ liệu hóa chất, nhiệt độ, anode, thiết bị và đường đặc tính công nghệ của đơn vị mạ.</div>
          </div>
        </div>
      </section>
      <section data-epb-subpanel="electro:spec" hidden>
        <div class="epb-card"><h3>Chọn hệ lớp mạ điện phân</h3><div class="epb-comparegrid">
          <article><strong>Zn / Zn-Ni / Zn-Fe</strong><p>Chống ăn mòn thép. Hệ xử lý bề mặt Cr(VI)-free có thể tham khảo ISO 19598:2016; xác nhận yêu cầu chống ăn mòn theo đơn đặt hàng.</p></article>
          <article><strong>Mạ điện bu lông</strong><p>Áp dụng ISO 4042:2022 và Amd 1:2026 (nếu thuộc phạm vi). Kiểm tra kích thước ren, hydrogen embrittlement và hệ số ma sát sau xử lý.</p></article>
          <article><strong>Nhôm, đồng, niken, thiếc</strong><p>Không mặc định dùng ISO 19598 cho tất cả kim loại. Cần tiêu chuẩn riêng và quy trình đã phê duyệt tùy nền vật liệu và mục đích sử dụng.</p></article>
          <article><strong>Kiểm soát hóa chất</strong><p>Hạn chế Cr(VI) và hóa chất độc hại theo yêu cầu pháp luật, EHS và khách hàng. Tool không đưa công thức pha dung dịch bể mạ.</p></article>
        </div></div>
      </section>
    </section>

    <section class="epb-mainpanel" data-epb-mainpanel="other" hidden>
      <nav class="epb-tabs epb-subtabs" role="tablist" aria-label="Phương án phủ kim loại khác">
        <button type="button" class="epb-tab" role="tab" data-epb-subgroup="other" data-epb-subtab="flake" aria-selected="true">Mạ kẽm vảy (Zinc flake)</button>
        <button type="button" class="epb-tab" role="tab" data-epb-subgroup="other" data-epb-subtab="thermal" aria-selected="false">Phun phủ kẽm / nhôm</button>
      </nav>
      <section data-epb-subpanel="other:flake">
        <div class="epb-columns">
          <div class="epb-card"><h3>Zinc flake · Dự toán lớp màng khô</h3>
            <p class="epb-hint">Phủ kẽm dạng vảy <b>không điện phân</b>. Thường gặp ở bu lông, đai ốc và chi tiết yêu cầu lớp phủ tương đối mỏng. Không phải mạ điện phân thông thường.</p>
            <div class="epb-form">
              ${inputField('Tổng diện tích phủ','flake-area',20,'m²','min="0" step="any"')}
              ${inputField('Tổng chiều dày thiết kế','flake-dft',12,'µm','min="0.1" step="any"')}
              ${inputField('Số lượt phủ','flake-coats',2,'lượt','min="1" max="12" step="1"')}
              ${inputField('Tỷ trọng màng khô giả định','flake-density',4,'g/cm³','min="0.1" step="any"')}
              ${inputField('Hao hụt dự toán','flake-loss',15,'%','min="0" step="any"')}
            </div><p class="epb-error" data-epb-error="flake" hidden role="alert"></p>
            <div class="epb-info">Tỷ trọng 4 g/cm³ là <b>giá trị ví dụ</b>, không phải đặc tính mặc định của mọi hệ zinc flake. Phải dùng TDS/PDS và quy trình nhà cung cấp để dự toán vật tư ướt.</div>
          </div>
          <div class="epb-card"><h3>Kết quả tham khảo</h3><div class="epb-results">
            ${kpi('Mỗi lớp mục tiêu','flake-percoat','µm','epb-prime')}
            ${kpi('Khối lượng màng khô','flake-dry','kg')}
            ${kpi('Quy đổi theo hao hụt màng khô','flake-prepared','kg tương đương','epb-purple')}
          </div><div class="epb-info">Bu lông cường độ cao: kiểm tra ISO 10683:2018, tương thích ren, phương pháp hóa rắn nhiệt, top coat và <b>hệ số ma sát</b>. Không dùng số lớp/DFT ví dụ làm giới hạn chấp nhận.</div></div>
        </div>
      </section>
      <section data-epb-subpanel="other:thermal" hidden>
        <div class="epb-columns">
          <div class="epb-card"><h3>Phun phủ kim loại · Metallizing</h3>
            <p class="epb-hint">Ước tính vật tư phun phủ Zn, Al hoặc Zn/Al trên kết cấu thép, với hiệu suất bám thực tế do anh nhập.</p>
            <div class="epb-form">
              <label class="epb-field"><span>Vật liệu phun phủ</span><select data-epb-field="th-material"><option value="zinc">Kẽm Zn</option><option value="aluminium">Nhôm Al</option><option value="znal8515">Zn/Al 85:15 (theo khối lượng)</option></select></label>
              ${inputField('Diện tích cần phun','th-area',100,'m²','min="0" step="any"')}
              ${inputField('Chiều dày phủ mục tiêu','th-thickness',150,'µm','min="0.1" step="any"')}
              ${inputField('Hiệu suất bám phủ','th-deposition',65,'%','min="0.1" max="100" step="any"')}
            </div><p class="epb-error" data-epb-error="thermal" hidden role="alert"></p>
            <div class="epb-info">Hiệu suất 65% là ví dụ. Thông số thực tế phụ thuộc vật liệu dây/bột, súng phun, góc phun, bề mặt và điều kiện thi công.</div>
          </div>
          <div class="epb-card"><h3>Khối lượng dự toán</h3><div class="epb-results">
            ${kpi('Kim loại bám trên bề mặt','th-deposited','kg','epb-prime')}
            ${kpi('Vật tư đầu vào ước tính','th-feed','kg','epb-purple')}
            ${kpi('Hao hụt dự kiến','th-loss','kg')}
          </div><div class="epb-info">Tham khảo ISO 2063-1/-2. Cần kiểm soát độ sạch, độ nhám, độ dày, độ bám dính và sealing nếu được specification yêu cầu.</div></div>
        </div>
      </section>
    </section>

    <section class="epb-mainpanel" data-epb-mainpanel="compare" hidden>
      <div class="epb-card"><h3>So sánh các phương án bảo vệ bề mặt</h3><p class="epb-hint">Bảng định hướng lựa chọn ban đầu; không thay thế thiết kế chống ăn mòn theo môi trường, tuổi thọ mục tiêu và yêu cầu của chủ đầu tư.</p>
        <div class="epb-gridtable epb-comparetable"><table><thead><tr><th>Giải pháp</th><th>Phù hợp thường gặp</th><th>Điểm cần kiểm tra</th><th>Tiêu chuẩn tham khảo</th></tr></thead><tbody>
          <tr><td><b>Hệ sơn</b></td><td>Kết cấu hàn, thiết bị, kết cấu cần màu sắc và bảo trì</td><td>Chuẩn bị bề mặt, TDS, DFT nhiều lớp, điều kiện thi công, bảo trì</td><td>ISO 12944</td></tr>
          <tr><td><b>Mạ kẽm nhúng nóng</b></td><td>Kết cấu thép chế tạo, chi tiết dùng ngoài trời</td><td>Lỗ thoát, khoang kín, biến dạng nhiệt, dung sai, làm sạch, nhúng bể</td><td>ISO 1461; ISO 14713-2</td></tr>
          <tr><td><b>Mạ điện phân</b></td><td>Chi tiết nhỏ/chính xác, liên kết có kiểm soát kích thước</td><td>Thành phần lớp mạ, passivation, hydrogen embrittlement, ren</td><td>ISO 19598; ISO 4042</td></tr>
          <tr><td><b>Zinc flake</b></td><td>Bu lông, đai ốc, chi tiết nhỏ có top coat/lubricant</td><td>Thông số ma sát, nướng/hóa rắn, dung sai và chống ăn mòn theo bộ phủ</td><td>ISO 10683</td></tr>
          <tr><td><b>Phun phủ Zn/Al</b></td><td>Cấu kiện lớn, hệ duplex, bảo trì tại chỗ</td><td>Phun hạt, độ bám dính, độ dày, độ kín, môi trường thi công</td><td>ISO 2063-1/-2</td></tr>
        </tbody></table></div>
        <div class="epb-info"><b>Hệ duplex:</b> có thể dùng lớp mạ nhúng nóng hoặc phun phủ kim loại kết hợp sơn theo thiết kế được phê duyệt. Không cộng đơn giản tuổi thọ hai lớp để dự đoán tổng tuổi thọ.</div>
      </div>
      <div class="epb-card epb-source-card"><h3>Tiêu chuẩn và nguồn chính thức</h3>
        <p class="epb-hint">Các liên kết tới trang tra cứu ISO; nội dung tiêu chuẩn đầy đủ có thể yêu cầu bản quyền. Phiên bản phải đối chiếu lại theo dự án.</p>
        <div class="epb-sources">${COATING_SOURCES.map(([name,href])=>`<a href="${href}" target="_blank" rel="noopener noreferrer">↗ ${escHTML(name)}</a>`).join('')}</div>
        <div class="epb-info"><b>Thử phun muối ISO 9227:</b> số giờ thử không phải phép quy đổi trực tiếp thành tuổi thọ ngoài trời hay thước đo xếp hạng mọi lớp phủ. Phải dùng tiêu chí nghiệm thu riêng của sản phẩm.</div>
      </div>
    </section>
    <footer class="epb-bottom epb-footer-note"><strong>Lưu ý kỹ thuật:</strong> Kết quả là tính toán sơ bộ theo các tham số anh nhập. Ưu tiên TDS/PDS, specification và quy trình đã được phê duyệt. Các kiểm tra ngưỡng trong tool không tự động chứng nhận nghiệm thu hoặc xác nhận phù hợp với toàn bộ tiêu chuẩn.</footer>
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
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
  };
  let currentMain = 'paint';
  let currentMode = 'quick';
  const submodes = {hotdip:'estimate', electro:'faraday', other:'flake'};
  let lastArea = null;
  let lastMulti = null;

  function showMain(mode) {
    if (!['paint','hotdip','electro','other','compare'].includes(mode)) return;
    currentMain = mode;
    $$('[data-epb-main]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.epbMain === mode)));
    $$('[data-epb-mainpanel]').forEach(p=>p.hidden = p.dataset.epbMainpanel !== mode);
    update();
  }
  function showMode(mode) {
    if (!['quick','film','area','multi','mix','qc'].includes(mode)) return;
    currentMode = mode;
    $$('[data-epb-tab]').forEach(button=>button.setAttribute('aria-selected', String(button.dataset.epbTab === mode)));
    $$('[data-epb-panel]').forEach(panel=>panel.hidden=panel.dataset.epbPanel!==mode);
    if (currentMain !== 'paint') showMain('paint'); else update();
  }
  function showSub(group,mode) {
    if (!Object.prototype.hasOwnProperty.call(submodes,group)) return;
    if (!$$(`[data-epb-subgroup="${group}"]`).some(b=>b.dataset.epbSubtab===mode)) return;
    submodes[group]=mode;
    $$(`[data-epb-subgroup="${group}"]`).forEach(b=>b.setAttribute('aria-selected', String(b.dataset.epbSubtab===mode)));
    $$('[data-epb-subpanel]').forEach(p=>{if(p.dataset.epbSubpanel.startsWith(group+':'))p.hidden=p.dataset.epbSubpanel!==group+':'+mode;});
    if (currentMain!==group) showMain(group); else update();
  }

  function updateQuick() {
    try {
      const r=calculateQuick({area:read('area'),coats:read('coats'),coverage:read('coverage'),loss:read('loss'),density:read('density'),pack:read('pack')});
      output('quick-practical',format(r.practical,2));output('quick-kg',format(r.kg,2));
      output('quick-theoretical',format(r.theoretical,2));output('quick-cans',format(r.cans,0));
      output('quick-purchased',format(r.purchased,2));output('quick-surplus',format(Math.max(0,r.surplus),2));err('quick','');
    } catch(e) {['quick-practical','quick-kg','quick-theoretical','quick-cans','quick-purchased','quick-surplus'].forEach(k=>output(k,'—'));err('quick',e.message);}
  }
  function updateFilm() {
    try {
      const r=calculateFilmThickness({direction:read('direction'),value:read('film-value'),solids:read('solids'),thinning:read('thinning'),tableMode:read('tableMode'),step:read('step')});
      const label=$('[data-epb-field="film-value"]').closest('label').querySelector('span');
      label.textContent=r.direction==='wft'?'WFT đã đo (µm)':'DFT mục tiêu (µm)';
      output('film-wft',format(r.wft,1));output('film-dft',format(r.dft,1));output('film-solids',format(r.effectiveSolids,1));
      output('film-volatile',format(100-r.effectiveSolids,1));
      $('[data-epb-solidsbar]').style.width=`${r.effectiveSolids}%`;
      $('[data-epb-table-head]').textContent=`${r.tableMode.toUpperCase()} đầu vào (µm)`;
      const t=r.tableMode==='wft'?'DFT':'WFT';
      $('[data-epb-table-unthin]').textContent=`${t} không pha (µm)`;
      $('[data-epb-table-thin]').textContent=`${t} sau pha (µm)`;
      $('[data-epb-table-body]').innerHTML=r.table.map(row=>`<tr><td>${format(row.input,0)}</td><td>${format(row.unthinned,1)}</td><td>${format(row.thinned,1)}</td></tr>`).join('');
      err('film','');
    } catch(e){['film-wft','film-dft','film-solids','film-volatile'].forEach(k=>output(k,'—'));$('[data-epb-solidsbar]').style.width='0';$('[data-epb-table-body]').textContent='';err('film',e.message);}
  }
  function updateAreaOpts() {
    const shape=read('shape');const captions={plate:['Chiều dài A','Chiều rộng B','Chiều dày C'],box:['Chiều dài A','Chiều rộng B','Chiều cao C'],cylinder:['Đường kính D','Chiều dài L',''],pipe:['Đường kính ngoài D','Chiều dài L','Đường kính trong d']};
    const titles=captions[shape]||captions.plate;
    ['geom-a','geom-b','geom-c'].forEach((key,i)=>{const el=$(`[data-epb-field="${key}"]`)?.closest('label')?.querySelector('span');if(el)el.textContent=`${titles[i]} (mm)`;});
    $('[data-epb-c-wrap]').hidden=shape==='cylinder';
    const opts=$('[data-epb-geom-opts]');
    if(shape==='plate')opts.innerHTML='<label><input type="checkbox" data-epb-flag="bothFaces" checked> Sơn cả 2 mặt</label><label><input type="checkbox" data-epb-flag="edges"> Tính cả cạnh</label>';
    else if(shape==='box')opts.textContent='Tính 6 mặt ngoài của hộp kín.';
    else if(shape==='cylinder')opts.innerHTML='<label><input type="checkbox" data-epb-flag="ends"> Tính cả 2 đáy</label>';
    else opts.innerHTML='<label><input type="checkbox" data-epb-flag="inside"> Sơn cả mặt trong</label><label><input type="checkbox" data-epb-flag="ends"> Tính vành 2 đầu</label>';
  }
  function updateArea() {
    try {
      const flag=name=>Boolean($(`[data-epb-flag="${name}"]`)?.checked);
      lastArea=calculateSimpleArea({shape:read('shape'),a:read('geom-a'),b:read('geom-b'),c:read('geom-c'),qty:read('geom-qty'),bothFaces:flag('bothFaces'),edges:flag('edges'),ends:flag('ends'),inside:flag('inside')});
      output('geom-single',format(lastArea.single,4));output('geom-total',format(lastArea.total,4));$('[data-epb-apply]').disabled=false;err('area','');
    } catch(e){lastArea=null;output('geom-single','—');output('geom-total','—');$('[data-epb-apply]').disabled=true;err('area',e.message);}
  }

  const defaultLayers=[
    {name:'Lớp lót – ví dụ',dft:75,solids:65,loss:20,density:1.4,pack:20},
    {name:'Lớp trung gian – ví dụ',dft:125,solids:70,loss:20,density:1.5,pack:20},
    {name:'Lớp phủ – ví dụ',dft:50,solids:60,loss:20,density:1.25,pack:20}
  ];
  function buildLayerRow(row) {
    const tr=document.createElement('tr');tr.setAttribute('data-epb-layer-row','');
    for(const key of ['name','dft','solids','loss','density','pack']){
      const td=document.createElement('td');const input=document.createElement('input');
      input.type=key==='name'?'text':'number';input.dataset.layerKey=key;
      input.value=String(row[key]??'');input.setAttribute('aria-label',key+' lớp '+(layerRows().length+1));
      if(key==='name')input.maxLength=80;else{input.step='any';input.inputMode='decimal';}
      td.append(input);tr.append(td);
    }
    const td=document.createElement('td');const del=document.createElement('button');del.className='epb-remove';del.type='button';del.textContent='×';del.dataset.epbRemoveLayer='';del.title='Xóa lớp';del.setAttribute('aria-label','Xóa lớp sơn');td.append(del);tr.append(td);return tr;
  }
  const layerRows=()=>$$('[data-epb-layer-row]');
  function readLayers(){return layerRows().map(tr=>Object.fromEntries(['name','dft','solids','loss','density','pack'].map(k=>[k,tr.querySelector(`[data-layer-key="${k}"]`)?.value])));}
  function updateMulti(){
    try{
      const r=calculateMultiCoat({area:read('multi-area'),layers:readLayers()});lastMulti=r;
      output('multi-dft',format(r.totalDFT,1));output('multi-liters',format(r.totalPractical,2));output('multi-kg',format(r.totalKg,2));output('multi-cans',format(r.totalCans,0));
      $('[data-epb-multi-results]').innerHTML=r.layers.map(x=>`<tr><td>${escHTML(x.name)}</td><td>${format(x.coverage,2)}</td><td>${format(x.wft,1)}</td><td>${format(x.theoretical,2)}</td><td>${format(x.practical,2)}</td><td>${format(x.cans,0)}</td></tr>`).join('');err('multi','');
    } catch(e){lastMulti=null;['multi-dft','multi-liters','multi-kg','multi-cans'].forEach(k=>output(k,'—'));$('[data-epb-multi-results]').textContent='';err('multi',e.message);}
  }
  function updateMix(){
    try{
      const r=calculateMixing({unit:read('mix-unit'),totalBase:read('mix-base'),partA:read('mix-a'),partB:read('mix-b'),thinning:read('mix-thin'),potLife:read('mix-pot'),consumption:read('mix-rate'),reserve:read('mix-reserve')});
      for(const [key,val] of [['mix-out-a',r.A],['mix-out-b',r.B],['mix-out-thin',r.thinner],['mix-out-total',r.totalReady],['mix-out-batch',r.suggestedBatch]]){
        output(key,format(val,3));const container=$(`[data-epb-out="${key}"]`)?.closest('.epb-kpi');const el=container?.querySelector('em');if(el)el.textContent=r.unit;
      }
      output('mix-out-count',format(r.batches,0));err('mix','');
    }catch(e){['mix-out-a','mix-out-b','mix-out-thin','mix-out-total','mix-out-batch','mix-out-count'].forEach(k=>output(k,'—'));err('mix',e.message);}
  }
  function updateQC(){
    try{
      const r=calculateDFTScreen({lower:read('qc-lower'),upper:read('qc-upper'),correction:read('qc-correction'),readings:read('qc-readings')});
      for(const [key,val,dig] of [['qc-count',r.count,0],['qc-pass',r.pass,0],['qc-fail',r.fail,0],['qc-avg',r.average,1],['qc-min',r.min,1],['qc-max',r.max,1]])output(key,format(val,dig));
      const status=$('[data-epb-qc-status]');status.textContent=r.fail===0?'✓ Tất cả giá trị nhập đều nằm trong khoảng anh quy định (kiểm tra sơ bộ).':`⚠ Có ${r.fail} giá trị ngoài khoảng; cần rà soát lại vị trí đo.`;
      status.hidden=false;err('qc','');
    }catch(e){['qc-count','qc-pass','qc-fail','qc-avg','qc-min','qc-max'].forEach(k=>output(k,'—'));$('[data-epb-qc-status]').hidden=true;err('qc',e.message);}
  }
  function updateHD(){
    try{
      const r=calculateHotDip({kind:read('hd-kind'),steelThickness:read('hd-steel-t'),area:read('hd-area'),thickness:read('hd-thickness'),steelMass:read('hd-mass'),local:read('hd-local-measured'),mean:read('hd-mean-measured')});
      output('hd-out-zinc',format(r.nominalCoatingKg,3));output('hd-out-min',format(r.minReferenceCoatingKg,3));
      output('hd-out-total',format(r.massAfter,3));output('hd-out-pct',r.increase===null?'—':format(r.increase,2));
      output('hd-band',r.reference.band);output('hd-local',format(r.reference.local,0));output('hd-mean',format(r.reference.mean,0));
      const status=$('[data-epb-hd-qc-state]');status.hidden=r.screening===null;
      status.textContent=r.screening===null?'':r.screening?'✓ Hai số nhập đạt ngưỡng tham chiếu local/mean; chưa đủ để xác nhận cả lô.':'⚠ Có giá trị thấp hơn ngưỡng local/mean của nhóm vật liệu đang chọn.';
      err('hd','');
    }catch(e){['hd-out-zinc','hd-out-min','hd-out-total','hd-out-pct','hd-band','hd-local','hd-mean'].forEach(k=>output(k,'—'));$('[data-epb-hd-qc-state]').hidden=true;err('hd',e.message);}
  }
  function updateElectro(){
    try{
      const r=calculateElectro({metal:read('el-metal'),area:read('el-area'),thickness:read('el-thickness'),currentDensity:read('el-current-density'),efficiency:read('el-efficiency')});
      output('el-mass',format(r.massGrams,2));output('el-current',format(r.current,2));output('el-time',format(r.minutes,1));output('el-hours',format(r.hours,2));err('electro','');
    }catch(e){['el-mass','el-current','el-time','el-hours'].forEach(k=>output(k,'—'));err('electro',e.message);}
  }
  function updateFlake(){
    try{const r=calculateFlake({area:read('flake-area'),dft:read('flake-dft'),coats:read('flake-coats'),density:read('flake-density'),loss:read('flake-loss')});
      output('flake-percoat',format(r.perCoatDFT,2));output('flake-dry',format(r.massDryKg,3));output('flake-prepared',format(r.dryEquivalentPreparedKg,3));err('flake','');
    }catch(e){['flake-percoat','flake-dry','flake-prepared'].forEach(k=>output(k,'—'));err('flake',e.message);}
  }
  function updateThermal(){
    try{const r=calculateThermal({material:read('th-material'),area:read('th-area'),thickness:read('th-thickness'),deposition:read('th-deposition')});
      output('th-deposited',format(r.depositedKg,3));output('th-feed',format(r.feedKg,3));output('th-loss',format(r.lossKg,3));err('thermal','');
    }catch(e){['th-deposited','th-feed','th-loss'].forEach(k=>output(k,'—'));err('thermal',e.message);}
  }
  function update(){
    if(currentMain==='paint'){
      if(currentMode==='quick')updateQuick();else if(currentMode==='film')updateFilm();else if(currentMode==='area')updateArea();
      else if(currentMode==='multi')updateMulti();else if(currentMode==='mix')updateMix();else updateQC();
    }else if(currentMain==='hotdip')updateHD();else if(currentMain==='electro')updateElectro();
    else if(currentMain==='other'){if(submodes.other==='flake')updateFlake();else updateThermal();}
  }
  function downloadLayerCSV(){
    updateMulti();if(!lastMulti)return;
    const header=['Lớp / sản phẩm','DFT µm','VS %','Hao hụt %','Tỷ trọng kg/L','Quy cách L','WFT µm','Lý thuyết L','Dự toán L','Lon'];
    const safe=value=>{let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
    const values=lastMulti.layers.map(l=>[l.name,l.dft,l.solids,l.loss,l.density,l.pack,l.wft,l.theoretical,l.practical,l.cans]);
    const csv='\ufeff'+[header,...values].map(row=>row.map(safe).join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='epsilon-coating-paint-system.csv';root.append(link);link.click();link.remove();
    // Release the temporary blob when leaving the tool, avoiding premature revocation in some browsers.
    controller.signal.addEventListener('abort',()=>URL.revokeObjectURL(url),{once:true});
  }
  root.addEventListener('click',event=>{
    const main=event.target.closest('[data-epb-main]');if(main&&root.contains(main)){showMain(main.dataset.epbMain);return;}
    const tab=event.target.closest('[data-epb-tab]');if(tab&&root.contains(tab)){showMode(tab.dataset.epbTab);return;}
    const sub=event.target.closest('[data-epb-subgroup]');if(sub&&root.contains(sub)){showSub(sub.dataset.epbSubgroup,sub.dataset.epbSubtab);return;}
    const add=event.target.closest('[data-epb-add-layer]');if(add&&root.contains(add)){
      if(layerRows().length<10){$('[data-epb-layer-rows]').append(buildLayerRow({name:`Lớp ${layerRows().length+1}`,dft:75,solids:65,loss:20,density:1.3,pack:20}));updateMulti();}
      return;
    }
    const del=event.target.closest('[data-epb-remove-layer]');if(del&&root.contains(del)){
      if(layerRows().length>1){del.closest('[data-epb-layer-row]')?.remove();updateMulti();}return;
    }
    const apply=event.target.closest('[data-epb-apply]');if(apply&&root.contains(apply)&&lastArea){
      for(const key of ['area','multi-area','hd-area','el-area','flake-area','th-area']){const field=$(`[data-epb-field="${key}"]`);if(field)field.value=String(lastArea.total);}
      showMode('quick');return;
    }
    if(event.target.closest('[data-epb-export-layers]')){downloadLayerCSV();return;}
    if(event.target.closest('[data-epb-hd-usemean]')){
      try{const r=hotDip1461Requirement(read('hd-kind'),read('hd-steel-t'));$('[data-epb-field="hd-thickness"]').value=r.mean;updateHD();}catch(e){err('hd',e.message);}return;
    }
  },{signal:controller.signal});
  root.addEventListener('input',event=>{if(event.target.closest('.epb'))update();},{signal:controller.signal});
  root.addEventListener('change',event=>{
    if(event.target.matches('[data-epb-field="shape"]'))updateAreaOpts();
    update();
  },{signal:controller.signal});
  updateAreaOpts();
  for(const layer of defaultLayers)$('[data-epb-layer-rows]').append(buildLayerRow(layer));
  update();

}
