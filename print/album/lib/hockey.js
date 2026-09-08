// Inline SVG hockey motifs used across album pages and cards. All take colours so they follow the team theme.

// Half of an ice rink seen from above (rounded end, goal crease, face-off circles, blue line, centre line and circle).
// Drawn in a 600x400 box; the centre line is at the right edge so the graphic reads as "half a rink".
function rinkSvg(line, red, opacity = 0.16) {
  return `<svg class="rink" viewBox="0 0 600 400" fill="none" style="opacity:${opacity}">
  <path d="M120 10 H600 M120 390 H600 M120 10 A110 110 0 0 0 10 120 V280 A110 110 0 0 0 120 390" stroke="${line}" stroke-width="6"/>
  <path d="M70 130 A60 60 0 0 1 70 270" stroke="${red}" stroke-width="5"/>
  <path d="M70 140 V260" stroke="${red}" stroke-width="5"/>
  <circle cx="170" cy="105" r="52" stroke="${red}" stroke-width="5"/><circle cx="170" cy="105" r="7" fill="${red}"/>
  <circle cx="170" cy="295" r="52" stroke="${red}" stroke-width="5"/><circle cx="170" cy="295" r="7" fill="${red}"/>
  <path d="M400 10 V390" stroke="${line}" stroke-width="10"/>
  <path d="M598 10 V390" stroke="${red}" stroke-width="10" stroke-dasharray="14 8"/>
  <path d="M600 130 A70 70 0 0 0 530 200 A70 70 0 0 0 600 270" stroke="${line}" stroke-width="5"/>
  <circle cx="470" cy="105" r="7" fill="${red}"/><circle cx="470" cy="295" r="7" fill="${red}"/>
</svg>`;
}

// Hockey puck in slight perspective.
function puckSvg(fill = '#111', edge = 'rgba(255,255,255,.35)') {
  return `<svg class="puck" viewBox="0 0 100 60"><ellipse cx="50" cy="38" rx="46" ry="16" fill="${fill}"/>
  <rect x="4" y="22" width="92" height="16" fill="${fill}"/><ellipse cx="50" cy="22" rx="46" ry="16" fill="${fill}" stroke="${edge}" stroke-width="3"/></svg>`;
}

// Two crossed sticks with a puck — badge motif.
function sticksSvg(stick, tape, puck) {
  return `<svg class="sticks" viewBox="0 0 200 200" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M40 20 L135 150 Q150 172 178 168" stroke="${stick}" stroke-width="12"/>
  <path d="M160 20 L65 150 Q50 172 22 168" stroke="${stick}" stroke-width="12"/>
  <path d="M150 165 Q158 172 178 168" stroke="${tape}" stroke-width="12"/>
  <path d="M50 165 Q42 172 22 168" stroke="${tape}" stroke-width="12"/>
  <ellipse cx="100" cy="186" rx="26" ry="9" fill="${puck}"/></svg>`;
}

// Goal net (front view) for "stats"/"notes" pages.
function goalSvg(frame, net) {
  return `<svg class="goal" viewBox="0 0 220 140" fill="none">
  <path d="M10 130 V20 Q10 10 20 10 H200 Q210 10 210 20 V130" stroke="${frame}" stroke-width="8"/>
  <path d="M10 130 H210" stroke="${frame}" stroke-width="8"/>
  <g stroke="${net}" stroke-width="1.5">${Array.from({ length: 9 }, (_, i) => `<path d="M${30 + i * 20} 14 V128"/>`).join('')}
  ${Array.from({ length: 6 }, (_, i) => `<path d="M14 ${30 + i * 18} H206"/>`).join('')}</g></svg>`;
}

// Skate-cut scratches: a few thin curved strokes to lay over ice backgrounds.
function scratchesSvg(color, opacity = 0.35) {
  return `<svg class="scratches" viewBox="0 0 800 800" fill="none" stroke="${color}" stroke-width="1.2" style="opacity:${opacity}">
  <path d="M-20 620 C 200 540, 420 520, 820 420"/><path d="M-20 660 C 180 600, 400 560, 820 470"/>
  <path d="M60 820 C 300 600, 520 380, 840 60"/><path d="M120 820 C 340 640, 560 400, 860 120"/>
  <path d="M-20 240 C 260 300, 500 240, 820 320"/></svg>`;
}

module.exports = { rinkSvg, puckSvg, sticksSvg, goalSvg, scratchesSvg };
