<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Helper to sanitize input
function sanitize($value, $maxLength = 1024)
{
    $value = trim($value ?? '');
    $value = strip_tags($value);
    if ($maxLength > 0) {
        $value = mb_substr($value, 0, $maxLength);
    }
    return $value;
}

$name = sanitize($_POST['name'] ?? '', 255);
$email = sanitize($_POST['email'] ?? '', 255);
$message = sanitize($_POST['message'] ?? '', 5000);
$lang = sanitize($_POST['lang'] ?? 'ru', 8);

if ($name === '' || $email === '' || $message === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Name, email and message are required.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format.']);
    exit;
}

$subject = $lang === 'ru'
    ? "HockeyStars: новое обращение от {$name}"
    : "HockeyStars: new message from {$name}";

$body = "Имя / Name: {$name}\n"
    . "Email: {$email}\n"
    . "Язык / Language: {$lang}\n\n"
    . "Сообщение / Message:\n{$message}\n";

$headers = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-type: text/plain; charset=utf-8';
$headers[] = 'From: HockeyStars <noreply@hockey-stars.com>';
$headers[] = "Reply-To: {$name} <{$email}>";
$headers[] = 'X-Mailer: PHP/' . phpversion();

$sent = @mail('support@hockey-stars.com', $subject, $body, implode("\r\n", $headers));

if (!$sent) {
    http_response_code(500);
    echo json_encode(['error' => 'Unable to send message. Please try later.']);
    exit;
}

echo json_encode(['success' => true]);


