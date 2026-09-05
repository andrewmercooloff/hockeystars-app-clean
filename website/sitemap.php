<?php
/**
 * Sitemap index: https://hockey-stars.com/sitemap.xml
 */
require_once __DIR__ . '/config.php';

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');

$today = date('Y-m-d');
$base = rtrim(HS_SITE_URL, '/');

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc><?php echo htmlspecialchars($base . '/sitemap-static.xml', ENT_XML1); ?></loc>
    <lastmod><?php echo htmlspecialchars($today, ENT_XML1); ?></lastmod>
  </sitemap>
  <sitemap>
    <loc><?php echo htmlspecialchars($base . '/sitemap-players.xml', ENT_XML1); ?></loc>
    <lastmod><?php echo htmlspecialchars($today, ENT_XML1); ?></lastmod>
  </sitemap>
</sitemapindex>
