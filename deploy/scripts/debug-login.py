import os
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("5.42.123.84", username="root", password=os.environ["VPS_PASS"])

cmds = [
    'curl -sS -o /dev/null -w "%{http_code} %{content_type}\\n" https://hockey-stars.com/assets/site-auth.js',
    'curl -sS https://hockey-stars.com/assets/site-auth.js | head -3',
    'ls -la /var/www/hockeystars-site/assets/',
    'curl -sS -o /dev/null -w "%{http_code}\\n" https://hockey-stars.com/api/send-otp.php',
    'curl -sS -X POST https://hockey-stars.com/api/send-otp.php -H "Content-Type: application/json" -d \'{"phone":"79001234567","code":"123456"}\' | head -c 300',
    'tail -20 /var/log/nginx/error.log | grep -i php || true',
]
for cmd in cmds:
    _, o, e = c.exec_command(cmd)
    print("===", cmd[:70])
    print(o.read().decode("utf-8", "replace")[:1200])
    err = e.read().decode("utf-8", "replace")[:400]
    if err:
        print("ERR", err)
c.close()
