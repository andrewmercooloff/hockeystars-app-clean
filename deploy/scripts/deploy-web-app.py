"""Deploy Expo web dist + nginx + site PHP/auth updates to VPS (site root, no /app)."""
import os
import tarfile
import tempfile
import paramiko
from pathlib import Path

HOST = "5.42.123.84"
REPO = Path(__file__).resolve().parents[2]
DIST = REPO / "dist-web"

SITE_FILES = [
    ("website/assets/site-auth.js", "/var/www/hockeystars-site/assets/site-auth.js"),
    ("website/login.php", "/var/www/hockeystars-site/login.php"),
    ("website/register.php", "/var/www/hockeystars-site/register.php"),
    ("website/config.php", "/var/www/hockeystars-site/config.php"),
    ("website/player.php", "/var/www/hockeystars-site/player.php"),
    ("website/player-bootstrap.php", "/var/www/hockeystars-site/player-bootstrap.php"),
    ("website/sitemap.php", "/var/www/hockeystars-site/sitemap.php"),
    ("website/sitemap-static.php", "/var/www/hockeystars-site/sitemap-static.php"),
    ("website/sitemap-players.php", "/var/www/hockeystars-site/sitemap-players.php"),
    ("website/get-app.php", "/var/www/hockeystars-site/get-app.php"),
    ("website/includes/player-public.php", "/var/www/hockeystars-site/includes/player-public.php"),
    ("website/.htaccess", "/var/www/hockeystars-site/.htaccess"),
    ("website/index.html", "/var/www/hockeystars-site/index.html"),
    ("website/index-en.html", "/var/www/hockeystars-site/index-en.html"),
    ("website/styles.css", "/var/www/hockeystars-site/styles.css"),
    ("website/script.js", "/var/www/hockeystars-site/script.js"),
    ("website/robots.txt", "/var/www/hockeystars-site/robots.txt"),
    ("website/led.jpg", "/var/www/hockeystars-site/led.jpg"),
    ("website/led.webp", "/var/www/hockeystars-site/led.webp"),
    ("website/logo.png", "/var/www/hockeystars-site/logo.png"),
    ("website/gilroy-regular.ttf", "/var/www/hockeystars-site/gilroy-regular.ttf"),
    ("website/gilroy-bold.ttf", "/var/www/hockeystars-site/gilroy-bold.ttf"),
    ("website/favicon.ico", "/var/www/hockeystars-site/favicon.ico"),
    ("website/favicon.png", "/var/www/hockeystars-site/favicon.png"),
    ("website/favicon-16x16.png", "/var/www/hockeystars-site/favicon-16x16.png"),
    ("website/favicon-32x32.png", "/var/www/hockeystars-site/favicon-32x32.png"),
    ("website/favicon-96x96.png", "/var/www/hockeystars-site/favicon-96x96.png"),
    ("website/apple-touch-icon.png", "/var/www/hockeystars-site/apple-touch-icon.png"),
    ("website/web-app-manifest-192x192.png", "/var/www/hockeystars-site/web-app-manifest-192x192.png"),
    ("website/web-app-manifest-512x512.png", "/var/www/hockeystars-site/web-app-manifest-512x512.png"),
    ("website/android-chrome-192x192.png", "/var/www/hockeystars-site/android-chrome-192x192.png"),
    ("website/android-chrome-512x512.png", "/var/www/hockeystars-site/android-chrome-512x512.png"),
    ("website/mstile-150x150.png", "/var/www/hockeystars-site/mstile-150x150.png"),
    ("website/browserconfig.xml", "/var/www/hockeystars-site/browserconfig.xml"),
    ("website/site.webmanifest", "/var/www/hockeystars-site/site.webmanifest"),
    ("website/puck-avatar-1.jpg", "/var/www/hockeystars-site/puck-avatar-1.jpg"),
    ("website/puck-avatar-2.jpg", "/var/www/hockeystars-site/puck-avatar-2.jpg"),
    ("website/puck-avatar-3.jpg", "/var/www/hockeystars-site/puck-avatar-3.jpg"),
    ("website/puck-avatar-4.jpg", "/var/www/hockeystars-site/puck-avatar-4.jpg"),
    ("website/puck-avatar-5.jpg", "/var/www/hockeystars-site/puck-avatar-5.jpg"),
    ("website/puck-avatar-6.jpg", "/var/www/hockeystars-site/puck-avatar-6.jpg"),
    ("website/puck-avatar-7.jpg", "/var/www/hockeystars-site/puck-avatar-7.jpg"),
    ("website/puck-avatar-8.jpg", "/var/www/hockeystars-site/puck-avatar-8.jpg"),
    ("website/top.html", "/var/www/hockeystars-site/top.html"),
    ("website/vendor/leaflet/leaflet.css", "/var/www/hockeystars-site/vendor/leaflet/leaflet.css"),
    ("website/vendor/leaflet/leaflet.js", "/var/www/hockeystars-site/vendor/leaflet/leaflet.js"),
]


def main():
    password = os.environ["VPS_PASS"]
    if not DIST.is_dir() or not (DIST / "index.html").exists():
        raise SystemExit(f"Missing build: {DIST}/index.html — run web export first")

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("Connecting...")
    c.connect(HOST, username="root", password=password, timeout=60)

    tar_path = Path(tempfile.gettempdir()) / "hockeystars-web.tar.gz"
    print("Packing dist-web...")
    with tarfile.open(tar_path, "w:gz") as tar:
        tar.add(DIST, arcname=".")
    print(f"Archive size: {tar_path.stat().st_size / 1024 / 1024:.1f} MB")

    sftp = c.open_sftp()
    print("Uploading archive + nginx + PHP...")
    sftp.put(str(tar_path), "/tmp/hockeystars-web.tar.gz")
    sftp.put(str(REPO / "deploy/nginx/hockey-stars.com.conf"), "/etc/nginx/sites-available/hockey-stars.com")
    # Ensure remote dirs exist before SFTP puts (vendor/leaflet etc.)
    _, stdout, stderr = c.exec_command(
        "mkdir -p /var/www/hockeystars-site/includes /var/www/hockeystars-site/assets /var/www/hockeystars-site/vendor/leaflet",
        timeout=30,
    )
    stdout.channel.recv_exit_status()
    for rel, remote in SITE_FILES:
        local = REPO / rel
        if local.exists():
            sftp.put(str(local), remote)
            print("  uploaded", rel)
        else:
            print("  skip missing", rel)
    sftp.close()

    cmds = r"""
set -e
mkdir -p /var/www/hockeystars-web /var/www/hockeystars-site/includes /var/www/hockeystars-site/assets /var/www/hockeystars-site/vendor/leaflet
rm -rf /var/www/hockeystars-web/*
tar -xzf /tmp/hockeystars-web.tar.gz -C /var/www/hockeystars-web
chown -R www-data:www-data /var/www/hockeystars-web
# Legacy symlink: /app -> web root (nginx also 301 /app/* -> /*)
ln -sfn /var/www/hockeystars-web /var/www/hockeystars-site/app
nginx -t
systemctl reload nginx
JS=$(ls /var/www/hockeystars-web/_expo/static/js/web/*.js | head -1)
BASENAME=$(basename "$JS")
curl -sS -o /dev/null -w 'root:%{http_code}\n' https://hockey-stars.com/
curl -sS -o /dev/null -w 'js:%{http_code}\n' "https://hockey-stars.com/_expo/static/js/web/$BASENAME"
curl -sS -o /dev/null -w 'spa:%{http_code}\n' https://hockey-stars.com/player/test-id
curl -sS -o /dev/null -w 'feed:%{http_code}\n' https://hockey-stars.com/feed
curl -sS -o /dev/null -w 'app_redirect:%{http_code}\n' https://hockey-stars.com/app/
curl -sS -o /dev/null -w 'login:%{http_code}\n' https://hockey-stars.com/login
curl -sS -o /dev/null -w 'led:%{http_code}\n' https://hockey-stars.com/led.jpg
curl -sS -o /dev/null -w 'leaflet:%{http_code}\n' https://hockey-stars.com/vendor/leaflet/leaflet.js
echo '--- cache headers ---'
curl -sSI "https://hockey-stars.com/_expo/static/js/web/$BASENAME" | tr -d '\r' | grep -iE 'HTTP/|cache-control|content-type' || true
curl -sSI https://hockey-stars.com/styles.css | tr -d '\r' | grep -iE 'HTTP/|cache-control|content-type' || true
curl -sSI https://hockey-stars.com/gilroy-regular.ttf | tr -d '\r' | grep -iE 'HTTP/|cache-control|content-type' || true
curl -sSI https://hockey-stars.com/led.jpg | tr -d '\r' | grep -iE 'HTTP/|cache-control|content-type|content-length' || true
# Landing must be marketing HTML, not Expo shell alone
curl -sS https://hockey-stars.com/ | head -c 500 | grep -q 'hero-download-buttons\|nav-login\|download-btn\|preload' && echo 'landing:ok' || echo 'landing:MISS'
echo DONE
"""
    print("Extracting + reloading nginx...")
    _, stdout, stderr = c.exec_command(cmds, timeout=180)
    print(stdout.read().decode("utf-8", "replace"))
    err = stderr.read().decode("utf-8", "replace")
    if err:
        print("STDERR:", err[-800:])
    c.close()


if __name__ == "__main__":
    main()
