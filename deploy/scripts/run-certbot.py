"""Run certbot on VPS for api.hockey-stars.com"""
import os
import sys
import paramiko

HOST = os.environ.get("VPS_HOST", "5.42.123.84")
USER = "root"
EMAIL = "am654@yandex.ru"


def main() -> int:
    password = os.environ.get("VPS_PASS", "").strip()
    if not password:
        return 1
    cmd = (
        "certbot --nginx -d api.hockey-stars.com "
        f"--non-interactive --agree-tos --email {EMAIL} --redirect"
    )
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=60)
    print("Running certbot...")
    _, stdout, stderr = client.exec_command(cmd, timeout=300)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    print(out)
    if err:
        print(err)
    print(f"Exit: {code}")
    client.close()
    return code


if __name__ == "__main__":
    raise SystemExit(main())
