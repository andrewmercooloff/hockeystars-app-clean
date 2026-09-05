<?php
/**
 * Static / marketing pages sitemap: https://hockey-stars.com/sitemap-static.xml
 */
require_once __DIR__ . '/config.php';

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');

$base = rtrim(HS_SITE_URL, '/');
$today = date('Y-m-d');

/** @var list<array{loc:string,changefreq:string,priority:string}> $pages */
$pages = [
    ['loc' => '/', 'changefreq' => 'weekly', 'priority' => '1.0'],
    ['loc' => '/en', 'changefreq' => 'weekly', 'priority' => '0.9'],
    ['loc' => '/top', 'changefreq' => 'daily', 'priority' => '0.8'],
    ['loc' => '/rules.html', 'changefreq' => 'yearly', 'priority' => '0.3'],
    ['loc' => '/privacy-en.html', 'changefreq' => 'yearly', 'priority' => '0.3'],
    ['loc' => '/contact.html', 'changefreq' => 'yearly', 'priority' => '0.4'],
    ['loc' => '/delete-account.html', 'changefreq' => 'yearly', 'priority' => '0.2'],
    ['loc' => '/delete-account-en.html', 'changefreq' => 'yearly', 'priority' => '0.2'],
];

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
<?php foreach ($pages as $page):
    $loc = $base . $page['loc'];
?>
  <url>
    <loc><?php echo htmlspecialchars($loc, ENT_XML1); ?></loc>
<?php if ($page['loc'] === '/'): ?>
    <xhtml:link rel="alternate" hreflang="ru" href="<?php echo htmlspecialchars($base . '/', ENT_XML1); ?>" />
    <xhtml:link rel="alternate" hreflang="en" href="<?php echo htmlspecialchars($base . '/en', ENT_XML1); ?>" />
    <xhtml:link rel="alternate" hreflang="x-default" href="<?php echo htmlspecialchars($base . '/', ENT_XML1); ?>" />
<?php elseif ($page['loc'] === '/en'): ?>
    <xhtml:link rel="alternate" hreflang="ru" href="<?php echo htmlspecialchars($base . '/', ENT_XML1); ?>" />
    <xhtml:link rel="alternate" hreflang="en" href="<?php echo htmlspecialchars($base . '/en', ENT_XML1); ?>" />
    <xhtml:link rel="alternate" hreflang="x-default" href="<?php echo htmlspecialchars($base . '/', ENT_XML1); ?>" />
<?php endif; ?>
    <lastmod><?php echo htmlspecialchars($today, ENT_XML1); ?></lastmod>
    <changefreq><?php echo htmlspecialchars($page['changefreq'], ENT_XML1); ?></changefreq>
    <priority><?php echo htmlspecialchars($page['priority'], ENT_XML1); ?></priority>
  </url>
<?php endforeach; ?>
</urlset>
