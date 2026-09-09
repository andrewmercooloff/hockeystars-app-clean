<?php
/**
 * Публичный каталог игроков: /players.php?lang=ru&year=2012&page=2
 *
 * Зачем: страницы игроков раньше были доступны Google только из sitemap — ни одна
 * HTML-страница сайта на них не ссылалась («сироты»), поэтому их почти не индексировали.
 * Каталог даёт краулеру внутренние ссылки на каждый профиль + осмысленные посадочные
 * страницы вида «хоккеисты 2012 года рождения».
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/player-public.php';

$lang = hs_seo_canonical_lang(hs_normalize_lang((string) ($_GET['lang'] ?? 'ru')));
$isEn = $lang === 'en';

$year = (int) ($_GET['year'] ?? 0);
$minYear = (int) date('Y') - 60;
$maxYear = (int) date('Y') - 3;
if ($year < $minYear || $year > $maxYear) {
    $year = 0;
}

$perPage = 60;
$page = max(1, (int) ($_GET['page'] ?? 1));
$offset = ($page - 1) * $perPage;

$params = [
    'select=id,name,avatar,position,country,city,birth_date,goals,assists,games,season_stats',
    'is_hidden=eq.false',
    'status=eq.player',
    'order=name.asc',
    'limit=' . $perPage,
    'offset=' . $offset,
];
if ($year > 0) {
    $params[] = 'birth_date=gte.' . $year . '-01-01';
    $params[] = 'birth_date=lte.' . $year . '-12-31';
}
$url = rtrim(HS_SUPABASE_URL, '/') . '/rest/v1/players?' . implode('&', $params);
$ctx = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => implode("\r\n", [
            'apikey: ' . HS_SUPABASE_ANON_KEY,
            'Authorization: Bearer ' . HS_SUPABASE_ANON_KEY,
            'Accept: application/json',
            'Prefer: count=exact',
        ]),
        'timeout' => 10,
        'ignore_errors' => true,
    ],
]);
$body = @file_get_contents($url, false, $ctx);
$rows = is_string($body) ? json_decode($body, true) : [];
if (!is_array($rows)) {
    $rows = [];
}
$total = count($rows);
foreach ($http_response_header ?? [] as $h) {
    if (preg_match('#^content-range:\s*\S+/(\d+)#i', $h, $m)) {
        $total = (int) $m[1];
    }
}
$totalPages = max(1, (int) ceil($total / $perPage));

// Годы для навигации: те, где реально есть игроки (по аггрегированной выборке)
$yearsUrl = rtrim(HS_SUPABASE_URL, '/') . '/rest/v1/players?select=birth_date&is_hidden=eq.false&status=eq.player&birth_date=not.is.null&limit=5000';
$yearsBody = @file_get_contents($yearsUrl, false, $ctx);
$yearsRows = is_string($yearsBody) ? json_decode($yearsBody, true) : [];
$yearCounts = [];
if (is_array($yearsRows)) {
    foreach ($yearsRows as $r) {
        if (!empty($r['birth_date']) && preg_match('/(\d{4})/', (string) $r['birth_date'], $ym)) {
            $yearCounts[(int) $ym[1]] = ($yearCounts[(int) $ym[1]] ?? 0) + 1;
        }
    }
}
krsort($yearCounts);

$base = rtrim(HS_SITE_URL, '/');
$selfPath = '/players.php?lang=' . $lang . ($year ? '&year=' . $year : '') . ($page > 1 ? '&page=' . $page : '');
$canonicalUrl = $base . $selfPath;
$altRu = $base . '/players.php?lang=ru' . ($year ? '&year=' . $year : '') . ($page > 1 ? '&page=' . $page : '');
$altEn = $base . '/players.php?lang=en' . ($year ? '&year=' . $year : '') . ($page > 1 ? '&page=' . $page : '');

if ($isEn) {
    $title = $year
        ? "Hockey players born in $year — profiles, stats, scout reports | HockeyStars"
        : 'Young hockey players directory — profiles and statistics | HockeyStars';
    $description = $year
        ? "All hockey players born in $year on HockeyStars: positions, teams, goals and assists by season, achievements. Find a player and see the scout report."
        : 'Directory of young hockey players from Belarus, Russia, Baltics, Poland and Europe: positions, teams, statistics by season, achievements and scout reports.';
    $h1 = $year ? "Hockey players born in $year" : 'Hockey players';
} else {
    $title = $year
        ? "Хоккеисты $year года рождения — профили, статистика, скаутские отчёты | HockeyStars"
        : 'Каталог юных хоккеистов — профили и статистика | HockeyStars';
    $description = $year
        ? "Все хоккеисты $year года рождения в HockeyStars: позиции, команды, голы и передачи по сезонам, достижения. Найди игрока и посмотри скаутский отчёт."
        : 'Каталог юных хоккеистов Беларуси, России, Прибалтики, Польши и Европы: позиции, команды, статистика по сезонам, достижения и скаутские отчёты.';
    $h1 = $year ? "Хоккеисты $year года рождения" : 'Хоккеисты';
}
if ($page > 1) {
    $title = ($isEn ? "Page $page · " : "Страница $page · ") . $title;
}

$itemListLd = json_encode([
    '@context' => 'https://schema.org',
    '@type' => 'ItemList',
    'name' => $h1,
    'numberOfItems' => $total,
    'itemListElement' => array_values(array_map(static function ($row, $i) use ($base, $lang, $offset) {
        return [
            '@type' => 'ListItem',
            'position' => $offset + $i + 1,
            'url' => $base . hs_player_pretty_path((string) $row['id'], $row['name'] ?? null, $lang),
            'name' => $row['name'] ?? '',
        ];
    }, $rows, array_keys($rows))),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

header('Cache-Control: public, max-age=900');
?>
<!DOCTYPE html>
<html lang="<?php echo $lang; ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($title, ENT_QUOTES, 'UTF-8'); ?></title>
    <meta name="description" content="<?php echo htmlspecialchars($description, ENT_QUOTES, 'UTF-8'); ?>">
    <link rel="canonical" href="<?php echo htmlspecialchars($canonicalUrl, ENT_QUOTES, 'UTF-8'); ?>">
    <link rel="alternate" hreflang="ru" href="<?php echo htmlspecialchars($altRu, ENT_QUOTES, 'UTF-8'); ?>">
    <link rel="alternate" hreflang="en" href="<?php echo htmlspecialchars($altEn, ENT_QUOTES, 'UTF-8'); ?>">
    <link rel="alternate" hreflang="x-default" href="<?php echo htmlspecialchars($altRu, ENT_QUOTES, 'UTF-8'); ?>">
    <?php if ($page > 1): ?>
    <link rel="prev" href="<?php echo htmlspecialchars($base . '/players.php?lang=' . $lang . ($year ? '&year=' . $year : '') . ($page > 2 ? '&page=' . ($page - 1) : ''), ENT_QUOTES, 'UTF-8'); ?>">
    <?php endif; ?>
    <?php if ($page < $totalPages): ?>
    <link rel="next" href="<?php echo htmlspecialchars($base . '/players.php?lang=' . $lang . ($year ? '&year=' . $year : '') . '&page=' . ($page + 1), ENT_QUOTES, 'UTF-8'); ?>">
    <?php endif; ?>
    <meta name="robots" content="index, follow">
    <meta property="og:type" content="website">
    <meta property="og:title" content="<?php echo htmlspecialchars($title, ENT_QUOTES, 'UTF-8'); ?>">
    <meta property="og:description" content="<?php echo htmlspecialchars($description, ENT_QUOTES, 'UTF-8'); ?>">
    <meta property="og:url" content="<?php echo htmlspecialchars($canonicalUrl, ENT_QUOTES, 'UTF-8'); ?>">
    <meta property="og:image" content="<?php echo $base; ?>/logo.png">
    <script type="application/ld+json"><?php echo $itemListLd; ?></script>
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
    <link rel="shortcut icon" href="/favicon.ico">
    <meta name="theme-color" content="#0c0c10">
    <link rel="stylesheet" href="/styles.css">
    <style>
        .dir-wrap { max-width: 1040px; margin: 36px auto 24px; padding: 0 4px; }
        .dir-title { text-align: center; margin-bottom: 8px; }
        .dir-lead { text-align: center; opacity: 0.8; max-width: 720px; margin: 0 auto 22px; line-height: 1.5; }
        .years { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 26px; }
        .year-chip { padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.06); border: 1px solid rgba(250,47,64,0.28); color: #fff; text-decoration: none; font-size: 0.9rem; }
        .year-chip.active, .year-chip:hover { background: #fa2f40; border-color: #fa2f40; }
        .year-chip small { opacity: 0.6; margin-left: 4px; }
        .dir-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
        .dir-card { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(250,47,64,0.28); color: #fff; text-decoration: none; }
        .dir-card:hover { border-color: #fa2f40; background: rgba(255,255,255,0.09); }
        .dir-card img { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; flex: none; border: 2px solid rgba(250,47,64,0.5); }
        .dir-name { font-weight: 700; line-height: 1.2; }
        .dir-meta { font-size: 0.8rem; opacity: 0.75; line-height: 1.35; }
        .dir-stat { font-size: 0.8rem; color: #fa2f40; font-weight: 700; }
        .pager { display: flex; gap: 10px; justify-content: center; margin: 28px 0 8px; }
        .pager a, .pager span { padding: 10px 18px; border-radius: 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(250,47,64,0.28); color: #fff; text-decoration: none; }
        .pager span { opacity: 0.6; }
        .dir-empty { text-align: center; opacity: 0.75; padding: 40px 0; }
        .dir-cta { text-align: center; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="background-overlay"></div>
    <div class="pucks-container">
        <?php for ($i = 1; $i <= 8; $i++): ?>
        <div class="puck puck-<?php echo $i; ?>"><div class="puck-avatar"></div></div>
        <?php endfor; ?>
    </div>

    <header class="header">
        <div class="container">
            <div class="header-content">
                <a href="<?php echo $isEn ? '/en' : '/'; ?>"><img src="/logo.png" alt="HockeyStars" class="logo"></a>
                <div class="language-switcher">
                    <a class="lang-btn<?php echo $isEn ? ' active' : ''; ?>" href="<?php echo htmlspecialchars($altEn, ENT_QUOTES, 'UTF-8'); ?>">EN</a>
                    <a class="lang-btn<?php echo $isEn ? '' : ' active'; ?>" href="<?php echo htmlspecialchars($altRu, ENT_QUOTES, 'UTF-8'); ?>">RU</a>
                </div>
            </div>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <div class="dir-wrap">
                <h1 class="section-title dir-title"><?php echo htmlspecialchars($h1, ENT_QUOTES, 'UTF-8'); ?></h1>
                <p class="dir-lead"><?php echo htmlspecialchars($description, ENT_QUOTES, 'UTF-8'); ?></p>

                <?php if ($yearCounts): ?>
                <nav class="years" aria-label="<?php echo $isEn ? 'Birth year' : 'Год рождения'; ?>">
                    <a class="year-chip<?php echo $year === 0 ? ' active' : ''; ?>" href="/players.php?lang=<?php echo $lang; ?>"><?php echo $isEn ? 'All' : 'Все'; ?></a>
                    <?php foreach ($yearCounts as $y => $cnt): ?>
                    <a class="year-chip<?php echo $year === $y ? ' active' : ''; ?>" href="/players.php?lang=<?php echo $lang; ?>&amp;year=<?php echo $y; ?>"><?php echo $y; ?><small><?php echo $cnt; ?></small></a>
                    <?php endforeach; ?>
                </nav>
                <?php endif; ?>

                <?php if ($rows): ?>
                <div class="dir-grid">
                    <?php foreach ($rows as $row):
                        $stats = hs_player_season_stats($row);
                        $by = hs_player_birth_year($row);
                        $pos = hs_localize_player_position($row['position'] ?? null, $lang);
                        $place = implode(', ', array_filter([$row['city'] ?? null, hs_localize_country($row['country'] ?? null, $lang) ?: null]));
                    ?>
                    <a class="dir-card" href="<?php echo htmlspecialchars(hs_player_pretty_path((string) $row['id'], $row['name'] ?? null, $lang), ENT_QUOTES, 'UTF-8'); ?>">
                        <img src="<?php echo htmlspecialchars(hs_player_avatar_url($row['avatar'] ?? null), ENT_QUOTES, 'UTF-8'); ?>" alt="<?php echo htmlspecialchars($row['name'] ?? '', ENT_QUOTES, 'UTF-8'); ?>" width="52" height="52" loading="lazy">
                        <span>
                            <span class="dir-name"><?php echo htmlspecialchars($row['name'] ?? '', ENT_QUOTES, 'UTF-8'); ?></span><br>
                            <span class="dir-meta"><?php echo htmlspecialchars(implode(' · ', array_filter([$pos !== '' ? $pos : null, $by, $place !== '' ? $place : null])), ENT_QUOTES, 'UTF-8'); ?></span>
                            <?php if ($stats['games'] > 0): ?><br><span class="dir-stat"><?php echo (int) $stats['games']; ?> <?php echo $isEn ? 'GP' : 'И'; ?> · <?php echo (int) $stats['goals']; ?> <?php echo $isEn ? 'G' : 'Г'; ?> · <?php echo (int) $stats['assists']; ?> <?php echo $isEn ? 'A' : 'П'; ?></span><?php endif; ?>
                        </span>
                    </a>
                    <?php endforeach; ?>
                </div>
                <?php else: ?>
                <p class="dir-empty"><?php echo $isEn ? 'No players found yet.' : 'Игроков пока нет.'; ?></p>
                <?php endif; ?>

                <?php if ($totalPages > 1): ?>
                <nav class="pager" aria-label="pagination">
                    <?php if ($page > 1): ?>
                    <a href="/players.php?lang=<?php echo $lang; ?><?php echo $year ? '&amp;year=' . $year : ''; ?><?php echo $page > 2 ? '&amp;page=' . ($page - 1) : ''; ?>">← <?php echo $isEn ? 'Previous' : 'Назад'; ?></a>
                    <?php endif; ?>
                    <span><?php echo $page; ?> / <?php echo $totalPages; ?></span>
                    <?php if ($page < $totalPages): ?>
                    <a href="/players.php?lang=<?php echo $lang; ?><?php echo $year ? '&amp;year=' . $year : ''; ?>&amp;page=<?php echo $page + 1; ?>"><?php echo $isEn ? 'Next' : 'Дальше'; ?> →</a>
                    <?php endif; ?>
                </nav>
                <?php endif; ?>

                <div class="dir-cta">
                    <a class="hero-login-btn" href="/register"><?php echo $isEn ? 'Add your profile — free' : 'Добавить свой профиль — бесплатно'; ?></a>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <p class="footer-text">© <?php echo date('Y'); ?> HockeyStars</p>
                <a href="/top" class="footer-link"><?php echo $isEn ? 'Top inviters' : 'Топ приглашающих'; ?></a>
                <a href="<?php echo $isEn ? '/privacy-en.html' : '/rules.html'; ?>" class="footer-link">Privacy</a>
                <a href="/contact.html" class="footer-link">Contact</a>
            </div>
        </div>
    </footer>
    <script src="/script.js"></script>
</body>
</html>
