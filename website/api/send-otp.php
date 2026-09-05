<?php
/**
 * Send OTP — same flow as mobile app (any country phone or email).
 */
require_once __DIR__ . '/../includes/auth-otp.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    hs_json_out(['success' => false, 'error' => 'method'], 405);
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$raw = (string) ($body['contact'] ?? $body['phone'] ?? $body['email'] ?? '');
if (trim($raw) === '') {
    hs_json_out(['success' => false, 'error' => 'empty', 'message' => 'Введите телефон или email'], 400);
}

$type = hs_detect_input_type($raw);
$contact = hs_clean_contact($raw, $type);

if ($type === 'phone') {
    $e164 = hs_e164_phone($contact);
    if (!$e164) {
        hs_json_out([
            'success' => false,
            'error' => 'phone_format',
            'message' => 'Введите номер с кодом страны, например +48123456789',
        ], 400);
    }
    $contact = $e164;
}

$player = hs_find_player($contact, $type);
if (!$player) {
    hs_json_out([
        'success' => false,
        'error' => 'user_not_found',
        'message' => 'Пользователь не найден. Зарегистрируйтесь в приложении.',
    ], 404);
}

$key = hs_verification_key($contact, $type);
$playerId = (string) ($player['id'] ?? '');

hs_otp_log('send_start', [
    'type' => $type,
    'contact' => hs_mask_contact($contact),
    'playerId' => $playerId,
    'country' => $type === 'phone' ? hs_country_from_phone($contact) : 'email',
]);

if ($type === 'email') {
    $code = hs_gen_code();
    if (!hs_save_verification_code($key, $code)) {
        hs_json_out(['success' => false, 'error' => 'save', 'message' => 'Не удалось сохранить код'], 500);
    }
    if (!hs_send_email_code($contact, $code)) {
        hs_json_out(['success' => false, 'error' => 'email', 'message' => 'Не удалось отправить email'], 502);
    }
    hs_json_out([
        'success' => true,
        'channel' => 'email',
        'contact' => $contact,
        'playerId' => $playerId,
        'message' => 'Код отправлен на email',
    ]);
}

$code = hs_gen_code();
$sent = hs_send_sms_for_phone($contact, $code);

hs_otp_log('send_sms', [
    'contact' => hs_mask_contact($contact),
    'ok' => $sent['ok'],
    'channel' => $sent['channel'],
    'detail' => $sent['detail'] ?? null,
]);

if (!$sent['ok']) {
    hs_json_out([
        'success' => false,
        'error' => 'sms',
        'message' => $sent['message'] ?? 'Не удалось отправить SMS. Попробуйте email.',
    ], 502);
}

$storeCode = !empty($sent['authId']) ? ('2FA:' . $sent['authId']) : $code;
if (!hs_save_verification_code($key, $storeCode)) {
    hs_json_out(['success' => false, 'error' => 'save', 'message' => 'Не удалось сохранить код'], 500);
}

hs_json_out([
    'success' => true,
    'channel' => $sent['channel'],
    'contact' => $contact,
    'playerId' => $playerId,
    'message' => 'Код отправлен в SMS на ' . hs_mask_contact($contact),
]);
