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

// Для Android используем Intent URL с fallback на Google Play
if ($isAndroid) {
    $intentUrl = "intent://player/{$playerId}#Intent;scheme=hockeystars;package={$GOOGLE_PLAY_PACKAGE};S.browser_fallback_url=" . urlencode($GOOGLE_PLAY_URL) . ";end";
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
            
            // Пытаемся открыть приложение
            if (document.body) {
                tryOpenApp();
            } else {
                document.addEventListener('DOMContentLoaded', tryOpenApp);
            }
            
            // Если через 1 секунду приложение не открылось - редиректим на App Store
            setTimeout(function() {
                if (!appOpened) {
                    redirectAttempted = true;
                    window.location.href = APP_STORE_URL;
                }
            }, 1000);
            
            // Дополнительная проверка через 1.5 секунды
            setTimeout(function() {
                if (!appOpened && document.visibilityState === 'visible') {
                    redirectAttempted = true;
                    window.location.href = APP_STORE_URL;
                }
            }, 1500);
        })();
    </script>
</head>
<body style="margin:0;padding:0;background:#050008;">
    <!-- Минимальная страница - пытаемся открыть приложение -->
</body>
</html>

