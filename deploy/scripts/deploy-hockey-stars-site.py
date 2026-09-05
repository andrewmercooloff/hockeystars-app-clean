"""Deploy hockey-stars.com website + nginx config to Timeweb VPS."""
import os
import pathlib
import paramiko

HOST = os.environ.get("VPS_HOST", "5.42.123.84")
USER = "root"
REPO = pathlib.Path(__file__).resolve().parents[2]
WEBSITE = REPO / "website"
NGINX_CONF = REPO / "deploy" / "nginx" / "hockey-stars.com.conf"
SETUP_SH = REPO / "deploy" / "scripts" / "vps-setup-hockey-stars-site.sh"
REMOTE_SITE = "/var/www/hockeystars-site"

SKIP_DIRS = {".git", "__pycache__", "node_modules"}
SKIP_FILES = {"config.local.php", "broadcast-log.txt"}


def upload_tree(sftp: paramiko.SFTPClient, local: pathlib.Path, remote: str) -> None:
    for path in local.rglob("*"):
        rel = path.relative_to(local).as_posix()
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.name in SKIP_FILES:
            continue
        remote_path = f"{remote}/{rel}".replace("\\", "/")
        if path.is_dir():
            try:
                sftp.mkdir(remote_path)
            except OSError:
                pass
        else:
            remote_dir = remote_path.rsplit("/", 1)[0]
            try:
                sftp.mkdir(remote_dir)
            except OSError:
                pass
            sftp.put(str(path), remote_path)
            print(f"  uploaded {rel}")


def main() -> int:
    password = os.environ.get("VPS_PASS", "").strip()
    if not password:
        print("Set VPS_PASS", file=__import__("sys").stderr)
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {HOST}...")
    client.connect(HOST, username=USER, password=password, timeout=60)

    sftp = client.open_sftp()
    print("Uploading nginx config...")
    sftp.put(str(NGINX_CONF), "/tmp/hockey-stars.com.conf")
    print(f"Uploading website/ -> {REMOTE_SITE} ...")
    upload_tree(sftp, WEBSITE, REMOTE_SITE)
    sftp.put(str(SETUP_SH), "/tmp/vps-setup-hockey-stars-site.sh")
    sftp.close()

    print("Running server setup...")
    cmd = "bash /tmp/vps-setup-hockey-stars-site.sh"
    _, stdout, stderr = client.exec_command(cmd, timeout=300)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    print(out)
    if err:
        print(err)
    print(f"Setup exit: {code}")

    if "SITE_SETUP_OK" in out:
        print("SUCCESS: site files + nginx on VPS")
        print("Next: point DNS A hockey-stars.com ->", HOST)
        print("Then: certbot --nginx -d hockey-stars.com -d www.hockey-stars.com")

    client.close()
    return 0 if code == 0 else code


if __name__ == "__main__":
    raise SystemExit(main())
