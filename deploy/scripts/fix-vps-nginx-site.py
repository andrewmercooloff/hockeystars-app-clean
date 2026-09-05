"""Fix nginx on VPS after hockey-stars.com.conf upload."""
import os
import pathlib
import paramiko

HOST = "5.42.123.84"
CONF = pathlib.Path(__file__).resolve().parents[1] / "nginx" / "hockey-stars.com.conf"


def main() -> int:
    password = os.environ.get("VPS_PASS", "").strip()
    if not password:
        print("Set VPS_PASS")
        return 1

    text = CONF.read_text(encoding="utf-8").replace("php8.2-fpm.sock", "php8.3-fpm.sock")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username="root", password=password, timeout=60)

    sftp = client.open_sftp()
    with sftp.file("/etc/nginx/sites-available/hockey-stars.com", "w") as f:
        f.write(text)
    sftp.close()

    for cmd in (
        "ln -sf /etc/nginx/sites-available/hockey-stars.com /etc/nginx/sites-enabled/hockey-stars.com",
        "nginx -t",
        "systemctl reload nginx",
    ):
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        print(out or err)

    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
