// Sticker album (Panini / NHL style) for a whole hockey school: one spread per birth year, club spread,
// SKA history, school page, legends spread. Every slot in the album is a real sticker-size cell (single or double).
const { esc } = require('./styles');
const { stickerFront } = require('./stickers');
const shared = require('./album');

const COLS = 5;
const ROWS = 5;
const CAP_H = 6.5; // caption under a slot
const ROW_GAP = 2.5;
const SIDE = 12; // inner margin from trim
const GRID_TOP = 38; // from trim top
const BAND_H = 30;

function metrics(data) {
  const { w, h, bleed } = shared.pageOf(data);
  const s = data.stickerSize;
  const inner = w - SIDE * 2;
  const gap = (inner - COLS * s.w) / (COLS - 1);
  const rowH = s.h + CAP_H;
  const pitch = rowH + ROW_GAP;
  const gridTop = bleed + GRID_TOP;
  const gridBottom = bleed + h - 16;
  return { w, h, bleed, s, inner, gap, rowH, pitch, gridTop, gridBottom, left: bleed + SIDE };
}

function stickerAlbumCss(data) {
  const m = metrics(data);
  const { w, h, bleed, s } = m;
  return `
${shared.albumCss(data)}
/* ---------- skin: real torn-stripe ornaments from the club CDR instead of CSS gradients ---------- */
.orn{background:none !important;transform:none !important;z-index:0;}
.orn.tl,.orn.tr,.orn.br,.orn.bl{width:auto;height:auto;left:auto;right:auto;top:auto;bottom:auto;}
.orn img{display:block;}
.orn.tl{left:-${bleed}mm;top:-${bleed}mm;} .orn.tl img{width:${w * 0.55}mm;}
.orn.br{right:-${bleed}mm;bottom:-${bleed}mm;} .orn.br img{width:${w * 0.6}mm;}
.orn.bl{left:-${bleed}mm;bottom:-${bleed}mm;transform:scaleX(-1) !important;} .orn.bl img{width:${w * 0.6}mm;}
.orn.tr{right:-${bleed}mm;top:-${bleed}mm;transform:scaleX(-1) !important;} .orn.tr img{width:${w * 0.5}mm;}
.year .orn img,.club .orn img{width:${w * 0.42}mm;} .legends .orn img{width:${w * 0.38}mm;}
.page.ice{background:#f3f7fb;}
.page.ice .bgimg{opacity:.9;}
.page.ice .bgimg::after{background:linear-gradient(180deg,rgba(255,255,255,.55) 0%,rgba(255,255,255,.25) 40%,rgba(255,255,255,.45) 100%);}
.bgband{display:none;}
.deco .rink{opacity:.05 !important;}
.title{font-family:'Unbounded';font-weight:900;font-size:9mm;}
.title::after{height:1.6mm;bottom:-1.6mm;}
.pgnum{font-family:'Unbounded';font-weight:700;font-size:3mm;background:var(--dark);color:#fff;padding:1mm 2.6mm;border-radius:2mm;opacity:1;bottom:${bleed + 4}mm;z-index:5;}
.pgnum.l{left:${bleed + 10}mm;} .pgnum.r{right:${bleed + 10}mm;}

/* ---------- shared: band header, grid of sticker slots ---------- */
.band{position:absolute;left:0;right:0;top:0;height:${bleed + BAND_H}mm;background:linear-gradient(90deg,var(--dark),var(--primary));overflow:hidden;}
.band::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1.8mm;background:linear-gradient(90deg,var(--secondary) 0 62%,#fff 62% 66%,var(--secondary) 66%);}
.band .stripes{position:absolute;right:-20mm;top:-10mm;width:120mm;height:70mm;transform:skewX(-25deg);background:repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 6mm,transparent 6mm 16mm);}
.left .band .stripes{right:auto;left:-20mm;}
.band.red{background:linear-gradient(90deg,var(--secondary),#a3001f);} .band.red::after{background:linear-gradient(90deg,var(--primary) 0 62%,#fff 62% 66%,var(--primary) 66%);}
.band.gold{background:linear-gradient(90deg,#02132b,#0b3d91);} .band.gold::after{background:linear-gradient(90deg,#f2c14e 0 62%,#fff 62% 66%,#f2c14e 66%);}
.bignum{position:absolute;top:${bleed + 3}mm;font-family:'Unbounded';font-weight:900;font-size:22mm;line-height:1;color:#fff;letter-spacing:-.02em;z-index:1;}
.left .bignum{left:${bleed + SIDE}mm;} .right .bignum{right:${bleed + SIDE}mm;}
.bandtxt{position:absolute;top:${bleed + 7}mm;color:#fff;z-index:1;}
.left .bandtxt{left:${bleed + 82}mm;} .right .bandtxt{right:${bleed + 82}mm;text-align:right;}
.bandtxt.solo{left:${bleed + SIDE}mm;right:auto;text-align:left;} .right .bandtxt.solo{left:auto;right:${bleed + SIDE}mm;text-align:right;}
.bandtxt .t1{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:7mm;line-height:1;}
.bandtxt .t1.big{font-family:'Unbounded';font-weight:900;font-size:10mm;}
.bandtxt .t2{font-family:'Fira Sans Extra Condensed';font-weight:500;text-transform:uppercase;font-size:3.4mm;letter-spacing:.18em;color:rgba(255,255,255,.8);margin-top:1.6mm;}
.bandlogo{position:absolute;top:${bleed + 4}mm;width:22mm;height:22mm;z-index:1;}
.left .bandlogo{right:${bleed + SIDE}mm;} .right .bandlogo{left:${bleed + SIDE}mm;}
.bandlogo img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 .6mm 1.2mm rgba(0,0,0,.4));}

.grid{position:absolute;left:${m.left}mm;right:${m.left}mm;top:${m.gridTop}mm;display:grid;grid-template-columns:repeat(${COLS},${s.w}mm);grid-auto-rows:${m.rowH}mm;justify-content:space-between;row-gap:${ROW_GAP}mm;z-index:2;}
.cell{width:${s.w}mm;height:${m.rowH}mm;position:relative;}
.cell.dbl{grid-column:span 2;width:auto;}
.slot{position:relative;width:${s.w}mm;height:${s.h}mm;border:.4mm solid var(--primary);border-radius:1.2mm;background:#fff;box-shadow:inset 0 0 0 .9mm #fff,inset 0 0 0 1.25mm color-mix(in srgb,var(--secondary) 70%,#fff);overflow:hidden;}
.slot.dbl{width:100%;}
.slot .ghost{position:absolute;inset:1.3mm;filter:blur(.25mm) grayscale(.15);opacity:.24;}
.slot .ghost .sticker{width:100%;height:100%;} .slot .ghost .sticker .frame{inset:0;border:0;box-shadow:none;}
.slot .ghost img.full{width:100%;height:100%;object-fit:cover;display:block;}
.slot .no{position:absolute;left:1.3mm;top:1.3mm;min-width:8mm;height:5.2mm;padding:0 1.4mm;background:var(--secondary);color:#fff;font-family:'Unbounded';font-weight:800;font-size:2.9mm;line-height:5.2mm;text-align:center;border-radius:0 0 1.2mm 0;z-index:2;}
.slot .no.r{left:auto;right:1.3mm;border-radius:0 0 0 1.2mm;}
.slot .jn{position:absolute;right:1.6mm;bottom:.8mm;font-family:'Unbounded';font-weight:900;font-size:9mm;line-height:1;color:color-mix(in srgb,var(--primary) 14%,transparent);}
.slot .split{position:absolute;top:1.3mm;bottom:1.3mm;left:50%;width:0;border-left:.35mm dashed color-mix(in srgb,var(--primary) 45%,#fff);}
.slot .lbl{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:3.6mm;letter-spacing:.14em;color:var(--primary);}
.slot .lbl small{display:block;font-weight:500;font-size:2.5mm;letter-spacing:.2em;color:#5b6b80;margin-top:.6mm;}
.slot .ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:3.2mm;color:color-mix(in srgb,var(--primary) 30%,#ccc);text-align:center;padding:3mm;line-height:1.15;}
.cell .cap{height:${CAP_H}mm;padding-top:1.1mm;text-align:center;}
.cell .cap .n{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:3mm;line-height:1;color:var(--dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cell .cap .p{font-family:'Roboto';font-weight:500;text-transform:uppercase;letter-spacing:.08em;font-size:2mm;color:#5b6b80;margin-top:.6mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

/* free area fillers */
.fill{position:absolute;left:${m.left}mm;right:${m.left}mm;z-index:2;}
.info{display:flex;gap:3mm;height:30mm;}
.info .box{flex:1;background:linear-gradient(135deg,var(--primary),var(--dark));color:#fff;border-radius:1.2mm;padding:2.5mm 3.5mm;position:relative;overflow:hidden;border-left:1.6mm solid var(--secondary);}
.info .box b{display:block;font-family:'Unbounded';font-weight:800;font-size:7.5mm;line-height:1;}
.info .box span{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.14em;font-size:2.7mm;margin-top:1.4mm;color:rgba(255,255,255,.85);}
.info .box.q{flex:2.4;background:#fff;color:var(--dark);border:.4mm solid var(--primary);border-left-width:1.6mm;border-left-color:var(--secondary);}
.info .box.q p{font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;font-size:3.6mm;line-height:1.2;}
.info .box.q small{display:block;font-family:'Roboto';font-size:2.5mm;letter-spacing:.12em;text-transform:uppercase;color:var(--secondary);margin-top:1.4mm;font-weight:700;}
.sign{display:flex;gap:3mm;margin-top:4mm;height:40mm;}
.sign .sb{flex:1;position:relative;background:rgba(255,255,255,.9);border:.4mm dashed color-mix(in srgb,var(--primary) 55%,#fff);border-radius:1.2mm;}
.sign .sb span{position:absolute;left:3mm;right:3mm;bottom:2.5mm;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:2.8mm;color:var(--primary);border-top:.35mm solid color-mix(in srgb,var(--secondary) 55%,#fff);padding-top:1.5mm;}
.check{background:rgba(255,255,255,.92);border:.4mm solid var(--primary);border-radius:1.2mm;overflow:hidden;box-shadow:inset 0 0 0 .9mm #fff,inset 0 0 0 1.25mm color-mix(in srgb,var(--secondary) 70%,#fff);padding:1.3mm;display:flex;flex-direction:column;}
.check .rh{display:flex;align-items:baseline;justify-content:space-between;background:linear-gradient(90deg,var(--dark),var(--primary));color:#fff;padding:1.8mm 3.5mm;flex:none;}
.check .rh b{font-family:'Unbounded';font-weight:800;font-size:3.6mm;text-transform:uppercase;}
.check .rh span{font-family:'Fira Sans Extra Condensed';font-weight:500;font-size:2.8mm;letter-spacing:.1em;text-transform:uppercase;opacity:.85;}
.check .items{flex:1;display:grid;grid-auto-flow:column;padding:2.5mm 3mm;column-gap:4mm;align-content:start;}
.check .it{display:flex;align-items:center;gap:1.8mm;font-family:'Fira Sans Extra Condensed';font-weight:500;font-size:3mm;line-height:1;color:var(--dark);white-space:nowrap;overflow:hidden;}
.check .it i{flex:none;width:3.4mm;height:3.4mm;border:.35mm solid var(--primary);border-radius:.6mm;background:#fff;}
.check .it b{flex:none;font-family:'Unbounded';font-weight:700;font-size:2.5mm;color:var(--secondary);min-width:6mm;}
.check .it span{overflow:hidden;text-overflow:ellipsis;}
.check .it.dbl b{color:var(--primary);}
.wm{position:absolute;right:${bleed + SIDE}mm;bottom:${bleed + 14}mm;width:70mm;height:70mm;opacity:.08;z-index:1;} .wm img{width:100%;height:100%;object-fit:contain;filter:grayscale(1);}

/* ---------- COVER: the season poster is the whole cover, album typography sits on a gradient below ---------- */
.cover{background:#041f4d;}
.cover .hero{position:absolute;inset:0;} .cover .hero img{width:100%;height:100%;object-fit:cover;object-position:center 30%;display:block;}
.cover .hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,19,43,.55) 0%,transparent 14%,transparent 58%,rgba(2,19,43,.85) 78%,var(--dark) 100%);}
.cover .ribbon{position:absolute;left:${bleed + SIDE}mm;top:${bleed + 10}mm;transform:skewX(-8deg);background:var(--secondary);color:#fff;padding:2mm 6mm;z-index:3;
  font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:4.6mm;letter-spacing:.12em;white-space:nowrap;box-shadow:0 1.5mm 3mm rgba(0,0,0,.35);}
.cover .ribbon span{display:inline-block;transform:skewX(8deg);}
.cover .biglogo{position:absolute;right:${bleed + SIDE}mm;top:${bleed + 7}mm;width:30mm;height:30mm;z-index:3;}
.cover .biglogo img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 1mm 2.5mm rgba(0,0,0,.5));}
.cover .name{position:absolute;left:${bleed + SIDE}mm;right:${bleed + SIDE}mm;bottom:${bleed + 52}mm;font-family:'Unbounded';font-weight:900;text-transform:uppercase;font-size:19.5mm;line-height:.92;color:#fff;letter-spacing:-.01em;z-index:3;
  text-shadow:0 2mm 6mm rgba(0,0,0,.45);}
.cover .name small{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;font-size:5mm;letter-spacing:.3em;color:#fff;margin-top:3mm;text-shadow:none;opacity:.9;}
.cover .name em{font-style:normal;color:var(--accent);}
.cover .heroline{position:absolute;left:0;right:0;bottom:${bleed + 47}mm;height:1.8mm;background:linear-gradient(90deg,var(--secondary) 0 55%,#fff 55% 60%,var(--primary) 60%);z-index:3;}
.cover .chips{position:absolute;left:${bleed + SIDE}mm;bottom:${bleed + 16}mm;display:flex;gap:3mm;z-index:3;}
.cover .chip{background:rgba(255,255,255,.1);border:.35mm solid rgba(255,255,255,.35);color:#fff;padding:2mm 4mm;border-radius:1.5mm;backdrop-filter:blur(1mm);text-align:center;}
.cover .chip b{display:block;font-family:'Unbounded';font-weight:800;font-size:7mm;line-height:1;}
.cover .chip span{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.14em;font-size:2.8mm;margin-top:1mm;opacity:.9;}
.cover .chip.red{background:var(--secondary);border-color:var(--secondary);}
.cover .years{position:absolute;right:${bleed + SIDE}mm;bottom:${bleed + 16}mm;z-index:3;text-align:right;color:#fff;}
.cover .years b{display:block;font-family:'Unbounded';font-weight:900;font-size:11mm;line-height:1;letter-spacing:-.02em;}
.cover .years span{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.2em;font-size:3.2mm;margin-top:1.5mm;opacity:.9;}
.cover .brand{position:absolute;left:${bleed + SIDE}mm;bottom:${bleed + 6}mm;z-index:3;} .cover .brand img{height:6mm;}

/* ---------- INTRO ---------- */
.intro .hdr{top:${bleed + 12}mm;}
.intro .lead{left:${bleed + 12}mm;right:${bleed + 12}mm;top:${bleed + 34}mm;font-size:4.3mm;line-height:1.4;}
.intro .sample{left:${bleed + 12}mm;top:${bleed + 64}mm;transform:scale(1.5);transform-origin:top left;box-shadow:0 3mm 8mm rgba(0,20,60,.3);}
.intro .sample2{position:absolute;left:${bleed + 12}mm;top:${bleed + 64 + (s.h + 4) * 1.5 + 7}mm;display:flex;transform:scale(1);transform-origin:top left;box-shadow:0 3mm 8mm rgba(0,20,60,.3);}
.intro .sample2 .sticker{margin-right:-${s.bleed * 2}mm;} .intro .sample2 .sticker:last-child{margin-right:0;}
.intro .samplecap{position:absolute;left:${bleed + 12}mm;top:${bleed + 64 + (s.h + 4) * 1.5 + 7 + (s.h + 4) + 2}mm;width:100mm;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.1em;font-size:3mm;color:var(--secondary);}
.intro .how{left:${bleed + 112}mm;right:${bleed + 12}mm;top:${bleed + 62}mm;}
.intro .how h3{font-family:'Unbounded';font-weight:800;font-size:6.2mm;}
.intro .step{font-size:3.9mm;margin-bottom:4.5mm;}
.intro .bottom{height:${h * 0.36}mm;}
.intro .bigname{display:none;}
.intro .teamphoto{top:8mm;bottom:${bleed + 14}mm;left:${bleed + 12}mm;right:${bleed + 12}mm;border-radius:2mm;border:1.2mm solid #fff;box-shadow:0 3mm 8mm rgba(0,20,60,.22);}
.intro .teamcap{position:absolute;left:${bleed + 12}mm;bottom:${bleed + 14}mm;background:var(--primary);color:#fff;padding:2mm 5mm;font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:4mm;letter-spacing:.1em;clip-path:polygon(0 0,100% 0,calc(100% - 3mm) 100%,0 100%);z-index:2;}

/* ---------- SKA HISTORY / SCHOOL text pages ---------- */
.txt .hdr{position:absolute;left:${bleed + SIDE}mm;top:${bleed + 12}mm;z-index:2;}
.txt .lead{position:absolute;left:${bleed + SIDE}mm;right:${bleed + SIDE}mm;top:${bleed + 30}mm;font-size:4.2mm;line-height:1.4;color:#1b2940;z-index:2;}
.txt .cols{position:absolute;left:${bleed + SIDE}mm;right:${bleed + SIDE}mm;top:${bleed + 52}mm;display:flex;gap:8mm;z-index:2;}
.txt .main{flex:1;} .txt .side{flex:0 0 62mm;display:flex;flex-direction:column;gap:4mm;}
.txt .era{position:relative;padding-left:17mm;margin-bottom:9mm;}
.txt .era .n{position:absolute;left:0;top:0;width:12mm;height:12mm;background:var(--secondary);color:#fff;font-family:'Unbounded';font-weight:900;font-size:5.2mm;display:flex;align-items:center;justify-content:center;border-radius:1mm;transform:skewX(-6deg);}
.txt .era .yr{font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.14em;font-size:3mm;color:var(--secondary);}
.txt .era h4{font-family:'Unbounded';font-weight:800;text-transform:uppercase;font-size:4.8mm;line-height:1.1;color:var(--dark);margin:.8mm 0 2mm;}
.txt .era p{font-size:3.9mm;line-height:1.4;color:#1b2940;}
.txt .pic{position:relative;background:#fff;border:.45mm solid var(--primary);border-radius:1.4mm;padding:2.5mm;box-shadow:0 1.5mm 4mm rgba(0,20,60,.12);}
.txt .pic img{width:100%;display:block;object-fit:contain;}
.txt .pic .c{font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.1em;font-size:2.7mm;color:var(--dark);text-align:center;margin-top:1.5mm;}
.txt .pic.dark{background:linear-gradient(180deg,var(--primary),var(--dark));} .txt .pic.dark .c{color:#fff;}
.txt .factsrow{position:absolute;left:${bleed + SIDE}mm;right:${bleed + SIDE}mm;bottom:${bleed + 16}mm;display:flex;gap:3mm;z-index:2;}
.txt .factsrow .f{flex:1;background:linear-gradient(135deg,var(--primary),var(--dark));color:#fff;border-radius:1.2mm;padding:3mm 3.5mm;border-left:1.6mm solid var(--secondary);}
.txt .factsrow .f b{display:block;font-family:'Unbounded';font-weight:800;font-size:8mm;line-height:1;}
.txt .factsrow .f span{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:2.7mm;margin-top:1.6mm;color:rgba(255,255,255,.85);line-height:1.2;}
.txt .factsttl{position:absolute;left:${bleed + SIDE}mm;bottom:${bleed + 16 + 26}mm;font-family:'Unbounded';font-weight:800;text-transform:uppercase;font-size:4.6mm;color:var(--dark);z-index:2;}
.txt .foot{position:absolute;left:${bleed + SIDE}mm;right:${bleed + SIDE}mm;bottom:${bleed + 16}mm;background:linear-gradient(135deg,var(--dark),var(--primary));color:#fff;border-radius:1.6mm;padding:5mm 7mm;border-left:2mm solid var(--secondary);z-index:2;
  font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;font-size:4.2mm;line-height:1.25;}
.txt .foot .star{position:absolute;right:-6mm;top:-9mm;font-size:46mm;line-height:1;color:rgba(255,255,255,.08);}

/* ---------- LEGENDS spread ---------- */
.legends .lrow{position:absolute;left:${m.left}mm;right:${m.left}mm;display:flex;gap:6mm;align-items:flex-start;z-index:2;}
.legends.right .lrow{flex-direction:row-reverse;text-align:right;}
.legends .lrow .cell{flex:none;}
.legends .lt{flex:1;padding-top:1mm;}
.legends .lt h4{font-family:'Unbounded';font-weight:900;text-transform:uppercase;font-size:5.6mm;line-height:1;color:var(--dark);}
.legends .lt .sub{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;letter-spacing:.14em;font-size:3.1mm;color:var(--secondary);margin:1.4mm 0 2mm;}
.legends .lt p{font-size:3.8mm;line-height:1.4;color:#1b2940;}
.legends .lrow::after{content:"";position:absolute;left:0;right:0;bottom:-4mm;height:.3mm;background:linear-gradient(90deg,var(--secondary),transparent);}
.legends.right .lrow::after{background:linear-gradient(270deg,var(--secondary),transparent);}
.legends .cup{position:absolute;top:${bleed + 2}mm;height:${BAND_H - 4}mm;z-index:1;} .legends .cup img{height:100%;filter:drop-shadow(0 .6mm 1.2mm rgba(0,0,0,.4));}
.legends.left .cup{right:${bleed + SIDE + 28}mm;} .legends.right .cup{left:${bleed + SIDE + 28}mm;}
.legends .bandtxt .t1.big{font-size:8.2mm;}

/* ---------- CLUB spread ---------- */
.club .motto{background:linear-gradient(135deg,var(--dark),var(--primary));color:#fff;border-radius:1.6mm;padding:6mm 8mm;overflow:hidden;box-shadow:0 2mm 5mm rgba(0,20,60,.2);border-left:2mm solid var(--secondary);position:relative;}
.club .motto .star{position:absolute;right:-8mm;top:-10mm;font-size:70mm;line-height:1;color:rgba(255,255,255,.07);}
.club .motto h4{font-family:'Unbounded';font-weight:800;text-transform:uppercase;font-size:6.4mm;line-height:1.05;}
.club .motto h4 span{color:var(--accent);}
.club .motto p{font-size:3.6mm;line-height:1.35;margin-top:3mm;color:rgba(255,255,255,.9);max-width:160mm;}
.club .motto .site{position:absolute;right:8mm;bottom:5mm;font-family:'Fira Sans Extra Condensed';font-weight:600;letter-spacing:.14em;text-transform:uppercase;font-size:3.2mm;color:rgba(255,255,255,.75);}
.club .coaches{margin-top:4mm;background:rgba(255,255,255,.92);border:.4mm solid var(--primary);border-left:1.6mm solid var(--secondary);border-radius:1.2mm;padding:3mm 4mm 3.5mm;}
.club .coaches h5{font-family:'Unbounded';font-weight:800;text-transform:uppercase;font-size:3.8mm;color:var(--dark);margin-bottom:2.5mm;}
.club .coaches .cg{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm 5mm;}
.club .coaches .cy{display:flex;gap:2.5mm;align-items:flex-start;font-size:3mm;line-height:1.3;color:#1b2940;}
.club .coaches .cy b{flex:none;font-family:'Unbounded';font-weight:800;font-size:3.6mm;color:var(--secondary);line-height:1.1;}
.club .trio{display:flex;gap:3mm;}
.club .trio .b{flex:1;background:rgba(255,255,255,.92);border:.4mm solid var(--primary);border-left:1.6mm solid var(--secondary);border-radius:1.2mm;padding:3mm 3.5mm;}
.club .trio .b.two{flex:2;}
.club .trio h5{font-family:'Unbounded';font-weight:800;text-transform:uppercase;font-size:3.8mm;color:var(--dark);}
.club .trio h5 small{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;letter-spacing:.14em;font-size:2.7mm;color:var(--secondary);margin-bottom:1mm;}
.club .trio p{font-size:3.2mm;line-height:1.35;color:#1b2940;margin-top:1.5mm;}
.club .poster{position:relative;border:1.2mm solid #fff;border-radius:2mm;overflow:hidden;box-shadow:0 3mm 8mm rgba(0,20,60,.22);background:var(--dark);}
.club .poster img{width:100%;height:100%;object-fit:cover;display:block;}
.club .poster .pc{position:absolute;left:0;bottom:0;background:var(--primary);color:#fff;padding:2mm 5mm;font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:3.8mm;letter-spacing:.1em;clip-path:polygon(0 0,100% 0,calc(100% - 3mm) 100%,0 100%);}
.club .poster .pc small{display:block;font-weight:500;font-size:2.6mm;letter-spacing:.16em;opacity:.85;}

/* ---------- QUOTES on cracked ice ---------- */
.quotes.dark{background:#02132b;}
.quotes.dark .cracked{position:absolute;inset:0;} .quotes.dark .cracked img{width:100%;height:100%;object-fit:cover;opacity:.55;filter:saturate(1.1);}
.quotes.dark .cracked::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,15,40,.45),rgba(0,15,40,.7));}
.quotes.dark .title{color:#fff;} .quotes.dark .qp{background:rgba(0,26,51,.92);box-shadow:0 2mm 5mm rgba(0,0,0,.45);}
.quotes.dark .deco,.quotes.dark .bgimg{display:none;}

/* ---------- BACK COVER ---------- */
.backcover > .photo > img{opacity:.55;filter:none;}
.backcover .tint{background:linear-gradient(180deg,rgba(0,26,51,.2) 0%,rgba(0,26,51,.55) 55%,var(--dark) 100%);}
.backcover .pattern{display:none;} .backcover .rink{display:none;}
.backcover .cta{bottom:${bleed + 34}mm;}
.backcover .cta h2{font-family:'Unbounded';font-weight:900;font-size:11mm;}
.backcover .cta h2 span{color:var(--secondary);}
.backcover .top{top:${bleed + 12}mm;}
.backcover .top .name{font-family:'Unbounded';font-weight:800;font-size:6mm;}
.backcover .collect{top:${bleed + 46}mm;}
.backcover .collect .ttl{font-size:8.5mm;} .backcover .collect .ttl span{color:var(--secondary);}
.backcover .yearsrow{display:flex;gap:3mm;margin-top:6mm;flex-wrap:wrap;}
.backcover .yearsrow b{background:rgba(255,255,255,.12);border:.35mm solid rgba(255,255,255,.35);color:#fff;font-family:'Unbounded';font-weight:800;font-size:5.5mm;padding:2mm 4mm;border-radius:1.5mm;}
.backcover .yearsrow b small{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;font-size:2.6mm;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-top:.8mm;}
.backcover .qr{bottom:${bleed + 32}mm;}
.backcover .brand small{display:block;max-width:150mm;font-size:2.4mm;line-height:1.35;color:rgba(255,255,255,.7);margin-top:2mm;}
`;
}

function orn(data, pos) {
  const src = pos === 'br' || pos === 'bl' ? data.assets.ornBr : data.assets.ornTl;
  return src ? `<div class="orn ${pos}"><img src="${src}"></div>` : '';
}

const totalStickers = (data) => data.cards.length;

function coverPage(data) {
  const t = data.team;
  const a = data.assets;
  const teams = Object.values(data.years || {}).filter((arr) => arr.length).length;
  return `<section class="page cover">
    <div class="hero">${a.cover ? `<img src="${a.cover}">` : ''}</div>
    <div class="ribbon"><span>Официальный альбом наклеек · ${esc(t.season)}</span></div>
    <div class="biglogo">${a.logo ? `<img src="${a.logo}">` : ''}</div>
    <div class="name">СКА <em>Стрельна</em><small>Хоккейная школа · ${esc(t.city || '')}</small></div>
    <div class="heroline"></div>
    <div class="chips">
      <div class="chip red"><b>${totalStickers(data)}</b><span>наклеек</span></div>
      <div class="chip"><b>${teams}</b><span>команд</span></div>
      <div class="chip"><b>${data.legends?.length || 0}</b><span>легенд СКА</span></div>
    </div>
    <div class="years"><b>${esc(t.yearRange || '')}</b><span>годы рождения</span></div>
    <div class="brand"><img src="${data.brand.hockeystarsWhite}"></div>
  </section>`;
}

function introPage(data, pageNo) {
  const t = data.team;
  const texts = t.texts || {};
  const sample = data.cards.find((c) => c.type === 'player' && c.hasPhoto && c.year === '2012') || data.cards.find((c) => c.type === 'player' && c.hasPhoto) || data.cards[0];
  const dbl = Object.values(data.teamStickers || {}).find((pair) => pair?.length === 2 && pair[0].hasPhoto);
  const steps = texts.steps || [];
  return `<section class="page intro ice">
    ${shared.deco(data)}
    ${orn(data, 'tr')}
    <div class="hdr"><div class="title">${esc(texts.introTitle || 'Альбом наклеек')}</div></div>
    <div class="lead">${esc(texts.introLead || '').replace(/\n/g, '<br>')} Всего в альбоме <b>${totalStickers(data)}</b> наклеек: легенды СКА, руководство и штаб школы, арена и маскот, игроки и тренеры каждой команды.</div>
    <div class="sample">${sample ? stickerFront(sample, data) : ''}</div>
    ${dbl ? `<div class="sample2">${stickerFront(dbl[0], data)}${stickerFront(dbl[1], data)}</div><div class="samplecap">Двойная наклейка — командное фото из двух половин</div>` : ''}
    <div class="how"><h3>Как собирать</h3>
      ${steps.map((s, i) => `<div class="step"><span class="pucknum">${shared.puckLabelHtml(data, i + 1, { index: i, fontSize: 4.2 })}</span><div>${esc(s)}</div></div>`).join('')}
    </div>
    <div class="bottom">
      <div class="teamphoto">${data.assets.teamPhoto ? `<img src="${data.assets.teamPhoto}">` : `<div class="ph">Общее фото школы</div>`}</div>
      <div class="teamcap">${esc(t.name)} · одна школа, ${Object.keys(data.years || {}).length} команд</div>
    </div>
    <div class="pgnum l">${pageNo}</div>
  </section>`;
}

// ---- slots -------------------------------------------------------------------------------------
function ghostOf(c, data) {
  return c.hasPhoto ? `<div class="ghost">${stickerFront({ ...c, photo: c.photoSmall }, data, { ghost: true })}</div>` : '';
}

function personCell(c, data, opts = {}) {
  if (!c) return `<div class="cell"></div>`;
  const jn = c.number ? `<div class="jn">${esc(c.number)}</div>` : '';
  const isStaff = c.type === 'coach' || c.type === 'staff' || c.type === 'legend';
  const first = isStaff ? c.name.split(' ')[0] : c.name;
  const name = c.type === 'club' ? c.surname : c.surname.startsWith('УТОЧНИТЬ') ? c.name : `${c.surname} ${first}`;
  const pos = c.position || (c.number ? `№ ${c.number}` : '');
  const ghost = c.hasPhoto ? ghostOf(c, data) : c.type === 'staff' || c.type === 'club' ? `<div class="ph">${esc(c.position)}</div>` : '';
  return `<div class="cell"><div class="slot">${ghost}${jn}<div class="no">${c.index}</div></div>
    <div class="cap"><div class="n">${esc(name)}</div><div class="p">${esc(pos)}</div></div></div>`;
}

// Double sticker (two halves) shown as one wide slot spanning two grid columns.
function doubleCell(pair, data, caption, sub) {
  const [l, r] = pair;
  const img = l.hasPhoto ? `<div class="ghost"><img class="full" src="${l.photoSmall}"></div>` : `<div class="ph">${esc(caption)}</div>`;
  return `<div class="cell dbl"><div class="slot dbl">${img}<div class="split"></div><div class="no">${l.index}</div><div class="no r">${r.index}</div>
    ${l.hasPhoto ? `<div class="lbl">${esc(caption)}<small>${esc(sub)}</small></div>` : ''}</div>
    <div class="cap"><div class="n">${esc(caption)}</div><div class="p">двойная наклейка · ${esc(sub)}</div></div></div>`;
}

const rowsOf = (cells) => Math.ceil(cells.reduce((n, c) => n + (c && c.dbl ? 2 : 1), 0) / COLS);

function renderCells(cells, data) {
  return cells.map((c) => (c && c.dbl ? doubleCell(c.dbl, data, c.caption, c.sub) : personCell(c, data))).join('');
}

// ---- year spread -------------------------------------------------------------------------------
function yearBand(data, year, side, sub) {
  const t = data.team;
  const logo = data.assets.logo ? `<div class="bandlogo"><img src="${data.assets.logo}"></div>` : '';
  return `<div class="band"><div class="stripes"></div></div>
    <div class="bignum">${esc(year)}</div>
    <div class="bandtxt"><div class="t1">${esc(t.shortName || t.name)}</div><div class="t2">${sub}</div></div>${logo}`;
}

const plural = (n, one, few, many) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many; };

function infoBoxes(data, year) {
  const t = data.team;
  const people = data.years[year] || [];
  const players = people.filter((p) => p.type === 'player').length;
  const coaches = people.filter((p) => p.type === 'coach').length;
  const goalies = people.filter((p) => /вратар/i.test(p.position)).length;
  const head = people.find((p) => /главный/i.test(p.position)) || people.find((p) => p.type === 'coach');
  return `<div class="info">
    <div class="box"><b>${players}</b><span>${plural(players, 'игрок', 'игрока', 'игроков')}</span></div>
    ${goalies ? `<div class="box"><b>${goalies}</b><span>${plural(goalies, 'вратарь', 'вратаря', 'вратарей')}</span></div>` : ''}
    ${coaches ? `<div class="box"><b>${coaches}</b><span>${plural(coaches, 'тренер', 'тренера', 'тренеров')}</span></div>` : ''}
    <div class="box q"><p>${head ? `${/главный/i.test(head.position) ? 'Главный тренер' : 'Тренер'} — ${esc(head.surname)} ${esc(head.name)}` : `Команда ${esc(year)} года рождения`}</p><small>${esc(t.shortName || t.name)} · ${esc(year)} · сезон ${esc(t.season)}</small></div>
  </div>`;
}

function checklist(data, year, height) {
  const people = data.years[year] || [];
  const pair = data.teamStickers?.[year] || [];
  const items = [
    ...people.map((p) => ({ i: p.index, n: `${p.surname} ${p.name.split(' ')[0]}` })),
    ...pair.map((p, k) => ({ i: p.index, n: `Командное фото · ${k ? 'правая' : 'левая'}`, dbl: true })),
  ];
  const lineH = 4.6;
  const rows = Math.max(1, Math.floor((height - 18) / lineH));
  const cols = Math.ceil(items.length / rows);
  return `<div class="check" style="height:${height.toFixed(1)}mm">
    <div class="rh"><b>Чек-лист коллекции · ${esc(year)}</b><span>отмечай наклейки, которые уже в альбоме</span></div>
    <div class="items" style="grid-template-rows:repeat(${rows},${lineH}mm);grid-template-columns:repeat(${cols},1fr)">${items
      .map((it) => `<div class="it${it.dbl ? ' dbl' : ''}"><i></i><b>${it.i}</b><span>${esc(it.n)}</span></div>`)
      .join('')}</div>
  </div>`;
}

function yearPage(data, year, cells, pageNo, side, opts = {}) {
  const m = metrics(data);
  const t = data.team;
  const people = data.years[year] || [];
  const used = rowsOf(cells);
  const freeTop = m.gridTop + used * m.pitch;
  const freeH = m.gridBottom - freeTop;
  let fill = '';
  if (!people.length) {
    fill = `<div class="fill" style="top:${m.gridTop}mm"><div class="info"><div class="box q"><p>Состав команды ${esc(year)} года рождения формируется</p><small>наклейки появятся в следующем выпуске</small></div></div></div>`;
  } else if (opts.fill === 'info' && freeH >= 30) {
    const sign = freeH >= 78
      ? `<div class="sign"><div class="sb"><span>Автограф главного тренера</span></div><div class="sb"><span>Автограф капитана</span></div><div class="sb"><span>Мой автограф</span></div></div>`
      : '';
    fill = `<div class="fill" style="top:${freeTop.toFixed(1)}mm">${infoBoxes(data, year)}${sign}</div>`;
  } else if (opts.fill === 'check' && freeH >= 40) {
    fill = `<div class="fill" style="top:${freeTop.toFixed(1)}mm">${checklist(data, year, Math.min(freeH, 130))}</div>`;
  }
  const sub = side === 'left' ? 'год рождения · команда' : `${people.length + (data.teamStickers?.[year]?.length || 0)} наклеек · сезон ${esc(t.season)}`;
  return `<section class="page year ${side} ice">
    ${shared.deco(data, 0.06)}
    ${orn(data, side === 'left' ? 'bl' : 'br')}
    ${yearBand(data, year, side, sub)}
    <div class="grid">${renderCells(cells, data)}</div>
    ${fill}
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

// Roster balanced across the spread in whole rows; the double team sticker closes the right page.
// Free rows: stats boxes on the left, collection checklist on the right.
function yearSpread(data, year, pageNo) {
  const per = COLS * ROWS;
  const people = [...(data.years[year] || [])];
  const pair = data.teamStickers?.[year];
  const t = data.team;
  if (!people.length) return [yearPage(data, year, [], pageNo, 'left'), yearPage(data, year, [], pageNo + 1, 'right')];
  const total = people.length + (pair ? 2 : 0);
  const totalRows = Math.ceil(total / COLS);
  const leftRows = Math.min(ROWS, Math.ceil(totalRows / 2));
  const leftCount = Math.min(people.length, leftRows * COLS);
  const left = people.slice(0, leftCount);
  const rightPeople = people.slice(leftCount, leftCount + per - (pair ? 2 : 0));
  const right = [...rightPeople];
  if (pair) {
    if (right.length % COLS === COLS - 1) right.push(null);
    right.push({ dbl: pair, caption: 'Командное фото', sub: `${t.shortName || t.name} · ${year}` });
  }
  const leftFree = ROWS - rowsOf(left);
  const rightFree = ROWS - rowsOf(right);
  return [
    yearPage(data, year, left, pageNo, 'left', { fill: leftFree >= 1 ? 'info' : '' }),
    yearPage(data, year, right, pageNo + 1, 'right', { fill: rightFree >= 1 ? 'check' : '' }),
  ];
}

// ---- club spread -------------------------------------------------------------------------------
function clubSpread(data, pageNo) {
  const m = metrics(data);
  const t = data.team;
  const staff = data.staff || [];
  const mgmt = staff.filter((c) => c.type === 'staff' && c.group === 'mgmt');
  const crew = staff.filter((c) => c.type === 'staff' && c.group !== 'mgmt');
  const club = staff.filter((c) => c.type === 'club');
  const logo = data.assets.logo ? `<div class="bandlogo"><img src="${data.assets.logo}"></div>` : '';
  const leftCells = [...mgmt, ...crew];
  const leftUsed = rowsOf(leftCells);
  const leftTop = m.gridTop + leftUsed * m.pitch;
  const facts = (t.school?.facts || []).slice(0, 4);
  const left = `<section class="page club left ice">
    ${shared.deco(data, 0.06)}${orn(data, 'bl')}
    <div class="band red"><div class="stripes"></div></div><div class="bandtxt solo"><div class="t1 big">Руководство и штаб</div><div class="t2">${esc(t.name)} · те, кто строит школу</div></div>${logo}
    <div class="grid">${renderCells(leftCells, data)}</div>
    <div class="fill" style="top:${leftTop.toFixed(1)}mm">
      <div class="motto"><div class="star">★</div><h4>Одна школа.<br>Одна <span>звезда</span>.</h4>
        <p>${esc(t.texts?.clubMotto || '')}</p>
        <div class="site">${esc((t.website || '').replace(/^https?:\/\//, '').replace(/\/$/, ''))}</div></div>
      ${facts.length ? `<div class="info" style="margin-top:4mm">${facts.map((f) => `<div class="box"><b>${esc(f.value)}</b><span>${esc(f.label).replace(/\n/g, '<br>')}</span></div>`).join('')}</div>` : ''}
      <div class="coaches"><h5>Тренерские штабы команд</h5><div class="cg">${Object.entries(data.years || {})
        .filter(([, arr]) => arr.some((p) => p.type === 'coach'))
        .map(([y, arr]) => `<div class="cy"><b>${esc(y)}</b><span>${arr.filter((p) => p.type === 'coach').map((p) => `${esc(p.surname)} ${esc(p.name.split(' ')[0])}`).join(', ')}</span></div>`)
        .join('')}</div></div>
    </div>
    ${data.assets.logo ? `<div class="wm"><img src="${data.assets.logo}"></div>` : ''}
    <div class="pgnum l">${pageNo}</div>
  </section>`;

  // right: club items in CSV order; `double=1` rows arrive as two halves → one wide slot
  const rightCells = [];
  for (let i = 0; i < club.length; i++) {
    const c = club[i];
    if (c.half === 'l' && club[i + 1]?.half === 'r') { rightCells.push({ dbl: [c, club[i + 1]], caption: c.position, sub: c.surname }); i++; }
    else rightCells.push(c);
  }
  const rightUsed = rowsOf(rightCells);
  const rightTop = m.gridTop + rightUsed * m.pitch;
  const posterH = m.gridBottom - rightTop - 62;
  const right = `<section class="page club right ice">
    ${shared.deco(data, 0.06)}${orn(data, 'br')}
    <div class="band red"><div class="stripes"></div></div><div class="bandtxt solo"><div class="t1 big">Наш клуб</div><div class="t2">арена · маскот · болельщики</div></div>${logo}
    <div class="grid">${renderCells(rightCells, data)}</div>
    <div class="fill" style="top:${rightTop.toFixed(1)}mm">
      <div class="trio">
        <div class="b two"><h5><small>Наша арена</small>АСК-С</h5><p>Домашняя арена школы в Стрельне: здесь проходят тренировки и домашние матчи всех команд — от самых младших до выпускных.</p></div>
        <div class="b"><h5><small>Маскот</small>Конь-Огонь</h5><p>Талисман школы и главный заводила на трибунах.</p></div>
        <div class="b two"><h5><small>Болельщики</small>Мамы и папы</h5><p>Самые верные фанаты: они на каждой тренировке, на каждом выезде и на каждом матче — в любую погоду.</p></div>
      </div>
      <div class="poster" style="height:${posterH.toFixed(1)}mm;margin-top:4mm">${data.assets.back ? `<img src="${data.assets.back}">` : ''}<div class="pc">Большой лёд СКА<small>цель каждого воспитанника школы</small></div></div>
    </div>
    <div class="pgnum r">${pageNo + 1}</div>
  </section>`;
  return [left, right];
}

// ---- legends spread ----------------------------------------------------------------------------
function legendsSpread(data, pageNo) {
  const m = metrics(data);
  const t = data.team;
  const legends = data.legends || [];
  const per = 4;
  const rowH = (m.gridBottom - m.gridTop) / per;
  const logo = data.assets.logo ? `<div class="bandlogo"><img src="${data.assets.logo}"></div>` : '';
  const cup = data.assets.cup ? `<div class="cup"><img src="${data.assets.cup}"></div>` : '';
  const page = (list, side, n) => `<section class="page legends ${side} ice">
    ${shared.deco(data, 0.06)}${orn(data, side === 'left' ? 'bl' : 'br')}
    <div class="band gold"><div class="stripes"></div></div><div class="bandtxt solo"><div class="t1 big">${esc(t.legendsTitle || 'Легенды и звёзды СКА')}</div><div class="t2">${side === 'left' ? 'от Ленинграда до НХЛ · серия «Легенды»' : `${legends.length} наклеек · соберите всех`}</div></div>${logo}${cup}
    ${list.map((c, i) => `<div class="lrow" style="top:${(m.gridTop + i * rowH).toFixed(1)}mm;height:${(rowH - 6).toFixed(1)}mm">${personCell(c, data)}<div class="lt"><h4>${esc(c.surname)} ${esc(c.name)}</h4><div class="sub">${esc(c.position)}</div><p>${esc(c.text)}</p></div></div>`).join('')}
    <div class="pgnum ${n % 2 === 0 ? 'l' : 'r'}">${n}</div>
  </section>`;
  return [page(legends.slice(0, per), 'left', pageNo), page(legends.slice(per, per * 2), 'right', pageNo + 1)];
}

// ---- SKA history & school text pages -----------------------------------------------------------
function skaHistoryPage(data, pageNo) {
  const h = data.team.skaHistory || {};
  const a = data.assets;
  const pics = [
    a.oldteam && { src: a.oldteam, c: 'Ленинградский хоккей, 1940-е' },
    a.tarasov && { src: a.tarasov, c: 'Анатолий Тарасов' },
    a.spengler && { src: a.spengler, c: 'Кубок Шпенглера', dark: true },
    a.medal && { src: a.medal, c: 'Бронза чемпионата СССР', dark: true },
  ].filter(Boolean);
  return `<section class="page txt ice">
    ${shared.deco(data, 0.06)}${orn(data, 'br')}
    <div class="hdr"><div class="title">${esc(h.title || 'История СКА')}</div></div>
    <div class="lead">${esc(h.lead || '')}</div>
    <div class="cols">
      <div class="main">${(h.eras || []).map((e, i) => `<div class="era"><div class="n">${i + 1}</div><div class="yr">${esc(e.years)}</div><h4>${esc(e.title)}</h4><p>${esc(e.text)}</p></div>`).join('')}</div>
      <div class="side">${pics.map((p) => `<div class="pic${p.dark ? ' dark' : ''}"><img src="${p.src}" style="max-height:${p.dark ? 34 : 44}mm"><div class="c">${esc(p.c)}</div></div>`).join('')}</div>
    </div>
    <div class="factsttl">${esc(h.factsTitle || 'Цифры успеха')}</div>
    <div class="factsrow">${(h.facts || []).map((f) => `<div class="f"><b>${esc(f.value)}</b><span>${esc(f.label).replace(/\n/g, '<br>')}</span></div>`).join('')}</div>
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

function schoolPage(data, pageNo) {
  const s = data.team.school || {};
  const a = data.assets;
  const pics = [
    a.arenaCups && { src: a.arenaCups, c: 'Витрина трофеев школы' },
    a.cup && { src: a.cup, c: 'Кубок Гагарина — цель вертикали СКА', dark: true },
    a.skates && { src: a.skates, c: 'Первые шаги на льду — с 5 лет' },
  ].filter(Boolean);
  return `<section class="page txt ice">
    ${shared.deco(data, 0.06)}${orn(data, 'bl')}
    <div class="hdr"><div class="title">${esc(s.title || 'Школа')}</div></div>
    <div class="lead">${esc(s.lead || '')}</div>
    <div class="cols" style="top:${data.pageSize.bleed + 60}mm">
      <div class="main">${(s.items || []).map((e, i) => `<div class="era"><div class="n">${i + 1}</div><h4>${esc(e.title)}</h4><p>${esc(e.text)}</p></div>`).join('')}</div>
      <div class="side" style="flex-basis:56mm">${pics.map((p) => `<div class="pic${p.dark ? ' dark' : ''}"><img src="${p.src}" style="max-height:${p.dark ? 40 : 34}mm"><div class="c">${esc(p.c)}</div></div>`).join('')}</div>
    </div>
    ${(s.facts || []).length ? `<div class="factsttl" style="bottom:${data.pageSize.bleed + 16 + 26 + 30}mm">Школа в цифрах</div>
    <div class="factsrow" style="bottom:${data.pageSize.bleed + 16 + 30}mm">${s.facts.map((f) => `<div class="f"><b>${esc(f.value)}</b><span>${esc(f.label).replace(/\n/g, '<br>')}</span></div>`).join('')}</div>` : ''}
    <div class="foot"><div class="star">★</div>${esc(s.footer || '')}</div>
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

function quotesPage(data, pageNo) {
  const html = shared.quotesPage(data, pageNo);
  if (!data.assets.iceCracked) return html;
  return html
    .replace('class="page quotes ice"', 'class="page quotes dark"')
    .replace(/(<section[^>]*>)/, `$1<div class="cracked"><img src="${data.assets.iceCracked}"></div>`);
}

function backCoverPage(data) {
  const t = data.team;
  const texts = t.texts || {};
  const qr = data.assets.qr ? `<img src="${data.assets.qr}">` : '';
  const years = Object.entries(data.years || {}).map(([y, arr]) => `<b>${esc(y)}<small>${arr.length ? arr.length + 2 + ' накл.' : 'скоро'}</small></b>`).join('');
  return `<section class="page backcover">
    ${data.assets.back ? `<div class="photo"><img src="${data.assets.back}"></div>` : ''}<div class="tint"></div>
    <div class="top"><div class="name">${esc(t.name)}<small>${esc(t.city || '')} · сезон ${esc(t.season)}</small></div>${data.assets.logo ? `<img src="${data.assets.logo}">` : ''}</div>
    <div class="collect"><div class="ttl">Собери всю школу<span>${totalStickers(data)} наклеек · ${esc(t.yearRange || '')}</span></div><div class="yearsrow">${years}</div></div>
    <div class="cta"><h2>${texts.backTitle || 'Ты есть в <span>HockeyStars</span>?'}</h2><p>${esc(texts.backText || 'Твоя команда уже там — устанавливай по QR-коду')}</p></div>
    <div class="qr">${qr}</div>
    <div class="brand"><img src="${data.brand.hockeystarsWhite}">${texts.backFooter ? `<small>${esc(texts.backFooter)}</small>` : ''}</div>
  </section>`;
}

function stickerAlbumHtml(data) {
  const cfg = data.team.album || {};
  const order = cfg.pages || [];
  const inner = [];
  const people = data.cards.filter((c) => ['player', 'coach'].includes(c.type));
  let autographOffset = 0;
  const nextAutographs = () => {
    const chunk = people.slice(autographOffset, autographOffset + shared.AUTOGRAPHS_PER_PAGE);
    autographOffset += chunk.length;
    return chunk;
  };
  const push = (fn, count = 1) => { fn._pages = count; inner.push(fn); };
  for (const kind of order) {
    if (kind === 'cover' || kind === 'backcover') continue;
    if (kind.startsWith('year:')) push((n) => yearSpread(data, kind.slice(5), n), 2);
    else if (kind === 'special' || kind === 'club') push((n) => clubSpread(data, n), 2);
    else if (kind === 'legends') push((n) => legendsSpread(data, n), 2);
    else if (kind === 'ska-history') push((n) => skaHistoryPage(data, n));
    else if (kind === 'school') push((n) => schoolPage(data, n));
    else if (kind === 'intro') push((n) => introPage(data, n));
    else if (kind === 'history') push((n) => shared.historyPage(data, n));
    else if (kind === 'quotes') push((n) => quotesPage(data, n));
    else if (kind === 'facts') push((n) => shared.factsPage(data, n));
    else if (kind === 'glossary') push((n) => shared.glossaryPage(data, n));
    else if (kind === 'profile') push((n) => shared.profilePage(data, n));
    else if (kind === 'notes') push((n) => shared.notesPage(data, n));
    else if (kind === 'autographs') {
      const chunk = nextAutographs();
      if (chunk.length) push((n) => shared.autographsPage(data, n, chunk));
    }
  }
  const count = () => inner.reduce((n, fn) => n + (fn._pages || 1), 0);
  while ((count() + 2) % 4 !== 0) push((n) => shared.notesPage(data, n));
  const flat = [];
  let n = 2;
  for (const fn of inner) {
    const out = fn(n);
    if (Array.isArray(out)) { flat.push(...out); n += out.length; } else { flat.push(out); n += 1; }
  }
  const pages = [coverPage(data), ...flat, backCoverPage(data)];
  // ornaments as images: swap the CSS-gradient corner blocks of shared pages for the club's torn stripes
  const html = pages.join('\n')
    .replace(/<div class="orn br"[^>]*><\/div>/g, orn(data, 'br'))
    .replace(/<div class="orn tr"><\/div>/g, orn(data, 'tr'))
    .replace(/<div class="orn tl"><\/div>/g, orn(data, 'tl'));
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${stickerAlbumCss(data)}</style></head><body>${html}</body></html>`;
}

module.exports = { stickerAlbumHtml };
