import os
import sys
import re
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("5.42.123.84", username="root", password=os.environ["VPS_PASS"], timeout=60)

cmds = [
    "curl -sI https://hockey-stars.com/ | sed -n '1,12p'",
    "curl -s https://hockey-stars.com/ | tr '>' '\\n' | grep -E 'script src|root|EXPO' | head -5",
    "ls /var/www/hockeystars-web/_expo/static/js/web/index-*.js",
    "python3 - <<'PY'\nimport re,urllib.request\nh=urllib.request.urlopen('https://hockey-stars.com/').read().decode('utf-8','replace')\nm=re.search(r'src=\\\"(/_expo/static/js/web/index-[^\\\"]+)\\\"', h)\nprint('js', m.group(1) if m else 'MISSING')\nif m:\n  r=urllib.request.urlopen('https://hockey-stars.com'+m.group(1))\n  print('js_status', r.status, 'bytes', r.headers.get('Content-Length'))\nPY",
    "tail -15 /var/log/nginx/error.log",
]

for cmd in cmds:
    print("===", cmd.split("\n")[0][:90])
    _, o, e = c.exec_command(cmd, timeout=90)
    print(o.read().decode("utf-8", "replace")[:2000])
    err = e.read().decode("utf-8", "replace")
    if err.strip():
        print("ERR", err[:300])

c.close()
