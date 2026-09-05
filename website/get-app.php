<?php
/**
 * Smart app-store redirect for QR / shared links.
 * iOS → App Store, Android → Google Play, others → chooser page.
 */
require_once __DIR__ . '/config.php';

$appStoreUrl = 'https://apps.apple.com/app/id' . HS_APP_STORE_ID;
$playStoreUrl = 'https://play.google.com/store/apps/details?id=' . HS_GOOGLE_PLAY_PACKAGE;

$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
$isIOS = (bool) preg_match('/iPad|iPhone|iPod/i', $ua);
$isAndroid = (bool) preg_match('/Android/i', $ua);

if ($isIOS) {
    header('Location: ' . $appStoreUrl, true, 302);
    exit;
}
if ($isAndroid) {
    header('Location: ' . $playStoreUrl, true, 302);
    exit;
}

$lang = isset($_GET['lang']) && strtolower((string) $_GET['lang']) === 'en' ? 'en' : 'ru';
$title = $lang === 'en' ? 'Install HockeyStars' : 'Установить HockeyStars';
$subtitle = $lang === 'en'
    ? 'Choose your store or scan this page from your phone.'
    : 'Выберите магазин или откройте эту страницу с телефона.';
$iosLabel = $lang === 'en' ? 'Download on the App Store' : 'Скачать в App Store';
$androidLabel = $lang === 'en' ? 'Get it on Google Play' : 'Скачать в Google Play';
?><!DOCTYPE html>
<html lang="<?php echo htmlspecialchars($lang, ENT_QUOTES, 'UTF-8'); ?>">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title><?php echo htmlspecialchars($title, ENT_QUOTES, 'UTF-8'); ?></title>
    <style>
        :root { color-scheme: dark; }
        body {
            margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
            font-family: Gilroy, system-ui, sans-serif; background: #050008; color: #fff;
            padding: 24px; box-sizing: border-box;
        }
        .card {
            width: 100%; max-width: 420px; text-align: center;
            background: rgba(255,255,255,0.04); border: 1px solid rgba(250,47,64,0.35);
            border-radius: 20px; padding: 28px 22px;
        }
        img.logo { width: 160px; height: auto; margin-bottom: 18px; }
        h1 { font-size: 22px; margin: 0 0 8px; }
        p { margin: 0 0 22px; color: rgba(255,255,255,0.7); line-height: 1.4; }
        a.btn {
            display: block; text-decoration: none; color: #fff; background: #fa2f40;
            border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; font-weight: 700;
        }
        a.btn.secondary { background: transparent; border: 1px solid rgba(250,47,64,0.6); }
    </style>
</head>
<body>
    <div class="card">
        <img class="logo" src="/logo.png" alt="HockeyStars">
        <h1><?php echo htmlspecialchars($title, ENT_QUOTES, 'UTF-8'); ?></h1>
        <p><?php echo htmlspecialchars($subtitle, ENT_QUOTES, 'UTF-8'); ?></p>
        <a class="btn" href="<?php echo htmlspecialchars($appStoreUrl, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($iosLabel, ENT_QUOTES, 'UTF-8'); ?></a>
        <a class="btn secondary" href="<?php echo htmlspecialchars($playStoreUrl, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($androidLabel, ENT_QUOTES, 'UTF-8'); ?></a>
    </div>
</body>
</html>
