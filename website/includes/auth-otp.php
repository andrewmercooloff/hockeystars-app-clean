<?php
/**
 * Shared OTP helpers — mirrors mobile app (login.tsx + emailService + smsService).
 */

require_once dirname(__DIR__) . '/config.php';

function hs_json_out(array $payload, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function hs_detect_input_type(string $value): string
{
    $t = trim($value);
    if (strpos($t, '@') !== false || preg_match('/[a-zA-Z]/', $t)) {
        return 'email';
    }
    return 'phone';
}

/** Like app: phone keeps +, only spaces removed. */
function hs_clean_contact(string $raw, string $type): string
{
    $t = trim($raw);
    if ($type === 'email') {
        return strtolower($t);
    }
    return preg_replace('/\s+/', '', $t);
}

/** DB key for email_verification_codes (same as normalizeVerificationContact). */
function hs_verification_key(string $contact, string $type): string
{
    if ($type === 'email') {
        return strtolower(trim($contact));
    }
    $cleaned = preg_replace('/[^\d+]/', '', $contact);
    // Belarus: keep +375…
    if (str_starts_with($cleaned, '+375') || str_starts_with($cleaned, '375')) {
        return str_starts_with($cleaned, '+') ? $cleaned : ('+' . $cleaned);
    }
    if (str_starts_with($cleaned, '+7')) {
        $national = substr($cleaned, 2);
        if (strlen($national) === 10) {
            return '7' . $national;
        }
    }
    if (str_starts_with($cleaned, '7') && strlen($cleaned) === 11) {
        return $cleaned;
    }
    if (str_starts_with($cleaned, '8') && strlen($cleaned) === 11) {
        return '7' . substr($cleaned, 1);
    }
    return preg_replace('/\s+/', '', $contact);
}

function hs_mask_contact(string $contact): string
{
    $c = trim($contact);
    if (strpos($c, '@') !== false) {
        $parts = explode('@', $c, 2);
        $name = $parts[0];
        $dom = $parts[1] ?? '';
        $n = strlen($name) <= 2 ? '*' : (substr($name, 0, 1) . '***' . substr($name, -1));
        return $n . '@' . $dom;
    }
    $digits = preg_replace('/\D/', '', $c);
    if (strlen($digits) < 6) {
        return '***';
    }
    return '+' . substr($digits, 0, 2) . '***' . substr($digits, -2);
}

function hs_otp_log(string $event, array $ctx = []): void
{
    $line = date('c') . ' ' . $event . ' ' . json_encode($ctx, JSON_UNESCAPED_UNICODE) . "\n";
    @file_put_contents('/var/log/hockeystars-otp.log', $line, FILE_APPEND);
}

/** Notificore msisdn: 7XXXXXXXXXX */
function hs_ru_msisdn(string $phone): ?string
{
    $digits = preg_replace('/\D/', '', $phone);
    if (str_starts_with($digits, '7') && strlen($digits) === 11) {
        return $digits;
    }
    if (str_starts_with($digits, '8') && strlen($digits) === 11) {
        return '7' . substr($digits, 1);
    }
    if (strlen($digits) === 10) {
        return '7' . $digits;
    }
    return null;
}

/** Phone variants stored in players.phone */
function hs_phone_lookup_variants(string $phone): array
{
    $cleaned = preg_replace('/\s+/', '', $phone);
    $digits = preg_replace('/\D/', '', $cleaned);
    $variants = [$cleaned];

    if ($digits !== '') {
        $variants[] = '+' . $digits;
        $variants[] = $digits;
        if (str_starts_with($digits, '8') && strlen($digits) === 11) {
            $variants[] = '+7' . substr($digits, 1);
            $variants[] = '7' . substr($digits, 1);
        }
        if (str_starts_with($digits, '7') && strlen($digits) === 11) {
            $variants[] = '+' . $digits;
        }
    }

    return array_values(array_unique(array_filter($variants)));
}

function hs_supabase_headers(): array
{
    return [
        'apikey: ' . HS_SUPABASE_ANON_KEY,
        'Authorization: Bearer ' . HS_SUPABASE_ANON_KEY,
        'Content-Type: application/json',
        'Prefer: return=representation',
    ];
}

function hs_supabase_request(string $method, string $path, ?array $body = null): array
{
    $url = rtrim(HS_SUPABASE_URL, '/') . $path;
    $ch = curl_init($url);
    $headers = hs_supabase_headers();
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode((string) $raw, true);
    return ['http' => $http, 'data' => $data, 'raw' => $raw];
}

function hs_find_player(string $contact, string $type): ?array
{
    if ($type === 'email') {
        $email = rawurlencode(strtolower(trim($contact)));
        $res = hs_supabase_request('GET', "/rest/v1/players?email=eq.{$email}&select=*&limit=1");
        $rows = is_array($res['data']) ? $res['data'] : [];
        return $rows[0] ?? null;
    }

    foreach (hs_phone_lookup_variants($contact) as $variant) {
        $q = rawurlencode($variant);
        $res = hs_supabase_request(
            'GET',
            "/rest/v1/players?phone=eq.{$q}&select=*&order=created_at.desc&limit=1"
        );
        $rows = is_array($res['data']) ? $res['data'] : [];
        if (!empty($rows[0])) {
            return $rows[0];
        }
    }
    return null;
}

function hs_save_verification_code(string $key, string $code): bool
{
    hs_supabase_request(
        'DELETE',
        '/rest/v1/email_verification_codes?email=eq.' . rawurlencode($key)
    );
    $expires = gmdate('c', time() + 600);
    $res = hs_supabase_request('POST', '/rest/v1/email_verification_codes', [
        'email' => $key,
        'code' => $code,
        'expires_at' => $expires,
    ]);
    return $res['http'] >= 200 && $res['http'] < 300;
}

function hs_get_active_code(string $key): ?array
{
    $now = rawurlencode(gmdate('c'));
    $res = hs_supabase_request(
        'GET',
        '/rest/v1/email_verification_codes?email=eq.' . rawurlencode($key)
            . "&expires_at=gt.{$now}&order=created_at.desc&limit=1"
    );
    $rows = is_array($res['data']) ? $res['data'] : [];
    return $rows[0] ?? null;
}

function hs_delete_code_row(int $id): void
{
    hs_supabase_request('DELETE', '/rest/v1/email_verification_codes?id=eq.' . $id);
}

function hs_notificore_jwt(): ?string
{
    $apiKey = defined('HS_NOTIFICORE_API_KEY') ? HS_NOTIFICORE_API_KEY : '';
    if ($apiKey === '') {
        return null;
    }
    $ch = curl_init('https://one-api.notificore.ru/api/auth/login');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['api_key' => $apiKey]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    curl_close($ch);
    $data = json_decode((string) $raw, true);
    $token = $data['bearer'] ?? $data['token'] ?? $data['access_token'] ?? $data['data']['token'] ?? null;
    return is_string($token) && strlen($token) > 20 ? $token : null;
}

/** Send RU OTP via Notificore 2FA (same as app). Returns auth id or null. */
function hs_send_notificore_2fa(string $phone): ?string
{
    $msisdn = hs_ru_msisdn($phone);
    $apiKey = defined('HS_NOTIFICORE_API_KEY') ? HS_NOTIFICORE_API_KEY : '';
    $templateId = defined('HS_NOTIFICORE_2FA_TEMPLATE_ID') ? (int) HS_NOTIFICORE_2FA_TEMPLATE_ID : 211;
    $sender = defined('HS_NOTIFICORE_ORIGINATOR') ? HS_NOTIFICORE_ORIGINATOR : 'HockeyStars';

    if (!$msisdn || $apiKey === '') {
        return null;
    }

    $jwt = hs_notificore_jwt();
    if (!$jwt) {
        return null;
    }

    $payload = [
        'recipient' => $msisdn,
        'channel' => 'sms',
        'sender' => $sender,
        'template_id' => $templateId,
        'code_digits' => 6,
        'code_lifetime' => 300,
        'code_max_tries' => 5,
    ];

    $ch = curl_init('https://one-api.notificore.ru/api/2fa/authentications/otp');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Bearer ' . $jwt,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode((string) $raw, true);
    $authId = $data['data']['id'] ?? null;
    $status = $data['data']['status'] ?? null;
    if ($http >= 200 && $http < 300 && $authId && $status === 'pending') {
        return (string) $authId;
    }
    return null;
}

/** Fallback plain SMS create API. */
function hs_send_notificore_sms(string $phone, string $code): bool
{
    $msisdn = hs_ru_msisdn($phone);
    $apiKey = defined('HS_NOTIFICORE_API_KEY') ? HS_NOTIFICORE_API_KEY : '';
    $originator = defined('HS_NOTIFICORE_ORIGINATOR') ? HS_NOTIFICORE_ORIGINATOR : 'HockeyStars';
    $serviceName = defined('HS_NOTIFICORE_SERVICE_NAME') ? HS_NOTIFICORE_SERVICE_NAME : 'ХоккейСтарс';

    if (!$msisdn || $apiKey === '') {
        return false;
    }

    $payload = [
        'destination' => 'phone',
        'originator' => $originator,
        'body' => "Код {$serviceName}: {$code}",
        'msisdn' => $msisdn,
        'reference' => 'hs_web_' . time(),
        'validity' => '1',
        'tariff' => '0',
    ];

    $ch = curl_init('https://api.notificore.ru/v1.0/sms/create');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode((string) $raw, true);
    $err = $data['result']['error'] ?? $data['error'] ?? null;
    return $http >= 200 && $http < 300 && ((string) $err === '0' || $err === 0);
}

function hs_verify_notificore_2fa(string $authId, string $code): bool
{
    $jwt = hs_notificore_jwt();
    if (!$jwt || strlen($authId) < 16) {
        return false;
    }
    $digits = preg_replace('/\D/', '', $code);
    $ch = curl_init('https://one-api.notificore.ru/api/2fa/authentications/otp/' . rawurlencode($authId) . '/verify');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Bearer ' . $jwt,
        ],
        CURLOPT_POSTFIELDS => json_encode(['access_code' => $digits]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode((string) $raw, true);
    return $http >= 200 && $http < 300 && (($data['data']['status'] ?? '') === 'verified');
}

/** Country like mobile getCountryFromPhone. */
function hs_country_from_phone(string $phone): string
{
    $cleaned = preg_replace('/[^\d+]/', '', $phone);
    if (str_starts_with($cleaned, '+375') || str_starts_with($cleaned, '375')) {
        return 'BY';
    }
    if (
        str_starts_with($cleaned, '+7')
        || (str_starts_with($cleaned, '7') && strlen($cleaned) === 11)
        || (str_starts_with($cleaned, '8') && strlen($cleaned) === 11)
    ) {
        $national = hs_ru_msisdn($phone);
        if ($national && hs_is_kz_mobile(substr($national, 1))) {
            return 'KZ';
        }
        return 'RU';
    }
    if (str_starts_with($cleaned, '+1') || (str_starts_with($cleaned, '1') && strlen(preg_replace('/\D/', '', $cleaned)) === 11)) {
        return 'US';
    }
    return 'OTHER';
}

/** KZ/RU share +7; RU mobile 9xx, KZ 6xx/7xx (same as app). */
function hs_is_kz_mobile(string $national10): bool
{
    if (strlen($national10) !== 10) {
        return false;
    }
    if (str_starts_with($national10, '9')) {
        return false;
    }
    return str_starts_with($national10, '6') || str_starts_with($national10, '7');
}

function hs_e164_phone(string $phone): ?string
{
    $cleaned = preg_replace('/[^\d+]/', '', $phone);
    if (preg_match('/^\+[1-9]\d{6,14}$/', $cleaned)) {
        return $cleaned;
    }
    // Local RU/BY shortcuts → E.164
    if (preg_match('/^8\d{10}$/', $cleaned)) {
        return '+7' . substr($cleaned, 1);
    }
    if (preg_match('/^7\d{10}$/', $cleaned)) {
        return '+' . $cleaned;
    }
    if (preg_match('/^375\d{9}$/', $cleaned)) {
        return '+' . $cleaned;
    }
    return null;
}

function hs_send_twilio_sms(string $phone, string $code): bool
{
    $sid = defined('HS_TWILIO_ACCOUNT_SID') ? HS_TWILIO_ACCOUNT_SID : '';
    $token = defined('HS_TWILIO_AUTH_TOKEN') ? HS_TWILIO_AUTH_TOKEN : '';
    $from = defined('HS_TWILIO_FROM') ? HS_TWILIO_FROM : '';
    if ($sid === '' || $token === '' || $from === '') {
        return false;
    }
    $to = hs_e164_phone($phone);
    if (!$to) {
        return false;
    }
    $url = 'https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode($sid) . '/Messages.json';
    $body = http_build_query([
        'From' => $from,
        'To' => $to,
        'Body' => $code,
        'RiskCheck' => 'disable',
    ]);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_USERPWD => $sid . ':' . $token,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode((string) $raw, true);
    if ($http < 200 || $http >= 300) {
        return false;
    }
    if (!empty($data['error_code'])) {
        return false;
    }
    $status = $data['status'] ?? '';
    return !in_array($status, ['failed', 'undelivered'], true);
}

function hs_send_rocketsms(string $phone, string $code): bool
{
    $login = defined('HS_ROCKETSMS_LOGIN') ? HS_ROCKETSMS_LOGIN : '';
    $password = defined('HS_ROCKETSMS_PASSWORD') ? HS_ROCKETSMS_PASSWORD : '';
    $sender = defined('HS_ROCKETSMS_SENDER') ? HS_ROCKETSMS_SENDER : 'HockstarsBy';
    if ($login === '' || $password === '') {
        return false;
    }
    // RocketSMS: международный формат без «+»
    $cleaned = preg_replace('/[^\d+]/', '', $phone) ?? '';
    if (str_starts_with($cleaned, '+375')) {
        $full = '375' . substr($cleaned, 4);
    } elseif (str_starts_with($cleaned, '375') && strlen($cleaned) === 12) {
        $full = $cleaned;
    } elseif (str_starts_with($cleaned, '+')) {
        $full = substr($cleaned, 1);
    } elseif (preg_match('/^\d{10,15}$/', $cleaned)) {
        $full = $cleaned;
    } else {
        $msisdn = hs_ru_msisdn($phone);
        if (!$msisdn) {
            return false;
        }
        $full = $msisdn;
    }
    if (!preg_match('/^\d{10,15}$/', $full)) {
        return false;
    }
    $template = defined('HS_ROCKETSMS_TEMPLATE') ? HS_ROCKETSMS_TEMPLATE : 'Hockeystars code: {code}';
    $text = str_replace('{code}', $code, $template);
    $hash = md5($password);
    $url = 'https://api.rocketsms.by/simple/send?' . http_build_query([
        'username' => $login,
        'password' => $hash,
        'phone' => $full,
        'text' => $text,
        'sender' => $sender,
        'priority' => 'true',
    ]);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => ['Accept: application/json,text/plain,*/*'],
    ]);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($http < 200 || $http >= 300) {
        return false;
    }
    $data = json_decode((string) $raw, true);
    if (!is_array($data)) {
        return false;
    }
    if (!empty($data['error'])) {
        return false;
    }
    // Same success heuristics as mobile RocketSMS client
    $status = $data['status'] ?? null;
    $ok = $status === 'ok'
        || $status === 'OK'
        || $status === 'success'
        || $status === 'SENT'
        || ($data['success'] ?? null) === true
        || ($data['result'] ?? null) === 'success'
        || (!empty($data['id']) && (int) $data['id'] > 0)
        || (!empty($data['message_id']) && (int) $data['message_id'] > 0);
    return (bool) $ok;
}

/**
 * Dispatch SMS like mobile sendSMSViaProvider.
 * Returns ['ok'=>bool,'channel'=>string,'authId'=>?string,'message'=>?string]
 */
function hs_send_sms_for_phone(string $phone, string $plainCode): array
{
    $country = hs_country_from_phone($phone);

    if ($country === 'US' || $country === 'CA') {
        return [
            'ok' => false,
            'channel' => 'none',
            'authId' => null,
            'message' => 'Для США/Канады войдите по email',
        ];
    }

    if ($country === 'BY') {
        $ok = hs_send_rocketsms($phone, $plainCode);
        return [
            'ok' => $ok,
            'channel' => 'rocketsms',
            'authId' => null,
            'message' => $ok ? null : 'Не удалось отправить SMS (Беларусь)',
            'detail' => $ok ? 'sent' : 'rocketsms_failed',
        ];
    }

    if ($country === 'RU') {
        $authId = hs_send_notificore_2fa($phone);
        if ($authId) {
            return [
                'ok' => true,
                'channel' => 'sms_2fa',
                'authId' => $authId,
                'message' => null,
                'detail' => '2fa_pending',
            ];
        }
        $ok = hs_send_notificore_sms($phone, $plainCode);
        return [
            'ok' => $ok,
            'channel' => 'sms',
            'authId' => null,
            'message' => $ok ? null : 'Не удалось отправить SMS',
            'detail' => $ok ? 'sms_api' : 'notificore_failed',
        ];
    }

    // KZ + all other countries → RocketSMS (Twilio disabled)
    $ok = hs_send_rocketsms($phone, $plainCode);
    return [
        'ok' => $ok,
        'channel' => 'rocketsms',
        'authId' => null,
        'message' => $ok ? null : 'Не удалось отправить SMS',
        'detail' => $ok ? 'rocketsms_sent' : 'rocketsms_failed',
    ];
}

function hs_send_email_code(string $email, string $code): bool
{
    $url = rtrim(HS_SUPABASE_URL, '/') . '/functions/v1/send-email';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => hs_supabase_headers(),
        CURLOPT_POSTFIELDS => json_encode([
            'email' => $email,
            'code' => $code,
            'subject' => 'HockeyStars Verification Code',
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode((string) $raw, true);
    return $http >= 200 && $http < 300 && !empty($data['success']);
}

function hs_gen_code(): string
{
    return (string) random_int(100000, 999999);
}
