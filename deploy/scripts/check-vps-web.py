import os
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("5.42.123.84", username="root", password=os.environ["VPS_PASS"], timeout=60)

cmds = [
    "find /var/www/hockeystars-web/_expo -type f | head -40",
    "sed -n '1,5p' /etc/nginx/sites-available/hockey-stars.com; grep -n 'root\\|location' /etc/nginx/sites-available/hockey-stars.com | head -40",
    "python3 -c \"import re,urllib.request; h=urllib.request.urlopen('https://hockey-stars.com/').read().decode('utf-8','replace'); print('\\n'.join(re.findall(r'(?:src|href)=\\\"([^\\\"]+)\\\"', h)[:30]))\"",
    "curl -sI https://hockey-stars.com/_expo/static/js/web/ 2>/dev/null | head -10 || true",
]

for cmd in cmds:
    print("===", cmd[:80])
    _, o, e = c.exec_command(cmd, timeout=60)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    print(out[:4000])
    if err.strip():
        print("ERR", err[:500])

c.close()
