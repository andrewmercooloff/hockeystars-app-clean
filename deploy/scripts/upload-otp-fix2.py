import os
import paramiko

files = [
    ("website/includes/auth-otp.php", "/var/www/hockeystars-site/includes/auth-otp.php"),
    ("website/api/send-otp.php", "/var/www/hockeystars-site/api/send-otp.php"),
    ("website/api/verify-otp.php", "/var/www/hockeystars-site/api/verify-otp.php"),
    ("website/assets/site-auth.js", "/var/www/hockeystars-site/assets/site-auth.js"),
    ("website/login.php", "/var/www/hockeystars-site/login.php"),
    ("website/config.php", "/var/www/hockeystars-site/config.php"),
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("5.42.123.84", username="root", password=os.environ["VPS_PASS"], timeout=60)
sftp = c.open_sftp()
for local, remote in files:
    sftp.put(local, remote)
    print("uploaded", local)
sftp.close()

_, o, _ = c.exec_command(
    "touch /var/log/hockeystars-otp.log; chown www-data:www-data /var/log/hockeystars-otp.log; "
    "php -l /var/www/hockeystars-site/includes/auth-otp.php; "
    "php -l /var/www/hockeystars-site/api/send-otp.php"
)
print(o.read().decode("utf-8", "replace"))
c.close()
print("OK")
