import { installHandbookI18n } from './handbook-search.js';
/**
 * Epsilon Blue Soft — Sổ tay vật liệu kỹ thuật (bản xem trước).
 * Database: ../../data/handbook/material-handbook.json relative to this file.
 * Mount contract: export async function mount(root, ctx) => cleanup().
 * Không thay đổi app.js hoặc các module tính toán khác.
 * Dữ liệu mẫu chưa được duyệt để làm đầu vào tính toán thiết kế.
 */

import { SEARCH_CSS, createIndex, searchIndex, highlight, snippets } from './handbook-search.js';

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
const GROUP_TABS = Object.freeze([
  {id:'all', label:'Vật liệu kỹ thuật', title:'Vật liệu kỹ thuật'},
  ...MATERIAL_GROUPS
]);
// Navigation folders, not material specifications. Empty folders remain visible for review.
const CATEGORY_FOLDERS = Object.freeze({
  steel:[['structural','Thép kết cấu'],['machinery','Thép chế tạo máy'],['tool','Thép dụng cụ và khuôn'],['spring','Thép lò xo'],['bearing','Thép ổ lăn'],['stainless','Thép không gỉ'],['heat-pressure','Thép chịu nhiệt và áp lực'],['wear','Thép chống mài mòn']],
  'cast-iron':[['grey','Gang xám'],['ductile','Gang cầu'],['malleable','Gang dẻo'],['alloy','Gang hợp kim']],
  nonferrous:[['aluminium','Nhôm và hợp kim'],['copper','Đồng và hợp kim'],['zinc','Kẽm và hợp kim'],['magnesium','Magiê và hợp kim'],['titanium','Titan và hợp kim'],['nickel','Niken và hợp kim']],
  polymer:[['thermoplastic','Nhựa nhiệt dẻo'],['thermoset','Nhựa nhiệt rắn']],
  elastomer:[['natural','Cao su tự nhiên'],['synthetic','Cao su tổng hợp']],
  'ceramic-glass':[['ceramic','Gốm kỹ thuật'],['glass','Thủy tinh (kính)']],
  composite:[['glass-fibre','Composite cốt sợi thủy tinh'],['carbon-fibre','Composite cốt sợi carbon'],['other','Composite khác']],
  lubricant:[['oil','Dầu bôi trơn'],['grease','Mỡ bôi trơn'],['solid','Chất bôi trơn rắn'],['machining','Chất bôi trơn gia công']]
});
// Fixed local SVGs follow the app's existing outline icon style.
const GROUP_ICON_PATHS = Object.freeze({
  all:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
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
  ['overview', 'Tổng quan'], ['usage', 'Khuyến cáo sử dụng'], ['mechanical', 'Cơ tính'], ['chemistry', 'Thành phần'], ['heat', 'Nhiệt luyện'], ['welding', 'Hàn'], ['physical', 'Vật lý'], ['sources', 'Nguồn & lịch sử']
]);
const FMT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 });
const txt = (v) => String(v ?? '');
const esc = (v) => txt(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => (Number.isFinite(v) ? FMT.format(v) : '—');
const arr = v => Array.isArray(v) ? v : [];

function makeCatalogue(materials) {
  const nodes = new Map(), roots = [], ancestors = new Map();
  function node(parent, id, label, groupId) {
    const key = parent ? parent.key+'/'+encodeURIComponent(id) : groupId;
    if (nodes.has(key)) return nodes.get(key);
    const value = {key,id,label,groupId,children:[],materialIds:[]};
    nodes.set(key,value);
    (parent ? parent.children : roots).push(value);
    return value;
  }
  for (const group of MATERIAL_GROUPS) {
    const root = node(null,group.id,group.label,group.id);
    for (const [id,label] of CATEGORY_FOLDERS[group.id] || []) node(root,id,label,group.id);
  }
  for (const material of materials) {
    const groupId = materialGroup(material), root = nodes.get(groupId);
    if (!root) throw new Error('Vật liệu chưa được gán vào một trong tám nhóm: '+material.id);
    // Optional categoryPath supports deeper folders without changing the current database.
    const custom = Array.isArray(material.categoryPath) ? material.categoryPath.slice(0,12).filter(part => part && typeof part.id === 'string' && part.id && typeof part.label === 'string') : [];
    const path = custom.length ? custom : [{id:material.family || 'other',label:FAMILY_LABEL[material.family] || material.family || 'Vật liệu khác'}];
    let parent = root;
    const keys = [root.key];
    for (const part of path) { parent = node(parent,part.id,part.label,groupId); keys.push(parent.key); }
    parent.materialIds.push(material.id);
    ancestors.set(material.id,keys);
  }
  return {roots,nodes,ancestors,byId:new Map(materials.map(material=>[material.id,material]))};
}

const FOLDER_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/></svg>';


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

/* Smart search is deterministic and reads only the validated handbook dataset.
 * All numeric thresholds refer to the published record's value at the selected
 * dimension; unknown data never pass a required engineering filter.
 */
const SMART_FIELDS = Object.freeze([
  {id:'re',tag:'#Re / Rp0,2',title:'Giới hạn chảy',kind:'mechanical',field:'yieldMpa',unit:'MPa',example:'400'},
  {id:'rm',tag:'#Rm',title:'Độ bền kéo',kind:'mechanical',field:'tensileMpa',unit:'MPa',example:'500'},
  {id:'a',tag:'#A',title:'Độ giãn dài',kind:'mechanical',field:'elongationPct',unit:'%',example:'20'},
  {id:'kv',tag:'#KV',title:'Năng lượng va đập',kind:'impact',unit:'J',example:'27'},
  {id:'kvTemp',tag:'#Nhiệt độ KV',title:'Nhiệt độ thử va đập',kind:'temperature',unit:'°C',example:'-20'},
  {id:'t',tag:'#Chiều dày',title:'Chiều dày tấm',kind:'dimension',dimension:'thickness',unit:'mm',example:'20'},
  {id:'d',tag:'#Đường kính',title:'Đường kính thanh',kind:'dimension',dimension:'diameter',unit:'mm',example:'60'},
  {id:'e',tag:'#E',title:'Mô đun đàn hồi',kind:'physical',field:'youngModulusGpa',unit:'GPa',example:'210'},
  {id:'rho',tag:'#ρ',title:'Khối lượng riêng',kind:'physical',field:'densityKgM3',unit:'kg/m³',example:'7850'},
  {id:'c',tag:'#C',title:'Carbon',kind:'chemistry',element:'C',unit:'%',example:'0.2'},
  {id:'mn',tag:'#Mn',title:'Mangan',kind:'chemistry',element:'Mn',unit:'%',example:'1.6'},
  {id:'cr',tag:'#Cr',title:'Chromium',kind:'chemistry',element:'Cr',unit:'%',example:'18'},
  {id:'ni',tag:'#Ni',title:'Nickel',kind:'chemistry',element:'Ni',unit:'%',example:'8'},
  {id:'mo',tag:'#Mo',title:'Molybdenum',kind:'chemistry',element:'Mo',unit:'%',example:'2'},
  {id:'standard',tag:'#Tiêu chuẩn',title:'Tiêu chuẩn',kind:'text',field:'standard',example:'EN 10025-2'},
  {id:'condition',tag:'#Trạng thái',title:'Trạng thái giao hàng',kind:'text',field:'condition',example:'+QT'},
  {id:'form',tag:'#Dạng sản phẩm',title:'Dạng sản phẩm',kind:'text',field:'productForm',example:'Thanh tròn'}
]);
const SMART_FIELD_BY_ID = new Map(SMART_FIELDS.map(item=>[item.id,item]));
const SMART_OPERATORS = Object.freeze([['≥','≥'],['>','>'],['≤','≤'],['<','<'],['=','=']]);
const SMART_NOTICE = 'HB chỉ cung cấp thông tin, phân tích và đề xuất tham khảo. Quyết định lựa chọn và sử dụng vật liệu cuối cùng thuộc về người dùng.';
const normalizeSmart = s => txt(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim();
const smartNumber = v => {
  const text=String(v ?? '').trim().replace(',','.');
  return text && /^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(text) ? Number(text) : NaN;
};
const smartComplete = item => !!item && String(item.value ?? '').trim()!=='';
const smartOpsText = op => SMART_OPERATORS.some(x=>x[0]===op) ? op : '≥';
function smartCompare(min,max,op,target) {
  if (!Number.isFinite(target)) return false;
  if (op==='≥') return Number.isFinite(min) && min>=target;
  if (op==='>') return Number.isFinite(min) && min>target;
  if (op==='≤') return Number.isFinite(max) && max<=target;
  if (op==='<') return Number.isFinite(max) && max<target;
  if (op==='=') return Number.isFinite(min) && Number.isFinite(max) && min===max && min===target;
  return false;
}
function chemicalRowApplies(row,material,dimensionValue) {
  if (!row.applicability) return true;
  // Strictly recognize the interval format currently used by the database.
  // An unknown condition must not be treated as universally applicable.
  const parsed=String(row.applicability).match(/^\s*([\d.,]+)\s*(≤|<)\s*([td])\s*(≤|<)\s*([\d.,]+)\s*mm\s*$/u);
  if (!parsed) return false;
  if ((parsed[3]==='t'?'thickness':'diameter')!==material.mechanical?.dimension?.kind) return false;
  const lo=smartNumber(parsed[1]),hi=smartNumber(parsed[5]);
  if (!Number.isFinite(dimensionValue) || !Number.isFinite(lo) || !Number.isFinite(hi)) return false;
  return (parsed[2]==='≤'?lo<=dimensionValue:lo<dimensionValue) && (parsed[4]==='≤'?dimensionValue<=hi:dimensionValue<hi);
}
/** Returns false for unknown / reference-only limiting values, rather than guessing. */
export function matchSmartMaterial(material,filters={},selectedDimensions={}) {
  if (!material || !filters || typeof filters!=='object') return {pass:false,details:[]};
  const entries=Object.entries(filters).filter(([key,criterion])=>SMART_FIELD_BY_ID.has(key)&&smartComplete(criterion));
  const dimensions=Object.fromEntries(entries.filter(([key])=>['t','d'].includes(key)));
  // A single material cannot simultaneously be evaluated as a plate and a round bar.
  if (dimensions.t && dimensions.d) return {pass:false,details:[]};
  const dimDef=material.mechanical?.dimension;
  const dimOverride=dimensions.t ? {kind:'thickness',value:smartNumber(dimensions.t.value)} : dimensions.d ? {kind:'diameter',value:smartNumber(dimensions.d.value)} : null;
  if (dimOverride && (dimDef?.kind!==dimOverride.kind || !Number.isFinite(dimOverride.value) || dimOverride.value<=0)) return {pass:false,details:[]};
  const ownDimension=selectedDimensions?.[material.id];
  const dimValue=dimOverride ? dimOverride.value : Number.isFinite(ownDimension) ? ownDimension : dimDef?.default;
  const band=caseFor(material,dimValue);
  const impactTemp=filters.kvTemp && smartComplete(filters.kvTemp) ? smartNumber(filters.kvTemp.value) : NaN;
  const details=[];
  for (const [key,filter] of entries) {
    const def=SMART_FIELD_BY_ID.get(key);
    const op=smartOpsText(filter.op), v=smartNumber(filter.value);
    if (def.kind==='dimension') {
      if(!band) return {pass:false,details:[]};
      details.push(def.title+' '+num(v)+' mm');
      continue;
    }
    if (def.kind==='text') {
      if (!normalizeSmart(material[def.field]).includes(normalizeSmart(filter.value))) return {pass:false,details:[]};
      details.push(def.title+': '+txt(filter.value));
      continue;
    }
    if (!Number.isFinite(v)) return {pass:false,details:[]};
    if (def.kind==='mechanical') {
      // Manufacturer *indicative* values (reference) are not limiting values.
      const value=band?.[def.field];
      if (!value || Number.isFinite(value.reference) || !smartCompare(value.min,value.max,op,v)) return {pass:false,details:[]};
      details.push((key==='re'?(material.mechanical?.yieldSymbol||'Re'):(key==='rm'?'Rm':'A'))+' '+valueText(value)+' '+def.unit);
    } else if (def.kind==='impact' || def.kind==='temperature') {
      const impact=material.mechanical?.impact;
      // Impact results require the *same* test temperature, not just the same energy.
      if (!impact || !Number.isFinite(impact.temperatureC)) return {pass:false,details:[]};
      if (def.kind==='impact') {
        if (!Number.isFinite(impactTemp) || impact.temperatureC!==impactTemp || !smartCompare(impact.minJ,Infinity,op,v)) return {pass:false,details:[]};
        details.push('KV ≥ '+num(impact.minJ)+' J / '+num(impactTemp)+'°C');
      } else {
        if (impact.temperatureC!==v) return {pass:false,details:[]};
        if (!filters.kv || !smartComplete(filters.kv)) details.push('KV tại '+num(v)+'°C');
      }
    } else if (def.kind==='physical') {
      const property=material.physical?.[def.field];
      if (!Number.isFinite(property?.value) || !smartCompare(property.value,property.value,op,v)) return {pass:false,details:[]};
      details.push(def.title+' ≈ '+num(property.value)+' '+def.unit+' (tham khảo)');
    } else if (def.kind==='chemistry') {
      const matches=arr(material.chemistry?.rows).filter(r=>r.element===def.element && r.mode==='limit' && chemicalRowApplies(r,material,dimValue));
      if (!matches.length || !matches.some(r=>smartCompare(r.min,r.max,op,v))) return {pass:false,details:[]};
      details.push(def.element+' '+matches.map(r=>valueText(r)).join(' / ')+' %');
    }
  }
  return {pass:true,details};
}
function recognizeTypedSmartQuery(query) {
  const parsed=[];
  const expression=/(^|[\s;,])\b(ReH|Re|Rp0[.,]2|Rm|KV|A|Mn|Cr|Ni|Mo|C|rho|density|E)\s*(>=|<=|≥|≤|>|<|=)\s*([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))\s*(?:MPa|GPa|kg\/m(?:3|³)|J|%)?/gi;
  const rest=String(query).replace(expression,(full,prefix,name,op,value)=>{
    const lower=name.toLowerCase();
    const id=['reh','re','rp0.2','rp0,2'].includes(lower)?'re':lower==='density'?'rho':lower;
    if (!SMART_FIELD_BY_ID.has(id)) return full;
    parsed.push({id,op:op==='>='?'≥':op==='<='?'≤':op,value:value.replace(',','.')});
    return prefix;
  });
  if (!parsed.length) return null;
  const text=rest.replace(/\b(?:tìm|kiếm|có|với|yêu cầu|tôi cần|cần)\b/gi,' ').replace(/\s+/g,' ').trim();
  return {parsed,text};
}

const CSS = SEARCH_CSS + `
.mh,.mh *{box-sizing:border-box}
.mh{--mh-blue:#2348d5;--mh-ink:#1b2b64;--mh-muted:#536587;--mh-line:#dde5f5;--mh-soft:#f7f9ff;--mh-green:#008e73;--mh-purple:#6d48d3;color:var(--mh-ink);font:16px/1.52 Inter,'Segoe UI',Arial,sans-serif;width:100%;margin:0;max-width:none;container:material-handbook / inline-size}
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
.mh-group-tabs{display:grid;grid-template-columns:minmax(200px,1.35fr) repeat(8,minmax(0,1fr));gap:8px;padding:0 0 9px;margin:0 0 14px;border-bottom:1px solid var(--mh-line)}
.mh .mh-group-tab{min-width:0;min-height:54px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:8px 10px;border:1px solid #d7e0f4;border-radius:11px;background:#fff;color:#43598b;font-size:16px;font-weight:750;line-height:1.4;white-space:normal;transition:background .15s,border-color .15s}
.mh-group-tab:hover{background:#f0f4ff;border-color:#94a7ec}.mh-group-tab[aria-selected=true]{color:#fff;background:#344bc9;border-color:#344bc9;box-shadow:0 3px 9px #344bc91c}.mh-group-tab:disabled{cursor:wait}
.mh-group-icon{display:grid;place-items:center;flex:0 0 32px;width:32px;height:32px;border-radius:9px;color:var(--mh-group-icon,#3862b1);background:var(--mh-group-soft,#eaf1ff)}
.mh-group-icon svg{display:block;flex-shrink:0}
.mh-group-tab[data-mh-group=all]{--mh-group-icon:#6751b9;--mh-group-soft:#f0ecff}
.mh-group-tab[data-mh-group=steel]{--mh-group-icon:#3469a7;--mh-group-soft:#eaf2ff}
.mh-group-tab[data-mh-group=cast-iron]{--mh-group-icon:#69718c;--mh-group-soft:#edf0f7}
.mh-group-tab[data-mh-group=nonferrous]{--mh-group-icon:#a66c1b;--mh-group-soft:#fff3dc}
.mh-group-tab[data-mh-group=polymer]{--mh-group-icon:#138878;--mh-group-soft:#e6f7f2}
.mh-group-tab[data-mh-group=elastomer]{--mh-group-icon:#7750b7;--mh-group-soft:#f2eaff}
.mh-group-tab[data-mh-group=ceramic-glass]{--mh-group-icon:#1686a5;--mh-group-soft:#e7f7fc}
.mh-group-tab[data-mh-group=composite]{--mh-group-icon:#5965b7;--mh-group-soft:#edf0ff}
.mh-group-tab[data-mh-group=lubricant]{--mh-group-icon:#b47a13;--mh-group-soft:#fff4db}
.mh-group-tab[aria-selected=true] .mh-group-icon{color:#fff;background:#ffffff24}
.mh-layout{display:grid;grid-template-columns:minmax(306px,378px) minmax(0,1fr);gap:15px;align-items:start}
.mh-layout.mh-sidebar-collapsed{grid-template-columns:56px minmax(0,1fr)}
.mh-aside,.mh-detail{background:white;border:1px solid var(--mh-line);border-radius:16px;box-shadow:0 4px 18px #15317d09;min-width:0}
.mh-aside{padding:15px}.mh-side-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;padding:9px;border:1px solid #2f46bc;border-radius:11px;background:linear-gradient(110deg,#263eb7,#4055d5);box-shadow:0 3px 9px #344bc91a}.mh-side-title strong{display:flex;align-items:center;gap:8px;font-size:17px;font-weight:850;line-height:1.35;color:#fff}.mh-count{background:#edf1ff;border-radius:8px;padding:3px 9px;color:#4057b1;font-size:16px;font-weight:750}
.mh-side-title strong{flex:1;min-width:0;overflow-wrap:anywhere}.mh .mh-sidebar-toggle{flex:0 0 34px;width:34px;height:34px;display:grid;place-items:center;padding:0;border:1px solid #d4dff5;border-radius:9px;background:#f2f6ff;color:#3656a9}.mh .mh-sidebar-toggle:hover{background:#e8efff;border-color:#a9bbe8}.mh-sidebar-toggle svg{display:block}
.mh-side-title .mh-group-icon{background:#ffffff26;color:#fff}.mh-side-title>.mh-count{background:#ffffff24;color:#fff}.mh .mh-side-title .mh-sidebar-toggle{border-color:#ffffff55;background:#ffffff16;color:#fff}.mh .mh-side-title .mh-sidebar-toggle:hover{background:#ffffff30}
@media(min-width:801px){.mh-sidebar-collapsed>.mh-aside{padding:10px 6px}.mh-sidebar-collapsed .mh-side-title{justify-content:center;margin:0;padding:0;border:0;background:transparent;box-shadow:none}.mh-sidebar-collapsed .mh-side-title>strong,.mh-sidebar-collapsed .mh-side-title>.mh-count{display:none}.mh .mh-sidebar-collapsed .mh-sidebar-toggle{background:#f2f6ff;color:#3656a9;border-color:#d4dff5}}
.mh-input-label{display:block;color:#40547e;font-weight:700;font-size:16px;margin-bottom:6px}.mh-search,.mh-filter{width:100%;height:43px;min-width:0;color:var(--mh-ink);background:#fff;border:1px solid #ccd9ee;border-radius:10px;padding:8px 11px;font-size:16px}.mh-search{margin-bottom:10px}.mh-filter{margin-bottom:12px;background:#f9fbff}
.mh-list{display:flex;flex-direction:column;gap:8px;max-height:680px;overflow-y:auto;padding-right:2px}
.mh-item{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;text-align:left;color:#263b7a;border:1px solid #e2e8f6;border-radius:11px;background:#fff;padding:11px 12px;min-height:80px;transition:background .15s,border-color .15s}
.mh-item:hover{border-color:#a5b5ff;background:#f6f7ff}.mh-item[aria-pressed=true]{border-color:#687ce6;background:#eff2ff;box-shadow:inset 3px 0 #435bdf}
.mh-item-name{font-size:19px;font-weight:850;display:block;color:#1c348a;line-height:1.3}.mh-item-sub{font-size:16px;color:#627296;display:block;line-height:1.4}.mh-item-arrow{color:#5a68ba;font-size:22px;flex-shrink:0}
.mh-tree{display:flex;flex-direction:column;gap:6px;max-height:740px;overflow-y:auto;min-width:0;scrollbar-width:thin}
.mh-tree-node{min-width:0}.mh-tree-node>summary{display:flex;align-items:center;gap:7px;min-height:42px;padding:7px 6px;border:1px solid transparent;border-radius:9px;list-style:none;cursor:pointer;color:#6a43c7;font-size:16px;font-weight:800;line-height:1.4}
.mh-tree-node>summary::-webkit-details-marker{display:none}.mh-tree-node>summary:hover{background:#f0f4ff;border-color:#e0e7f8}.mh-tree-node>summary:focus-visible{outline:3px solid #9ab4ff;outline-offset:2px}
.mh-tree-chevron{flex:0 0 7px;width:7px;height:7px;border-right:1.8px solid #8192bb;border-bottom:1.8px solid #8192bb;transform:rotate(-45deg);margin-right:2px}.mh-tree-node[open]>summary>.mh-tree-chevron{transform:rotate(45deg)}
.mh-tree-folder{display:grid;place-items:center;flex:0 0 18px;color:#7d5ad6}.mh-tree-label{flex:1;min-width:0;overflow-wrap:anywhere}.mh-tree-count{flex:0 0 auto;min-width:24px;text-align:center;padding:1px 5px;border-radius:6px;background:#f1ecff;color:#7459c7;font-size:16px;font-weight:700}
.mh-tree-node[data-mh-empty=true]>summary{color:#8f83b3}.mh-tree-children{display:flex;flex-direction:column;gap:5px;margin:2px 0 7px 9px;padding-left:10px;border-left:1px solid #e1e8f6;min-width:0}
.mh .mh-tree-leaf{min-height:58px;padding:8px 10px;gap:6px}.mh-tree-leaf .mh-item-name{font-size:17px}.mh-tree-leaf .mh-item-sub{font-size:16px}.mh-tree-empty{padding:9px 6px;font-size:16px;color:#8794b0;line-height:1.45}
.mh-tree-node>summary .mh-group-icon{width:26px;height:26px;flex-basis:26px;border-radius:7px}.mh-tree-node>summary .mh-group-icon svg{width:19px;height:19px}
.mh-tree-filter{position:relative;margin:0 0 12px}.mh .mh-tree-filter select{appearance:none;-webkit-appearance:none;height:46px;margin-bottom:0;padding:9px 44px 9px 13px;border:2px solid #8a73df;border-radius:10px;background:linear-gradient(180deg,#faf7ff,#f1ecff);color:#6a43c7;font-weight:800;box-shadow:0 2px 6px #6a43c714;cursor:pointer}.mh .mh-tree-filter select:hover{border-color:#6f4dd8;background:#f1ecff}.mh .mh-tree-filter select:focus{border-color:#5f39cf;box-shadow:0 0 0 3px #6a43c722}.mh .mh-tree-filter select option{background:#fff;color:#5635b9;font-weight:700}
.mh-tree-filter:after{content:'';position:absolute;right:17px;top:50%;width:11px;height:11px;border-right:3px solid #6a43c7;border-bottom:3px solid #6a43c7;transform:translateY(-70%) rotate(45deg);pointer-events:none}.mh-scope-name{font-size:16px;color:#7b63b7;margin-bottom:10px}
@container material-handbook (max-width:1450px){.mh-group-tabs{grid-template-columns:repeat(5,minmax(0,1fr))}}
@container material-handbook (max-width:1000px){.mh-group-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}}
@container material-handbook (max-width:600px){.mh .mh-group-tab{flex-direction:column;gap:5px;padding:7px 5px;min-height:82px}.mh-group-icon{width:28px;height:28px;flex-basis:28px}.mh-group-icon svg{width:20px;height:20px}.mh-tree{max-height:410px}}
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

/* Material-equivalence entry: anchored to the top-right of the selected grade card. */
.mh-detail-head>div:first-child{flex:1 1 420px;min-width:0}
.mh .mh-eq-trigger{display:inline-flex;align-items:center;justify-content:center;gap:8px;flex:0 0 auto;min-height:42px;padding:9px 14px;border-radius:10px;border:1px solid #8299ed;background:linear-gradient(180deg,#f8faff,#ebf0ff);color:#2346b3;font-size:16px;font-weight:750;line-height:1.35;box-shadow:0 2px 7px #294ec110;white-space:nowrap;transition:background .16s,border-color .16s,box-shadow .16s}
.mh .mh-eq-trigger svg{width:19px;height:19px;flex-shrink:0}
.mh .mh-eq-trigger:hover{background:#e5ebff;border-color:#4768d4;box-shadow:0 3px 12px #294ec11e}
.mh .mh-eq-trigger[aria-pressed=true]{background:#344bc9;border-color:#344bc9;color:#fff}
.mh-eq-panel{display:flex;flex-direction:column;gap:13px;margin:1px 0 0}
.mh-eq-intro h4{font-size:19px;font-weight:850;color:#173691;margin:0 0 4px}
.mh-eq-intro p{font-size:16px;color:#607193;margin:0}
.mh-eq-caution{display:flex;align-items:flex-start;gap:8px;border:1px solid #ead7aa;background:#fffaed;border-radius:10px;color:#76551e;padding:10px 12px;font-size:16px;line-height:1.5}
.mh-eq-caution svg{width:19px;height:19px;flex-shrink:0;margin-top:2px}
.mh-eq-list{display:flex;flex-direction:column;gap:7px}
.mh-eq-line{display:flex;align-items:center;gap:12px;min-height:62px;padding:11px 13px;border:1px solid #dee6f6;border-radius:11px;background:#fff;text-align:left;color:#22376b}
.mh-eq-line .mh-eq-number{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;flex:0 0 30px;background:#edf2ff;color:#3956aa;font-size:16px;font-weight:750}
.mh-eq-ident{display:flex;flex:1;flex-direction:column;gap:2px;min-width:0}
.mh-eq-ident strong{font-size:17px;font-weight:850;color:#223c91}
.mh-eq-ident small{font-size:16px;color:#647596;line-height:1.45}
.mh-eq-tag{border:1px solid #dce5f5;border-radius:7px;padding:4px 8px;background:#f2f5fb;color:#50628b;font-size:16px;font-weight:750;white-space:normal;text-align:center}
.mh-eq-origin{border-color:#b6c5ff;background:#eff3ff}
.mh-eq-origin .mh-eq-tag{background:#e2eaff;border-color:#d1ddff;color:#2e4cb3}
.mh .mh-eq-candidate{width:100%;cursor:pointer}
.mh .mh-eq-candidate:hover{background:#f7f9ff;border-color:#95a9ed}
.mh .mh-eq-candidate[aria-pressed=true]{border:2px solid #526de2;padding:10px 12px;background:#f4f6ff}
.mh-eq-comparison{border:1px solid #dfe7f6;border-radius:12px;padding:13px;background:#fcfdff;min-width:0}
.mh-eq-comparison h4{font-size:18px;font-weight:850;color:#213e99;margin:0 0 5px}
.mh-eq-comparison p{font-size:16px;color:#627397;margin:0 0 11px}
.mh-eq-table{min-width:650px}
.mh-eq-table th:first-child{width:22%}
.mh-eq-table th:last-child{width:29%}
.mh-eq-flag{font-size:16px;font-weight:700;line-height:1.45}
.mh-eq-flag[data-tone=ok]{color:#197b66}
.mh-eq-flag[data-tone=warn]{color:#a16113}
.mh-eq-flag[data-tone=none]{color:#697995}
.mh-eq-subtitle{font-size:16px;font-weight:800;color:#2e4999;margin:13px 0 8px}
.mh-eq-no-data{padding:16px;border:1px dashed #cdd7ed;border-radius:11px;background:#f9fbff;color:#5b6f95;font-size:16px}
@container material-handbook (max-width:680px){.mh-detail-head{align-items:stretch}.mh .mh-eq-trigger{margin-left:auto}.mh-eq-line{flex-wrap:wrap}.mh-eq-tag{margin-left:42px}}

/* HB search: actions on the left; scope on the far-right above the query input. */
.mh-topbar{display:grid;grid-template-columns:minmax(300px,.92fr) minmax(0,1.95fr);gap:14px 22px;align-items:end;margin-bottom:13px}
.mh-topbar>.mh-heading{min-width:0;max-width:none}
.mh-search-workspace{min-width:0;display:block}
.mh-search-meta{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px 12px;min-height:25px;color:#35509a;font-size:16px;font-weight:650}
.mh-search-meta strong{color:#17328c}.mh-scope-line{margin-left:auto;text-align:right}
.mh-search-controls{display:flex;align-items:flex-end;gap:8px;min-width:0;flex-wrap:wrap}.mh-query-stack{display:flex;flex-direction:column;gap:5px;min-width:0;flex:1 1 260px}
.mh .mh-advise-button,.mh .mh-query-submit{height:42px;min-height:42px;white-space:nowrap;border-radius:9px;padding:0 13px;font-size:16px;font-weight:750;display:inline-flex;gap:7px;align-items:center;justify-content:center;flex:0 0 auto}
.mh .mh-advise-button{border:1px solid #8298ea;background:linear-gradient(180deg,#fcfdff,#edf1ff);color:#2e4db1}
.mh .mh-advise-button[aria-pressed=true]{color:#fff;background:#344bc9;border-color:#344bc9}
.mh .mh-advise-button:hover{border-color:#4e6cd5;background:#e8efff}
.mh .mh-advise-button[aria-pressed=true]:hover{background:#2d42b4}
.mh .mh-query-submit{border:1px solid #344bc9;background:#344bc9;color:white}
.mh .mh-query-submit:hover{background:#243bb3}
.mh-query-submit:disabled,.mh .mh-advise-button:disabled{opacity:.55;cursor:wait}
.mh .mh-smart-check{display:inline-flex;align-items:center;gap:7px;flex:0 0 auto;white-space:nowrap;cursor:pointer;color:#354e90;font-size:16px;font-weight:700;line-height:1.35}
.mh .mh-smart-check input{accent-color:#3c50cb;width:18px;height:18px;margin:0;cursor:pointer}
.mh .mh-smart-check[data-on=true]{color:#263fb4}
.mh-query-field{position:relative;min-width:0;width:100%;display:flex;align-items:center}
.mh .mh-query-field input{min-width:0;width:100%;height:42px;padding:9px 39px 9px 12px;border:1px solid #cbd8ef;border-radius:9px;background:#fff;color:#24376f;font-size:16px}
.mh .mh-query-field input:focus{border-color:#778eec;box-shadow:0 0 0 3px #344bc91a;outline:none}
.mh .mh-query-clear{position:absolute;right:7px;top:50%;transform:translateY(-50%);height:28px;width:28px;border:0;background:#f0f3fb;border-radius:7px;color:#667aa2;font-size:20px;font-weight:500;display:grid;place-items:center;padding:0;line-height:1}
.mh .mh-query-clear:hover{background:#e2e9ff;color:#2747b4}
.mh-query-hint{display:none}
.mh-smart-panel{border:1px solid #d7e1f8;background:linear-gradient(180deg,#fcfdff,#f6f8ff);padding:13px 14px 11px;border-radius:12px;margin:0 0 13px;box-shadow:0 2px 10px #203c8808}
.mh-smart-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 8px}
.mh-smart-head strong{font-size:16px;color:#2442a2}
.mh-smart-head small{color:#6e7fa0;font-size:16px}
.mh-smart-tags{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px}
.mh .mh-smart-tag{border:1px solid #d7e1f5;background:#fff;color:#41598e;border-radius:20px;padding:6px 11px;font-weight:700;font-size:16px;line-height:1.3;min-height:38px}
.mh .mh-smart-tag:hover{background:#eef3ff;border-color:#8da2e4}
.mh .mh-smart-tag[aria-pressed=true]{background:#e7edff;color:#2344b5;border-color:#6280df;box-shadow:inset 0 0 0 1px #6280df}
.mh-smart-editor-wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(218px,1fr));gap:8px}
.mh-smart-editor{border:1px solid #dfe6f5;background:#fff;border-radius:10px;padding:9px 10px;min-width:0}
.mh-smart-editor-top{display:flex;align-items:center;justify-content:space-between;gap:6px;color:#344d93;font-size:16px;font-weight:800;margin-bottom:7px}
.mh .mh-smart-editor-remove{display:grid;place-items:center;border:0;background:#f0f3fb;color:#61759e;width:30px;height:30px;min-height:30px;padding:0;border-radius:6px;font-size:16px}
.mh .mh-smart-editor-remove:hover{color:#b33b58;background:#fff0f2}
.mh-smart-editor-controls{display:flex;gap:6px;align-items:center;min-width:0}
.mh .mh-smart-editor-controls select,.mh .mh-smart-editor-controls input{height:41px;min-height:41px;border:1px solid #ccd8ee;border-radius:7px;background:#fff;color:#2c4278;font-size:16px;padding:5px 7px;min-width:0;box-shadow:none}
.mh .mh-smart-editor-controls select{flex:0 0 56px;cursor:pointer}
.mh .mh-smart-editor-controls input{flex:1 1 60px;width:100%;appearance:textfield}
.mh .mh-smart-editor-controls input::-webkit-inner-spin-button,.mh .mh-smart-editor-controls input::-webkit-outer-spin-button{appearance:none}
.mh-smart-unit{flex:0 0 auto;color:#66789c;font-size:16px;white-space:nowrap}
.mh-smart-match-preview{display:block;margin-top:4px;color:#3f6796;font-size:16px;font-weight:650;line-height:1.4}
.mh-analysis-panel{border:1px solid #dfe6f5;background:#fff;border-radius:15px;padding:20px;box-shadow:0 4px 18px #15317d09}
.mh-analysis-panel h3{font-size:22px;color:#173899;font-weight:850;margin:0 0 6px}
.mh-analysis-panel>p{color:#5e7194;margin:0 0 16px}
.mh-analysis-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
.mh-analysis-card{border:1px solid #dce5f6;border-radius:12px;background:#f9fbff;padding:17px;min-width:0}
.mh-analysis-card h4{font-size:17px;color:#23429d;margin:0 0 7px}
.mh-analysis-card p{font-size:16px;color:#536790;margin:0 0 12px}
.mh-analysis-status{display:inline-block;border:1px solid #dbe4f5;border-radius:7px;background:#eef2fb;color:#627596;font-size:16px;font-weight:750;padding:4px 8px}
.mh-analysis-notice{margin-top:15px;border:1px solid #efdab3;border-radius:11px;background:#fff9eb;color:#795924;padding:12px 14px;font-size:16px}
@container material-handbook (max-width:1480px){.mh-topbar{grid-template-columns:minmax(260px,.75fr) minmax(0,1.85fr)}.mh-query-stack{flex-basis:290px}}
@container material-handbook (max-width:1050px){.mh-topbar{grid-template-columns:1fr}.mh-query-stack{flex-basis:420px}.mh-analysis-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container material-handbook (max-width:650px){.mh-query-stack{flex:1 1 100%;order:3}.mh-search-controls{gap:7px}.mh .mh-advise-button,.mh .mh-query-submit{min-height:42px;height:42px;padding:0 10px}.mh-search-meta{justify-content:space-between;min-height:25px}.mh-smart-panel{padding:11px}.mh-analysis-cards{grid-template-columns:1fr}.mh-smart-editor-wrap{grid-template-columns:1fr}}


/* User-controlled comparison: two independent selection slots, no expert ranking. */
.mh-detail-actions{display:flex;align-items:flex-start;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.mh .mh-compare-trigger{border-color:#9bc9c2;background:linear-gradient(180deg,#fff,#edf9f5);color:#147664}
.mh .mh-compare-trigger:hover{background:#e6f6f0;border-color:#4eac98}
.mh-item-end{display:inline-flex;align-items:center;gap:8px;flex-shrink:0}
.mh-compare-leaf-tag{font-size:16px;font-weight:800;border-radius:7px;padding:2px 7px}.mh-compare-leaf-tag[data-slot=1]{color:#245fc0;background:#eaf3ff;border:1px solid #cfe0fb}.mh-compare-leaf-tag[data-slot=2]{color:#7a49c6;background:#f2ebff;border:1px solid #e0d0ff}
.mh-compare-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:16px}
.mh-compare-head h3{font-size:clamp(23px,2.3vw,28px);font-weight:900;color:#173896}
.mh-compare-head p{font-size:16px;color:#60739b;margin-top:3px}
.mh .mh-compare-close{display:flex;align-items:center;justify-content:center;gap:5px;border:1px solid #d7e1f2;border-radius:9px;background:#f8faff;color:#475d91;padding:8px 12px;min-height:42px;font-size:18px;font-weight:700}
.mh .mh-compare-close span{font-size:16px}
.mh .mh-compare-close:hover{background:#ebf1ff;border-color:#8fa7e6}
.mh-compare-slots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.mh-compare-slot{min-height:213px;min-width:0;border:1px solid #dce5f4;border-radius:13px;padding:14px;background:linear-gradient(180deg,#fff,#fafbff);transition:border-color .15s,background .15s}
.mh-compare-slot-1{border-color:#d6e4ff;background:linear-gradient(180deg,#ffffff,#f5f9ff)}.mh-compare-slot-2{border-color:#eadbff;background:linear-gradient(180deg,#ffffff,#fbf7ff)}
.mh-compare-slot.mh-compare-choosing{border:2px solid #627cdb;padding:13px;background:#f5f8ff;box-shadow:inset 0 0 0 1px #ccd7ff}
.mh-compare-slot.mh-compare-placeholder{border-style:dashed}
.mh-compare-slot-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.mh-compare-pill{display:inline-block;background:#e8eeff;color:#2a49ac;border-radius:7px;padding:5px 11px;font-weight:850;font-size:17px}
.mh-compare-pill-1{background:#eaf3ff;color:#2d66c4}.mh-compare-pill-2{background:#f1eaff;color:#7a49c6}
.mh-compare-slot-1 .mh-compare-grade{color:#245fc0}.mh-compare-slot-2 .mh-compare-grade{color:#7a49c6}
.mh-compare-slot-1 .mh-compare-sub span{background:#eef5ff;border-color:#d6e4ff;color:#3b67b2}.mh-compare-slot-2 .mh-compare-sub span{background:#f5efff;border-color:#e4d5ff;color:#7b57bb}
.mh-compare-slot-1 .mh-compare-change{border-color:#9fc0ef;color:#245fc0}.mh-compare-slot-1 .mh-compare-change:hover{background:#eaf3ff;border-color:#5d8fdd}.mh-compare-slot-2 .mh-compare-change{border-color:#c6b0ef;color:#7a49c6}.mh-compare-slot-2 .mh-compare-change:hover{background:#f4eeff;border-color:#9a75e0}
.mh-compare-table thead .mh-compare-col-1{color:#245fc0;background:#eef5ff}.mh-compare-table thead .mh-compare-col-2{color:#7a49c6;background:#f5efff}
.mh .mh-compare-change{border:1px solid #9ab1e7;background:#fff;border-radius:9px;color:#2e4fbb;padding:7px 11px;min-height:38px;font-size:16px;font-weight:800}
.mh .mh-compare-change:hover{background:#eaf0ff;border-color:#4d70d6}
.mh-compare-grade{display:block;font-size:24px;line-height:1.25;font-weight:900;color:#173a9b}
.mh-compare-slot p{color:#5c6d90;font-size:16px;line-height:1.45;margin:5px 0}
.mh-compare-sub{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.mh-compare-sub span{display:inline-flex;background:#f0f4ff;border:1px solid #e1e8f8;color:#4f6391;border-radius:7px;padding:4px 8px;font-size:16px;line-height:1.45}
.mh-compare-no-material{padding:16px 4px 14px;text-align:center;color:#64769a}
.mh-compare-no-material strong{font-size:19px;color:#3d5592}
.mh-compare-no-material p{font-size:16px}
.mh-compare-dimension{display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin-top:13px;color:#41598c;font-size:16px;font-weight:750}
.mh-compare-dimension input{width:125px;max-width:100%;height:39px;padding:7px 10px;border:1px solid #bfceef;border-radius:9px;background:white;color:#233a8a;font-size:16px}
.mh-compare-guide{margin:14px 0;padding:11px 13px;border-radius:10px;border:1px solid #cfddf7;background:#f1f5ff;color:#354e90;font-size:16px;line-height:1.5}
.mh-compare-wait{padding:22px 15px;text-align:center;border:1px dashed #c9d7ee;border-radius:11px;color:#60749a;background:#fafcff;font-size:16px}
.mh-compare-wait strong{display:block;color:#3553a1;font-size:18px;margin-bottom:5px}
.mh-compare-wait p{font-size:16px}
.mh-compare-results{display:flex;flex-direction:column;gap:10px}
.mh-compare-scroll-hint{display:none;color:#5c6e92;font-size:16px}
.mh-compare-results h4{margin:11px 0 0;font-size:19px;font-weight:850;color:#233e94}
.mh-compare-table{min-width:730px}
.mh-compare-table th:first-child{width:23%}
.mh-compare-table th:last-child{width:30%}
.mh-compare-table th[scope=row]{background:#f5f7fd;color:#324b89;border-top:1px solid #e9eef8;text-align:left;font-size:16px;font-weight:750;white-space:normal}
.mh-compare-table td{overflow-wrap:anywhere}
.mh-compare-footnote{font-size:16px;color:#5a6c91;line-height:1.5;margin:5px 0 2px}
@container material-handbook (max-width:760px){.mh-compare-scroll-hint{display:block}.mh-compare-slots{grid-template-columns:1fr}.mh-compare-slot{min-height:0}.mh-detail-actions{width:100%;justify-content:flex-start}}

.mh-footer{color:#6e7b9c;font-size:16px;margin-top:13px}.mh-load-error{border:1px solid #f3bfc4;background:#fff6f7;color:#a12a43;border-radius:14px;padding:19px;margin:12px 0;font-size:16px}
@media(max-width:1100px){.mh-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:800px){.mh-layout,.mh-layout.mh-sidebar-collapsed{grid-template-columns:1fr}.mh-aside,.mh-detail{padding:13px}.mh-list{max-height:285px}.mh-info-grid{grid-template-columns:1fr}}
@media(max-width:480px){.mh .mh-heading h2{font-size:23px}.mh-detail-head h3{font-size:23px}.mh-metrics{gap:7px}.mh-metric{padding:9px}.mh-tab{flex:1 1 calc(50% - 8px);padding:7px}.mh-properties{grid-template-columns:1fr}}
.mh-condbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;border:1px solid #dfe8fa;background:#fbfcff;border-radius:11px;padding:10px 12px;margin:0 0 12px;font-size:16px;color:#536587}
.mh-condbar label{display:flex;align-items:center;gap:8px;font-weight:650;color:#1b2b64}.mh-condbar input{width:120px;min-height:40px;border:1px solid #cdd9f2;border-radius:8px;padding:4px 10px;font-size:16px;color:#1b2b64;background:#fff}
.mh-condbar-warn{color:#a12a43;font-weight:650}
.mh-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.mh .mh-subtitle{font-size:17px;font-weight:700;margin:18px 0 8px;color:#1b2b64}.mh .mh-note{font-size:16px;color:#536587;margin:8px 0;line-height:1.5}
.mh-info-wide{grid-column:1/-1}.mh-table th[scope=row]{font-weight:650;text-align:left}
.mh-book{border:1px solid #e4e9f0;border-radius:11px;padding:10px 14px;margin:16px 0;background:#fcfcfe}.mh-book summary{cursor:pointer;font-weight:700;font-size:16px;color:#1b2b64}.mh-book ul{margin:8px 0;padding-left:20px}
.mh-table tr.mh-ht-empty td{color:#7483a5}.mh-weld-rating{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:baseline;border:1px solid #d7efe3;background:#f1faf6;border-radius:11px;padding:10px 12px;margin:0 0 10px;font-size:16px}.mh-weld-rating[data-rating=limited],.mh-weld-rating[data-rating=difficult]{border-color:#f1d9a8;background:#fff8ea}.mh-weld-rating small{font-size:16px;color:#536587}.mh-table tr.mh-suit-not_recommended td:nth-child(2){color:#a12a43;font-weight:650}.mh-table tr.mh-suit-conditional td:nth-child(2){color:#7a5410;font-weight:650}.mh-table tr.mh-suit-suitable td:nth-child(2){color:#006b56;font-weight:650}.mh-recon{margin:6px 0 10px;padding-left:20px;font-size:16px;color:#3e4f78}.mh-record-id{border-top:1px solid #e4e9f0;padding-top:10px;margin-top:16px!important}
.mh .mh-eq-subtitle{font-size:17px;font-weight:700;margin:16px 0 6px;color:#1b2b64}
.mh-table tr.mh-issue-high th{color:#a12a43}
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


/* ---- Presentation helpers (v2): read-only formatting of existing JSON fields ---- */
const ELEMENT_ORDER = Object.freeze(['C','Si','Mn','P','S','N','Cr','Mo','Ni','Cu','Al','Nb','V','Ti','B']);
const elementRank = e => { const i = ELEMENT_ORDER.indexOf(e); return i < 0 ? ELEMENT_ORDER.length : i; };
const VALUE_KIND_LABEL = Object.freeze({
  manufacturer_reference:'Số liệu nhà sản xuất', supplier_reference:'Số liệu nhà cung cấp',
  manufacturer_indicative:'Giá trị tham khảo của hãng', typical_generic:'Giá trị điển hình chung',
  manufacturer_reference_20c:'Số liệu hãng ở 20 °C', heat_analysis_limits:'Giới hạn phân tích mẻ nấu',
  typical_manufacturer_composition:'Thành phần điển hình của hãng', manufacturer_catalogue_limit:'Giới hạn theo catalogue hãng',
  grade_requirement:'Yêu cầu của cấp mác', manufacturer_datasheet_reference_to_standard:'Bảng hãng dẫn theo tiêu chuẩn',
  alternative_standard_reference:'Bảng theo tiêu chuẩn khác', heat_analysis_max_combined:'Giới hạn tổng (phân tích mẻ)',
  supplier_reference_minimum_by_relevant_diameter:'Số liệu nhà cung cấp theo đường kính',
  historical_standard_value_as_tabulated_in_ASTM_DS67B_2004:'Giá trị tiêu chuẩn cũ (sách 2004)',
  standard_historical_limits_not_current_acceptance:'Giới hạn tiêu chuẩn cũ',
  manufacturer_reference_for_solution_annealed_austenitic_grade:'Số liệu hãng, trạng thái ủ dung dịch'
});
const kindLabel = k => VALUE_KIND_LABEL[k] || (k ? String(k).replace(/_/g,' ') : '—');
const ORIENTATION_LABEL = Object.freeze({T:'Ngang (T)', L:'Dọc (L)'});
const ORIENTATION_SHORT = Object.freeze({T:'ngang', L:'dọc'});
const EDITION_TEXT = Object.freeze({
  historical_ASTMDs67B_reference:'Tham chiếu lịch sử (sách 2004)', historical_composition_reference:'Thành phần lịch sử (sách 2004)', historical_chemical_limits:'Giới hạn hóa học lịch sử (sách 2004)',
  current_reference_to_verify_for_contract:'Phiên bản hiện hành cần đối chiếu khi sử dụng', supplier_reference_QT:'Nhà cung cấp viện dẫn (+QT)', potential_current_standard_to_review:'Tiêu chuẩn hiện hành cần rà soát',
  manufacturer_mechanical_by_product_form:'Cơ tính theo dạng sản phẩm (hãng)', alternative_manufacturer_mechanical_table:'Bảng cơ tính thay thế (hãng)',
  historical_not_for_current_acceptance:'Lịch sử, không dùng nghiệm thu', historical:'Lịch sử', historical_not_for_current_application:'Lịch sử, xem phiên bản tiêu chuẩn áp dụng',
  requires_primary_standard_and_product_verification:'Cần đối chiếu văn bản tiêu chuẩn và sản phẩm', identified_in_manufacturer_declaration_not_full_standard_review:'Nêu trong tuyên bố của hãng, chưa đối chiếu toàn văn',
  source_specific_reference:'Theo nguồn nhà cung cấp', not_compared_to_full_normative_text:'Chưa đối chiếu toàn văn', manufacturer_reference_needs_edition_and_contract_check:'Cần xác minh phiên bản và hợp đồng',
  manufacturer_reference_not_combined_with_EN_limit:'Không ghép với giới hạn EN'
});
const SEVERITY_LABEL = Object.freeze({high:'Cao', medium:'Trung bình', low:'Thấp', info:'Thông tin'});
const editionText = c => EDITION_TEXT[c] || txt(c).replace(/_/g,' ');
const FORM_LABEL = Object.freeze({cold_rolled_coil_sheet:'Cuộn/tấm cán nguội', hot_rolled_coil_sheet:'Cuộn/tấm cán nóng', quarto_plate:'Tấm dày (quarto)',
  cold_rolled_strip:'Dải cán nguội', hot_rolled_strip:'Dải cán nóng', hot_rolled_plate:'Tấm cán nóng'});
const WELD_RATING_LABEL = Object.freeze({good:'Tốt', fair:'Khá', limited:'Hạn chế', difficult:'Khó hàn'});
const WELD_PROCESS_LABEL = Object.freeze({SMAW:'Hàn hồ quang que (SMAW)', GMAW:'Hàn MIG/MAG (GMAW)', FCAW:'Hàn dây lõi thuốc (FCAW)', SAW:'Hàn hồ quang chìm (SAW)', GTAW:'Hàn TIG (GTAW)'});
const ENV_LABEL = Object.freeze({indoor_dry:'Trong nhà, khô', outdoor_atmospheric:'Ngoài trời, khí quyển', marine_chloride:'Biển, nước mặn, có clorua', chemical:'Hóa chất (axit, kiềm)',
  food_contact:'Tiếp xúc thực phẩm', low_temperature:'Nhiệt độ thấp', elevated_temperature:'Nhiệt độ cao', wear:'Mài mòn', fatigue_loading:'Tải trọng thay đổi, mỏi'});
const SUIT_LABEL = Object.freeze({suitable:'Phù hợp', conditional:'Có điều kiện', not_recommended:'Không khuyến cáo'});
const rangeC = t => htTemperature(t);
const HT_PROCESS_LABEL = Object.freeze({
  normalizing:'Thường hóa', soft_annealing:'Ủ mềm', full_annealing:'Ủ hoàn toàn', hardening:'Tôi', tempering:'Ram',
  quench_and_temper:'Tôi + ram', induction_hardening:'Tôi cao tần', flame_hardening:'Tôi ngọn lửa', carburizing:'Thấm carbon',
  nitriding:'Thấm nitơ', solution_annealing:'Ủ dung dịch', stress_relieving:'Khử ứng suất', precipitation_hardening:'Hóa bền tiết pha'
});
const COOLING_LABEL = Object.freeze({water:'Nước', oil:'Dầu', polymer:'Dung dịch polymer', water_or_oil:'Nước hoặc dầu', air:'Không khí', still_air:'Không khí tĩnh', furnace:'Nguội theo lò', rapid:'Làm nguội nhanh'});
function htTemperature(t) {
  if (!t || (!Number.isFinite(t.min) && !Number.isFinite(t.max))) return 'Chưa có dữ liệu';
  if (Number.isFinite(t.min) && Number.isFinite(t.max)) return t.min === t.max ? `${num(t.min)} °C` : `${num(t.min)}–${num(t.max)} °C`;
  return Number.isFinite(t.min) ? `≥ ${num(t.min)} °C` : `≤ ${num(t.max)} °C`;
}
function htHardness(h) {
  if (!h || (!Number.isFinite(h.min) && !Number.isFinite(h.max))) return '';
  const scale = h.scale ? ' ' + h.scale : '';
  if (Number.isFinite(h.min) && Number.isFinite(h.max)) return `${num(h.min)}–${num(h.max)}${scale}`;
  return Number.isFinite(h.min) ? `≥ ${num(h.min)}${scale}` : `≤ ${num(h.max)}${scale}`;
}
const htHasValues = r => Boolean(r && (Number.isFinite(r.temperatureC?.min) || Number.isFinite(r.temperatureC?.max) || r.cooling || htHardness(r.resultHardness) || r.sourceId));
const PHYSICAL_LABELS = Object.freeze({
  densityKgM3:['Khối lượng riêng ρ','kg/m³'], youngModulusGpa:['Mô đun đàn hồi E','GPa'],
  linearThermalExpansion20To100C_10eMinus6PerK:['Hệ số giãn nở nhiệt (20–100 °C)','10⁻⁶/K'],
  thermalConductivity20C_WmK:['Hệ số dẫn nhiệt (20 °C)','W/(m·K)'], specificHeat20C_JkgK:['Nhiệt dung riêng (20 °C)','J/(kg·K)'],
  electricalResistivity20C_OhmMm2PerM:['Điện trở suất (20 °C)','Ω·mm²/m'], magnetizable:['Nhiễm từ','']
});
const gaugeText = g => g === '5.65sqrtS0' ? 'L₀ = 5,65√S₀' : txt(g);
const dimMark = dim => dim?.kind === 'diameter' ? 'd' : 't';
/** Value of a limit/reference object for display; reference values are marked with ≈. */
function cellValue(obj) {
  if (!obj || typeof obj !== 'object') return '—';
  if (Number.isFinite(obj.reference)) return '≈ ' + num(obj.reference);
  return valueText(obj);
}
function chemValue(row) {
  if (!row) return '—';
  if (row.mode === 'typical') return Number.isFinite(row.value) ? '≈ ' + num(row.value) : '—';
  return valueText(row);
}
/** Generic band label for {from,to,fromInclusive,toInclusive}; open ends allowed. */
function bandLabel(b, mark='t') {
  if (!b) return '—';
  const hasFrom = Number.isFinite(b.from), hasTo = Number.isFinite(b.to);
  if (hasFrom && hasTo) return `${num(b.from)} ${b.fromInclusive ? '≤' : '<'} ${mark} ${b.toInclusive ? '≤' : '<'} ${num(b.to)} mm`;
  if (hasTo) return `${mark} ${b.toInclusive ? '≤' : '<'} ${num(b.to)} mm`;
  if (hasFrom) return `${mark} ${b.fromInclusive ? '≥' : '>'} ${num(b.from)} mm`;
  return 'Mọi kích thước';
}
function inOpenBand(value, b) {
  if (!Number.isFinite(value) || !b) return false;
  const okFrom = !Number.isFinite(b.from) || (b.fromInclusive ? value >= b.from : value > b.from);
  const okTo = !Number.isFinite(b.to) || (b.toInclusive ? value <= b.to : value < b.to);
  return okFrom && okTo;
}
function physicalEntries(m) {
  const p = m?.physical || {};
  return Object.entries(p).filter(([k,v]) => k !== 'sourceIds' && v && typeof v === 'object' && 'value' in v).map(([k,v]) => {
    const [label, unit] = PHYSICAL_LABELS[k] || [k, ''];
    const value = typeof v.value === 'boolean' ? (v.value ? 'Có' : 'Không') : Number.isFinite(v.value) ? num(v.value) + (unit ? ' ' + unit : '') : '—';
    return {key:k, label, value, kind:v.kind, sourceId:v.sourceId || arr(p.sourceIds)[0] || ''};
  });
}
function caption(text) { return `<caption class="mh-sr-only">${esc(text)}</caption>`; }
function mdTable(headers, rows, cap) {
  return `<div class="mh-table-wrap"><table class="mh-table">${cap ? caption(cap) : ''}<thead><tr>${headers.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
const tr = (cells, cls='') => `<tr${cls ? ` class="${cls}"` : ''}>${cells.map((c,i) => i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`).join('')}</tr>`;
function materialFields(m, sources) {
  const mech = m.mechanical || {}, chem = m.chemistry || {}, physical = m.physical || {};
  const groupId=materialGroup(m),group=MATERIAL_GROUPS.find(item=>item.id===groupId);
  const folder=(CATEGORY_FOLDERS[groupId]||[]).find(([id])=>id===m.family);
  const fields = [
    ['Tên / mác', [m.grade, m.title, m.materialNumber, ...arr(m.otherNames)].filter(Boolean).join(' · ')],
    ['Nhóm vật liệu', [group?.title,FAMILY_LABEL[m.family]||folder?.[1]||m.family,...arr(m.categoryPath).map(part=>part?.label)].filter(Boolean).join(' · ')],
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
  const disposeI18n = installHandbookI18n(root);
  const stop = () => ac.abort();
  const cleanup = () => { disposeI18n(); stop(); ctx.signal?.removeEventListener('abort', stop); };
  if (ctx.signal?.aborted) { cleanup(); return cleanup; }
  ctx.signal?.addEventListener('abort', stop, { once:true });
  const state = {db:null, index:[], catalogue:null, selectedId:'en-10025-2-s355j2-hot-rolled-plate', query:'', group:'steel', filterKey:'all', tab:'overview', dimensions:{}, openNodes:new Set(), savedSelection:{}, sidebarCollapsed:false,eqOpen:false,eqCandidateId:'',smartEnabled:false,smartCriteria:{},analysisOpen:false,compareOpen:false,compareIds:['',''],compareGroup:'',comparePicking:0,compareMessage:''};
  const toolbar = `<div class="mh-search-workspace"><form class="mh-search-controls" data-hbs-form role="search" autocomplete="off"><button type="button" class="mh-advise-button" data-mh-analysis-toggle aria-pressed="false" title="Mở công cụ tư vấn và phân tích">${'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l3-7 4 14 3-7h4"/></svg>'}<span>Tư vấn & phân tích</span></button><button type="submit" class="mh-query-submit" data-hbs-submit>Tìm kiếm</button><div class="mh-query-stack"><div class="mh-search-meta"><label class="mh-smart-check" data-mh-smart-check data-on="false"><input type="checkbox" data-mh-smart-toggle aria-controls="mh-smart-panel"/>Tìm kiếm thông minh</label><span class="mh-scope-line">Tra cứu trong: <strong data-mh-scope-name>Thép</strong></span></div><div class="mh-query-field"><input data-hbs-input type="text" enterkeyhint="search" autocomplete="off" spellcheck="false" maxlength="160" aria-label="Tra cứu vật liệu theo từ khóa" placeholder="VD: S355J2, 304, C45, thép không gỉ…"/><button type="button" data-hbs-clear class="mh-query-clear" aria-label="Xóa nội dung tìm kiếm và các tiêu chí" title="Xóa tìm kiếm" hidden>×</button></div></div></form><div data-hbs-status role="status" aria-live="polite"></div></div>`;
  const analysisCards = [
    ['Trợ lý chọn vật liệu','Đề xuất ứng viên từ yêu cầu chi tiết, tải trọng, môi trường và công nghệ chế tạo.'],
    ['Phân tích khả năng hàn','Tính và giải thích chỉ tiêu hàn khi có đủ thành phần, nguồn và thông số công nghệ.'],
    ['Đánh giá phương án','Phân tích ưu nhược điểm và những dữ liệu còn thiếu của các phương án vật liệu.']
  ];
  root.innerHTML = `<style>${CSS}</style><div class="mh hbs"><div class="mh-topbar"><header class="mh-heading"><h2>Sổ tay vật liệu kỹ thuật</h2><p>Tra cứu đặc tính, ứng dụng và tiêu chuẩn vật liệu kỹ thuật.</p></header>${toolbar}</div><section class="mh-smart-panel" id="mh-smart-panel" data-mh-smart-panel hidden><div class="mh-smart-head"><strong>Chọn hashtag tiêu chí kỹ thuật</strong><small>Chọn nhiều thẻ để kết hợp điều kiện (AND)</small></div><div class="mh-smart-tags" data-mh-smart-tags></div><div class="mh-smart-editor-wrap" data-mh-smart-editors></div></section><nav class="mh-group-tabs" role="tablist" aria-label="Phạm vi vật liệu kỹ thuật">${GROUP_TABS.map(group=>`<button type="button" class="mh-group-tab" id="mh-group-${esc(group.id)}" data-mh-group="${esc(group.id)}" role="tab" aria-controls="mh-group-panel" aria-selected="${group.id===state.group}" tabindex="${group.id===state.group?'0':'-1'}" title="${esc(group.title)}" disabled>${groupIcon(group.id)}<span>${esc(group.label)}</span></button>`).join('')}</nav><section class="mh-analysis-panel" data-mh-analysis-panel hidden><h3>Tư vấn & phân tích vật liệu</h3><p>Các công cụ phân tích sử dụng cơ sở dữ liệu và quy tắc kỹ thuật có nguồn, tách biệt chức năng tra cứu.</p><div class="mh-analysis-cards">${analysisCards.map(([name,description],i)=>`<section class="mh-analysis-card"><h4>${String(i+1).padStart(2,'0')}. ${esc(name)}</h4><p>${esc(description)}</p><span class="mh-analysis-status">Chưa triển khai thuật toán phân tích</span></section>`).join('')}</div><div class="mh-analysis-notice">${esc(SMART_NOTICE)} Các quy tắc phân tích chưa được phê duyệt, không tự tạo kết luận kỹ thuật.</div></section><div data-mh-content id="mh-group-panel" role="tabpanel" aria-labelledby="mh-group-steel" class="mh-load-error" style="background:#f6f8ff;border-color:#dce4fa;color:#52648d">Đang nạp dữ liệu vật liệu…</div></div>`;
  const $ = sel => root.querySelector(sel);
  // One source of scope for search, selected records and future handbook functions.
  const tabMaterials = () => arr(state.db?.materials).filter(material=>state.group==='all' || materialGroup(material)===state.group);
  const scopeMaterials = () => tabMaterials().filter(material=>state.filterKey==='all' || (state.catalogue?.ancestors.get(material.id)||[]).includes(state.filterKey));
  const selected = () => scopeMaterials().find(m=>m.id===state.selectedId);
  const dimension = (m) => state.dimensions[m.id] ?? m.mechanical?.dimension?.default ?? 0;
  const activeCase = m => caseFor(m, dimension(m));
  const selectedGroup = () => GROUP_TABS.find(group => group.id === state.group);
  const scopeLabel = () => state.filterKey==='all'?selectedGroup().label:state.catalogue.nodes.get(state.filterKey).label;
  const groupHasData = () => scopeMaterials().length>0;

  function filterFolders() {
    return state.group==='all'?state.catalogue.roots:state.catalogue.nodes.get(state.group).children;
  }
  function sidebarIcon() {
    const arrow=state.sidebarCollapsed?'M13 8l4 4-4 4':'M17 8l-4 4 4 4';
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16${arrow}"/></svg>`;
  }
  function setSidebarCollapsed(collapsed) {
    state.sidebarCollapsed=Boolean(collapsed);
    $('[data-mh-content]').classList.toggle('mh-sidebar-collapsed',state.sidebarCollapsed);
    $('[data-mh-sidebar-body]').hidden=state.sidebarCollapsed;
    const button=$('[data-mh-sidebar-toggle]'),label=state.sidebarCollapsed?'Mở rộng danh mục':'Thu gọn danh mục';
    button.innerHTML=sidebarIcon();button.title=label;button.setAttribute('aria-label',label);button.setAttribute('aria-expanded',String(!state.sidebarCollapsed));
  }
  function syncOpenNodes() {
    for(const node of root.querySelectorAll('[data-mh-tree-node]'))node.open=state.openNodes.has(node.dataset.mhTreeNode);
  }
  function openBranch(key,sync=true) {
    const parts=key.split('/'),path=[];
    for(let i=1;i<=parts.length;i++){const prefix=parts.slice(0,i).join('/');if(state.catalogue.nodes.has(prefix))path.push(prefix);}
    state.openNodes=new Set(path);
    if(sync)syncOpenNodes();
  }
  function closeBranch(key) {
    for(const open of state.openNodes)if(open===key||open.startsWith(key+'/'))state.openNodes.delete(open);
    syncOpenNodes();
  }
  function revealSelection() {
    const path=state.catalogue.ancestors.get(state.selectedId);
    if(path?.length)openBranch(path[path.length-1],false);
    else if(state.filterKey!=='all')openBranch(state.filterKey,false);
  }

  function drawFamilyFilter() {
    const folders=filterFolders();
    if(state.filterKey!=='all' && !folders.some(node=>node.key===state.filterKey))state.filterKey='all';
    $('[data-mh-family]').innerHTML='<option value="all">Tất cả</option>'+folders.map(node=>`<option value="${esc(node.key)}">${esc(node.label)}</option>`).join('');
    $('[data-mh-family]').value=state.filterKey;
  }
  function publishScope() {
    const detail={groupId:state.group,groupTitle:selectedGroup().title,filterKey:state.filterKey,scopeTitle:scopeLabel(),materialIds:scopeMaterials().map(material=>material.id),matchingMaterialIds:filtered().map(material=>material.id),selectedMaterialId:selected()?.id||null};
    root.dispatchEvent(new CustomEvent('material-handbook:scopechange',{detail}));
  }

  function drawGroupTabs() {
    for (const button of root.querySelectorAll('[data-mh-group]')) {
      const active = button.dataset.mhGroup === state.group;
      button.setAttribute('aria-selected',String(active));
      button.tabIndex = active ? 0 : -1;
      button.disabled = !state.db || (state.compareOpen && button.dataset.mhGroup !== state.compareGroup);
      button.title=state.compareOpen && button.dataset.mhGroup !== state.compareGroup ? 'Chỉ so sánh trong nhóm '+selectedGroup().label : GROUP_TABS.find(g=>g.id===button.dataset.mhGroup)?.title || '';
    }
    $('[data-mh-content]').setAttribute('aria-labelledby','mh-group-'+state.group);
    root.dataset.mhScope=state.group;
    updateScopeLabels();
  }
  function updateScopeLabels() {
    root.dataset.mhFilter=state.filterKey;
    $('[data-mh-scope-name]').textContent=scopeLabel();
    $('[data-hbs-input]').placeholder=state.group==='steel'&&state.filterKey==='all'?'VD: S355J2, 304, C45, thép không gỉ…':'Tìm trong '+scopeLabel().toLowerCase()+'…';
  }
  function chooseGroup(id, moveFocus = false) {
    if (!state.db || !GROUP_TABS.some(group => group.id === id)) return;
    if (state.compareOpen && id !== state.compareGroup) return;
    if (state.group !== id) {
      state.savedSelection[state.group]=state.selectedId;
      state.group = id;
      state.filterKey = 'all';
      state.openNodes.clear();
      state.selectedId=state.savedSelection[id]||state.selectedId;
      state.eqOpen=false;state.eqCandidateId='';
      drawFamilyFilter();
      drawGroupTabs();
      applySearch();
    }
    const button = root.querySelector('[data-mh-group="'+id+'"]');
    if (moveFocus) button.focus({preventScroll:true});
  }

  function selectedCriteria() {
    return Object.entries(state.smartCriteria).filter(([id,filter])=>SMART_FIELD_BY_ID.has(id) && smartComplete(filter));
  }
  function filtered() {
    const ids=new Set(scopeMaterials().map(material=>material.id));
    const index=state.index.filter(item=>ids.has(item.record.id));
    let found=searchIndex(index,state.query).map(item=>item.record);
    if (state.smartEnabled && selectedCriteria().length) {
      found=found.filter(material=>matchSmartMaterial(material,state.smartCriteria,state.dimensions).pass);
    }
    return found;
  }
  function updateClearButton() {
    $('[data-hbs-clear]').hidden=!$('[data-hbs-input]').value.trim() && !(state.smartEnabled && Object.keys(state.smartCriteria).length);
  }
  function drawSmartControls() {
    const active=state.smartEnabled;
    $('[data-mh-smart-panel]').hidden=!active;
    $('[data-mh-smart-toggle]').checked=active;
    $('[data-mh-smart-check]').dataset.on=String(active);
    const tags=$('[data-mh-smart-tags]'),editors=$('[data-mh-smart-editors]');
    tags.innerHTML=SMART_FIELDS.map(def=>`<button type="button" class="mh-smart-tag" data-mh-smart-tag="${def.id}" aria-pressed="${!!state.smartCriteria[def.id]}" title="${esc(def.title)}">${esc(def.tag)}</button>`).join('');
    editors.innerHTML=Object.keys(state.smartCriteria).filter(id=>SMART_FIELD_BY_ID.has(id)).map(id=>{
      const def=SMART_FIELD_BY_ID.get(id),filter=state.smartCriteria[id],fixed=['dimension','temperature','text'].includes(def.kind);
      const operators=fixed?'':`<select data-mh-smart-op="${id}" aria-label="Phép so sánh ${esc(def.title)}">${SMART_OPERATORS.map(([op,label])=>`<option value="${esc(op)}"${filter.op===op?' selected':''}>${esc(label)}</option>`).join('')}</select>`;
      const input=`<input data-mh-smart-value="${id}" aria-label="${esc(def.title)}" type="${def.kind==='text'?'text':'number'}" step="any" ${def.kind==='dimension'?'min="0.001"':''} placeholder="${esc(def.example)}" value="${esc(filter.value||'')}" ${def.kind==='text'?'maxlength="80"':''}/>`;
      return `<div class="mh-smart-editor"><div class="mh-smart-editor-top"><span>${esc(def.title)}</span><button type="button" class="mh-smart-editor-remove" data-mh-smart-remove="${id}" aria-label="Bỏ tiêu chí ${esc(def.title)}" title="Bỏ tiêu chí">×</button></div><div class="mh-smart-editor-controls">${operators}${input}${def.unit?`<span class="mh-smart-unit">${esc(def.unit)}</span>`:''}</div></div>`;
    }).join('');
    updateClearButton();
  }
  function setAnalysis(open) {
    state.analysisOpen=Boolean(open);
    $('[data-mh-analysis-panel]').hidden=!state.analysisOpen;
    $('.mh-group-tabs').hidden=state.analysisOpen;
    $('[data-mh-content]').hidden=state.analysisOpen;
    $('[data-mh-smart-panel]').hidden=state.analysisOpen || !state.smartEnabled;
    const toggle=$('[data-mh-analysis-toggle]');toggle.setAttribute('aria-pressed',String(state.analysisOpen));
    toggle.title=state.analysisOpen?'Quay lại tra cứu':'Mở công cụ tư vấn và phân tích';
    if(state.analysisOpen) toggle.querySelector('span').textContent='Quay lại tra cứu';
    else toggle.querySelector('span').textContent='Tư vấn & phân tích';
  }
  function applySearch() {
    const hadQuery=Boolean(state.query.trim());
    state.query = $('[data-hbs-input]').value.slice(0,160);
    const candidates = filtered();
    if (!state.compareOpen && !candidates.some(m => m.id === state.selectedId)) { state.selectedId = candidates[0]?.id || ''; state.tab = 'overview'; state.eqOpen=false;state.eqCandidateId=''; }
    if(!state.compareOpen && !state.query.trim() && (state.group!=='all'||state.filterKey!=='all'||hadQuery) && state.selectedId)revealSelection();
    if((state.query.trim() || (state.smartEnabled && selectedCriteria().length)) && state.sidebarCollapsed)setSidebarCollapsed(false);
    updateScopeLabels();updateClearButton();
    drawDetail();publishScope();
  }
  function submitSearch() {
    if(state.smartEnabled) {
      const interpreted=recognizeTypedSmartQuery($('[data-hbs-input]').value);
      if(interpreted) {
        for(const {id,op,value} of interpreted.parsed) state.smartCriteria[id]={op,value};
        $('[data-hbs-input]').value=interpreted.text;
        drawSmartControls();
      }
    }
    if(state.analysisOpen)setAnalysis(false);
    applySearch();
  }
  function drawList() {
    const matches = filtered();
    const container = $('[data-mh-list]');
    if (!container) return;
    $('[data-mh-visible]').textContent = String(matches.length);
    const query = state.query.trim();
    const resultsMode=Boolean(query)||(state.smartEnabled && selectedCriteria().length>0);
    const iconGroup=state.filterKey==='all'?state.group:state.catalogue.nodes.get(state.filterKey).groupId;
    $('[data-mh-side-title]').innerHTML=groupIcon(iconGroup)+'<span>'+esc(resultsMode?'Kết quả tìm kiếm':scopeLabel())+'</span>';
    $('[data-hbs-status]').textContent = scopeLabel()+': '+(query ? matches.length+' kết quả cho “'+query+'”.' : matches.length+' vật liệu.');
    container.dataset.mhView=resultsMode?'results':'tree';
    container.setAttribute('aria-label',resultsMode?'Kết quả tìm kiếm trong '+scopeLabel():'Cây danh mục '+scopeLabel());
    const matched=new Set(matches.map(material=>material.id)),counts=new Map();
    function count(node) {
      if(!counts.has(node.key))counts.set(node.key,node.materialIds.filter(id=>matched.has(id)).length+node.children.reduce((sum,child)=>sum+count(child),0));
      return counts.get(node.key);
    }
    function leaf(id) {
      const m=state.catalogue.byId.get(id);
      const smartNote=state.smartEnabled&&selectedCriteria().length?matchSmartMaterial(m,state.smartCriteria,state.dimensions).details.slice(0,3).join(' · '):'';
      const compareSlot=state.compareOpen ? state.compareIds.indexOf(m.id)+1 : 0;
      const isSelected=state.compareOpen ? compareSlot>0 : m.id===selected()?.id;
      const selectionBadge=compareSlot ? `<span class="mh-compare-leaf-tag" data-slot="${compareSlot}">VL${compareSlot}</span>` : '';
      return `<button type="button" class="mh-item mh-tree-leaf" data-mh-id="${esc(m.id)}" aria-pressed="${isSelected}"><span><span class="mh-item-name">${highlight(m.grade,state.query)}</span><span class="mh-item-sub">${highlight(m.materialNumber||m.standard,state.query)}</span>${query?snippets(state.index.find(item=>item.record.id===m.id),state.query,1):''}${smartNote?`<span class="mh-smart-match-preview">${esc(smartNote)}</span>`:''}</span><span class="mh-item-end">${selectionBadge}<span class="mh-item-arrow" aria-hidden="true">›</span></span></button>`;
    }
    function branch(node,rootLevel=false) {
      const amount=count(node),children=node.children.filter(child=>!query||count(child)>0),ids=node.materialIds.filter(id=>matched.has(id));
      const content=children.map(child=>branch(child)).join('')+ids.map(leaf).join('');
      return `<details class="mh-tree-node" data-mh-tree-node="${esc(node.key)}" data-mh-empty="${amount===0}"${state.openNodes.has(node.key)?' open':''}><summary title="${esc(node.label)}"><span class="mh-tree-chevron" aria-hidden="true"></span>${rootLevel?groupIcon(node.groupId):'<span class="mh-tree-folder">'+FOLDER_ICON+'</span>'}<span class="mh-tree-label">${highlight(node.label,state.query)}</span><span class="mh-tree-count">${amount}</span></summary><div class="mh-tree-children">${content||'<p class="mh-tree-empty">Chưa có vật liệu trong nhánh này.</p>'}</div></details>`;
    }
    if(resultsMode){
      container.innerHTML=matches.length?matches.map(material=>leaf(material.id)).join(''):'<div class="mh-empty">Không có mác đáp ứng đầy đủ các điều kiện có dữ liệu. Hãy kiểm tra kích thước và các hashtag.</div>';
      return;
    }
    const nodes=state.filterKey==='all'?filterFolders():[state.catalogue.nodes.get(state.filterKey)];
    container.innerHTML=nodes.map(node=>branch(node,node.key===node.groupId)).join('');
  }
  function metric(title, result, note) {
    return `<div class="mh-metric"><label>${esc(title)}</label><strong>${esc(result)}</strong><small>${esc(note)}</small></div>`;
  }
  const sourceName = id => { const s = arr(state.db?.sources).find(x => x.id === id); return s ? s.publisher : (id || '—'); };
  const sourceNames = ids => [...new Set(arr(ids).filter(Boolean).map(sourceName))].join(', ') || '—';
  /** Global viewing condition: one dimension drives cards, mechanical and chemistry. */
  function drawConditionBar(m) {
    const dim = m.mechanical?.dimension;
    if (!dim) return `<div class="mh-condbar"><span>Bản ghi không chia theo kích thước: số liệu là giá trị tham khảo của hãng cho dạng sản phẩm nêu trong nguồn.</span></div>`;
    const rows = arr(m.mechanical.cases).filter(r => Number.isFinite(r.from) && Number.isFinite(r.to));
    const lo = Math.min(...rows.map(r => r.from)), hi = Math.max(...rows.map(r => r.to));
    const value = dimension(m);
    return `<div class="mh-condbar"><label>${esc(dim.label)} (${esc(dim.unit || 'mm')})<input type="number" data-mh-dimension min="0" step="any" inputmode="decimal" value="${Number.isFinite(value) ? esc(value) : ''}" aria-describedby="mh-condbar-note"></label><span id="mh-condbar-note">Dữ liệu có từ ${esc(num(lo))} đến ${esc(num(hi))} mm. Thẻ số liệu, bảng cơ tính và thành phần đều theo kích thước này.</span>${activeCase(m) ? '' : '<strong class="mh-condbar-warn" role="alert">Ngoài vùng dữ liệu: không suy diễn hay lấy vùng gần nhất.</strong>'}</div>`;
  }
  function drawOverview(m) {
    const names = arr(m.otherNames);
    return `<div class="mh-info-grid"><section class="mh-info-card"><strong>Thông tin vật liệu</strong><p>${esc(m.description)}</p><ul><li><b>Tiêu chuẩn:</b> ${esc(m.standard)}</li><li><b>Dạng sản phẩm:</b> ${esc(m.productForm)}</li><li><b>Trạng thái:</b> ${esc(m.condition)}</li>${names.length ? `<li><b>Tên gọi khác:</b> ${esc(names.join(' · '))}</li>` : ''}</ul></section><section class="mh-info-card"><strong>Ứng dụng tham khảo</strong><ul>${arr(m.applications).map(t => `<li>${esc(t)}</li>`).join('')}</ul></section><section class="mh-info-card mh-info-wide"><strong>Lưu ý kỹ thuật</strong><ul>${arr(m.notes).map(t => `<li>${esc(t)}</li>`).join('') || '<li>Chưa có lưu ý.</li>'}</ul></section></div>`;
  }
  function stainlessFormsTable(m) {
    const lim = m.referenceData?.engineeringLimits || {};
    const en = lim.mechanicalByFormEN10088_2, astm = lim.mechanicalByASTMA240;
    if (!en && !astm) return '';
    let html = '';
    if (en) {
      const rows = arr(en.forms).map(f => tr([`${FORM_LABEL[f.productForm] || f.productForm} (${f.code})`, cellValue(f.yieldRp02Mpa), cellValue(f.yieldRp10Mpa), cellValue(f.tensileRmMpa), cellValue(f.elongationA5Pct), cellValue(f.elongationA80Pct)]));
      html += `<h4 class="mh-subtitle">Cơ tính theo dạng sản phẩm (EN 10088-2, bảng của hãng)</h4>${mdTable(['Dạng sản phẩm','Rp0,2 (MPa)','Rp1,0 (MPa)','Rm (MPa)','A5 (%)','A80 (%)'], rows, 'Cơ tính theo dạng sản phẩm')}<p class="mh-note">${esc(kindLabel(en.dataKind))} · ${esc(sourceName(en.sourceId))} · ${esc(en.standardEdition || '')}. Chọn đúng dạng C/H/P của sản phẩm thực tế.</p>`;
    }
    if (astm) {
      html += `<h4 class="mh-subtitle">Theo ASTM A240 (bảng của hãng)</h4>${mdTable(['Dạng sản phẩm','Rp0,2 (MPa)','Rm (MPa)','A50 (%)'], [tr([arr(astm.productForms).join(', '), cellValue(astm.yieldRp02Mpa), cellValue(astm.tensileRmMpa), cellValue(astm.elongationA50Pct)])], 'Cơ tính theo ASTM A240')}<p class="mh-note">Bảng EN và ASTM có giới hạn khác nhau; không ghép số liệu giữa hai bảng.</p>`;
    }
    return html;
  }
  function drawMechanical(m) {
    const mech = m.mechanical || {}, dim = mech.dimension, rows = arr(mech.cases), actual = activeCase(m);
    const hasZ = rows.some(r => r.reductionOfAreaPct);
    const sym = mech.yieldSymbol || 'Re';
    const body = rows.map(row => {
      const cells = [dim ? rangeLabel(row, dim.label) : 'Giá trị tham khảo của hãng', cellValue(row.yieldMpa), cellValue(row.tensileMpa), cellValue(row.elongationPct)];
      if (hasZ) cells.push(cellValue(row.reductionOfAreaPct));
      return tr(cells, dim && row === actual ? 'mh-selected-row' : '');
    });
    const heads = [dim ? dim.label : 'Phạm vi', sym + ' (MPa)', 'Rm (MPa)', 'A (%)'].concat(hasZ ? ['Z (%)'] : []);
    const conds = [
      ['Loại số liệu', kindLabel(mech.status)],
      ['Nguồn', sourceNames(mech.sourceIds)],
      mech.tensileTestOrientation ? ['Hướng mẫu kéo', ORIENTATION_LABEL[mech.tensileTestOrientation] || mech.tensileTestOrientation] : null,
      mech.elongationGaugeLength ? ['Chiều dài đo A', gaugeText(mech.elongationGaugeLength)] : null,
      dim?.technicalDefinition ? ['Định nghĩa kích thước', dim.technicalDefinition] : null,
      mech.note ? ['Ghi chú', mech.note] : null
    ].filter(Boolean).map(([k,v]) => tr([k, v]));
    const imp = mech.impact;
    const impact = imp ? mdTable(['Nhiệt độ thử','KV tối thiểu','Hướng mẫu','Loại số liệu','Ghi chú'], [tr([Number.isFinite(imp.temperatureC) ? num(imp.temperatureC) + ' °C' : '—', Number.isFinite(imp.minJ) ? '≥ ' + num(imp.minJ) + ' J' : '—', ORIENTATION_LABEL[imp.testDirection] || imp.testDirection || '—', kindLabel(imp.kind), imp.note || ''])], 'Yêu cầu thử va đập')
      : '<p class="mh-note">Nguồn hiện có không nêu yêu cầu va đập cho bản ghi này.</p>';
    return `${mdTable(heads, body, 'Cơ tính theo vùng kích thước')}<p class="mh-note">“≥” là giới hạn tối thiểu, “x–y” là khoảng, “≈” là giá trị tham khảo của hãng.${dim ? ' Dòng tô màu là vùng đang áp dụng.' : ''}</p><h4 class="mh-subtitle">Thử va đập</h4>${impact}${stainlessFormsTable(m)}<h4 class="mh-subtitle">Điều kiện thử và nguồn</h4>${mdTable(['Mục','Nội dung'], conds, 'Điều kiện thử và nguồn cơ tính')}`;
  }
  function drawChemistry(m) {
    const chem = m.chemistry || {}, rows = arr(chem.rows), dim = m.mechanical?.dimension, dv = dimension(m);
    const kinds = {heat_analysis_limits:'Giới hạn thành phần theo phân tích mẻ nấu', typical_manufacturer_composition:'Thành phần điển hình của hãng, không phải giới hạn tiêu chuẩn'};
    const byEl = new Map();
    for (const r of rows) { if (!byEl.has(r.element)) byEl.set(r.element, []); byEl.get(r.element).push(r); }
    const els = [...byEl.keys()].sort((a,b) => elementRank(a) - elementRank(b) || a.localeCompare(b));
    const body = els.map(el => {
      const list = byEl.get(el), banded = list.some(r => r.applicability);
      const current = banded ? list.find(r => chemicalRowApplies(r, m, dv)) : list[0];
      const now = current ? chemValue(current) : (dim ? 'Ngoài vùng dữ liệu' : '—');
      const bands = banded ? list.map(r => `${chemValue(r)} (${r.applicability})`).join(' · ') : 'Không chia theo kích thước';
      return tr([el, now, bands], banded && current ? 'mh-selected-row' : '');
    });
    const lim = m.referenceData?.engineeringLimits || {};
    const cev = lim.carbonEquivalent;
    if (cev) {
      const cur = arr(cev.bands).find(b => inOpenBand(dv, b));
      body.push(tr([`${cev.symbol || 'CEV'} (${cev.method || 'IIW'})`, cur ? '≤ ' + num(cur.max) : (dim ? 'Ngoài vùng dữ liệu' : '—'), arr(cev.bands).map(b => `≤ ${num(b.max)} (${bandLabel(b, dimMark(dim))})`).join(' · ')], cur ? 'mh-selected-row' : ''));
    }
    const comb = lim.combinedAlloyLimit;
    if (comb) body.push(tr([arr(comb.elements).join(' + '), '≤ ' + num(comb.max), 'Giới hạn tổng; phải kiểm tra tổng, không chỉ từng nguyên tố']));
    const anyBand = rows.some(r => r.applicability) || Boolean(cev);
    const head = ['Nguyên tố', dim && anyBand ? `Tại ${dimMark(dim)} = ${Number.isFinite(dv) ? num(dv) : '—'} mm` : 'Giá trị'].concat(anyBand ? ['Theo vùng kích thước'] : ['Phạm vi']);
    const typical = chem.kind === 'typical_manufacturer_composition';
    return `<p class="mh-fieldnote">${esc(kinds[chem.kind] || 'Thành phần hóa học')} · % khối lượng · nguồn: ${esc(sourceNames(chem.sourceIds))}${cev ? ' · CEV: ' + esc(sourceName(cev.sourceId)) : ''}.</p>${mdTable(head, body.length ? body : [tr(['—','Chưa có dữ liệu','—'])], 'Thành phần hóa học')}<p class="mh-note">${typical ? 'Không suy ra giới hạn từ giá trị điển hình. ' : ''}Nguyên tố không có trong bảng là chưa có dữ liệu trong nguồn, không có nghĩa bằng 0.</p>`;
  }
  /** Heat-treatment routes: shown as a template until values with sources are entered. */
  function drawHeatTreatment(m) {
    const ht = m.heatTreatment || {}, routes = arr(ht.routes);
    if (!routes.length) return '<div class="hbs-empty"><strong>Chưa có dữ liệu nhiệt luyện</strong><p>Bản ghi này chưa khai báo quy trình nhiệt luyện.</p></div>';
    const filled = routes.filter(htHasValues).length;
    const condition = txt(m.condition);
    const finals = routes.filter(r => r.resultCondition && condition.includes(r.resultCondition));
    const chain = new Set(finals.flatMap(r => arr(r.precededBy)));
    const producing = routes.filter(r => chain.has(r.id)).concat(finals);
    const rows = routes.map(r => {
      const result = [r.resultCondition ? 'Trạng thái ' + r.resultCondition : '', htHardness(r.resultHardness), r.surfaceOnly ? 'chỉ lớp bề mặt' : ''].filter(Boolean).join(' · ') || '—';
      const src = r.sourceId ? sourceName(r.sourceId) + (r.sourceClauseOrTable ? ' · ' + r.sourceClauseOrTable : '') : 'Chưa có nguồn';
      return tr([HT_PROCESS_LABEL[r.process] || r.process, r.purposeVi || '—', htTemperature(r.temperatureC), r.cooling ? (COOLING_LABEL[r.cooling] || r.cooling) : 'Chưa có dữ liệu', result, src], htHasValues(r) ? '' : 'mh-ht-empty');
    });
    const link = producing.length
      ? `<p class="mh-note"><b>Liên hệ với cơ tính:</b> bảng cơ tính đang xem thuộc trạng thái ${esc(condition)}, tạo bởi: ${esc(producing.map(r => HT_PROCESS_LABEL[r.process] || r.process).join(' → '))}${ht.linkNoteVi ? '. ' + esc(ht.linkNoteVi) : ''}.</p>`
      : (ht.linkNoteVi ? `<p class="mh-note">${esc(ht.linkNoteVi)}</p>` : '');
    const status = filled ? `<p class="mh-fieldnote">Đã có số liệu cho ${filled}/${routes.length} quy trình.</p>`
      : `<p class="mh-fieldnote">Danh mục quy trình đã sẵn sàng; nhiệt độ, môi trường nguội và độ cứng chờ bổ sung từ tài liệu có nguồn.</p>`;
    return `${status}${mdTable(['Quy trình','Mục đích','Nhiệt độ','Làm nguội','Kết quả','Nguồn'], rows, 'Quy trình nhiệt luyện')}${link}${routes.some(r => r.note) ? `<ul class="mh-recon">${routes.filter(r => r.note).map(r => `<li><b>${esc(HT_PROCESS_LABEL[r.process] || r.process)}:</b> ${esc(r.note)}</li>`).join('')}</ul>` : ''}`;
  }
  const srcCell = (id, clause) => id ? sourceName(id) + (clause ? ' · ' + clause : '') : 'Chưa có nguồn';
  /** Welding: displays sourced welding information only; never computes preheat. */
  function drawWelding(m) {
    const w = m.welding || {}, o = w.overall || {};
    const cev = w.carbonEquivalentRef ? m.referenceData?.engineeringLimits?.carbonEquivalent : null;
    const dim = m.mechanical?.dimension, dv = dimension(m);
    const parts = [];
    parts.push(o.rating
      ? `<div class="mh-weld-rating" data-rating="${esc(o.rating)}"><strong>Tính hàn: ${esc(WELD_RATING_LABEL[o.rating] || o.rating)}</strong><span>${esc(o.summaryVi || '')}</span><small>${esc(srcCell(o.sourceId, o.sourceClauseOrTable))}</small></div>`
      : '<p class="mh-fieldnote">Chưa có đánh giá tính hàn có nguồn cho mác này. Các mục bên dưới chờ bổ sung từ tài liệu đáng tin cậy.</p>');
    if (cev) {
      const cur = arr(cev.bands).find(b => inOpenBand(dv, b));
      parts.push(`<h4 class="mh-subtitle">Carbon tương đương ${esc(cev.symbol || 'CEV')}</h4>` + mdTable(['Vùng kích thước', `${cev.symbol || 'CEV'} tối đa (%)`, 'Nguồn'], arr(cev.bands).map(b => tr([bandLabel(b, dimMark(dim)), '≤ ' + num(b.max), srcCell(cev.sourceId, cev.sourceClauseOrTable)], b === cur ? 'mh-selected-row' : '')), 'Carbon tương đương') + `<p class="mh-note">Giới hạn theo nguồn của bản ghi; CEV thực tế của lô thép tính từ thành phần trên chứng chỉ.</p>`);
    }
    const cons = arr(w.consumables);
    parts.push('<h4 class="mh-subtitle">Vật liệu hàn</h4>' + (cons.length ? mdTable(['Phương pháp','ISO','AWS','GB','Ghi chú','Nguồn'], cons.map(c => tr([WELD_PROCESS_LABEL[c.process] || c.process || '—', c.classificationIso || '—', c.classificationAws || '—', c.classificationGb || '—', c.noteVi || '', srcCell(c.sourceId, c.sourceClauseOrTable)])), 'Vật liệu hàn') : '<p class="mh-note">Chưa có dữ liệu.</p>'));
    const pre = arr(w.preheat);
    const condText = c => [c?.combinedThicknessMm ? 'chiều dày tổng ' + bandLabel(c.combinedThicknessMm) : '', c?.hydrogenScale ? 'hydro ' + c.hydrogenScale : '', c?.heatInputKjMm ? 'nhiệt đầu vào ' + valueText(c.heatInputKjMm) + ' kJ/mm' : '', Number.isFinite(c?.cevMax) ? 'CEV ≤ ' + num(c.cevMax) : '', c?.otherVi || ''].filter(Boolean).join(' · ') || '—';
    parts.push('<h4 class="mh-subtitle">Gia nhiệt sơ bộ</h4>' + (pre.length ? mdTable(['Nhiệt độ','Điều kiện áp dụng','Phương pháp','Nguồn'], pre.map(p => tr([rangeC(p.temperatureC), condText(p.conditions), p.methodStandard || '—', srcCell(p.sourceId, p.sourceClauseOrTable)])), 'Gia nhiệt sơ bộ') : '<p class="mh-note">Chưa có dữ liệu.</p>') + '<p class="mh-note">Nhiệt độ gia nhiệt phụ thuộc thành phần thực tế, mức hydro của vật liệu hàn, nhiệt đầu vào, chiều dày tổng và mức kiềm chế của mối nối; không suy ra chỉ từ chiều dày.</p>');
    const ip = w.interpassTemperatureC || {}, pw = w.pwht || {};
    const ipText = Number.isFinite(ip.min) || Number.isFinite(ip.max) ? rangeC(ip) : 'Chưa có dữ liệu';
    const pwText = pw.required === true ? 'Có yêu cầu' : pw.required === false ? 'Không yêu cầu' : 'Chưa có dữ liệu';
    const hasQt = arr(m.heatTreatment?.routes).some(r => r.process === 'tempering');
    parts.push('<h4 class="mh-subtitle">Nhiệt độ giữa lớp và xử lý nhiệt sau hàn</h4>' + mdTable(['Mục','Nội dung','Nguồn'], [
      tr(['Nhiệt độ giữa các lớp', ipText, srcCell(ip.sourceId, ip.sourceClauseOrTable)]),
      tr(['Xử lý nhiệt sau hàn (PWHT)', [pwText, rangeC(pw.temperatureC) !== 'Chưa có dữ liệu' ? rangeC(pw.temperatureC) : '', pw.holdingNote || '', pw.noteVi || ''].filter(Boolean).join(' · '), srcCell(pw.sourceId, pw.sourceClauseOrTable)])
    ], 'Nhiệt độ giữa lớp và PWHT') + (hasQt ? '<p class="mh-note">Với trạng thái tôi + ram, nhiệt độ PWHT cần đối chiếu với nhiệt độ ram ở tab Nhiệt luyện để không làm thay đổi cơ tính.</p>' : ''));
    const notes = arr(w.specialNotes), dis = arr(w.dissimilarJoints);
    if (notes.length) parts.push('<h4 class="mh-subtitle">Lưu ý khi hàn</h4><ul class="mh-recon">' + notes.map(n => `<li>${esc(n.textVi)} <small>(${esc(srcCell(n.sourceId, n.sourceClauseOrTable))})</small></li>`).join('') + '</ul>');
    if (dis.length) parts.push('<h4 class="mh-subtitle">Hàn với vật liệu khác</h4>' + mdTable(['Vật liệu ghép','Vật liệu hàn','Ghi chú','Nguồn'], dis.map(x => tr([x.withMaterial || '—', x.consumable || '—', x.noteVi || '', srcCell(x.sourceId, x.sourceClauseOrTable)])), 'Hàn khác loại'));
    return parts.join('') + '<p class="mh-note">Thông tin tham khảo; quy trình hàn thực tế theo WPS/WPQR được duyệt.</p>';
  }
  /** Usage recommendations: sourced statements plus facts already in the record. */
  function drawUsage(m) {
    const u = m.usage || {}, parts = [];
    const prods = arr(u.recommendedProducts), envs = arr(u.environments);
    const filled = prods.length || envs.some(e => e.suitability) || arr(u.limitations).length || arr(u.notRecommended).length;
    if (!filled) parts.push('<p class="mh-fieldnote">Chưa có khuyến cáo sử dụng có nguồn cho mác này. Bảng môi trường bên dưới là danh mục cần đánh giá.</p>');
    parts.push('<h4 class="mh-subtitle">Sản phẩm, chi tiết khuyến cáo</h4>' + (prods.length ? mdTable(['Sản phẩm / chi tiết','Điều kiện, ghi chú','Nguồn'], prods.map(p => tr([p.productVi || '—', p.noteVi || '', srcCell(p.sourceId, p.sourceClauseOrTable)])), 'Sản phẩm khuyến cáo')
      : (arr(m.applications).length ? `<p class="mh-note">Ứng dụng tham khảo hiện có (chưa gắn nguồn): ${esc(arr(m.applications).join(', '))}.</p>` : '<p class="mh-note">Chưa có dữ liệu.</p>')));
    parts.push('<h4 class="mh-subtitle">Môi trường làm việc</h4>' + mdTable(['Môi trường','Mức phù hợp','Điều kiện','Nguồn'], envs.map(e => tr([ENV_LABEL[e.environment] || e.environment, e.suitability ? (SUIT_LABEL[e.suitability] || e.suitability) : 'Chưa đánh giá', e.conditionsVi || '—', srcCell(e.sourceId, e.sourceClauseOrTable)], e.suitability ? 'mh-suit-' + e.suitability : 'mh-ht-empty')), 'Môi trường làm việc'));
    const list = (title, items) => items.length ? `<h4 class="mh-subtitle">${esc(title)}</h4><ul class="mh-recon">${items.map(i => `<li>${esc(i.textVi)} <small>(${esc(srcCell(i.sourceId, i.sourceClauseOrTable))})</small></li>`).join('')}</ul>` : '';
    parts.push(list('Giới hạn sử dụng', arr(u.limitations)), list('Không khuyến cáo', arr(u.notRecommended)));
    const facts = [];
    const imp = m.mechanical?.impact;
    if (imp && Number.isFinite(imp.minJ) && Number.isFinite(imp.temperatureC)) facts.push(['Yêu cầu va đập', `KV ≥ ${num(imp.minJ)} J tại ${num(imp.temperatureC)} °C`, sourceNames(imp.testDirectionSourceId ? [imp.testDirectionSourceId] : m.mechanical?.sourceIds)]);
    const rows = arr(m.mechanical?.cases).filter(r => Number.isFinite(r.from) && Number.isFinite(r.to));
    if (rows.length && m.mechanical?.dimension) facts.push(['Kích thước có dữ liệu', `${num(Math.min(...rows.map(r => r.from)))}–${num(Math.max(...rows.map(r => r.to)))} mm (${m.mechanical.dimension.label})`, sourceNames(m.mechanical.sourceIds)]);
    if (m.productForm || m.condition) facts.push(['Dạng sản phẩm, trạng thái', [m.productForm, m.condition].filter(Boolean).join(' · '), '—']);
    const mag = m.physical?.magnetizable;
    if (mag && typeof mag.value === 'boolean') facts.push(['Nhiễm từ', mag.value ? 'Có' : 'Không', sourceName(mag.sourceId)]);
    if (facts.length) parts.push('<h4 class="mh-subtitle">Dữ kiện liên quan đã có trong bản ghi</h4>' + mdTable(['Dữ kiện','Giá trị','Nguồn'], facts.map(f => tr(f)), 'Dữ kiện liên quan') + '<p class="mh-note">Đây là dữ kiện kỹ thuật để cân nhắc, không phải khuyến cáo sử dụng.</p>');
    return parts.join('');
  }
  function drawPhysical(m) {
    const list = physicalEntries(m);
    if (!list.length) return '<div class="hbs-empty"><strong>Chưa có dữ liệu vật lý có nguồn</strong><p>Không điền giá trị chung khi nguồn của mác chưa nêu.</p></div>';
    return `${mdTable(['Tính chất','Giá trị','Loại số liệu','Nguồn'], list.map(p => tr([p.label, p.value, kindLabel(p.kind), sourceName(p.sourceId)])), 'Tính chất vật lý')}<p class="mh-note">Giá trị vật lý dùng tham khảo, không phải số đo của từng lô.</p>`;
  }
  function bookHistory(m) {
    const rd = m.referenceData || {}, b = rd.bookStandardData;
    const parts = [];
    if (b) {
      const mech = b.mechanical;
      if (mech?.cases?.length) {
        const mark = mech.dimension?.kind === 'diameter' ? 'd' : 't';
        parts.push(`<h5 class="mh-subtitle">Cơ tính ${esc(b.standardEdition)} · ${esc(b.grade)} (${esc(b.steelNumber || '—')}) · bảng ${esc(mech.sourceTable)}, tr. ${esc(mech.printedPage)}</h5>` +
          mdTable(['Chiều dày', (mech.yieldSymbol || 'Re') + ' (MPa)', 'Rm (MPa)', 'A (%)'], mech.cases.map(c => tr([bandLabel(c, mark), '≥ ' + num(c.yieldMin), valueText(c.tensile), Number.isFinite(c.elongationMin) ? '≥ ' + num(c.elongationMin) : '—'])), 'Cơ tính tiêu chuẩn cũ'));
        if (arr(mech.impact).length) parts.push(mdTable(['Chiều dày','Nhiệt độ thử','KV tối thiểu'], mech.impact.map(k => tr([bandLabel(k, mark), num(k.temperatureC) + ' °C', '≥ ' + num(k.minJ) + ' J'])), 'Va đập tiêu chuẩn cũ'));
      }
      if (arr(mech?.forms).length) {
        parts.push(`<h5 class="mh-subtitle">Cơ tính ${esc(b.standardEdition)} · ${esc(b.grade)} · bảng ${esc(mech.sourceTable)}, tr. ${esc(mech.printedPage)}</h5>` +
          mdTable(['Dạng','Chiều dày','Rp0,2 (MPa)','Rm (MPa)','A (%)'], mech.forms.map(f => tr([`${FORM_LABEL[f.productForm] || f.productForm} (${f.code})`, bandLabel(f.thickness), '≥ ' + num(f.yieldMin), valueText(f.tensile), '≥ ' + num(f.elongationMin)])), 'Cơ tính inox tiêu chuẩn cũ'));
      }
      if (b.mechanicalNote) parts.push(`<p class="mh-note">${esc(b.mechanicalNote)}</p>`);
      const ch = b.chemistry;
      if (arr(ch?.rows).length) {
        const rows = ch.rows.map(r => tr([r.element, valueText(r), r.dimension ? bandLabel(r.dimension) : 'Mọi kích thước']));
        for (const c of arr(ch.combinedLimits)) rows.push(tr([arr(c.elements).join(' + '), '≤ ' + num(c.max), 'Giới hạn tổng']));
        parts.push(`<h5 class="mh-subtitle">Thành phần ${esc(b.standardEdition)} · bảng ${esc(ch.sourceTable)}, tr. ${esc(ch.printedPage)}</h5>` + mdTable(['Nguyên tố','% khối lượng','Điều kiện'], rows, 'Thành phần tiêu chuẩn cũ'));
      }
      if (arr(b.notes).length) parts.push(`<ul>${b.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`);
    }
    const hist = rd.engineeringLimits?.historicalHeatAnalysisEN10088_2_1995;
    if (hist) parts.push(`<h5 class="mh-subtitle">Thành phần ${esc(hist.standardEdition)} (sách, tr. PDF ${esc(hist.pdfPage)})</h5>` + mdTable(['Nguyên tố','% khối lượng'], arr(hist.elements).map(e => tr([e.element, valueText(e)])), 'Thành phần inox tiêu chuẩn cũ'));
    if (arr(rd.historicalDesignations).length) parts.push(`<h5 class="mh-subtitle">Ký hiệu lịch sử</h5>` + mdTable(['Mác','Số vật liệu','Phiên bản','Quan hệ'], rd.historicalDesignations.map(h => tr([h.grade, h.materialNumber || '—', h.standardEdition || '—', 'Chỉ tham chiếu lịch sử, không phải đồng nhất hay thay thế'])), 'Ký hiệu lịch sử'));
    if (!parts.length) return '';
    return `<details class="mh-book"><summary>Dữ liệu lịch sử từ sách ASTM DS67B (2004)</summary><p class="mh-note">${esc(b?.useRestriction || 'Chỉ tra cứu lịch sử; không dùng thay tiêu chuẩn hiện hành.')}</p>${parts.join('')}</details>`;
  }
  function drawSources(m) {
    const mech = m.mechanical || {}, chem = m.chemistry || {}, rd = m.referenceData || {}, lim = rd.engineeringLimits || {};
    const blocks = [
      ['Cơ tính', sourceNames(mech.sourceIds), kindLabel(mech.status)],
      mech.impact ? ['Va đập', sourceNames(mech.impact.testDirectionSourceId ? [mech.impact.testDirectionSourceId] : mech.sourceIds), kindLabel(mech.impact.kind)] : null,
      ['Thành phần', sourceNames(chem.sourceIds), kindLabel(chem.kind)],
      arr(m.heatTreatment?.routes).length ? ['Nhiệt luyện', sourceNames(arr(m.heatTreatment.routes).map(r => r.sourceId)), arr(m.heatTreatment.routes).some(htHasValues) ? [...new Set(arr(m.heatTreatment.routes).filter(r => r.valueKind).map(r => kindLabel(r.valueKind)))].join(', ') || 'Có số liệu' : 'Chưa có số liệu'] : null,
      m.welding ? ['Hàn', sourceNames([m.welding.overall?.sourceId, ...arr(m.welding.consumables).map(x => x.sourceId), ...arr(m.welding.preheat).map(x => x.sourceId), m.welding.pwht?.sourceId]), [m.welding.overall?.sourceId, ...arr(m.welding.consumables).map(x => x.sourceId), ...arr(m.welding.preheat).map(x => x.sourceId), m.welding.pwht?.sourceId].some(Boolean) ? 'Có số liệu' : 'Chưa có số liệu'] : null,
      m.usage ? ['Khuyến cáo sử dụng', sourceNames([...arr(m.usage.recommendedProducts), ...arr(m.usage.environments), ...arr(m.usage.limitations), ...arr(m.usage.notRecommended)].map(x => x.sourceId)), [...arr(m.usage.recommendedProducts), ...arr(m.usage.environments), ...arr(m.usage.limitations), ...arr(m.usage.notRecommended)].some(x => x.sourceId) ? 'Có số liệu' : 'Chưa có số liệu'] : null,
      ['Vật lý', sourceNames(physicalEntries(m).map(p => p.sourceId)), [...new Set(physicalEntries(m).map(p => kindLabel(p.kind)))].join(', ') || 'Chưa có dữ liệu'],
      ...Object.entries(lim).filter(([,v]) => v && v.sourceId && v.sourceId !== 'bringas-method').map(([k,v]) => [k === 'carbonEquivalent' ? 'CEV' : k === 'combinedAlloyLimit' ? 'Giới hạn tổng Cr+Mo+Ni' : k === 'reductionOfArea' ? 'Thắt tỷ đối Z' : k === 'mechanicalByFormEN10088_2' ? 'Cơ tính theo dạng (EN)' : k === 'mechanicalByASTMA240' ? 'Cơ tính theo ASTM A240' : k, sourceName(v.sourceId), kindLabel(v.kind || v.dataKind)])
    ].filter(Boolean).map(r => tr(r));
    const editions = arr(rd.standardEditionRecords).map(e => tr([e.designation, editionText(e.role), sourceName(e.sourceId), editionText(e.status)]));
    const used = new Set([...arr(m.sourceIds), ...arr(mech.sourceIds), ...arr(chem.sourceIds), ...arr(m.physical?.sourceIds)]);
    const sources = arr(state.db.sources).filter(s => used.has(s.id));
    const reconciliation = arr(rd.sourceReconciliation);
    const order = {high:0,medium:1,low:2,info:3};
    const issues = arr(rd.openIssues).slice().sort((a,b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
    return `<h4 class="mh-section-title">Nguồn theo từng khối số liệu</h4>${mdTable(['Khối số liệu','Nguồn','Loại số liệu'], blocks, 'Nguồn theo từng khối số liệu')}
      ${m.sourceEditionNote ? `<p class="mh-note"><b>Phiên bản tiêu chuẩn:</b> ${esc(m.sourceEditionNote)}</p>` : ''}
      ${editions.length ? `<h4 class="mh-section-title">Phiên bản tiêu chuẩn đã ghi nhận</h4>${mdTable(['Tiêu chuẩn','Vai trò','Nguồn','Trạng thái'], editions, 'Phiên bản tiêu chuẩn')}` : ''}
      <h4 class="mh-section-title">Tài liệu đã tham chiếu</h4><div class="mh-sources">${sources.map(s => `<article class="mh-source"><strong>${esc(s.publisher)} — ${esc(s.title)}</strong><span>${esc(s.note || '')}</span>${normalizeSourceLink(s)}</article>`).join('')}</div>
      ${issues.length ? `<h4 class="mh-section-title">Điểm cần xác minh (${issues.filter(i => i.status === 'open' && i.severity !== 'info').length})</h4>${mdTable(['Mức','Chủ đề','Nội dung','Việc cần làm'], issues.map(i => tr([SEVERITY_LABEL[i.severity] || i.severity, i.topic, i.findingVi, i.actionVi], i.severity === 'high' ? 'mh-issue-high' : '')), 'Điểm cần xác minh')}` : ''}
      ${reconciliation.length ? `<h4 class="mh-section-title">Đối soát nguồn</h4><ul class="mh-recon">${reconciliation.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${bookHistory(m)}
      <p class="mh-note mh-record-id">Mã bản ghi: ${esc(m.id)} · Nguồn và điều kiện số liệu được liệt kê phía trên.</p>`;
  }
  // The demo database has no reviewed equivalent-grade relations. Suggest only
  // candidates in the same material family; never label them as equivalent.
  function equivalentCandidates(m) {
    return arr(state.db?.materials).filter(other => other.id !== m.id &&
      materialGroup(other) === materialGroup(m) && other.family === m.family)
      .sort((a,b) => a.grade.localeCompare(b.grade,'vi'));
  }
  function chemText(material,element) {
    const chemistry=material.chemistry||{};
    const matching=arr(chemistry.rows).filter(c=>c.element===element);
    if (!matching.length) return 'Chưa có dữ liệu';
    return matching.map(c=>{
      const amount=c.mode==='typical' ? (Number.isFinite(c.value) ? '≈ '+num(c.value) : '—') : valueText(c);
      return `${amount}%${c.applicability?' ('+c.applicability+')':''}${c.mode==='typical'?' · điển hình':''}`;
    }).join(' ; ');
  }
  function drawEquivalence(m) {
    const candidates = equivalentCandidates(m);
    const candidate = candidates.find(item => item.id === state.eqCandidateId) || null;
    const approved = arr(state.db?.engineeringExtension?.equivalence?.approvedRelations).filter(r => r.fromId === m.id || r.toId === m.id);
    const intro = `<div class="mh-eq-intro"><h4>Đối chiếu vật liệu</h4><p>Mác gốc đứng đầu. Bên dưới tách riêng ba mức: tương đương đã duyệt, ứng viên trong cơ sở dữ liệu và danh sách cùng nhóm so sánh theo sách.</p></div>`;
    const caution = `<div class="mh-eq-caution" role="note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 4h.01"/></svg><span><b>HB chỉ cung cấp thông tin, phân tích và đề xuất tham khảo.</b> Quyết định lựa chọn, thay thế và sử dụng vật liệu cuối cùng thuộc về người dùng, sau khi xem xét tiêu chuẩn áp dụng và điều kiện sử dụng thực tế.</span></div>`;
    const original = `<div class="mh-eq-line mh-eq-origin"><span class="mh-eq-number">01</span><span class="mh-eq-ident"><strong>${esc(m.grade)} · ${esc(m.materialNumber || '—')}</strong><small>${esc(m.standard)} · ${esc(m.productForm)} · ${esc(m.condition)}</small></span><span class="mh-eq-tag">Vật liệu gốc</span></div>`;
    const approvedHtml = `<h5 class="mh-eq-subtitle">1. Tương đương đã duyệt</h5>${approved.length ? '' : '<p class="mh-note">Chưa có quan hệ tương đương được duyệt cho mác này.</p>'}`;
    const choices = candidates.map((item, index) => `<button type="button" class="mh-eq-line mh-eq-candidate" data-mh-eq-candidate="${esc(item.id)}" aria-pressed="${item.id === candidate?.id}"><span class="mh-eq-number">${String(index + 2).padStart(2,'0')}</span><span class="mh-eq-ident"><strong>${esc(item.grade)} · ${esc(item.materialNumber || '—')}</strong><small>${esc(item.standard)} · ${esc(item.productForm)} · ${esc(item.condition)}</small></span><span class="mh-eq-tag">Cùng phân nhóm · chưa xác nhận</span></button>`).join('');
    const dbHtml = `<h5 class="mh-eq-subtitle">2. Ứng viên trong cơ sở dữ liệu</h5>${candidates.length ? '<p class="mh-note">Chọn một mác để xem bảng đối chiếu số liệu.</p>' : '<p class="mh-note">Chưa có mác khác cùng phân nhóm trong cơ sở dữ liệu.</p>'}`;
    const book = arr(m.referenceData?.comparisonCandidates);
    const relText = r => r === 'same_standard_sibling_in_book_group' ? 'Cùng tiêu chuẩn, khác cấp' : 'Cùng nhóm so sánh trong sách';
    const bookHtml = `<h5 class="mh-eq-subtitle">3. Cùng nhóm so sánh theo sách ASTM DS67B (2004)</h5>${book.length ? mdTable(['Tiêu chuẩn','Mác','Số VL / UNS','Quan hệ','Trang'], book.map(c => tr([c.standard, c.grade, c.steelNumber || c.uns || '—', relText(c.relationship), c.printedPage ? 'tr. ' + c.printedPage : '—'])), 'Danh sách cùng nhóm so sánh theo sách') + `<p class="mh-note">${esc(m.referenceData?.comparisonCandidatesNote || '')} Các tiêu chuẩn trong sách là phiên bản trước 2004.</p>` : '<p class="mh-note">Chưa có danh sách từ sách cho mác này.</p>'}`;
    if (candidate && candidate.mechanical?.dimension?.kind && candidate.mechanical.dimension.kind === m.mechanical?.dimension?.kind && caseFor(candidate, dimension(m))) state.dimensions[candidate.id] = dimension(m);
    const table = candidate ? `<section class="mh-eq-comparison"><h4>Đối chiếu ${esc(m.grade)} ↔ ${esc(candidate.grade)}</h4>${drawComparisonTable(m, candidate, ['Gốc','Ứng viên'])}</section>` : '';
    return `<section class="mh-eq-panel" id="mh-equivalence-panel" aria-label="Đối chiếu vật liệu">${intro}${caution}<div class="mh-eq-list" aria-label="Danh sách đối chiếu">${original}</div>${approvedHtml}${dbHtml}<div class="mh-eq-list">${choices}</div>${table}${bookHtml}</section>`;
  }


// Comparison is a user-selected, side-by-side lookup; it does not infer equivalence.
const compareById = id => state.catalogue?.byId.get(id) || null;
function startComparison(m) {
  const groupId=materialGroup(m);
  if (!groupId || !MATERIAL_GROUPS.some(group=>group.id===groupId)) return;
  state.compareOpen=true;
  state.compareIds=[m.id,''];
  state.compareGroup=groupId;
  state.comparePicking=2;
  state.compareMessage='';
  state.eqOpen=false;state.eqCandidateId='';
  state.selectedId=m.id;
  state.group=groupId;
  state.filterKey='all';
  state.openNodes.clear();
  const initialPath=state.catalogue?.ancestors.get(m.id);
  if(initialPath?.length)openBranch(initialPath[initialPath.length-1],false);
  state.smartCriteria={};
  state.query='';
  $('[data-hbs-input]').value='';
  drawFamilyFilter();drawGroupTabs();drawSmartControls();
  if (state.sidebarCollapsed) setSidebarCollapsed(false);
  applySearch();
}
function exitComparison() {
  if (!state.compareOpen) return;
  const first=compareById(state.compareIds[0]);
  if (first) state.selectedId=first.id;
  state.compareOpen=false;
  state.comparePicking=0;
  state.compareGroup='';
  state.compareIds=['',''];
  state.compareMessage='';
  state.filterKey='all';
  state.query='';
  state.smartCriteria={};
  $('[data-hbs-input]').value='';
  drawFamilyFilter();drawSmartControls();drawGroupTabs();
  applySearch();
}
function changeComparisonSlot(slot) {
  if (!state.compareOpen || (slot!==1 && slot!==2)) return;
  state.compareIds[slot-1]='';
  state.comparePicking=slot;
  state.compareMessage='';
  state.filterKey='all';
  state.query='';
  state.smartCriteria={};
  $('[data-hbs-input]').value='';
  drawFamilyFilter();drawSmartControls();
  applySearch();
  // Keep both the search box and sidebar operational while selecting a slot.
}
function assignComparisonMaterial(material) {
  const slot=state.comparePicking;
  if (!state.compareOpen || !material || ![1,2].includes(slot)) return;
  if (materialGroup(material)!==state.compareGroup) {
    state.compareMessage='Chỉ được chọn hai vật liệu thuộc cùng một nhóm.';
    drawDetail();return;
  }
  if (state.compareIds[slot===1?1:0]===material.id) {
    state.compareMessage='VL1 và VL2 phải là hai bản ghi khác nhau. Hãy chọn mác khác.';
    drawDetail();return;
  }
  const sibling=compareById(state.compareIds[slot===1?1:0]);
  const dim=material.mechanical?.dimension,siblingDim=sibling?.mechanical?.dimension;
  if (sibling && dim?.kind===siblingDim?.kind && dim?.kind &&
      caseFor(material,dimension(sibling))) {
    // Use one common size when both material records actually cover it.
    state.dimensions[material.id]=dimension(sibling);
  }
  state.compareIds[slot-1]=material.id;
  if (slot===1) state.selectedId=material.id;
  state.comparePicking=0;
  state.compareMessage='';
  drawDetail();publishScope();
}
function compareMetricText(record,field) {
  if (!record || typeof record!=='object') return 'Chưa có dữ liệu';
  if (Number.isFinite(record.reference)) return '≈ '+num(record.reference)+' (tham khảo)';
  const value=valueText(record);
  return value==='—'?'Chưa có dữ liệu':value;
}
function compareCellText(material,property) {
  const value=material.physical?.[property]?.value;
  if (!Number.isFinite(value)) return 'Chưa có dữ liệu';
  return num(value);
}
function comparisonDataRow(label,left,right,remark='—') {
  return `<tr><th scope="row">${esc(label)}</th><td>${esc(left)}</td><td>${esc(right)}</td><td>${esc(remark)}</td></tr>`;
}
function compareSizeLabel(material) {
  const dim=material.mechanical?.dimension;
  return dim ? `${dim.label}: ${num(dimension(material))} ${dim.unit||'mm'}` : 'Không quy định kích thước trong bản mẫu';
}
function compareSlotCard(material,slot) {
  const choosing=state.comparePicking===slot;
  const label=`VL${slot}`;
  const size=material?.mechanical?.dimension;
  return `<section class="mh-compare-slot mh-compare-slot-${slot}${choosing?' mh-compare-choosing':''}${material?'':' mh-compare-placeholder'}" data-mh-compare-slot="${slot}" aria-label="${label}">
    <div class="mh-compare-slot-top"><span class="mh-compare-pill mh-compare-pill-${slot}">${label}</span><button type="button" class="mh-compare-change" data-mh-compare-change="${slot}" aria-label="${material?'Đổi':'Chọn'} ${label}">${material?'Đổi '+label:'Chọn '+label}</button></div>
    ${material?`<strong class="mh-compare-grade">${esc(material.grade)}</strong><p>${esc(material.title)}</p><div class="mh-compare-sub"><span>${esc(material.materialNumber||'—')}</span><span>${esc(material.standard)}</span><span>${esc(material.productForm)}</span><span>${esc(material.condition)}</span></div>${size?`<label class="mh-compare-dimension">${esc(size.label)} (${esc(size.unit||'mm')})<input type="number" data-mh-compare-dimension="${slot}" min="0.001" step="any" inputmode="decimal" value="${esc(dimension(material))}" aria-label="${esc(size.label)} của ${label}"/></label>`:''}`:
    `<div class="mh-compare-no-material"><strong>Chưa chọn vật liệu</strong><p>${choosing?'Chọn mác tại danh mục bên trái hoặc tìm kiếm phía trên.':'Nhấn Chọn '+label+' để chọn mác tại danh mục.'}</p></div>`}
  </section>`;
}
function rangeRemark(a,b,unit) {
  if(!Number.isFinite(a?.min)||!Number.isFinite(a?.max)||!Number.isFinite(b?.min)||!Number.isFinite(b?.max))return 'Khác/giống phạm vi công bố; xem từng cột';
  if(a.min===b.min&&a.max===b.max)return 'Cùng khoảng công bố';
  const lo=Math.max(a.min,b.min),hi=Math.min(a.max,b.max);
  return lo<=hi?`Hai khoảng chồng lấn ${num(lo)}–${num(hi)} ${unit}`:'Hai khoảng không chồng lấn';
}
function drawComparisonTable(m1,m2,labels=['VL1','VL2']) {
  // Comparison must stay inside the same top-level material group.
  if(materialGroup(m1)!==materialGroup(m2))return '<div class="mh-compare-wait">Không thể đối chiếu hai vật liệu khác nhóm.</div>';
  const d1=m1.mechanical?.dimension,d2=m2.mechanical?.dimension;
  const sameDimension=(d1?.kind&&d1.kind===d2?.kind&&dimension(m1)===dimension(m2))||(!d1&&!d2);
  const c1=caseFor(m1,dimension(m1)),c2=caseFor(m2,dimension(m2));
  const comparable=Boolean(c1&&c2&&sameDimension);
  const dimNote=!d1&&!d2?'Cả hai chưa có vùng kích thước được khai báo':d1?.kind!==d2?.kind?'Khác loại kích thước; không tính chênh lệch':!sameDimension?'Kích thước đang chọn khác nhau; không tính chênh lệch':!c1||!c2?'Có kích thước ngoài vùng dữ liệu; không tính chênh lệch':'Cùng loại và giá trị kích thước';
  const [l1,l2]=labels;
  const metricRow=(name,key,unit,needSameSymbol=false)=>{
    const a=c1?.[key],b=c2?.[key];
    let remark='Chỉ đối chiếu số liệu';
    if(!a||!b)remark='Thiếu dữ liệu';
    else if(!comparable)remark='Không cùng điều kiện kích thước';
    else if(needSameSymbol&&m1.mechanical?.yieldSymbol!==m2.mechanical?.yieldSymbol)remark='Khác ký hiệu giới hạn chảy';
    else if(Number.isFinite(a.reference)||Number.isFinite(b.reference))remark='Giá trị điển hình, không phải giới hạn';
    else if(Number.isFinite(a.min)&&Number.isFinite(b.min)&&!Number.isFinite(a.max)&&!Number.isFinite(b.max)){
      const diff=b.min-a.min;
      remark=diff===0?'Giới hạn tối thiểu bằng nhau':`${l2} ${diff>0?'cao hơn':'thấp hơn'} ${num(Math.abs(diff))} ${unit} (giới hạn tối thiểu)`;
    } else remark=rangeRemark(a,b,unit);
    return comparisonDataRow(name,compareMetricText(a)+(a?' '+unit:''),compareMetricText(b)+(b?' '+unit:''),remark);
  };
  const impactText=m=>{
    const impact=m.mechanical?.impact;
    return Number.isFinite(impact?.minJ)&&Number.isFinite(impact?.temperatureC)?`≥ ${num(impact.minJ)} J tại ${num(impact.temperatureC)} °C`:'Chưa có dữ liệu';
  };
  const impactComment=m1.mechanical?.impact&&m2.mechanical?.impact?(m1.mechanical.impact.temperatureC===m2.mechanical.impact.temperatureC?'Cùng nhiệt độ thử công bố':'Khác nhiệt độ thử; không so sánh trực tiếp'):'Thiếu dữ liệu';
  const physicalRow=(name,key,unit)=>{
    const a=compareCellText(m1,key),b=compareCellText(m2,key);
    const has=x=>x!=='Chưa có dữ liệu';
    return comparisonDataRow(name,has(a)?a+' '+unit:a,has(b)?b+' '+unit:b,has(a)&&has(b)?'Giá trị tham khảo; xem điều kiện và nguồn':'Thiếu dữ liệu');
  };
  const firstRows=[
    comparisonDataRow('Phân nhóm vật liệu',FAMILY_LABEL[m1.family]||m1.family,FAMILY_LABEL[m2.family]||m2.family,'Cùng nhóm vật liệu cấp 1'),
    comparisonDataRow('Tiêu chuẩn',m1.standard,m2.standard),
    comparisonDataRow('Dạng sản phẩm',m1.productForm,m2.productForm),
    comparisonDataRow('Trạng thái',m1.condition,m2.condition),
    comparisonDataRow('Kích thước',compareSizeLabel(m1),compareSizeLabel(m2),dimNote),
    metricRow('Giới hạn chảy ('+txt(m1.mechanical?.yieldSymbol||'Re')+' / '+txt(m2.mechanical?.yieldSymbol||'Re')+')','yieldMpa','MPa',true),
    metricRow('Độ bền kéo Rm','tensileMpa','MPa'),
    metricRow('Độ giãn dài A','elongationPct','%'),
    comparisonDataRow('Va đập KV',impactText(m1),impactText(m2),impactComment),
    physicalRow('Mô đun E','youngModulusGpa','GPa'),
    physicalRow('Khối lượng riêng ρ','densityKgM3','kg/m³')
  ];
  const elements=[...new Set([...arr(m1.chemistry?.rows),...arr(m2.chemistry?.rows)].map(row=>row.element).filter(Boolean))].sort((a,b)=>elementRank(a)-elementRank(b)||a.localeCompare(b));
  const chemistryRows=elements.map(element=>comparisonDataRow(element,chemText(m1,element),chemText(m2,element),m1.chemistry?.kind===m2.chemistry?.kind?'Đối chiếu theo điều kiện công bố':'Khác loại dữ liệu hóa học')).join('');
  return `<div class="mh-compare-results" aria-label="Bảng so sánh vật liệu">
    <p class="mh-compare-scroll-hint">Vuốt ngang bảng để xem đầy đủ hai cột vật liệu và ghi chú.</p>
    <h4>Đối chiếu thông số kỹ thuật</h4>
    <div class="mh-table-wrap"><table class="mh-table mh-compare-table">${caption('Đối chiếu thông số kỹ thuật')}<thead><tr><th scope="col">Tiêu chí</th><th scope="col" class="mh-compare-col-1">${esc(m1.grade)} · ${esc(l1)}</th><th scope="col" class="mh-compare-col-2">${esc(m2.grade)} · ${esc(l2)}</th><th scope="col">Chênh lệch / Điều kiện</th></tr></thead><tbody>${firstRows.join('')}</tbody></table></div>
    <h4>Thành phần hóa học (% khối lượng)</h4>
    <div class="mh-table-wrap"><table class="mh-table mh-compare-table">${caption('Đối chiếu thành phần hóa học')}<thead><tr><th scope="col">Nguyên tố</th><th scope="col" class="mh-compare-col-1">${esc(m1.grade)} · ${esc(l1)}</th><th scope="col" class="mh-compare-col-2">${esc(m2.grade)} · ${esc(l2)}</th><th scope="col">Ghi chú</th></tr></thead><tbody>${chemistryRows||comparisonDataRow('Thành phần hóa học','Chưa có dữ liệu','Chưa có dữ liệu','—')}</tbody></table></div>
    <p class="mh-compare-footnote">Chỉ đối chiếu các thông số đang có trong cơ sở dữ liệu. Không xếp hạng và không kết luận hai vật liệu tương đương hoặc được phép thay thế.</p>
  </div>`;
}
function drawComparison() {
  const first=compareById(state.compareIds[0]),second=compareById(state.compareIds[1]);
  const group=MATERIAL_GROUPS.find(g=>g.id===state.compareGroup);
  const instruction=state.comparePicking?`Đang chọn VL${state.comparePicking}: tìm kiếm hoặc chọn mác ở danh mục bên trái (${group?.label||''}).`:first&&second?'Đã chọn hai vật liệu. Nhấn “Đổi VL1” hoặc “Đổi VL2” khi cần chọn lại.':'Chọn vật liệu còn trống từ danh mục bên trái.';
  const message=state.compareMessage||instruction;
  $('[data-mh-detail]').innerHTML=`<div class="mh-compare-head"><div><h3>So sánh vật liệu</h3><p>Chọn hai mác trong cùng nhóm ${esc(group?.label||'vật liệu')}.</p></div><button type="button" class="mh-compare-close" data-mh-compare-close aria-label="Thoát so sánh">× <span>Đóng so sánh</span></button></div>
    <div class="mh-compare-slots">${compareSlotCard(first,1)}${compareSlotCard(second,2)}</div>
    <p class="mh-compare-guide" role="status" aria-live="polite">${esc(message)}</p>
    ${first&&second?drawComparisonTable(first,second):`<div class="mh-compare-wait"><strong>Chưa đủ hai vật liệu để so sánh</strong><p>${esc(instruction)}</p></div>`}
    <footer class="mh-footer">Số liệu tham khảo để tra cứu và so sánh vật liệu.</footer>`;
}

  function drawDetail() {
    if (state.compareOpen) {drawComparison();drawList();return;}
    const m=selected();
    if (!m && !groupHasData()) {
      $('[data-mh-detail]').innerHTML=`<div class="hbs-empty"><strong>${esc(scopeLabel())}</strong><p>Chưa có dữ liệu cho nhóm này. Danh mục sẽ được bổ sung từng bước.</p></div>`;
      drawList();
      return;
    }
    if (!m) { $('[data-mh-detail]').innerHTML='<div class="hbs-empty"><strong>Không tìm thấy kết quả phù hợp</strong><p>Kiểm tra từ khóa, hashtag, kích thước và điều kiện thử. Thiếu dữ liệu không được coi là đáp ứng yêu cầu.</p></div>'; drawList(); return; }
    const c=activeCase(m),mech=m.mechanical||{},dim=mech.dimension,impact=mech.impact;
    const sizeNote=dim?(c?`${dimMark(dim)} = ${num(dimension(m))} mm · vùng ${rangeLabel(c,dim.label)}`:'Ngoài vùng dữ liệu'):'Tham khảo của hãng, không chia kích thước';
    const withUnit=(obj,unit)=>{const v=cellValue(obj);return v==='—'?'—':v+' '+unit;};
    const sym=mech.yieldSymbol||'Re';
    const metrics=metric('Giới hạn chảy '+sym,withUnit(c?.yieldMpa,'MPa'),sizeNote)+
      metric('Độ bền kéo Rm',withUnit(c?.tensileMpa,'MPa'),sizeNote)+
      metric('Độ giãn dài A',withUnit(c?.elongationPct,'%'),sizeNote+(mech.tensileTestOrientation?' · mẫu '+(ORIENTATION_SHORT[mech.tensileTestOrientation]||mech.tensileTestOrientation):''))+
      metric('Va đập KV',impact&&Number.isFinite(impact.minJ)?`≥ ${num(impact.minJ)} J`:'—',impact&&Number.isFinite(impact.temperatureC)?`tại ${num(impact.temperatureC)} °C`+(impact.testDirection?' · mẫu '+(ORIENTATION_SHORT[impact.testDirection]||impact.testDirection):''):'Nguồn hiện có không nêu KV');
    const views={overview:drawOverview,mechanical:drawMechanical,chemistry:drawChemistry,usage:drawUsage,heat:drawHeatTreatment,welding:drawWelding,physical:drawPhysical,sources:drawSources};
    const eqIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h14m-4-4 4 4-4 4M17 17H3m4-4-4 4 4 4"/></svg>';
    const cmpIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="8" height="14" rx="1.5"/><rect x="13" y="5" width="8" height="14" rx="1.5"/></svg>';
    const chips=[[m.grade,'mh-violet'],[m.materialNumber||'—','mh-slate'],[m.standard,'mh-slate'],[m.condition,''],[m.productForm,''],[FAMILY_LABEL[m.family]||m.family,'']].filter(([t])=>t).map(([t,cls])=>`<span class="mh-chip${cls?' '+cls:''}">${esc(t)}</span>`).join('');
    $('[data-mh-detail]').innerHTML=`<div class="mh-detail-head"><div><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p></div><div class="mh-detail-actions"><button type="button" class="mh-eq-trigger mh-compare-trigger" data-mh-compare-open aria-label="So sánh vật liệu ${esc(m.grade)} với vật liệu khác" title="So sánh hai vật liệu cùng nhóm">${cmpIcon}<span>So sánh</span></button><button type="button" class="mh-eq-trigger" data-mh-equivalence aria-label="Vật liệu tương đương của ${esc(m.grade)}" aria-pressed="${state.eqOpen}" title="Đối chiếu vật liệu">${eqIcon}<span>VL tương đương</span></button></div></div><div class="mh-chips">${chips}</div>${drawConditionBar(m)}<div class="mh-metrics">${metrics}</div>${state.eqOpen?drawEquivalence(m):`<nav class="mh-tabs" role="tablist" aria-label="Chi tiết vật liệu">${DETAIL_TABS.map(([id,label])=>`<button type="button" class="mh-tab" role="tab" data-mh-tab="${id}" aria-selected="${state.tab===id}">${esc(label)}</button>`).join('')}</nav><div class="mh-content" role="tabpanel">${(views[state.tab]||drawOverview)(m)}</div>`}`;
    drawList();
  }
  $('[data-hbs-input]').disabled=true;
  $('[data-hbs-submit]').disabled=true;
  $('[data-hbs-clear]').disabled=true;
  $('[data-mh-smart-toggle]').disabled=true;
  $('[data-mh-analysis-toggle]').disabled=true;
  $('[data-hbs-submit]').textContent='Đang tải…';
  $('[data-hbs-status]').textContent='Đang tải dữ liệu sổ tay…';
  try {
    state.db=await loadMaterialDatabase({signal:ac.signal});
    if(ac.signal.aborted) return cleanup;
    state.index=createIndex(state.db.materials,m=>materialFields(m,state.db.sources));
    state.catalogue=makeCatalogue(state.db.materials);
    const area=$('[data-mh-content]');
    area.className='mh-layout';
    area.innerHTML=`<aside class="mh-aside"><div class="mh-side-title"><strong data-mh-side-title>Thép</strong><span class="mh-count" data-mh-visible></span><button type="button" class="mh-sidebar-toggle" data-mh-sidebar-toggle aria-controls="mh-sidebar-body" aria-expanded="true" aria-label="Thu gọn danh mục" title="Thu gọn danh mục"></button></div><div id="mh-sidebar-body" data-mh-sidebar-body><div class="mh-tree-filter"><select class="mh-filter" id="mh-family-filter" data-mh-family aria-label="Lọc nhóm vật liệu trong phạm vi đang chọn"></select></div><div class="mh-tree" data-mh-list aria-label="Cây danh mục vật liệu"></div></div></aside><article class="mh-detail" data-mh-detail></article>`;
    $('[data-hbs-input]').disabled=false;
    $('[data-hbs-submit]').disabled=false;
    $('[data-hbs-clear]').disabled=false;
    $('[data-mh-smart-toggle]').disabled=false;
    $('[data-mh-analysis-toggle]').disabled=false;
    $('[data-hbs-submit]').textContent='Tìm kiếm';
    drawFamilyFilter();
    drawGroupTabs();
    drawSmartControls();
    setSidebarCollapsed(false);
    applySearch();
    root.addEventListener('input',evt=>{
      if(evt.target.matches('[data-hbs-input]') && !evt.isComposing) applySearch();
      if(evt.target.matches('[data-mh-smart-value]')) {
        const id=evt.target.dataset.mhSmartValue;
        if(state.smartCriteria[id]) { state.smartCriteria[id].value=evt.target.value.slice(0,80);applySearch(); }
      }
    },{signal:ac.signal});
    root.addEventListener('compositionend',evt=>{if(evt.target.matches('[data-hbs-input]'))applySearch();},{signal:ac.signal});
    root.addEventListener('submit',evt=>{if(evt.target.matches('[data-hbs-form]')){evt.preventDefault();submitSearch();}},{signal:ac.signal});
    root.addEventListener('change',evt=>{
      if(evt.target.matches('[data-mh-smart-toggle]')){state.smartEnabled=evt.target.checked;drawSmartControls();setAnalysis(false);applySearch();return;}
      if(evt.target.matches('[data-mh-smart-op]')) {
        const id=evt.target.dataset.mhSmartOp;
        if(state.smartCriteria[id]) {state.smartCriteria[id].op=evt.target.value;applySearch();}return;
      }
      if(evt.target.matches('[data-mh-family]')){
        const key=evt.target.value;
        state.filterKey=key==='all'||filterFolders().some(node=>node.key===key)?key:'all';
        state.openNodes.clear();
        applySearch();
      }
      if(evt.target.matches('[data-mh-compare-dimension]')) {
        const slot=Number(evt.target.dataset.mhCompareDimension),record=compareById(state.compareIds[slot-1]);
        if(!record || !record.mechanical?.dimension) return;
        const raw=evt.target.value.trim(),value=raw?Number(raw):NaN;
        const next=raw&&Number.isFinite(value)&&value>0?value:NaN;
        state.dimensions[record.id]=next;
        // One shared size: apply to the other slot when it uses the same kind of dimension.
        const other=compareById(state.compareIds[slot===1?1:0]);
        if(other && other.mechanical?.dimension?.kind===record.mechanical.dimension.kind) state.dimensions[other.id]=next;
        drawDetail();return;
      }
      if(evt.target.matches('[data-mh-dimension]')){
        const m=selected(),v=Number(evt.target.value);
        state.dimensions[m.id]=evt.target.value.trim() === '' ? NaN : v;
        if(state.smartEnabled&&selectedCriteria().length)applySearch();else drawDetail();
      }
    },{signal:ac.signal});
    root.addEventListener('click',evt=>{
      if(evt.target.closest('[data-mh-analysis-toggle]')){setAnalysis(!state.analysisOpen);return;}
      const smartTag=evt.target.closest('[data-mh-smart-tag]');
      if(smartTag && state.smartEnabled) {
        const id=smartTag.dataset.mhSmartTag;
        if(!SMART_FIELD_BY_ID.has(id))return;
        if(state.smartCriteria[id]) delete state.smartCriteria[id];
        else {
          if(id==='t')delete state.smartCriteria.d;
          if(id==='d')delete state.smartCriteria.t;
          state.smartCriteria[id]={op:'≥',value:''};
          // KV comparisons need a matching test temperature.
          if(id==='kv'&&!state.smartCriteria.kvTemp)state.smartCriteria.kvTemp={op:'=',value:''};
        }
        drawSmartControls();applySearch();
        $('[data-mh-smart-value="'+id+'"]')?.focus({preventScroll:true});return;
      }
      const smartRemove=evt.target.closest('[data-mh-smart-remove]');
      if(smartRemove) {delete state.smartCriteria[smartRemove.dataset.mhSmartRemove];drawSmartControls();applySearch();return;}
      if(evt.target.closest('[data-mh-sidebar-toggle]')){setSidebarCollapsed(!state.sidebarCollapsed);return;}
      if(evt.target.closest('[data-hbs-clear]')){state.smartCriteria={};$('[data-hbs-input]').value='';drawSmartControls();applySearch();$('[data-hbs-input]').focus({preventScroll:true});return;}
      if(evt.target.closest('[data-mh-compare-open]')) {
        const current=selected();if(current)startComparison(current);return;
      }
      if(evt.target.closest('[data-mh-compare-close]')) {exitComparison();return;}
      const compareChange=evt.target.closest('[data-mh-compare-change]');
      if(compareChange) {changeComparisonSlot(Number(compareChange.dataset.mhCompareChange));return;}
      const eqButton=evt.target.closest('[data-mh-equivalence]');
      if(eqButton && root.contains(eqButton)) {
        state.eqOpen=!state.eqOpen;state.eqCandidateId='';drawDetail();
        $('[data-mh-equivalence]')?.focus({preventScroll:true});return;
      }
      const eqCandidate=evt.target.closest('[data-mh-eq-candidate]');
      if(eqCandidate && root.contains(eqCandidate) && selected() && equivalentCandidates(selected()).some(material=>material.id===eqCandidate.dataset.mhEqCandidate)) {
        state.eqCandidateId=eqCandidate.dataset.mhEqCandidate;drawDetail();
        [...root.querySelectorAll('[data-mh-eq-candidate]')].find(button=>button.dataset.mhEqCandidate===state.eqCandidateId)?.focus({preventScroll:true});return;
      }
      const groupButton=evt.target.closest('[data-mh-group]');
      if(groupButton && root.contains(groupButton)){chooseGroup(groupButton.dataset.mhGroup);return;}
      const summary=evt.target.closest('[data-mh-tree-node] > summary');
      if(summary && root.contains(summary)){
        evt.preventDefault();
        const node=summary.parentElement,key=node.dataset.mhTreeNode;
        if(node.open)closeBranch(key);else openBranch(key);
        return;
      }
      const selection=evt.target.closest('[data-mh-id]');
      if(selection && root.contains(selection) && filtered().some(material=>material.id===selection.dataset.mhId)) {
        if(state.compareOpen) {
          if(state.comparePicking) assignComparisonMaterial(state.catalogue.byId.get(selection.dataset.mhId));
          else {state.compareMessage='Muốn chọn lại mác, nhấn Đổi VL1 hoặc Đổi VL2 trước.';drawDetail();}
          return;
        }
        state.selectedId=selection.dataset.mhId;state.tab='overview';state.eqOpen=false;state.eqCandidateId='';
        revealSelection();
        drawDetail();publishScope();return;
      }
      const tab=evt.target.closest('[data-mh-tab]');
      if(tab && root.contains(tab)){state.tab=tab.dataset.mhTab;drawDetail();}
    },{signal:ac.signal});
    root.addEventListener('keydown',evt=>{
      const button=evt.target.closest('[data-mh-group]');
      if(!button || !root.contains(button) || !['ArrowLeft','ArrowRight','Home','End'].includes(evt.key))return;
      evt.preventDefault();
      const current=GROUP_TABS.findIndex(group=>group.id===button.dataset.mhGroup);
      const next=evt.key==='Home'?0:evt.key==='End'?GROUP_TABS.length-1:(current+(evt.key==='ArrowRight'?1:-1)+GROUP_TABS.length)%GROUP_TABS.length;
      chooseGroup(GROUP_TABS[next].id,true);
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
