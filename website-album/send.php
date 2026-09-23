<?php
/**
 * album.hockey-stars.com — заявки с лендинга.
 * 1) Всегда пишет в data/leads.ndjson (резервная копия на сервере)
 * 2) Отправляет письмо через SMTP Timeweb (smtp.timeweb.ru)
 *
 * config.local.php (не в git):
 *   define('HS_SMTP_USER', 'support@hockey-stars.com');
 *   define('HS_SMTP_PASS', 'пароль_ящика');
 *   define('HS_LEADS_TO', 'support@hockey-stars.com');
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['sent' => 0, 'error' => 'method']);
    exit;
}

$configLocal = __DIR__ . '/config.local.php';
if (is_readable($configLocal)) {
    require $configLocal;
}

const HS_LEADS_TO_DEFAULT = 'support@hockey-stars.com';
const HS_RATE_SECONDS = 45;

function sanitize_field(string $value, int $max): string
{
    $value = trim(strip_tags($value));
    if ($max > 0 && mb_strlen($value) > $max) {
        $value = mb_substr($value, 0, $max);
    }
    return $value;
}

function is_ajax(): bool
{
    return strcasecmp($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '', 'XMLHttpRequest') === 0;
}

function respond(int $sent, string $error = '', int $http = 200): void
{
    http_response_code($http);
    if (is_ajax()) {
        $payload = ['sent' => $sent];
        if ($error !== '') {
            $payload['error'] = $error;
        }
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }
    header('Location: index.html?sent=' . $sent . ($error !== '' ? '&err=' . rawurlencode($error) : ''));
    exit;
}

function client_ip(): string
{
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $key) {
        if (!empty($_SERVER[$key])) {
            return trim(explode(',', (string) $_SERVER[$key])[0]);
        }
    }
    return '';
}

function rate_limit_ok(): bool
{
    $ip = client_ip();
    if ($ip === '') {
        return true;
    }
    $file = sys_get_temp_dir() . '/hs_album_rate_' . md5($ip);
    $now = time();
    if (is_readable($file)) {
        $last = (int) @file_get_contents($file);
        if ($last > 0 && ($now - $last) < HS_RATE_SECONDS) {
            return false;
        }
    }
    @file_put_contents($file, (string) $now);
    return true;
}

function append_local_log(array $row): bool
{
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
    $line = json_encode($row, JSON_UNESCAPED_UNICODE) . "\n";
    return @file_put_contents($dir . '/leads.ndjson', $line, FILE_APPEND | LOCK_EX) !== false;
}

/** Minimal SMTP client for smtp.timeweb.ru (STARTTLS on 587). */
function send_via_timeweb_smtp(array $row, string $to, string $user, string $pass): bool
{
    $host = 'smtp.timeweb.ru';
    $port = 587;
    $from = $user;

    $subject = 'Album: ' . $row['club'] . ' — ' . $row['name'];
    $body = "Новая заявка с album.hockey-stars.com\r\n\r\n"
        . "Имя: {$row['name']}\r\n"
        . "Email: {$row['email']}\r\n"
        . "Телефон: {$row['phone']}\r\n"
        . "Клуб: {$row['club']}\r\n"
        . "Сообщение:\r\n{$row['message']}\r\n\r\n"
        . "IP: {$row['ip']}\r\n"
        . "Время: {$row['created_at']}\r\n";

    $socket = @stream_socket_client("tcp://{$host}:{$port}", $errno, $errstr, 15);
    if (!$socket) {
        error_log("album SMTP connect failed: $errstr ($errno)");
        return false;
    }

    stream_set_timeout($socket, 15);
    $read = static function () use ($socket): string {
        $data = '';
        while ($line = fgets($socket, 515)) {
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        return $data;
    };
    $write = static function (string $cmd) use ($socket, $read): string {
        fwrite($socket, $cmd . "\r\n");
        return $read();
    };

    $read();
    $write('EHLO album.hockey-stars.com');
    $write('STARTTLS');
    if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
        fclose($socket);
        return false;
    }
    $write('EHLO album.hockey-stars.com');
    $write('AUTH LOGIN');
    $write(base64_encode($user));
    $resp = $write(base64_encode($pass));
    if (strpos($resp, '235') === false) {
        error_log('album SMTP auth failed: ' . trim($resp));
        fclose($socket);
        return false;
    }

    $write('MAIL FROM:<' . $from . '>');
    $write('RCPT TO:<' . $to . '>');
    $write('DATA');

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers = "From: HockeyStars Album <{$from}>\r\n"
        . "Reply-To: {$row['name']} <{$row['email']}>\r\n"
        . "To: {$to}\r\n"
        . "Subject: {$encodedSubject}\r\n"
        . "MIME-Version: 1.0\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n";
    fwrite($socket, $headers . "\r\n" . $body . "\r\n.\r\n");
    $final = $read();
    $write('QUIT');
    fclose($socket);

    return strpos($final, '250') !== false;
}

function send_via_mail_fallback(array $row, string $to, string $from): bool
{
    $subject = 'Album: ' . $row['club'] . ' — ' . $row['name'];
    $body = "Новая заявка с album.hockey-stars.com\n\n"
        . "Имя: {$row['name']}\nEmail: {$row['email']}\nТелефон: {$row['phone']}\n"
        . "Клуб: {$row['club']}\n\n{$row['message']}\n";
    $headers = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-type: text/plain; charset=UTF-8',
        'From: HockeyStars Album <' . $from . '>',
        'Reply-To: ' . $row['name'] . ' <' . $row['email'] . '>',
    ]);
    return @mail($to, $subject, $body, $headers, '-f' . $from);
}

if (!empty($_POST['website'] ?? '')) {
    respond(0, 'bot', 400);
}

if (!rate_limit_ok()) {
    respond(1, 'rate');
}

$name = sanitize_field((string) ($_POST['name'] ?? ''), 255);
$email = sanitize_field((string) ($_POST['email'] ?? ''), 255);
$phone = sanitize_field((string) ($_POST['phone'] ?? ''), 64);
$club = sanitize_field((string) ($_POST['club'] ?? ''), 255);
$message = sanitize_field((string) ($_POST['message'] ?? ''), 5000);

if ($name === '' || $email === '' || $phone === '' || $club === '') {
    respond(0, 'fill', 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(0, 'email', 400);
}

$row = [
    'created_at' => gmdate('c'),
    'name' => $name,
    'email' => $email,
    'phone' => $phone,
    'club' => $club,
    'message' => $message,
    'ip' => client_ip(),
    'user_agent' => sanitize_field((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 512),
];

$to = defined('HS_LEADS_TO') ? HS_LEADS_TO : HS_LEADS_TO_DEFAULT;
$smtpUser = defined('HS_SMTP_USER') ? HS_SMTP_USER : (getenv('HS_SMTP_USER') ?: '');
$smtpPass = defined('HS_SMTP_PASS') ? HS_SMTP_PASS : (getenv('HS_SMTP_PASS') ?: '');

$logged = append_local_log($row);
$emailed = false;

if ($smtpUser !== '' && $smtpPass !== '') {
    $emailed = send_via_timeweb_smtp($row, $to, $smtpUser, $smtpPass);
} else {
    error_log('album send.php: HS_SMTP_USER/HS_SMTP_PASS not configured');
}

if (!$emailed && $smtpUser !== '') {
    $emailed = send_via_mail_fallback($row, $to, $smtpUser);
}

if (!$logged && !$emailed) {
    respond(0, 'mail', 500);
}

if (!$emailed) {
    error_log('album lead saved to file but email failed: ' . $email);
}

respond(1);
