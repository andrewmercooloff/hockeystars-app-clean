<?php
// Получаем ID игрока из URL или параметров
$playerId = '';

// Пытаемся получить из пути /player/{id}
$path = $_SERVER['REQUEST_URI'];
if (preg_match('/\/player\/([^\/\?]+)/', $path, $matches)) {
    $playerId = $matches[1];
}

// Если не нашли в пути, берем из GET параметра
if (empty($playerId) && isset($_GET['id'])) {
    $playerId = $_GET['id'];
}

// Очищаем ID от лишних символов
$playerId = preg_replace('/[^a-zA-Z0-9\-_]/', '', $playerId);

// Определяем платформу по User-Agent
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$isIOS = preg_match('/iPad|iPhone|iPod/', $userAgent) && !preg_match('/MSStream/', $userAgent);
$isAndroid = preg_match('/android/i', $userAgent);

// App Store и Google Play ссылки
$APP_STORE_ID = '6753738837';
$APP_STORE_URL = "https://apps.apple.com/app/id{$APP_STORE_ID}";
$GOOGLE_PLAY_PACKAGE = 'by.hockeystars.app';
$GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id={$GOOGLE_PLAY_PACKAGE}";

if (empty($playerId)) {
    // Если ID не найден, редиректим на App Store
    if ($isAndroid) {
        header("Location: {$GOOGLE_PLAY_URL}", true, 302);
    } else {
        header("Location: {$APP_STORE_URL}", true, 302);
    }
    exit;
}

// Deep link для приложения
$DEEP_LINK = "hockeystars://player/{$playerId}";

// Android Install Referrer payload (free deferred attribution on Android)
$referrerPayload = "inviterId={$playerId}&deeplink_path=player/{$playerId}";
$GOOGLE_PLAY_URL_WITH_REF = $GOOGLE_PLAY_URL . "&referrer=" . urlencode($referrerPayload);

// Для Android используем Intent URL с fallback на Google Play
if ($isAndroid) {
    $intentUrl = "intent://player/{$playerId}#Intent;scheme=hockeystars;package={$GOOGLE_PLAY_PACKAGE};S.browser_fallback_url=" . urlencode($GOOGLE_PLAY_URL_WITH_REF) . ";end";
    header("Location: {$intentUrl}", true, 302);
    exit;
}

// Для iOS - если Universal Links не сработали, пытаемся открыть через custom scheme
// Если приложение установлено - откроется, если нет - редиректим на App Store
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HockeyStars</title>
    <base href="/">
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="shortcut icon" href="/favicon.ico">
    <meta name="theme-color" content="#050008">
    <link rel="stylesheet" href="/styles.css">
    <script>
        (function() {
            const playerId = <?php echo json_encode($playerId); ?>;
            const APP_STORE_URL = <?php echo json_encode($APP_STORE_URL); ?>;
            const DEEP_LINK = <?php echo json_encode($DEEP_LINK); ?>;
            
            let appOpened = false;
            let redirectAttempted = false;
            const startTime = Date.now();
            
            // Проверяем, было ли открыто приложение
            window.addEventListener('blur', function() {
                appOpened = true;
            });
            
            window.addEventListener('pagehide', function() {
                appOpened = true;
            });
            
            // Функция для попытки открыть приложение через iframe (безопасно для Safari)
            function tryOpenApp() {
                if (redirectAttempted) return;
                
                // Используем только iframe метод - он не вызывает ошибок в Safari
                if (document.body) {
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.style.width = '1px';
                    iframe.style.height = '1px';
                    iframe.style.position = 'absolute';
                    iframe.style.left = '-9999px';
                    iframe.src = DEEP_LINK;
                    document.body.appendChild(iframe);
                    
                    // Удаляем iframe через короткое время
                    setTimeout(function() {
                        if (iframe.parentNode) {
                            iframe.parentNode.removeChild(iframe);
                        }
                    }, 300);
                } else {
                    // Если body еще не загружен, ждем
                    setTimeout(tryOpenApp, 50);
                }
            }
            
            // iOS deferred attribution via clipboard requires a user gesture.
            // We expose a button handler that copies inviter data and redirects to App Store.
            window.__hsInstall = async function() {
                try {
                    const inviteUrl = `https://hockey-stars.com/player/${playerId}`;
                    const text = inviteUrl;
                    
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(text);
                    } else {
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        ta.setAttribute('readonly', '');
                        ta.style.position = 'absolute';
                        ta.style.left = '-9999px';
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                    }
                } catch (e) {
                    // ignore
                }
                
                // If app is installed, try to open it first.
                tryOpenApp();
                
                // Then go to App Store (install)
                setTimeout(function() {
                    window.location.href = APP_STORE_URL;
                }, 250);
            };
        })();
    </script>
    <style>
        /* Minimal page-specific styling; base look comes from styles.css */
        .install-card {
            max-width: 720px;
            margin: 60px auto;
            padding: 40px 30px;
            background: rgba(5, 0, 8, 0.85);
            border: 1px solid var(--color-border);
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(15px);
            text-align: center;
        }

        .install-btn {
            appearance: none;
            -webkit-appearance: none;
            width: 100%;
            max-width: 360px;
            margin: 0 auto;
        }

        .install-logo {
            max-width: 260px;
            width: 100%;
            height: auto;
            margin: 0 auto 18px;
        }
    </style>
</head>
<body>
    <div class="background-overlay"></div>
    <div class="pucks-container">
        <div class="puck puck-1"><div class="puck-avatar"></div></div>
        <div class="puck puck-2"><div class="puck-avatar"></div></div>
        <div class="puck puck-3"><div class="puck-avatar"></div></div>
        <div class="puck puck-4"><div class="puck-avatar"></div></div>
        <div class="puck puck-5"><div class="puck-avatar"></div></div>
        <div class="puck puck-6"><div class="puck-avatar"></div></div>
        <div class="puck puck-7"><div class="puck-avatar"></div></div>
        <div class="puck puck-8"><div class="puck-avatar"></div></div>
    </div>

    <header class="header">
        <div class="container">
            <div class="header-content">
                <img src="/logo.png" alt="HockeyStars" class="logo">
                <div class="language-switcher">
                    <button class="lang-btn" data-lang="en" aria-label="English">EN</button>
                    <button class="lang-btn active" data-lang="ru" aria-label="Русский">RU</button>
                </div>
            </div>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <div class="install-card">
                <div class="hero-logo-container">
                    <img src="/logo.png" alt="HockeyStars" class="hero-logo install-logo">
                </div>
                <button class="download-btn install-btn" onclick="window.__hsInstall()" data-i18n="install.open">Открыть / Установить</button>
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <p class="footer-text">© 2025 HockeyStars. Все права защищены.</p>
                <a href="/rules.html" class="footer-link footer-privacy-ru">Политика конфиденциальности</a>
                <a href="/privacy-en.html" class="footer-link footer-privacy-en" style="display: none;">Privacy Policy</a>
                <a href="/delete-account.html" class="footer-link footer-delete-account-ru">Удаление аккаунта</a>
                <a href="/delete-account-en.html" class="footer-link footer-delete-account-en" style="display: none;">Delete Account</a>
                <a href="/contact.html" class="footer-link">Обратная связь</a>
            </div>
        </div>
    </footer>

    <script src="/script.js"></script>
</body>
</html>

