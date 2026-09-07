const { baseCss, esc } = require('./styles');
const { cardFront, cardCss } = require('./cards');

const PAGE = { w: 210, h: 297, bleed: 3 };
const SLOTS_PER_PAGE = 9;

function albumCss(data) {
  const { w, h, bleed } = PAGE;
  const size = data.cardSize;
  return `
${baseCss(data.colors)}
${cardCss(size)}
@page{size:${w + bleed * 2}mm ${h + bleed * 2}mm;margin:0;}
.page{position:relative;width:${w + bleed * 2}mm;height:${h + bleed * 2}mm;overflow:hidden;page-break-after:always;background:#fff;}
.safe{position:absolute;left:${bleed + 7}mm;top:${bleed + 7}mm;right:${bleed + 7}mm;bottom:${bleed + 7}mm;}
.pgnum{position:absolute;bottom:${bleed + 3}mm;font-family:'Oswald';font-weight:600;font-size:3.2mm;color:var(--primary);opacity:.8;}
.pgnum.l{left:${bleed + 8}mm;} .pgnum.r{right:${bleed + 8}mm;}

/* corner ornaments: torn diagonal bands */
.orn{position:absolute;pointer-events:none;}
.orn.tl{left:-50mm;top:-48mm;width:170mm;height:60mm;transform:rotate(-24deg);
  background:linear-gradient(180deg,var(--secondary) 0 30%,transparent 30% 42%,var(--primary) 42% 60%,transparent 60% 68%,rgba(11,42,91,.15) 68% 78%,transparent 78%);}
.orn.br{right:-40mm;bottom:-30mm;width:190mm;height:70mm;transform:rotate(-24deg);
  background:linear-gradient(0deg,var(--primary) 0 34%,transparent 34% 44%,var(--secondary) 44% 62%,transparent 62% 70%,rgba(200,16,46,.15) 70% 80%,transparent 80%);}
.orn.tr{right:-70mm;top:-32mm;width:170mm;height:50mm;transform:rotate(-24deg);
  background:linear-gradient(180deg,var(--secondary) 0 28%,transparent 28% 40%,var(--primary) 40% 58%,transparent 58%);}

/* section title */
.title{position:relative;display:inline-block;font-family:'Oswald';font-weight:700;text-transform:uppercase;font-size:17mm;line-height:1;color:var(--dark);
  padding:2mm 0;}
.title::after{content:"";position:absolute;left:0;right:-6mm;bottom:-1mm;height:2mm;background:linear-gradient(90deg,var(--secondary) 0 60%,var(--primary) 60%);
  transform:skewX(-30deg);}

/* ---------- COVER ---------- */
.cover{background:var(--dark);}
.cover .photo{position:absolute;inset:0;}
.cover .photo img{width:100%;height:100%;object-fit:cover;object-position:center 30%;}
.cover .photo .grad{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,26,58,.15) 0%,rgba(7,26,58,0) 30%,rgba(7,26,58,.15) 65%,rgba(7,26,58,.75) 100%);}
.cover .nophoto{position:absolute;inset:0;background:
  radial-gradient(ellipse at 50% 30%,rgba(255,255,255,.35),transparent 60%),
  repeating-linear-gradient(115deg,rgba(255,255,255,.05) 0 2mm,transparent 2mm 16mm),
  linear-gradient(160deg,#ffffff 0%,var(--ice) 35%,#b9c9dc 70%,var(--primary) 100%);}
.cover .orn.tl{left:-50mm;top:-45mm;width:220mm;height:90mm;
  background:linear-gradient(180deg,#fff 0 36%,var(--secondary) 36% 52%,transparent 52% 60%,var(--primary) 60% 72%,transparent 72% 80%,rgba(255,255,255,.35) 80% 86%,transparent 86%);}
.cover .orn.br{right:-60mm;bottom:-60mm;width:250mm;height:120mm;
  background:linear-gradient(0deg,var(--primary) 0 42%,transparent 42% 50%,var(--secondary) 50% 62%,transparent 62% 70%,rgba(255,255,255,.4) 70% 76%,transparent 76%);}
.cover .season{position:absolute;left:${bleed + 8}mm;top:${bleed + 52}mm;background:var(--secondary);color:#fff;font-family:'Oswald';font-weight:600;
  text-transform:uppercase;font-size:5.6mm;letter-spacing:.06em;padding:1.6mm 4mm 1.6mm 3mm;transform:skewX(-8deg);box-shadow:0 1mm 2mm rgba(0,0,0,.3);}
.cover .season span{display:inline-block;transform:skewX(8deg);}
.cover .season b{color:var(--accent);margin:0 1.5mm;}
.cover .logo{position:absolute;right:${bleed + 12}mm;top:${bleed + 12}mm;width:62mm;height:62mm;display:flex;align-items:center;justify-content:center;}
.cover .logo img{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 1.5mm 3mm rgba(0,0,0,.45));}
.cover .logo .badge{width:58mm;height:58mm;border-radius:50%;background:radial-gradient(circle at 50% 35%,#1d4a95,var(--primary) 70%);border:1.6mm solid #fff;
  box-shadow:0 0 0 1.2mm var(--secondary),0 2mm 5mm rgba(0,0,0,.4);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center;}
.cover .logo .badge .star{font-size:12mm;line-height:1;color:var(--secondary);text-shadow:0 0 1mm #fff,0 0 1mm #fff;}
.cover .logo .badge .txt{font-family:'Oswald';font-weight:700;text-transform:uppercase;font-size:9mm;line-height:.95;margin-top:1mm;padding:0 3mm;}
.cover .logo .badge small{font-family:'Roboto';font-weight:500;font-size:2.6mm;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-top:1.5mm;}
.cover .count{position:absolute;left:${bleed + 12}mm;bottom:${bleed + 22}mm;width:42mm;height:42mm;border-radius:50%;background:var(--primary);
  border:1.2mm solid #fff;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;box-shadow:0 1.5mm 4mm rgba(0,0,0,.4);}
.cover .count b{font-family:'Oswald';font-weight:700;font-size:19mm;line-height:.9;color:var(--secondary);text-shadow:0 0 1mm #fff,0 0 1mm #fff;}
.cover .count span{font-family:'Oswald';font-weight:600;text-transform:uppercase;font-size:4.6mm;letter-spacing:.08em;margin-top:1mm;}
.cover .year{position:absolute;right:${bleed + 8}mm;bottom:${bleed + 14}mm;font-family:'Oswald';font-weight:700;font-size:52mm;line-height:.85;color:#fff;
  text-shadow:0 1.5mm 3mm rgba(0,0,0,.45);letter-spacing:-.01em;}
.cover .brand{position:absolute;right:${bleed + 10}mm;bottom:${bleed + 6}mm;display:flex;align-items:center;gap:2mm;}
.cover .brand img{height:7mm;filter:drop-shadow(0 .5mm 1mm rgba(0,0,0,.5));}
.cover .teamname{position:absolute;left:${bleed + 8}mm;top:${bleed + 66}mm;font-family:'Oswald';font-weight:700;text-transform:uppercase;font-size:11mm;line-height:1;color:#fff;
  text-shadow:0 1mm 2.5mm rgba(0,0,0,.55);}
.cover .teamname small{display:block;font-size:5mm;font-weight:600;letter-spacing:.12em;opacity:.95;margin-top:1.5mm;}

/* ---------- INTRO ---------- */
.intro .hdr{position:absolute;left:${bleed + 10}mm;top:${bleed + 12}mm;}
.intro .lead{position:absolute;left:${bleed + 30}mm;right:${bleed + 14}mm;top:${bleed + 46}mm;font-size:4.2mm;line-height:1.35;color:#1b2940;}
.intro .lead b{color:var(--secondary);}
.intro .sample{position:absolute;left:${bleed + 12}mm;top:${bleed + 92}mm;transform-origin:top left;transform:scale(1);
  box-shadow:0 2mm 5mm rgba(0,0,0,.25);border-radius:1mm;}
.intro .how{position:absolute;left:${bleed + 85}mm;right:${bleed + 12}mm;top:${bleed + 92}mm;}
.intro .how h3{font-family:'Oswald';font-weight:700;text-transform:uppercase;font-size:7.5mm;color:var(--dark);margin-bottom:5mm;}
.intro .step{display:flex;align-items:flex-start;gap:3mm;margin-bottom:6mm;font-size:4mm;line-height:1.35;color:#1b2940;}
.intro .step svg{flex:none;width:12mm;height:9mm;margin-top:-1mm;}
.intro .bottom{position:absolute;left:0;right:0;bottom:0;height:120mm;}
.intro .bigname{position:absolute;left:${bleed + 6}mm;right:${bleed + 6}mm;top:0;font-family:'Oswald';font-weight:700;text-transform:uppercase;
  font-size:34mm;line-height:.95;color:transparent;-webkit-text-stroke:.9mm var(--secondary);text-align:center;white-space:nowrap;letter-spacing:.02em;}
.intro .teamphoto{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:22mm;bottom:${bleed + 10}mm;overflow:hidden;border-radius:1.5mm;
  box-shadow:0 2mm 6mm rgba(0,0,0,.25);background:#c9d5e3;}
.intro .teamphoto img{width:100%;height:100%;object-fit:cover;object-position:center;}
.intro .teamphoto .ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Oswald';font-weight:600;text-transform:uppercase;
  font-size:6mm;color:#5b6b80;letter-spacing:.1em;background:repeating-linear-gradient(45deg,#dbe4ee 0 6mm,#cfdae6 6mm 12mm);}

/* ---------- TEAM ---------- */
.team .orn.br{right:-60mm;bottom:-40mm;width:170mm;height:40mm;}
.team .hdr{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 9}mm;height:22mm;display:flex;align-items:center;justify-content:space-between;}
.team .hdr .logo{width:22mm;height:22mm;display:flex;align-items:center;justify-content:center;}
.team .hdr .logo img{max-width:100%;max-height:100%;object-fit:contain;}
.team .hdr .title{font-size:16mm;}
.team .hdr .sub{font-family:'Oswald';font-weight:600;text-transform:uppercase;font-size:3.6mm;letter-spacing:.14em;color:var(--secondary);text-align:right;margin-top:2mm;}
.team .grid{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 36}mm;display:grid;
  grid-template-columns:repeat(3,${size.w}mm);justify-content:space-between;row-gap:6mm;}
.slot{position:relative;width:${size.w}mm;height:${size.h}mm;border:.35mm dashed rgba(11,42,91,.55);border-radius:1mm;overflow:hidden;background:#fff;}
.slot .ghost{position:absolute;left:${-size.bleed}mm;top:${-size.bleed}mm;filter:grayscale(1) contrast(.9);opacity:.28;}
.slot .tag{position:absolute;left:50%;top:0;transform:translateX(-50%);background:var(--secondary);color:#fff;font-family:'Oswald';font-weight:600;
  font-size:3mm;line-height:1;padding:1mm 2.6mm 1.1mm;border-radius:0 0 1.5mm 1.5mm;letter-spacing:.06em;}
.slot .lbl{position:absolute;left:0;right:0;bottom:0;padding:1.6mm 2mm 1.8mm;text-align:center;background:rgba(255,255,255,.88);border-top:.3mm solid rgba(11,42,91,.25);}
.slot .lbl .n{font-family:'Oswald';font-weight:700;text-transform:uppercase;font-size:3.9mm;line-height:1.05;color:var(--dark);}
.slot .lbl .n span{color:var(--secondary);margin-right:1.2mm;}
.slot .lbl .p{font-family:'Roboto';font-weight:500;text-transform:uppercase;letter-spacing:.12em;font-size:2.4mm;color:#4a5a70;margin-top:.7mm;}
.slot.outline .ghost{display:none;}
.slot.outline{background:linear-gradient(160deg,#fff,var(--ice));}
.slot.outline .bignum{position:absolute;left:0;right:0;top:34%;text-align:center;font-family:'Oswald';font-weight:700;font-size:20mm;line-height:1;color:rgba(11,42,91,.12);}

/* ---------- HISTORY ---------- */
.history .hdr{position:absolute;left:${bleed + 10}mm;top:${bleed + 12}mm;}
.history .orn.br{right:-60mm;bottom:-40mm;width:170mm;height:40mm;}
.history .tl{position:absolute;left:${bleed + 12}mm;top:${bleed + 44}mm;width:126mm;}
.history .tl::before{content:"";position:absolute;left:5.2mm;top:2mm;bottom:8mm;width:1.2mm;background:linear-gradient(180deg,var(--primary),var(--secondary));border-radius:1mm;}
.history .item{position:relative;padding-left:16mm;margin-bottom:7mm;}
.history .item:last-child{margin-bottom:0;}
.history .item .dot{position:absolute;left:0;top:0;width:11.6mm;height:11.6mm;border-radius:50%;background:var(--secondary);color:#fff;
  font-family:'Oswald';font-weight:700;font-size:6mm;display:flex;align-items:center;justify-content:center;border:1mm solid #fff;box-shadow:0 0 0 .6mm var(--primary);}
.history .item .yr{display:inline-block;background:var(--primary);color:#fff;font-family:'Oswald';font-weight:600;text-transform:uppercase;font-size:4mm;
  padding:1mm 3mm;transform:skewX(-10deg);margin-bottom:1.6mm;letter-spacing:.06em;}
.history .item .yr span{display:inline-block;transform:skewX(10deg);}
.history .item h4{font-family:'Oswald';font-weight:700;text-transform:uppercase;font-size:5.4mm;line-height:1.05;color:var(--dark);margin-bottom:1.2mm;}
.history .item p{font-size:3.7mm;line-height:1.35;color:#1b2940;white-space:pre-line;}
.history .facts{position:absolute;right:${bleed + 10}mm;top:${bleed + 44}mm;width:44mm;background:#fff;border:.5mm solid var(--primary);border-radius:2mm;padding:4mm 3mm;
  box-shadow:0 1.5mm 4mm rgba(11,42,91,.12);}
.history .facts h5{font-family:'Oswald';font-weight:700;text-transform:uppercase;font-size:4.6mm;color:var(--dark);text-align:center;line-height:1.05;margin-bottom:3mm;
  padding-bottom:2mm;border-bottom:.5mm solid var(--secondary);}
.history .fact{text-align:center;margin-bottom:4.5mm;}
.history .fact b{display:block;font-family:'Oswald';font-weight:700;font-size:9mm;line-height:1;color:var(--secondary);}
.history .fact span{display:block;font-size:2.9mm;line-height:1.25;color:#1b2940;margin-top:.8mm;white-space:pre-line;}
.history .hphoto{position:absolute;right:${bleed + 10}mm;bottom:${bleed + 14}mm;width:44mm;height:60mm;border-radius:2mm;overflow:hidden;box-shadow:0 1.5mm 4mm rgba(0,0,0,.2);}
.history .hphoto img{width:100%;height:100%;object-fit:cover;}

/* ---------- STATS ---------- */
.stats .hdr{position:absolute;left:${bleed + 10}mm;top:${bleed + 12}mm;}
.stats .note{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 40}mm;font-size:3.8mm;color:#1b2940;line-height:1.35;}
.stats table{position:absolute;left:${bleed + 10}mm;right:${bleed + 10}mm;top:${bleed + 56}mm;width:calc(100% - ${(bleed + 10) * 2}mm);border-collapse:collapse;font-size:3.6mm;}
.stats th{font-family:'Oswald';font-weight:600;text-transform:uppercase;letter-spacing:.08em;font-size:3.4mm;color:#fff;background:var(--primary);padding:2.4mm 2mm;text-align:left;}
.stats td{border-bottom:.3mm solid rgba(11,42,91,.25);height:9.6mm;padding:0 2mm;color:#7b8798;}
.stats td.i{width:9mm;text-align:center;font-family:'Oswald';font-weight:600;color:var(--secondary);}
.stats tr:nth-child(even) td{background:rgba(238,243,249,.7);}

/* ---------- BACK COVER ---------- */
.backcover{background:var(--dark);color:#fff;}
.backcover .photo{position:absolute;inset:0;}
.backcover .photo img{width:100%;height:100%;object-fit:cover;opacity:.55;mix-blend-mode:luminosity;}
.backcover .tint{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,26,58,.35) 0%,rgba(7,26,58,.55) 60%,var(--dark) 100%);}
.backcover .pattern{position:absolute;inset:0;background:
  radial-gradient(ellipse at 50% 35%,rgba(90,140,220,.45),transparent 55%),
  repeating-linear-gradient(115deg,rgba(255,255,255,.04) 0 2mm,transparent 2mm 18mm);}
.backcover .rink{position:absolute;left:${bleed + 25}mm;right:${bleed + 25}mm;top:${bleed + 70}mm;height:100mm;border:1.4mm solid rgba(255,255,255,.55);border-radius:22mm;}
.backcover .rink::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:1.2mm;margin-left:-.6mm;background:rgba(220,40,60,.8);}
.backcover .rink::after{content:"";position:absolute;left:50%;top:50%;width:26mm;height:26mm;margin:-13mm 0 0 -13mm;border:1.2mm solid rgba(60,110,200,.9);border-radius:50%;}
.backcover .rink i{position:absolute;top:0;bottom:0;width:1mm;background:rgba(60,110,200,.9);}
.backcover .rink i.a{left:30%;} .backcover .rink i.b{right:30%;}
.backcover .cta{position:absolute;left:${bleed + 12}mm;right:${bleed + 12}mm;bottom:${bleed + 22}mm;}
.backcover .cta h2{font-family:'Oswald';font-weight:700;text-transform:uppercase;font-size:17mm;line-height:.95;}
.backcover .cta h2 span{color:var(--accent);}
.backcover .cta p{font-size:4.6mm;line-height:1.35;margin-top:3mm;max-width:120mm;color:rgba(255,255,255,.9);}
.backcover .qr{position:absolute;right:${bleed + 12}mm;bottom:${bleed + 22}mm;width:44mm;height:44mm;background:#fff;border-radius:2mm;padding:2.5mm;display:flex;align-items:center;justify-content:center;}
.backcover .qr img{width:100%;height:100%;object-fit:contain;}
.backcover .qr .ph{font-family:'Roboto';font-size:3mm;color:#7b8798;text-align:center;line-height:1.3;}
.backcover .brand{position:absolute;left:${bleed + 12}mm;bottom:${bleed + 9}mm;display:flex;align-items:center;gap:3mm;}
.backcover .brand img{height:8mm;}
.backcover .brand small{font-size:3mm;color:rgba(255,255,255,.7);}
.backcover .top{position:absolute;left:${bleed + 12}mm;right:${bleed + 12}mm;top:${bleed + 14}mm;display:flex;align-items:center;justify-content:space-between;}
.backcover .top .name{font-family:'Oswald';font-weight:700;text-transform:uppercase;font-size:7mm;line-height:1;}
.backcover .top .name small{display:block;font-family:'Roboto';font-weight:400;text-transform:none;font-size:3.4mm;color:rgba(255,255,255,.75);margin-top:1.5mm;}
.backcover .top img{height:20mm;object-fit:contain;}
`;
}

const arrow = `<svg viewBox="0 0 60 44" fill="none" stroke="${'#c8102e'}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6 8 C 22 6, 40 10, 52 30"/><path d="M40 30 L 52 32 L 55 20"/></svg>`;

function coverPage(data) {
  const t = data.team;
  const photo = data.assets.cover
    ? `<div class="photo"><img src="${data.assets.cover}"><div class="grad"></div></div>`
    : `<div class="nophoto"></div>`;
  const logo = data.assets.logo
    ? `<img src="${data.assets.logo}">`
    : `<div class="badge"><div class="star">★</div><div class="txt">${esc(t.shortName || t.name)}</div><small>${esc(t.city || '')}</small></div>`;
  return `<section class="page cover">
    ${photo}
    <div class="orn tl"></div><div class="orn br"></div>
    <div class="season"><span>Альбом с карточками <b>★</b> ${esc(t.season)}</span></div>
    ${data.assets.logo ? `<div class="teamname">${esc(t.name)}<small>${esc(t.city || '')}</small></div>` : ''}
    <div class="logo">${logo}</div>
    <div class="count"><b>${data.cards.length}</b><span>карточек</span></div>
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
  const sample = data.cards[0];
  const teamPhoto = data.assets.teamPhoto
    ? `<img src="${data.assets.teamPhoto}">`
    : `<div class="ph">Общее фото команды — assets/team.jpg</div>`;
  const bigName = (t.shortName || t.name).toUpperCase();
  const bigSize = Math.min(34, (170 / Math.max(6, bigName.length)) * 1.75);
  return `<section class="page intro ice">
    <div class="orn tr"></div>
    <div class="hdr"><div class="title">Альбом</div></div>
    <div class="lead">${intro.replace(/\n/g, '<br>')}</div>
    <div class="sample">${sample ? cardFront(sample, data) : ''}</div>
    <div class="how"><h3>Как это работает:</h3>
      ${steps.map((s) => `<div class="step">${arrow}<div>${s}</div></div>`).join('')}
    </div>
    <div class="bottom">
      <div class="bigname" style="font-size:${bigSize.toFixed(1)}mm">${esc(bigName)}</div>
      <div class="teamphoto">${teamPhoto}</div>
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
      (c) => `<div class="slot ${style}">
        <div class="ghost">${cardFront({ ...c, photo: c.photoSmall }, data)}</div>
        ${style === 'outline' ? `<div class="bignum">${esc(c.number)}</div>` : ''}
        <div class="tag">${c.index}</div>
        <div class="lbl"><div class="n">${c.number ? `<span>#${esc(c.number)}</span>` : ''}${esc(c.surname)} ${esc(c.name)}</div><div class="p">${esc(c.position)}</div></div>
      </div>`
    )
    .join('');
  const even = pageNo % 2 === 0;
  return `<section class="page team ice">
    <div class="orn br" style="opacity:.9"></div>
    <div class="hdr"><div class="logo">${logo}</div><div><div class="title">Команда</div><div class="sub">${esc(t.name)} · карточки ${cards[0].index}–${cards[cards.length - 1].index} из ${data.cards.length}</div></div></div>
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
  return `<section class="page history ice">
    <div class="orn br" style="opacity:.95"></div>
    <div class="hdr"><div class="title">${esc(title)}</div></div>
    <div class="tl">${items
      .map(
        (it, i) => `<div class="item"><div class="dot">${i + 1}</div>
        ${it.years ? `<div class="yr"><span>${esc(it.years)}</span></div>` : ''}
        <h4>${esc(it.title)}</h4><p>${esc(it.text)}</p></div>`
      )
      .join('')}</div>
    ${
      facts.length
        ? `<div class="facts"><h5>${esc(h.factsTitle || 'Цифры успеха')}</h5>${facts
            .map((f) => `<div class="fact"><b>${esc(f.value)}</b><span>${esc(f.label)}</span></div>`)
            .join('')}</div>`
        : ''
    }
    ${data.assets.history ? `<div class="hphoto"><img src="${data.assets.history}"></div>` : ''}
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

function statsPage(data, pageNo) {
  const rows = Array.from({ length: 18 }, (_, i) => `<tr><td class="i">${i + 1}</td><td></td><td></td><td></td><td></td></tr>`).join('');
  return `<section class="page stats ice">
    <div class="orn br" style="opacity:.9"></div>
    <div class="hdr"><div class="title">Мой сезон</div></div>
    <div class="note">Записывай сюда матчи сезона ${esc(data.team.season)}: дату, соперника, счёт и номера карточек, которые ты получил за победу.</div>
    <table><thead><tr><th></th><th>Дата</th><th>Соперник</th><th>Счёт</th><th>Карточки</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="pgnum ${pageNo % 2 === 0 ? 'l' : 'r'}">${pageNo}</div>
  </section>`;
}

function backCoverPage(data) {
  const t = data.team;
  const texts = t.texts || {};
  const photo = data.assets.back
    ? `<div class="photo"><img src="${data.assets.back}"></div><div class="tint"></div>`
    : `<div class="pattern"></div><div class="rink"><i class="a"></i><i class="b"></i></div>`;
  const qr = data.assets.qr ? `<img src="${data.assets.qr}">` : `<div class="ph">QR-код<br>assets/qr.png</div>`;
  const logo = data.assets.logo ? `<img src="${data.assets.logo}">` : '';
  return `<section class="page backcover">
    ${photo}
    <div class="top"><div class="name">${esc(t.name)}<small>${esc(t.city || '')}${t.city ? ' · ' : ''}Сезон ${esc(t.season)}</small></div>${logo}</div>
    <div class="cta"><h2>${texts.backTitle || 'Ты есть в <span>HockeyStars</span>?'}</h2><p>${esc(texts.backText || 'Твоя команда уже там, устанавливай по QR-коду')}</p></div>
    <div class="qr">${qr}</div>
    <div class="brand"><img src="${data.brand.hockeystarsWhite}">${texts.backFooter ? `<small>${esc(texts.backFooter)}</small>` : ''}</div>
  </section>`;
}

function albumHtml(data) {
  const chunks = [];
  for (let i = 0; i < data.cards.length; i += SLOTS_PER_PAGE) chunks.push(data.cards.slice(i, i + SLOTS_PER_PAGE));

  // Inner page order: intro, team, history, team, team, ... then filler pages so the total is a multiple of 4.
  const inner = [];
  inner.push((n) => introPage(data, n));
  if (chunks.length) inner.push((n) => teamPage(data, chunks[0], n));
  inner.push((n) => historyPage(data, n));
  chunks.slice(1).forEach((chunk) => inner.push((n) => teamPage(data, chunk, n)));
  const extra = (data.team.album && data.team.album.extraPages) || [];
  extra.forEach((kind) => inner.push((n) => (kind === 'stats' ? statsPage(data, n) : '')));
  while ((inner.length + 2) % 4 !== 0) inner.push((n) => statsPage(data, n));

  const pages = [coverPage(data), ...inner.map((fn, i) => fn(i + 2)), backCoverPage(data)];
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${albumCss(data)}</style></head><body>${pages.join('\n')}</body></html>`;
}

module.exports = { albumHtml, PAGE };
