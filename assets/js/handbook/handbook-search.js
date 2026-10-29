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
