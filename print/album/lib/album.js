const { baseCss, esc } = require('./styles');
const { cardFront, cardCss } = require('./cards');
const { rinkSvg, puckSvg, sticksSvg, goalSvg, scratchesSvg } = require('./hockey');

function puckFactFontSize(text) {
  const len = String(text).length;
  if (len > 6) return 3.6;
  if (len > 4) return 4.1;
  return 4.7;
}

function puckLabelHtml(data, text, opts = {}) {
  const { orange = false, black = false, index = 0, fontSize } = opts;
  const useOrange = orange || (!black && index % 2 === 1);
  const src = useOrange ? data.assets.puckOrange || data.assets.puck : data.assets.puckBlack || data.assets.puck;
  const puck = src
    ? `<img class="puck-photo" src="${src}" alt="">`
    : puckSvg(useOrange ? data.colors.secondary : data.colors.dark, 'rgba(255,255,255,.55)');
  const fs = fontSize ?? puckFactFontSize(text);
  return `<span class="puck-label">${puck}<b style="font-size:${fs}mm">${esc(String(text))}</b></span>`;
}

const PAGE = { w: 210, h: 297, bleed: 3 };
// Slots per "Команда" page: always 3 columns; rows depend on the card height (3 rows for 55x77, 2 rows for 60x85).
// Each slot is exactly the card size so the card can be fixed with photo corners; the caption sits below the slot.
const SLOT_COLS = 3;
const SLOT_GAP = 7;
const CAPTION_H = 9;
// Dense mode (3 rows of 60x85 on A4): compact header, 4 mm between slots, caption printed inside the slot.
const DENSE = { header: 25, gap: 4, bottom: 7 };
function denseRows(size) {
  return Math.floor((PAGE.h - DENSE.header - DENSE.bottom + DENSE.gap) / (size.h + DENSE.gap));
}
function isDense(size) {
  return denseRows(size) >= 3;
}
function slotRows(size) {
  if (isDense(size)) return denseRows(size);
  const avail = PAGE.h - 36 - 12;
  return Math.max(1, Math.floor((avail + SLOT_GAP) / (size.h + CAPTION_H + SLOT_GAP)));
}
function gridGap(size) {
  if (isDense(size)) return DENSE.gap;
  const rows = slotRows(size);
  const free = PAGE.h - 36 - 14 - rows * (size.h + CAPTION_H);
  return rows > 1 ? Math.min(22, Math.max(SLOT_GAP, free / (rows - 1) - 8)) : SLOT_GAP;
}
function gridTop(size) {
  if (isDense(size)) return DENSE.header;
  const rows = slotRows(size);
  const content = rows * (size.h + CAPTION_H) + (rows - 1) * gridGap(size);
  return 36 + Math.max(0, (PAGE.h - 36 - 14 - content) / 2);
}
function slotsPerPage(size) {
  return SLOT_COLS * slotRows(size);
}

function albumCss(data) {
  const { w, h, bleed } = PAGE;
  const size = data.cardSize;
  return `
${baseCss(data.colors)}
${cardCss(size)}
@page{size:${w + bleed * 2}mm ${h + bleed * 2}mm;margin:0;}
.page{position:relative;width:${w + bleed * 2}mm;height:${h + bleed * 2}mm;overflow:hidden;page-break-after:always;background:#fff;}
.safe{position:absolute;left:${bleed + 7}mm;top:${bleed + 7}mm;right:${bleed + 7}mm;bottom:${bleed + 7}mm;}
.pgnum{position:absolute;bottom:${bleed + 3}mm;font-family:'Fira Sans Extra Condensed';font-weight:600;font-size:3.2mm;color:var(--primary);opacity:.8;}
.pgnum.l{left:${bleed + 8}mm;} .pgnum.r{right:${bleed + 8}mm;}
/* page background: raster ice photo (assets/bg-ice.jpg) + light wash; vector rink stays very faint on top */
.page.ice{background:#dce8f2;}
.page.ice:has(.bgimg){background:linear-gradient(180deg,rgba(255,255,255,.35) 0%,rgba(220,232,242,.25) 100%);}
.bgimg{position:absolute;inset:0;overflow:hidden;opacity:.62;}
.bgimg img{width:100%;height:100%;object-fit:cover;filter:saturate(.88) contrast(1.06) brightness(1.04);}
.page.ice .bgimg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.42) 0%,rgba(210,225,240,.18) 55%,rgba(200,218,235,.32) 100%);}
.bgband{position:absolute;left:-20mm;right:-20mm;top:-6mm;height:${bleed + 46}mm;transform:skewY(-3deg);
  background:linear-gradient(90deg,color-mix(in srgb,var(--primary) 92%,#fff),color-mix(in srgb,var(--secondary) 80%,var(--primary)));opacity:.08;}

/* facts / glossary / profile pages */
.facts .hdr,.glossary .hdr,.profile .hdr{position:absolute;left:${bleed + 10}mm;top:${bleed + 12}mm;}
.facts .hdr .title,.glossary .hdr .title,.profile .hdr .title{font-size:8.5mm;}
.facts .hdr .sub,.glossary .hdr .sub,.profile .hdr .sub{font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;font-size:3.6mm;letter-spacing:.14em;color:var(--secondary);margin-top:2.5mm;}
.facts .goal{position:absolute;right:${bleed + 12}mm;top:${bleed + 8}mm;width:40mm;height:26mm;opacity:.6;}
.facts .fgrid{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 44}mm;bottom:${bleed + 16}mm;display:grid;grid-template-columns:1fr 1fr;gap:6mm 8mm;grid-auto-rows:1fr;}
.facts .f{position:relative;display:flex;align-items:center;padding:0 5mm;gap:5mm;background:rgba(255,255,255,.88);border-left:1.4mm solid var(--secondary);padding:4mm 5mm 4mm 4mm;box-shadow:0 1mm 3mm rgba(20,40,70,.08);}
.facts .f .pk{position:relative;flex:0 0 30mm;height:19mm;}
.facts .f .pk .puck-label{width:100%;height:100%;}
.facts .f p{font-size:3.5mm;line-height:1.3;color:#1b2940;}
.glossary .ggrid{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 44}mm;bottom:${bleed + 16}mm;display:grid;grid-template-columns:1fr 1fr;gap:4mm 8mm;align-content:space-between;}
.glossary .g{background:linear-gradient(135deg,var(--primary),var(--dark));color:#fff;padding:3mm 5mm;transform:skewX(-6deg);border-left:1.4mm solid var(--secondary);}
.glossary .g.alt{background:linear-gradient(135deg,var(--secondary),color-mix(in srgb,var(--secondary) 70%,#000));border-left-color:#fff;}
.glossary .g b{display:block;font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:4.6mm;letter-spacing:.04em;transform:skewX(6deg);}
.glossary .g span{display:block;font-size:3.3mm;line-height:1.3;margin-top:1mm;color:rgba(255,255,255,.88);transform:skewX(6deg);}
.page.profile .writepad{position:absolute;left:${bleed + 8}mm;right:${bleed + 8}mm;top:${bleed + 40}mm;bottom:${bleed + 12}mm;z-index:1;
  background:linear-gradient(180deg,rgba(255,255,255,.94) 0%,rgba(255,255,255,.9) 100%);border-radius:2.5mm;
  box-shadow:0 .8mm 2.5mm rgba(20,40,70,.07);border:.3mm solid rgba(255,255,255,.85);}
.page.profile .photo{position:absolute;right:${bleed + 12}mm;top:${bleed + 42}mm;width:${size.w}mm;height:${size.h}mm;z-index:2;}
.page.profile .photo .frame{position:absolute;inset:0;border:.5mm dashed color-mix(in srgb,var(--primary) 45%,#bbb);background:rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:3.6mm;color:var(--primary);}
.page.profile .fields{position:absolute;left:${bleed + 10}mm;right:${bleed + 12 + size.w + 10}mm;top:${bleed + 42}mm;z-index:2;}
.page.profile .fld{display:flex;align-items:flex-end;gap:3mm;height:12.5mm;}
.page.profile .fld b{font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;font-size:3.6mm;color:var(--dark);white-space:nowrap;padding-bottom:1mm;}
.page.profile .fld span{flex:1;border-bottom:.35mm solid color-mix(in srgb,var(--secondary) 55%,#c8cdd6);height:8mm;}
.page.profile .goals{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 172}mm;z-index:2;}
.page.profile .goals h5{font-family:'Unbounded';font-weight:800;text-transform:uppercase;font-size:6.5mm;color:var(--dark);margin-bottom:4mm;}
.page.profile .goal{display:flex;align-items:center;gap:4mm;margin-bottom:6mm;}
.page.profile .goal i{flex:1;border-bottom:.35mm solid color-mix(in srgb,var(--primary) 35%,#c8cdd6);height:8mm;}
.page.profile .goal .pucknum{position:relative;width:13mm;height:13mm;flex:0 0 13mm;}
.page.profile .goal .pucknum .puck-label{width:100%;height:100%;}
.page.profile .hdr{z-index:2;}

/* corner ornaments: torn diagonal bands */
.orn{position:absolute;pointer-events:none;}
.orn.tl{left:-50mm;top:-48mm;width:170mm;height:60mm;transform:rotate(-24deg);
  background:linear-gradient(180deg,var(--secondary) 0 30%,transparent 30% 42%,var(--primary) 42% 60%,transparent 60% 68%,color-mix(in srgb,var(--primary) 15%,transparent) 68% 78%,transparent 78%);}
.orn.br{right:-40mm;bottom:-30mm;width:190mm;height:70mm;transform:rotate(-24deg);
  background:linear-gradient(0deg,var(--primary) 0 34%,transparent 34% 44%,var(--secondary) 44% 62%,transparent 62% 70%,color-mix(in srgb,var(--secondary) 15%,transparent) 70% 80%,transparent 80%);}
.orn.tr{right:-70mm;top:-32mm;width:170mm;height:50mm;transform:rotate(-24deg);
  background:linear-gradient(180deg,var(--secondary) 0 28%,transparent 28% 40%,var(--primary) 40% 58%,transparent 58%);}

/* hockey decor: half rink along the bottom edge + skate scratches over the ice */
.deco{position:absolute;inset:0;pointer-events:none;overflow:hidden;}
.deco .rink{position:absolute;left:-30mm;bottom:-22mm;width:200mm;height:133mm;}
.deco .scratches{position:absolute;inset:0;width:100%;height:100%;}
.team .deco .rink{left:auto;right:-30mm;bottom:-40mm;width:230mm;height:153mm;transform:scaleX(-1);opacity:.2 !important;}
.cover .deco .rink{left:auto;right:-60mm;bottom:auto;top:-30mm;width:260mm;height:173mm;transform:rotate(90deg);}
.cover .season .sticks{width:7mm;height:7mm;vertical-align:-1.4mm;margin-right:2mm;}
.puck-label{position:relative;display:inline-flex;align-items:center;justify-content:center;}
.puck-label .puck-photo{position:absolute;inset:-10% -12%;width:124%;height:118%;object-fit:contain;filter:drop-shadow(0 .6mm 1.2mm rgba(0,0,0,.2));}
.puck-label svg.puck{position:absolute;inset:0;width:100%;height:100%;}
.puck-label b{position:absolute;left:50%;top:33%;transform:translate(-50%,-50%);color:#fff;font-family:'Unbounded';font-weight:800;line-height:1;white-space:nowrap;
  text-shadow:0 .3mm .8mm rgba(0,0,0,.78),0 0 .35mm rgba(0,0,0,.4);pointer-events:none;}
.pucknum{display:inline-flex;align-items:center;justify-content:center;position:relative;flex:none;}
.pucknum .puck{position:absolute;inset:0;width:100%;height:100%;}
.pucknum:not(:has(.puck-label)) b{position:relative;color:#fff;font-family:'Fira Sans Extra Condensed';font-weight:700;font-size:4.2mm;line-height:1;margin-top:-1.2mm;}
.hdr .count{display:inline-flex;align-items:center;gap:2mm;background:var(--dark);color:#fff;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;
  font-size:3.6mm;letter-spacing:.08em;padding:1.4mm 3.5mm 1.4mm 2.5mm;border-radius:6mm;margin-top:2mm;}
.hdr .count .puck{width:6mm;height:3.6mm;}
.stats .goal{position:absolute;right:${bleed + 10}mm;top:${bleed + 8}mm;width:44mm;height:28mm;}
.autographs .box .puck{position:absolute;right:2mm;top:2mm;width:6mm;height:3.6mm;opacity:.85;}
.gallery .hdr .sticks,.autographs .hdr .sticks,.history .hdr .sticks,.glossary .hdr .sticks{width:14mm;height:14mm;vertical-align:-3mm;margin-left:3mm;opacity:.9;}
.glossary .hdr .sub{display:block;margin-top:2.5mm;}

/* section title */
.title{position:relative;display:inline-block;font-family:'Unbounded';font-weight:800;text-transform:uppercase;font-size:10mm;line-height:1;color:var(--dark);
  padding:2mm 0;}
.title::after{content:"";position:absolute;left:0;right:-6mm;bottom:-1mm;height:2mm;background:linear-gradient(90deg,var(--secondary) 0 60%,var(--primary) 60%);
  transform:skewX(-30deg);}

/* ---------- COVER ---------- */
.cover{background:var(--dark);}
.cover .photo{position:absolute;inset:0;}
.cover .photo img{width:100%;height:100%;object-fit:contain;object-position:center 40%;}
.cover .photo .grad{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,26,58,.78) 0%,rgba(7,26,58,.45) 22%,rgba(7,26,58,0) 38%,rgba(7,26,58,0) 62%,rgba(7,26,58,.55) 82%,rgba(7,26,58,.9) 100%);}
/* Landscape team photo: full-width panel under the title block so nobody is cropped off the sides. */
.cover .photo.panel{inset:auto;left:0;right:0;top:${bleed + 84}mm;clip-path:polygon(0 5mm,100% 0,100% 100%,0 100%);
  box-shadow:0 -2mm 6mm rgba(0,0,0,.25);}
.cover .photo.panel img{object-position:center center;}
.cover .photo.panel .grad{background:linear-gradient(180deg,rgba(7,26,58,.25) 0%,rgba(7,26,58,0) 18%,rgba(7,26,58,0) 62%,color-mix(in srgb,var(--dark) 85%,transparent) 92%,var(--dark) 100%);}
.cover .below{position:absolute;left:0;right:0;bottom:0;background:var(--dark);overflow:hidden;}
.cover .below .bigpuck{position:absolute;right:-30mm;bottom:-60mm;width:200mm;height:120mm;opacity:.16;}
.cover .below .bigpuck .puck{width:100%;height:100%;}
.cover .nophoto{position:absolute;inset:0;background:
  radial-gradient(ellipse at 50% 30%,rgba(255,255,255,.35),transparent 60%),
  repeating-linear-gradient(115deg,rgba(255,255,255,.05) 0 2mm,transparent 2mm 16mm),
  linear-gradient(160deg,#ffffff 0%,var(--ice) 35%,#b9c9dc 70%,var(--primary) 100%);}
.cover .orn.tl{left:-50mm;top:-45mm;width:220mm;height:90mm;
  background:linear-gradient(180deg,#fff 0 36%,var(--secondary) 36% 52%,transparent 52% 60%,var(--primary) 60% 72%,transparent 72% 80%,rgba(255,255,255,.35) 80% 86%,transparent 86%);}
.cover .orn.br{right:-60mm;bottom:-60mm;width:250mm;height:120mm;
  background:linear-gradient(0deg,var(--primary) 0 42%,transparent 42% 50%,var(--secondary) 50% 62%,transparent 62% 70%,rgba(255,255,255,.4) 70% 76%,transparent 76%);}
.cover .season{position:absolute;left:${bleed + 8}mm;top:${bleed + 52}mm;background:var(--secondary);color:#fff;font-family:'Fira Sans Extra Condensed';font-weight:600;
  text-transform:uppercase;font-size:5.6mm;letter-spacing:.06em;padding:1.6mm 4mm 1.6mm 3mm;transform:skewX(-8deg);box-shadow:0 1mm 2mm rgba(0,0,0,.3);}
.cover .season span{display:inline-block;transform:skewX(8deg);}
.cover .season b{color:var(--accent);margin:0 1.5mm;}
.cover .logo{position:absolute;right:${bleed + 12}mm;top:${bleed + 12}mm;width:62mm;height:62mm;display:flex;align-items:center;justify-content:center;}
.cover .logo img{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 1.5mm 3mm rgba(0,0,0,.45));}
.cover .logo .badge{width:58mm;height:58mm;border-radius:50%;background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--primary) 70%,#fff),var(--primary) 70%);border:1.6mm solid #fff;
  box-shadow:0 0 0 1.2mm var(--secondary),0 2mm 5mm rgba(0,0,0,.4);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;}
.cover .logo .badge .star{font-size:12mm;line-height:1;color:var(--secondary);text-shadow:0 0 1mm #fff,0 0 1mm #fff;}
.cover .logo .badge .txt{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:9mm;line-height:.95;margin-top:1mm;padding:0 3mm;}
.cover .logo .badge small{font-family:'Roboto';font-weight:500;font-size:2.6mm;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-top:1.5mm;}
.cover .count{position:absolute;left:${bleed + 10}mm;bottom:${bleed + 18}mm;width:56mm;height:44mm;color:#fff;}
.cover .count svg{position:absolute;inset:0;width:100%;height:100%;}
.cover .count.real{width:60mm;height:48mm;left:${bleed + 8}mm;bottom:${bleed + 16}mm;}
.cover .count.real img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;}
.cover .count.real .in{top:5.5mm;}
.cover .count .in{position:absolute;left:0;right:0;top:8.5mm;text-align:center;}
.cover .count b{display:block;font-family:'Unbounded';font-weight:800;font-size:14mm;line-height:.95;color:var(--secondary);-webkit-text-stroke:.5mm #fff;paint-order:stroke fill;}
.cover .count span{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;font-size:3.8mm;letter-spacing:.14em;margin-top:0;}
.cover .year{position:absolute;right:${bleed + 8}mm;bottom:${bleed + 12}mm;font-family:'Unbounded';font-weight:800;font-size:40mm;line-height:.85;color:#fff;letter-spacing:-.01em;}
.cover .brand{position:absolute;left:${bleed + 12}mm;bottom:${bleed + 6}mm;display:flex;align-items:center;gap:2mm;}
.cover .brand img{height:7mm;filter:drop-shadow(0 .5mm 1mm rgba(0,0,0,.5));}
.cover .teamname{position:absolute;left:${bleed + 8}mm;top:${bleed + 66}mm;font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:11mm;line-height:1;color:#fff;
  text-shadow:0 1mm 2.5mm rgba(0,0,0,.55);}
.cover .teamname small{display:block;font-size:5mm;font-weight:600;letter-spacing:.12em;opacity:.95;margin-top:1.5mm;}

/* ---------- INTRO ---------- */
.intro .hdr{position:absolute;left:${bleed + 10}mm;top:${bleed + 12}mm;}
.intro .lead{position:absolute;left:${bleed + 30}mm;right:${bleed + 14}mm;top:${bleed + 46}mm;font-size:4.2mm;line-height:1.35;color:#1b2940;}
.intro .lead b{color:var(--secondary);}
.intro .sample{position:absolute;left:${bleed + 12}mm;top:${bleed + 92}mm;transform-origin:top left;transform:scale(1);
  box-shadow:0 2mm 5mm rgba(0,0,0,.25);border-radius:1mm;}
.intro .how{position:absolute;left:${bleed + 85}mm;right:${bleed + 12}mm;top:${bleed + 92}mm;}
.intro .how h3{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:7.5mm;color:var(--dark);margin-bottom:5mm;}
.intro .step{display:flex;align-items:flex-start;gap:3mm;margin-bottom:6mm;font-size:4mm;line-height:1.35;color:#1b2940;}
.intro .step .pucknum{width:13mm;height:13mm;margin-top:-1mm;flex:none;}
.intro .step .pucknum .puck-label{width:100%;height:100%;}
.intro .step .pucknum .puck-label b{font-family:'Fira Sans Extra Condensed';font-weight:700;}
.intro .bottom{position:absolute;left:0;right:0;bottom:0;height:120mm;}
.intro .bigname{position:absolute;left:${bleed + 6}mm;right:${bleed + 6}mm;top:14mm;font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;
  font-size:34mm;line-height:.95;color:transparent;-webkit-text-stroke:.9mm var(--secondary);text-align:center;white-space:nowrap;letter-spacing:.02em;}
.intro .teamphoto{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:22mm;bottom:${bleed + 10}mm;overflow:hidden;border-radius:1.5mm;
  box-shadow:0 2mm 6mm rgba(0,0,0,.25);background:#c9d5e3;}
.intro .teamphoto img{width:100%;height:100%;object-fit:cover;object-position:center;}
.intro .teamphoto.cutout{background:none;box-shadow:none;border-radius:0;overflow:visible;top:20mm;}
.intro .teamphoto.cutout::before{content:"";position:absolute;left:8%;right:8%;bottom:-2mm;height:14mm;border-radius:50%;background:radial-gradient(ellipse at center,rgba(20,40,70,.28),rgba(20,40,70,0) 70%);}
.intro .teamphoto.cutout img{position:absolute;left:0;right:0;bottom:2mm;width:100%;height:100%;object-fit:contain;object-position:center bottom;}
.intro .teamphoto .ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;
  font-size:6mm;color:#5b6b80;letter-spacing:.1em;background:repeating-linear-gradient(45deg,#dbe4ee 0 6mm,#cfdae6 6mm 12mm);}

/* ---------- TEAM ---------- */
.team .orn.br{right:-60mm;bottom:-40mm;width:170mm;height:40mm;}
.team .hdr{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 9}mm;height:22mm;display:flex;align-items:center;justify-content:space-between;}
.team .hdr .logo{width:22mm;height:22mm;display:flex;align-items:center;justify-content:center;}
.team .hdr .logo img{max-width:100%;max-height:100%;object-fit:contain;}
.team .hdr .title{font-size:10mm;}
.team .hdr .sub{font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;font-size:3.6mm;letter-spacing:.14em;color:var(--secondary);text-align:right;margin-top:2mm;}
.team .grid{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${(bleed + gridTop(size)).toFixed(1)}mm;display:grid;
  grid-template-columns:repeat(${SLOT_COLS},${size.w}mm);justify-content:space-between;row-gap:${gridGap(size).toFixed(1)}mm;}
.cell{position:relative;width:${size.w}mm;}
.cell .cap{height:${CAPTION_H}mm;padding-top:1.6mm;text-align:center;}
.team.dense .hdr{top:${bleed + 5}mm;height:16mm;}
.team.dense .hdr .logo{width:16mm;height:16mm;}
.team.dense .hdr .title{font-size:8mm;}
.team.dense .hdr .sub{font-size:3mm;margin-top:1mm;}
.team.dense .cell .cap{position:absolute;left:0;right:0;bottom:0;height:auto;padding:1.4mm 2mm 1.6mm;background:rgba(255,255,255,.9);border-top:.3mm solid color-mix(in srgb,var(--primary) 25%,transparent);}
.team.dense .cell .cap .n{font-size:3.4mm;}
.team.dense .cell .cap .p{font-size:2.2mm;margin-top:.4mm;}
.team.dense .pgnum{bottom:${bleed + 1.5}mm;}
.cell .cap .n{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:3.6mm;line-height:1.05;color:var(--dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cell .cap .n span{color:var(--secondary);margin-right:1.2mm;}
.cell .cap .p{font-family:'Roboto';font-weight:500;text-transform:uppercase;letter-spacing:.12em;font-size:2.3mm;color:#4a5a70;margin-top:.6mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.slot{position:relative;width:${size.w}mm;height:${size.h}mm;border:.35mm dashed color-mix(in srgb,var(--primary) 55%,transparent);border-radius:1mm;overflow:hidden;background:#fff;}
.slot .corner{position:absolute;width:6mm;height:6mm;border:.35mm solid color-mix(in srgb,var(--primary) 45%,transparent);}
.slot .corner.tl{left:-.35mm;top:-.35mm;border-right:0;border-bottom:0;}
.slot .corner.tr{right:-.35mm;top:-.35mm;border-left:0;border-bottom:0;}
.slot .corner.bl{left:-.35mm;bottom:-.35mm;border-right:0;border-top:0;}
.slot .corner.br{right:-.35mm;bottom:-.35mm;border-left:0;border-top:0;}
.slot .ghost{position:absolute;left:${-size.bleed}mm;top:${-size.bleed}mm;filter:blur(.55mm);opacity:.17;}
.slot .ghost::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(140deg,color-mix(in srgb,var(--secondary) 55%,transparent) 0%,color-mix(in srgb,var(--accent) 35%,transparent) 55%,transparent 100%);
  mix-blend-mode:overlay;opacity:.28;}
.slot .tag{position:absolute;left:50%;top:0;transform:translateX(-50%);background:var(--secondary);color:#fff;font-family:'Fira Sans Extra Condensed';font-weight:600;
  font-size:3mm;line-height:1;padding:1mm 2.6mm 1.1mm;border-radius:0 0 1.5mm 1.5mm;letter-spacing:.06em;}
.slot .lbl{position:absolute;left:0;right:0;bottom:0;padding:1.6mm 2mm 1.8mm;text-align:center;background:rgba(255,255,255,.88);border-top:.3mm solid color-mix(in srgb,var(--primary) 25%,transparent);}
.slot .lbl .n{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:3.9mm;line-height:1.05;color:var(--dark);}
.slot .lbl .n span{color:var(--secondary);margin-right:1.2mm;}
.slot .lbl .p{font-family:'Roboto';font-weight:500;text-transform:uppercase;letter-spacing:.12em;font-size:2.4mm;color:#4a5a70;margin-top:.7mm;}
.slot.outline .ghost{display:none;}
.slot.outline{background:linear-gradient(160deg,#fff,var(--ice));}
.slot.outline .bignum{position:absolute;left:0;right:0;top:34%;text-align:center;font-family:'Fira Sans Extra Condensed';font-weight:700;font-size:20mm;line-height:1;color:color-mix(in srgb,var(--primary) 12%,transparent);}

/* ---------- HISTORY ---------- */
.history .orn.br{right:-60mm;bottom:-40mm;width:170mm;height:40mm;}
.history .hdr{position:absolute;left:${bleed + 10}mm;top:${bleed + 12}mm;}
.history .tl{position:absolute;left:${bleed + 12}mm;top:${bleed + 44}mm;right:${bleed + 58}mm;}
.history .tl::before{content:"";position:absolute;left:5.2mm;top:2mm;bottom:8mm;width:1.2mm;background:linear-gradient(180deg,var(--primary),var(--secondary));border-radius:1mm;}
.history .item-wrap{margin-bottom:5.5mm;}
.history .tl-finale{position:relative;height:14mm;margin-top:4mm;}
.history .tl-finale .dot.logo{position:absolute;left:0;top:0;width:11.6mm;height:11.6mm;background:#fff;padding:1.1mm;border-radius:50%;
  display:flex;align-items:center;justify-content:center;border:1mm solid #fff;box-shadow:0 0 0 .6mm var(--primary),0 1mm 3mm rgba(0,0,0,.14);}
.history .tl-finale .dot.logo img{width:100%;height:100%;object-fit:contain;}
.history .item{position:relative;padding-left:16mm;}
.history .item .dot{position:absolute;left:0;top:0;width:11.6mm;height:11.6mm;border-radius:50%;background:var(--dark);color:#fff;
  display:flex;align-items:center;justify-content:center;border:1mm solid #fff;box-shadow:0 0 0 .6mm var(--primary),inset 0 -.8mm 0 rgba(0,0,0,.35);}
.history .item .dot .num{font-family:'Fira Sans Extra Condensed';font-weight:700;font-size:5.2mm;line-height:1;}
.history .item .yr{display:inline-block;background:var(--primary);color:#fff;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;font-size:4mm;
  padding:1mm 3mm;transform:skewX(-10deg);margin-bottom:1.6mm;letter-spacing:.06em;}
.history .item .yr span{display:inline-block;transform:skewX(10deg);}
.history .item h4{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:5.4mm;line-height:1.05;color:var(--dark);margin-bottom:1.2mm;}
.history .item p{font-size:3.7mm;line-height:1.35;color:#1b2940;white-space:pre-line;}
.history .history-side{position:absolute;right:${bleed + 10}mm;top:${bleed + 42}mm;width:48mm;
  filter:drop-shadow(0 2.5mm 5mm rgba(7,26,58,.2)) drop-shadow(0 .8mm 1.8mm rgba(0,0,0,.1));}
.history .facts{position:relative;width:100%;}
.history .facts-cap{position:relative;padding:3mm 3mm 3.2mm;background:linear-gradient(145deg,var(--dark) 0%,var(--primary) 100%);
  border-radius:2.8mm 2.8mm 0 0;box-shadow:inset 0 .5mm 0 rgba(255,255,255,.14),0 .8mm 2mm rgba(0,0,0,.18);
  display:flex;flex-direction:column;align-items:center;gap:2mm;}
.history .facts-logo{width:16mm;height:16mm;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:50%;
  padding:1.2mm;box-shadow:0 .6mm 1.8mm rgba(0,0,0,.22);}
.history .facts-logo img{max-width:100%;max-height:100%;object-fit:contain;}
.history .facts-cap::after{content:"";position:absolute;left:3mm;right:3mm;bottom:0;height:1.6mm;
  background:linear-gradient(90deg,var(--secondary) 0 62%,var(--accent) 62%);border-radius:.3mm;}
.history .facts-cap h5{font-family:'Unbounded';font-weight:800;text-transform:uppercase;font-size:4.4mm;color:#fff;
  text-align:center;line-height:1.05;margin:0;padding:0;border:0;text-shadow:0 .5mm 1mm rgba(0,0,0,.35);}
.history .facts-panel{position:relative;background:linear-gradient(180deg,#fff 0%,#f6f9fc 100%);
  border:.5mm solid color-mix(in srgb,var(--primary) 38%,transparent);border-top:none;border-radius:0 0 2.8mm 2.8mm;
  padding:1.5mm 0 2mm;box-shadow:inset 0 1.5mm 3mm rgba(255,255,255,.9),inset 0 -.5mm 1mm rgba(20,40,70,.06);}
.history .facts-panel::before{content:"";position:absolute;left:0;top:0;right:0;height:3mm;
  background:linear-gradient(180deg,rgba(255,255,255,.65),transparent);pointer-events:none;}
.history .history-photos{display:flex;flex-direction:column;gap:3mm;margin-top:3.5mm;}
.history .history-photos .hp{height:30mm;border-radius:2.2mm;overflow:hidden;border:.35mm solid rgba(255,255,255,.9);
  box-shadow:0 1.5mm 3.5mm rgba(7,26,58,.18);}
.history .history-photos .hp:nth-child(2){transform:rotate(-.8deg);}
.history .history-photos .hp img{width:100%;height:100%;object-fit:cover;object-position:center;}
.history .fact{position:relative;text-align:center;padding:3.2mm 3mm 3.6mm;margin:0;}
.history .fact:not(:last-child){border-bottom:.35mm dashed color-mix(in srgb,var(--primary) 24%,transparent);}
.history .fact b{display:block;font-family:'Unbounded';font-weight:800;font-size:10.2mm;line-height:1;color:var(--secondary);
  -webkit-text-stroke:.18mm color-mix(in srgb,var(--secondary) 55%,#fff);paint-order:stroke fill;
  text-shadow:0 .6mm 0 rgba(255,255,255,.95),0 1.4mm 2mm color-mix(in srgb,var(--secondary) 22%,transparent);}
.history .fact span{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;
  font-size:2.85mm;line-height:1.22;letter-spacing:.05em;color:#3a4d66;margin-top:1.3mm;white-space:pre-line;}
/* ---------- STATS ---------- */
.stats .hdr{position:absolute;left:${bleed + 10}mm;top:${bleed + 12}mm;}
.stats .note{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 40}mm;font-size:3.8mm;color:#1b2940;line-height:1.35;}
.stats table{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 56}mm;width:calc(100% - ${(bleed + 10) * 2}mm);border-collapse:collapse;font-size:3.6mm;}
.stats th{font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.08em;font-size:3.4mm;color:#fff;background:var(--primary);padding:2.4mm 2mm;text-align:left;}
.stats td{border-bottom:.3mm solid color-mix(in srgb,var(--primary) 25%,transparent);height:9.6mm;padding:0 2mm;color:#7b8798;}
.stats td.i{width:9mm;text-align:center;font-family:'Fira Sans Extra Condensed';font-weight:600;color:var(--secondary);}
.stats tr:nth-child(even) td{background:rgba(238,243,249,.7);}

/* ---------- NOTES ---------- */
.notes .hdr{position:absolute;left:${bleed + 10}mm;top:${bleed + 12}mm;}
.notes .lines{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 46}mm;}
.notes .line{height:10.5mm;border-bottom:.3mm solid color-mix(in srgb,var(--primary) 28%,transparent);}

/* ---------- AUTOGRAPHS ---------- */
.autographs .hdr{position:absolute;left:${bleed + 10}mm;top:${bleed + 12}mm;}
.autographs .note{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 40}mm;font-size:3.8mm;color:#1b2940;line-height:1.35;}
.autographs .grid{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 54}mm;display:grid;grid-template-columns:repeat(3,1fr);gap:5mm 6mm;}
.autographs .box{height:var(--boxh,33mm);border:.35mm solid color-mix(in srgb,var(--primary) 30%,transparent);border-radius:1.5mm;position:relative;background:rgba(255,255,255,.75);}
.autographs .box .n{position:absolute;left:3mm;right:3mm;bottom:2.4mm;font-family:'Fira Sans Extra Condensed';font-weight:600;font-size:3.3mm;text-transform:uppercase;color:var(--dark);
  border-top:.3mm solid var(--secondary);padding-top:1.2mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.autographs .box .n span{color:var(--secondary);margin-right:1mm;}

/* ---------- GALLERY ---------- */
.gallery .hdr{position:absolute;left:${bleed + 10}mm;top:${bleed + 12}mm;}
.gallery .grid{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 40}mm;bottom:${bleed + 16}mm;display:grid;gap:4mm;
  grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(6,1fr);}
.gallery .ph{position:relative;overflow:hidden;border-radius:1.5mm;background:#c9d5e3;box-shadow:0 1mm 3mm rgba(0,0,0,.18);}
.gallery .ph img{width:100%;height:100%;object-fit:cover;object-position:center 35%;display:block;}
.gallery .ph .cap{position:absolute;left:0;right:0;bottom:0;padding:1.5mm 2.5mm;font-family:'Fira Sans Extra Condensed';font-weight:600;font-size:3mm;text-transform:uppercase;letter-spacing:.06em;color:#fff;
  background:linear-gradient(180deg,transparent,rgba(0,0,0,.6));}

/* ---------- QUOTES ---------- */
.quotes .hdr{position:absolute;left:${bleed + 10}mm;top:${bleed + 12}mm;}
.quotes .hdr .sticks{width:14mm;height:14mm;vertical-align:-3mm;margin-left:3mm;}
.quotes .hdr .title{font-size:8mm;}
.quotes .goal{position:absolute;right:${bleed + 12}mm;bottom:${bleed + 4}mm;width:34mm;height:22mm;opacity:.5;}
.quotes .qgrid{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 42}mm;bottom:${bleed + 16}mm;display:grid;grid-template-columns:1fr 1fr;gap:5mm 6mm;align-content:space-between;}
.quotes .qp{position:relative;background:linear-gradient(135deg,var(--primary),var(--dark));color:#fff;padding:5mm 6mm 5mm 7mm;transform:rotate(-1.2deg) skewX(-3deg);
  box-shadow:0 1.2mm 3mm rgba(0,0,0,.25);border-left:1.4mm solid var(--secondary);}
.quotes .qp.odd{transform:rotate(1deg) skewX(-3deg);border-left-color:var(--accent);}
.quotes .qp:nth-child(3n){margin-left:8mm;} .quotes .qp:nth-child(3n+1){margin-right:8mm;}
.quotes .qp:last-child:nth-child(odd){grid-column:1 / span 2;margin:0 30mm 0 25mm;}
.quotes .qp p{font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;font-size:4.1mm;line-height:1.18;transform:skewX(3deg);}
.quotes .qp b{display:block;margin-top:2.4mm;font-family:'Roboto';font-weight:700;font-size:2.9mm;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);transform:skewX(3deg);}
.quotes .qp.odd b{color:color-mix(in srgb,var(--secondary) 70%,#fff);}
.quotes .qp::after{content:"";position:absolute;right:-1mm;bottom:-1mm;width:10mm;height:10mm;background:var(--secondary);clip-path:polygon(100% 0,100% 100%,0 100%);opacity:.9;}
.quotes .qp.odd::after{background:var(--accent);}
/* ---------- BACK COVER: card wall ---------- */
.backcover .collect{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 42}mm;}
.backcover .collect .ttl{font-family:'Unbounded';font-weight:800;text-transform:uppercase;font-size:9.5mm;line-height:1;color:#fff;margin-bottom:6mm;}
.backcover .collect .ttl span{display:block;font-size:6mm;color:var(--accent);margin-top:1.5mm;letter-spacing:.06em;}
.backcover .wall{display:grid;grid-template-columns:repeat(9,19mm);justify-content:space-between;row-gap:4mm;}
.backcover .mini{position:relative;}
.backcover .mini .mc{width:19mm;height:${(19 / size.w * size.h).toFixed(2)}mm;overflow:hidden;box-shadow:0 .6mm 1.5mm rgba(0,0,0,.5);}
.backcover .mini .mc .card{transform-origin:top left;transform:translate(${(-size.bleed * 19 / size.w).toFixed(2)}mm,${(-size.bleed * 19 / size.w).toFixed(2)}mm) scale(${(19 / size.w).toFixed(4)});}
.backcover .mini{height:${(19 / size.w * size.h + 4).toFixed(1)}mm;}
.backcover .mini span{position:absolute;left:0;right:0;bottom:0;text-align:center;font-family:'Fira Sans Extra Condensed';font-weight:600;font-size:2.6mm;color:rgba(255,255,255,.75);}
/* ---------- BACK COVER ---------- */
.backcover{background:var(--dark);color:#fff;}
.backcover > .photo{position:absolute;inset:0;}
.backcover > .photo > img{width:100%;height:100%;object-fit:cover;object-position:center 35%;opacity:.3;filter:grayscale(.7) contrast(1.1);}
.backcover .tint{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,26,58,.35) 0%,rgba(7,26,58,.55) 60%,var(--dark) 100%);}
.backcover .pattern{position:absolute;inset:0;background:
  radial-gradient(ellipse at 50% 35%,rgba(90,140,220,.45),transparent 55%),
  repeating-linear-gradient(115deg,rgba(255,255,255,.04) 0 2mm,transparent 2mm 18mm);}
.backcover .rink{position:absolute;left:${bleed + 25}mm;right:${bleed + 25}mm;top:${bleed + 70}mm;height:100mm;border:1.4mm solid rgba(255,255,255,.55);border-radius:22mm;}
.backcover .rink::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:1.2mm;margin-left:-.6mm;background:rgba(220,40,60,.8);}
.backcover .rink::after{content:"";position:absolute;left:50%;top:50%;width:26mm;height:26mm;margin:-13mm 0 0 -13mm;border:1.2mm solid rgba(60,110,200,.9);border-radius:50%;}
.backcover .rink i{position:absolute;top:0;bottom:0;width:1mm;background:rgba(60,110,200,.9);}
.backcover .rink i.a{left:30%;} .backcover .rink i.b{right:30%;}
.backcover .cta{position:absolute;left:${bleed + 12}mm;right:${bleed + 12}mm;bottom:${bleed + 22}mm;max-width:120mm;}
.backcover .cta h2{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:13mm;line-height:.95;}
.backcover .cta h2 span{color:var(--accent);}
.backcover .cta p{font-size:4mm;line-height:1.35;margin-top:3mm;max-width:120mm;color:rgba(255,255,255,.9);}
.backcover .qr{position:absolute;right:${bleed + 12}mm;bottom:${bleed + 20}mm;width:38mm;height:38mm;background:#fff;border-radius:2mm;padding:2.5mm;display:flex;align-items:center;justify-content:center;}
.backcover .qr img{width:100%;height:100%;object-fit:contain;}
.backcover .qr .ph{font-family:'Roboto';font-size:3mm;color:#7b8798;text-align:center;line-height:1.3;}
.backcover .brand{position:absolute;left:${bleed + 12}mm;bottom:${bleed + 9}mm;display:flex;align-items:center;gap:3mm;}
.backcover .brand img{height:8mm;}
.backcover .brand small{font-size:3mm;color:rgba(255,255,255,.7);}
.backcover .top{position:absolute;left:${bleed + 12}mm;right:${bleed + 12}mm;top:${bleed + 14}mm;display:flex;align-items:center;justify-content:space-between;}
.backcover .top .name{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:7mm;line-height:1;}
.backcover .top .name small{display:block;font-family:'Roboto';font-weight:400;text-transform:none;font-size:3.4mm;color:rgba(255,255,255,.75);margin-top:1.5mm;}
.backcover .top img{height:20mm;object-fit:contain;}
`;
}

// Ice decor: raster ice texture when assets/bg-ice.jpg exists; vector rink only as a faint overlay.
const deco = (data, rinkOpacity = 0.14) => {
  const hasBg = !!data.assets.bg;
  const ro = hasBg ? Math.min(rinkOpacity, 0.07) : rinkOpacity;
  const scr = hasBg ? 0.12 : 0.35;
  return `${hasBg ? `<div class="bgimg"><img src="${data.assets.bg}"></div>` : ''}<div class="bgband"></div>
  <div class="deco">${rinkSvg(data.colors.primary, data.colors.secondary, ro)}${scratchesSvg('rgba(90,120,160,.45)', scr)}</div>`;
};

const arrow = (color) => `<svg viewBox="0 0 60 44" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6 8 C 22 6, 40 10, 52 30"/><path d="M40 30 L 52 32 L 55 20"/></svg>`;

// Puck seen from above at an angle: dark top face, black side, white rim — the "N cards" badge sits on the top face.
function coverPuckSvg(colors) {
  return `<svg viewBox="0 0 140 110" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="pk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f48"/><stop offset="1" stop-color="#15181e"/></linearGradient></defs>
  <ellipse cx="70" cy="74" rx="66" ry="30" fill="#05070a"/>
  <rect x="4" y="46" width="132" height="28" fill="#05070a"/>
  <ellipse cx="70" cy="46" rx="66" ry="30" fill="url(#pk)" stroke="#fff" stroke-width="2.4"/>
  <ellipse cx="70" cy="46" rx="58" ry="24" fill="none" stroke="${colors.secondary}" stroke-width="1.2" opacity=".8"/>
  <path d="M4 46 v28" stroke="#fff" stroke-width="2.4"/><path d="M136 46 v28" stroke="#fff" stroke-width="2.4"/>
  <path d="M4 74 a66 30 0 0 0 132 0" fill="none" stroke="#fff" stroke-width="2.4"/></svg>`;
}

function coverPage(data) {
  const t = data.team;
  const { w, h, bleed } = PAGE;
  const aspect = data.assets.coverAspect || 0;
  let photo = `<div class="nophoto"></div>`;
  if (data.assets.cover && aspect > 1.15) {
    // Landscape group shot → panel under the title; full-bleed would hide half the team.
    const top = bleed + 84;
    const panelH = Math.min((w + 2 * bleed) / aspect, h + 2 * bleed - 45 - top);
    const overlay = data.assets.history || data.assets.back;
    photo = `<div class="below" style="top:${(top + panelH - 1).toFixed(1)}mm"><div class="bigpuck">${puckSvg('#3a4250', 'rgba(255,255,255,.5)')}</div></div>
    <div class="photo panel" style="height:${panelH.toFixed(1)}mm"><img src="${data.assets.cover}"><div class="grad"></div></div>`;
  } else if (data.assets.cover) {
    photo = `<div class="photo"><img src="${data.assets.cover}"><div class="grad"></div></div>`;
  }
  const logo = data.assets.logo
    ? `<img src="${data.assets.logo}">`
    : `<div class="badge"><div class="star">★</div><div class="txt">${esc(t.shortName || t.name)}</div><small>${esc(t.city || '')}</small></div>`;
  return `<section class="page cover">
    ${photo}
    <div class="deco">${rinkSvg('rgba(255,255,255,.55)', data.colors.secondary, 0.22)}</div>
    <div class="orn tl"></div><div class="orn br"></div>
    <div class="season"><span>${sticksSvg('#fff', data.colors.accent, '#111')}Альбом с карточками <b>★</b> ${esc(t.season)}</span></div>
    ${data.assets.logo ? `<div class="teamname">${esc(t.name)}<small>${esc(t.city || '')}</small></div>` : ''}
    <div class="logo">${logo}</div>
    <div class="count${data.assets.puck ? ' real' : ''}">${data.assets.puck ? `<img src="${data.assets.puck}">` : coverPuckSvg(data.colors)}<div class="in"><b>${data.cards.length}</b><span>карточек</span></div></div>
    <div class="year">${esc(t.year || '')}</div>
    <div class="brand"><img src="${data.brand.hockeystarsWhite}"></div>
  </section>`;
}

function introPage(data, pageNo) {
  const t = data.team;
  const texts = t.texts || {};
  const intro =
    texts.intro ||
    `Этот альбом — твой личный трофей сезона <b>${esc(t.season)}</b>!\nКаждая победа команды <b>${esc(t.name)}${t.year ? '-' + esc(t.year) : ''}</b> приближает тебя к заветной цели — собрать все <b>${data.cards.length}</b> карточек.`;
  const steps = texts.steps || [
    'После каждой победы команды ты вытягиваешь карточки.',
    `Собери всех игроков команды, тренеров и легенд ${esc(t.shortName || t.name)}.`,
    'Заполни альбом до конца сезона!',
  ];
  const sample = data.cards.find((c) => c.role === 'К' && c.hasPhoto) || data.cards.find((c) => c.hasPhoto && c.type === 'player') || data.cards[0];
  const teamPhoto = data.assets.teamPhoto
    ? `<img src="${data.assets.teamPhoto}">`
    : `<div class="ph">Общее фото команды — assets/team.jpg</div>`;
  const bigName = (t.shortName || t.name).toUpperCase();
  const bigSize = Math.min(34, (170 / Math.max(6, bigName.length)) * 1.75);
  return `<section class="page intro ice">
    ${deco(data)}
    <div class="orn tr"></div>
    <div class="hdr"><div class="title">Альбом</div></div>
    <div class="lead">${intro.replace(/\n/g, '<br>')}</div>
    <div class="sample">${sample ? cardFront(sample, data) : ''}</div>
    <div class="how"><h3>Как это работает:</h3>
      ${steps.map((s, i) => `<div class="step"><span class="pucknum">${puckLabelHtml(data, i + 1, { index: i, fontSize: 4.2 })}</span><div>${s}</div></div>`).join('')}
    </div>
    <div class="bottom">
      <div class="bigname" style="font-size:${bigSize.toFixed(1)}mm">${esc(bigName)}</div>
      <div class="teamphoto${data.assets.teamCutout ? ' cutout' : ''}">${data.assets.teamCutout ? `<img src="${data.assets.teamCutout}">` : teamPhoto}</div>
    </div>
    <div class="pgnum l">${pageNo}</div>
  </section>`;
}

function teamPage(data, cards, pageNo, idx, total) {
  const t = data.team;
  const style = (t.album && t.album.slotStyle) || 'ghost';
  const logo = data.assets.logo ? `<img src="${data.assets.logo}">` : '';
  const slots = cards
    .map(
      (c) => `<div class="cell"><div class="slot ${style}">
        <div class="ghost">${cardFront({ ...c, photo: c.photoSmall }, data)}</div>
        ${style === 'outline' ? `<div class="bignum">${esc(c.number)}</div>` : ''}
        <div class="tag">${c.index}</div>
        <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
      </div>
      <div class="cap"><div class="n">${c.number ? `<span>#${esc(c.number)}${esc(c.role || '')}</span>` : ''}${esc(c.surname)} ${esc(c.name)}</div><div class="p">${esc(c.position)}</div></div>
      </div>`
    )
    .join('');
  const even = pageNo % 2 === 0;
  const allCoach = cards.every((c) => c.type === 'coach' || c.photo === undefined || c.type === 'club');
  const ribbons = new Set(cards.map((c) => c.ribbon));
  const title = cards.some((c) => c.type === 'coach') && !cards.some((c) => c.type === 'player') ? 'Тренерский штаб'
    : ribbons.size === 1 && cards[0].ribbon && !cards.some((c) => c.type === 'player') ? cards[0].ribbon : 'Команда';
  return `<section class="page team ice${isDense(data.cardSize) ? ' dense' : ''}">
    ${deco(data, 0.1)}
    <div class="orn br" style="opacity:.9"></div>
    <div class="hdr"><div class="logo">${logo}</div><div style="text-align:right"><div class="title">${esc(title)}</div><div class="sub">${esc(t.name)} · карточки ${cards[0].index}–${cards[cards.length - 1].index} из ${data.cards.length}</div></div></div>
    <div class="grid">${slots}</div>
    <div class="pgnum ${even ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

function historyPage(data, pageNo) {
  const t = data.team;
  const h = t.history || {};
  const items = h.items || [];
  const facts = h.facts || [];
  const title = h.title || `История ${t.shortName || t.name}`;
  const logo = data.assets.logo ? `<div class="facts-logo"><img src="${data.assets.logo}"></div>` : '';
  const arenaPhotos = [data.assets.history, data.assets.history2].filter(Boolean)
    .map((src) => `<div class="hp"><img src="${src}"></div>`)
    .join('');
  return `<section class="page history ice">
    ${deco(data)}
    <div class="orn br" style="opacity:.95"></div>
    <div class="hdr"><div class="title">${esc(title)}</div>${sticksSvg(data.colors.primary, data.colors.secondary, data.colors.dark)}</div>
    <div class="tl">${items
      .map((it, i) => `<div class="item-wrap"><div class="item"><div class="dot"><span class="num">${i + 1}</span></div>
        ${it.years ? `<div class="yr"><span>${esc(it.years)}</span></div>` : ''}
        <h4>${esc(it.title)}</h4><p>${esc(it.text)}</p></div></div>`)
      .join('')}${data.assets.logo ? `<div class="tl-finale"><div class="dot logo"><img src="${data.assets.logo}" alt=""></div></div>` : ''}</div>
    ${
      facts.length || arenaPhotos
        ? `<div class="history-side">${facts.length ? `<div class="facts"><div class="facts-cap">${logo}<h5>${esc(h.factsTitle || 'Цифры успеха')}</h5></div><div class="facts-panel">${facts
            .map((f) => `<div class="fact"><b>${esc(f.value)}</b><span>${esc(f.label)}</span></div>`)
            .join('')}</div></div>` : ''}${arenaPhotos ? `<div class="history-photos">${arenaPhotos}</div>` : ''}</div>`
        : ''
    }
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

const DEFAULT_QUOTES = [
  { q: 'Ты промахиваешься в 100 % бросков, которые не сделал.', a: 'Уэйн Гретцки' },
  { q: 'Хороший хоккеист играет там, где шайба. Великий — там, где она будет.', a: 'Уэйн Гретцки' },
  { q: 'Хоккеист должен обладать мудростью шахматиста, точностью снайпера и ритмом музыканта.', a: 'Анатолий Тарасов' },
  { q: 'Хоккей — это не просто игра, это жизнь.', a: 'Валерий Харламов' },
  { q: 'Команда — это как семья, где каждый должен поддерживать друг друга.', a: 'Илья Ковальчук' },
  { q: 'Если ты хочешь играть и выигрывать, то ты должен быть готов жертвовать всем, кроме здоровья.', a: 'Вячеслав Фетисов' },
  { q: 'Мы боимся проиграть? Вот почему мы побеждаем: мы знаем, каково это — проигрывать, и слишком ненавидим это, чтобы не быть чемпионами.', a: 'Бобби Орр' },
  { q: 'Великие моменты рождаются из великих возможностей.', a: 'Херб Брукс' },
  { q: 'Никогда не переставай мечтать. Мечты сбываются, если работать.', a: 'Александр Овечкин' },
];
// "Фразы великих хоккеистов": dark skewed plates scattered on the ice, like the reference album.
function quotesPage(data, pageNo) {
  const list = (data.team.quotes?.length ? data.team.quotes : DEFAULT_QUOTES).slice(0, 9);
  const plates = list
    .map((it, i) => `<div class="qp ${i % 2 ? 'odd' : ''}" style="--i:${i}"><p>«${esc(it.q)}»</p><b>${esc(it.a)}</b></div>`)
    .join('');
  return `<section class="page quotes ice">
    ${deco(data)}
    <div class="orn br" style="opacity:.9"></div>
    ${goalSvg(data.colors.secondary, `color-mix(in srgb,${data.colors.primary} 45%,transparent)`)}
    <div class="hdr"><div class="title">Фразы великих хоккеистов</div>${sticksSvg(data.colors.primary, data.colors.secondary, data.colors.dark)}</div>
    <div class="qgrid">${plates}</div>
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

const DEFAULT_FACTS = [
  { v: '160 км/ч', t: 'Скорость полёта шайбы после щелчка у профессионалов — быстрее поезда!' },
  { v: '-9 °C', t: 'Температура льда на арене. Чем холоднее лёд, тем он быстрее.' },
  { v: '170 г', t: 'Вес шайбы. Перед игрой её замораживают, чтобы она меньше подпрыгивала.' },
  { v: '1946', t: 'Год первого чемпионата СССР по хоккею. Наша страна — 27-кратный чемпион мира.' },
  { v: '3 × 20', t: 'Три периода по 20 минут. Но матч длится больше двух часов!' },
  { v: '12 000', t: 'Столько шайб уходит на сезон в одной хоккейной лиге.' },
  { v: '50 000', t: 'Больше 50 тысяч мальчишек и девчонок занимаются хоккеем в России.' },
  { v: '#99', t: 'Номер Уэйна Гретцки — единственный номер, закреплённый за игроком во всей НХЛ.' },
];
// "Знаешь ли ты?" — fun hockey facts on puck-shaped badges; the client asked for pages kids will enjoy.
function factsPage(data, pageNo) {
  const list = (data.team.facts?.length ? data.team.facts : DEFAULT_FACTS).slice(0, 8);
  return `<section class="page facts ice">
    ${deco(data)}
    <div class="orn tr"></div>
    <div class="hdr"><div class="title">Знаешь ли ты?</div><div class="sub">Интересные факты о хоккее</div></div>
    <div class="fgrid">${list
      .map((f, i) => `<div class="f"><div class="pk">${puckLabelHtml(data, f.v, { index: i, fontSize: puckFactFontSize(f.v) })}</div><p>${esc(f.t)}</p></div>`)
      .join('')}</div>
    ${goalSvg(data.colors.secondary, `color-mix(in srgb,${data.colors.primary} 45%,transparent)`)}
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

const DEFAULT_GLOSSARY = [
  ['Буллит', 'штрафной бросок один на один с вратарём'],
  ['Хет-трик', 'три гола одного игрока за матч'],
  ['Овертайм', 'дополнительное время, если счёт равный'],
  ['Силовой приём', 'разрешённый толчок соперника корпусом'],
  ['Пас', 'передача шайбы партнёру'],
  ['Щелчок', 'самый сильный бросок с замахом'],
  ['Дриблинг', 'ведение шайбы, обводка соперника'],
  ['Форчекинг', 'давление на соперника в его зоне'],
  ['Большинство', 'когда у соперника удалён игрок'],
  ['Сэйв', 'спасение — вратарь отбил шайбу'],
  ['Ассист', 'голевая передача'],
  ['Кистевой', 'быстрый точный бросок кистями'],
  ['Плей-офф', 'игры на вылет за кубок'],
  ['Капитан', 'игрок с буквой «К» — лидер команды'],
  ['Смена', 'выход пятёрки на лёд на 40–60 секунд'],
  ['Проброс', 'шайба через две линии — свисток'],
];
// "Хоккейный словарик" — two-column glossary on skewed orange/dark tags.
function glossaryPage(data, pageNo) {
  const list = (data.team.glossary?.length ? data.team.glossary : DEFAULT_GLOSSARY).slice(0, 16);
  return `<section class="page glossary ice">
    ${deco(data)}
    <div class="orn br" style="opacity:.9"></div>
    <div class="hdr"><div class="title">Хоккейный словарик</div>${sticksSvg(data.colors.primary, data.colors.secondary, data.colors.dark)}<div class="sub">Говори как профи</div></div>
    <div class="ggrid">${list.map(([w, d], i) => `<div class="g ${i % 3 === 1 ? 'alt' : ''}"><b>${esc(w)}</b><span>${esc(d)}</span></div>`).join('')}</div>
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

// "Моя анкета" — a fill-in page for the album owner (name, number, dream, favourite player...).
function profilePage(data, pageNo) {
  const fields = data.team.profileFields || [
    'Меня зовут', 'Мой номер', 'Моя позиция', 'Хват', 'Любимый игрок', 'Любимая команда', 'Моя мечта', 'Лучший момент сезона', 'Мой девиз',
  ];
  const t = data.team;
  return `<section class="page profile ice">
    ${deco(data)}
    <div class="orn tr"></div>
    <div class="writepad"></div>
    <div class="hdr"><div class="title">Моя анкета</div><div class="sub">${esc(t.shortName || t.name)} · сезон ${esc(t.season)}</div></div>
    <div class="photo"><div class="frame"><span>Моё фото</span></div><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i></div>
    <div class="fields">${fields.map((f) => `<div class="fld"><b>${esc(f)}</b><span></span></div>`).join('')}</div>
    <div class="goals"><h5>Мои цели на сезон</h5>${[1, 2, 3].map((n) => `<div class="goal"><span class="pucknum">${puckLabelHtml(data, n, { orange: true, fontSize: 4.4 })}</span><i></i></div>`).join('')}</div>
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

function statsPage(data, pageNo) {
  const rows = Array.from({ length: 18 }, (_, i) => `<tr><td class="i">${i + 1}</td><td></td><td></td><td></td><td></td></tr>`).join('');
  return `<section class="page stats ice">
    ${deco(data)}
    <div class="orn br" style="opacity:.9"></div>
    ${goalSvg(data.colors.secondary, `color-mix(in srgb,${data.colors.primary} 45%,transparent)`)}
    <div class="hdr"><div class="title">Мой сезон</div></div>
    <div class="note">Записывай сюда матчи сезона ${esc(data.team.season)}: дату, соперника, счёт и номера карточек, которые ты получил за победу.</div>
    <table><thead><tr><th></th><th>Дата</th><th>Соперник</th><th>Счёт</th><th>Карточки</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

// Blank filler so card-slot pages land on the right side of each spread (odd page numbers).
function blankPage(data, pageNo) {
  return `<section class="page ice">
    ${deco(data)}
    <div class="orn br" style="opacity:.35"></div>
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

function pushTeamPage(inner, data, chunk) {
  if ((inner.length + 2) % 2 === 0) inner.push((n) => blankPage(data, n));
  inner.push((n) => teamPage(data, chunk, n));
}

function notesPage(data, pageNo) {
  const lines = Array.from({ length: 22 }, () => '<div class="line"></div>').join('');
  return `<section class="page notes ice">
    ${deco(data)}
    <div class="orn br" style="opacity:.9"></div>
    <div class="hdr"><div class="title">Мои заметки</div></div>
    <div class="lines">${lines}</div>
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

// Up to AUTOGRAPHS_PER_PAGE signature boxes in 3 columns; box height shrinks from 33 mm so 7 rows still fit.
const AUTOGRAPHS_PER_PAGE = 21;
function autographsPage(data, pageNo, cards) {
  const list = cards.slice(0, AUTOGRAPHS_PER_PAGE);
  const rows = Math.max(1, Math.ceil(list.length / 3));
  const boxH = Math.min(33, (228 - (rows - 1) * 5) / rows);
  const boxes = list
    .map((c) => `<div class="box">${puckSvg(data.colors.dark, 'rgba(255,255,255,.35)')}<div class="n">${c.number ? `<span>#${esc(c.number)}${esc(c.role || '')}</span>` : ''}${esc(c.surname)} ${esc(c.name)}</div></div>`)
    .join('');
  return `<section class="page autographs ice">
    ${deco(data)}
    <div class="orn br" style="opacity:.9"></div>
    <div class="hdr"><div class="title">Автографы</div>${sticksSvg(data.colors.primary, data.colors.secondary, data.colors.dark)}</div>
    <div class="note">Собери подписи всей команды: попроси каждого игрока и тренера расписаться в своей ячейке.</div>
    <div class="grid" style="--boxh:${boxH.toFixed(1)}mm">${boxes}</div>
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

// Lifestyle photos from assets/gallery/ on a 6x6 grid. Tiles are chosen by photo orientation so nobody's head gets cut:
// portrait photos go to 2x2 tiles, landscape photos to 2x1 or a 4x2 hero. Bands of tiles are stacked until 6 rows are used.
const GALLERY_ROWS = 6;
function galleryLayout(queue) {
  const P = queue.filter((p) => p.aspect < 0.95);
  const L = queue.filter((p) => p.aspect >= 0.95);
  const tiles = [];
  let row = 1;
  let n = 0;
  const take = (arr, k) => arr.splice(0, k);
  while (row <= GALLERY_ROWS) {
    const left = GALLERY_ROWS - row + 1;
    if (left >= 2 && P.length >= 3 && n % 2 === 0) {
      take(P, 3).forEach((p, i) => tiles.push({ p, c: 1 + i * 2, r: row, cs: 2, rs: 2 }));
      row += 2;
    } else if (left >= 2 && P.length >= 1 && L.length >= 1) {
      const [l] = take(L, 1);
      const [p] = take(P, 1);
      if (n % 2) { tiles.push({ p, c: 1, r: row, cs: 2, rs: 2 }); tiles.push({ p: l, c: 3, r: row, cs: 4, rs: 2 }); }
      else { tiles.push({ p: l, c: 1, r: row, cs: 4, rs: 2 }); tiles.push({ p, c: 5, r: row, cs: 2, rs: 2 }); }
      row += 2;
    } else if (left >= 2 && P.length >= 2) {
      take(P, 2).forEach((p, i) => tiles.push({ p, c: 1 + i * 3, r: row, cs: 3, rs: 2 }));
      row += 2;
    } else if (L.length >= 3) {
      take(L, 3).forEach((p, i) => tiles.push({ p, c: 1 + i * 2, r: row, cs: 2, rs: 1 }));
      row += 1;
    } else if (L.length >= 2) {
      take(L, 2).forEach((p, i) => tiles.push({ p, c: 1 + i * 3, r: row, cs: 3, rs: 1 }));
      row += 1;
    } else if (left >= 2 && P.length === 1) {
      const [p] = take(P, 1);
      tiles.push({ p, c: 3, r: row, cs: 2, rs: 2 });
      row += 2;
    } else if (L.length === 1) {
      const [p] = take(L, 1);
      tiles.push({ p, c: 1, r: row, cs: 6, rs: Math.min(2, left) });
      row += Math.min(2, left);
    } else break;
    n++;
  }
  return { tiles, used: tiles.length };
}
function galleryPage(data, pageNo, tiles, title) {
  const html = tiles
    .map(({ p, c, r, cs, rs }) => {
      const tileAspect = (cs * 30) / (rs * 37);
      // heads live in the upper part of a photo: anchor the crop towards the top when the tile is wider than the photo
      const pos = p.aspect < tileAspect ? 'center 12%' : 'center 30%';
      return `<div class="ph" style="grid-column:${c} / span ${cs};grid-row:${r} / span ${rs}"><img src="${p.src}" style="object-position:${pos}"></div>`;
    })
    .join('');
  return `<section class="page gallery ice">
    ${deco(data)}
    <div class="orn br" style="opacity:.9"></div>
    <div class="hdr"><div class="title">${esc(title || 'Жизнь команды')}</div>${sticksSvg(data.colors.primary, data.colors.secondary, data.colors.dark)}</div>
    <div class="grid">${html}</div>
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

function backCoverPage(data) {
  const t = data.team;
  const texts = t.texts || {};
  const qr = data.assets.qr ? `<img src="${data.assets.qr}">` : `<div class="ph">QR-код<br>assets/qr.png</div>`;
  const logo = data.assets.logo ? `<img src="${data.assets.logo}">` : '';
  const wall = data.cards
    .map((c) => `<div class="mini"><div class="mc">${cardFront({ ...c, photo: c.photoSmall }, data)}</div><span>${c.index}</span></div>`)
    .join('');
  const overlay = data.assets.history || data.assets.back;
  return `<section class="page backcover">
    ${overlay ? `<div class="photo"><img src="${overlay}"></div><div class="tint"></div>` : ''}<div class="pattern"></div>
    <div class="top"><div class="name">${esc(t.name)}<small>${esc(t.city || '')}${t.city ? ' · ' : ''}Сезон ${esc(t.season)}</small></div>${logo}</div>
    <div class="collect"><div class="ttl">Собери все карточки<span>до конца сезона</span></div><div class="wall">${wall}</div></div>
    <div class="cta"><h2>${texts.backTitle || 'Ты есть в <span>HockeyStars</span>?'}</h2><p>${esc(texts.backText || 'Твоя команда уже там, устанавливай по QR-коду')}</p></div>
    <div class="qr">${qr}</div>
    <div class="brand"><img src="${data.brand.hockeystarsWhite}">${texts.backFooter ? `<small>${esc(texts.backFooter)}</small>` : ''}</div>
  </section>`;
}

function albumHtml(data) {
  const chunks = [];
  const per = slotsPerPage(data.cardSize);
  for (let i = 0; i < data.cards.length; i += per) chunks.push(data.cards.slice(i, i + per));

  // Inner page order. With `album.pages` in team.json the whole order is explicit ("team" takes the next chunk of cards);
  // otherwise: intro, team, history, team, team, ... + extraPages, then filler pages so the total is a multiple of 4.
  const inner = [];
  const albumCfg = data.team.album || {};
  let chunkIdx = 0;
  let extra;
  if (albumCfg.pages?.length) {
    extra = albumCfg.pages;
  } else {
    inner.push((n) => introPage(data, n));
    if (chunks.length) pushTeamPage(inner, data, chunks[chunkIdx++]);
    inner.push((n) => historyPage(data, n));
    extra = albumCfg.extraPages?.length ? albumCfg.extraPages : data.assets.gallery.length ? ['gallery'] : [];
    extra = [...Array(chunks.length - chunkIdx).fill('team'), ...extra];
  }
  let galleryOffset = 0;
  const people = data.cards.filter((c) => ['player', 'coach', 'legend'].includes(c.type));
  let autographOffset = 0;
  const nextAutographs = () => {
    const chunk = people.slice(autographOffset, autographOffset + AUTOGRAPHS_PER_PAGE);
    autographOffset += chunk.length;
    return chunk;
  };
  for (const kind of extra) {
    if (kind === 'team') { if (chunkIdx < chunks.length) pushTeamPage(inner, data, chunks[chunkIdx++]); }
    else if (kind === 'intro') inner.push((n) => introPage(data, n));
    else if (kind === 'history') inner.push((n) => historyPage(data, n));
    else if (kind === 'facts') inner.push((n) => factsPage(data, n));
    else if (kind === 'glossary') inner.push((n) => glossaryPage(data, n));
    else if (kind === 'profile') inner.push((n) => profilePage(data, n));
    else if (kind === 'notes') inner.push((n) => notesPage(data, n));
    else if (kind === 'stats') inner.push((n) => statsPage(data, n));
    else if (kind === 'quotes') inner.push((n) => quotesPage(data, n));
    else if (kind === 'autographs') {
      const chunk = nextAutographs();
      if (chunk.length) inner.push((n) => autographsPage(data, n, chunk));
    } else if (kind.startsWith('gallery')) {
      const title = kind.includes(':') ? kind.slice(kind.indexOf(':') + 1) : albumCfg.galleryTitle;
      const folder = kind.split(':')[0];
      if (folder !== 'gallery') {
        // dedicated folder, e.g. "gallery-fans:Наши болельщики" → assets/gallery-fans/
        const { tiles } = galleryLayout((data.assets.galleries?.[folder] || []).slice(0, 12));
        if (tiles.length) inner.push((n) => galleryPage(data, n, tiles, title));
        continue;
      }
      const { tiles, used } = galleryLayout(data.assets.gallery.slice(galleryOffset, galleryOffset + 12));
      galleryOffset += used;
      if (tiles.length) inner.push((n) => galleryPage(data, n, tiles, title));
    }
  }
  while (chunkIdx < chunks.length) pushTeamPage(inner, data, chunks[chunkIdx++]);
  // Saddle-stitched booklet: pad to a multiple of 4 pages — leftover gallery photos, then autographs, then the match log.
  let statsUsed = extra.includes('stats');
  while ((inner.length + 2) % 4 !== 0) {
    const { tiles, used } = galleryLayout(data.assets.gallery.slice(galleryOffset, galleryOffset + 12));
    if (tiles.length >= 4) {
      galleryOffset += used;
      inner.push((n) => galleryPage(data, n, tiles, albumCfg.galleryTitle));
    } else if (autographOffset < people.length) {
      const autographs = nextAutographs();
      inner.push((n) => autographsPage(data, n, autographs));
    } else if (!statsUsed) {
      statsUsed = true;
      inner.push((n) => statsPage(data, n));
    } else {
      inner.push((n) => notesPage(data, n));
    }
  }

  const pages = [coverPage(data), ...inner.map((fn, i) => fn(i + 2)), backCoverPage(data)];
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${albumCss(data)}</style></head><body>${pages.join('\n')}</body></html>`;
}

module.exports = { albumHtml, PAGE };
