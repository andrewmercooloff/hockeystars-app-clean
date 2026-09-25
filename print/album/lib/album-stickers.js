// Sticker album (Panini / NHL style) for a whole hockey school: one spread per birth year + club spread.
const { esc } = require('./styles');
const { stickerFront } = require('./stickers');
const { sticksSvg } = require('./hockey');
const shared = require('./album');

function stickerAlbumCss(data) {
  const { w, h, bleed } = shared.pageOf(data);
  const s = data.stickerSize;
  const yg = data.team.album?.yearGrid || { cols: 10, rows: 5 };
  const cols = yg.cols / 2;
  const a = data.assets;
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
.year .orn img,.club .orn img{width:${w * 0.52}mm;}
.page.ice{background:#f3f7fb;}
.page.ice .bgimg{opacity:.9;}
.page.ice .bgimg::after{background:linear-gradient(180deg,rgba(255,255,255,.55) 0%,rgba(255,255,255,.25) 40%,rgba(255,255,255,.45) 100%);}
.bgband{display:none;}
.deco .rink{opacity:.05 !important;}
.title{font-family:'Unbounded';font-weight:900;font-size:9mm;}
.title::after{height:1.6mm;bottom:-1.6mm;}
.pgnum{font-family:'Unbounded';font-weight:700;font-size:3mm;background:var(--dark);color:#fff;padding:1mm 2.6mm;border-radius:2mm;opacity:1;bottom:${bleed + 4}mm;}
.pgnum.l{left:${bleed + 10}mm;} .pgnum.r{right:${bleed + 10}mm;}

/* ---------- COVER ---------- */
.cover{background:#dfe9f2;}
.cover .cbg{position:absolute;inset:0;} .cover .cbg img{width:100%;height:100%;object-fit:cover;}
.cover .biglogo{position:absolute;left:50%;top:${bleed + 16}mm;transform:translateX(-50%);width:92mm;height:92mm;display:flex;align-items:center;justify-content:center;}
.cover .biglogo img{max-width:100%;max-height:100%;filter:drop-shadow(0 2mm 4mm rgba(0,20,60,.35));}
.cover .ribbon{position:absolute;left:50%;top:${bleed + 114}mm;transform:translateX(-50%) skewX(-8deg);background:var(--secondary);color:#fff;padding:2.4mm 9mm;
  font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:6.2mm;letter-spacing:.12em;white-space:nowrap;box-shadow:0 1.5mm 3mm rgba(0,0,0,.25);}
.cover .ribbon span{display:inline-block;transform:skewX(8deg);}
.cover .name{position:absolute;left:0;right:0;top:${bleed + 128}mm;text-align:center;font-family:'Unbounded';font-weight:900;text-transform:uppercase;font-size:21mm;line-height:.92;color:var(--primary);
  letter-spacing:-.01em;text-shadow:0 .8mm 0 #fff,0 2mm 4mm rgba(0,30,80,.18);}
.cover .name small{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;font-size:6mm;letter-spacing:.3em;color:var(--dark);margin-top:3mm;text-shadow:none;}
.cover .hero{position:absolute;left:0;right:0;bottom:0;height:${h * 0.44 + bleed}mm;background:linear-gradient(180deg,var(--dark) 0%,#001a33 100%);overflow:hidden;
  clip-path:polygon(0 8mm,100% 0,100% 100%,0 100%);}
.cover .hero img{position:absolute;left:50%;top:50%;width:112%;transform:translate(-50%,-46%);mix-blend-mode:lighten;opacity:.98;}
.cover .hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,26,51,.3) 0%,transparent 30%,transparent 65%,rgba(0,26,51,.92) 100%);}
.cover .heroline{position:absolute;left:0;right:0;bottom:${h * 0.44 + bleed - 3}mm;height:2.2mm;background:linear-gradient(90deg,var(--secondary) 0 55%,#fff 55% 60%,var(--primary) 60%);transform:skewY(-1.9deg);transform-origin:left;z-index:2;}
.cover .chips{position:absolute;left:${bleed + 12}mm;bottom:${bleed + 14}mm;display:flex;gap:3mm;z-index:3;}
.cover .chip{background:rgba(255,255,255,.1);border:.35mm solid rgba(255,255,255,.35);color:#fff;padding:2mm 4mm;border-radius:1.5mm;backdrop-filter:blur(1mm);text-align:center;}
.cover .chip b{display:block;font-family:'Unbounded';font-weight:800;font-size:7mm;line-height:1;}
.cover .chip span{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.14em;font-size:2.8mm;margin-top:1mm;opacity:.9;}
.cover .chip.red{background:var(--secondary);border-color:var(--secondary);}
.cover .years{position:absolute;right:${bleed + 12}mm;bottom:${bleed + 14}mm;z-index:3;text-align:right;color:#fff;}
.cover .years b{display:block;font-family:'Unbounded';font-weight:900;font-size:19mm;line-height:.9;letter-spacing:-.02em;}
.cover .years span{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.2em;font-size:3.4mm;margin-top:1.5mm;opacity:.9;}
.cover .brand{position:absolute;left:${bleed + 12}mm;bottom:${bleed + 5}mm;z-index:3;} .cover .brand img{height:6mm;}

/* ---------- INTRO ---------- */
.intro .hdr{top:${bleed + 12}mm;}
.intro .lead{left:${bleed + 12}mm;right:${bleed + 12}mm;top:${bleed + 34}mm;font-size:4.3mm;line-height:1.4;}
.intro .sample{left:${bleed + 12}mm;top:${bleed + 62}mm;transform:scale(1.8);transform-origin:top left;box-shadow:0 3mm 8mm rgba(0,20,60,.3);}
.intro .how{left:${bleed + 108}mm;right:${bleed + 12}mm;top:${bleed + 60}mm;}
.intro .how h3{font-family:'Unbounded';font-weight:800;font-size:6.2mm;}
.intro .step{font-size:4mm;margin-bottom:5mm;}
.intro .bottom{height:${h * 0.5}mm;}
.intro .bigname{display:none;}
.intro .teamphoto{top:8mm;bottom:${bleed + 14}mm;left:${bleed + 12}mm;right:${bleed + 12}mm;border-radius:2mm;border:1.2mm solid #fff;box-shadow:0 3mm 8mm rgba(0,20,60,.22);}
.intro .teamcap{position:absolute;left:${bleed + 12}mm;bottom:${bleed + 14}mm;background:var(--primary);color:#fff;padding:2mm 5mm;font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:4mm;letter-spacing:.1em;
  clip-path:polygon(0 0,100% 0,calc(100% - 3mm) 100%,0 100%);z-index:2;}

/* ---------- YEAR SPREADS ---------- */
.year .band{position:absolute;left:0;right:0;top:0;height:${bleed + 30}mm;background:linear-gradient(90deg,var(--dark),var(--primary));overflow:hidden;}
.year .band::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1.8mm;background:linear-gradient(90deg,var(--secondary) 0 62%,#fff 62% 66%,var(--secondary) 66%);}
.year .band .stripes{position:absolute;right:-20mm;top:-10mm;width:120mm;height:70mm;transform:skewX(-25deg);
  background:repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 6mm,transparent 6mm 16mm);}
.year.left .band .stripes{right:auto;left:-20mm;}
.year .bignum{position:absolute;top:${bleed + 3}mm;font-family:'Unbounded';font-weight:900;font-size:22mm;line-height:1;color:#fff;letter-spacing:-.02em;}
.year.left .bignum{left:${bleed + 10}mm;} .year.right .bignum{right:${bleed + 10}mm;}
.year .bandtxt{position:absolute;top:${bleed + 7}mm;color:#fff;}
.year.left .bandtxt{left:${bleed + 82}mm;} .year.right .bandtxt{right:${bleed + 82}mm;text-align:right;}
.year .bandtxt .t1{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:7mm;line-height:1;}
.year .bandtxt .t2{font-family:'Fira Sans Extra Condensed';font-weight:500;text-transform:uppercase;font-size:3.4mm;letter-spacing:.18em;color:rgba(255,255,255,.8);margin-top:1.6mm;}
.year .bandlogo{position:absolute;top:${bleed + 4}mm;width:22mm;height:22mm;}
.year.left .bandlogo{right:${bleed + 10}mm;} .year.right .bandlogo{left:${bleed + 10}mm;}
.year .bandlogo img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 .6mm 1.2mm rgba(0,0,0,.4));}
.year .grid{left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 40}mm;bottom:auto;display:grid;grid-template-columns:repeat(${cols},${s.w}mm);grid-auto-rows:${s.h + 7}mm;
  justify-content:space-between;row-gap:3mm;}
.year .cell{width:${s.w}mm;height:${s.h + 7}mm;}
.year .slot{width:${s.w}mm;height:${s.h}mm;border:.4mm solid var(--primary);border-radius:1.2mm;background:#fff;box-shadow:inset 0 0 0 .9mm #fff,inset 0 0 0 1.25mm color-mix(in srgb,var(--secondary) 70%,#fff);overflow:hidden;}
.year .slot .ghost{position:absolute;inset:1.3mm;filter:blur(.35mm) grayscale(.2);opacity:.16;}
.year .slot .ghost .sticker{width:100%;height:100%;} .year .slot .ghost .sticker .frame{inset:0;border:0;box-shadow:none;}
.year .slot .no{position:absolute;left:1.3mm;top:1.3mm;min-width:8mm;height:5.2mm;padding:0 1.4mm;background:var(--secondary);color:#fff;font-family:'Unbounded';font-weight:800;font-size:2.9mm;line-height:5.2mm;text-align:center;border-radius:0 0 1.2mm 0;}
.year .slot .jn{position:absolute;right:1.6mm;bottom:.8mm;font-family:'Unbounded';font-weight:900;font-size:9mm;line-height:1;color:color-mix(in srgb,var(--primary) 14%,transparent);}
.year .slot.empty{border-style:dashed;border-color:color-mix(in srgb,var(--primary) 35%,#ccc);box-shadow:none;background:rgba(255,255,255,.55);}
.year .cell .cap{height:7mm;padding-top:1.1mm;text-align:center;}
.year .cell .cap .n{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:2.9mm;line-height:1;color:var(--dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.year .cell .cap .p{font-family:'Roboto';font-weight:500;text-transform:uppercase;letter-spacing:.08em;font-size:2mm;color:#5b6b80;margin-top:.5mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.year .teamstrip{position:absolute;left:${(w - s.teamW) / 2 + bleed}mm;bottom:${bleed + 12}mm;width:${s.teamW}mm;height:${s.teamH}mm;transform:none;border:.4mm solid var(--primary);border-radius:1.2mm;background:#fff;
  box-shadow:inset 0 0 0 .9mm #fff,inset 0 0 0 1.25mm color-mix(in srgb,var(--secondary) 70%,#fff);overflow:hidden;display:block;}
.year .teamstrip .ghost{position:absolute;inset:1.3mm;opacity:.16;filter:blur(.35mm);} .year .teamstrip .ghost img{width:100%;height:100%;object-fit:cover;}
.year .teamstrip .no{position:absolute;left:1.3mm;top:1.3mm;min-width:8mm;height:5.2mm;padding:0 1.4mm;background:var(--secondary);color:#fff;font-family:'Unbounded';font-weight:800;font-size:2.9mm;line-height:5.2mm;text-align:center;border-radius:0 0 1.2mm 0;}
.year .teamstrip .lbl{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:4.2mm;letter-spacing:.14em;color:var(--primary);}
.year .teamstrip .lbl small{display:block;font-weight:500;font-size:2.6mm;letter-spacing:.2em;color:#5b6b80;margin-top:.6mm;}
.year .stripcap{position:absolute;left:${(w - s.teamW) / 2 + bleed}mm;bottom:${bleed + 6}mm;width:${s.teamW}mm;text-align:center;font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:3mm;color:var(--dark);}
.year .results{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;background:rgba(255,255,255,.92);border:.4mm solid var(--primary);border-radius:1.2mm;overflow:hidden;
  box-shadow:inset 0 0 0 .9mm #fff,inset 0 0 0 1.25mm color-mix(in srgb,var(--secondary) 70%,#fff);padding:1.3mm;}
.year .results .rh{display:flex;align-items:baseline;justify-content:space-between;background:linear-gradient(90deg,var(--dark),var(--primary));color:#fff;padding:1.8mm 3.5mm;}
.year .results .rh b{font-family:'Unbounded';font-weight:800;font-size:3.8mm;text-transform:uppercase;}
.year .results .rh span{font-family:'Fira Sans Extra Condensed';font-weight:500;font-size:2.8mm;letter-spacing:.1em;text-transform:uppercase;opacity:.85;}
.year .results table{width:100%;border-collapse:collapse;font-size:3mm;}
.year .results th{font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.08em;font-size:2.7mm;color:var(--primary);padding:1.4mm 2mm .8mm;text-align:left;border-bottom:.35mm solid var(--secondary);}
.year .results td{height:7.2mm;border-bottom:.25mm solid color-mix(in srgb,var(--primary) 22%,transparent);padding:0 2mm;}
.year .results td.i{text-align:center;font-family:'Fira Sans Extra Condensed';font-weight:700;color:var(--secondary);}
.year .info{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;bottom:${bleed + 12}mm;height:${s.teamH}mm;display:flex;gap:4mm;}
.year .info .box{flex:1;background:linear-gradient(135deg,var(--primary),var(--dark));color:#fff;border-radius:1.2mm;padding:2.5mm 4mm;position:relative;overflow:hidden;border-left:1.6mm solid var(--secondary);}
.year .info .box b{display:block;font-family:'Unbounded';font-weight:800;font-size:7.5mm;line-height:1;}
.year .info .box span{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;letter-spacing:.14em;font-size:2.7mm;margin-top:1.4mm;color:rgba(255,255,255,.85);}
.year .info .box.q{flex:2.4;background:#fff;color:var(--dark);border:.4mm solid var(--primary);border-left-width:1.6mm;border-left-color:var(--secondary);}
.year .info .box.q p{font-family:'Fira Sans Extra Condensed';font-weight:600;text-transform:uppercase;font-size:3.6mm;line-height:1.2;}
.year .info .box.q small{display:block;font-family:'Roboto';font-size:2.5mm;letter-spacing:.12em;text-transform:uppercase;color:var(--secondary);margin-top:1.4mm;font-weight:700;}

/* ---------- CLUB SPREAD ---------- */
.club .band{position:absolute;left:0;right:0;top:0;height:${bleed + 30}mm;background:linear-gradient(90deg,var(--secondary),#a3001f);overflow:hidden;}
.club .band::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1.8mm;background:linear-gradient(90deg,var(--primary) 0 62%,#fff 62% 66%,var(--primary) 66%);}
.club .bandtxt{position:absolute;top:${bleed + 7}mm;left:${bleed + 10}mm;color:#fff;}
.club.right .bandtxt{left:auto;right:${bleed + 10}mm;text-align:right;}
.club .bandtxt .t1{font-family:'Unbounded';font-weight:900;text-transform:uppercase;font-size:10mm;line-height:1;}
.club .bandtxt .t2{font-family:'Fira Sans Extra Condensed';font-weight:500;text-transform:uppercase;font-size:3.4mm;letter-spacing:.18em;color:rgba(255,255,255,.85);margin-top:1.6mm;}
.club .bandlogo{position:absolute;top:${bleed + 4}mm;right:${bleed + 10}mm;width:22mm;height:22mm;} .club.right .bandlogo{right:auto;left:${bleed + 10}mm;}
.club .bandlogo img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 .6mm 1.2mm rgba(0,0,0,.4));}
.club .cgrid{position:absolute;left:${bleed + 12}mm;right:${bleed + 12}mm;top:${bleed + 42}mm;bottom:${bleed + 14}mm;display:grid;grid-template-columns:repeat(2,1fr);grid-auto-rows:1fr;gap:6mm 8mm;}
.club.left .cgrid{bottom:auto;height:200mm;grid-auto-rows:auto;align-content:space-between;gap:6mm 8mm;}
.club.left .frame{width:72mm;height:82mm;}
.club .frame.big{width:74mm;height:84mm;}
.club .motto{position:absolute;left:${bleed + 12}mm;right:${bleed + 12}mm;bottom:${bleed + 14}mm;height:52mm;background:linear-gradient(135deg,var(--dark),var(--primary));color:#fff;border-radius:1.6mm;padding:6mm 8mm;overflow:hidden;
  box-shadow:0 2mm 5mm rgba(0,20,60,.2);border-left:2mm solid var(--secondary);}
.club .motto .star{position:absolute;right:-8mm;top:-10mm;font-size:70mm;line-height:1;color:rgba(255,255,255,.07);}
.club .motto h4{font-family:'Unbounded';font-weight:800;text-transform:uppercase;font-size:6.4mm;line-height:1.05;}
.club .motto h4 span{color:var(--accent);}
.club .motto p{font-size:3.6mm;line-height:1.35;margin-top:3mm;color:rgba(255,255,255,.9);max-width:150mm;}
.club .motto .site{position:absolute;right:8mm;bottom:5mm;font-family:'Fira Sans Extra Condensed';font-weight:600;letter-spacing:.14em;text-transform:uppercase;font-size:3.2mm;color:rgba(255,255,255,.75);}
.club .cgrid.three{grid-template-columns:repeat(3,1fr);}
.club .person{position:relative;display:flex;flex-direction:column;align-items:center;}
.club .frame{position:relative;width:60mm;height:68mm;border:.45mm solid var(--primary);border-radius:1.4mm;background:#fff;overflow:hidden;
  box-shadow:inset 0 0 0 1mm #fff,inset 0 0 0 1.4mm color-mix(in srgb,var(--secondary) 70%,#fff),0 1.5mm 4mm rgba(0,20,60,.12);}
.club .frame.wide{width:100%;height:100%;}
.club .frame .ghost{position:absolute;inset:1.5mm;opacity:.16;filter:blur(.4mm);} .club .frame .ghost .sticker{width:100%;height:100%;} .club .frame .ghost .sticker .frame{inset:0;border:0;box-shadow:none;}
.club .frame .no{position:absolute;left:1.4mm;top:1.4mm;min-width:9mm;height:6mm;padding:0 1.6mm;background:var(--secondary);color:#fff;font-family:'Unbounded';font-weight:800;font-size:3.2mm;line-height:6mm;text-align:center;border-radius:0 0 1.2mm 0;}
.club .frame .ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;letter-spacing:.14em;font-size:4.4mm;color:color-mix(in srgb,var(--primary) 30%,#ccc);text-align:center;padding:4mm;}
.club .cap{margin-top:2.2mm;text-align:center;}
.club .cap .n{font-family:'Fira Sans Extra Condensed';font-weight:700;text-transform:uppercase;font-size:4.2mm;line-height:1;color:var(--dark);}
.club .cap .p{font-family:'Roboto';font-weight:500;text-transform:uppercase;letter-spacing:.1em;font-size:2.4mm;color:var(--secondary);margin-top:1mm;max-width:62mm;line-height:1.25;}
.club .wideitem{position:relative;display:flex;flex-direction:column;}
.club .wideitem .frame.wide{flex:1;}

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
.backcover .cta{bottom:${bleed + 30}mm;}
.backcover .cta h2{font-family:'Unbounded';font-weight:900;font-size:11mm;}
.backcover .cta h2 span{color:var(--secondary);}
.backcover .top{top:${bleed + 12}mm;}
.backcover .top .name{font-family:'Unbounded';font-weight:800;font-size:6mm;}
.backcover .collect{top:${bleed + 46}mm;}
.backcover .collect .ttl{font-size:8.5mm;} .backcover .collect .ttl span{color:var(--secondary);}
.backcover .yearsrow{display:flex;gap:3mm;margin-top:6mm;flex-wrap:wrap;}
.backcover .yearsrow b{background:rgba(255,255,255,.12);border:.35mm solid rgba(255,255,255,.35);color:#fff;font-family:'Unbounded';font-weight:800;font-size:5.5mm;padding:2mm 4mm;border-radius:1.5mm;}
.backcover .yearsrow b small{display:block;font-family:'Fira Sans Extra Condensed';font-weight:600;font-size:2.6mm;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-top:.8mm;}
.backcover .qr{bottom:${bleed + 28}mm;}
`;
}

function orn(data, pos) {
  const src = pos === 'br' || pos === 'bl' ? data.assets.ornBr : data.assets.ornTl;
  return src ? `<div class="orn ${pos}"><img src="${src}"></div>` : '';
}

function coverPage(data) {
  const t = data.team;
  const a = data.assets;
  const total = Object.values(data.years || {}).reduce((n, arr) => n + arr.length, 0);
  const teams = Object.values(data.years || {}).filter((arr) => arr.length).length;
  const [y0, y1] = (t.yearRange || '').split(/[–-]/);
  return `<section class="page cover">
    ${a.coverBg ? `<div class="cbg"><img src="${a.coverBg}"></div>` : ''}
    <div class="biglogo">${a.logo ? `<img src="${a.logo}">` : ''}</div>
    <div class="ribbon"><span>Официальный альбом наклеек</span></div>
    <div class="name">${esc(t.shortName || t.name)}<small>Хоккейная школа · ${esc(t.city || '')}</small></div>
    <div class="heroline"></div>
    <div class="hero">${a.cover ? `<img src="${a.cover}">` : ''}</div>
    <div class="chips">
      <div class="chip red"><b>${total}</b><span>наклеек</span></div>
      <div class="chip"><b>${teams}</b><span>команд</span></div>
      <div class="chip"><b>${esc(t.season)}</b><span>сезон</span></div>
    </div>
    <div class="years"><b>${esc(y0 || '')}<br>${esc(y1 || '')}</b><span>годы рождения</span></div>
    <div class="brand"><img src="${data.brand.hockeystarsWhite}"></div>
  </section>`;
}

function introPage(data, pageNo) {
  const t = data.team;
  const texts = t.texts || {};
  const sample = data.cards.find((c) => c.type === 'player' && c.hasPhoto && c.year === '2012') || data.cards.find((c) => c.type === 'player' && c.hasPhoto) || data.cards[0];
  const steps = texts.steps || [];
  const total = Object.values(data.years || {}).reduce((n, arr) => n + arr.length, 0);
  return `<section class="page intro ice">
    ${shared.deco(data)}
    ${orn(data, 'tr')}
    <div class="hdr"><div class="title">${esc(texts.introTitle || 'Альбом наклеек')}</div></div>
    <div class="lead">${esc(texts.introLead || '').replace(/\n/g, '<br>')} Всего в альбоме <b>${total}</b> наклеек: игроки и тренеры каждой команды школы, руководство, арена и символ клуба.</div>
    <div class="sample">${sample ? stickerFront(sample, data) : ''}</div>
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

function yearSlot(c, data) {
  if (!c) return `<div class="cell"><div class="slot empty"></div><div class="cap"></div></div>`;
  const ghost = c.hasPhoto ? `<div class="ghost">${stickerFront({ ...c, photo: c.photoSmall }, data, { ghost: true })}</div>` : '';
  const jn = c.number ? `<div class="jn">${esc(c.number)}</div>` : '';
  const pos = c.type === 'coach' ? c.position : c.position || (c.number ? `№ ${esc(c.number)}` : '');
  return `<div class="cell"><div class="slot">${ghost}${jn}<div class="no">${c.index}</div></div>
    <div class="cap"><div class="n">${esc(c.surname)} ${esc(c.type === 'coach' ? c.name.split(' ')[0] : c.name)}</div><div class="p">${esc(pos)}</div></div></div>`;
}

function yearPage(data, year, slots, pageNo, side) {
  const t = data.team;
  const people = data.years[year] || [];
  const players = people.filter((p) => p.type === 'player').length;
  const coaches = people.filter((p) => p.type === 'coach').length;
  const goalies = people.filter((p) => /вратар/i.test(p.position)).length;
  const head = people.find((p) => /главный/i.test(p.position));
  const logo = data.assets.logo ? `<div class="bandlogo"><img src="${data.assets.logo}"></div>` : '';
  const band = `<div class="band"><div class="stripes"></div></div>
    <div class="bignum">${esc(year)}</div>
    <div class="bandtxt"><div class="t1">${esc(t.shortName || t.name)}</div><div class="t2">${side === 'left' ? 'год рождения · команда' : `${people.length} наклеек · сезон ${esc(t.season)}`}</div></div>${logo}`;
  const grid = `<div class="grid">${slots.map((c) => yearSlot(c, data)).join('')}</div>`;
  const teamNo = data.teamStickerIndex?.[year];
  const yg = t.album?.yearGrid || { cols: 10, rows: 5 };
  const cols = yg.cols / 2;
  const rowsUsed = Math.ceil(slots.length / cols);
  const freeRows = yg.rows - rowsUsed;
  const s = data.stickerSize;
  const { bleed } = data.pageSize;
  const gridTop = bleed + 40;
  const rowH = s.h + 7 + 3;
  // Free rows on the right page → "Результаты сезона" table (Panini-style match log for this team).
  const results = side === 'right' && freeRows >= 1 && people.length
    ? (() => {
        const top = gridTop + rowsUsed * rowH + 1;
        const bottomEdge = data.pageSize.h + bleed - (bleed + 12 + s.teamH + 8);
        const height = bottomEdge - top;
        const rows = Math.max(3, Math.floor((height - 12) / 7.2));
        return `<div class="results" style="top:${top.toFixed(1)}mm;height:${height.toFixed(1)}mm">
          <div class="rh"><b>Матчи сезона ${esc(t.season)}</b><span>записывай результаты своей команды</span></div>
          <table><thead><tr><th style="width:8mm"></th><th style="width:22mm">Дата</th><th>Соперник</th><th style="width:22mm">Счёт</th><th style="width:30mm">Автор гола</th></tr></thead>
          <tbody>${Array.from({ length: rows }, (_, i) => `<tr><td class="i">${i + 1}</td><td></td><td></td><td></td><td></td></tr>`).join('')}</tbody></table>
        </div>`;
      })()
    : '';
  const bottom = side === 'right'
    ? `${results}<div class="teamstrip">${data.assets.teamWide ? `<div class="ghost"><img src="${data.assets.teamWide}"></div>` : ''}${teamNo ? `<div class="no">${teamNo}</div>` : ''}<div class="lbl">Командное фото<small>${esc(t.shortName || t.name)} · ${esc(year)}</small></div></div>`
    : people.length
      ? `<div class="info">
          <div class="box"><b>${players}</b><span>игроков</span></div>
          <div class="box"><b>${goalies || '—'}</b><span>вратар${goalies === 1 ? 'ь' : goalies >= 2 && goalies <= 4 ? 'я' : 'ей'}</span></div>
          <div class="box"><b>${coaches}</b><span>тренер${coaches === 1 ? '' : coaches >= 2 && coaches <= 4 ? 'а' : 'ов'}</span></div>
          <div class="box q"><p>${head ? `Главный тренер — ${esc(head.surname)} ${esc(head.name)}` : `Команда ${esc(year)} года рождения`}</p><small>${esc(t.shortName || t.name)} · ${esc(year)}</small></div>
        </div>`
      : `<div class="info"><div class="box q"><p>Состав команды ${esc(year)} года рождения формируется</p><small>наклейки появятся в следующем выпуске</small></div></div>`;
  return `<section class="page year ${side} ice">
    ${shared.deco(data, 0.06)}
    ${orn(data, side === 'left' ? 'bl' : 'br')}
    ${band}${grid}${bottom}
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

// Roster split across the spread: fill the left page first (full rows), the right page gets the rest padded to whole rows.
// Rows freed on the right page are used for the season results table.
function yearSpread(data, year, pageNo) {
  const yg = data.team.album?.yearGrid || { cols: 10, rows: 5 };
  const cols = yg.cols / 2;
  const perPage = cols * yg.rows;
  const people = [...(data.years[year] || [])];
  if (!people.length) {
    const blanks = Array(perPage).fill(null);
    return [yearPage(data, year, blanks, pageNo, 'left'), yearPage(data, year, blanks, pageNo + 1, 'right')];
  }
  const left = people.slice(0, perPage);
  const right = people.slice(perPage, perPage * 2);
  const pad = (arr) => { while (arr.length % cols) arr.push(null); return arr; };
  return [yearPage(data, year, pad(left), pageNo, 'left'), yearPage(data, year, pad(right), pageNo + 1, 'right')];
}

function clubPerson(c, data) {
  const ghost = c.hasPhoto ? `<div class="ghost">${stickerFront({ ...c, photo: c.photoSmall }, data, { ghost: true })}</div>` : `<div class="ph">${esc(c.position)}</div>`;
  const name = c.surname.startsWith('УТОЧНИТЬ') ? c.name : `${c.surname} ${c.name}`;
  return `<div class="person"><div class="frame">${ghost}<div class="no">${c.index}</div></div>
    <div class="cap"><div class="n">${esc(name)}</div><div class="p">${esc(c.position)}</div></div></div>`;
}
function clubWide(c, data) {
  const ghost = c.hasPhoto ? `<div class="ghost">${stickerFront({ ...c, photo: c.photoSmall }, data, { ghost: true })}</div>` : `<div class="ph">${esc(c.position)}</div>`;
  return `<div class="wideitem"><div class="frame wide">${ghost}<div class="no">${c.index}</div></div><div class="cap"><div class="n">${esc(c.name)}</div><div class="p">${esc(c.position)}</div></div></div>`;
}

function clubSpread(data, pageNo) {
  const t = data.team;
  const staff = data.staff || [];
  const mgmt = staff.filter((c) => c.type === 'staff' && !c.surname.startsWith('УТОЧНИТЬ'));
  const extraStaff = staff.filter((c) => c.type === 'staff' && c.surname.startsWith('УТОЧНИТЬ'));
  const club = staff.filter((c) => c.type === 'club');
  const logo = data.assets.logo ? `<div class="bandlogo"><img src="${data.assets.logo}"></div>` : '';
  const left = `<section class="page club left ice">
    ${shared.deco(data, 0.06)}${orn(data, 'bl')}
    <div class="band"></div><div class="bandtxt"><div class="t1">Руководство</div><div class="t2">${esc(t.name)} · те, кто строит школу</div></div>${logo}
    <div class="cgrid">${mgmt.slice(0, 4).map((c) => clubPerson(c, data)).join('')}</div>
    <div class="motto"><div class="star">★</div><h4>Одна школа.<br>Одна <span>звезда</span>.</h4>
      <p>${esc(t.texts?.clubMotto || 'СКА Стрельна — школа системы хоккейного клуба СКА. Здесь учат не только кататься и бросать, но и уважать партнёра, соперника и игру.')}</p>
      <div class="site">${esc((t.website || '').replace(/^https?:\/\//, '').replace(/\/$/, ''))}</div></div>
    <div class="pgnum l">${pageNo}</div>
  </section>`;
  const right = `<section class="page club right ice">
    ${shared.deco(data, 0.06)}${orn(data, 'br')}
    <div class="band"></div><div class="bandtxt"><div class="t1">Наш клуб</div><div class="t2">штаб · арена · символ · болельщики</div></div>${logo}
    <div class="cgrid three" style="bottom:auto;height:74mm">${extraStaff.slice(0, 3).map((c) => clubPerson({ ...c, position: c.position }, data).replace('class="frame"', 'class="frame" style="width:44mm;height:50mm"')).join('')}</div>
    <div class="cgrid" style="top:${(data.pageSize.bleed + 42 + 84)}mm;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr">
      ${club.map((c, i) => clubWide(c, data)).join('')}
    </div>
    <div class="pgnum r">${pageNo + 1}</div>
  </section>`;
  return [left, right];
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
  const years = Object.entries(data.years || {}).map(([y, arr]) => `<b>${esc(y)}<small>${arr.length ? arr.length + ' накл.' : 'скоро'}</small></b>`).join('');
  const total = Object.values(data.years || {}).reduce((n, arr) => n + arr.length, 0);
  return `<section class="page backcover">
    ${data.assets.back ? `<div class="photo"><img src="${data.assets.back}"></div>` : ''}<div class="tint"></div>
    <div class="top"><div class="name">${esc(t.name)}<small>${esc(t.city || '')} · сезон ${esc(t.season)}</small></div>${data.assets.logo ? `<img src="${data.assets.logo}">` : ''}</div>
    <div class="collect"><div class="ttl">Собери всю школу<span>${total} наклеек · ${esc(t.yearRange || '')}</span></div><div class="yearsrow">${years}</div></div>
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
    else if (kind === 'intro') push((n) => introPage(data, n));
    else if (kind === 'history') push((n) => shared.historyPage(data, n));
    else if (kind === 'quotes') push((n) => quotesPage(data, n));
    else if (kind === 'facts') push((n) => shared.factsPage(data, n));
    else if (kind === 'glossary') push((n) => shared.glossaryPage(data, n));
    else if (kind === 'profile') push((n) => shared.profilePage(data, n));
    else if (kind === 'stats') push((n) => shared.statsPage(data, n));
    else if (kind === 'notes') push((n) => shared.notesPage(data, n));
    else if (kind === 'autographs') {
      const chunk = nextAutographs();
      if (chunk.length) push((n) => shared.autographsPage(data, n, chunk));
    }
  }
  const count = () => inner.reduce((n, fn) => n + (fn._pages || 1), 0);
  let statsUsed = order.includes('stats');
  while ((count() + 2) % 4 !== 0) {
    if (!statsUsed) { statsUsed = true; push((n) => shared.statsPage(data, n)); }
    else push((n) => shared.notesPage(data, n));
  }
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
