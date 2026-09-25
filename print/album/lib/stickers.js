const { baseCss, esc } = require('./styles');

const SHEETS = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  SRA3: { w: 320, h: 450 },
};

// Panini-style sticker: full-bleed portrait, navy name plate with a red rule, jersey number in a red tab,
// club logo in the plate. The trim frame is a thin white keyline so cut tolerance never eats into the photo.
function stickerCss(size) {
  const { w, h, bleed: B } = size;
  const W = w + B * 2;
  const H = h + B * 2;
  const plate = h * 0.27;
  return `
.sticker{position:relative;width:${W}mm;height:${H}mm;overflow:hidden;background:var(--primary);color:#fff;}
.sticker .frame{position:absolute;inset:0;overflow:hidden;}
.sticker .photo{position:absolute;inset:0;bottom:${B + plate - 1}mm;overflow:hidden;background:linear-gradient(180deg,#e9eef4,#c7d3e0);}
.sticker .photo img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;}
.sticker .photo::after{content:"";position:absolute;left:0;right:0;bottom:0;height:6mm;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--primary) 55%,transparent));}
.sticker .plate{position:absolute;left:0;right:0;bottom:0;height:${B + plate}mm;background:linear-gradient(180deg,var(--primary) 0%,var(--dark) 100%);
  border-top:.7mm solid var(--secondary);padding:${1.4}mm ${B + 1.6}mm ${B}mm ${B + 1.8}mm;display:flex;flex-direction:column;justify-content:center;}
.sticker .plate::before{content:"";position:absolute;left:0;top:-.7mm;width:38%;height:.7mm;background:#fff;}
.sticker .nm{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;line-height:1.02;color:#fff;letter-spacing:.01em;padding-right:${w * 0.2}mm;}
.sticker .nm small{display:block;font-weight:500;letter-spacing:.03em;opacity:.95;margin-top:.3mm;}
.sticker .pos{font-family:'Roboto';font-weight:500;font-size:${(w * 0.05).toFixed(2)}mm;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--secondary) 45%,#fff);margin-top:${(h * 0.014).toFixed(2)}mm;padding-right:${w * 0.2}mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sticker .plogo{position:absolute;right:${B + 1.4}mm;bottom:${B + 1.2}mm;width:${(w * 0.17).toFixed(2)}mm;height:${(w * 0.17).toFixed(2)}mm;}
.sticker .plogo img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 .3mm .6mm rgba(0,0,0,.5));}
.sticker .num{position:absolute;left:${B}mm;top:${B}mm;min-width:${(w * 0.24).toFixed(2)}mm;height:${(h * 0.16).toFixed(2)}mm;padding:0 ${(w * 0.04).toFixed(2)}mm;background:var(--secondary);color:#fff;font-family:'Unbounded';font-weight:800;
  font-size:${(h * 0.09).toFixed(2)}mm;line-height:${(h * 0.16).toFixed(2)}mm;text-align:center;border-radius:0 0 1.2mm 0;box-shadow:0 .5mm 1mm rgba(0,0,0,.3);}
.sticker .num sup{font-size:55%;vertical-align:top;position:relative;top:-.2mm;margin-left:.2mm;}
.sticker .idx{position:absolute;right:${B + 1}mm;top:${B + .8}mm;font-family:'Roboto';font-weight:700;font-size:${(h * 0.045).toFixed(2)}mm;color:#fff;text-shadow:0 0 .8mm rgba(0,0,0,.8);opacity:.9;}
.sticker.coach .plate,.sticker.staff .plate{background:linear-gradient(180deg,var(--secondary) 0%,#8d0020 100%);border-top-color:#fff;}
.sticker.coach .plate::before,.sticker.staff .plate::before{background:var(--primary);}
.sticker.coach .pos,.sticker.staff .pos{color:rgba(255,255,255,.85);}
.sticker.team .photo,.sticker.club .photo{bottom:0;} .sticker.team .photo img,.sticker.club .photo img{object-position:center center;}
.sticker.team .plate,.sticker.club .plate{background:linear-gradient(90deg,var(--dark) 0%,var(--primary) 55%,transparent 100%);border-top:0;height:${B + h * 0.3}mm;justify-content:flex-end;}
.sticker.team .plate::before,.sticker.club .plate::before{display:none;}
.sticker.wide .photo img{object-position:center center;}
.sticker.ghost .photo::after{display:none;}
`;
}

function stickerName(card, size) {
  const w = size.w;
  const surname = esc(card.surname).toUpperCase();
  const first = card.type === 'coach' || card.type === 'staff' ? esc(card.name.split(' ')[0]).toUpperCase() : esc(card.name).toUpperCase();
  const patronymic = card.type === 'coach' || card.type === 'staff' ? esc(card.name.split(' ').slice(1).join(' ')).toUpperCase() : '';
  const base = w * 0.1; // 4 mm on a 40 mm sticker
  const big = Math.min(base, (w * 0.72) / Math.max(surname.length, 1) * 1.85);
  const smallSize = Math.min(base * 0.7, (w * 0.72) / Math.max(first.length + patronymic.length + 1, 1) * 1.7);
  return `<div class="nm" style="font-size:${big.toFixed(2)}mm">${surname}${first ? `<small style="font-size:${smallSize.toFixed(2)}mm">${first}${patronymic ? ' ' + patronymic : ''}</small>` : ''}</div>`;
}

function stickerFront(card, data, opts = {}) {
  const size = card.type === 'team' && data.stickerSize.teamW ? { w: data.stickerSize.teamW, h: data.stickerSize.teamH, bleed: data.stickerSize.bleed } : data.stickerSize;
  const ghost = opts.ghost ? ' ghost' : '';
  const num = card.number ? `<div class="num">${esc(card.number)}${card.role ? `<sup>${esc(card.role)}</sup>` : ''}</div>` : '';
  const pos = card.position && card.type !== 'club' && card.type !== 'team' ? `<div class="pos">${esc(card.position)}</div>` : card.type === 'team' ? `<div class="pos">${esc(card.position || '')}</div>` : '';
  const cls = ['sticker', card.type, ghost, card.photoAspect > 1.1 ? 'wide' : ''].filter(Boolean).join(' ');
  const photo = opts.ghost ? card.photoSmall || card.photo : card.photo;
  const logo = data.assets.logo && !opts.ghost ? `<div class="plogo"><img src="${data.assets.logo}"></div>` : '';
  const style = card.type === 'team' ? `style="width:${size.w + size.bleed * 2}mm;height:${size.h + size.bleed * 2}mm"` : '';
  return `<div class="${cls}" ${style}>
    <div class="frame">
      <div class="photo"><img src="${photo}"></div>
      ${num}
      ${opts.ghost ? '' : `<div class="idx">${card.index}</div>`}
      <div class="plate">${stickerName(card, size)}${pos}</div>
      ${logo}
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
  const all = (data.allStickers || data.cards).filter((c) => c.type !== 'team');
  const teamStickers = (data.allStickers || data.cards).filter((c) => c.type === 'team');
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
    // Wide team-photo stickers: stacked on their own sheet(s), one column.
    if (teamStickers.length) {
      const tw = size.teamW + size.bleed * 2;
      const th = size.teamH + size.bleed * 2;
      const gutter = size.bleed * 2;
      const perSheet = Math.floor((sheet.h - 8 + gutter) / (th + gutter));
      for (let s = 0; s < Math.ceil(teamStickers.length / perSheet); s++) {
        const chunk = teamStickers.slice(s * perSheet, (s + 1) * perSheet);
        const my = (sheet.h - (chunk.length * th + (chunk.length - 1) * gutter)) / 2;
        const mx = (sheet.w - tw) / 2;
        pages += `<section class="page sheet"><div class="sheetlabel" style="top:4.2mm">${esc(data.team.name)} · командные наклейки ${size.teamW}×${size.teamH} мм · лист ${s + 1}</div>${chunk
          .map((sticker, i) => `<div class="slot" style="left:${mx}mm;top:${my + i * (th + gutter)}mm">${stickerFront(sticker, data)}</div>`)
          .join('')}</section>`;
      }
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
