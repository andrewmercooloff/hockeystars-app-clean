import os
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("5.42.123.84", username="root", password=os.environ["VPS_PASS"], timeout=60)

cmds = [
    "curl -sI 'https://hockey-stars.com/_expo/static/js/web/index-49f4a668ce15b8acf199473244f2cece.js' | head -15",
    "curl -sI 'https://hockey-stars.com/assets/assets/images/logo.png' | head -10 || true",
    "curl -sI 'https://hockey-stars.com/player/test-player' | head -15",
    "curl -sI -A 'Mozilla/5.0' 'https://hockey-stars.com/player/ivan-test-00000000-0000-4000-8000-000000000001' | head -15",
    "curl -sI -A 'Googlebot' 'https://hockey-stars.com/player/ivan-test-00000000-0000-4000-8000-000000000001' | head -15",
    # Does HTML contain theme toggle / Светлая?
    "python3 - <<'PY'\nimport urllib.request\njs=urllib.request.urlopen('https://hockey-stars.com/_expo/static/js/web/index-49f4a668ce15b8acf199473244f2cece.js').read().decode('utf-8','replace')\nfor s in ['Светлая тема','hockeystars_theme_mode','buildPlayerPath','slugifyLatin','/app/']: print(s, s in js)\nprint('len', len(js))\nPY",
]

for cmd in cmds:
    print("===", cmd.split("\n")[0][:90])
    _, o, e = c.exec_command(cmd, timeout=120)
    print(o.read().decode("utf-8", "replace")[:2500])
    err = e.read().decode("utf-8", "replace")
    if err.strip():
        print("ERR", err[:400])

c.close()
