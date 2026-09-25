const { baseCss, esc } = require('./styles');

const SHEETS = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  SRA3: { w: 320, h: 450 },
};

function stickerCss(size) {
  const { w, h, bleed: B } = size;
  const W = w + B * 2;
  const H = h + B * 2;
  return `
.sticker{position:relative;width:${W}mm;height:${H}mm;overflow:hidden;background:#fff;color:var(--dark);}
.sticker .frame{position:absolute;inset:${B}mm;border-radius:2mm;overflow:hidden;
  border:.45mm solid color-mix(in srgb,var(--primary) 70%,#fff);
  box-shadow:inset 0 0 0 .35mm var(--secondary);}
.sticker .frame::before{content:"";position:absolute;left:0;top:0;bottom:0;width:1.2mm;background:var(--secondary);z-index:2;}
.sticker .frame::after{content:"";position:absolute;right:0;top:0;bottom:0;width:1.2mm;background:var(--primary);z-index:2;}
.sticker .photo{position:absolute;left:${B + 1.2}mm;top:${B + 1.2}mm;right:${B + 1.2}mm;bottom:${B + 14}mm;overflow:hidden;background:#e4eaf0;}
.sticker .photo img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;}
.sticker .num{position:absolute;left:${B + 2}mm;right:${B + 2}mm;top:${B + 2.5}mm;text-align:center;font-family:'Unbounded';font-weight:800;font-size:6.5mm;line-height:1;color:var(--secondary);
  -webkit-text-stroke:.35mm var(--primary);paint-order:stroke fill;text-shadow:0 .3mm .6mm rgba(255,255,255,.9);z-index:3;}
.sticker .bar{position:absolute;left:${B}mm;right:${B}mm;bottom:${B}mm;height:13mm;background:linear-gradient(180deg,var(--primary),var(--dark));z-index:3;
  display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 1.5mm;text-align:center;}
.sticker .bar .nm{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:3.2mm;line-height:1.05;color:#fff;}
.sticker .bar .pos{font-family:'Roboto';font-weight:500;font-size:2.2mm;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.85);margin-top:.4mm;}
.sticker.coach .num{font-size:4.2mm;}
.sticker.wide .photo img{object-position:center center;}
.sticker.ghost .frame{border-style:dashed;border-color:color-mix(in srgb,var(--primary) 45%,#bbb);box-shadow:none;}
.sticker.ghost .photo{filter:blur(.4mm);opacity:.85;}
.sticker.ghost .bar{opacity:.75;}
`;
}

function stickerName(card) {
  const surname = esc(card.surname).toUpperCase();
  const name = esc(card.name).toUpperCase();
  const fs = Math.min(3.2, 28 / Math.max(surname.length + name.length + 1, 1) * 3.2);
  return `<div class="nm" style="font-size:${fs.toFixed(2)}mm">${surname}${name ? `<br>${name}` : ''}</div>`;
}

function stickerFront(card, data, opts = {}) {
  const size = data.stickerSize;
  const ghost = opts.ghost ? ' ghost' : '';
  const num = card.number
    ? `<div class="num">#${esc(card.number)}${card.role ? esc(card.role) : ''}</div>`
    : card.type === 'coach' || card.type === 'staff'
      ? `<div class="num">${esc((card.position || 'Тренер').split(' ')[0])}</div>`
      : '';
  const pos = card.position && card.type !== 'club' ? `<div class="pos">${esc(card.position)}</div>` : '';
  const cls = ['sticker', card.type, ghost, card.photoAspect > 1.1 ? 'wide' : ''].filter(Boolean).join(' ');
  const photo = opts.ghost ? card.photoSmall || card.photo : card.photo;
  return `<div class="${cls}">
    <div class="frame">
      <div class="photo"><img src="${photo}"></div>
      ${num}
      <div class="bar">${stickerName(card)}${pos}</div>
    </div>
  </div>`;
}

function gridFor(sheet, size) {
  const cw = size.w + size.bleed * 2;
  const ch = size.h + size.bleed * 2;
  const gutter = size.bleed * 2;
  const minMargin = 4;
  const cols = Math.max(1, Math.floor((sheet.w - minMargin * 2 + gutter) / (cw + gutter)));
  const rows = Math.max(1, Math.floor((sheet.h - minMargin * 2 + gutter) / (ch + gutter)));
  const gridW = cols * cw + (cols - 1) * gutter;
  const gridH = rows * ch + (rows - 1) * gutter;
  return { cols, rows, cw, ch, gutter, gridW, gridH, mx: (sheet.w - gridW) / 2, my: (sheet.h - gridH) / 2 };
}

function cropMarks(g, size) {
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

function stickersHtml(data, opts = {}) {
  const size = data.stickerSize;
  const sheetName = (opts.sheet || data.team.stickers?.sheet || 'SRA3').toUpperCase();
  const layout = opts.layout || data.team.stickers?.layout || 'sheet';
  const sheet = SHEETS[sheetName] || SHEETS.SRA3;
  const all = data.allStickers || data.cards;
  const total = all.length;
  const cw = size.w + size.bleed * 2;
  const ch = size.h + size.bleed * 2;

  let pages = '';
  let pageSize;
  if (layout === 'single') {
    pageSize = `${cw}mm ${ch}mm`;
    for (const sticker of all) {
      pages += `<section class="page single"><div class="slot">${stickerFront(sticker, data)}</div></section>`;
    }
  } else {
    pageSize = `${sheet.w}mm ${sheet.h}mm`;
    const g = gridFor(sheet, size);
    const perSheet = g.cols * g.rows;
    const marks = cropMarks(g, size);
    const labelTop = Math.max(4.2, g.my - 4.5);
    for (let s = 0; s < Math.ceil(total / perSheet); s++) {
      const chunk = all.slice(s * perSheet, (s + 1) * perSheet);
      const place = (i) => {
        const r = Math.floor(i / g.cols);
        const c = i % g.cols;
        return `left:${g.mx + c * (g.cw + g.gutter)}mm;top:${g.my + r * (g.ch + g.gutter)}mm`;
      };
      const label = `<div class="sheetlabel" style="top:${labelTop}mm">${esc(data.team.name)} · наклейки ${s * perSheet + 1}–${s * perSheet + chunk.length} · лист ${s + 1}</div>`;
      pages += `<section class="page sheet">${marks}${label}${chunk
        .map((sticker, i) => `<div class="slot" style="${place(i)}">${stickerFront(sticker, data)}</div>`)
        .join('')}</section>`;
    }
  }

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
${baseCss(data.colors)}
${stickerCss(size)}
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

module.exports = { stickersHtml, stickerFront, stickerCss };
