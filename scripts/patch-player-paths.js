const fs = require('fs');

const files = [
  'components/ReferralLeaderboard.tsx',
  'components/PlayerMuseum.tsx',
  'app/admin/users.tsx',
  'app/admin.tsx',
  'app/chat/[id].tsx',
  'app/puck-speed-sound.tsx',
  'app/puck-test.tsx',
  'app/notifications.tsx',
  'app/player/[id].tsx',
];

function importPathFor(file) {
  if (file.startsWith('app/admin/') || file.startsWith('app/chat/') || file.startsWith('app/player/')) {
    return '../../utils/playerSeoPath';
  }
  if (file.startsWith('app/')) {
    return '../utils/playerSeoPath';
  }
  return '../utils/playerSeoPath';
}

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  const orig = s;
  const hasPlayerLinks = /\/player\/\$\{/.test(s) || /pathname:\s*[`'"]\/player\//.test(s);
  if (!hasPlayerLinks) {
    console.log('skip (no links)', f);
    continue;
  }

  if (!s.includes('playerSeoPath')) {
    const imp = `import { buildPlayerPath } from '${importPathFor(f)}';\n`;
    if (/from ['"]expo-router['"]/.test(s)) {
      s = s.replace(/(from ['"]expo-router['"];?\r?\n)/, (m) => m + imp);
    } else {
      s = imp + s;
    }
  }

  s = s.replace(
    /router\.(push|replace)\(`\/player\/\$\{([^`}]+)\}(\?[^`]*)?`\)/g,
    (m, method, expr, q) => {
      if (q) {
        return `router.${method}((buildPlayerPath(${expr}) + '${q}') as any)`;
      }
      return `router.${method}(buildPlayerPath(${expr}) as any)`;
    }
  );

  s = s.replace(
    /pathname:\s*`\/player\/\$\{([^`}]+)\}`/g,
    'pathname: buildPlayerPath($1)'
  );

  // puck-test style: params: { id: playerId }
  if (f === 'app/puck-test.tsx') {
    s = s.replace(
      /router\.push\(\{\s*pathname:\s*'\/player\/\[id\]',\s*params:\s*\{\s*id:\s*playerId\s*\}\s*\}\)/g,
      "router.push(buildPlayerPath(playerId) as any)"
    );
  }
  if (f === 'app/admin.tsx') {
    s = s.replace(
      /router\.push\(\{\s*pathname:\s*'\/player\/\[id\]',\s*params:\s*\{\s*id:\s*item\.id\s*\}\s*\}\)/g,
      'router.push(buildPlayerPath(item.id, item.name) as any)'
    );
  }

  if (s !== orig) {
    fs.writeFileSync(f, s);
    console.log('updated', f);
  } else {
    console.log('unchanged', f);
  }
}
