/** Epsilon.Blue Soft original icon set. Fixed local IDs only; no user SVG or HTML input. */
const SPRITE_URL = new URL('../images/icon/epsilon-icons.svg?v=20261030-01', import.meta.url).href;
const IDS = new Set(["home","grid","office","technical","mechanical","handbook","calculator","area","box","mass","container","density","swap","percent","nesting","section-cut","beam","paint","palette","pdf","calendar","qr","barcode","image","money-words","notes","material-handbook","bearing","bolt","tolerance","steel","cast-iron","nonferrous","polymer","elastomer","ceramic-glass","composite","lubricant","materials-all","book","star","download","upload","search","arrow","check","info","menu","list","close","refresh","copy","trash","ruler","weight","chart","clock","shield","lightbulb","heart","pen","file","files","rotate","user","settings","scissors","stamp","lock","chevron-down","gear","panel-left-open","panel-left-close","orbit","external-link","mail","phone","message-circle","app-plus","contact-card","monitor","smartphone","tablet","windows","plus","print","save","folder","compare","equivalence","length","volume","temperature","speed","pressure","database"]);
const ALIASES = Object.freeze({"reset":"refresh"});
export function icon(key, size = 22) {
 const id = ALIASES[key] || key;
 const safeId = IDS.has(id) ? id : 'grid';
 const numeric = Number(size);
 const px = Number.isFinite(numeric) ? Math.min(48, Math.max(12, numeric)) : 22;
 return `<svg class="svg-icon es-custom-icon" data-es-icon="${safeId}" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><use href="${SPRITE_URL}#${safeId}"></use></svg>`;
}
