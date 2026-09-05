"""Probe OTP sending and recent PHP/nginx errors."""
import os
import json
import paramiko

HOST = "5.42.123.84"
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username="root", password=os.environ["VPS_PASS"], timeout=60)

sftp = c.open_sftp()
sftp.put("deploy/scripts/debug-otp.php", "/tmp/debug-otp.php")
sftp.put("website/includes/auth-otp.php", "/var/www/hockeystars-site/includes/auth-otp.php")
sftp.close()

# Get a real RU player phone from API (masked in output)
_, o, _ = c.exec_command(
    "curl -sS 'https://api.hockey-stars.com/rest/v1/players?select=id,name,phone,country&phone=not.is.null&order=updated_at.desc&limit=5' "
    "-H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM' "
    "-H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM'"
)
raw = o.read().decode("utf-8", "replace")
print("=== sample players ===")
try:
    rows = json.loads(raw)
    for r in rows:
        phone = r.get("phone") or ""
        masked = phone[:4] + "***" + phone[-2:] if len(phone) > 6 else phone
        print(r.get("name"), masked, r.get("country"), r.get("id")[:8])
except Exception as e:
    print(raw[:500], e)

# Verbose Notificore 2FA probe with curl logging
php_probe = r'''
<?php
require '/var/www/hockeystars-site/includes/auth-otp.php';
$apiKey = HS_NOTIFICORE_API_KEY;
$ch = curl_init('https://one-api.notificore.ru/api/auth/login');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => ['Content-Type: application/json','Accept: application/json'],
  CURLOPT_POSTFIELDS => json_encode(['api_key'=>$apiKey]),
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 20,
]);
$raw = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "login_http=$http\n";
$data = json_decode($raw, true);
$jwt = $data['bearer'] ?? null;
echo "bearer=" . ($jwt ? 'yes' : 'no') . "\n";
if (!$jwt) { echo $raw; exit; }

$payload = [
  'recipient' => '79000000000',
  'channel' => 'sms',
  'sender' => 'HockeyStars',
  'template_id' => 211,
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
    'Authorization: Bearer '.$jwt,
  ],
  CURLOPT_POSTFIELDS => json_encode($payload),
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 20,
]);
$raw2 = curl_exec($ch);
$http2 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "otp_http=$http2\n";
echo substr($raw2, 0, 800) . "\n";
'''

sftp = c.open_sftp()
with sftp.file("/tmp/probe-2fa.php", "w") as f:
    f.write(php_probe)
sftp.close()

_, o, e = c.exec_command("php /tmp/probe-2fa.php")
print("=== notificore 2fa probe ===")
print(o.read().decode("utf-8", "replace"))
print(e.read().decode("utf-8", "replace")[:400])

# nginx/php recent errors related to otp
_, o, _ = c.exec_command("grep -i 'send-otp\\|otp\\|notificore\\|FastCGI' /var/log/nginx/error.log | tail -15")
print("=== nginx errors ===")
print(o.read().decode("utf-8", "replace")[-1500:])

# Check access log for send-otp responses
_, o, _ = c.exec_command("grep send-otp /var/log/nginx/access.log | tail -10")
print("=== access send-otp ===")
print(o.read().decode("utf-8", "replace"))

c.close()
