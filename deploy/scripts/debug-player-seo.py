import os
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("5.42.123.84", username="root", password=os.environ["VPS_PASS"], timeout=60)

cmds = [
    "curl -sI 'https://hockey-stars.com/player.php?id=00000000-0000-4000-8000-000000000001' | head -15",
    "curl -s -A 'Googlebot' 'https://hockey-stars.com/player/00000000-0000-4000-8000-000000000001' | head -c 400",
    "ls -la /var/www/hockeystars-site/player.php /var/www/hockeystars-site/includes/player-public.php",
    "tail -n +59 /etc/nginx/sites-available/hockey-stars.com | head -20",
    # error log
    "tail -n 30 /var/log/nginx/error.log",
]

for cmd in cmds:
    print("===", cmd[:100])
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode("utf-8", "replace")[:2000])
    err = e.read().decode("utf-8", "replace")
    if err.strip():
        print("ERR", err[:500])

c.close()
