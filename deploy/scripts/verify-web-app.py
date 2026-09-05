"""Verify Expo web assets on VPS."""
import os
import re
import paramiko

HOST = "5.42.123.84"


def main():
    password = os.environ["VPS_PASS"]
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=password, timeout=60)
    cmds = r"""
set -e
echo '=== files ==='
ls -la /var/www/hockeystars-web/_expo/static/js/web/ | head
JS=$(ls /var/www/hockeystars-web/_expo/static/js/web/*.js | head -1)
BASENAME=$(basename "$JS")
echo "JS=$BASENAME"
echo '=== curls ==='
curl -sS -o /dev/null -w "index:%{http_code}\n" https://hockey-stars.com/app/
curl -sS -o /dev/null -w "js:%{http_code}\n" "https://hockey-stars.com/app/_expo/static/js/web/$BASENAME"
curl -sS -o /dev/null -w "player_spa:%{http_code}\n" https://hockey-stars.com/app/player/test-id
curl -sS -o /dev/null -w "seo_player_bot:%{http_code}\n" -A "Googlebot" https://hockey-stars.com/player/test-id
echo '=== script srcs ==='
grep -oE 'src="[^"]+"' /var/www/hockeystars-web/index.html | head -8
echo '=== symlink ==='
ls -la /var/www/hockeystars-site/app 2>/dev/null || echo 'no site/app symlink'
"""
    _, stdout, stderr = c.exec_command(cmds, timeout=60)
    print(stdout.read().decode("utf-8", "replace"))
    err = stderr.read().decode("utf-8", "replace")
    if err:
        print("STDERR:", err[-800:])
    c.close()


if __name__ == "__main__":
    main()
