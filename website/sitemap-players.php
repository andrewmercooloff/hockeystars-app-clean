<?php
/**
 * Dynamic player sitemap: https://hockey-stars.com/sitemap-players.xml
 * Localized profile URLs for all app languages (max ~5000 players).
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/player-public.php';

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');

$limit = min(5000, max(1, (int) ($_GET['limit'] ?? 2000)));
$url = rtrim(HS_SUPABASE_URL, '/')
    . '/rest/v1/players?select=id,name,updated_at&is_hidden=eq.false'
    . '&order=updated_at.desc&limit=' . $limit;

$ctx = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => implode("\r\n", [
            'apikey: ' . HS_SUPABASE_ANON_KEY,
            'Authorization: Bearer ' . HS_SUPABASE_ANON_KEY,
            'Accept: application/json',
        ]),
        'timeout' => 20,
    ],
]);

$body = @file_get_contents($url, false, $ctx);
$rows = is_string($body) ? json_decode($body, true) : [];
$langs = hs_supported_langs();

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
<?php if (is_array($rows)): foreach ($rows as $row):
    if (empty($row['id'])) continue;
    $name = $row['name'] ?? null;
    $alts = [];
    foreach ($langs as $lang) {
        $alts[$lang] = HS_SITE_URL . hs_player_pretty_path($row['id'], $name, $lang);
    }
    $lastmod = !empty($row['updated_at']) ? date('Y-m-d', strtotime($row['updated_at'])) : date('Y-m-d');
    foreach ($langs as $lang):
        $loc = $alts[$lang];
?>
  <url>
    <loc><?php echo htmlspecialchars($loc, ENT_XML1); ?></loc>
<?php foreach ($alts as $altLang => $altHref): ?>
    <xhtml:link rel="alternate" hreflang="<?php echo htmlspecialchars($altLang, ENT_XML1); ?>" href="<?php echo htmlspecialchars($altHref, ENT_XML1); ?>" />
<?php endforeach; ?>
    <xhtml:link rel="alternate" hreflang="x-default" href="<?php echo htmlspecialchars($alts['ru'], ENT_XML1); ?>" />
    <lastmod><?php echo htmlspecialchars($lastmod, ENT_XML1); ?></lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
<?php endforeach; endforeach; endif; ?>
</urlset>
