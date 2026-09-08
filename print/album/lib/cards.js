const { baseCss, esc } = require('./styles');

const SHEETS = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  SRA3: { w: 320, h: 450 },
};

// Card dimensions come from team.json (cards.width / cards.height / cards.bleed), resolved in data.js.
// Default 55 x 77 mm: nine of them fit on an A4 album page, same as the reference album.
function cardCss(size) {
  const { w, h, bleed: B } = size;
  const W = w + B * 2;
  const H = h + B * 2;
  const s = w / 63.5; // typography scale relative to a standard 63.5 mm card
  const mm = (v) => `${(v * s).toFixed(2)}mm`;
  const inset = `${(B + 2.6 * s).toFixed(2)}mm`;
  const pad = (B + 4 * s).toFixed(2);
  return `
.card{position:relative;width:${W}mm;height:${H}mm;overflow:hidden;background:#fff;color:#fff;}
/* ---- FRONT ---- */
.card.front{background:#fff;}
.card.front .accents{position:absolute;inset:0;width:100%;height:100%;display:block;}
.card.front .photo{position:absolute;left:${inset};top:${inset};right:${inset};bottom:${inset};overflow:hidden;background:#dfe6ee;
  clip-path:polygon(${mm(13)} 0,100% 0,100% calc(100% - ${mm(13)}),calc(100% - ${mm(13)}) 100%,0 100%,0 ${mm(13)});}
.card.front .photo img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;}
.card.front.team .photo img,.card.front.club .photo img{object-position:center center;}
.card.front .photo::after{content:"";position:absolute;inset:0;box-shadow:inset 0 0 0 .45mm var(--primary);
  clip-path:polygon(${mm(13)} 0,100% 0,100% calc(100% - ${mm(13)}),calc(100% - ${mm(13)}) 100%,0 100%,0 ${mm(13)});}
.card.front .num sup{font-size:38%;vertical-align:top;position:relative;top:${mm(1.2)};margin-left:${mm(0.4)};-webkit-text-stroke:${mm(0.35)} var(--primary);}
.card.front .num{position:absolute;right:${(B + 3.4 * s).toFixed(2)}mm;top:${(B + 2.4 * s).toFixed(2)}mm;font-family:'Oswald';font-weight:700;font-size:${mm(13.5)};line-height:1;color:#fff;
  -webkit-text-stroke:${mm(0.55)} var(--primary);paint-order:stroke fill;filter:drop-shadow(0 .5mm 1mm rgba(0,0,0,.35));}
.card.front .logo{position:absolute;left:${(B + 3.2 * s).toFixed(2)}mm;bottom:${(B + 3.2 * s).toFixed(2)}mm;width:${mm(10)};height:${mm(10)};z-index:2;}
.card.front .logo img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 .4mm .8mm rgba(0,0,0,.5));}
.card.front .plate{position:absolute;left:${inset};right:${inset};bottom:${inset};padding:${mm(10)} ${mm(3)} ${mm(3.2)} ${mm(3)};
  background:linear-gradient(180deg,rgba(8,10,16,0) 0%,rgba(8,10,16,.55) 35%,rgba(8,10,16,.92) 100%);
  clip-path:polygon(0 0,100% 0,100% calc(100% - ${mm(13)}),calc(100% - ${mm(13)}) 100%,0 100%);}
.card.front.haslogo .plate{padding-left:${mm(14.5)};}
.card.front .plate .nm{font-family:'Oswald';font-weight:700;text-transform:uppercase;font-size:${mm(4.8)};line-height:1.02;text-shadow:0 .3mm .6mm rgba(0,0,0,.6);word-break:break-word;}
.card.front .plate .nm small{display:block;font-weight:500;font-size:${mm(3.5)};opacity:.95;margin-top:.3mm;}
.card.front .plate .pos{margin-top:${mm(1.2)};font-family:'Roboto';font-weight:500;font-size:${mm(2.5)};letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.92);}
.card.front .plate .pos::before{content:"";display:inline-block;width:${mm(5)};height:.6mm;background:var(--secondary);vertical-align:middle;margin-right:1.5mm;}
.card.front.coach .plate .pos::before{background:var(--accent);}
.card.front.coach .plate .pos{color:var(--accent);}
.card.front .ribbon{position:absolute;left:${(B + 3.2 * s).toFixed(2)}mm;top:${(B + 3.2 * s).toFixed(2)}mm;background:var(--accent);color:var(--dark);font-family:'Oswald';font-weight:700;
  text-transform:uppercase;font-size:${mm(2.6)};letter-spacing:.1em;padding:${mm(0.8)} ${mm(2)};transform:skewX(-10deg);box-shadow:0 .4mm .8mm rgba(0,0,0,.35);}
.card.front .ribbon span{display:inline-block;transform:skewX(10deg);}
/* ---- BACK ---- */
.card.back{background:var(--primary);}
.card.back .bg{position:absolute;inset:0;background:
  repeating-linear-gradient(115deg, rgba(255,255,255,.05) 0 1.2mm, transparent 1.2mm 8mm),
  radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.18), transparent 60%),
  linear-gradient(180deg,var(--primary),var(--dark));}
.card.back .band{position:absolute;left:-10mm;right:-10mm;height:${mm(7)};transform:rotate(-8deg);}
.card.back .band.top{top:${(B + 15 * s).toFixed(2)}mm;background:var(--secondary);opacity:.95;}
.card.back .band.top2{top:${(B + 21 * s).toFixed(2)}mm;height:${mm(1.5)};background:#fff;opacity:.5;}
.card.back .head{position:absolute;left:${pad}mm;right:${pad}mm;top:${(B + 3.5 * s).toFixed(2)}mm;display:flex;align-items:center;gap:${mm(2.5)};}
.card.back .head img{width:${mm(10)};height:${mm(10)};object-fit:contain;}
.card.back .head .t{font-family:'Oswald';font-weight:700;text-transform:uppercase;font-size:${mm(4)};line-height:1.05;}
.card.back .head .t small{display:block;font-family:'Roboto';font-weight:400;text-transform:none;font-size:${mm(2.4)};opacity:.8;margin-top:.6mm;}
.card.back .bignum{position:absolute;right:${(B + 3 * s).toFixed(2)}mm;top:${(B + 24 * s).toFixed(2)}mm;font-family:'Oswald';font-weight:700;font-size:${mm(30)};line-height:1;color:rgba(255,255,255,.08);}
.card.back .who{position:absolute;left:${pad}mm;right:${pad}mm;top:${(B + 27 * s).toFixed(2)}mm;}
.card.back .who .nm{font-family:'Oswald';font-weight:700;text-transform:uppercase;font-size:${mm(5.4)};line-height:1.05;}
.card.back .who .nm span{color:var(--accent);margin-right:1.5mm;}
.card.back .who .nm sup{font-size:50%;vertical-align:top;position:relative;top:${mm(0.6)};}
.card.back .who .pos{font-family:'Roboto';font-weight:500;font-size:${mm(2.7)};letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.85);margin-top:1.2mm;}
.card.back table{position:absolute;left:${pad}mm;right:${pad}mm;top:${(B + 41 * s).toFixed(2)}mm;width:calc(100% - ${pad * 2}mm);border-collapse:collapse;font-size:${mm(2.9)};}
.card.back td{padding:${mm(1.1)} 0;border-bottom:.2mm solid rgba(255,255,255,.18);line-height:1.15;}
.card.back td:first-child{font-family:'Roboto';font-weight:400;text-transform:uppercase;letter-spacing:.1em;font-size:${mm(2.4)};color:rgba(255,255,255,.7);}
.card.back td:last-child{text-align:right;font-family:'Oswald';font-weight:600;font-size:${mm(3.6)};}
.card.back .foot{position:absolute;left:${pad}mm;right:${pad}mm;bottom:${(B + 3.5 * s).toFixed(2)}mm;display:flex;align-items:center;justify-content:space-between;}
.card.back .foot img{height:${mm(4.2)};}
.card.back .foot .idx{font-family:'Oswald';font-weight:600;font-size:${mm(3.2)};color:rgba(255,255,255,.85);}
.card.back .foot .idx b{color:var(--accent);}
`;
}

// Corner accents drawn as SVG in card millimetres so they land exactly under the cut photo corners.
// A band is the strip between the lines x+y=a and x+y=b; the upper-right half is recoloured with the primary colour.
function accentSvg(size, colors) {
  const { w, h, bleed: B } = size;
  const W = w + B * 2;
  const H = h + B * 2;
  const s = w / 63.5;
  const inset = B + 2.6 * s;
  const cut = 13 * s;
  const d = 2 * inset + cut; // the diagonal cut line x + y = d (top-left corner)
  const band = (a, b, c1, c2, k) => {
    const main = `<polygon points="${a},0 ${b},0 0,${b} 0,${a}" fill="${c1}"/>`;
    const split = `<polygon points="${(a + k) / 2},${(a - k) / 2} ${(b + k) / 2},${(b - k) / 2} ${b},0 ${a},0" fill="${c2}"/>`;
    return main + split;
  };
  const tl = band(d - 6.2 * s, d - 0.6 * s, colors.secondary, colors.primary, 3 * s) + band(d - 9.6 * s, d - 7.6 * s, colors.primary, colors.primary, 0);
  return `<svg class="accents" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <g>${tl}</g>
    <g transform="translate(${W} ${H}) rotate(180)">${band(d - 6.2 * s, d - 0.6 * s, colors.primary, colors.secondary, -3 * s) + band(d - 9.6 * s, d - 7.6 * s, colors.secondary, colors.secondary, 0)}</g>
  </svg>`;
}

function nameHtml(card) {
  const surname = esc(card.surname).toUpperCase();
  const name = esc(card.name).toUpperCase();
  return `${surname}${name ? ` <small>${name}</small>` : ''}`;
}

function cardFront(card, data) {
  const logo = data.assets.logo ? `<div class="logo"><img src="${data.assets.logo}"></div>` : '';
  const num = card.number ? `<div class="num">${esc(card.number)}${card.role ? `<sup>${esc(card.role)}</sup>` : ''}</div>` : '';
  const ribbon = card.ribbon ? `<div class="ribbon"><span>${esc(card.ribbon)}</span></div>` : '';
  const cls = ['card', 'front', card.type, data.assets.logo ? 'haslogo' : ''].filter(Boolean).join(' ');
  return `<div class="${cls}">
    ${accentSvg(data.cardSize, data.colors)}
    <div class="photo"><img src="${card.photo}"></div>
    ${ribbon}${logo}${num}
    <div class="plate">
      <div class="nm">${nameHtml(card)}</div>
      <div class="pos">${esc(card.position)}</div>
    </div>
  </div>`;
}

function cardBack(card, data) {
  const t = data.team;
  const total = data.cards.length;
  const rows = [];
  if (card.position) rows.push(['Амплуа', card.position]);
  if (card.role) rows.push(['Роль', card.role === 'К' ? 'Капитан' : 'Ассистент капитана']);
  if (card.height) rows.push(['Рост', card.height + (/\d$/.test(card.height) ? ' см' : '')]);
  if (card.weight) rows.push(['Вес', card.weight + (/\d$/.test(card.weight) ? ' кг' : '')]);
  if (card.grip) rows.push(['Хват', card.grip]);
  if (card.birthdate) rows.push(['Дата рождения', card.birthdate]);
  const logo = data.assets.logo ? `<img src="${data.assets.logo}">` : '';
  return `<div class="card back">
    <div class="bg"></div>
    <div class="band top"></div><div class="band top2"></div>
    <div class="head">${logo}<div class="t">${esc(t.name)}<small>${esc(t.city || '')}${t.city ? ' · ' : ''}Сезон ${esc(t.season)}</small></div></div>
    ${card.number ? `<div class="bignum">${esc(card.number)}</div>` : ''}
    <div class="who">
      <div class="nm">${card.number ? `<span>#${esc(card.number)}${card.role ? `<sup>${esc(card.role)}</sup>` : ''}</span>` : ''}${esc(card.surname).toUpperCase()}<br>${esc(card.name).toUpperCase()}</div>
    </div>
    <table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
    <div class="foot"><img src="${data.brand.hockeystarsWhite}"><div class="idx"><b>${card.index}</b> / ${total}</div></div>
  </div>`;
}

function gridFor(sheet, size) {
  const cw = size.w + size.bleed * 2;
  const ch = size.h + size.bleed * 2;
  // Gutter equals 2x bleed so that neighbouring cards never share bleed area.
  const gutter = size.bleed * 2;
  const minMargin = 4;
  const cols = Math.max(1, Math.floor((sheet.w - minMargin * 2 + gutter) / (cw + gutter)));
  const rows = Math.max(1, Math.floor((sheet.h - minMargin * 2 + gutter) / (ch + gutter)));
  const gridW = cols * cw + (cols - 1) * gutter;
  const gridH = rows * ch + (rows - 1) * gutter;
  return { cols, rows, cw, ch, gutter, gridW, gridH, mx: (sheet.w - gridW) / 2, my: (sheet.h - gridH) / 2 };
}

function cropMarks(g, size) {
  // Trim lines of every card, drawn only in the outer margins so they never touch artwork.
  const len = Math.max(1.5, Math.min(3.5, g.mx - 0.5, g.my - 0.5));
  const parts = [];
  for (let c = 0; c < g.cols; c++) {
    const x0 = g.mx + c * (g.cw + g.gutter) + size.bleed;
    for (const x of [x0, x0 + size.w]) {
      parts.push(`<div class="mark v" style="left:${x}mm;top:0;height:${len}mm"></div>`);
      parts.push(`<div class="mark v" style="left:${x}mm;bottom:0;height:${len}mm"></div>`);
    }
  }
  for (let r = 0; r < g.rows; r++) {
    const y0 = g.my + r * (g.ch + g.gutter) + size.bleed;
    for (const y of [y0, y0 + size.h]) {
      parts.push(`<div class="mark h" style="top:${y}mm;left:0;width:${len}mm"></div>`);
      parts.push(`<div class="mark h" style="top:${y}mm;right:0;width:${len}mm"></div>`);
    }
  }
  return parts.join('');
}

function cardsHtml(data, opts = {}) {
  const size = data.cardSize;
  const sheetName = (opts.sheet || data.team.cards?.sheet || 'A4').toUpperCase();
  const layout = opts.layout || data.team.cards?.layout || 'sheet';
  const sheet = SHEETS[sheetName] || SHEETS.A4;
  const total = data.cards.length;
  const cw = size.w + size.bleed * 2;
  const ch = size.h + size.bleed * 2;

  let pages = '';
  let pageSize;
  if (layout === 'single') {
    pageSize = `${cw}mm ${ch}mm`;
    for (const card of data.cards) {
      pages += `<section class="page single">${cardFront(card, data)}</section>`;
      pages += `<section class="page single">${cardBack(card, data)}</section>`;
    }
  } else {
    pageSize = `${sheet.w}mm ${sheet.h}mm`;
    const g = gridFor(sheet, size);
    const perSheet = g.cols * g.rows;
    const marks = cropMarks(g, size);
    const labelTop = Math.max(4.2, g.my - 4.5);
    for (let s = 0; s < Math.ceil(total / perSheet); s++) {
      const chunk = data.cards.slice(s * perSheet, (s + 1) * perSheet);
      const place = (i, mirror) => {
        const r = Math.floor(i / g.cols);
        const c = mirror ? g.cols - 1 - (i % g.cols) : i % g.cols;
        return `left:${g.mx + c * (g.cw + g.gutter)}mm;top:${g.my + r * (g.ch + g.gutter)}mm`;
      };
      const label = (side) =>
        `<div class="sheetlabel" style="top:${labelTop}mm">${esc(data.team.name)} · ${esc(data.team.season)} · карточки ${s * perSheet + 1}–${s * perSheet + chunk.length} · лист ${s + 1} · ${side}</div>`;
      pages += `<section class="page sheet">${marks}${label('ЛИЦО')}${chunk
        .map((card, i) => `<div class="slot" style="${place(i, false)}">${cardFront(card, data)}</div>`)
        .join('')}</section>`;
      pages += `<section class="page sheet">${marks}${label('ОБОРОТ · зеркально для двусторонней печати с переворотом по длинной стороне')}${chunk
        .map((card, i) => `<div class="slot" style="${place(i, true)}">${cardBack(card, data)}</div>`)
        .join('')}</section>`;
    }
  }

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
${baseCss(data.colors)}
${cardCss(size)}
@page{size:${pageSize};margin:0;}
.page{position:relative;page-break-after:always;overflow:hidden;background:#fff;}
.page.sheet{width:${sheet.w}mm;height:${sheet.h}mm;}
.page.single{width:${cw}mm;height:${ch}mm;}
.slot{position:absolute;}
.mark{position:absolute;background:#000;}
.mark.v{width:.15mm;}
.mark.h{height:.15mm;}
.sheetlabel{position:absolute;left:0;right:0;text-align:center;font-size:2.2mm;color:#333;letter-spacing:.04em;}
</style></head><body>${pages}</body></html>`;
}

module.exports = { cardsHtml, cardFront, cardBack, cardCss };
