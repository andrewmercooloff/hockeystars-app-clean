<?php
/**
 * SEO player profile + app install / web app CTA.
 * /player/{id} — indexable public teaser; full profile in app or app.hockey-stars.com after login.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/player-public.php';

$playerId = '';
$lang = 'ru';
$path = $_SERVER['REQUEST_URI'] ?? '';
$langPathRe = '#^/(' . implode('|', hs_supported_langs()) . ')/player/([^/?]+)#';
if (preg_match($langPathRe, $path, $langMatch)) {
    $lang = hs_normalize_lang($langMatch[1]);
    $raw = $langMatch[2];
    $playerId = hs_sanitize_player_id($raw);
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $playerId)) {
        $resolved = hs_resolve_player_id_from_slug($raw);
        if ($resolved !== '') {
            $playerId = $resolved;
        }
    }
} elseif (preg_match('/\/player\/([^\/\?]+)/', $path, $matches)) {
    $raw = $matches[1];
    $playerId = hs_sanitize_player_id($raw);
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $playerId)) {
        $resolved = hs_resolve_player_id_from_slug($raw);
        if ($resolved !== '') {
            $playerId = $resolved;
        }
    }
}
if ($playerId === '' && isset($_GET['id'])) {
    $playerId = hs_sanitize_player_id((string) $_GET['id']);
}
if (isset($_GET['lang'])) {
    $lang = hs_normalize_lang((string) $_GET['lang']);
}

$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$isIOS = preg_match('/iPad|iPhone|iPod/', $userAgent) && !preg_match('/MSStream/', $userAgent);
$isAndroid = preg_match('/android/i', $userAgent);
$isBot = hs_is_search_bot($userAgent);

$APP_STORE_URL = 'https://apps.apple.com/app/id' . HS_APP_STORE_ID;
$GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=' . HS_GOOGLE_PLAY_PACKAGE;

if ($playerId === '') {
    header('Location: ' . HS_SITE_URL . '/', true, 302);
    exit;
}

$player = hs_fetch_public_player($playerId);
$prettyPath = hs_player_pretty_path($playerId, $player['name'] ?? null, $lang);
$canonicalUrl = HS_SITE_URL . $prettyPath;

// Consolidate duplicate URLs for crawlers (UUID / wrong lang prefix → pretty path).
$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
$requestPath = rtrim($requestPath, '/') ?: '/';
$prettyNorm = rtrim($prettyPath, '/') ?: '/';
if ($player && $requestPath !== $prettyNorm) {
    header('Location: ' . $canonicalUrl, true, 301);
    exit;
}

$altUrls = [];
foreach (hs_supported_langs() as $altLang) {
    $altUrls[$altLang] = HS_SITE_URL . hs_player_pretty_path($playerId, $player['name'] ?? null, $altLang);
}
$webAppProfileUrl = rtrim(HS_WEB_APP_URL, '/') . $prettyPath;
$loginUrl = '/login?returnTo=' . rawurlencode($prettyPath);

$DEEP_LINK = 'hockeystars://player/' . $playerId;
$referrerPayload = 'inviterId=' . $playerId . '&deeplink_path=player/' . $playerId;
$GOOGLE_PLAY_URL_WITH_REF = $GOOGLE_PLAY_URL . '&referrer=' . urlencode($referrerPayload);

$pageTitle = $player
    ? hs_player_seo_title($player, $lang)
    : ($lang === 'ru' ? 'Профиль хоккеиста | HockeyStars' : 'Hockey player profile | HockeyStars');
$pageDescription = $player
    ? hs_player_seo_description($player, $lang)
    : ($lang === 'ru'
        ? 'HockeyStars — социальная сеть для хоккеистов. Зарегистрируйтесь для полного профиля.'
        : 'HockeyStars — social network for hockey players. Register to view full profiles.');
$ogImage = $player ? hs_player_avatar_url($player['avatar'] ?? null) : HS_SITE_URL . '/logo.png';
$jsonLd = $player ? hs_player_json_ld($player, $canonicalUrl, $lang) : '';

$ogLocales = [
    'ru' => 'ru_RU', 'en' => 'en_US', 'lt' => 'lt_LT', 'lv' => 'lv_LV', 'pl' => 'pl_PL',
    'sv' => 'sv_SE', 'cs' => 'cs_CZ', 'sk' => 'sk_SK', 'fi' => 'fi_FI', 'it' => 'it_IT',
    'de' => 'de_DE', 'fr' => 'fr_FR',
];
$ogLocale = $ogLocales[$lang] ?? 'ru_RU';
?>
<!DOCTYPE html>
<html lang="<?php echo htmlspecialchars($lang, ENT_QUOTES, 'UTF-8'); ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8'); ?></title>
    <meta name="description" content="<?php echo htmlspecialchars($pageDescription, ENT_QUOTES, 'UTF-8'); ?>">
    <link rel="canonical" href="<?php echo htmlspecialchars($canonicalUrl, ENT_QUOTES, 'UTF-8'); ?>">
    <?php foreach ($altUrls as $altLang => $altHref): ?>
    <link rel="alternate" hreflang="<?php echo htmlspecialchars($altLang, ENT_QUOTES, 'UTF-8'); ?>" href="<?php echo htmlspecialchars($altHref, ENT_QUOTES, 'UTF-8'); ?>">
    <?php endforeach; ?>
    <link rel="alternate" hreflang="x-default" href="<?php echo htmlspecialchars($altUrls['ru'], ENT_QUOTES, 'UTF-8'); ?>">
    <meta name="robots" content="index, follow">

    <meta property="og:type" content="profile">
    <meta property="og:url" content="<?php echo htmlspecialchars($canonicalUrl, ENT_QUOTES, 'UTF-8'); ?>">
    <meta property="og:title" content="<?php echo htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8'); ?>">
    <meta property="og:description" content="<?php echo htmlspecialchars($pageDescription, ENT_QUOTES, 'UTF-8'); ?>">
    <meta property="og:image" content="<?php echo htmlspecialchars($ogImage, ENT_QUOTES, 'UTF-8'); ?>">
    <meta property="og:site_name" content="HockeyStars">
    <meta property="og:locale" content="<?php echo htmlspecialchars($ogLocale, ENT_QUOTES, 'UTF-8'); ?>">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?php echo htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8'); ?>">
    <meta name="twitter:description" content="<?php echo htmlspecialchars($pageDescription, ENT_QUOTES, 'UTF-8'); ?>">
    <meta name="twitter:image" content="<?php echo htmlspecialchars($ogImage, ENT_QUOTES, 'UTF-8'); ?>">

    <?php if ($jsonLd !== ''): ?>
    <script type="application/ld+json"><?php echo $jsonLd; ?></script>
    <?php endif; ?>

    <base href="/">
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="shortcut icon" href="/favicon.ico">
    <meta name="theme-color" content="#050008">
    <link rel="stylesheet" href="/styles.css">
    <style>
        .profile-seo-card {
            max-width: 720px;
            margin: 40px auto 24px;
            padding: 32px 28px;
            background: rgba(5, 0, 8, 0.88);
            border: 1px solid var(--color-border, rgba(255,255,255,0.12));
            border-radius: 20px;
            text-align: center;
        }
        .profile-avatar {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            object-fit: cover;
            margin: 0 auto 16px;
            border: 2px solid rgba(255,255,255,0.2);
        }
        .profile-name { font-size: 1.75rem; font-weight: 700; margin: 0 0 8px; }
        .profile-meta { opacity: 0.85; margin-bottom: 16px; line-height: 1.5; }
        .profile-stats {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
            margin: 16px 0 20px;
        }
        .profile-stat {
            padding: 8px 14px;
            border-radius: 12px;
            background: rgba(255,255,255,0.06);
            font-size: 0.95rem;
        }
        .gate-box {
            margin-top: 20px;
            padding: 16px;
            border-radius: 14px;
            background: rgba(0,0,0,0.35);
            border: 1px dashed rgba(255,255,255,0.2);
            font-size: 0.95rem;
            line-height: 1.5;
        }
        .cta-row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
            margin-top: 20px;
        }
        .cta-btn {
            appearance: none;
            padding: 14px 22px;
            border-radius: 14px;
            border: none;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }
        .cta-primary { background: #e10600; color: #fff; }
        .cta-secondary { background: rgba(255,255,255,0.12); color: #fff; }
    </style>
    <script>
        (function() {
            const playerId = <?php echo json_encode($playerId); ?>;
            const APP_STORE_URL = <?php echo json_encode($APP_STORE_URL); ?>;
            const DEEP_LINK = <?php echo json_encode($DEEP_LINK); ?>;
            const isIOS = <?php echo $isIOS ? 'true' : 'false'; ?>;

            window.__hsInstall = async function() {
                if (isIOS) {
                    try {
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'none';
                        iframe.src = DEEP_LINK;
                        document.body.appendChild(iframe);
                        setTimeout(function() { iframe.remove(); }, 300);
                    } catch (e) {}
                    setTimeout(function() { window.location.href = APP_STORE_URL; }, 250);
                } else {
                    window.location.href = <?php echo json_encode($GOOGLE_PLAY_URL_WITH_REF); ?>;
                }
            };
        })();
    </script>
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
                <a href="/"><img src="/logo.png" alt="HockeyStars" class="logo"></a>
                <div class="language-switcher">
                    <a class="lang-btn" href="?id=<?php echo urlencode($playerId); ?>&lang=en">EN</a>
                    <a class="lang-btn active" href="?id=<?php echo urlencode($playerId); ?>&lang=ru">RU</a>
                </div>
            </div>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <article class="profile-seo-card">
                <?php if ($player): ?>
                <img class="profile-avatar" src="<?php echo htmlspecialchars($ogImage, ENT_QUOTES, 'UTF-8'); ?>"
                     alt="<?php echo htmlspecialchars($player['name'] ?? '', ENT_QUOTES, 'UTF-8'); ?>" width="120" height="120">
                <h1 class="profile-name"><?php echo htmlspecialchars($player['name'] ?? '', ENT_QUOTES, 'UTF-8'); ?></h1>
                <p class="profile-meta">
                    <?php
                    $meta = array_filter([
                        $player['position'] ?? null,
                        $player['team'] ?? null,
                        $player['country'] ?? null,
                        isset($player['age']) && $player['age'] !== '' ? ($lang === 'en' ? 'Age ' : 'Возраст ') . $player['age'] : null,
                    ]);
                    echo htmlspecialchars(implode(' · ', $meta), ENT_QUOTES, 'UTF-8');
                    ?>
                </p>
                <div class="profile-stats">
                    <?php if (!empty($player['goals'])): ?>
                    <span class="profile-stat"><?php echo $lang === 'en' ? 'Goals' : 'Голы'; ?>: <?php echo htmlspecialchars((string) $player['goals'], ENT_QUOTES, 'UTF-8'); ?></span>
                    <?php endif; ?>
                    <?php if (!empty($player['assists'])): ?>
                    <span class="profile-stat"><?php echo $lang === 'en' ? 'Assists' : 'Передачи'; ?>: <?php echo htmlspecialchars((string) $player['assists'], ENT_QUOTES, 'UTF-8'); ?></span>
                    <?php endif; ?>
                    <?php if (!empty($player['games'])): ?>
                    <span class="profile-stat"><?php echo $lang === 'en' ? 'Games' : 'Игры'; ?>: <?php echo htmlspecialchars((string) $player['games'], ENT_QUOTES, 'UTF-8'); ?></span>
                    <?php endif; ?>
                </div>
                <?php else: ?>
                <img src="/logo.png" alt="HockeyStars" class="profile-avatar" width="120" height="120">
                <h1 class="profile-name">HockeyStars</h1>
                <p class="profile-meta"><?php echo htmlspecialchars($pageDescription, ENT_QUOTES, 'UTF-8'); ?></p>
                <?php endif; ?>

                <div class="gate-box">
                    <?php if ($lang === 'en'): ?>
                    Photos, videos, stats, friends and messages are available after free registration — same as in the mobile app.
                    <?php else: ?>
                    Фото, видео, статистика, друзья и сообщения доступны после бесплатной регистрации — как в мобильном приложении.
                    <?php endif; ?>
                </div>

                <div class="cta-row">
                    <a class="cta-btn cta-primary" href="<?php echo htmlspecialchars($webAppProfileUrl, ENT_QUOTES, 'UTF-8'); ?>">
                        <?php echo $lang === 'en' ? 'Open in web app' : 'Открыть в веб-приложении'; ?>
                    </a>
                    <a class="cta-btn cta-secondary" href="/login?returnTo=<?php echo urlencode('/player/' . $playerId); ?>">
                        <?php echo $lang === 'en' ? 'Log in / Sign up' : 'Войти / Регистрация'; ?>
                    </a>
                    <button type="button" class="cta-btn cta-secondary download-btn" onclick="window.__hsInstall()">
                        <?php echo $lang === 'en' ? 'Install mobile app' : 'Установить приложение'; ?>
                    </button>
                </div>
            </article>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <p class="footer-text">© <?php echo date('Y'); ?> HockeyStars</p>
                <a href="/rules.html" class="footer-link">Privacy</a>
                <a href="/contact.html" class="footer-link">Contact</a>
            </div>
        </div>
    </footer>
    <script src="/script.js"></script>
</body>
</html>
