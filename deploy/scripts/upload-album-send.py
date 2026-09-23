#!/usr/bin/env python3
"""Deploy website-album/send.php and patch form action on the album VPS."""
import os
import re
import sys

import paramiko

HOST = os.environ.get("VPS_HOST", "5.42.123.84")
USER = "root"
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LOCAL_SEND = os.path.join(REPO_ROOT, "website-album", "send.php")
LOCAL_HTACCESS = os.path.join(REPO_ROOT, "website-album", "data", ".htaccess")

CANDIDATE_ROOTS = [
    "/var/www/album.hockey-stars.com",
    "/var/www/album",
    "/var/www/hockeystars-album",
]


def run(client: paramiko.SSHClient, cmd: str) -> str:
    _, stdout, stderr = client.exec_command(cmd, timeout=120)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    print(f"$ {cmd}\n{out}{err}".rstrip())
    if code != 0:
        raise RuntimeError(f"Command failed ({code}): {cmd}")
    return out


def detect_root(client: paramiko.SSHClient) -> str:
    for root in CANDIDATE_ROOTS:
        out = run(client, f"test -f {root}/send.php && echo OK || true")
        if "OK" in out:
            return root
    out = run(
        client,
        "find /var/www -maxdepth 3 -name send.php 2>/dev/null | head -1",
    ).strip()
    if out:
        return os.path.dirname(out)
    raise RuntimeError("Could not find album site root on VPS (send.php missing)")


def main() -> int:
    password = os.environ.get("VPS_PASS", "").strip()
    if not password:
        print("Set VPS_PASS", file=sys.stderr)
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=60)

    root = detect_root(client)
    print(f"Album site root: {root}")

    sftp = client.open_sftp()
    sftp.put(LOCAL_SEND, f"{root}/send.php")
    print(f"uploaded send.php -> {root}/send.php")

    run(client, f"mkdir -p {root}/data && chmod 750 {root}/data")
    sftp.put(LOCAL_HTACCESS, f"{root}/data/.htaccess")
    print(f"uploaded data/.htaccess")

    index_path = f"{root}/index.html"
    with sftp.open(index_path, "r") as remote:
        html = remote.read().decode("utf-8", errors="replace")

    patched = html.replace('action="../send.php"', 'action="/send.php"')
    if patched != html:
        with sftp.open(index_path, "w") as remote:
            remote.write(patched)
        print("patched index.html form action -> /send.php")
    else:
        print("index.html form action already OK (or pattern not found)")

    sftp.close()

    test = run(
        client,
        f"curl -sS -X POST -H 'X-Requested-With: XMLHttpRequest' "
        f"-d 'name=DeployTest&email=deploy@test.local&phone=%2B10000000001&club=Test&message=ok' "
        f"https://album.hockey-stars.com/send.php",
    )
    print("Live test response:", test.strip())

    client.close()
    print("OK — create config.local.php with HS_SMTP_USER/HS_SMTP_PASS (Timeweb mailbox).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
