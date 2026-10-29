/**
 * Epsilon Blue Soft — Sổ tay vật liệu kỹ thuật (bản xem trước).
 * Database: ../../data/handbook/material-handbook.json relative to this file.
 * Mount contract: export async function mount(root, ctx) => cleanup().
 * Không thay đổi app.js hoặc các module tính toán khác.
 * Dữ liệu mẫu chưa được duyệt để làm đầu vào tính toán thiết kế.
 */

import { SEARCH_CSS, searchForm, createIndex, searchIndex, highlight, snippets } from './handbook-search.js';

const DATABASE_URL = new URL('../../data/handbook/material-handbook.json', import.meta.url);
const FAMILY_LABEL = Object.freeze({
  all: 'Tất cả nhóm', structural: 'Thép kết cấu', machinery: 'Thép cơ khí', stainless: 'Thép không gỉ'
});
const MATERIAL_GROUPS = Object.freeze([
  {id:'steel', label:'Thép', title:'Thép'},
  {id:'cast-iron', label:'Gang', title:'Gang'},
  {id:'nonferrous', label:'Kim loại màu', title:'Kim loại màu và hợp kim'},
  {id:'polymer', label:'Nhựa', title:'Nhựa và polymer'},
  {id:'elastomer', label:'Cao su', title:'Cao su và elastomer'},
  {id:'ceramic-glass', label:'Gốm & kính', title:'Gốm và thủy tinh (kính)'},
  {id:'composite', label:'Composite', title:'Vật liệu composite'},
  {id:'lubricant', label:'Bôi trơn', title:'Vật liệu bôi trơn'}
]);
// Fixed local SVGs follow the app's existing outline icon style.
const GROUP_ICON_PATHS = Object.freeze({
  steel:'<path d="M4 3h16v4h-6v10h6v4H4v-4h6V7H4Z"/>',
  'cast-iron':'<path d="M10.1 2h3.8l.6 2.3c.6.2 1.2.4 1.7.7l2.1-1.2 2.7 2.7-1.2 2.1c.3.5.5 1.1.7 1.7l2.3.6v3.8l-2.3.6c-.2.6-.4 1.2-.7 1.7l1.2 2.1-2.7 2.7-2.1-1.2c-.5.3-1.1.5-1.7.7l-.6 2.3h-3.8l-.6-2.3c-.6-.2-1.2-.4-1.7-.7l-2.1 1.2-2.7-2.7 1.2-2.1c-.3-.5-.5-1.1-.7-1.7L2 13.9v-3.8l2.3-.6c.2-.6.4-1.2.7-1.7L3.8 5.7l2.7-2.7 2.1 1.2c.5-.3 1.1-.5 1.7-.7Z"/><circle cx="12" cy="12" r="3.2"/>',
  nonferrous:'<path d="m5 11 2-6h10l2 6H5Zm-3 9 2-6h7l2 6H2Zm11 0 2-6h5l2 6h-9Z"/>',
  polymer:'<circle cx="5" cy="12" r="2.8"/><circle cx="13" cy="5" r="2.8"/><circle cx="19" cy="15" r="2.8"/><path d="m7.2 10 3.6-3m3.6.3 3.2 5.2M8 12.8l8.3 1.4M5 15v6"/>',
  elastomer:'<ellipse cx="12" cy="10" rx="9" ry="6"/><ellipse cx="12" cy="10" rx="4" ry="2.5"/><path d="M3 10v4c0 3.3 4 6 9 6s9-2.7 9-6v-4"/>',
  'ceramic-glass':'<path d="m3 8 4-5h10l4 5-9 13L3 8Zm0 0h18M7 3l5 18L17 3"/>',
  composite:'<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  lubricant:'<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/><path d="M8 15c0 2.2 1.4 3.5 3.5 3.8"/>'
});
function groupIcon(id) {
  return `<span class="mh-group-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" focusable="false">${GROUP_ICON_PATHS[id] || ''}</svg></span>`;
}
function materialGroup(material) {
  if (MATERIAL_GROUPS.some(group => group.id === material?.group)) return material.group;
  return ['structural','machinery','stainless'].includes(material?.family) ? 'steel' : '';
}
const DETAIL_TABS = Object.freeze([
  ['overview', 'Tổng quan'], ['mechanical', 'Cơ tính'], ['chemistry', 'Thành phần'], ['sources', 'Nguồn dữ liệu']
]);
const FMT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 });
const txt = (v) => String(v ?? '');
const esc = (v) => txt(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => (Number.isFinite(v) ? FMT.format(v) : '—');
const arr = v => Array.isArray(v) ? v : [];


function safeUrl(value) {
  try { const u = new URL(String(value)); return u.protocol === 'https:' ? u.href : ''; }
  catch { return ''; }
}

/** Validates critical fields. Future engineering tools must apply their own selection and design rules. */
export async function loadMaterialDatabase(options = {}) {
  const response = await fetch(DATABASE_URL, { signal: options.signal, cache: 'default' });
  if (!response.ok) throw new Error(`HTTP ${response.status} — không tải được dữ liệu Sổ tay.`);
  const data = await response.json();
  if (data?.schemaVersion !== '1.0.0' || !Array.isArray(data.materials) || !Array.isArray(data.sources)) {
    throw new Error('Cấu trúc material-handbook.json không hợp lệ hoặc không được hỗ trợ.');
  }
  const ids = new Set();
  for (const item of data.materials) {
    if (!item || typeof item.id !== 'string' || !item.id || typeof item.grade !== 'string' || ids.has(item.id)) {
      throw new Error('Dữ liệu vật liệu thiếu ID, tên mác hoặc có ID bị trùng.');
    }
    ids.add(item.id);
    if (!arr(item.mechanical?.cases).length || !arr(item.sourceIds).length) {
      throw new Error(`Vật liệu ${item.grade} thiếu bảng cơ tính hoặc nguồn tham chiếu.`);
    }
  }
  return data;
}

const CSS = SEARCH_CSS + `
.mh,.mh *{box-sizing:border-box}
.mh{--mh-blue:#2348d5;--mh-ink:#1b2b64;--mh-muted:#536587;--mh-line:#dde5f5;--mh-soft:#f7f9ff;--mh-green:#008e73;--mh-purple:#6d48d3;color:var(--mh-ink);font:16px/1.52 Inter,'Segoe UI',Arial,sans-serif;width:100%;margin:0;max-width:none}
.mh button,.mh input,.mh select{font:inherit}.mh button{cursor:pointer}.mh button:focus-visible,.mh input:focus-visible,.mh select:focus-visible,.mh a:focus-visible{outline:3px solid #9ab4ff;outline-offset:2px}
.mh h2,.mh h3,.mh h4,.mh p{margin:0}.mh a{color:inherit}.mh [hidden]{display:none!important}
/* Keep search announcements accessible without a visible helper row. */
.mh [data-hbs-status]{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.mh-topbar{display:flex;align-items:center;flex-wrap:wrap;gap:12px 24px;margin-bottom:14px}
.mh-topbar>.mh-heading{flex:0 1 560px;min-width:0;max-width:100%}
.mh .mh-topbar>.hbs-searchbox{flex:1 1 480px;min-width:0;margin:0;padding:0;border:0;border-radius:0;background:transparent}
.mh-topbar .hbs-searchbox label{margin:0 0 6px;line-height:1.4}
.mh-topbar .hbs-searchrow{gap:8px}
.mh-topbar .hbs-searchrow input{height:40px;padding:8px 11px}
.mh-topbar .hbs-searchrow button{min-height:40px;padding:6px 12px}
.mh-heading{padding:0;margin:0}
.mh .mh-heading h2{font-size:26px;line-height:1.25;font-weight:850;color:#152e91;margin:0}
.mh .mh-heading p{color:var(--mh-muted);font-size:16px;line-height:1.5;margin:4px 0 0}
.mh-group-tabs{display:flex;gap:8px;overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:thin;padding:0 0 9px;margin:0 0 14px;border-bottom:1px solid var(--mh-line)}
.mh .mh-group-tab{flex:1 0 140px;min-height:54px;display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:8px 14px;border:1px solid #d7e0f4;border-radius:11px;background:#fff;color:#43598b;font-size:16px;font-weight:750;line-height:1.4;white-space:nowrap;transition:background .15s,border-color .15s}
.mh-group-tab:hover{background:#f0f4ff;border-color:#94a7ec}.mh-group-tab[aria-selected=true]{color:#fff;background:#344bc9;border-color:#344bc9;box-shadow:0 3px 9px #344bc91c}.mh-group-tab:disabled{cursor:wait}
.mh-group-icon{display:grid;place-items:center;flex:0 0 32px;width:32px;height:32px;border-radius:9px;color:var(--mh-group-icon,#3862b1);background:var(--mh-group-soft,#eaf1ff)}
.mh-group-icon svg{display:block;flex-shrink:0}
.mh-group-tab[data-mh-group=steel]{--mh-group-icon:#3469a7;--mh-group-soft:#eaf2ff}
.mh-group-tab[data-mh-group=cast-iron]{--mh-group-icon:#69718c;--mh-group-soft:#edf0f7}
.mh-group-tab[data-mh-group=nonferrous]{--mh-group-icon:#a66c1b;--mh-group-soft:#fff3dc}
.mh-group-tab[data-mh-group=polymer]{--mh-group-icon:#138878;--mh-group-soft:#e6f7f2}
.mh-group-tab[data-mh-group=elastomer]{--mh-group-icon:#7750b7;--mh-group-soft:#f2eaff}
.mh-group-tab[data-mh-group=ceramic-glass]{--mh-group-icon:#1686a5;--mh-group-soft:#e7f7fc}
.mh-group-tab[data-mh-group=composite]{--mh-group-icon:#5965b7;--mh-group-soft:#edf0ff}
.mh-group-tab[data-mh-group=lubricant]{--mh-group-icon:#b47a13;--mh-group-soft:#fff4db}
.mh-group-tab[aria-selected=true] .mh-group-icon{color:#fff;background:#ffffff24}
.mh-layout{display:grid;grid-template-columns:minmax(255px,315px) minmax(0,1fr);gap:15px;align-items:start}
.mh-aside,.mh-detail{background:white;border:1px solid var(--mh-line);border-radius:16px;box-shadow:0 4px 18px #15317d09;min-width:0}
.mh-aside{padding:15px}.mh-side-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.mh-side-title strong{font-size:17px;color:#1c318a}.mh-count{background:#edf1ff;border-radius:8px;padding:3px 9px;color:#4057b1;font-size:16px;font-weight:750}
.mh-input-label{display:block;color:#40547e;font-weight:700;font-size:16px;margin-bottom:6px}.mh-search,.mh-filter{width:100%;height:43px;min-width:0;color:var(--mh-ink);background:#fff;border:1px solid #ccd9ee;border-radius:10px;padding:8px 11px;font-size:16px}.mh-search{margin-bottom:10px}.mh-filter{margin-bottom:12px;background:#f9fbff}
.mh-list{display:flex;flex-direction:column;gap:8px;max-height:680px;overflow-y:auto;padding-right:2px}
.mh-item{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;text-align:left;color:#263b7a;border:1px solid #e2e8f6;border-radius:11px;background:#fff;padding:11px 12px;min-height:80px;transition:background .15s,border-color .15s}
.mh-item:hover{border-color:#a5b5ff;background:#f6f7ff}.mh-item[aria-pressed=true]{border-color:#687ce6;background:#eff2ff;box-shadow:inset 3px 0 #435bdf}
.mh-item-name{font-size:19px;font-weight:850;display:block;color:#1c348a;line-height:1.3}.mh-item-sub{font-size:16px;color:#627296;display:block;line-height:1.4}.mh-item-arrow{color:#5a68ba;font-size:22px;flex-shrink:0}
.mh-empty{padding:16px 8px;text-align:center;color:var(--mh-muted);font-size:16px}
.mh-detail{padding:19px}.mh-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap}.mh-detail-head h3{font-size:clamp(23px,2.3vw,29px);line-height:1.22;color:#152e91;font-weight:900}.mh-detail-head p{margin-top:5px;color:#5c6d91;font-size:16px;max-width:690px}
.mh-chip{display:inline-flex;align-items:center;max-width:100%;padding:5px 10px;border-radius:8px;background:#e9f1ff;color:#2448aa;border:1px solid #d5e3ff;font-size:16px;font-weight:750;white-space:normal;overflow-wrap:anywhere}
.mh-chips{display:flex;flex-wrap:wrap;gap:8px;margin:13px 0 14px}.mh-chip.mh-violet{background:#f2ecff;color:#6243ad;border-color:#e1d7fc}.mh-chip.mh-slate{background:#f1f4f8;color:#4f6078;border-color:#e4e9f0}
.mh-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:0 0 15px}.mh-metric{border:1px solid #dfe8fa;background:#f7f9ff;border-radius:11px;padding:11px 12px;min-width:0}.mh-metric:nth-child(2){background:#f1faf6;border-color:#d7efe3}.mh-metric:nth-child(3){background:#f8f4ff;border-color:#e8defc}
.mh-metric label{display:block;font-size:16px;font-weight:650;color:#596a90;line-height:1.32}.mh-metric strong{display:block;color:#1a399e;font-size:clamp(19px,1.9vw,23px);word-break:break-word;line-height:1.32;margin:5px 0 2px;font-variant-numeric:tabular-nums}.mh-metric small{display:block;font-size:16px;color:#7483a5;line-height:1.35}
.mh-tabs{display:flex;gap:7px;flex-wrap:wrap;border-bottom:1px solid #dce5f5;padding-bottom:10px;margin:0 0 14px}.mh-tab{min-height:39px;border:1px solid #dce4f4;border-radius:9px;background:#fff;color:#475a8b;padding:7px 12px;font-weight:750;font-size:16px}.mh-tab[aria-selected=true]{background:#344bc9;border-color:#344bc9;color:white}.mh-tab:hover{border-color:#889bef}
.mh-content{min-height:265px}.mh-section-title{font-size:18px;font-weight:820;color:#1f3a98;margin:0 0 10px}.mh-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mh-info-card{border:1px solid #e0e7f6;background:#fafbff;padding:13px 14px;border-radius:12px;min-width:0}.mh-info-card strong{display:block;margin-bottom:6px;font-size:17px;color:#273e92}.mh-info-card p{color:#4e6085;font-size:16px}.mh-info-card ul{padding-left:20px;margin:7px 0 0}.mh-info-card li{margin:4px 0;font-size:16px}
.mh-properties{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mh-property{padding:11px 13px;border:1px solid #e0e6f2;border-radius:11px;background:#fbfcff}.mh-property span{display:block;font-size:16px;color:#617095}.mh-property strong{display:block;font-size:19px;color:#1d3c9a;margin-top:4px}
.mh-fieldrow{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin-bottom:13px}.mh-fieldrow label{display:flex;flex-direction:column;gap:5px;color:#4b5983;font-weight:700;font-size:16px}.mh-fieldrow input{height:40px;width:150px;padding:7px 10px;border:1px solid #cad8ee;border-radius:9px;color:#203376;background:#fff;font-size:16px}
.mh-fieldnote{color:#6a7b9b;font-size:16px;margin:0 0 12px}.mh-table-wrap{overflow-x:auto;border:1px solid #dfe7f5;border-radius:10px}.mh-table{width:100%;min-width:620px;border-collapse:collapse;font-size:16px;text-align:left}.mh-table th{background:#ecf1ff;color:#2d4599;white-space:nowrap;padding:10px 12px;font-size:16px;font-weight:800}.mh-table td{border-top:1px solid #e9eef8;padding:10px 12px;color:#364b7c;font-variant-numeric:tabular-nums;font-size:16px}.mh-table tr:nth-child(even) td{background:#fafcff}.mh-table tr.mh-selected-row td{background:#eef7f2;color:#145f52;font-weight:750}
.mh-callout{margin-top:12px;padding:12px 14px;border-radius:11px;background:#f1f6ff;color:#465e90;border:1px solid #e0e9fa;font-size:16px;line-height:1.55}.mh-callout strong{color:#2143a1}
.mh-warning{background:#fff9ec;color:#7e5820;border-color:#efdcab}.mh-sources{display:flex;flex-direction:column;gap:9px}.mh-source{border:1px solid #dde5f4;padding:12px 14px;border-radius:11px;background:#fafbff}.mh-source strong{font-size:16px;display:block;color:#1b3a9c}.mh-source span{display:block;font-size:16px;color:#5f7195;margin-top:3px}.mh-source a{display:inline-block;margin-top:6px;font-weight:800;font-size:16px;color:#2255ca;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}
.mh-footer{color:#6e7b9c;font-size:16px;margin-top:13px}.mh-load-error{border:1px solid #f3bfc4;background:#fff6f7;color:#a12a43;border-radius:14px;padding:19px;margin:12px 0;font-size:16px}
@media(max-width:1100px){.mh-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:800px){.mh-layout{grid-template-columns:1fr}.mh-aside,.mh-detail{padding:13px}.mh-list{max-height:285px}.mh-info-grid{grid-template-columns:1fr}}
@media(max-width:480px){.mh .mh-heading h2{font-size:23px}.mh-detail-head h3{font-size:23px}.mh-metrics{gap:7px}.mh-metric{padding:9px}.mh-tab{flex:1 1 calc(50% - 8px);padding:7px}.mh-properties{grid-template-columns:1fr}}
`;

function rangeLabel(c, dimensionLabel) {
  if (!c || !c.from && !c.to) return 'Giá trị tham khảo';
  const start = num(c.from), end = num(c.to);
  const mark = dimensionLabel === 'Đường kính d' ? 'd' : 't';
  return `${start} ${c.fromInclusive ? '≤' : '<'} ${mark} ${c.toInclusive ? '≤' : '<'} ${end} mm`;
}
function inBand(value, c) {
  if (!Number.isFinite(value) || !Number.isFinite(c.from) || !Number.isFinite(c.to)) return false;
  return (c.fromInclusive ? value >= c.from : value > c.from) && (c.toInclusive ? value <= c.to : value < c.to);
}
function valueText(obj, symbol='') {
  if (!obj || typeof obj !== 'object') return '—';
  if (Number.isFinite(obj.reference)) return `${num(obj.reference)}${symbol ? ' '+symbol : ''}`;
  if (Number.isFinite(obj.min) && Number.isFinite(obj.max)) return `${num(obj.min)}–${num(obj.max)}`;
  if (Number.isFinite(obj.min)) return `≥ ${num(obj.min)}`;
  if (Number.isFinite(obj.max)) return `≤ ${num(obj.max)}`;
  return '—';
}
function normalizeSourceLink(source) {
  const link = safeUrl(source?.url);
  return link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Mở tài liệu gốc ↗</a>` : `<span>Tài liệu tham khảo người dùng cung cấp, không đính kèm bản sao.</span>`;
}
function caseFor(material, value) {
  const cases = arr(material?.mechanical?.cases);
  return material?.mechanical?.dimension ? (cases.find(row => inBand(value, row)) || null) : (cases[0] || null);
}
function valueBasis(m, field) {
  if (!m?.mechanical?.dimension || field?.reference != null) return 'Tham khảo theo hãng';
  return 'Theo vùng kích thước';
}


function materialFields(m, sources) {
  const mech = m.mechanical || {}, chem = m.chemistry || {}, physical = m.physical || {};
  const fields = [
    ['Tên / mác', [m.grade, m.title, m.materialNumber, ...arr(m.otherNames)].filter(Boolean).join(' · ')],
    ['Nhóm vật liệu', FAMILY_LABEL[m.family] || m.family],
    ['Tiêu chuẩn', [m.standard,m.system].filter(Boolean).join(' · ')],
    ['Mô tả', m.description], ['Ứng dụng', arr(m.applications).join(' · ')],
    ['Sản phẩm / trạng thái', [m.productForm,m.condition].filter(Boolean).join(' · ')],
    ['Lưu ý', [...arr(m.notes),m.sourceEditionNote].filter(Boolean).join(' · ')]
  ].map(([label,text]) => ({label,text}));
  for (const row of arr(mech.cases)) fields.push({label:'Cơ tính',text:[
    mech.dimension ? rangeLabel(row,mech.dimension.label) : 'Theo tài liệu hãng',
    'Giới hạn chảy '+(mech.yieldSymbol || 'Re')+' '+valueText(row.yieldMpa)+' MPa',
    'Độ bền kéo Rm '+valueText(row.tensileMpa)+' MPa', 'Độ giãn dài A '+valueText(row.elongationPct)+' %'
  ].join(' · ')});
  if (mech.impact) fields.push({label:'Va đập',text:'KV ≥ '+num(mech.impact.minJ)+' J tại '+num(mech.impact.temperatureC)+' °C · '+txt(mech.impact.note)});
  fields.push({label:'Thành phần hóa học',text:arr(chem.rows).map(row => row.element+' '+(row.mode === 'typical' ? num(row.value) : valueText(row))+' % '+txt(row.applicability)).join(' · ')});
  fields.push({label:'Tính chất vật lý',text:[
    Number.isFinite(physical.densityKgM3?.value) ? 'Khối lượng riêng ρ '+num(physical.densityKgM3.value)+' kg/m³' : '',
    Number.isFinite(physical.youngModulusGpa?.value) ? 'Mô đun đàn hồi E '+num(physical.youngModulusGpa.value)+' GPa' : ''
  ].filter(Boolean).join(' · ')});
  const used = new Set([...arr(m.sourceIds),...arr(mech.sourceIds),...arr(chem.sourceIds),...arr(physical.sourceIds)]);
  fields.push({label:'Nguồn dữ liệu',text:sources.filter(source => used.has(source.id)).map(source => [source.publisher,source.title,source.note].filter(Boolean).join(' · ')).join(' · ')});
  return fields;
}

export async function mount(root, ctx = {}) {
  if (!root || typeof root.querySelector !== 'function') throw new Error('Không tìm thấy vị trí Sổ tay vật liệu kỹ thuật.');
  const ac = new AbortController();
  const stop = () => ac.abort();
  const cleanup = () => { stop(); ctx.signal?.removeEventListener('abort', stop); };
  if (ctx.signal?.aborted) { cleanup(); return cleanup; }
  ctx.signal?.addEventListener('abort', stop, { once:true });
  const state = {db:null, index:[], selectedId:'en-10025-2-s355j2-hot-rolled-plate', query:'', group:'steel', family:'all', tab:'overview', dimensions:{}};
  root.innerHTML = `<style>${CSS}</style><div class="mh hbs"><div class="mh-topbar"><header class="mh-heading"><h2>Sổ tay vật liệu kỹ thuật</h2><p>Tra cứu đặc tính, ứng dụng và tiêu chuẩn vật liệu kỹ thuật.</p></header>${searchForm({placeholder:"VD: S355J2, thép không gỉ, trục, EN 10025…",prefix:"material",label:"Tra cứu vật liệu theo từ khóa"})}</div><nav class="mh-group-tabs" role="tablist" aria-label="Nhóm vật liệu kỹ thuật">${MATERIAL_GROUPS.map(group=>`<button type="button" class="mh-group-tab" id="mh-group-${esc(group.id)}" data-mh-group="${esc(group.id)}" role="tab" aria-controls="mh-group-panel" aria-selected="${group.id===state.group}" tabindex="${group.id===state.group?'0':'-1'}" title="${esc(group.title)}" disabled>${groupIcon(group.id)}<span>${esc(group.label)}</span></button>`).join('')}</nav><div data-mh-content id="mh-group-panel" role="tabpanel" aria-labelledby="mh-group-steel" class="mh-load-error" style="background:#f6f8ff;border-color:#dce4fa;color:#52648d">Đang nạp dữ liệu vật liệu…</div></div>`;
  const $ = sel => root.querySelector(sel);
  $('[data-hbs-clear]')?.remove();
  const selected = () => state.db?.materials.find(m=>m.id===state.selectedId);
  const dimension = (m) => state.dimensions[m.id] ?? m.mechanical?.dimension?.default ?? 0;
  const activeCase = m => caseFor(m, dimension(m));
  const selectedGroup = () => MATERIAL_GROUPS.find(group => group.id === state.group);
  const groupHasData = () => state.db.materials.some(material => materialGroup(material) === state.group);

  function drawGroupTabs() {
    for (const button of root.querySelectorAll('[data-mh-group]')) {
      const active = button.dataset.mhGroup === state.group;
      button.setAttribute('aria-selected',String(active));
      button.tabIndex = active ? 0 : -1;
      button.disabled = !state.db;
    }
    $('[data-mh-content]').setAttribute('aria-labelledby','mh-group-'+state.group);
  }
  function chooseGroup(id, moveFocus = false) {
    if (!state.db || !MATERIAL_GROUPS.some(group => group.id === id)) return;
    if (state.group !== id) {
      state.group = id;
      state.family = 'all';
      $('[data-mh-family]').value = 'all';
      drawGroupTabs();
      applySearch();
    }
    const button = root.querySelector('[data-mh-group="'+id+'"]');
    if (moveFocus) button.focus({preventScroll:true});
    button.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
  }

  function filtered() {
    return searchIndex(state.index.filter(item => materialGroup(item.record) === state.group),state.query).filter(item => state.family === 'all' || item.record.family === state.family).map(item => item.record);
  }
  function applySearch() {
    state.query = $('[data-hbs-input]').value.slice(0,160);
    const candidates = filtered();
    if (!candidates.some(m => m.id === state.selectedId)) { state.selectedId = candidates[0]?.id || ''; state.tab = 'overview'; }
    drawDetail();
  }
  function drawList() {
    const matches = filtered();
    const container = $('[data-mh-list]');
    if (!container) return;
    $('[data-mh-visible]').textContent = String(matches.length);
    const query = state.query.trim();
    $('[data-hbs-status]').textContent = (query ? matches.length+' kết quả cho “'+query+'”.' : matches.length+' vật liệu.') + (state.family === 'all' ? '' : ' Nhóm: '+FAMILY_LABEL[state.family]+'.');
    container.innerHTML = matches.length ? matches.map(m=>`<button type="button" class="mh-item" data-mh-id="${esc(m.id)}" aria-pressed="${m.id===selected()?.id}"><span><span class="mh-item-name">${highlight(m.grade,state.query)}</span><span class="mh-item-sub">${highlight(FAMILY_LABEL[m.family]||m.family,state.query)} · ${highlight(m.materialNumber||m.standard,state.query)}</span>${state.query.trim() ? snippets(state.index.find(item=>item.record.id===m.id),state.query,2) : ''}</span><span class="mh-item-arrow" aria-hidden="true">›</span></button>`).join('') : `<div class="mh-empty">Không tìm thấy vật liệu phù hợp.</div>`;
  }
  function metric(title, result, note) {
    return `<div class="mh-metric"><label>${esc(title)}</label><strong>${esc(result)}</strong><small>${esc(note)}</small></div>`;
  }
  function drawOverview(m) {
    const phys=m.physical||{};
    const density=phys.densityKgM3?.value;
    const E=phys.youngModulusGpa?.value;
    return `<div class="mh-info-grid"><section class="mh-info-card"><strong>Thông tin vật liệu</strong><p>${esc(m.description)}</p><ul><li><b>Hệ:</b> ${esc(m.system)}</li><li><b>Tiêu chuẩn:</b> ${esc(m.standard)}</li><li><b>Sản phẩm:</b> ${esc(m.productForm)}</li><li><b>Trạng thái:</b> ${esc(m.condition)}</li></ul></section><section class="mh-info-card"><strong>Ứng dụng tham khảo</strong><ul>${arr(m.applications).map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section><section class="mh-info-card"><strong>Tính chất vật lý</strong><div class="mh-properties"><div class="mh-property"><span>Khối lượng riêng ρ</span><strong>${Number.isFinite(density)?esc(num(density))+' kg/m³':'Chưa xác minh'}</strong></div><div class="mh-property"><span>Mô đun đàn hồi E</span><strong>${Number.isFinite(E)?esc(num(E))+' GPa':'Chưa xác minh'}</strong></div></div><p style="margin-top:8px">${phys.densityKgM3?.kind==='typical_generic'?'Thông số vật lý điển hình của thép kết cấu, không phải số liệu đo riêng từng lô.':'Thông số theo tài liệu nhà sản xuất, ở khoảng 20°C khi được chỉ rõ.'}</p></section><section class="mh-info-card"><strong>Lưu ý kỹ thuật</strong><ul>${arr(m.notes).map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section></div><div class="mh-callout mh-warning"><strong>Phân biệt:</strong> Vật liệu “có thể so sánh” không mặc nhiên “tương đương” hoặc được phép thay thế trong thiết kế. ${esc(m.sourceEditionNote||'')}</div>`;
  }
  function drawMechanical(m) {
    const mech = m.mechanical||{}, dim=mech.dimension, rows=arr(mech.cases), actual=activeCase(m);
    const form=dim ? `<div class="mh-fieldrow"><label>Chọn ${esc(dim.label.toLowerCase())} (${esc(dim.unit)})<input type="number" data-mh-dimension min="0" step="any" value="${esc(dimension(m))}" inputmode="decimal"></label><p class="mh-fieldnote">Chọn trong khoảng hỗ trợ để xem giới hạn cơ tính đúng.</p></div>` : '';
    const err=dim && !actual ? `<div class="mh-callout mh-warning">Kích thước ngoài phạm vi dữ liệu mẫu. Không suy diễn hoặc tự dùng vùng gần nhất.</div>` : '';
    const tableRows=rows.map(row=>{
      const flag=dim ? row===actual : false;
      return `<tr${flag?' class="mh-selected-row"':''}><td>${esc(dim?rangeLabel(row,dim.label):'Dữ liệu hãng tham khảo')}</td><td>${esc(valueText(row.yieldMpa))}</td><td>${esc(valueText(row.tensileMpa))}</td><td>${esc(valueText(row.elongationPct))}</td></tr>`;
    }).join('');
    const note=mech.note || 'Cơ tính cần đối chiếu đúng dạng sản phẩm, chiều dày/đường kính, phương thử và điều kiện giao hàng.';
    const impact=mech.impact ? `<div class="mh-callout"><strong>Thử va đập:</strong> KV ≥ ${esc(num(mech.impact.minJ))} J tại ${esc(num(mech.impact.temperatureC))}°C. ${esc(mech.impact.note||'')}</div>`:'';
    return `${form}${err}<div class="mh-table-wrap"><table class="mh-table"><thead><tr><th>${esc(dim?dim.label:'Phạm vi')}</th><th>${esc(mech.yieldSymbol||'Re')} (MPa)</th><th>Rm (MPa)</th><th>A (%)</th></tr></thead><tbody>${tableRows}</tbody></table></div><div class="mh-callout"><strong>Đọc bảng:</strong> “≥” là giới hạn tối thiểu, “x–y” là khoảng; trị số không ký hiệu giới hạn thuộc nhóm tham khảo của hãng. ${esc(note)}</div>${impact}`;
  }
  function drawChemistry(m) {
    const chemistry=m.chemistry || {}, kinds={heat_analysis_limits:'Giới hạn thành phần theo phân tích mẻ nấu (heat analysis)',typical_manufacturer_composition:'Thành phần điển hình của nhà sản xuất — không phải giới hạn tiêu chuẩn'};
    const rows=arr(chemistry.rows).map(c=>{
      const val=c.mode==='typical'?num(c.value):c.min!=null&&c.max!=null?`${num(c.min)}–${num(c.max)}`:c.max!=null?`≤ ${num(c.max)}`:c.min!=null?`≥ ${num(c.min)}`:'—';
      return `<tr><td><b>${esc(c.element)}</b></td><td>${esc(val)}</td><td>${esc(c.mode==='typical'?'Điển hình':'Giới hạn')}</td><td>${esc(c.applicability||'—')}</td></tr>`;
    }).join('');
    return `<p class="mh-fieldnote">${esc(kinds[chemistry.kind]||'Thành phần hóa học')} · đơn vị: % khối lượng.</p><div class="mh-table-wrap"><table class="mh-table"><thead><tr><th>Nguyên tố</th><th>% khối lượng</th><th>Loại giá trị</th><th>Điều kiện</th></tr></thead><tbody>${rows}</tbody></table></div><div class="mh-callout mh-warning">Không suy ra giới hạn thành phần từ giá trị điển hình. Những nguyên tố không hiển thị có nghĩa là <b>chưa đưa vào bản mẫu</b>, không có nghĩa bằng 0.</div>`;
  }
  function drawSources(m) {
    const used = new Set(arr(m.sourceIds));
    for(const id of arr(m.mechanical?.sourceIds)) used.add(id);
    for(const id of arr(m.chemistry?.sourceIds)) used.add(id);
    for(const id of arr(m.physical?.sourceIds)) used.add(id);
    const sources=state.db.sources.filter(s=>used.has(s.id));
    return `<h4 class="mh-section-title">Tài liệu đã tham chiếu</h4><div class="mh-sources">${sources.map(s=>`<article class="mh-source"><strong>${esc(s.publisher)} — ${esc(s.title)}</strong><span>${esc(s.note||'')}</span>${normalizeSourceLink(s)}</article>`).join('')}</div><div class="mh-callout mh-warning">Nguồn dữ liệu mẫu không thay thế tiêu chuẩn hiện hành hoặc chứng chỉ vật liệu EN 10204 của lô hàng. Cần xác minh riêng trước khi dùng cho tính toán thiết kế.</div>`;
  }
  function drawDetail() {
    const m=selected();
    if (!m && !groupHasData()) {
      $('[data-mh-detail]').innerHTML=`<div class="hbs-empty"><strong>${esc(selectedGroup().title)}</strong><p>Chưa có dữ liệu cho nhóm này. Danh mục sẽ được bổ sung từng bước.</p></div>`;
      drawList();
      return;
    }
    if (!m) { $('[data-mh-detail]').innerHTML='<div class="hbs-empty"><strong>Không tìm thấy kết quả phù hợp</strong><p>Thử từ khóa ngắn hơn hoặc chọn lại nhóm vật liệu.</p></div>'; drawList(); return; }
    const c=activeCase(m);const mech=m.mechanical||{};
    const y=c?.yieldMpa,t=c?.tensileMpa,a=c?.elongationPct,d=m.physical?.densityKgM3?.value;
    const metrics=metric(mech.yieldSymbol||'Giới hạn chảy',valueText(y),'MPa · '+valueBasis(m,y))+
      metric('Độ bền kéo Rm',valueText(t),'MPa · '+(m.mechanical?.dimension?'theo kích thước':'chưa xác minh'))+
      metric('Độ giãn dài A',valueText(a),'% · '+valueBasis(m,a))+
      metric('Khối lượng riêng',Number.isFinite(d)?num(d):'—','kg/m³ · '+(m.physical?.densityKgM3?.kind==='typical_generic'?'tham khảo chung':'theo nguồn'));
    const views={overview:drawOverview,mechanical:drawMechanical,chemistry:drawChemistry,sources:drawSources};
    $('[data-mh-detail]').innerHTML=`<div class="mh-detail-head"><div><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p></div><span class="mh-chip">${esc(FAMILY_LABEL[m.family]||m.family)}</span></div><div class="mh-chips"><span class="mh-chip mh-violet">${esc(m.grade)}</span><span class="mh-chip mh-slate">${esc(m.materialNumber||'—')}</span><span class="mh-chip mh-slate">${esc(m.standard)}</span></div><div class="mh-metrics">${metrics}</div><nav class="mh-tabs" role="tablist" aria-label="Chi tiết vật liệu">${DETAIL_TABS.map(([id,label])=>`<button type="button" class="mh-tab" role="tab" data-mh-tab="${id}" aria-selected="${state.tab===id}">${esc(label)}</button>`).join('')}</nav><div class="mh-content" role="tabpanel">${(views[state.tab]||drawOverview)(m)}</div><footer class="mh-footer">Mã bản ghi: ${esc(m.id)} · Trạng thái dữ liệu: Bản mẫu, chưa duyệt cho tính toán.</footer>`;
    drawList();
  }
  $('[data-hbs-input]').disabled=true;
  $('[data-hbs-submit]').disabled=true;
  $('[data-hbs-submit]').innerHTML='<span class="hbs-spinner" aria-hidden="true"></span>Đang tải';
  $('[data-hbs-status]').textContent='Đang tải dữ liệu sổ tay…';
  try {
    state.db=await loadMaterialDatabase({signal:ac.signal});
    if(ac.signal.aborted) return cleanup;
    state.index=createIndex(state.db.materials,m=>materialFields(m,state.db.sources));
    const area=$('[data-mh-content]');
    area.className='mh-layout';
    area.innerHTML=`<aside class="mh-aside"><div class="mh-side-title"><strong>Kết quả tra cứu</strong><span class="mh-count" data-mh-visible></span></div><label class="mh-input-label" for="mh-family-filter">Nhóm vật liệu</label><select class="mh-filter" id="mh-family-filter" data-mh-family>${Object.entries(FAMILY_LABEL).map(([k,label])=>`<option value="${esc(k)}">${esc(label)}</option>`).join('')}</select><div class="mh-list" data-mh-list aria-label="Danh sách vật liệu"></div></aside><article class="mh-detail" data-mh-detail></article>`;
    $('[data-hbs-input]').disabled=false;
    $('[data-hbs-submit]').disabled=false;
    $('[data-hbs-submit]').textContent='Tìm kiếm';
    drawGroupTabs();
    applySearch();
    root.addEventListener('input',evt=>{
      if(evt.target.matches('[data-hbs-input]') && !evt.isComposing) applySearch();
    },{signal:ac.signal});
    root.addEventListener('compositionend',evt=>{if(evt.target.matches('[data-hbs-input]'))applySearch();},{signal:ac.signal});
    root.addEventListener('submit',evt=>{if(evt.target.matches('[data-hbs-form]')){evt.preventDefault();applySearch();}},{signal:ac.signal});
    root.addEventListener('change',evt=>{
      if(evt.target.matches('[data-mh-family]')){
        state.family=evt.target.value;
        applySearch();
      }
      if(evt.target.matches('[data-mh-dimension]')){
        const m=selected(),v=Number(evt.target.value);
        state.dimensions[m.id]=evt.target.value.trim() === '' ? NaN : v;
        drawDetail();
      }
    },{signal:ac.signal});
    root.addEventListener('click',evt=>{
      const groupButton=evt.target.closest('[data-mh-group]');
      if(groupButton && root.contains(groupButton)){chooseGroup(groupButton.dataset.mhGroup);return;}
      const selection=evt.target.closest('[data-mh-id]');
      if(selection && root.contains(selection)) {state.selectedId=selection.dataset.mhId;state.tab='overview';drawDetail();return;}
      const tab=evt.target.closest('[data-mh-tab]');
      if(tab && root.contains(tab)){state.tab=tab.dataset.mhTab;drawDetail();}
    },{signal:ac.signal});
    root.addEventListener('keydown',evt=>{
      const button=evt.target.closest('[data-mh-group]');
      if(!button || !root.contains(button) || !['ArrowLeft','ArrowRight','Home','End'].includes(evt.key))return;
      evt.preventDefault();
      const current=MATERIAL_GROUPS.findIndex(group=>group.id===button.dataset.mhGroup);
      const next=evt.key==='Home'?0:evt.key==='End'?MATERIAL_GROUPS.length-1:(current+(evt.key==='ArrowRight'?1:-1)+MATERIAL_GROUPS.length)%MATERIAL_GROUPS.length;
      chooseGroup(MATERIAL_GROUPS[next].id,true);
    },{signal:ac.signal});
  } catch (error) {
    if(!ac.signal.aborted) {
      console.error('[material-handbook] Data load error:',error);
      const area=$('[data-mh-content]');if(area)area.className='mh-load-error';
      if(area)area.textContent='Chưa tải được dữ liệu vật liệu. Vui lòng kiểm tra kết nối và tải lại trang.';
      $('[data-hbs-submit]').textContent='Tìm kiếm';
      $('[data-hbs-status]').textContent='Chưa tải được dữ liệu sổ tay.';
    }
  }
  return cleanup;
}
