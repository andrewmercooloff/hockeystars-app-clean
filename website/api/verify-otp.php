<?php
/**
 * Verify OTP and return player — same rules as mobile app.
 */
require_once __DIR__ . '/../includes/auth-otp.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    hs_json_out(['success' => false, 'error' => 'method'], 405);
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$raw = (string) ($body['contact'] ?? $body['phone'] ?? $body['email'] ?? '');
$code = trim((string) ($body['code'] ?? ''));
$playerIdHint = preg_replace('/[^a-zA-Z0-9\-]/', '', (string) ($body['playerId'] ?? ''));

if ($raw === '' || $code === '') {
    hs_json_out(['success' => false, 'error' => 'empty', 'message' => 'Введите код'], 400);
}

$type = hs_detect_input_type($raw);
$contact = hs_clean_contact($raw, $type);

if ($type === 'phone') {
    $e164 = hs_e164_phone($contact);
    if ($e164) {
        $contact = $e164;
    }
}

$key = hs_verification_key($contact, $type);

$resolvePlayer = static function () use ($contact, $type, $playerIdHint): ?array {
    if ($playerIdHint !== '') {
        $res = hs_supabase_request(
            'GET',
            '/rest/v1/players?id=eq.' . rawurlencode($playerIdHint) . '&select=*&limit=1'
        );
        $rows = is_array($res['data']) ? $res['data'] : [];
        if (!empty($rows[0])) {
            return $rows[0];
        }
    }
    return hs_find_player($contact, $type);
};

// Admin / App Store review secret (same as app)
if ($code === '291019') {
    $player = $resolvePlayer();
    if (!$player) {
        hs_json_out([
            'success' => false,
            'error' => 'user_not_found',
            'message' => 'Пользователь не найден. Зарегистрируйтесь в приложении.',
        ], 404);
    }
    hs_json_out(['success' => true, 'player' => $player]);
}

$row = hs_get_active_code($key);
if (!$row) {
    // Retry alternate BY keys (with/without +)
    if ($type === 'phone' && str_starts_with($contact, '+375')) {
        $row = hs_get_active_code(substr($contact, 1));
    } elseif ($type === 'phone' && str_starts_with($contact, '375')) {
        $row = hs_get_active_code('+' . $contact);
    }
}

if (!$row) {
    hs_json_out([
        'success' => false,
        'error' => 'expired',
        'message' => 'Код не найден или истёк. Запросите новый.',
    ], 400);
}

$saved = (string) ($row['code'] ?? '');
$ok = false;

if (str_starts_with($saved, '2FA:')) {
    $ok = hs_verify_notificore_2fa(substr($saved, 4), $code);
} else {
    $ok = ($saved === $code) || (strlen($saved) >= 4 && substr($saved, -4) === $code);
}

if (!$ok) {
    hs_json_out([
        'success' => false,
        'error' => 'invalid',
        'message' => 'Неверный код',
    ], 400);
}

if (!empty($row['id'])) {
    hs_delete_code_row((int) $row['id']);
}

$player = $resolvePlayer();
if (!$player) {
    hs_otp_log('verify_player_missing', [
        'contact' => hs_mask_contact($contact),
        'playerIdHint' => $playerIdHint,
    ]);
    hs_json_out([
        'success' => false,
        'error' => 'user_not_found',
        'message' => 'Пользователь не найден. Зарегистрируйтесь в приложении.',
    ], 404);
}

hs_json_out(['success' => true, 'player' => $player]);
