<?php
/**
 * Debug OTP send path (run on VPS). Usage:
 * php /tmp/debug-otp.php '+79001234567'
 */
require '/var/www/hockeystars-site/includes/auth-otp.php';

$phone = $argv[1] ?? '';
if ($phone === '') {
    fwrite(STDERR, "Usage: php debug-otp.php '+79...'\n");
    exit(1);
}

$contact = hs_e164_phone($phone) ?: $phone;
$country = hs_country_from_phone($contact);
echo "contact={$contact} country={$country}\n";

$player = hs_find_player($contact, 'phone');
echo $player ? ("player=" . ($player['name'] ?? '?') . " id=" . ($player['id'] ?? '') . " phone=" . ($player['phone'] ?? '') . "\n") : "player=NOT_FOUND\n";

$jwt = hs_notificore_jwt();
echo $jwt ? ("jwt=OK len=" . strlen($jwt) . "\n") : "jwt=FAIL\n";

if ($country === 'RU') {
    $authId = hs_send_notificore_2fa($contact);
    echo $authId ? ("2fa=OK authId={$authId}\n") : "2fa=FAIL\n";
    if (!$authId) {
        $code = '123456';
        $sms = hs_send_notificore_sms($contact, $code);
        echo $sms ? "sms_api=OK\n" : "sms_api=FAIL\n";
    }
} else {
    $sent = hs_send_sms_for_phone($contact, '123456');
    echo 'dispatch=' . json_encode($sent, JSON_UNESCAPED_UNICODE) . "\n";
}
