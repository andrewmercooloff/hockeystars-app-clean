import os
import json
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("5.42.123.84", username="root", password=os.environ["VPS_PASS"])

php = r'''
<?php
require '/var/www/hockeystars-site/includes/auth-otp.php';
$jwt = hs_notificore_jwt();
$authId = '83cf0806-577f-4227-97b2-a0f854d04af9';
$ch = curl_init('https://one-api.notificore.ru/api/2fa/authentications/' . $authId);
curl_setopt_array($ch, [
  CURLOPT_HTTPHEADER => ['Accept: application/json', 'Authorization: Bearer ' . $jwt],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 20,
]);
$raw = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "auth_http=$http\n$raw\n";

// Also try /otp/{id}
$ch = curl_init('https://one-api.notificore.ru/api/2fa/authentications/otp/' . $authId);
curl_setopt_array($ch, [
  CURLOPT_HTTPHEADER => ['Accept: application/json', 'Authorization: Bearer ' . $jwt],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 20,
]);
$raw = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "otp_get_http=$http\n$raw\n";

// RocketSMS dry probe with fake BY number
$login = HS_ROCKETSMS_LOGIN;
$pass = md5(HS_ROCKETSMS_PASSWORD);
$url = 'https://api.rocketsms.by/simple/send?' . http_build_query([
  'username' => $login,
  'password' => $pass,
  'phone' => '375296549728',
  'text' => 'Hockeystars code: 111111',
  'sender' => HS_ROCKETSMS_SENDER,
  'priority' => 'true',
]);
$ch = curl_init($url);
curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>20]);
$raw = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "rocketsms_http=$http\n$raw\n";
'''

sftp = c.open_sftp()
with sftp.file("/tmp/probe-delivery.php", "w") as f:
    f.write(php)
sftp.close()

_, o, e = c.exec_command("php /tmp/probe-delivery.php")
print(o.read().decode("utf-8", "replace"))
print(e.read().decode("utf-8", "replace")[:500])
c.close()
