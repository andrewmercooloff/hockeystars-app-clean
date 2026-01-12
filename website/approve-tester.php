<?php
/**
 * Approval endpoint - called when support clicks "Одобрено" button
 * Sends confirmation email to user with Play Store link
 */

header('Content-Type: text/html; charset=utf-8');

// Configuration
$appPackageId = 'by.hockeystars.app';
$playStoreUrl = 'https://play.google.com/store/apps/details?id=' . $appPackageId;

// Helper function to log
function logMessage($message, $data = '') {
    $logFile = __DIR__ . '/tester-errors.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "$timestamp | $message";
    if ($data) {
        $logEntry .= " | $data";
    }
    $logEntry .= "\n";
    @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// Get token, email, and language from URL
$token = isset($_GET['token']) ? trim($_GET['token']) : '';
$email = isset($_GET['email']) ? trim($_GET['email']) : '';
$lang = isset($_GET['lang']) ? trim($_GET['lang']) : 'ru'; // Default to Russian

// Validate language
if ($lang !== 'ru' && $lang !== 'en') {
    $lang = 'ru';
}

if (empty($token) || empty($email)) {
    die($lang === 'ru' ? 'Неверная ссылка' : 'Invalid link');
}

// Translations
$translations = [
    'ru' => [
        'title' => 'Запрос одобрен!',
        'message_sent' => 'Письмо с подтверждением отправлено на',
        'user_will_receive' => 'Пользователь получит ссылку для перехода в Google Play Store.',
        'email_subject' => 'Ваш запрос на доступ к приложению одобрен!',
        'email_greeting' => 'Здравствуйте!',
        'email_body' => 'Ваш запрос на доступ к приложению <strong>Hockey Stars</strong> был одобрен.',
        'email_now_available' => 'Теперь вы можете скачать приложение из Google Play Store:',
        'email_button' => 'Перейти в Google Play',
        'email_wait' => 'Если приложение еще не появилось в Play Store, подождите несколько минут и попробуйте снова.',
        'email_signature' => 'С уважением,<br>Команда Hockey Stars',
        'error_invalid_link' => 'Неверная ссылка',
        'error_expired' => 'Ссылка истекла. Срок действия 7 дней.',
        'error_not_found' => 'Ссылка не найдена или уже использована',
        'error_sending' => 'Ошибка при отправке письма. Пожалуйста, свяжитесь с поддержкой.'
    ],
    'en' => [
        'title' => 'Request Approved!',
        'message_sent' => 'Confirmation email sent to',
        'user_will_receive' => 'The user will receive a link to go to the Google Play Store.',
        'email_subject' => 'Your app access request has been approved!',
        'email_greeting' => 'Hello!',
        'email_body' => 'Your request for access to the <strong>Hockey Stars</strong> app has been approved.',
        'email_now_available' => 'You can now download the app from the Google Play Store:',
        'email_button' => 'Go to Google Play',
        'email_wait' => 'If the app hasn\'t appeared in the Play Store yet, wait a few minutes and try again.',
        'email_signature' => 'Best regards,<br>The Hockey Stars Team',
        'error_invalid_link' => 'Invalid link',
        'error_expired' => 'Link expired. Valid for 7 days.',
        'error_not_found' => 'Link not found or already used',
        'error_sending' => 'Error sending email. Please contact support.'
    ]
];

$t = $translations[$lang];

// Validate token and find pending approval
$pendingFile = __DIR__ . '/pending-approvals.txt';
$found = false;
$foundLang = $lang;

if (file_exists($pendingFile)) {
    $lines = file($pendingFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $newLines = [];
    
    foreach ($lines as $line) {
        $parts = explode('|', $line, 4);
        if (count($parts) >= 3) {
            $approvalToken = $parts[0];
            $approvalEmail = $parts[1];
            $approvalTime = $parts[2];
            $approvalLang = isset($parts[3]) ? $parts[3] : 'ru';
            
            // Check if this is the one we're looking for
            if ($approvalToken === $token && strtolower($approvalEmail) === strtolower($email)) {
                $found = true;
                $foundLang = $approvalLang; // Use language from file
                
                // Check if token is not too old (7 days)
                $approvalTimestamp = strtotime($approvalTime);
                if ($approvalTimestamp && (time() - $approvalTimestamp) > (7 * 24 * 60 * 60)) {
                    die($t['error_expired']);
                }
                
                // Move to approved file
                $approvedFile = __DIR__ . '/approved-testers.txt';
                $approvedEntry = "$email|" . date('Y-m-d H:i:s') . "|$approvalTime|$approvalLang\n";
                @file_put_contents($approvedFile, $approvedEntry, FILE_APPEND | LOCK_EX);
                
                logMessage("Approval processed", "Email: $email, Token: $token, Lang: $foundLang");
                // Don't add this line to newLines (remove it)
                continue;
            }
        }
        
        // Keep this approval (not the one we're processing)
        $newLines[] = $line;
    }
    
    // Update pending file without the processed approval
    if ($found) {
        @file_put_contents($pendingFile, implode("\n", $newLines) . "\n", LOCK_EX);
    }
}

if (!$found) {
    die($t['error_not_found']);
}

// Use language from file for email
$t = $translations[$foundLang];

// Send confirmation email to user
$subject = $t['email_subject'];

$emailBody = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 15px 40px; background-color: #4CAF50; color: white; 
                  text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; font-size: 16px; }
        .button:hover { background-color: #45a049; }
        .info { background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50; }
    </style>
</head>
<body>
    <div class='container'>
        <h2>{$t['email_greeting']}</h2>
        <div class='info'>
            <p>{$t['email_body']}</p>
        </div>
        <p>{$t['email_now_available']}</p>
        <p style='text-align: center;'>
            <a href='$playStoreUrl' class='button'>{$t['email_button']}</a>
        </p>
        <p style='color: #666; font-size: 14px; margin-top: 30px;'>
            {$t['email_wait']}
        </p>
        <p style='color: #666; font-size: 12px; margin-top: 20px;'>
            {$t['email_signature']}
        </p>
    </div>
</body>
</html>
";

$headers = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "From: Hockey Stars App <noreply@hockey-stars.com>\r\n";
$headers .= "Reply-To: support@hockey-stars.com\r\n";

$mailSent = @mail($email, $subject, $emailBody, $headers);

if ($mailSent) {
    logMessage("Confirmation email sent", "Email: $email, Lang: $foundLang");
    
    // Update log
    $logFile = __DIR__ . '/tester-emails.log';
    $logEntry = date('Y-m-d H:i:s') . " | " . $email . " | Approved | Lang: $foundLang\n";
    @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    
    // Use language from file for page
    $t = $translations[$foundLang];
    
    // Show success page
    ?>
    <!DOCTYPE html>
    <html lang="<?php echo htmlspecialchars($foundLang); ?>">
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title><?php echo htmlspecialchars($t['title']); ?></title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .success { color: #4CAF50; font-size: 48px; margin-bottom: 20px; }
            h1 { color: #333; }
            p { color: #666; line-height: 1.6; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='success'>✓</div>
            <h1><?php echo htmlspecialchars($t['title']); ?></h1>
            <p><?php echo htmlspecialchars($t['message_sent']); ?> <strong><?php echo htmlspecialchars($email); ?></strong></p>
            <p><?php echo htmlspecialchars($t['user_will_receive']); ?></p>
        </div>
    </body>
    </html>
    <?php
} else {
    logMessage("Failed to send confirmation email", "Email: $email, Error: " . (error_get_last()['message'] ?? 'Unknown'));
    die($t['error_sending']);
}
