const fs = require('fs');

const files = [
  'app/notifications.tsx',
  'app/player/[id].tsx',
  'app/chat/[id].tsx',
];

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  const orig = s;

  if (s.includes('buildPlayerPath') && !s.includes('buildPlayerSlug')) {
    s = s.replace(
      /import \{([^}]+)\} from ['"][^'"]*playerSeoPath['"]/,
      (m, inner) => {
        if (inner.includes('buildPlayerSlug')) return m;
        return m.replace(inner, inner.trim().replace(/,?$/, '') + ', buildPlayerSlug');
      }
    );
  }

  // pathname: buildPlayerPath(x)  +  params: { ... }
  // -> pathname: '/player/[id]', params: { id: buildPlayerSlug(x), ... }
  s = s.replace(
    /pathname:\s*buildPlayerPath\(([^)]+)\),\s*\n(\s*)params:\s*\{/g,
    "pathname: '/player/[id]',\n$2params: { id: buildPlayerSlug($1),"
  );

  // lone pathname: buildPlayerPath(x) without following params on next lines already handled;
  // remaining lone cases:
  s = s.replace(
    /pathname:\s*buildPlayerPath\(([^)]+)\)/g,
    "pathname: '/player/[id]', params: { id: buildPlayerSlug($1) }"
  );

  if (s !== orig) {
    fs.writeFileSync(f, s);
    console.log('fixed', f);
  } else {
    console.log('unchanged', f);
  }
}
