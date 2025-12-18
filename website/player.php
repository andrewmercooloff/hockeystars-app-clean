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
        body { margin:0; padding:0; background:#050008; color:#fff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; }
        .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
        .card { width:100%; max-width:520px; background:rgba(5,0,8,0.75); border:1px solid rgba(255,255,255,0.12); border-radius:18px; padding:24px; text-align:center; }
        .title { font-size:22px; font-weight:700; margin:0 0 10px; }
        .text { font-size:14px; opacity:0.85; margin:0 0 18px; line-height:1.5; }
        .btn { display:inline-block; padding:14px 18px; border-radius:14px; border:2px solid #fa2f40; background:rgba(5,0,8,0.9); color:#fff; font-weight:700; cursor:pointer; }
        .btn:active { transform: translateY(1px); }
        .small { margin-top:14px; font-size:12px; opacity:0.65; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <div class="title">HockeyStars</div>
            <div class="text">Чтобы приглашение засчиталось, нажмите кнопку — мы откроем приложение или перейдём в App Store.</div>
            <button class="btn" onclick="window.__hsInstall()">Открыть / Установить</button>
            <div class="small">Если приложение уже установлено — откроется профиль. Если нет — откроется App Store.</div>
        </div>
    </div>
</body>
</html>

