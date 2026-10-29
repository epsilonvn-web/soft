/**
 * Epsilon Blue Soft | Container: chọn đúng loại container và hỗ trợ xếp hàng.
 * Gồm: ước tính xếp hàng & tải sàn, thông số vỏ Evergreen, payload tham khảo theo hãng tàu,
 * kiểm tra tải nhanh, kiểm tra số container ISO 6346.
 * Số liệu tra cứu thủ công từ trang chính thức của hãng (ngày ghi ở checkedAt). Không phải giới hạn booking, không thay VGM.
 * No external JS library, backend or user-data collection. Danh sách hàng chỉ lưu trong trình duyệt của người dùng.
 */

/* Số liệu: sửa trực tiếp tại đây khi cần cập nhật. Đơn vị mm và kg. */
const DATA = {
  "checkedAt": "2026-10-28",
  "sources": {
    "evergreen": "https://www.evergreen-shipping.com.ph/container-specifications",
    "maersk": "https://www.maersk.com/support/faqs/cargo-weight-limit",
    "cmacgm": "https://www.cma-cgm.com/products-services/containers",
    "hapag20": "https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/20-standard.html",
    "hapag40": "https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/40-standard.html",
    "hapag40hc": "https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/40-standard-high-cube.html",
    "one": "https://vn-meo.one-line.com/dry-containers",
    "oocl20": "https://www.oocl.com/eng/ourservices/containers/containerspecifications/Pages/generalpurpose.aspx",
    "oocl40hc": "https://www.oocl.com/eng/ourservices/containers/containerspecifications/pages/highcube.aspx",
    "yangming20": "https://e-solution.yangming.com/service/service_network/container_equipment_detail_20DC.aspx",
    "yangming40hc": "https://e-solution.yangming.com/service/service_network/container_equipment_detail_40HQ.aspx",
    "hmm": "https://www.hmm21.com/e-service/information/containerInformation.do",
    "pil": "https://www.pilship.com/shipping-solutions/cargo-solutions/",
    "imo": "https://www.imo.org/en/ourwork/safety/pages/verification-of-the-gross-mass.aspx",
    "vnlaw": "https://vanban.chinhphu.vn/?docid=218379&pageid=27160"
  },
  "evergreen": [
    {
      "id": "20gp-h",
      "code": "20GP",
      "name": "20' Dry",
      "group": "dry",
      "variant": "30.480 kg (heavy)",
      "outer": [
        6058,
        2438,
        2591
      ],
      "inner": [
        5898,
        2352,
        2385
      ],
      "door": [
        2343,
        2280
      ],
      "gross": 30480,
      "tare": 2400,
      "published": true,
      "note": "",
      "source": "evergreen"
    },
    {
      "id": "20gp-l",
      "code": "20GP",
      "name": "20' Dry",
      "group": "dry",
      "variant": "24.000 kg (legacy)",
      "outer": [
        6058,
        2438,
        2591
      ],
      "inner": [
        5898,
        2352,
        2385
      ],
      "door": [
        2343,
        2280
      ],
      "gross": 24000,
      "tare": 2330,
      "published": true,
      "note": "Có cả biến thể 24 tấn; không mặc định mọi vỏ 20GP đều đạt 30,48 tấn.",
      "source": "evergreen"
    },
    {
      "id": "40gp",
      "code": "40GP",
      "name": "40' Dry",
      "group": "dry",
      "variant": "Tiêu chuẩn",
      "outer": [
        12192,
        2438,
        2591
      ],
      "inner": [
        12032,
        2352,
        2385
      ],
      "door": [
        2343,
        2280
      ],
      "gross": 30480,
      "tare": 4000,
      "published": true,
      "note": "",
      "source": "evergreen"
    },
    {
      "id": "40hc",
      "code": "40HC",
      "name": "40' High Cube",
      "group": "dry",
      "variant": "Tiêu chuẩn",
      "outer": [
        12192,
        2438,
        2896
      ],
      "inner": [
        12032,
        2352,
        2690
      ],
      "door": [
        2343,
        2585
      ],
      "gross": 30480,
      "tare": 4200,
      "published": true,
      "note": "",
      "source": "evergreen"
    },
    {
      "id": "45hc-a",
      "code": "45HC",
      "name": "45' High Cube",
      "group": "dry",
      "variant": "30.480 kg",
      "outer": [
        13716,
        2438,
        2896
      ],
      "inner": [
        13556,
        2352,
        2698
      ],
      "door": [
        2340,
        2585
      ],
      "gross": 30480,
      "tare": 4870,
      "published": true,
      "note": "",
      "source": "evergreen",
      "review": "Tare bản 32.500 kg đang nhẹ hơn bản 30.480 kg. Cần đối chiếu bảng gốc."
    },
    {
      "id": "45hc-b",
      "code": "45HC",
      "name": "45' High Cube",
      "group": "dry",
      "variant": "32.500 kg",
      "outer": [
        13716,
        2438,
        2896
      ],
      "inner": [
        13556,
        2352,
        2698
      ],
      "door": [
        2340,
        2585
      ],
      "gross": 32500,
      "tare": 4700,
      "published": true,
      "note": "",
      "source": "evergreen",
      "review": "Tare bản 32.500 kg đang nhẹ hơn bản 30.480 kg. Cần đối chiếu bảng gốc."
    },
    {
      "id": "20rf-s",
      "code": "20RF",
      "name": "20' Reefer",
      "group": "reefer",
      "variant": "MGSS",
      "outer": [
        6058,
        2438,
        2591
      ],
      "inner": [
        5500,
        2298,
        2276
      ],
      "door": null,
      "gross": 30480,
      "tare": 3040,
      "published": false,
      "note": "Nguồn Evergreen không công bố kích thước mở cửa của mẫu này trong bảng tóm tắt.",
      "source": "evergreen"
    },
    {
      "id": "20rf-a",
      "code": "20RF",
      "name": "20' Reefer",
      "group": "reefer",
      "variant": "Nhôm",
      "outer": [
        6058,
        2438,
        2591
      ],
      "inner": [
        5543,
        2286,
        2235
      ],
      "door": null,
      "gross": 24000,
      "tare": 2870,
      "published": false,
      "note": "",
      "source": "evergreen"
    },
    {
      "id": "40rh-s",
      "code": "40RH",
      "name": "40' Reefer High Cube",
      "group": "reefer",
      "variant": "MGSS",
      "outer": [
        12192,
        2438,
        2896
      ],
      "inner": [
        11579,
        2298,
        2544
      ],
      "door": null,
      "gross": 34000,
      "tare": 4150,
      "published": false,
      "note": "",
      "source": "evergreen"
    },
    {
      "id": "40rh-a",
      "code": "40RH",
      "name": "40' Reefer High Cube",
      "group": "reefer",
      "variant": "Nhôm",
      "outer": [
        12192,
        2438,
        2896
      ],
      "inner": [
        11618,
        2286,
        2507
      ],
      "door": null,
      "gross": 30480,
      "tare": 4300,
      "published": false,
      "note": "",
      "source": "evergreen"
    },
    {
      "id": "20ot-h",
      "code": "20OT",
      "name": "20' Open Top",
      "group": "special",
      "variant": "30.480 kg",
      "outer": [
        6058,
        2438,
        2591
      ],
      "inner": [
        5898,
        2351,
        2348
      ],
      "door": null,
      "gross": 30480,
      "tare": 2330,
      "published": true,
      "note": "Kích thước mở nóc không được nêu trên bảng Evergreen này.",
      "source": "evergreen",
      "review": "Tare bản 30.480 kg đang nhẹ hơn bản 24.000 kg, có thể bị đảo. Cần đối chiếu bảng gốc."
    },
    {
      "id": "20ot-l",
      "code": "20OT",
      "name": "20' Open Top",
      "group": "special",
      "variant": "24.000 kg",
      "outer": [
        6058,
        2438,
        2591
      ],
      "inner": [
        5898,
        2351,
        2348
      ],
      "door": null,
      "gross": 24000,
      "tare": 2410,
      "published": true,
      "note": "",
      "source": "evergreen",
      "review": "Tare bản 30.480 kg đang nhẹ hơn bản 24.000 kg, có thể bị đảo. Cần đối chiếu bảng gốc."
    },
    {
      "id": "20fr-f",
      "code": "20FR",
      "name": "20' Flat Rack",
      "group": "special",
      "variant": "4 trụ cố định",
      "outer": [
        6058,
        2438,
        2591
      ],
      "inner": [
        5650,
        2030,
        2073
      ],
      "door": null,
      "gross": 30000,
      "tare": 2790,
      "published": true,
      "note": "Kích thước bên trong là khoảng cách sử dụng tham khảo, không phải cửa container kín.",
      "source": "evergreen"
    },
    {
      "id": "20fr-c",
      "code": "20FR",
      "name": "20' Flat Rack",
      "group": "special",
      "variant": "Đầu gập",
      "outer": [
        6058,
        2438,
        2591
      ],
      "inner": [
        5638,
        2228,
        2233
      ],
      "door": null,
      "gross": 34000,
      "tare": 2890,
      "published": true,
      "note": "Hàng quá khổ cần kiểm tra phương án nâng hạ và chằng buộc riêng.",
      "source": "evergreen"
    }
  ],
  "carriers": [
    {
      "id": "evergreen",
      "name": "Evergreen",
      "payload": {
        "20GP": 28080,
        "40GP": 26480,
        "40HC": 26280
      },
      "alternative": {
        "20GP": "21.670 kg (vỏ 24 tấn)"
      },
      "note": "Mốc so sánh: vỏ 20GP 30.480 kg; một số vỏ 20GP chỉ có net 21.670 kg.",
      "source": "evergreen",
      "sources": {}
    },
    {
      "id": "maersk",
      "name": "Maersk",
      "payload": {
        "20GP": 28300,
        "40GP": 28870,
        "40HC": 28690
      },
      "alternative": {},
      "note": "Hãng công bố tải hàng tối đa theo loại; mức chấp nhận thực tế thay đổi theo quốc gia/tuyến.",
      "source": "maersk",
      "sources": {}
    },
    {
      "id": "cmacgm",
      "name": "CMA CGM",
      "payload": {
        "20GP": 28250,
        "40GP": 26760,
        "40HC": 26760
      },
      "alternative": {
        "40GP": "28.780 kg (vỏ 32.500 kg)",
        "40HC": "28.780 kg (vỏ 32.500 kg)"
      },
      "note": "Bảng hãng ghi 26.760/28.780 kg cho 40GP và 40HC; hàng 40HC có sai khác với phép trừ gross − tare trung bình, cần xác minh vỏ cụ thể.",
      "source": "cmacgm",
      "sources": {}
    },
    {
      "id": "hapag",
      "name": "Hapag-Lloyd",
      "payload": {
        "20GP": 28130,
        "40GP": 28750,
        "40HC": 28600
      },
      "alternative": {},
      "note": "Mẫu container hãng nêu chỉ mang tính đại diện; xem riêng từng kích thước.",
      "source": "hapag20",
      "sources": {
        "20GP": "hapag20",
        "40GP": "hapag40",
        "40HC": "hapag40hc"
      }
    },
    {
      "id": "one",
      "name": "ONE",
      "payload": {
        "20GP": 28330,
        "40GP": 26840,
        "40HC": 28800
      },
      "alternative": {},
      "note": "Bảng ONE Việt Nam, số liệu mẫu tham khảo; vỏ thực tế có thể khác.",
      "source": "one",
      "sources": {}
    },
    {
      "id": "oocl",
      "name": "OOCL",
      "payload": {
        "20GP": 28200,
        "40GP": 26650,
        "40HC": 28700
      },
      "alternative": {},
      "note": "Các mức 20GP/40GP do OOCL công bố không hoàn toàn khớp phép tính từ gross và tare trên cùng trang; phải xác nhận khi booking.",
      "source": "oocl20",
      "sources": {
        "20GP": "oocl20",
        "40GP": "oocl20",
        "40HC": "oocl40hc"
      }
    },
    {
      "id": "yangming",
      "name": "Yang Ming",
      "payload": {
        "20GP": 28110,
        "40GP": null,
        "40HC": 26310
      },
      "alternative": {
        "40HC": "28.350 kg (vỏ 32.500 kg)"
      },
      "note": "40HC có biến thể 32.500 kg đạt net 28.350 kg. Chưa có số 40GP được xác nhận từ trang độc lập.",
      "source": "yangming20",
      "sources": {
        "20GP": "yangming20",
        "40HC": "yangming40hc"
      }
    },
    {
      "id": "hmm",
      "name": "HMM",
      "payload": {
        "20GP": 28280,
        "40GP": 28900,
        "40HC": 28700
      },
      "alternative": {},
      "note": "Dữ liệu bảng thiết bị; trọng lượng vận chuyển thực tế còn phụ thuộc tuyến và phương thức.",
      "source": "hmm",
      "sources": {}
    },
    {
      "id": "pil",
      "name": "PIL",
      "payload": {
        "20GP": 28380,
        "40GP": 26830,
        "40HC": 28800
      },
      "alternative": {},
      "note": "PIL yêu cầu đối chiếu số container cụ thể và điều kiện đường bộ tại nước sở tại.",
      "source": "pil",
      "sources": {}
    }
  ]
};

/* ───────────── Dữ liệu ───────────── */
const SOURCES = Object.freeze({ ...DATA.sources });
const dateVN = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
const dateTimeVN = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };

export const SOURCE_CHECKED = dateVN(DATA.checkedAt);
export const EVERGREEN = Object.freeze(DATA.evergreen.map(e => Object.freeze({ ...e, net: e.gross - e.tare })));
export const CARRIERS = Object.freeze(DATA.carriers.map(c => Object.freeze({
  ...c,
  sourceKey: c.source,
  sourceKeys: { ...(c.sources || {}) },
  source: SOURCES[c.source],
  sources: Object.fromEntries(Object.entries(c.sources || {}).map(([t, k]) => [t, SOURCES[k]])),
  alternative: c.alternative || {},
})));
const HALF_SHARE_MAX = 0.6;    // quy tắc kinh nghiệm: không quá 60% khối lượng hàng dồn về một nửa chiều dài vỏ
const TYPES = ['20GP', '40GP', '40HC'];
const PLAN_CANDIDATES = ['20gp-h', '40gp', '40hc', '45hc-a', '20ot-h', '20fr-c'];
const STORE_KEY = 'epsilon-ct-plan-v1';

/* ───────────── Tiện ích ───────────── */
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fmt = (n, d = 1) => Number.isFinite(n) ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: d }).format(n) : '—';
const fmtM = mm => fmt(mm / 1000, 2) + ' m';
const fmtTm = kgPerM => fmt(kgPerM / 1000, 2) + ' t/m';
const pct = x => Number.isFinite(x) ? fmt(x * 100, 0) + '%' : '—';
const dim = a => Array.isArray(a) ? a.map(v => fmt(v)).join(' × ') : 'Chưa công bố';
const safeUrl = u => /^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(u) ? u : '#';
const ext = (url, label = 'Nguồn gốc ↗') => `<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
const first = id => EVERGREEN.find(e => e.id === id) || EVERGREEN[0];
const carrier = id => CARRIERS.find(c => c.id === id) || CARRIERS[0];
const pos = v => Number.isFinite(v) && v > 0;
const maxNum = input => { const s = String(input ?? '').trim(); if (!s) return null; const v = Number(s); return Number.isFinite(v) && v >= 0 && v <= 1e7 ? v : NaN; };
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

export const effectivePayload = (published, booking) =>
  Number.isFinite(published) && published > 0 ? (Number.isFinite(booking) && booking > 0 ? Math.min(published, booking) : published) : null;

/* ───────────── ISO 6346 ───────────── */
const ISO_LETTERS = (() => { const m = {}; let v = 10; for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') { if (v % 11 === 0) v++; m[ch] = v++; } return m; })();
const ISO_CATEGORY = { U: 'Container chở hàng', J: 'Thiết bị gắn rời được', Z: 'Rơ moóc / chassis' };
export function iso6346(input) {
  const s = String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!s) return { state: 'empty' };
  if (!/^[A-Z]{3}[UJZ]\d{6}\d?$/.test(s)) {
    let reason = 'Số container gồm 4 chữ cái (3 chữ mã chủ sở hữu + U, J hoặc Z) và 7 chữ số, ví dụ EGHU 123456 7.';
    if (/^[A-Z]{3}[^UJZ]/.test(s)) reason = 'Chữ cái thứ tư phải là U, J hoặc Z.';
    else if (s.length > 11) reason = 'Số container dài hơn 11 ký tự.';
    return { state: 'format', code: s, reason };
  }
  let total = 0;
  for (let i = 0; i < 10; i++) { const ch = s[i]; total += (/\d/.test(ch) ? Number(ch) : ISO_LETTERS[ch]) * 2 ** i; }
  const check = total % 11 % 10;
  const base = s.slice(0, 10);
  const parts = { owner: s.slice(0, 3), category: s[3], serial: s.slice(4, 10), check };
  if (s.length === 10) return { state: 'partial', code: base, full: base + check, ...parts };
  const given = Number(s[10]);
  return { state: given === check ? 'valid' : 'invalid', code: s, full: base + check, given, ...parts };
}

/* ───────────── Xếp hàng ───────────── */
/**
 * Ước tính xếp hàng theo hàng dọc: mỗi dòng hàng chiếm một khối liên tục theo chiều dài vỏ,
 * không trộn kiện của các dòng khác nhau trên cùng một hàng ngang. Kết quả thiên về an toàn,
 * không phải sơ đồ xếp tối ưu.
 */
export function planLoad(items, eq, payload) {
  const [L, W, H] = eq.inner;
  const isOT = eq.code.endsWith('OT'), isFR = eq.code.endsWith('FR'), open = isOT || isFR;
  const blocks = [], issues = [];
  for (const it of items) {
    if (!(pos(it.l) && pos(it.w) && pos(it.h) && pos(it.qty) && Number.isFinite(it.kg) && it.kg >= 0)) continue;
    const opts = [[it.l, it.w]];
    if (it.rotate && it.l !== it.w) opts.push([it.w, it.l]);
    const why = new Set();
    let best = null;
    for (const [len, wid] of opts) {
      const oog = [];
      if (len > L) { why.add('dài hơn lòng vỏ'); continue; }
      let perW = Math.floor(W / wid);
      if (perW < 1) { if (isFR) { perW = 1; oog.push('rộng'); } else { why.add('rộng hơn lòng vỏ'); continue; } }
      let layers = it.stack ? Math.floor(H / it.h) : 1;
      if (it.h > H) { if (open) { layers = 1; oog.push('cao'); } else { why.add('cao hơn lòng vỏ'); continue; } }
      if (!open && Array.isArray(eq.door) && (wid > eq.door[0] || it.h > eq.door[1])) { why.add('không lọt cửa vỏ'); continue; }
      layers = Math.max(1, layers);
      const perRow = perW * layers, rows = Math.ceil(it.qty / perRow), length = rows * len;
      if (!best || length < best.length) best = { len, wid, perW, layers, perRow, rows, length, oog };
    }
    if (!best) { issues.push({ item: it, reasons: [...why] }); continue; }
    blocks.push({ item: it, ...best, kg: it.kg * it.qty, cbm: it.l * it.w * it.h * it.qty / 1e9 });
  }
  const totalLen = sum(blocks, b => b.length);
  const totalKg = sum(blocks, b => b.kg);
  const cbm = sum(blocks, b => b.cbm);
  const byLen = Math.ceil(totalLen / L);
  const byKg = pos(payload) ? Math.ceil(totalKg / payload) : 0;
  const containers = blocks.length ? Math.max(1, byLen, byKg) : 0;
  const volume = L * W * H / 1e9;
  return {
    eq, payload, blocks, issues, totalLen, totalKg, cbm, containers, volume,
    oog: blocks.flatMap(b => b.oog.map(o => `${b.item.name || 'Hàng'}: quá khổ ${o}`)),
    fitsOne: issues.length === 0 && blocks.length > 0 && totalLen <= L && (!pos(payload) || totalKg <= payload),
  };
}

/** Phân bố dọc trong một vỏ: trọng tâm, tỷ lệ khối lượng mỗi nửa, tải trên mét dài của từng khối. */
export function distribution(plan, mode = 'front', limitKgPerM = null) {
  const L = plan.eq.inner[0];
  let x = mode === 'center' ? Math.max(0, (L - plan.totalLen) / 2) : 0;
  const M = plan.totalKg;
  const uniform = pos(plan.payload) ? plan.payload / (L / 1000) : null;
  const limit = pos(limitKgPerM) ? limitKgPerM : uniform;
  const placed = plan.blocks.map(b => {
    const start = x, end = x + b.length; x = end;
    const kgPerM = b.kg / (b.length / 1000);
    const needM = pos(limit) && kgPerM > limit ? b.kg / limit : null;
    return { ...b, start, end, kgPerM, needM };
  });
  const cog = M > 0 ? sum(placed, p => p.kg * (p.start + p.end) / 2) / M : L / 2;
  const front = sum(placed, p => p.kg * Math.max(0, Math.min(p.end, L / 2) - Math.max(p.start, 0)) / (p.end - p.start));
  const frontShare = M > 0 ? front / M : 0.5;
  return { placed, cog, offset: cog - L / 2, offsetPct: (cog - L / 2) / L, frontShare, maxShare: Math.max(frontShare, 1 - frontShare), uniform, limit, userLimit: pos(limitKgPerM) };
}

/** Chọn đề xuất: ít vỏ nhất, ưu tiên vỏ khô thường hơn OT/FR, rồi vỏ ngắn hơn. */
function recommend(plans) {
  const special = p => /OT|FR/.test(p.eq.code) ? 1 : 0;
  const usable = plans.filter(p => p.blocks.length && !p.issues.length && !p.oog.length);
  const pool = usable.length ? usable : plans.filter(p => p.blocks.length && !p.issues.length);
  return pool.sort((a, b) => a.containers - b.containers || special(a) - special(b) || a.eq.inner[0] - b.eq.inner[0])[0] || null;
}

const DEFAULT_ITEMS = [{ name: 'Gối cầu', l: 1200, w: 1200, h: 400, kg: 3500, qty: 4, stack: false, rotate: true }];
function loadItems() {
  try { const v = JSON.parse(localStorage.getItem(STORE_KEY)); if (Array.isArray(v) && v.length) return v.slice(0, 50); } catch {}
  return DEFAULT_ITEMS.map(x => ({ ...x }));
}
function saveItems(items) { try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); } catch {} }

/* ───────────── Giao diện ───────────── */
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
.ct-tab:focus-visible,.ct-button:focus-visible,.ct-table button:focus-visible,.ct-link:focus-visible{outline:2px solid #8b64ed;outline-offset:2px}
.ct-panel[hidden]{display:none!important}
.ct-panel{display:grid;gap:14px}
.ct-box{border:1px solid var(--ct-border);border-radius:14px;background:#fff;padding:16px;min-width:0}
.ct-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:13px}
.ct-heading h3{margin:0;font-size:20px;color:#122a8c;line-height:1.3}
.ct-heading p{margin:3px 0 0;font-size:16px;color:var(--ct-muted)}
.ct-field{display:flex;flex-direction:column;gap:6px;color:#283c89;font-weight:800;min-width:0;font-size:16px}
.ct-field select,.ct-field input{width:100%;min-width:0;border:1px solid #cbd5fa;border-radius:10px;min-height:44px;background:white;color:#15286e;padding:8px 11px;font-size:16px;font-weight:600}
.ct-field input:focus-visible,.ct-field select:focus-visible,.ct-items input:focus-visible{outline:2px solid #8b64ed;outline-offset:1px}
.ct-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.ct-badges{display:flex;gap:8px;flex-wrap:wrap}
.ct-chip{font-size:16px;border-radius:999px;padding:5px 10px;color:#26518f;background:#e8f2ff;border:1px solid #d4e6fc;font-weight:750;white-space:nowrap}
.ct-chip.accent{color:#6032c3;background:#f1eaff;border-color:#e2d8fc}
.ct-chip.ok{color:#17694c;background:#e9f9f1;border-color:#bfe9d5}
.ct-chip.warn{color:#8a4b06;background:#fff3dc;border-color:#f2d199}
.ct-chip.bad{color:#9b2c1c;background:#fdecea;border-color:#f3c3bb}
.ct-chip.muted{color:#5b6b88;background:#f1f3f8;border-color:#dfe4ee}
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
.ct-table tr.ct-best{background:#f0fff6}
.ct-table .ct-num{font-variant-numeric:tabular-nums;font-weight:800;white-space:nowrap}
.ct-table .ct-sub{display:block;color:#67799a;font-size:16px;font-weight:500;margin-top:3px}
.ct-table button{font-size:16px;font-weight:800;color:#5331bb;background:transparent;border:0;text-decoration:underline;text-underline-offset:3px;padding:1px;text-align:left;cursor:pointer}
.ct-table button[aria-current="true"]{color:#fff;background:#6330db;border-radius:6px;padding:3px 7px;text-decoration:none}
.ct-diff{color:#10805f;font-weight:800}.ct-diff.minus{color:#b65b0a}.ct-diff.zero{color:#687b99}
.ct-toolbar{display:flex;align-items:flex-end;gap:12px;justify-content:space-between;flex-wrap:wrap}
.ct-toolbar .ct-field{min-width:min(280px,100%)}
.ct-button{background:#f1edff;color:#542abb;border:1px solid #d9cfff;border-radius:10px;min-height:44px;padding:7px 13px;font-size:16px;font-weight:800;cursor:pointer}
.ct-button:hover{background:#e9e2ff}
.ct-button.primary{background:#6330db;border-color:#6330db;color:#fff}
.ct-button.primary:hover{background:#5326c2}
.ct-check-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.ct-check-output{border:1px solid #cbdaf5;background:#f5f9ff;border-radius:13px;padding:17px;display:grid;gap:6px}
.ct-check-output.ok{border-color:#a2e4c4;background:#f0fff6}.ct-check-output.alert{border-color:#f4cc91;background:#fffaed}
.ct-check-output strong{font-size:22px;color:#153c87}
.ct-check-output p{margin:0;line-height:1.5;color:#4f628a}
.ct-check-output ul{margin:0;padding-left:20px;color:#4f628a;line-height:1.5}
.ct-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.ct-metrics>div{border:1px solid #dce6fa;border-radius:11px;padding:12px;min-width:0}
.ct-metrics span{font-size:16px;color:#526895;display:block}.ct-metrics b{font-size:21px;color:#1735a4;display:block;margin-top:4px;overflow-wrap:anywhere}
.ct-items{border-collapse:collapse;width:100%;min-width:860px;font-size:16px}
.ct-items th{background:#f1f4ff;color:#213b9c;text-align:left;font-weight:900;padding:9px 8px;white-space:nowrap}
.ct-items td{padding:6px 5px;border-bottom:1px solid #e5ecfa}
.ct-items input[type=text],.ct-items input[type=number]{width:100%;min-width:0;border:1px solid #cbd5fa;border-radius:8px;min-height:40px;padding:6px 8px;color:#15286e;background:#fff;font-weight:600}
.ct-items input[type=number]{text-align:right;font-variant-numeric:tabular-nums}
.ct-items input[type=checkbox]{width:22px;height:22px;accent-color:#6330db}
.ct-items .ct-c{text-align:center}
.ct-link{background:none;border:0;color:#9b2c1c;font-weight:800;text-decoration:underline;cursor:pointer;padding:4px}
.ct-bar{position:relative;height:74px;border:3px solid #4e58b9;border-radius:6px 10px 10px 6px;background:#f4f7ff;overflow:hidden}
.ct-bar .ct-blk{position:absolute;top:0;bottom:0;display:grid;place-items:center;color:#fff;font-weight:800;font-size:16px;border-right:2px solid #fff;overflow:hidden;white-space:nowrap;padding:0 4px}
.ct-bar .ct-blk.hot{background-image:repeating-linear-gradient(45deg,transparent 0 8px,#ffffff40 8px 14px)}
.ct-bar .ct-mid{position:absolute;top:-2px;bottom:-2px;width:0;border-left:2px dashed #14266f99}
.ct-bar .ct-cog{position:absolute;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#fff;border:4px solid #c2410c;box-shadow:0 0 0 2px #fff}
.ct-bar-legend{display:flex;justify-content:space-between;color:#5d7098;font-size:16px;margin-top:6px;gap:10px;flex-wrap:wrap}
.ct-iso{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}
.ct-iso-code{font-size:clamp(24px,3vw,34px);font-weight:900;letter-spacing:2px;color:#14299f;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.ct-iso-code b{color:#c2410c}
.ct-footer{color:#61749d;font-size:16px;line-height:1.5;margin:0}
@media(max-width:950px){.ct-split,.ct-iso{grid-template-columns:1fr}}
@media(max-width:660px){.ct-intro{align-items:flex-start;flex-direction:column;padding:16px}.ct-fields,.ct-check-grid{grid-template-columns:1fr}.ct-stats,.ct-metrics{grid-template-columns:1fr}.ct-tab{flex:1 1 40%}.ct-box{padding:13px}}
`;

const BLOCK_COLORS = ['#4e58b9', '#0f7f86', '#7c3aed', '#b45309', '#2563a8', '#86198f'];

export function mount(root, ctx = {}) {
  const P = 'ct' + Math.random().toString(36).slice(2, 8) + '-';
  const icon = ctx.icon || (name => ({ box: '▣', download: '⤓', print: '⎙', plus: '+' }[name] || '▣'));
  const tabs = [['plan', 'Chọn & xếp container'], ['equip', 'Thông số vỏ'], ['lines', 'Payload theo hãng tàu'], ['check', 'Kiểm tra tải nhanh'], ['iso', 'Số container']];
  const typeOptions = TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
  const carrierOptions = CARRIERS.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');

  root.innerHTML = `<section class="container-tool" aria-label="Tra cứu thông số container">
    <style>${styles}</style>
    <div class="ct-intro"><div><h2>${icon('box', 25)} Tra cứu Container</h2><p>Chọn đúng loại container cho lô hàng và hỗ trợ xếp hàng: số vỏ cần, bố trí, trọng tâm, tải sàn, kèm thông số vỏ và payload tham khảo theo hãng tàu.</p></div><div class="ct-stamp">Số liệu tra cứu · ${SOURCE_CHECKED}</div></div>
    <div class="ct-tabs" role="tablist" aria-label="Nội dung tra cứu">
      ${tabs.map(([k, label], i) => `<button type="button" class="ct-tab" role="tab" id="${P}ct-tabbtn-${k}" aria-controls="${P}ct-tab-${k}" aria-selected="${i === 0}" ${i ? 'tabindex="-1"' : ''} data-ct-tab="${k}">${label}</button>`).join('')}
    </div>

    <div class="ct-panel" id="${P}ct-tab-equip" role="tabpanel" aria-labelledby="${P}ct-tabbtn-equip" data-ct-panel="equip" hidden>
      <div class="ct-box"><div class="ct-heading"><div><h3>Thông số container Evergreen</h3><p>Chọn mẫu vỏ, loại và cấp Gross Weight đúng theo bảng công bố.</p></div>${ext(SOURCES.evergreen, 'Bảng gốc Evergreen ↗')}</div>
        <label class="ct-field"><span>Loại và cấu hình container</span><select id="${P}ct-equipment">${EVERGREEN.map(e => `<option value="${esc(e.id)}">${esc(e.code)} · ${esc(e.name)} · ${esc(e.variant)}</option>`).join('')}</select></label>
        <div class="ct-badges" id="${P}ct-badges" style="margin:13px 0"></div>
        <div class="ct-illustration"><div class="ct-container-art" role="img" aria-label="Hình khối minh họa container"></div></div>
        <div class="ct-stats" style="margin:13px 0"><div class="ct-stat"><span>Max Gross · Tổng tối đa</span><strong id="${P}ct-gross"></strong><small>kg · cả vỏ + hàng</small></div><div class="ct-stat ct-yellow"><span>Tare · Khối lượng vỏ</span><strong id="${P}ct-tare"></strong><small>kg · vỏ rỗng</small></div><div class="ct-stat ct-green"><span>Net / Payload · Hàng tối đa</span><strong id="${P}ct-net"></strong><small>kg · Gross − Tare</small></div></div>
        <div class="ct-split"><div class="ct-dimension"><h4>Kích thước ngoài · D × R × C</h4><div class="ct-fig" id="${P}ct-outer"></div><p>mm · kích thước phủ bì</p></div><div class="ct-dimension"><h4>Kích thước trong · D × R × C</h4><div class="ct-fig" id="${P}ct-inner"></div><p>mm · kích thước lòng container</p></div><div class="ct-dimension"><h4>Cửa container · R × C</h4><div class="ct-fig" id="${P}ct-door"></div><p>mm · cần xét thêm khi đưa hàng vào</p></div><div class="ct-dimension"><h4>Thể tích lòng · tính gần đúng</h4><div class="ct-fig" id="${P}ct-volume"></div><p>m³ · tích ba kích thước trong</p></div></div>
        <p class="ct-note" id="${P}ct-equip-note" style="margin-top:12px"></p>
      </div>
      <div class="ct-box"><div class="ct-heading"><h3>Toàn bộ cấu hình Evergreen đã trích</h3><span class="ct-chip">${EVERGREEN.length} cấu hình</span></div><div class="ct-table-wrap"><table class="ct-table"><thead><tr><th>Loại</th><th>Max Gross (kg)</th><th>Tare (kg)</th><th>Net / Payload (kg)</th><th>Trong lòng (mm)</th></tr></thead><tbody id="${P}ct-equipment-table"></tbody></table></div></div>
    </div>

    <div class="ct-panel" id="${P}ct-tab-lines" role="tabpanel" aria-labelledby="${P}ct-tabbtn-lines" data-ct-panel="lines" hidden>
      <div class="ct-box"><div class="ct-heading"><div><h3>So sánh Net / Payload theo hãng tàu</h3><p>Số liệu tham khảo từ trang chính thức của mỗi hãng, tra cứu ngày ${SOURCE_CHECKED}. Vỏ thực tế có thể khác, xem biển thông số trên cửa vỏ.</p></div><button type="button" id="${P}ct-export" class="ct-button">${icon('download', 17)} Xuất CSV</button></div>
      <div class="ct-toolbar" style="margin-bottom:12px"><label class="ct-field"><span>Đối chiếu chênh lệch theo loại</span><select id="${P}ct-compare-type"><option value="20GP">20GP · 20 feet Dry</option><option value="40GP">40GP · 40 feet Dry</option><option value="40HC">40HC · 40 feet High Cube</option></select></label><span class="ct-chip" id="${P}ct-carriers-counter"></span></div>
      <div class="ct-table-wrap"><table class="ct-table"><thead><tr><th>Hãng tàu</th><th>20GP (kg)</th><th>40GP (kg)</th><th>40HC (kg)</th><th>So với Evergreen (kg)</th><th>Nguồn</th></tr></thead><tbody id="${P}ct-carriers-table"></tbody></table></div>
      <div class="ct-warning" style="margin-top:13px"><strong>Chú ý dữ liệu:</strong> Đây là tải hàng tối đa theo đặc tính vỏ do hãng công bố, dùng để chọn loại container. Mức chở thực tế còn phụ thuộc tuyến, cảng và giới hạn đường bộ. Một số hãng công bố Net không khớp hẳn phép tính Gross − Tare; tool giữ nguyên số hãng công bố và ghi chú khác biệt.</div>
      <div class="ct-sources" style="margin-top:13px">${ext(SOURCES.imo, 'IMO · VGM & SOLAS ↗')}${ext(SOURCES.vnlaw, 'Việt Nam · giới hạn đường bộ ↗')}</div></div>
    </div>

    <div class="ct-panel" id="${P}ct-tab-check" role="tabpanel" aria-labelledby="${P}ct-tabbtn-check" data-ct-panel="check" hidden>
      <div class="ct-box"><div class="ct-heading"><div><h3>Kiểm tra tải hàng sơ bộ</h3><p>Nhập khối lượng gồm hàng, pallet, đai, vật liệu lót và chèn buộc. Nếu đã có vỏ, nhập thêm Tare và Max Gross đọc trên cửa vỏ để kiểm theo vỏ thật.</p></div></div>
        <div class="ct-check-grid">
          <label class="ct-field"><span>Hãng tàu</span><select id="${P}ct-carrier-check">${carrierOptions}</select></label>
          <label class="ct-field"><span>Loại container</span><select id="${P}ct-type-check">${typeOptions}</select></label>
          <label class="ct-field"><span>Hàng + bao bì + chèn buộc (kg)</span><input id="${P}ct-cargo" type="number" inputmode="decimal" min="0" max="1000000" step="1" value="24000"></label>
          <label class="ct-field"><span>Tare vỏ thực tế (kg) · nếu có</span><input id="${P}ct-actual-tare" type="number" inputmode="decimal" min="0" max="100000" step="1" placeholder="Đọc trên cửa vỏ container"></label>
          <label class="ct-field"><span>Max Gross trên cửa vỏ (kg) · nếu có</span><input id="${P}ct-real-gross" type="number" inputmode="decimal" min="0" max="1000000" step="1" placeholder="Đọc trên cửa vỏ container"></label>
        </div>
        <div class="ct-check-output" id="${P}ct-check-result" role="status" aria-live="polite" style="margin-top:13px"></div>
        <div class="ct-metrics" style="margin-top:11px"><div><span>Payload tham khảo</span><b id="${P}ct-allow"></b></div><div><span>Dư tải tham khảo</span><b id="${P}ct-remaining"></b></div><div><span>Gross dự tính (nếu có Tare thực tế)</span><b id="${P}ct-estimated-gross"></b></div></div>
        <p class="ct-note" id="${P}ct-calc-note" style="margin-top:12px"></p>
      </div>
      <div class="ct-warning"><strong>Nguyên tắc:</strong> VGM được xác minh bằng cân vỏ đóng hàng hoặc phương pháp cân thành phần theo quy định và gồm cả Tare. Không được dùng phép cộng trong công cụ này để tự khai VGM khi không có phương pháp xác minh hợp lệ. ${ext(SOURCES.imo, 'Xem IMO ↗')}</div>
    </div>

    <div class="ct-panel" id="${P}ct-tab-plan" role="tabpanel" aria-labelledby="${P}ct-tabbtn-plan" data-ct-panel="plan">
      <div class="ct-box"><div class="ct-heading"><div><h3>Danh sách hàng</h3><p>Kích thước mm, khối lượng kg mỗi kiện, đã gồm pallet và vật liệu kê. Danh sách được lưu trên máy này.</p></div><div class="ct-badges"><button type="button" class="ct-button" id="${P}ct-add-item">${icon('plus', 17)} Thêm dòng hàng</button><button type="button" class="ct-button" id="${P}ct-reset-items">Về mẫu ban đầu</button></div></div>
        <div class="ct-table-wrap"><table class="ct-items"><thead><tr><th style="width:22%">Tên hàng</th><th>Dài</th><th>Rộng</th><th>Cao</th><th>Kg / kiện</th><th>Số kiện</th><th class="ct-c">Xếp chồng</th><th class="ct-c">Cho xoay</th><th></th></tr></thead><tbody id="${P}ct-items"></tbody></table></div>
        <p class="ct-note" style="margin-top:10px">“Xếp chồng” chỉ bật khi kiện chịu được tải chồng. “Cho xoay” là xoay ngang 90°, không lật kiện.</p>
      </div>
      <div class="ct-box"><div class="ct-heading"><div><h3>So sánh loại container</h3><p>Ước tính số vỏ cần theo kích thước và khối lượng. Payload 20GP/40GP/40HC lấy theo hãng chọn bên dưới, loại khác theo bảng Evergreen.</p></div></div>
        <div class="ct-fields" style="margin-bottom:12px">
          <label class="ct-field"><span>Hãng tàu</span><select id="${P}ct-plan-carrier">${carrierOptions}</select></label>
          <label class="ct-field"><span>Bố trí dọc vỏ</span><select id="${P}ct-plan-mode"><option value="front">Dồn từ vách đầu vào cửa</option><option value="center">Căn giữa chiều dài vỏ</option></select></label>
          <label class="ct-field"><span>Giới hạn tải sàn theo hãng (t/m) · nếu có</span><input id="${P}ct-plan-limit" type="number" inputmode="decimal" min="0" max="100" step="0.1" placeholder="Để trống: dùng mức phân bố đều"></label>
        </div>
        <div class="ct-table-wrap"><table class="ct-table"><thead><tr><th>Loại vỏ</th><th>Số vỏ ước tính</th><th>Payload / vỏ</th><th>Tải dùng</th><th>Thể tích dùng</th><th>Ghi chú</th></tr></thead><tbody id="${P}ct-plan-compare"></tbody></table></div>
      </div>
      <div class="ct-box"><div class="ct-heading"><div><h3>Chi tiết xếp trong một vỏ</h3><p>Chọn loại vỏ để xem bố trí, trọng tâm và tải trên mét dài sàn.</p></div><div class="ct-badges"><label class="ct-field" style="min-width:min(260px,100%)"><span>Loại vỏ</span><select id="${P}ct-plan-eq">${PLAN_CANDIDATES.map(id => { const e = first(id); return `<option value="${esc(e.id)}">${esc(e.code)} · ${esc(e.variant)}</option>`; }).join('')}</select></label><button type="button" class="ct-button primary" id="${P}ct-print" style="align-self:flex-end">${icon('print', 17)} In / lưu PDF phiếu</button></div></div>
        <div class="ct-check-output" id="${P}ct-plan-result" role="status" aria-live="polite"></div>
        <div id="${P}ct-plan-visual" style="margin-top:13px"></div>
        <div class="ct-metrics" style="margin-top:11px"><div><span>Tổng hàng / Payload</span><b id="${P}ct-plan-kg"></b></div><div><span>Chiều dài sàn dùng</span><b id="${P}ct-plan-len"></b></div><div><span>Gross ước tính (hàng + Tare điển hình)</span><b id="${P}ct-plan-gross"></b></div></div>
        <div class="ct-table-wrap" style="margin-top:12px"><table class="ct-table"><thead><tr><th>Dòng hàng</th><th>Cách xếp</th><th>Chiều dài khối</th><th>Khối lượng</th><th>Tải sàn</th><th>Đánh giá</th></tr></thead><tbody id="${P}ct-plan-blocks"></tbody></table></div>
      </div>
      <div class="ct-warning"><strong>Phạm vi:</strong> Đây là ước tính sơ bộ theo khối, không phải sơ đồ xếp chi tiết. Tải sàn so với mức “phân bố đều” (payload chia chiều dài lòng vỏ) là ngưỡng thận trọng do công cụ đặt; giới hạn tải tập trung thực tế lấy theo hãng tàu. Quy tắc 60% cho mỗi nửa chiều dài là quy tắc kinh nghiệm khi đóng hàng (tham khảo CTU Code IMO/ILO/UNECE). Hàng nặng tập trung như gối cầu, kết cấu thép cần phương án kê phân tải và chằng buộc được duyệt riêng.</div>
    </div>

    <div class="ct-panel" id="${P}ct-tab-iso" role="tabpanel" aria-labelledby="${P}ct-tabbtn-iso" data-ct-panel="iso" hidden>
      <div class="ct-box"><div class="ct-heading"><div><h3>Kiểm tra số container (ISO 6346)</h3><p>Phát hiện lỗi gõ nhầm số vỏ trên booking, VGM, packing list. Nhập 10 ký tự đầu để tính chữ số kiểm tra.</p></div></div>
        <div class="ct-iso">
          <label class="ct-field"><span>Số container</span><input id="${P}ct-iso-input" type="text" autocomplete="off" spellcheck="false" maxlength="20" placeholder="Ví dụ: CSQU 305438 3" style="text-transform:uppercase;letter-spacing:1px"></label>
          <div class="ct-check-output" id="${P}ct-iso-result" role="status" aria-live="polite"></div>
        </div>
        <p class="ct-note" style="margin-top:12px">Số hợp lệ chỉ chứng tỏ không gõ nhầm, không xác nhận vỏ đó có tồn tại hay thuộc booking của anh/chị. Mã chủ sở hữu (3 chữ đầu) được đăng ký với BIC.</p>
      </div>
    </div>

    <p class="ct-footer"><strong>Nguồn tra cứu:</strong> Evergreen Shipping Agency, trang thiết bị của từng hãng tàu và hướng dẫn IMO. Tra cứu thủ công ngày ${SOURCE_CHECKED}. Công cụ hỗ trợ chọn vỏ và ước tính xếp hàng; không thay sơ đồ xếp, phương án chằng buộc được duyệt hoặc VGM. Khi nhận vỏ, kiểm biển thông số trên <strong>cửa bên phải vỏ container</strong>.</p>
  </section>`;

  const $ = sel => root.querySelector(sel[0] === '#' ? '#' + P + sel.slice(1) : sel);
  const qsa = sel => [...root.querySelectorAll(sel)];
  const signal = ctx.signal;
  const on = (el, event, fn) => el.addEventListener(event, fn, signal ? { signal } : undefined);
  const TAB_KEYS = tabs.map(t => t[0]);

  /* Tabs */
  function activate(name, focus = false) {
    for (const btn of qsa('[data-ct-tab]')) { const yes = btn.dataset.ctTab === name; btn.setAttribute('aria-selected', String(yes)); btn.tabIndex = yes ? 0 : -1; if (yes && focus) btn.focus(); }
    for (const panel of qsa('[data-ct-panel]')) panel.hidden = panel.dataset.ctPanel !== name;
  }
  function onTabKey(ev) {
    const i = TAB_KEYS.indexOf(ev.currentTarget.dataset.ctTab); let n = null;
    if (ev.key === 'ArrowRight') n = (i + 1) % TAB_KEYS.length;
    else if (ev.key === 'ArrowLeft') n = (i - 1 + TAB_KEYS.length) % TAB_KEYS.length;
    else if (ev.key === 'Home') n = 0;
    else if (ev.key === 'End') n = TAB_KEYS.length - 1;
    if (n === null) return;
    ev.preventDefault(); activate(TAB_KEYS[n], true);
  }

  /* Tab 1: Evergreen */
  function selectEquipment(id) {
    const e = first(id); $('#ct-equipment').value = e.id;
    $('#ct-gross').textContent = fmt(e.gross); $('#ct-tare').textContent = fmt(e.tare); $('#ct-net').textContent = fmt(e.net);
    $('#ct-outer').textContent = dim(e.outer); $('#ct-inner').textContent = dim(e.inner); $('#ct-door').textContent = e.door ? dim(e.door) : 'Không áp dụng / không có số';
    $('#ct-volume').textContent = e.code.endsWith('FR') ? 'Không áp dụng' : fmt(Math.round(e.inner.reduce((a, b) => a * b, 1) / 1e9 * 10) / 10) + ' m³';
    $('#ct-badges').innerHTML = `<span class="ct-chip">${esc(e.code)}</span><span class="ct-chip accent">${esc(e.variant)}</span><span class="ct-chip">Net: ${e.published ? 'Hãng công bố' : 'Tính từ Gross − Tare'}</span>${e.review ? '<span class="ct-chip warn">Cần đối chiếu lại</span>' : ''}`;
    $('#ct-equip-note').textContent = (e.review ? 'Cần đối chiếu: ' + e.review + ' ' : '') + (e.note ? e.note + ' ' : '') + 'Số liệu điển hình của Evergreen, không thay thế biển thông số vỏ thực tế, VGM hoặc xác nhận hãng tàu.';
    qsa('[data-ct-equip]').forEach(b => b.setAttribute('aria-current', String(b.dataset.ctEquip === e.id)));
  }
  function renderEquipTable() {
    $('#ct-equipment-table').innerHTML = EVERGREEN.map(e => `<tr><td><button type="button" data-ct-equip="${esc(e.id)}" title="Xem chi tiết">${esc(e.code)} · ${esc(e.variant)}</button>${e.review ? '<span class="ct-sub">Cần đối chiếu lại Tare</span>' : ''}</td><td class="ct-num">${fmt(e.gross)}</td><td class="ct-num">${fmt(e.tare)}</td><td class="ct-num">${fmt(e.net)}${e.published ? '' : ' <span class="ct-sub">(*) tính</span>'}</td><td>${dim(e.inner)}</td></tr>`).join('');
  }

  /* Tab 2: hãng tàu */
  function renderCarrierTable() {
    const type = $('#ct-compare-type').value; const base = CARRIERS[0].payload[type];
    $('#ct-carriers-table').innerHTML = CARRIERS.map(c => {
      const n = c.payload[type], diff = Number.isFinite(n) && Number.isFinite(base) ? n - base : null;
      const difference = diff === null ? '—' : `${diff > 0 ? '+' : ''}${fmt(diff)}`;
      const url = c.sources[type] || c.source;
      return `<tr><td><button type="button" data-ct-use-carrier="${esc(c.id)}" title="Kiểm tra tải với hãng này">${esc(c.name)}</button>${c.note ? `<span class="ct-sub">${esc(c.note)}</span>` : ''}</td>${TYPES.map(t => `<td class="ct-num">${fmt(c.payload[t])}${c.alternative[t] ? `<span class="ct-sub">Khác: ${esc(c.alternative[t])}</span>` : ''}</td>`).join('')}<td class="ct-num"><span class="ct-diff ${diff === null || diff === 0 ? 'zero' : diff < 0 ? 'minus' : ''}">${difference}</span></td><td>${ext(url, 'Xem hãng ↗')}</td></tr>`;
    }).join('');
    $('#ct-carriers-counter').textContent = CARRIERS.length + ' hãng · mốc ' + fmt(base) + ' kg';
  }
  function exportCSV() {
    const heading = ['Hãng tàu', ...TYPES.map(t => `${t} Net (kg)`), ...TYPES.map(t => `${t} biến thể khác`), 'Ghi chú', ...TYPES.map(t => `Nguồn ${t}`)];
    const safe = s => '"' + (/^[\s]*[=+@\-\t\r]/.test(String(s ?? '')) ? "'" : '') + String(s ?? '').replace(/"/g, '""') + '"';
    const lines = [heading, ...CARRIERS.map(c => [c.name, ...TYPES.map(t => c.payload[t] ?? ''), ...TYPES.map(t => c.alternative[t] || ''), c.note, ...TYPES.map(t => c.sources[t] || c.source)])];
    const csv = '\ufeff' + lines.map(r => r.map(safe).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'epsilon-container-carrier-payload.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); ctx.showToast?.('Đã xuất bảng tải hàng tham khảo.');
  }

  /* Tab 3: kiểm tra tải nhanh */
  function renderCheck() {
    const c = carrier($('#ct-carrier-check').value), type = $('#ct-type-check').value, published = c.payload[type];
    const cargo = maxNum($('#ct-cargo').value), tare = maxNum($('#ct-actual-tare').value), grossPlate = maxNum($('#ct-real-gross').value);
    const output = $('#ct-check-result'), calcNote = $('#ct-calc-note');
    const badInput = [cargo, tare, grossPlate].some(Number.isNaN);
    const plateConflict = pos(grossPlate) && pos(tare) && grossPlate <= tare;
    const equipmentPayload = pos(grossPlate) && pos(tare) && grossPlate > tare ? grossPlate - tare : null;
    const candidates = [published, equipmentPayload].filter(pos);
    const allowed = candidates.length ? Math.min(...candidates) : null;
    const basis = allowed === null ? '' : allowed === equipmentPayload ? 'ưu tiên tải hàng theo biển container' : 'theo trang hãng công bố';
    $('#ct-allow').textContent = allowed !== null ? fmt(allowed) + ' kg' : 'Chưa có dữ liệu';
    $('#ct-remaining').textContent = allowed !== null && Number.isFinite(cargo) ? fmt(allowed - cargo) + ' kg' : '—';
    $('#ct-estimated-gross').textContent = Number.isFinite(cargo) && pos(tare) ? fmt(cargo + tare) + ' kg' : 'Chưa nhập Tare';
    const show = (cls, title, msg) => { output.className = 'ct-check-output ' + cls; output.innerHTML = `<strong>${title}</strong><p>${msg}</p>`; };
    if (badInput || !Number.isFinite(cargo)) show('alert', 'Dữ liệu chưa hợp lệ', 'Nhập các khối lượng bằng số không âm, không vượt giới hạn nhập liệu; ô khối lượng hàng không được để trống.');
    else if (plateConflict) show('alert', 'Số trên biển vỏ chưa hợp lệ', 'Max Gross trên cửa vỏ phải lớn hơn Tare. Kiểm tra lại hai số đã nhập.');
    else if (allowed === null) show('alert', 'Chưa đủ thông số để kết luận', 'Hãng chưa có số payload cho loại vỏ này trong bảng. Nhập Max Gross và Tare đọc trên cửa vỏ, hoặc chọn hãng khác để tham khảo.');
    else if (cargo > allowed) show('alert', `Vượt mức tham khảo ${fmt(cargo - allowed)} kg`, `Tải hàng nhập (${fmt(cargo)} kg) lớn hơn mức đang dùng (${fmt(allowed)} kg, ${basis}). Cần giảm tải, chia sang vỏ khác hoặc chọn loại vỏ có payload cao hơn.`);
    else show('ok', 'Trong ngưỡng số liệu tham khảo', `Hàng ${fmt(cargo)} kg ≤ mức ${fmt(allowed)} kg (${basis}). Khi khai VGM vẫn phải cân theo phương pháp hợp lệ.`);
    const notes = [`${c.name} / ${type}. ${c.note || 'Giới hạn hãng có thể thay đổi theo tuyến.'}`];
    notes.push(pos(tare) ? 'Gross hiển thị là phép cộng từ Tare nhập tay, KHÔNG phải VGM đã xác minh. Nếu nhập cả Max Gross trên cửa, tool lấy mức payload thấp hơn để kiểm tra.' : 'Chỉ nhập Tare đã xác nhận từ cửa container để tính Gross dự tính.');
    if (pos(grossPlate) && !pos(tare)) notes.push('Đã nhập Max Gross trên cửa nhưng chưa có Tare nên chưa dùng được giới hạn theo biển vỏ.');
    calcNote.textContent = notes.join(' ');
  }

  /* Tab 4: xếp hàng & tải sàn */
  let items = loadItems();
  let lastPlan = null, lastDist = null;
  const num = v => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : NaN; };
  function renderItems() {
    $('#ct-items').innerHTML = items.map((it, i) => `<tr data-row="${i}">
      <td><input type="text" data-k="name" value="${esc(it.name)}" aria-label="Tên hàng dòng ${i + 1}" maxlength="60"></td>
      ${['l', 'w', 'h', 'kg', 'qty'].map(k => `<td><input type="number" data-k="${k}" value="${esc(it[k])}" min="0" step="1" inputmode="decimal" aria-label="${{ l: 'Dài (mm)', w: 'Rộng (mm)', h: 'Cao (mm)', kg: 'Kg mỗi kiện', qty: 'Số kiện' }[k]} dòng ${i + 1}"></td>`).join('')}
      <td class="ct-c"><input type="checkbox" data-k="stack" ${it.stack ? 'checked' : ''} aria-label="Xếp chồng dòng ${i + 1}"></td>
      <td class="ct-c"><input type="checkbox" data-k="rotate" ${it.rotate ? 'checked' : ''} aria-label="Cho xoay dòng ${i + 1}"></td>
      <td><button type="button" class="ct-link" data-remove="${i}" ${items.length < 2 ? 'disabled' : ''}>Xóa</button></td></tr>`).join('');
  }
  const payloadFor = (eq, c) => (TYPES.includes(eq.code) && pos(c.payload[eq.code])) ? c.payload[eq.code] : eq.net;
  const cleanItems = () => items.map(it => ({ ...it, l: num(it.l), w: num(it.w), h: num(it.h), kg: num(it.kg), qty: Math.floor(num(it.qty)) }));
  function renderPlan() {
    const c = carrier($('#ct-plan-carrier').value);
    const mode = $('#ct-plan-mode').value;
    const limitT = maxNum($('#ct-plan-limit').value);
    const list = cleanItems();
    const invalidRows = list.map((it, i) => (pos(it.l) && pos(it.w) && pos(it.h) && pos(it.qty) && Number.isFinite(it.kg)) ? null : i + 1).filter(Boolean);

    // So sánh loại vỏ
    const plans = PLAN_CANDIDATES.map(id => { const eq = first(id); return planLoad(list, eq, payloadFor(eq, c)); });
    const best = recommend(plans);
    $('#ct-plan-compare').innerHTML = plans.map(p => {
      const notes = [];
      if (p.issues.length) notes.push(...p.issues.map(x => `${esc(x.item.name || 'Hàng')}: ${esc(x.reasons.join(', ') || 'không xếp được')}`));
      if (p.oog.length) notes.push(...p.oog.map(esc), 'Phải báo hãng hàng quá khổ (OOG)');
      if (/OT|FR/.test(p.eq.code) && !p.oog.length) notes.push('Vỏ đặc biệt, cước và lịch thường khác vỏ khô');
      const isBest = best && p.eq.id === best.eq.id;
      return `<tr class="${isBest ? 'ct-best' : ''}"><td><button type="button" data-ct-plan-eq="${esc(p.eq.id)}" title="Xem chi tiết xếp">${esc(p.eq.code)} · ${esc(p.eq.variant)}</button>${isBest ? ' <span class="ct-chip ok">Đề xuất</span>' : ''}</td><td class="ct-num">${p.issues.length ? '<span class="ct-chip bad">Không lọt</span>' : p.containers ? p.containers + ' vỏ' : '—'}</td><td class="ct-num">${fmt(p.payload)} kg</td><td class="ct-num">${p.containers ? pct(p.totalKg / (p.containers * p.payload)) : '—'}</td><td class="ct-num">${p.containers && !p.eq.code.endsWith('FR') ? pct(p.cbm / (p.containers * p.volume)) : '—'}</td><td>${notes.length ? notes.join('<br>') : '<span class="ct-sub" style="margin:0">Lọt kích thước và cửa vỏ</span>'}</td></tr>`;
    }).join('');

    // Chi tiết một vỏ
    const eq = first($('#ct-plan-eq').value);
    const plan = planLoad(list, eq, payloadFor(eq, c));
    const dist = distribution(plan, mode, pos(limitT) ? limitT * 1000 : null);
    lastPlan = plan; lastDist = dist;
    const out = $('#ct-plan-result');
    const findings = [];
    if (invalidRows.length) findings.push(`Dòng ${invalidRows.join(', ')} thiếu hoặc sai kích thước, khối lượng, số kiện nên chưa được tính.`);
    plan.issues.forEach(x => findings.push(`${x.item.name || 'Hàng'}: ${x.reasons.join(', ') || 'không xếp được'} với ${eq.code}.`));
    plan.oog.forEach(o => findings.push(o + ' — cần khai báo hàng quá khổ với hãng.'));
    if (pos(plan.payload) && plan.totalKg > plan.payload) findings.push(`Tổng hàng ${fmt(plan.totalKg)} kg vượt payload ${fmt(plan.payload)} kg của một vỏ.`);
    if (plan.totalLen > eq.inner[0]) findings.push(`Cần ${fmtM(plan.totalLen)} chiều dài sàn, vượt lòng vỏ ${fmtM(eq.inner[0])}.`);
    const oneBox = plan.blocks.length && plan.totalLen <= eq.inner[0];
    if (oneBox && dist.maxShare > HALF_SHARE_MAX) findings.push(`${pct(dist.maxShare)} khối lượng dồn về nửa ${dist.frontShare > 0.5 ? 'phía vách đầu' : 'phía cửa'} (khuyến nghị ≤ ${pct(HALF_SHARE_MAX)}). ${mode === 'front' ? 'Thử chọn “Căn giữa chiều dài vỏ” hoặc dời hàng nặng về giữa.' : 'Dời hàng nặng về giữa vỏ.'}`);
    if (oneBox) dist.placed.filter(p => p.needM).forEach(p => findings.push(`${p.item.name || 'Hàng'}: ${fmtTm(p.kgPerM)} trên ${fmtM(p.length)}, cao hơn ${dist.userLimit ? 'giới hạn hãng' : 'mức phân bố đều'} ${fmtTm(dist.limit)}. Cần kê phân tải dọc tối thiểu khoảng ${fmt(p.needM, 2)} m hoặc xác nhận với hãng.`));
    const fail = invalidRows.length === list.length || plan.issues.length || plan.totalKg > (plan.payload || Infinity) || plan.totalLen > eq.inner[0];
    out.className = 'ct-check-output ' + (findings.length ? 'alert' : 'ok');
    const title = !plan.blocks.length ? 'Chưa có dòng hàng hợp lệ'
      : fail ? (plan.issues.length ? `Có hàng không xếp được vào ${eq.code}` : `Cần khoảng ${plan.containers} vỏ ${eq.code}`)
      : findings.length ? `Xếp được trong 1 vỏ ${eq.code}, cần lưu ý` : `Xếp được trong 1 vỏ ${eq.code}`;
    out.innerHTML = `<strong>${esc(title)}</strong>${findings.length ? `<ul>${findings.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : `<p>Trọng tâm lệch ${fmtM(Math.abs(dist.offset))} so với giữa vỏ, ${pct(dist.maxShare)} khối lượng ở nửa nặng hơn, tải sàn trong ngưỡng ${dist.userLimit ? 'hãng nhập' : 'phân bố đều'}.</p>`}`;

    // Hình bố trí
    const L = eq.inner[0];
    $('#ct-plan-visual').innerHTML = oneBox ? `<div class="ct-bar" role="img" aria-label="Bố trí hàng dọc vỏ ${esc(eq.code)}, trọng tâm cách giữa vỏ ${esc(fmtM(dist.offset))}">
        ${dist.placed.map((p, i) => `<div class="ct-blk${p.needM ? ' hot' : ''}" style="left:${p.start / L * 100}%;width:${p.length / L * 100}%;background-color:${BLOCK_COLORS[i % BLOCK_COLORS.length]}" title="${esc(p.item.name)} · ${esc(fmt(p.kg))} kg">${esc(p.item.name || 'Hàng')}</div>`).join('')}
        <div class="ct-mid" style="left:50%"></div><div class="ct-cog" style="left:${dist.cog / L * 100}%" title="Trọng tâm hàng"></div></div>
      <div class="ct-bar-legend"><span>Vách đầu</span><span>Vòng cam: trọng tâm hàng · nét đứt: giữa vỏ · sọc chéo: khối cần kê phân tải</span><span>Cửa</span></div>` : '';

    $('#ct-plan-kg').textContent = `${fmt(plan.totalKg)} / ${fmt(plan.payload)} kg`;
    $('#ct-plan-len').textContent = `${fmtM(plan.totalLen)} / ${fmtM(L)}`;
    $('#ct-plan-gross').textContent = `${fmt(plan.totalKg + eq.tare)} / ${fmt(eq.gross)} kg`;
    $('#ct-plan-blocks').innerHTML = dist.placed.length ? dist.placed.map(p => `<tr><td>${esc(p.item.name || 'Hàng')}<span class="ct-sub">${esc(fmt(p.item.qty))} kiện · ${esc(fmt(p.item.l))}×${esc(fmt(p.item.w))}×${esc(fmt(p.item.h))} mm</span></td><td>${p.perW} kiện/hàng ngang × ${p.layers} lớp<span class="ct-sub">${p.rows} hàng dọc, kiện dài ${fmt(p.len)} mm theo chiều vỏ</span></td><td class="ct-num">${fmtM(p.length)}</td><td class="ct-num">${fmt(p.kg)} kg</td><td class="ct-num">${fmtTm(p.kgPerM)}</td><td>${p.needM ? `<span class="ct-chip warn">Kê ≥ ${fmt(p.needM, 2)} m</span>` : '<span class="ct-chip ok">Trong ngưỡng</span>'}${p.oog.length ? ' <span class="ct-chip bad">Quá khổ</span>' : ''}</td></tr>`).join('')
      : '<tr><td colspan="6">Nhập ít nhất một dòng hàng hợp lệ để xem chi tiết.</td></tr>';
  }
  function printPlan() {
    if (!lastPlan) return;
    const p = lastPlan, d = lastDist, eq = p.eq, c = carrier($('#ct-plan-carrier').value);
    const result = $('#ct-plan-result').innerText;
    const rows = d.placed.map(b => `<tr><td>${esc(b.item.name)}</td><td>${esc(fmt(b.item.qty))}</td><td>${esc(fmt(b.item.l))}×${esc(fmt(b.item.w))}×${esc(fmt(b.item.h))}</td><td>${esc(fmt(b.kg))}</td><td>${b.perW}×${b.layers}, ${b.rows} hàng</td><td>${esc(fmtM(b.length))}</td><td>${esc(fmtTm(b.kgPerM))}</td></tr>`).join('');
    const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu xếp hàng container</title><style>body{font:14px/1.5 system-ui,sans-serif;color:#111;margin:24px}h1{font-size:20px;margin:0 0 4px}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #999;padding:5px 7px;text-align:left}th{background:#eee}.m{color:#555}pre{white-space:pre-wrap;font:inherit;border:1px solid #ccc;padding:8px}</style></head><body>
      <h1>Phiếu ước tính xếp hàng container</h1><div class="m">Lập ngày ${esc(dateTimeVN(new Date().toISOString()))} · Số liệu container ${esc(SOURCE_CHECKED)} · Epsilon Blue Soft</div>
      <table><tr><th>Loại vỏ</th><td>${esc(eq.code)} · ${esc(eq.variant)} (lòng ${esc(dim(eq.inner))} mm)</td></tr><tr><th>Hãng tàu tham chiếu</th><td>${esc(c.name)} · payload ${esc(fmt(p.payload))} kg</td></tr><tr><th>Tổng hàng</th><td>${esc(fmt(p.totalKg))} kg · ${esc(fmt(p.cbm, 2))} m³ · chiều dài sàn ${esc(fmtM(p.totalLen))}</td></tr><tr><th>Trọng tâm</th><td>lệch ${esc(fmtM(d.offset))} so với giữa vỏ (dương: về phía cửa) · nửa nặng hơn ${esc(pct(d.maxShare))}</td></tr><tr><th>Bố trí</th><td>${$('#ct-plan-mode').value === 'center' ? 'Căn giữa chiều dài vỏ' : 'Dồn từ vách đầu'}</td></tr></table>
      <table><thead><tr><th>Hàng</th><th>SL</th><th>Kích thước (mm)</th><th>Kg</th><th>Cách xếp</th><th>Dài khối</th><th>Tải sàn</th></tr></thead><tbody>${rows}</tbody></table>
      <pre>${esc(result)}</pre>
      <p class="m">Ước tính sơ bộ, không thay cho sơ đồ xếp, phương án chằng buộc, xác nhận booking hoặc VGM. Đối chiếu biển thông số trên cửa vỏ container thực tế.</p>
      <script>window.onload=()=>window.print()<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { ctx.showToast?.('Trình duyệt đã chặn cửa sổ in. Cho phép popup rồi thử lại.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  /* Tab 5: ISO 6346 */
  function renderIso() {
    const r = iso6346($('#ct-iso-input').value), out = $('#ct-iso-result');
    const show = (cls, html) => { out.className = 'ct-check-output ' + cls; out.innerHTML = html; };
    const parts = r => `<p>Chủ sở hữu <b>${esc(r.owner)}</b> · ${esc(ISO_CATEGORY[r.category])} (${esc(r.category)}) · số seri ${esc(r.serial)} · chữ số kiểm tra <b>${r.check}</b></p>`;
    const code = r => `<div class="ct-iso-code">${esc(r.full.slice(0, 4))} ${esc(r.full.slice(4, 10))} <b>${r.check}</b></div>`;
    if (r.state === 'empty') show('', '<strong>Nhập số container</strong><p>Gồm 4 chữ cái và 7 chữ số. Dấu cách, gạch ngang được bỏ qua.</p>');
    else if (r.state === 'format') show('alert', `<strong>Sai định dạng</strong><p>${esc(r.reason)}</p>`);
    else if (r.state === 'partial') show('', `<strong>Chữ số kiểm tra là ${r.check}</strong>${code(r)}${parts(r)}`);
    else if (r.state === 'valid') show('ok', `<strong>Số container hợp lệ</strong>${code(r)}${parts(r)}`);
    else show('alert', `<strong>Sai chữ số kiểm tra</strong><p>Số nhập kết thúc bằng ${r.given}, đúng phải là ${r.check}. Có thể gõ nhầm một ký tự; kiểm tra lại với chứng từ hoặc cửa vỏ.</p>${code(r)}${parts(r)}`);
  }

  /* Sự kiện */
  for (const b of qsa('[data-ct-tab]')) { on(b, 'click', () => activate(b.dataset.ctTab)); on(b, 'keydown', onTabKey); }
  on($('#ct-equipment'), 'change', ev => selectEquipment(ev.target.value));
  on($('#ct-equipment-table'), 'click', ev => { const b = ev.target.closest('[data-ct-equip]'); if (!b) return; selectEquipment(b.dataset.ctEquip); $('#ct-equipment').scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); });
  on($('#ct-compare-type'), 'change', renderCarrierTable);
  on($('#ct-carriers-table'), 'click', ev => { const b = ev.target.closest('[data-ct-use-carrier]'); if (!b) return; $('#ct-carrier-check').value = b.dataset.ctUseCarrier; $('#ct-type-check').value = $('#ct-compare-type').value; activate('check'); renderCheck(); });
  for (const id of ['ct-carrier-check', 'ct-type-check', 'ct-cargo', 'ct-actual-tare', 'ct-real-gross']) on($('#' + id), 'input', renderCheck);
  on($('#ct-export'), 'click', exportCSV);

  on($('#ct-items'), 'input', ev => {
    const tr = ev.target.closest('[data-row]'), k = ev.target.dataset.k; if (!tr || !k) return;
    const it = items[Number(tr.dataset.row)];
    it[k] = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.type === 'number' ? ev.target.value : ev.target.value.slice(0, 60);
    saveItems(items); renderPlan();
  });
  on($('#ct-items'), 'click', ev => {
    const b = ev.target.closest('[data-remove]'); if (!b || items.length < 2) return;
    items.splice(Number(b.dataset.remove), 1); saveItems(items); renderItems(); renderPlan();
  });
  on($('#ct-add-item'), 'click', () => {
    if (items.length >= 50) return;
    items.push({ name: 'Hàng ' + (items.length + 1), l: 1000, w: 1000, h: 1000, kg: 500, qty: 1, stack: false, rotate: true });
    saveItems(items); renderItems(); renderPlan();
    $('#ct-items').querySelector(`[data-row="${items.length - 1}"] input`)?.focus();
  });
  on($('#ct-reset-items'), 'click', () => { items = DEFAULT_ITEMS.map(x => ({ ...x })); saveItems(items); renderItems(); renderPlan(); });
  for (const id of ['ct-plan-carrier', 'ct-plan-mode', 'ct-plan-limit', 'ct-plan-eq']) on($('#' + id), 'input', renderPlan);
  on($('#ct-plan-compare'), 'click', ev => { const b = ev.target.closest('[data-ct-plan-eq]'); if (!b) return; $('#ct-plan-eq').value = b.dataset.ctPlanEq; renderPlan(); $('#ct-plan-eq').scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); });
  on($('#ct-print'), 'click', printPlan);
  on($('#ct-iso-input'), 'input', renderIso);

  renderEquipTable(); selectEquipment('20gp-h'); renderCarrierTable(); renderCheck();
  renderItems(); renderPlan(); renderIso(); activate('plan');
}
