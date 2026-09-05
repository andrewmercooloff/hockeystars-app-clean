"""Upload international phone auth fix."""
import os
import paramiko

HOST = "5.42.123.84"
files = [
    ("website/includes/auth-otp.php", "/var/www/hockeystars-site/includes/auth-otp.php"),
    ("website/api/send-otp.php", "/var/www/hockeystars-site/api/send-otp.php"),
    ("website/api/verify-otp.php", "/var/www/hockeystars-site/api/verify-otp.php"),
    ("website/login.php", "/var/www/hockeystars-site/login.php"),
    ("website/assets/site-auth.js", "/var/www/hockeystars-site/assets/site-auth.js"),
]

CONFIG_LOCAL = """<?php
define('HS_NOTIFICORE_API_KEY', 'REDACTED_NOTIFICORE_KEY');
define('HS_NOTIFICORE_ORIGINATOR', 'HockeyStars');
define('HS_NOTIFICORE_SERVICE_NAME', 'ХоккейСтарс');
define('HS_NOTIFICORE_2FA_TEMPLATE_ID', 211);

define('HS_TWILIO_ACCOUNT_SID', 'REDACTED_TWILIO_ACCOUNT_SID');
define('HS_TWILIO_AUTH_TOKEN', 'REDACTED_HEX_SECRET');
define('HS_TWILIO_FROM', '+46731727922');

define('HS_ROCKETSMS_LOGIN', 'REDACTED_ROCKETSMS_LOGIN');
define('HS_ROCKETSMS_PASSWORD', 'REDACTED_ROCKETSMS_PASSWORD');
define('HS_ROCKETSMS_SENDER', 'HockstarsBy');
define('HS_ROCKETSMS_TEMPLATE', 'Hockeystars code: {code}');
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username="root", password=os.environ["VPS_PASS"], timeout=60)
sftp = c.open_sftp()
for local, remote in files:
    sftp.put(local, remote)
    print("uploaded", local)
with sftp.file("/var/www/hockeystars-site/config.local.php", "w") as f:
    f.write(CONFIG_LOCAL)
sftp.close()

_, o, e = c.exec_command(
    "php -l /var/www/hockeystars-site/includes/auth-otp.php; "
    "php -l /var/www/hockeystars-site/api/send-otp.php; "
    'curl -sS -X POST https://hockey-stars.com/api/send-otp.php -H "Content-Type: application/json" '
    '-d \'{"contact":"+48111222333"}\''
)
print(o.read().decode("utf-8", "replace"))
c.close()
print("OK")
