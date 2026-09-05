<?php
require_once __DIR__ . '/config.php';

$lang = (isset($_GET['lang']) && $_GET['lang'] === 'en') ? 'en' : 'ru';
$returnTo = isset($_GET['returnTo']) ? (string) $_GET['returnTo'] : '/feed';
if (!preg_match('#^/[a-zA-Z0-9/_\-?=&%.]*$#', $returnTo)) {
    $returnTo = '/feed';
}
if ($returnTo === '/') {
    $returnTo = '/feed';
}

$t = $lang === 'en'
    ? [
        'title' => 'Log in | HockeyStars',
        'heading' => 'Log in',
        'contact' => 'Phone or email',
        'code' => 'Verification code',
        'submit' => 'Send code',
        'submitLogin' => 'Log in',
        'register' => 'No account? Open the app',
        'contactPh' => '+48… or email',
    ]
    : [
        'title' => 'Вход | HockeyStars',
        'heading' => 'Вход',
        'contact' => 'Телефон или email',
        'code' => 'Код из SMS или письма',
        'submit' => 'Получить код',
        'submitLogin' => 'Войти',
        'register' => 'Нет аккаунта? Откройте приложение',
        'contactPh' => '+48… или email',
    ];
?>
<!DOCTYPE html>
<html lang="<?php echo $lang === 'en' ? 'en' : 'ru'; ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    <meta name="robots" content="noindex, nofollow">
    <title><?php echo htmlspecialchars($t['title'], ENT_QUOTES, 'UTF-8'); ?></title>
    <link rel="stylesheet" href="/styles.css">
    <style>
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; overflow-x: hidden; }
        .auth-page {
            position: relative;
            z-index: 10;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            padding-top: max(16px, env(safe-area-inset-top));
            padding-bottom: max(16px, env(safe-area-inset-bottom));
        }
        .auth-card {
            width: 100%;
            max-width: 360px;
            padding: 22px 18px;
            background: rgba(5,0,8,.92);
            border-radius: 20px;
            border: 1px solid rgba(255,68,68,.28);
            box-shadow: 0 10px 28px rgba(0,0,0,.45);
        }
        .auth-card h1 {
            text-align: center;
            margin: 0 0 8px;
            font-size: 22px;
        }
        .auth-sub {
            text-align: center;
            opacity: .85;
            font-size: 14px;
            line-height: 1.4;
            margin-bottom: 18px;
        }
        .auth-card label {
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
            opacity: .9;
        }
        .auth-card input {
            display: block;
            width: 100%;
            max-width: 100%;
            padding: 14px 12px;
            margin-bottom: 14px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,.22);
            background: rgba(255,255,255,.08);
            color: #fff;
            font-size: 16px;
            -webkit-appearance: none;
        }
        .auth-card input:focus {
            outline: none;
            border-color: rgba(255,68,68,.55);
        }
        #auth-code {
            text-align: center;
            letter-spacing: 6px;
            font-size: 22px;
            font-weight: 700;
        }
        .auth-step { display: block; }
        .auth-step.is-hidden { display: none !important; }
        .auth-card button {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 12px;
            background: #fa2f40;
            color: #fff;
            font-weight: 700;
            font-size: 16px;
            cursor: pointer;
        }
        .auth-card button:disabled { opacity: .65; }
        .auth-error {
            color: #ff6b6b;
            margin-bottom: 12px;
            text-align: center;
            font-size: 14px;
            line-height: 1.35;
        }
        .auth-error.is-info { color: #8fd19e; }
        .auth-links { text-align: center; margin-top: 14px; font-size: 14px; }
        .auth-links a { color: #fff; opacity: .85; }
    </style>
    <script>
        window.HS_CONFIG = {
            supabaseUrl: <?php echo json_encode(HS_SUPABASE_URL); ?>,
            anonKey: <?php echo json_encode(HS_SUPABASE_ANON_KEY); ?>,
        };
    </script>
</head>
<body>
    <div class="background-overlay"></div>
    <main class="auth-page">
        <form class="auth-card" id="auth-form" autocomplete="on">
            <h1><?php echo htmlspecialchars($t['heading'], ENT_QUOTES, 'UTF-8'); ?></h1>
            <p class="auth-sub"><?php echo htmlspecialchars($t['contact'], ENT_QUOTES, 'UTF-8'); ?></p>
            <div id="auth-error" class="auth-error" hidden></div>

            <div id="auth-step-contact" class="auth-step">
                <label for="auth-contact"><?php echo htmlspecialchars($t['contact'], ENT_QUOTES, 'UTF-8'); ?></label>
                <input id="auth-contact" name="contact" type="text" autocomplete="username" required
                    placeholder="<?php echo htmlspecialchars($t['contactPh'], ENT_QUOTES, 'UTF-8'); ?>">
            </div>

            <div id="auth-step-code" class="auth-step is-hidden">
                <label for="auth-code"><?php echo htmlspecialchars($t['code'], ENT_QUOTES, 'UTF-8'); ?></label>
                <input id="auth-code" name="code" type="tel" inputmode="numeric" pattern="[0-9]*"
                    maxlength="6" autocomplete="one-time-code" placeholder="000000">
            </div>

            <button type="submit" id="auth-submit"><?php echo htmlspecialchars($t['submit'], ENT_QUOTES, 'UTF-8'); ?></button>
            <p class="auth-links"><a href="/"><?php echo htmlspecialchars($t['register'], ENT_QUOTES, 'UTF-8'); ?></a></p>
        </form>
    </main>
    <script src="/assets/site-auth.js?v=5" defer></script>
</body>
</html>
