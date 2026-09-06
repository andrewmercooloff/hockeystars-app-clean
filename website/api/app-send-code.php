<?php
/**
 * App OTP sender (login + register).
 * Secrets stay on the server — mobile clients can switch here via OTA
 * without a new store build.
 *
 * POST JSON: { "phone": "+7900..." } or { "contact": "..." }
 * Always uses a server-generated code + plain SMS for RU (Notificore),
 * so the existing app verifyCode() against Supabase keeps working.
 */
require_once __DIR__ . '/../includes/auth-otp.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    hs_json_out(['success' => false, 'error' => 'method'], 405);
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$raw = (string) ($body['phone'] ?? $body['contact'] ?? $body['email'] ?? '');
if (trim($raw) === '') {
    hs_json_out(['success' => false, 'error' => 'empty', 'message' => 'Укажите телефон'], 400);
}

$type = hs_detect_input_type($raw);
$contact = hs_clean_contact($raw, $type);

if ($type !== 'phone') {
    hs_json_out([
        'success' => false,
        'error' => 'phone_only',
        'message' => 'Этот endpoint только для SMS. Email — через send-email.',
    ], 400);
}

$e164 = hs_e164_phone($contact);
if (!$e164) {
    hs_json_out([
        'success' => false,
        'error' => 'phone_format',
        'message' => 'Введите номер с кодом страны',
    ], 400);
}
$contact = $e164;
$country = hs_country_from_phone($contact);

if ($country === 'US' || $country === 'CA') {
    hs_json_out([
        'success' => false,
        'error' => 'email_only',
        'message' => 'Для США/Канады войдите по email',
    ], 400);
}

// Simple flood guard: 1 send / 45s per phone
$rateFile = sys_get_temp_dir() . '/hs_app_otp_' . md5($contact) . '.ts';
$now = time();
$last = is_file($rateFile) ? (int) @file_get_contents($rateFile) : 0;
if ($last > 0 && ($now - $last) < 45) {
    hs_json_out([
        'success' => false,
        'error' => 'rate',
        'message' => 'Подождите немного перед повторной отправкой',
    ], 429);
}

$code = hs_gen_code();
$key = hs_verification_key($contact, 'phone');

/**
 * Prefer plain SMS with our code (not Notificore 2FA), so the installed app
 * can verify against email_verification_codes without an embedded API key.
 */
$sent = ['ok' => false, 'channel' => 'none', 'detail' => null, 'message' => null];

if ($country === 'RU') {
    $ok = hs_send_notificore_sms($contact, $code);
    $sent = [
        'ok' => $ok,
        'channel' => 'notificore_sms',
        'detail' => $ok ? 'plain_sms' : 'notificore_failed',
        'message' => $ok ? null : 'Не удалось отправить SMS',
    ];
} elseif ($country === 'BY') {
    $ok = hs_send_rocketsms($contact, $code);
    $sent = [
        'ok' => $ok,
        'channel' => 'rocketsms',
        'detail' => $ok ? 'sent' : 'rocketsms_failed',
        'message' => $ok ? null : 'Не удалось отправить SMS (Беларусь)',
    ];
} else {
    // Other countries: try RocketSMS, then Notificore if number is RU-like
    $ok = hs_send_rocketsms($contact, $code);
    if (!$ok) {
        $ok = hs_send_notificore_sms($contact, $code);
        $sent = [
            'ok' => $ok,
            'channel' => $ok ? 'notificore_sms' : 'none',
            'detail' => $ok ? 'plain_sms_fallback' : 'all_failed',
            'message' => $ok ? null : 'Не удалось отправить SMS',
        ];
    } else {
        $sent = [
            'ok' => true,
            'channel' => 'rocketsms',
            'detail' => 'sent',
            'message' => null,
        ];
    }
}

hs_otp_log('app_send', [
    'contact' => hs_mask_contact($contact),
    'country' => $country,
    'ok' => $sent['ok'],
    'channel' => $sent['channel'],
    'detail' => $sent['detail'] ?? null,
]);

if (!$sent['ok']) {
    hs_json_out([
        'success' => false,
        'error' => 'sms',
        'message' => $sent['message'] ?? 'Не удалось отправить SMS',
        'channel' => $sent['channel'],
    ], 502);
}

if (!hs_save_verification_code($key, $code)) {
    hs_json_out(['success' => false, 'error' => 'save', 'message' => 'Не удалось сохранить код'], 500);
}

@file_put_contents($rateFile, (string) $now);

hs_json_out([
    'success' => true,
    'channel' => $sent['channel'],
    'contact' => hs_mask_contact($contact),
    'message' => 'Код отправлен',
]);
