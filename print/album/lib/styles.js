const path = require('path');
const { fileUrl } = require('./images');

const FONTS = [
  // Condensed heavy sans for names/labels (weights mapped one step heavier than the old Oswald set).
  ['Fira Sans Extra Condensed', 400, 'FiraSansExtraCondensed-Medium.ttf'],
  ['Fira Sans Extra Condensed', 600, 'FiraSansExtraCondensed-Bold.ttf'],
  ['Fira Sans Extra Condensed', 700, 'FiraSansExtraCondensed-Black.ttf'],
  // Wide aggressive display face for titles and big numbers (variable font).
  ['Unbounded', '200 900', 'Unbounded.ttf'],
  ['Roboto', 400, 'Roboto-Regular.ttf'],
  ['Roboto', 500, 'Roboto-Medium.ttf'],
  ['Roboto', 700, 'Roboto-Bold.ttf'],
  ['Roboto', 900, 'Roboto-Black.ttf'],
];

function fontFaces() {
  const dir = path.join(__dirname, '..', 'fonts');
  return FONTS.map(
    ([family, weight, file]) =>
      `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;src:url(${fileUrl(path.join(dir, file))}) format('truetype');}`
  ).join('\n');
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function baseCss(colors) {
  return `
${fontFaces()}
:root{
  --primary:${colors.primary};
  --secondary:${colors.secondary};
  --accent:${colors.accent};
  --dark:${colors.dark};
  --ice:${colors.ice};
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
html,body{font-family:'Roboto',Arial,sans-serif;color:#0f1b2d;}
.h{font-family:'Fira Sans Extra Condensed','Roboto',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.01em;}
.ice{
  background:
    radial-gradient(ellipse at 20% 10%, rgba(255,255,255,.9), transparent 55%),
    radial-gradient(ellipse at 80% 90%, rgba(255,255,255,.8), transparent 50%),
    repeating-linear-gradient(115deg, rgba(120,150,190,.06) 0 2px, transparent 2px 14px),
    linear-gradient(160deg,#f7fafd 0%,var(--ice) 55%,#dfe8f2 100%);
}
`;
}

module.exports = { baseCss, esc };
