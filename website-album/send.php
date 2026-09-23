<?php
/**
 * album.hockey-stars.com — order / sample request handler.
 * Saves every submission to Supabase + local NDJSON log; emails via Resend or mail().
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

const HS_SUPABASE_URL = 'https://api.hockey-stars.com';
const HS_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';
const HS_LEADS_TO = 'support@hockey-stars.com';
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
    $xhr = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    return strcasecmp($xhr, 'XMLHttpRequest') === 0;
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
    $qs = 'sent=' . $sent . ($error !== '' ? '&err=' . rawurlencode($error) : '');
    header('Location: index.html?' . $qs);
    exit;
}

function client_ip(): string
{
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $key) {
        if (!empty($_SERVER[$key])) {
            $raw = explode(',', (string) $_SERVER[$key])[0];
            return trim($raw);
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

function save_to_supabase(array $row): bool
{
    $payload = json_encode([
        'name' => $row['name'],
        'email' => $row['email'],
        'phone' => $row['phone'],
        'club' => $row['club'],
        'message' => $row['message'],
        'source' => 'album.hockey-stars.com',
        'ip' => $row['ip'],
        'user_agent' => $row['user_agent'],
        'email_sent' => $row['email_sent'],
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init(HS_SUPABASE_URL . '/rest/v1/album_leads');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'apikey: ' . HS_SUPABASE_ANON_KEY,
            'Authorization: Bearer ' . HS_SUPABASE_ANON_KEY,
            'Prefer: return=minimal',
        ],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_TIMEOUT => 12,
    ]);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code >= 200 && $code < 300) {
        return true;
    }
    error_log('album_leads insert failed HTTP ' . $code . ' body=' . (string) $body);
    return false;
}

function send_via_resend(array $row, string $to): bool
{
    $apiKey = defined('HS_RESEND_API_KEY') ? HS_RESEND_API_KEY : (getenv('HS_RESEND_API_KEY') ?: '');
    if ($apiKey === '') {
        return false;
    }

    $subject = 'Album order: ' . $row['club'] . ' — ' . $row['name'];
    $text = "New album sample request\n\n"
        . "Name: {$row['name']}\n"
        . "Email: {$row['email']}\n"
        . "Phone: {$row['phone']}\n"
        . "Club: {$row['club']}\n"
        . "Message:\n{$row['message']}\n\n"
        . "IP: {$row['ip']}\n"
        . "Time: {$row['created_at']}\n"
        . "Source: album.hockey-stars.com\n";

    $payload = json_encode([
        'from' => 'HockeyStars Album <noreply@hockey-stars.com>',
        'to' => [$to],
        'reply_to' => $row['email'],
        'subject' => $subject,
        'text' => $text,
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_TIMEOUT => 15,
    ]);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code >= 200 && $code < 300) {
        return true;
    }
    error_log('album lead Resend failed HTTP ' . $code . ' body=' . (string) $body);
    return false;
}

function send_via_mail(array $row, string $to): bool
{
    $subject = 'Album order: ' . $row['club'] . ' — ' . $row['name'];
    $body = "New album sample request\n\n"
        . "Name: {$row['name']}\n"
        . "Email: {$row['email']}\n"
        . "Phone: {$row['phone']}\n"
        . "Club: {$row['club']}\n"
        . "Message:\n{$row['message']}\n\n"
        . "IP: {$row['ip']}\n"
        . "Time: {$row['created_at']}\n";

    $headers = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-type: text/plain; charset=utf-8',
        'From: HockeyStars Album <noreply@hockey-stars.com>',
        'Reply-To: ' . $row['name'] . ' <' . $row['email'] . '>',
    ]);

    return @mail($to, $subject, $body, $headers);
}

// Honeypot (bots fill hidden fields)
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
    'email_sent' => false,
];

$to = defined('HS_LEADS_TO_EMAIL') ? HS_LEADS_TO_EMAIL : HS_LEADS_TO;

$logged = append_local_log($row);
$saved = save_to_supabase($row);

if (send_via_resend($row, $to) || send_via_mail($row, $to)) {
    $row['email_sent'] = true;
}

if (!$saved && !$logged) {
    respond(0, 'mail', 500);
}

if (!$row['email_sent']) {
    error_log('album lead saved but email not sent: ' . $email);
}

respond(1);
