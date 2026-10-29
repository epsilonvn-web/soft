/** Shared local handbook search. No remote search or persistence of queries. */
export const text = value => String(value ?? '');
export const escapeHtml = value => text(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const normalize = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
const wordsIn = value => normalize(value).match(/[\p{L}\p{N}]+(?:[.,][\p{N}]+)*/gu) || [];
export const queryWords = query => [...new Set(wordsIn(text(query).slice(0, 160)))];
const hasWord = (words, word) => words.some(candidate => candidate === word || (word.length >= 3 && candidate.startsWith(word)));

export function createIndex(records, fieldsFor) {
  return records.map(record => {
    const fields = fieldsFor(record).filter(field => text(field.text).trim()).map(field => ({ ...field, text: text(field.text), folded: normalize(field.text), words:wordsIn(field.text) }));
    return { record, fields, words:fields.flatMap(field=>field.words), codes:[record.code,record.grade,record.materialNumber].filter(Boolean).map(normalize), heading:wordsIn([record.code, record.grade, record.title].filter(Boolean).join(' ')) };
  });
}

export function searchIndex(index, query) {
  const words = queryWords(query);
  // A recognized designation resolves to its own record, even when a shared source lists other grades.
  const direct = words.length ? index.filter(item => words.every(word => item.codes.some(code => code === word || (word.length >= 3 && /\d/.test(word) && code.includes(word))))) : [];
  return (direct.length ? direct : index).filter(item => words.every(word => hasWord(item.words,word) || item.codes.some(code=>code.includes(word)))).map(item => ({
    ...item,
    score: words.reduce((score, word) => score + (hasWord(item.heading,word) ? 10 : 1), 0)
  })).sort((a, b) => b.score - a.score);
}

/** Highlight original text only after escaping every rendered fragment. */
export function highlight(value, query) {
  const original = text(value), words = queryWords(query);
  if (!words.length) return escapeHtml(original);
  let folded = '', positions = [];
  for (let i = 0; i < original.length;) {
    const char = String.fromCodePoint(original.codePointAt(i));
    const converted = normalize(char);
    // Keep whitespace so multiword snippets retain their original boundaries.
    const part = converted || (/\s/.test(char) ? ' ' : '');
    for (let j=0; j<part.length; j++) { folded += part[j]; positions.push([i, i + char.length]); }
    i += char.length;
  }
  const ranges = [];
  for (const word of words) {
    let start = 0, found;
    while ((found = folded.indexOf(word, start)) !== -1) {
      ranges.push([positions[found][0], positions[found + word.length - 1][1]]);
      start = found + word.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  let html = '', cursor = 0;
  for (const [start, end] of merged) { html += escapeHtml(original.slice(cursor, start)) + '<mark>' + escapeHtml(original.slice(start, end)) + '</mark>'; cursor = end; }
  return html + escapeHtml(original.slice(cursor));
}

export function snippets(item, query, limit = 2) {
  const words = queryWords(query);
  const matches = words.length ? item.fields.filter(field => words.some(word => hasWord(field.words,word))) : item.fields.filter(field => ['Mô tả', 'Tiêu chuẩn'].includes(field.label));
  return matches.slice(0, limit).map(field => {
    const first = words.map(word => field.folded.indexOf(word)).filter(pos => pos >= 0).sort((a, b) => a - b)[0] ?? 0;
    const start = Math.max(0, first - 45), end = Math.min(field.text.length, start + 190);
    const excerpt = (start ? '…' : '') + field.text.slice(start, end) + (end < field.text.length ? '…' : '');
    return `<span class="hbs-snippet"><b>${escapeHtml(field.label)}:</b> ${highlight(excerpt, query)}</span>`;
  }).join('');
}

export const SEARCH_CSS = `
.hbs,.hbs *{box-sizing:border-box}.hbs{font:16px/1.5 Inter,'Segoe UI',Arial,sans-serif;color:#1b2b64;width:100%;max-width:none;margin:0;min-width:0}.hbs [hidden]{display:none!important}
.hbs button,.hbs input{font:inherit}.hbs button{cursor:pointer}.hbs button:disabled{cursor:wait;opacity:.65}.hbs button:focus-visible,.hbs input:focus-visible{outline:3px solid #a6bcff;outline-offset:3px}
.hbs-searchbox{margin:14px 0;padding:17px 18px;border:1px solid #dce5f7;border-radius:14px;background:linear-gradient(110deg,#f2f6ff,#fafbff)}
.hbs-searchbox label{display:block;font-weight:750;color:#243d91;margin-bottom:9px}.hbs-searchrow{display:flex;align-items:stretch;gap:9px}.hbs-searchrow input{flex:1;min-width:0;height:45px;border:1px solid #c5d3ed;border-radius:10px;padding:10px 13px;background:white;color:#1b2b64;font-size:16px}
.hbs-searchrow button,.hbs-reset{border:1px solid #314dc9;border-radius:10px;padding:9px 17px;background:#314dc9;color:#fff;font-weight:750;white-space:nowrap;min-height:44px}.hbs-searchrow button:hover{background:#2440b5}
.hbs-reset,.hbs-searchrow .hbs-reset{border-color:#cfdaef;background:#fff;color:#324d91}.hbs-reset:hover,.hbs-searchrow .hbs-reset:hover{background:#eef3ff}.hbs-status{color:#586a90;font-size:16px;margin:9px 0 0;line-height:1.5;overflow-wrap:anywhere}
.hbs-snippet{display:block;font-size:16px;font-weight:400;color:#53658a;line-height:1.5;margin-top:6px;overflow-wrap:anywhere}.hbs-snippet b{font-weight:650;color:#405687}.hbs mark{color:#674600;background:#ffec9d;border-radius:3px;padding:0 1px}
.hbs-hero{padding:22px 24px;border-radius:16px;background:linear-gradient(108deg,#112b92,#2e4bcf 65%,#6746d5);color:#fff}.hbs-hero p{margin:5px 0 0;color:#e9f0ff;font-size:16px}.hbs-hero h2{font-size:28px;line-height:1.3;margin:0;color:#fff}.hbs-kicker{letter-spacing:.08em;font-weight:750;font-size:16px;color:#dce7ff;display:block;margin-bottom:3px}
.hbs-results{display:grid;gap:11px;grid-template-columns:repeat(2,minmax(0,1fr))}.hbs-result{display:block;width:100%;text-align:left;padding:17px;border:1px solid #d9e2f3;border-radius:13px;background:#fff;color:#233b87;min-width:0}.hbs-result:hover,.hbs-result[aria-pressed=true]{border-color:#748be5;background:#f5f7ff}.hbs-result strong{display:block;font-size:19px;overflow-wrap:anywhere}.hbs-result small{display:block;font-size:16px;color:#667798;margin-top:4px}.hbs-result em{display:block;font-size:16px;color:#3254be;font-style:normal;font-weight:700;margin-top:11px}
.hbs-empty{grid-column:1/-1;border:1px dashed #cbd9f0;background:#f8faff;border-radius:14px;padding:28px 20px;text-align:center;color:#5c6d91}.hbs-empty strong{display:block;color:#284494;font-size:19px;margin-bottom:6px}.hbs-empty p{margin:0}.hbs-error{border-color:#ecc5cd;background:#fff7f8;color:#854353}.hbs-error button{margin-top:13px}
.hbs-detail{margin-top:16px;border:1px solid #dce5f4;border-radius:14px;background:#fff;padding:20px;min-width:0;scroll-margin-top:20px}.hbs-detail h3{margin:0 0 10px;font-size:23px;color:#223f99;overflow-wrap:anywhere}.hbs-detail h4{font-size:18px;color:#304c9f;margin:18px 0 8px}.hbs-detail p{margin:8px 0;white-space:pre-line;overflow-wrap:anywhere}.hbs-tablewrap{overflow-x:auto}.hbs-detail table{width:100%;border-collapse:collapse;min-width:300px}.hbs-detail th,.hbs-detail td{padding:9px 12px;border:1px solid #dfe6f4;text-align:left}.hbs-detail th{background:#edf2ff}.hbs-source{color:#2952c1;overflow-wrap:anywhere}.hbs-spinner{display:inline-block;width:16px;height:16px;border:2px solid #ffffff65;border-top-color:white;border-radius:50%;animation:hbs-spin .8s linear infinite;vertical-align:-2px;margin-right:7px}@keyframes hbs-spin{to{transform:rotate(360deg)}}
@media(max-width:640px){.hbs-searchrow{flex-wrap:wrap}.hbs-searchrow input{flex-basis:100%}.hbs-searchrow button{flex:1}.hbs-results{grid-template-columns:1fr}.hbs-hero{padding:18px}.hbs-hero h2{font-size:25px}.hbs-searchbox{padding:14px}.hbs-detail{padding:15px}}
@media(prefers-reduced-motion:reduce){.hbs-spinner{animation:none}}
`;

export function searchForm({placeholder, label = 'Nhập từ khóa cần tra cứu', prefix = 'hb'}) {
  return `<form class="hbs-searchbox" data-hbs-form role="search"><label for="${escapeHtml(prefix)}-search">${escapeHtml(label)}</label><div class="hbs-searchrow"><input id="${escapeHtml(prefix)}-search" data-hbs-input type="search" maxlength="160" placeholder="${escapeHtml(placeholder)}" autocomplete="off"><button type="submit" data-hbs-submit>Tìm kiếm</button><button type="button" class="hbs-reset" data-hbs-clear>Xóa tìm kiếm</button></div><p class="hbs-status" data-hbs-status role="status" aria-live="polite" aria-atomic="true"></p></form>`;
}

const list = value => Array.isArray(value) ? value : [];
const contentText = value => Array.isArray(value) ? value.map(text).join(' · ') : text(value);
function entryFields(entry) {
  const fields = [
    ['Tên / ký hiệu', [entry.title, entry.code].filter(Boolean).join(' · ')], ['Tiêu chuẩn', entry.standard],
    ['Mô tả', entry.description], ['Từ khóa', contentText(entry.keywords)]
  ].map(([label, value]) => ({label, text: value}));
  for (const section of list(entry.sections)) fields.push({ label: text(section.title) || 'Thông tin', text: [contentText(section.content), ...list(section.columns), ...list(section.rows).map(row => contentText(row))].join(' · ') });
  return fields;
}

/** Empty {} is supported. Populated handbooks use {entries:[{id,title,...}],sources:[]}. */
export async function mountHandbook(root, ctx = {}, options) {
  const ac = new AbortController();
  const stop = () => ac.abort();
  const cleanup = () => { stop(); ctx.signal?.removeEventListener('abort', stop); };
  if (ctx.signal?.aborted) { cleanup(); return cleanup; }
  ctx.signal?.addEventListener('abort', stop, {once:true});
  root.innerHTML = `<style>${SEARCH_CSS}</style><section class="hbs"><header class="hbs-hero"><span class="hbs-kicker">EPSILON BLUE · ENGINEERING HANDBOOK</span><h2>${escapeHtml(options.title)}</h2><p>${escapeHtml(options.description)}</p></header>${searchForm({placeholder:options.placeholder,prefix:options.key})}<div class="hbs-results" data-hbs-results></div><article class="hbs-detail" data-hbs-detail hidden></article></section>`;
  const $ = selector => root.querySelector(selector);
  const input = $('[data-hbs-input]'), submit = $('[data-hbs-submit]'), clear = $('[data-hbs-clear]'), results = $('[data-hbs-results]'), detail = $('[data-hbs-detail]'), status = $('[data-hbs-status]');
  let index = [], sources = [], loaded = false, loading = false, selectedId = '';
  function render() {
    if (!loaded) return;
    const query = input.value.trim(), matches = searchIndex(index, query);
    detail.hidden = true; detail.replaceChildren(); selectedId = '';
    status.textContent = query ? `${matches.length} kết quả cho “${query}”.` : `${index.length} mục tra cứu. Gõ từ khóa để lọc kết quả bên dưới.`;
    if (!index.length) {
      status.textContent = 'Chưa có dữ liệu tra cứu.';
      results.innerHTML = '<div class="hbs-empty"><strong>Sổ tay chưa có dữ liệu</strong><p>Các mục tra cứu sẽ xuất hiện tại đây khi dữ liệu được bổ sung.</p></div>';
    } else if (!matches.length) {
      results.innerHTML = '<div class="hbs-empty"><strong>Không tìm thấy kết quả phù hợp</strong><p>Thử tên, ký hiệu, tiêu chuẩn hoặc từ khóa ngắn hơn.</p></div>';
    } else results.innerHTML = matches.map(item => `<button type="button" class="hbs-result" data-hbs-id="${escapeHtml(item.record.id)}" aria-pressed="false"><strong>${highlight(item.record.title,query)}</strong><small>${highlight([item.record.code,item.record.standard].filter(Boolean).join(' · '),query)}</small>${snippets(item,query,3)}<em>Xem chi tiết →</em></button>`).join('');
  }
  function showEntry(id) {
    const entry = index.find(item => item.record.id === id)?.record;
    if (!entry) return;
    selectedId = id;
    detail.innerHTML = `<h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml([entry.code,entry.standard].filter(Boolean).join(' · '))}</p><p>${escapeHtml(entry.description)}</p>${list(entry.sections).map(section => `<section><h4>${escapeHtml(section.title)}</h4><p>${escapeHtml(contentText(section.content))}</p>${list(section.rows).length ? `<div class="hbs-tablewrap"><table>${list(section.columns).length ? `<thead><tr>${section.columns.map(cell=>`<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead>`:''}<tbody>${section.rows.map(row=>`<tr>${list(row).map(cell=>`<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}</section>`).join('')}`;
    for (const source of sources.filter(source => list(entry.sourceIds).includes(source.id))) {
      const p = document.createElement('p');
      try {
        const url = new URL(source.url);
        if (url.protocol !== 'https:') throw new Error('Unsupported source URL');
        const a = document.createElement('a'); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 'hbs-source'; a.textContent = text(source.title) || 'Mở tài liệu nguồn'; p.append(a);
      } catch { p.textContent = text(source.title); }
      detail.append(p);
    }
    detail.hidden = false;
    for (const button of results.querySelectorAll('[data-hbs-id]')) button.setAttribute('aria-pressed', String(button.dataset.hbsId === selectedId));
    detail.scrollIntoView({behavior:'auto',block:'start'});
  }
  async function load() {
    if (loading || ac.signal.aborted) return;
    loading = true; loaded = false;
    input.disabled = submit.disabled = clear.disabled = true;
    submit.innerHTML = '<span class="hbs-spinner" aria-hidden="true"></span>Đang tải';
    status.textContent = 'Đang tải dữ liệu sổ tay…'; results.replaceChildren(); detail.hidden = true;
    try {
      const response = await fetch(options.databaseUrl, {signal:ac.signal});
      if (!response.ok) throw new Error('Database unavailable');
      const db = await response.json();
      if (!db || typeof db !== 'object' || Array.isArray(db) || (db.entries != null && !Array.isArray(db.entries))) throw new Error('Invalid handbook data');
      const ids = new Set(), entries = list(db.entries);
      for (const entry of entries) {
        if (!entry || typeof entry.id !== 'string' || !entry.id.trim() || typeof entry.title !== 'string' || !entry.title.trim() || ids.has(entry.id)) throw new Error('Invalid handbook entry');
        ids.add(entry.id);
      }
      if (ac.signal.aborted) return;
      index = createIndex(entries, entryFields); sources = list(db.sources); loaded = true; render();
    } catch {
      if (ac.signal.aborted) return;
      status.textContent = 'Chưa tải được dữ liệu sổ tay.';
      results.innerHTML = '<div class="hbs-empty hbs-error"><strong>Không thể tải dữ liệu</strong><p>Kiểm tra kết nối và thử lại.</p><button type="button" class="hbs-reset" data-hbs-retry>Thử lại</button></div>';
    } finally {
      loading = false;
      if (!ac.signal.aborted) { input.disabled = submit.disabled = clear.disabled = !loaded; submit.textContent = 'Tìm kiếm'; }
    }
  }
  root.addEventListener('input', event => { if (event.target === input && !event.isComposing) render(); }, {signal:ac.signal});
  root.addEventListener('compositionend', event => { if (event.target === input) render(); }, {signal:ac.signal});
  root.addEventListener('submit', event => { if (event.target.matches('[data-hbs-form]')) { event.preventDefault(); render(); } }, {signal:ac.signal});
  root.addEventListener('click', event => {
    if (event.target.closest('[data-hbs-clear]')) { input.value = ''; render(); input.focus(); }
    const button = event.target.closest('[data-hbs-id]'); if (button && root.contains(button)) showEntry(button.dataset.hbsId);
    if (event.target.closest('[data-hbs-retry]')) load();
  }, {signal:ac.signal});
  await load();
  return cleanup;
}


// Shared VI/EN localization for the four Handbook modules.
/**
 * Epsilon.Blue Soft - localized Handbook UI (VI/EN).
 * Translates presentation only; does NOT modify grade IDs, search criteria,
 * engineering formulas, JSON master data, user input or calculated values.
 * Integrates with the existing header picker without changing app.js.
 */
const LANGUAGE_STORAGE_KEY = 'epsilon-soft.language.v1';

// Curated translations of the current four handbook interfaces and the
// five supplied material reference records. Unverified future record fields
// stay in their original language until a reviewed translation is provided.
const ENTRIES = [
  // Core handbook search (shared across 3 handbook modules).
  ['Sổ tay Dung sai', 'Tolerance Handbook'],
  ['Tra cứu ký hiệu dung sai, kiểu lắp và thông tin liên quan.', 'Look up tolerance designations, fit types and related information.'],
  ['VD: H7, h6, lắp ghép, dung sai…', 'E.g. H7, h6, fits, tolerances…'],
  ['Sổ tay Ổ đỡ', 'Bearing Handbook'],
  ['Tra cứu mã ổ, loại ổ, kích thước và thông tin liên quan.', 'Look up bearing designations, types, dimensions and related information.'],
  ['VD: 6205, ổ bi, ổ lăn…', 'E.g. 6205, ball bearings, rolling bearings…'],
  ['Sổ tay Bu lông', 'Bolt Handbook'],
  ['Tra cứu ký hiệu, cấp bền, kích thước và thông tin bu lông.', 'Look up bolt designations, property classes, dimensions and related information.'],
  ['VD: M16, cấp bền, bu lông lục giác…', 'E.g. M16, property class, hexagon bolts…'],
  ['Tra cứu', 'Lookup'], ['Tra cứu sổ tay', 'Handbook lookup'],
  ['Tìm kiếm', 'Search'], ['Tìm kiếm thông minh','Advanced search'],
  ['Tìm kiếm nhanh','Quick search'], ['Từ khóa','Keywords'], ['Tìm theo từ khóa','Search by keyword'],
  ['Tìm kiếm theo từ khóa','Keyword search'], ['Xóa tìm kiếm','Clear search'],
  ['Xóa','Clear'], ['Xóa bộ lọc','Clear filters'], ['Tất cả','All'],
  ['Tất cả nhóm','All groups'], ['Tất cả vật liệu','All materials'],
  ['Kết quả tìm kiếm','Search results'], ['Danh mục','Categories'],
  ['Danh mục vật liệu','Material categories'], ['Kết quả','Results'],
  ['Thông tin','Information'], ['Chi tiết','Details'], ['Xem chi tiết','View details'],
  ['Dữ liệu','Data'], ['Chưa có dữ liệu','Data unavailable'],
  ['Không có dữ liệu','No data'], ['Chưa xác minh','Not verified'],
  ['Chưa có kết quả','No results yet'], ['Không có kết quả phù hợp','No matching results'],
  ['Không tìm thấy kết quả phù hợp','No matching results found'],
  ['Đang tải dữ liệu…','Loading data…'], ['Đang tải…','Loading…'],
  ['Đang nạp dữ liệu…','Loading data…'], ['Tải lại','Reload'],
  ['Thử lại','Try again'], ['Lỗi tải dữ liệu','Data loading error'],
  ['Không tìm thấy','Not found'], ['Mở tài liệu','Open document'],
  ['Mở tài liệu gốc ↗','Open original document ↗'],
  ['Nguồn','Source'], ['Nguồn dữ liệu','Data sources'],
  ['Tài liệu tham khảo','References'], ['Tài liệu gốc','Original document'],
  ['Tiêu chuẩn','Standard'], ['Mã','Code'], ['Ký hiệu','Designation'],
  ['Nhóm','Group'], ['Nhóm vật liệu','Material group'],
  ['Phân nhóm vật liệu','Material subgroup'], ['Ứng dụng','Applications'],
  ['Mô tả','Description'], ['Ghi chú','Notes'], ['Thông tin kỹ thuật','Technical information'],
  ['Điều kiện','Conditions'], ['Trạng thái','Condition'], ['Dạng sản phẩm','Product form'],
  ['Sản phẩm','Product'], ['Hệ','System'], ['Chọn','Select'], ['Đã chọn','Selected'],
  ['Thu gọn danh mục','Collapse categories'], ['Mở rộng danh mục','Expand categories'],
  ['Không tìm thấy dữ liệu phù hợp.','No matching data found.'],
  ['Chưa có dữ liệu trong danh mục này.','No records in this category yet.'],
  // Material handbook headings, chips, tabs and search controls.
  ['Sổ tay vật liệu kỹ thuật','Engineering Material Handbook'],
  ['Tra cứu đặc tính, ứng dụng và tiêu chuẩn vật liệu kỹ thuật.','Look up engineering material properties, applications and standards.'],
  ['Vật liệu kỹ thuật','Engineering materials'],
  ['Tra cứu trong:','Search in:'], ['Tìm kiếm thông minh','Advanced search'],
  ['Tư vấn & phân tích','Advisory & Analysis'],
  ['Tư vấn & phân tích vật liệu','Material Advisory & Analysis'],
  ['Chọn hashtag tiêu chí kỹ thuật','Select technical-property tags'],
  ['Chọn nhiều thẻ để kết hợp điều kiện (AND)','Select multiple tags to combine conditions (AND)'],
  ['VD: S355J2, 304, C45, thép không gỉ…','E.g. S355J2, 304, C45, stainless steel…'],
  ['Tìm trong thép kết cấu…','Search structural steels…'],
  ['Xóa nội dung tìm kiếm và các tiêu chí','Clear search text and all criteria'],
  ['Tra cứu vật liệu theo từ khóa','Search materials by keyword'],
  ['Mở công cụ tư vấn và phân tích','Open advisory and analysis tools'],
  ['Chọn mác vật liệu','Select a material grade'],
  ['Thép','Steel'], ['Gang','Cast iron'], ['Kim loại màu','Non-ferrous metals'],
  ['Nhựa','Plastics'], ['Cao su','Rubber'], ['Gốm & kính','Ceramics & glass'],
  ['Composite','Composites'], ['Bôi trơn','Lubricants'],
  ['Kim loại màu và hợp kim','Non-ferrous metals and alloys'],
  ['Nhựa và polymer','Plastics and polymers'],
  ['Cao su và elastomer','Rubber and elastomers'],
  ['Gốm và thủy tinh (kính)','Ceramics and glass'],
  ['Vật liệu composite','Composite materials'],
  ['Vật liệu bôi trơn','Lubricating materials'],
  ['Thép kết cấu','Structural steel'], ['Thép chế tạo máy','Engineering steel'],
  ['Thép cơ khí','Engineering steel'], ['Thép dụng cụ và khuôn','Tool and die steel'],
  ['Thép lò xo','Spring steel'], ['Thép ổ lăn','Bearing steel'],
  ['Thép không gỉ','Stainless steel'], ['Thép chịu nhiệt và áp lực','Heat- and pressure-resistant steel'],
  ['Thép chống mài mòn','Wear-resistant steel'],
  ['Gang xám','Grey cast iron'], ['Gang cầu','Ductile iron'], ['Gang dẻo','Malleable cast iron'], ['Gang hợp kim','Alloyed cast iron'],
  ['Nhôm và hợp kim','Aluminium and alloys'], ['Đồng và hợp kim','Copper and alloys'],
  ['Kẽm và hợp kim','Zinc and alloys'], ['Magiê và hợp kim','Magnesium and alloys'],
  ['Titan và hợp kim','Titanium and alloys'], ['Niken và hợp kim','Nickel and alloys'],
  ['Nhựa nhiệt dẻo','Thermoplastics'], ['Nhựa nhiệt rắn','Thermosets'],
  ['Cao su tự nhiên','Natural rubber'], ['Cao su tổng hợp','Synthetic rubber'],
  ['Gốm kỹ thuật','Engineering ceramics'], ['Thủy tinh (kính)','Glass'],
  ['Composite cốt sợi thủy tinh','Glass-fibre composites'],
  ['Composite cốt sợi carbon','Carbon-fibre composites'], ['Composite khác','Other composites'],
  ['Dầu bôi trơn','Lubricating oil'], ['Mỡ bôi trơn','Grease'],
  ['Chất bôi trơn rắn','Solid lubricant'], ['Chất bôi trơn gia công','Machining lubricant'],
  ['Tổng quan','Overview'], ['Cơ tính','Mechanical properties'],
  ['Thành phần','Composition'], ['Thành phần hóa học','Chemical composition'],
  ['Tính chất vật lý','Physical properties'],
  ['Thông tin vật liệu','Material information'],
  ['Ứng dụng tham khảo','Typical applications'], ['Lưu ý kỹ thuật','Technical notes'],
  ['Tài liệu đã tham chiếu','Cited documents'], ['Phân biệt:','Important distinction:'],
  ['Chưa có vật liệu trong nhánh này.','No materials are available in this category yet.'],
  ['Chưa có dữ liệu cho nhóm này. Danh mục sẽ được bổ sung từng bước.','No data is available for this group yet. The catalogue will be expanded gradually.'],
  ['Kiểm tra từ khóa, hashtag, kích thước và điều kiện thử. Thiếu dữ liệu không được coi là đáp ứng yêu cầu.','Check keywords, tags, dimensions and test conditions. Missing data does not satisfy a required criterion.'],
  ['Không có mác đáp ứng đầy đủ các điều kiện có dữ liệu. Hãy kiểm tra kích thước và các hashtag.','No grade meets all selected data conditions. Check the dimensions and tags.'],
  ['Chọn trong khoảng hỗ trợ để xem giới hạn cơ tính đúng.','Choose a supported size range to display the applicable mechanical limits.'],
  ['Kích thước ngoài phạm vi dữ liệu mẫu. Không suy diễn hoặc tự dùng vùng gần nhất.','Size is outside the sample dataset range. Do not extrapolate or use the nearest range.'],
  ['Dữ liệu hãng tham khảo','Manufacturer reference data'],
  ['Theo tài liệu hãng','Per manufacturer documents'],
  ['Giá trị tham khảo','Reference value'],
  ['Theo vùng kích thước','By size range'],
  ['Tham khảo theo hãng','Manufacturer reference'],
  ['Theo kích thước','By size'],
  ['Giới hạn chảy','Yield strength'], ['Độ bền kéo','Tensile strength'],
  ['Độ giãn dài','Elongation'], ['Thử va đập:','Impact test:'],
  ['Độ dai va đập KV','Impact energy KV'], ['Giới hạn chảy (ReH / ReH)','Yield strength (ReH / ReH)'],
  ['Khối lượng riêng','Density'], ['Mô đun đàn hồi','Young’s modulus'],
  ['Khối lượng riêng ρ','Density ρ'], ['Mô đun đàn hồi E','Young’s modulus E'],
  ['Nguyên tố','Element'], ['% khối lượng','Mass %'],
  ['Thành phần hóa học (% khối lượng)','Chemical composition (mass %)'],
  ['Loại giá trị','Value type'], ['Điển hình','Typical'], ['Giới hạn','Limit'],
  ['Phạm vi','Range'], ['Đọc bảng:','Reading the table:'],
  ['Giới hạn thành phần theo phân tích mẻ nấu (heat analysis)','Heat-analysis composition limits'],
  ['Thành phần điển hình của nhà sản xuất — không phải giới hạn tiêu chuẩn','Typical manufacturer composition — not standard limits'],
  ['Chưa có dữ liệu cho nhóm này.','No data for this group.'],
  ['Chưa đủ dữ liệu','Insufficient data'], ['Chưa có đủ số liệu','Insufficient data'],
  ['Thiếu dữ liệu','Missing data'], ['Không cùng điều kiện kích thước','Different size conditions'],
  ['Khác ký hiệu giới hạn chảy','Different yield-strength definitions'],
  ['Giá trị điển hình, không phải giới hạn','Typical value, not a guaranteed limit'],
  ['Chỉ đối chiếu số liệu','Numerical comparison only'],
  ['Giới hạn tối thiểu bằng nhau','Equal minimum limits'],
  ['Khác/giống phạm vi công bố; xem từng cột','Compare reported ranges in each column'],
  ['Không cùng loại kích thước','Different dimension types'],
  ['Khác loại kích thước; không tính chênh lệch','Different dimension types; difference not computed'],
  ['Kích thước đang chọn khác nhau; không tính chênh lệch','Selected dimensions differ; difference not computed'],
  ['Có kích thước ngoài vùng dữ liệu; không tính chênh lệch','Size outside data range; difference not computed'],
  ['Cùng loại và giá trị kích thước','Same dimension type and value'],
  ['Cả hai chưa có vùng kích thước được khai báo','Neither grade has a specified size range'],
  ['Giá trị tham khảo; xem điều kiện và nguồn','Reference value; check conditions and sources'],
  ['Không quy định kích thước trong bản mẫu','No size range specified in sample'],
  ['Chưa có bảng đối chiếu đã duyệt','No approved comparison table'],
  ['VL tương đương','Equivalent materials'], ['So sánh','Compare'],
  ['So sánh vật liệu','Material comparison'], ['Đóng so sánh','Close comparison'],
  ['Đóng','Close'], ['Đổi VL1','Change M1'], ['Đổi VL2','Change M2'],
  ['Chọn VL1','Select M1'], ['Chọn VL2','Select M2'],
  ['Chưa chọn vật liệu','No material selected'],
  ['Chưa đủ hai vật liệu để so sánh','Select two materials to compare'],
  ['Đối chiếu thông số kỹ thuật','Technical property comparison'],
  ['Chênh lệch / Điều kiện','Difference / Conditions'],
  ['Ghi chú','Notes'], ['Vật liệu gốc','Reference material'],
  ['Chưa xác nhận tương đương','Equivalence not verified'],
  ['Đề xuất đối chiếu vật liệu','Material comparison suggestions'],
  ['Nhận xét kỹ thuật','Technical remarks'],
  ['Đối chiếu vật liệu','Material comparison'],
  ['Kết luận:','Conclusion:'],
  ['Vuốt ngang bảng để xem đầy đủ hai cột vật liệu và ghi chú.','Scroll horizontally to view both material columns and notes.'],
  ['Cùng nhóm vật liệu cấp 1','Same top-level material group'],
  ['Cùng nhiệt độ thử công bố','Same reported test temperature'],
  ['Khác nhiệt độ thử; không so sánh trực tiếp','Different test temperatures; not directly comparable'],
  ['Cùng phạm vi công bố','Same reported range'],
  ['Không thể đối chiếu hai vật liệu khác nhóm.','Materials from different top-level groups cannot be compared.'],
  ['Không xếp hạng và không kết luận tương đương','No ranking or equivalence decision'],
  ['Mác gốc luôn đứng đầu. Các mác bên dưới chỉ là ứng viên cùng phân nhóm từ dữ liệu hiện có; chưa có quan hệ tương đương được phê duyệt.','The reference grade appears first. Other grades are candidates from the same subgroup; no equivalence relationship has been approved.'],
  ['Các chỉ tiêu dưới đây chỉ phản ánh dữ liệu sẵn có. Chênh lệch cơ tính hoặc hóa học không tự tạo quyền thay thế vật liệu.','The properties below reflect available data only. Differences in mechanical or chemical values do not establish interchangeability.'],
  ['So sánh chỉ đối chiếu các thông số đang có trong cơ sở dữ liệu. Không xếp hạng và không kết luận hai vật liệu tương đương hoặc được phép thay thế. Dữ liệu bản mẫu chưa được phê duyệt cho thiết kế.','This table compares database properties only. It does not rank materials or establish equivalence or suitability for substitution. Sample data are not approved for design.'],
  ['HB chỉ đưa ra đề xuất tham khảo.','HB provides reference suggestions only.'],
  ['Quyết định lựa chọn hoặc thay thế vật liệu thuộc về người dùng, sau khi kiểm tra tiêu chuẩn hiện hành, điều kiện làm việc, MTC và yêu cầu dự án.','The user makes the final material selection or substitution decision after checking current standards, operating conditions, MTC and project requirements.'],
  ['HB chỉ cung cấp thông tin, phân tích và đề xuất tham khảo. Quyết định lựa chọn và sử dụng vật liệu cuối cùng thuộc về người dùng.','HB provides information, analysis and reference suggestions only. The user makes the final material selection and application decision.'],
  ['Các quy tắc phân tích chưa được phê duyệt, không tự tạo kết luận kỹ thuật.','Analysis rules have not been approved; no engineering decision is generated automatically.'],
  ['Chưa triển khai thuật toán phân tích','Analysis algorithm not implemented'],
  ['Trợ lý chọn vật liệu','Material selection assistant'],
  ['Kiểm tra MTC','MTC verification'],
  ['Phân tích khả năng hàn','Weldability assessment'],
  ['Đánh giá phương án','Option assessment'],
  ['Công cụ phân tích','Analysis tools'],
  ['Công cụ phân tích sử dụng dữ liệu được kiểm chứng','Analysis tools use verified data'],
  ['Các công cụ phân tích sử dụng cơ sở dữ liệu và quy tắc kỹ thuật có nguồn, tách biệt chức năng tra cứu.','Analysis tools use sourced engineering data and rules, separately from material lookup.'],
  ['Đề xuất ứng viên từ yêu cầu chi tiết, tải trọng, môi trường và công nghệ chế tạo.','Identify possible grades from part requirements, loads, environment and manufacturing processes.'],
  ['Đối chiếu kết quả chứng chỉ với giới hạn tiêu chuẩn đã duyệt, đúng điều kiện áp dụng.','Compare certificate results against approved standard limits and their applicable conditions.'],
  ['Tính và giải thích chỉ tiêu hàn khi có đủ thành phần, nguồn và thông số công nghệ.','Calculate and explain weldability metrics when composition, sources and process parameters are sufficient.'],
  ['Phân tích ưu nhược điểm và những dữ liệu còn thiếu của các phương án vật liệu.','Assess strengths, trade-offs and missing data for material alternatives.'],
  // Safety / technical text; translations retain all qualifications.
  ['Không suy ra giới hạn thành phần từ giá trị điển hình. Những nguyên tố không hiển thị có nghĩa là','Do not derive composition limits from typical values. Elements not displayed are'],
  ['chưa đưa vào bản mẫu','not included in the sample'],
  [', không có nghĩa bằng 0.',', not necessarily zero.'],
  ['Nguồn dữ liệu mẫu không thay thế tiêu chuẩn hiện hành hoặc chứng chỉ vật liệu EN 10204 của lô hàng. Cần xác minh riêng trước khi dùng cho tính toán thiết kế.','Sample data do not replace current standards or the batch EN 10204 material certificate. Verify independently before engineering design.'],
  ['Thông số vật lý điển hình của thép kết cấu, không phải số liệu đo riêng từng lô.','Typical structural-steel physical properties; not batch-specific test results.'],
  ['Thông số theo tài liệu nhà sản xuất, ở khoảng 20°C khi được chỉ rõ.','Values from manufacturer documents, at about 20°C when specified.'],
  ['Vật liệu “có thể so sánh” không mặc nhiên “tương đương” hoặc được phép thay thế trong thiết kế.','Materials described as comparable are not automatically equivalent or permitted substitutes in design.'],
  ['Chưa có bảng quan hệ tương đương được duyệt trong dữ liệu mẫu.','The sample database contains no approved equivalence table.'],
  ['Dữ liệu bản mẫu chưa được phê duyệt cho thiết kế.','Sample data have not been approved for design.'],
  ['Trạng thái dữ liệu: Bản mẫu, chưa duyệt cho tính toán.','Data status: Sample only; not approved for engineering calculations.'],
  ['Bản mẫu, chưa duyệt cho tính toán.','Sample only; not approved for calculations.'],
  ['Tài liệu tham khảo người dùng cung cấp, không đính kèm bản sao.','User-provided reference; a copy is not attached.'],
  // Known 5 reference records (data values are mapped only when rendered).
  ['Thép kết cấu S235JR','Structural steel S235JR'],
  ['Thép kết cấu S355J2','Structural steel S355J2'],
  ['Thép cơ khí C45 (+QT)','Engineering steel C45 (+QT)'],
  ['Thép không gỉ 304','Stainless steel 304'],
  ['Thép không gỉ 316L','Stainless steel 316L'],
  ['Thép kết cấu carbon–mangan thông dụng cho chế tạo và kết cấu hàn.','Common carbon–manganese structural steel for fabrication and welded structures.'],
  ['Thép kết cấu cường độ cao, cấp J2 yêu cầu kiểm tra va đập ở −20°C.','Higher-strength structural steel, J2 grade requiring impact testing at −20°C.'],
  ['Thép carbon trung bình, dùng cho trục và chi tiết máy chịu tải vừa.','Medium-carbon steel for shafts and moderately loaded machine components.'],
  ['Thép không gỉ Austenitic Cr–Ni, phổ biến trong thiết bị và chế tạo.','Austenitic Cr–Ni stainless steel widely used for equipment and fabrication.'],
  ['Thép không gỉ Austenitic Cr–Ni–Mo hàm lượng carbon thấp, chống ăn mòn tốt hơn trong nhiều môi trường.','Low-carbon austenitic Cr–Ni–Mo stainless steel with improved corrosion resistance in many environments.'],
  ['Tấm / sản phẩm cán nóng','Plate / hot-rolled products'],
  ['Thanh tròn','Round bar'],
  ['Tấm / cuộn cán nóng hoặc nguội','Hot- or cold-rolled sheet / coil'],
  ['As-rolled (cán nóng)','As-rolled (hot-rolled)'],
  ['Tôi và ram (+QT)','Quenched and tempered (+QT)'],
  ['Theo datasheet sản phẩm Outokumpu','According to Outokumpu product datasheet'],
  ['Kết cấu thép','Steel structures'], ['Khung máy','Machine frames'],
  ['Chi tiết kết cấu hàn','Welded structural components'], ['Kết cấu chịu lực','Load-bearing structures'],
  ['Dầm và khung thép','Steel beams and frames'], ['Kết cấu máy hàn','Welded machinery structures'],
  ['Trục','Shafts'], ['Bánh răng','Gears'], ['Chi tiết gia công cơ khí','Machined components'],
  ['Bồn, vỏ thiết bị','Tanks and equipment shells'],
  ['Thiết bị thực phẩm','Food-processing equipment'], ['Chi tiết inox phổ thông','General stainless-steel components'],
  ['Thiết bị hóa chất','Chemical equipment'], ['Đường ống, bồn','Piping and tanks'],
  ['Thiết bị chế biến','Process equipment'],
  ['Chiều dày tấm','Plate thickness'], ['Đường kính d','Diameter d'],
  ['Bảng hãng viện dẫn EN 10025-2:2004; xác minh phiên bản hiện hành trước tính toán','Manufacturer table cites EN 10025-2:2004; verify the current edition before calculation'],
  ['Hãng ghi EN 10083-2; đối chiếu EN ISO 683-1 và chứng chỉ lô thực tế khi ứng dụng','Supplier cites EN 10083-2; check EN ISO 683-1 and the actual batch certificate for application'],
  ['Giá trị theo datasheet sản phẩm Outokumpu, không thay thế bảng giới hạn của tiêu chuẩn và MTC','Outokumpu datasheet values do not replace standard limits or the MTC'],
  ['Cơ tính trong bản mẫu chỉ áp dụng đúng dạng sản phẩm, chiều dày và trạng thái nêu trong nguồn.','Sample mechanical properties apply only to the product form, thickness and condition specified by the source.'],
  ['Không sử dụng tên thép tương tự để tự thay thế mác khi chưa so đầy đủ đặc tính, tiêu chuẩn và điều kiện giao hàng.','Do not substitute grades based only on similar names without checking all properties, standards and delivery conditions.'],
  ['Chọn đúng chiều dày: ReH tối thiểu giảm khi chiều dày tăng.','Use the correct thickness: minimum ReH decreases as thickness increases.'],
  ['S355J2 và S355J2+N có điều kiện giao hàng khác nhau; không gộp thành một bản ghi.','S355J2 and S355J2+N have different delivery conditions; keep separate records.'],
  ['C45 ở trạng thái +QT có cơ tính khác với +N, +A hoặc cán nóng.','C45 in +QT condition has different properties from +N, +A or as-rolled material.'],
  ['Dữ liệu giới hạn theo đường kính mẫu thử/tiết diện. Chưa có dữ liệu cho d > 100 mm trong bản mẫu.','Data are limited by test-sample diameter / section size. The sample has no data for d > 100 mm.'],
  ['Thành phần hóa học hiển thị là giá trị điển hình của hãng, không phải giới hạn min/max của tiêu chuẩn.','Displayed chemistry values are typical manufacturer values, not standard minimum/maximum limits.'],
  ['Trong ứng dụng thiết kế phải đối chiếu grade, tiêu chuẩn, dạng sản phẩm, trạng thái và MTC thực tế.','For design applications, verify the grade, standard, product form, condition and actual MTC.'],
  ['Giá trị JR; kiểm tra điều kiện thử, đặt hàng và MTC trước khi nghiệm thu.','JR value; verify test conditions, purchase order and MTC before acceptance.'],
  ['KV tối thiểu tại −20°C; đối chiếu MTC và phương thử theo sản phẩm thực tế.','Minimum KV at −20°C; verify the MTC and test method for the actual product.'],
  ['Giá trị theo bảng công bố của hãng; các phiên bản tiêu chuẩn được dẫn trong trang nguồn cần được xác minh khi áp dụng thực tế.','Values from the manufacturer catalogue; verify cited standard editions before actual use.'],
  ['Cơ tính dùng trạng thái tôi + ram (+QT), theo đường kính mẫu/tiết diện nêu trong nguồn.','Mechanical properties are for quenched and tempered (+QT) condition at specified sample diameters / sections.'],
  ['Định danh và ứng dụng; hóa học điển hình, không phải giới hạn thành phần tiêu chuẩn.','Material identification and applications; typical chemistry, not standard composition limits.'],
  ['Rp0,2 và A là thông số công bố theo điều kiện/sản phẩm của hãng; dữ liệu vật lý ở 20°C.','Rp0.2 and A are manufacturer-reported values for specified products/conditions; physical data at 20°C.'],
  ['Định danh và thành phần hóa học điển hình của sản phẩm 316L/4404.','Identification and typical chemical composition of the 316L/4404 product.'],
  ['Khối lượng riêng 7850 kg/m³ và E=210000 MPa là tham số điển hình cho thép kết cấu, không phải chứng chỉ từng mác.','Density 7850 kg/m³ and E=210000 MPa are typical structural-steel values, not grade-specific certificates.'],
  ['Tài liệu do người dùng cung cấp. Chỉ tham khảo nguyên tắc so sánh: comparable khác equivalent; không sao chép bảng dữ liệu thương mại.','User-provided reference. Used only for the distinction between comparable and equivalent; proprietary tables are not reproduced.'],
];

// Appendix: display labels and combined notices that appear after re-render.
ENTRIES.push(
  ['Hệ:', 'System:'], ['Tiêu chuẩn:', 'Standard:'], ['Sản phẩm:', 'Product form:'], ['Trạng thái:', 'Condition:'],
  ['Độ bền kéo Rm', 'Tensile strength Rm'], ['Độ giãn dài A','Elongation A'],
  ['Va đập KV','Impact energy KV'], ['Mô đun E','Young’s modulus E'],
  ['Chiều dày','Thickness'], ['Đường kính','Diameter'], ['Nhiệt độ KV','KV test temperature'],
  ['Dạng sản phẩm','Product form'], ['Trạng thái','Condition'], ['Kích thước','Dimensions'],
  ['Trạng thái vật liệu','Material condition'], ['Kích thước dùng đối chiếu','Comparison dimension'],
  ['Tiêu chí','Criterion'], ['Gốc','Reference'], ['Tương đương','Equivalent'],
  ['Theo vùng kích thước','By size range'], ['theo vùng kích thước','by size range'],
  ['theo kích thước','by size'], ['theo nguồn','per source'],
  ['tham khảo chung','generic reference'],
  ['theo điều kiện công bố','under reported conditions'],
  ['Đối chiếu theo điều kiện công bố','Compare under reported conditions'],
  ['Khác khoảng giới hạn — cần đối chiếu','Different reported ranges — compare conditions'],
  ['Khác nhiệt độ thử; không đối chiếu trực tiếp','Different test temperatures; not directly comparable'],
  ['Cơ tính cần đối chiếu đúng dạng sản phẩm, chiều dày/đường kính, phương thử và điều kiện giao hàng.','Mechanical values must be checked for the exact product form, thickness/diameter, test method and delivery condition.'],
  ['“≥” là giới hạn tối thiểu, “x–y” là khoảng; trị số không ký hiệu giới hạn thuộc nhóm tham khảo của hãng.','“≥” is a minimum limit; “x–y” denotes a range. Values without limit symbols are manufacturer references.'],
  ['Chưa có bảng quan hệ tương đương được duyệt trong dữ liệu mẫu.','No approved equivalence table exists in the sample data.'],
  ['Giới hạn thành phần theo phân tích mẻ nấu (heat analysis) · đơn vị: % khối lượng.','Heat-analysis composition limits · Unit: mass %.'],
  ['Thành phần điển hình của nhà sản xuất — không phải giới hạn tiêu chuẩn · đơn vị: % khối lượng.','Typical manufacturer composition, not standard limits · Unit: mass %.'],
  ['HB chỉ cung cấp thông tin, phân tích và đề xuất tham khảo. Quyết định lựa chọn và sử dụng vật liệu cuối cùng thuộc về người dùng. Các quy tắc phân tích chưa được phê duyệt, không tự tạo kết luận kỹ thuật.','HB provides information, analysis and reference suggestions only. The user makes the final material selection and application decision. Analysis rules are not approved; no engineering conclusion is generated automatically.'],
  ['EN 10083-2 (dữ liệu nhà cung cấp)','EN 10083-2 (supplier data)'],
  ['Điều kiện giao hàng','Delivery condition'],
  ['Loại giá trị','Value type'], ['Kết quả so sánh','Comparison results'],

);
const translationMap = new Map(ENTRIES);

// Bounded, context-specific patterns for labels containing grade codes,
// dimensions and numeric results. This is UI localization, not reasoning.
const PATTERNS = [
  [/^Mã bản ghi: (.+?) · Trạng thái dữ liệu: Bản mẫu, chưa duyệt cho tính toán\.$/u,(_,id)=>`Record ID: ${id} · Data status: Sample only; not approved for calculations.`],
  [/^Mã bản ghi: (.+)$/u,(_,id)=>`Record ID: ${id}`],
  [/^(.+?) mm \(Chiều dày tấm\)$/u,(_,v)=>`${v} mm (Plate thickness)`],
  [/^(.+?) mm \(Đường kính d\)$/u,(_,v)=>`${v} mm (Diameter d)`],
  [/^(.+?) \((mm|cm|m)\)$/u,(_,name,unit)=>{const translated=translateText(name,'en');return translated===name?null:`${translated} (${unit})`;}],
  [/^(.+?): (\d+) vật liệu\.$/u,(_,group,n)=>`${translateText(group,'en')}: ${n} materials.`],
  [/^#(.+)$/u,(_,tag)=>{const translated=translateText(tag,'en');return translated===tag?null:'#'+translated;}],
  [/^(\d{2})\. (.+)$/u,(_,number,title)=>`${number}. ${translateText(title,'en')}`],
  [/^(.+?) · (.+)$/u,(_,a,b)=>{const parts=[a,b];const next=parts.map(v=>translateText(v,'en'));return next.some((v,i)=>v!==parts[i])?next.join(' · '):null;}],
  [/^Đối chiếu (.+?) ↔ (.+)$/u,(_,a,b)=>`Compare ${a} ↔ ${b}`],
  [/^(.+?) · Gốc$/u,(_,grade)=>`${grade} · Reference`],
  [/^(.+?) · VL([12])$/u,(_,grade,slot)=>`${grade} · M${slot}`],
  [/^≥ (.+?) J tại ([-+]?\d+(?:[,.]\d+)?)\s?°C\.?$/u,(_,v,t)=>`≥ ${v} J at ${t}°C`],
  [/^KV ≥ (.+?) J tại ([-+]?\d+(?:[,.]\d+)?)\s?°C\.?(.*)$/u,(_,v,t,note)=>`KV ≥ ${v} J at ${t}°C.${note ? ' '+translateText(note.trim(),'en'):''}`],
  [/^([\w\s]+?) \((mm|cm|m)\)$/u,(_,name,unit)=>{const translated=translateText(name,'en');return translated===name?null:`${translated} (${unit})`;}],
  [/^Chọn (.+?) \((mm|cm|m)\)$/u,(_,name,unit)=>`Select ${translateText(name.charAt(0).toUpperCase()+name.slice(1),'en').toLowerCase()} (${unit})`],
  [/^Thành phần hóa học \(% khối lượng\)$/u,()=> 'Chemical composition (mass %)'],
  [/^(.+?) \((dữ liệu nhà cung cấp)\)$/u,(_,prefix)=>`${prefix} (supplier data)`],
  [/^Chưa có bảng quan hệ tương đương được duyệt trong dữ liệu mẫu\. Không xác nhận (.+?) tương đương hoặc có thể thay thế (.+?)\. Cần so điều kiện giao hàng, đầy đủ tiêu chuẩn, đặc tính đặc thù và MTC thực tế\.$/u,(_,a,b)=>`The sample database contains no approved equivalence table. It does not establish that ${a} is equivalent to or may replace ${b}. Verify delivery conditions, complete standards, special properties and actual MTC.`],
  [/^Vật liệu “có thể so sánh” không mặc nhiên “tương đương” hoặc được phép thay thế trong thiết kế\. (.+)$/u,(_,note)=>`Comparable materials are not automatically equivalent or acceptable substitutes in design. ${translateText(note,'en')}`],
  [/^“≥” là giới hạn tối thiểu, “x–y” là khoảng; trị số không ký hiệu giới hạn thuộc nhóm tham khảo của hãng\. (.+)$/u,(_,note)=>`“≥” is a minimum limit and “x–y” is a range; unqualified values are manufacturer references. ${translateText(note,'en')}`],
  [/^Số lượng: (\d+)$/, (_,n)=>`Count: ${n}`],
  [/^Tra cứu trong: (.+)$/u, (_,name)=>`Search in: ${translateText(name,'en')}`],
  [/^Nhóm (.+)$/u, (_,name)=>`Group ${translateText(name,'en')}`],
  [/^Đang chọn (VL[12]): tìm kiếm hoặc chọn mác ở danh mục bên trái \((.+)\)\.$/u, (_,slot,group)=>`Selecting ${slot}: search or select a grade from the sidebar (${translateText(group,'en')}).`],
  [/^Đã chọn hai vật liệu\. Nhấn “Đổi VL1” hoặc “Đổi VL2” khi cần chọn lại\.$/u, ()=> 'Two materials selected. Use “Change M1” or “Change M2” to select again.'],
  [/^Chọn vật liệu còn trống từ danh mục bên trái\.$/u, ()=> 'Select the remaining material from the sidebar.'],
  [/^Chọn hai mác trong cùng nhóm (.+)\.$/u, (_,group)=>`Select two grades from the ${translateText(group,'en')} group.`],
  [/^Chọn mác tại danh mục bên trái hoặc tìm kiếm phía trên\.$/u,()=> 'Select a grade from the sidebar or use search above.'],
  [/^Nhấn Chọn (VL[12]) để chọn mác tại danh mục\.$/u,(_,s)=>`Press Select ${s} to choose a grade in the catalogue.`],
  [/^Chọn (.+) \((mm|cm|m)\)$/u,(_,name,unit)=>`Select ${translateText(name,'en').toLowerCase()} (${unit})`],
  [/^Chiều dày tấm: (.+)$/u,(_,v)=>`Plate thickness: ${v}`],
  [/^Đường kính d: (.+)$/u,(_,v)=>`Diameter d: ${v}`],
  [/^Mã bản ghi: (.+?) · Trạng thái dữ liệu: Bản mẫu, chưa duyệt cho tính toán\.$/u,(_,id)=>`Record ID: ${id} · Data status: Sample; not approved for engineering calculation.`],
  [/^Đang chọn (VL[12])$/u,(_,slot)=>`Selecting ${slot}`],
  [/^Chỉ so sánh trong nhóm (.+)$/u,(_,group)=>`Comparison limited to ${translateText(group,'en')}`],
  [/^Chỉ được chọn hai vật liệu thuộc cùng một nhóm\.$/u,()=> 'The two materials must belong to the same top-level group.'],
  [/^VL1 và VL2 phải là hai bản ghi khác nhau\. Hãy chọn mác khác\.$/u,()=> 'M1 and M2 must be different records. Select another grade.'],
  [/^Cùng phân nhóm, chưa xác nhận tương đương$/u,()=> 'Same subgroup; equivalence not verified'],
  [/^Cùng tiêu chuẩn, có thể khác cấp mác$/u,()=> 'Same standard; grades may differ'],
  [/^Khác tiêu chuẩn, cần đối chiếu$/u,()=> 'Different standards; comparison required'],
  [/^Cùng dạng sản phẩm$/u,()=> 'Same product form'],
  [/^Khác dạng sản phẩm, cần xác minh$/u,()=> 'Different product forms; verify applicability'],
  [/^Trùng mô tả trạng thái$/u,()=> 'Same reported delivery condition'],
  [/^Khác trạng thái, không suy diễn cơ tính$/u,()=> 'Different conditions; do not infer mechanical properties'],
  [/^Không xác minh theo kích thước$/u,()=> 'Not size-verified'],
  [/^Phải nằm trong cả hai vùng áp dụng$/u,()=> 'Must be inside both applicable size ranges'],
  [/^Khác loại số liệu, không so sánh trực tiếp$/u,()=> 'Different data types; not directly comparable'],
  [/^Đối chiếu giới hạn theo điều kiện$/u,()=> 'Compare limits under applicable conditions'],
  [/^Giá trị vật lý tham khảo; không chứng minh tương đương$/u,()=> 'Reference physical properties do not establish equivalence'],
  [/^Cùng ngưỡng, chưa xác nhận tương đương$/u,()=> 'Same threshold; equivalence unverified'],
  [/^Ngưỡng tối thiểu cao hơn; cần kiểm tra điều kiện thử$/u,()=> 'Higher minimum threshold; verify test conditions'],
  [/^Ngưỡng tối thiểu thấp hơn$/u,()=> 'Lower minimum threshold'],
  [/^Mức tối thiểu (cao hơn|thấp hơn) (.+)$/u,(_,dir,delta)=>`Minimum is ${dir==='cao hơn'?'higher':'lower'} by ${delta}`],
  [/^VL2 (cao hơn|thấp hơn) (.+?) \(giới hạn tối thiểu\)$/u,(_,dir,v)=>`M2 minimum is ${dir==='cao hơn'?'higher':'lower'} by ${v}`],
  [/^(.+) vật liệu\.$/u,()=>null], // Unknown dynamic content is deliberately left unchanged.
];

function readHostLanguage() {
  try {
    const activeEnglish=document.querySelector('[data-es-lang="en"][aria-pressed="true"]');
    const activeVietnamese=document.querySelector('[data-es-lang="vi"][aria-pressed="true"]');
    if (activeEnglish) return 'en';
    if (activeVietnamese) return 'vi';
    const stored=localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if(stored==='en'||stored==='vi')return stored;
  } catch { /* Browser storage may be disabled. */ }
  return document.documentElement.lang==='en'?'en':'vi';
}

function translateText(original,lang='en') {
  if (lang!=='en' || typeof original!=='string' || !original.trim()) return original;
  const match=/^(\s*)([\s\S]*?)(\s*)$/.exec(original);
  const pre=match?.[1]||'',body=match?.[2]||original,post=match?.[3]||'';
  let result=translationMap.get(body);
  if (result===undefined) {
    for (const [pattern,replace] of PATTERNS) {
      const parsed=body.match(pattern);
      if(parsed) {const changed=replace(...parsed);if(typeof changed==='string'){result=changed;break;}}
    }
  }
  return result===undefined ? original : pre+result+post;
}

/**
 * Localizes text inside one tool root only. Reversible and mutation-safe:
 * user inputs and computed numeric values are never modified. The host app's
 * VI/EN switch is observed (including a switch while the tool stays open).
 */
export function installHandbookI18n(root) {
  if(!root || typeof root.querySelectorAll!=='function') return () => {};
  let ended=false;
  let currentLanguage=readHostLanguage();
  const originalText=new WeakMap(),renderedText=new WeakMap();
  const originalAttrs=new WeakMap(),renderedAttrs=new WeakMap();
  const ATTRS=['aria-label','title','placeholder'];
  let scheduled=false;

  function localize() {
    if(ended)return;
    currentLanguage=readHostLanguage();
    // Disconnect during our own DOM updates: avoids feedback loops.
    contentObserver.disconnect();
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())) {
      const parent=node.parentElement;
      if(!parent || parent.closest('style,script,svg,code,pre,[contenteditable="true"],[data-hb-i18n-skip]'))continue;
      const value=node.nodeValue;
      if(!originalText.has(node) || renderedText.get(node)!==value) originalText.set(node,value);
      const target=translateText(originalText.get(node),currentLanguage);
      if(value!==target)node.nodeValue=target;
      renderedText.set(node,target);
    }
    const elements=[root,...root.querySelectorAll('[aria-label],[title],[placeholder]')];
    for(const el of elements) {
      if(!el?.hasAttribute || el.closest?.('[data-hb-i18n-skip]'))continue;
      let saved=originalAttrs.get(el),previous=renderedAttrs.get(el);
      if(!saved){saved={};originalAttrs.set(el,saved);}
      if(!previous){previous={};renderedAttrs.set(el,previous);}
      for(const attr of ATTRS)if(el.hasAttribute(attr)){
        const value=el.getAttribute(attr);
        if(!(attr in saved) || previous[attr]!==value)saved[attr]=value;
        const target=translateText(saved[attr],currentLanguage);
        if(target!==value)el.setAttribute(attr,target);
        previous[attr]=target;
      }
    }
    contentObserver.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  }
  function schedule() {
    if(ended||scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{scheduled=false;if(!ended)localize();});
  }
  const contentObserver=new MutationObserver(schedule);
  const htmlObserver=new MutationObserver(schedule);
  // Capturing ensures this reacts to the host's delegated picker at document
  // bubble phase without changing app.js or re-mounting the active tool.
  function onLanguageClick(event){
    if(event.target.closest?.('[data-es-lang]'))schedule();
  }
  function onStorage(event){if(event.key===LANGUAGE_STORAGE_KEY)schedule();}
  function onLanguageChange(){schedule();}
  document.addEventListener('click',onLanguageClick,true);
  window.addEventListener('storage',onStorage);
  document.addEventListener('epsilon-soft:languagechange',onLanguageChange);
  htmlObserver.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  schedule();
  return function dispose(){
    ended=true;
    contentObserver.disconnect();htmlObserver.disconnect();
    document.removeEventListener('click',onLanguageClick,true);
    window.removeEventListener('storage',onStorage);
    document.removeEventListener('epsilon-soft:languagechange',onLanguageChange);
  };
}
