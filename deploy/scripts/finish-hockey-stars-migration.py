"""Finish hockey-stars.com migration: certbot SSL + HTTPS nginx + config.local.php"""
import os
import pathlib
import paramiko

HOST = "5.42.123.84"
USER = "root"
EMAIL = "am654@yandex.ru"
REPO = pathlib.Path(__file__).resolve().parents[2]
HTTPS_CONF = REPO / "deploy" / "nginx" / "hockey-stars.com.conf"
REMOTE_SITE = "/var/www/hockeystars-site"

CONFIG_LOCAL = """<?php
define('HS_NOTIFICORE_API_KEY', getenv('NOTIFICORE_API_KEY') ?: '');
define('HS_NOTIFICORE_ORIGINATOR', 'HockeyStars');
define('HS_NOTIFICORE_SERVICE_NAME', 'ХоккейСтарс');
"""


def run(client, cmd: str, timeout: int = 300) -> tuple[int, str, str]:
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def main() -> int:
    password = os.environ.get("VPS_PASS", "").strip()
    if not password:
        print("Set VPS_PASS")
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {HOST}...")
    client.connect(HOST, username=USER, password=password, timeout=60)

    # config.local.php for SMS OTP
    sftp = client.open_sftp()
    with sftp.file(f"{REMOTE_SITE}/config.local.php", "w") as f:
        f.write(CONFIG_LOCAL)
    print("Wrote config.local.php")

    # Certbot (bootstrap HTTP must be active)
    print("Running certbot...")
    cert_cmd = (
        f"certbot certonly --nginx -d hockey-stars.com -d www.hockey-stars.com "
        f"--non-interactive --agree-tos -m {EMAIL} --no-eff-email 2>&1"
    )
    code, out, err = run(client, cert_cmd, timeout=600)
    print(out)
    if err:
        print(err)
    if code != 0 and "Certificate not yet due for renewal" not in out and "Successfully received certificate" not in out:
        # retry if already exists
        if "live/hockey-stars.com" not in out:
            print(f"certbot exit {code}")
            # continue if cert might exist

    # Upload HTTPS nginx config
    text = HTTPS_CONF.read_text(encoding="utf-8")
    with sftp.file("/etc/nginx/sites-available/hockey-stars.com", "w") as f:
        f.write(text)
    sftp.close()
    print("Uploaded HTTPS nginx config")

    for cmd in (
        "ln -sf /etc/nginx/sites-available/hockey-stars.com /etc/nginx/sites-enabled/hockey-stars.com",
        "nginx -t",
        "systemctl reload nginx",
        "systemctl status php8.3-fpm --no-pager | head -3",
    ):
        code, out, err = run(client, cmd)
        print((out or err).strip())

    # Smoke tests
    for url in (
        "https://hockey-stars.com/",
        "https://hockey-stars.com/login",
        "https://hockey-stars.com/sitemap-players.xml",
        "https://hockey-stars.com/.well-known/apple-app-site-association",
        "https://api.hockey-stars.com/rest/v1/",
    ):
        code, out, err = run(
            client,
            f'curl -sS -o /dev/null -w "%{{http_code}}" {url}',
        )
        print(f"{url} -> {out.strip()}")

    client.close()
    print("DONE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
