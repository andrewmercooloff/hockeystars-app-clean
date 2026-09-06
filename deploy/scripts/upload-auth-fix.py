"""Upload auth fix to VPS and update config.local.php."""
import os
import paramiko

HOST = "5.42.123.84"
files = [
    ("website/includes/auth-otp.php", "/var/www/hockeystars-site/includes/auth-otp.php"),
    ("website/api/send-otp.php", "/var/www/hockeystars-site/api/send-otp.php"),
    ("website/api/verify-otp.php", "/var/www/hockeystars-site/api/verify-otp.php"),
    ("website/assets/site-auth.js", "/var/www/hockeystars-site/assets/site-auth.js"),
]

CONFIG_LOCAL = """<?php
define('HS_NOTIFICORE_API_KEY', getenv('NOTIFICORE_API_KEY') ?: '');
define('HS_NOTIFICORE_ORIGINATOR', 'HockeyStars');
define('HS_NOTIFICORE_SERVICE_NAME', 'ХоккейСтарс');
define('HS_NOTIFICORE_2FA_TEMPLATE_ID', 211);
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username="root", password=os.environ["VPS_PASS"], timeout=60)
sftp = c.open_sftp()
for local, remote in files:
    # ensure includes dir
    if "/includes/" in remote:
        try:
            sftp.mkdir("/var/www/hockeystars-site/includes")
        except OSError:
            pass
    sftp.put(local, remote)
    print("uploaded", local)

with sftp.file("/var/www/hockeystars-site/config.local.php", "w") as f:
    f.write(CONFIG_LOCAL)
print("updated config.local.php")
sftp.close()

# smoke: php lint + dry API without real SMS (user_not_found expected)
_, o, e = c.exec_command(
    "php -l /var/www/hockeystars-site/includes/auth-otp.php; "
    "php -l /var/www/hockeystars-site/api/send-otp.php; "
    "php -l /var/www/hockeystars-site/api/verify-otp.php; "
    'curl -sS -X POST https://hockey-stars.com/api/send-otp.php '
    '-H "Content-Type: application/json" '
    '-d \'{"contact":"+79999999999"}\''
)
print(o.read().decode("utf-8", "replace"))
print(e.read().decode("utf-8", "replace"))
c.close()
print("DONE")
