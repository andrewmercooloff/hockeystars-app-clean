#!/usr/bin/env python3
"""Deploy website-album/send.php and patch form action on the album VPS."""
from __future__ import annotations

import os
import sys
import textwrap

import paramiko

HOST = os.environ.get("VPS_HOST", "5.42.123.84")
USER = "root"
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LOCAL_SEND = os.path.join(REPO_ROOT, "website-album", "send.php")
LOCAL_HTACCESS = os.path.join(REPO_ROOT, "website-album", "data", ".htaccess")
LOCAL_ROOT_HTACCESS = os.path.join(REPO_ROOT, "website-album", ".htaccess")

CANDIDATE_ROOTS = [
    "/var/www/album.hockey-stars.com",
    "/var/www/album",
    "/var/www/hockeystars-album",
    "/home/seokurs1/album.hockey-stars.com",
]


def run(client: paramiko.SSHClient, cmd: str, *, check: bool = True) -> str:
    _, stdout, stderr = client.exec_command(cmd, timeout=120)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    print(f"$ {cmd}\n{out}{err}".rstrip())
    if check and code != 0:
        raise RuntimeError(f"Command failed ({code}): {cmd}")
    return out


def detect_root(client: paramiko.SSHClient) -> str:
    for root in CANDIDATE_ROOTS:
        out = run(client, f"test -f {root}/send.php && echo OK || true", check=False)
        if "OK" in out:
            return root
    out = run(
        client,
        "find /var/www /home/seokurs1 -maxdepth 4 -name send.php 2>/dev/null | head -1",
        check=False,
    ).strip()
    if out:
        return os.path.dirname(out)
    raise RuntimeError("Could not find album site root on VPS (send.php missing)")


def build_config_local() -> str | None:
    smtp_user = os.environ.get("HS_SMTP_USER", "support@hockey-stars.com").strip()
    smtp_pass = os.environ.get("HS_SMTP_PASS", "").strip()
    leads_to = os.environ.get("HS_LEADS_TO", "support@hockey-stars.com").strip()
    if not smtp_pass:
        return None
    return textwrap.dedent(
        f"""\
        <?php
        define('HS_SMTP_USER', {smtp_user!r});
        define('HS_SMTP_PASS', {smtp_pass!r});
        define('HS_LEADS_TO', {leads_to!r});
        """
    )


def main() -> int:
    password = os.environ.get("VPS_PASS", "").strip()
    if not password:
        print("Set VPS_PASS (root password Timeweb VPS 5.42.123.84)", file=sys.stderr)
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
    print("uploaded data/.htaccess")

    if os.path.isfile(LOCAL_ROOT_HTACCESS):
        sftp.put(LOCAL_ROOT_HTACCESS, f"{root}/.htaccess")
        print("uploaded .htaccess (blocks error_log, config.local.php)")

    config_body = build_config_local()
    if config_body:
        with sftp.open(f"{root}/config.local.php", "w") as remote:
            remote.write(config_body)
        run(
            client,
            f"chown www-data:www-data {root}/config.local.php {root}/data && "
            f"chmod 640 {root}/config.local.php && chmod 750 {root}/data",
        )
        print("uploaded config.local.php from HS_SMTP_* env vars")
    else:
        print("WARN: HS_SMTP_PASS not set — email will fail until config.local.php is created")

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

    # Recover existing leads before/after deploy
    recover_sh = os.path.join(os.path.dirname(__file__), "recover-album-leads.sh")
    with open(recover_sh, "r", encoding="utf-8") as f:
        run(client, f"bash -s <<'SCRIPT'\n{f.read()}\nSCRIPT", check=False)

    test = run(
        client,
        "curl -sS -X POST -H 'X-Requested-With: XMLHttpRequest' "
        "-d 'name=DeployTest&email=deploy@test.local&phone=%2B10000000001&club=Test&message=ok' "
        "https://album.hockey-stars.com/send.php",
        check=False,
    )
    print("Live test response:", test.strip())

    client.close()
    if config_body:
        print("OK — send.php deployed with SMTP config. Check support@ inbox for DeployTest.")
    else:
        print("OK — send.php deployed. Set HS_SMTP_PASS and re-run to enable email.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
