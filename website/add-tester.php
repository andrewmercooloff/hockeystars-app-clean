<?php
/**
 * Simple app access registration endpoint
 * Sends email to support@hockey-stars.com for manual approval
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Enable error logging for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Configuration
$supportEmail = 'support@hockey-stars.com';
$appPackageId = 'by.hockeystars.app';
$playStoreUrl = 'https://play.google.com/store/apps/details?id=' . $appPackageId;
$approvalUrl = 'https://hockey-stars.com/approve-tester.php'; // Will be created

// Helper function to log errors
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

// Get email and language from request (can be POST or JSON)
$email = '';
$lang = 'ru';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Try to get from JSON body first
    $json = json_decode(file_get_contents('php://input'), true);
    if ($json && isset($json['email'])) {
        $email = trim($json['email']);
        $lang = isset($json['lang']) ? trim($json['lang']) : 'ru';
    } else {
        // Fallback to POST data
        $email = isset($_POST['email']) ? trim($_POST['email']) : '';
        $lang = isset($_POST['lang']) ? trim($_POST['lang']) : 'ru';
    }
}

// Validate email
if (empty($email)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Email is required'
    ]);
    exit;
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid email format'
    ]);
    exit;
}

// Validate that email is Gmail (ends with @gmail.com)
$normalizedEmail = strtolower(trim($email));
if (!preg_match('/@gmail\.com$/', $normalizedEmail)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Only Gmail accounts are accepted'
    ]);
    exit;
}

logMessage("Processing request", "Email: $normalizedEmail, Lang: $lang");

try {
    // Generate approval token
    $approvalToken = bin2hex(random_bytes(32));
    $approvalLink = $approvalUrl . '?token=' . urlencode($approvalToken) . '&email=' . urlencode($normalizedEmail) . '&lang=' . urlencode($lang);
    
    // Save pending approval to file (token, email, timestamp, lang)
    $pendingFile = __DIR__ . '/pending-approvals.txt';
    $pendingEntry = "$approvalToken|$normalizedEmail|" . date('Y-m-d H:i:s') . "|$lang\n";
    @file_put_contents($pendingFile, $pendingEntry, FILE_APPEND | LOCK_EX);
    logMessage("Saved pending approval", "Token: $approvalToken, Lang: $lang");
    
    // Prepare email to support (always in Russian for admin)
    $subject = "Новый запрос на доступ к приложению: $normalizedEmail";
    
    // HTML email body with approval button
    $emailBody = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; 
                  text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .button:hover { background-color: #45a049; }
        .info { background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class='container'>
        <h2>Новый запрос на доступ к приложению</h2>
        <div class='info'>
            <p><strong>Email:</strong> $normalizedEmail</p>
            <p><strong>Дата:</strong> " . date('Y-m-d H:i:s') . "</p>
            <p><strong>Язык:</strong> $lang</p>
        </div>
        <p>После того, как вы добавите этот email в Google Play Console, нажмите кнопку ниже:</p>
        <p style='text-align: center;'>
            <a href='$approvalLink' class='button'>Одобрено</a>
        </p>
        <p style='color: #666; font-size: 12px; margin-top: 30px;'>
            Ссылка действительна в течение 7 дней.
        </p>
    </div>
</body>
</html>
    ";
    
    // Send email to support
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: Hockey Stars App <noreply@hockey-stars.com>\r\n";
    $headers .= "Reply-To: noreply@hockey-stars.com\r\n";
    
    $mailSent = @mail($supportEmail, $subject, $emailBody, $headers);
    
    if (!$mailSent) {
        logMessage("Failed to send email to support", error_get_last()['message'] ?? 'Unknown error');
        throw new Exception('Failed to send email');
    }
    
    logMessage("Email sent to support", "Support: $supportEmail");
    
    // Save to log
    $logFile = __DIR__ . '/tester-emails.log';
    $logEntry = date('Y-m-d H:i:s') . " | " . $normalizedEmail . " | " . $lang . " | Pending approval\n";
    @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    
    // Return success response (in user's language)
    $successMessages = [
        'ru' => 'Ожидайте ссылку на приложение на указанном email',
        'en' => 'Wait for the app link at the specified email'
    ];
    $successMessage = isset($successMessages[$lang]) ? $successMessages[$lang] : $successMessages['ru'];
    
    echo json_encode([
        'success' => true,
        'message' => $successMessage,
        'user_email' => $normalizedEmail
    ]);
    
} catch (Exception $e) {
    logMessage("Exception", $e->getMessage() . " | File: " . $e->getFile() . " | Line: " . $e->getLine());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error. Please try again later.'
    ]);
}
