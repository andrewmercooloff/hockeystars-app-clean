const { baseCss, esc } = require('./styles');

function printSpecHtml(data) {
  const path = require('path');
  const { team, cards, assets, cardSize, teamDir } = data;
  const slug = path.basename(teamDir || 'team');
  const card = cardSize || { w: 60, h: 85, bleed: 2 };
  const cw = card.w;
  const ch = card.h;
  const cb = card.bleed ?? 2;
  const pageBleed = 3;
  const count = cards.length;

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0;}
${baseCss(team.colors)}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Roboto',sans-serif;font-size:10.5pt;line-height:1.45;color:var(--dark);background:#fff;}
.page{width:210mm;min-height:297mm;padding:16mm 18mm 14mm;position:relative;page-break-after:always;}
.page:last-child{page-break-after:auto;}
.hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:10mm;margin-bottom:10mm;padding-bottom:6mm;border-bottom:1.2mm solid var(--secondary);}
.hdr .logo{width:22mm;height:22mm;flex-shrink:0;}
.hdr .logo img{width:100%;height:100%;object-fit:contain;}
.hdr .title{flex:1;}
.hdr h1{font-family:'Unbounded';font-weight:700;font-size:15pt;line-height:1.15;color:var(--primary);}
.hdr .sub{margin-top:2mm;font-family:'Fira Sans Extra Condensed';font-weight:600;font-size:11pt;letter-spacing:.04em;text-transform:uppercase;color:var(--secondary);}
.meta{margin-bottom:8mm;font-size:9.5pt;color:#4a5568;}
.meta strong{color:var(--dark);}
h2{font-family:'Fira Sans Extra Condensed';font-weight:700;font-size:12pt;text-transform:uppercase;letter-spacing:.06em;color:var(--primary);margin:7mm 0 3mm;padding-left:3mm;border-left:1.2mm solid var(--secondary);}
h2:first-of-type{margin-top:0;}
p{margin:0 0 2.5mm;}
table{width:100%;border-collapse:collapse;margin:0 0 4mm;font-size:9.5pt;}
th,td{border:.25mm solid #c8d0dc;padding:2.2mm 3mm;text-align:left;vertical-align:top;}
th{width:38%;background:color-mix(in srgb,var(--ice) 70%,#fff);font-weight:500;color:#334155;}
td{background:#fff;}
.files{margin:0 0 2mm;padding-left:4mm;}
.files li{margin:0 0 1.5mm;}
.files code{font-family:ui-monospace,monospace;font-size:8.5pt;background:var(--ice);padding:.4mm 1.2mm;border-radius:.8mm;}
.note{margin-top:5mm;padding:3mm 4mm;background:color-mix(in srgb,var(--accent) 18%,var(--ice));border-left:1mm solid var(--secondary);font-size:9pt;}
.footer{position:absolute;left:18mm;right:18mm;bottom:10mm;font-size:8pt;color:#64748b;display:flex;justify-content:space-between;}
</style></head><body>
<section class="page">
  <header class="hdr">
    ${assets.logo ? `<div class="logo"><img src="${assets.logo}" alt=""></div>` : ''}
    <div class="title">
      <h1>Техническое задание на печать</h1>
      <div class="sub">ХК «${esc(team.name)}» · альбом ${esc(team.season)}</div>
    </div>
  </header>
  <p class="meta"><strong>Файлы макетов:</strong> PDF из комплекта <code>${esc(slug)}</code>. Превью-файлы с суффиксом <code>-preview</code> — только для просмотра, в печать не передавать.</p>

  <h2>1. Журнал (основной) — <code>${esc(slug)}-album-A3-spreads.pdf</code></h2>
  <table>
    <tr><th>Назначение</th><td>Журнал под скрепку (рекомендуется)</td></tr>
    <tr><th>Формат листа</th><td>A3, развороты для 2 скоб</td></tr>
    <tr><th>Объём</th><td>16 страниц A4 → 8 разворотов A3 (420×297&nbsp;мм с вылетами)</td></tr>
    <tr><th>Печать</th><td>Дуплекс, <strong>переворот по короткой стороне</strong></td></tr>
    <tr><th>Вылеты</th><td>${pageBleed}&nbsp;мм по периметру страницы (лист 216×303&nbsp;мм с вылетами)</td></tr>
    <tr><th>Фальц</th><td>Метка фальца — в вылете между половинами разворота</td></tr>
  </table>

  <h2>2. Карточки — <code>${esc(slug)}-cards.pdf</code></h2>
  <table>
    <tr><th>Количество</th><td>${count} карточек = ${count * 2} полос (лицо + оборот)</td></tr>
    <tr><th>Обрезной формат</th><td><strong>${cw} × ${ch} мм</strong></td></tr>
    <tr><th>Страница PDF</th><td>${cw + cb * 2} × ${ch + cb * 2} мм (вылет ${cb} мм с каждой стороны)</td></tr>
    <tr><th>Печать</th><td>Дуплекс, <strong>переворот по длинной стороне</strong></td></tr>
    <tr><th>Резка</th><td>Стопкой по линии внутреннего края вылета (${cb} мм от края листа)</td></tr>
    <tr><th>Безопасная зона</th><td>Текст и важные элементы — не ближе 3&nbsp;мм к линии реза</td></tr>
  </table>

  <h2>3. Журнал (запасной) — <code>${esc(slug)}-album.pdf</code></h2>
  <p>Тот же журнал постранично A4 + вылеты ${pageBleed}&nbsp;мм — если типография сама делает спуск полос.</p>

  <h2>Соответствие альбома и карточек</h2>
  <table>
    <tr><th>Ячейки в журнале</th><td>${cw} × ${ch} мм</td></tr>
    <tr><th>Карточки после реза</th><td>${cw} × ${ch} мм — совпадает с ячейками</td></tr>
    <tr><th>Страницы «Команда»</th><td>9 ячеек (3×3) на странице</td></tr>
  </table>

  <p class="note">Превью для согласования: <code>${esc(slug)}-album-preview.pdf</code>, <code>${esc(slug)}-cards-preview.pdf</code>.</p>
  <div class="footer"><span>HK «${esc(team.name)}» · ${esc(team.season)}</span><span>ТЗ на печать</span></div>
</section>
</body></html>`;
}

module.exports = { printSpecHtml };
