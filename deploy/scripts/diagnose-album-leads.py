#!/usr/bin/env python3
"""Inspect album.hockey-stars.com on VPS: send.php, lead logs, nginx POST history."""
from __future__ import annotations

import os
import sys

import paramiko

HOST = os.environ.get("VPS_HOST", "5.42.123.84")
USER = "root"
RECOVER_SH = os.path.join(os.path.dirname(__file__), "recover-album-leads.sh")


def main() -> int:
    password = os.environ.get("VPS_PASS", "").strip()
    if not password:
        print("Нужен VPS_PASS (пароль root из Timeweb → Сервер Diligent Crane → Доступ).", file=sys.stderr)
        print("Или откройте Cloud Shell в панели Timeweb и выполните:", file=sys.stderr)
        print(f"  bash {RECOVER_SH}", file=sys.stderr)
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=60)

    with open(RECOVER_SH, "r", encoding="utf-8") as f:
        script = f.read()
    _, stdout, stderr = client.exec_command(f"bash -s <<'SCRIPT'\n{script}\nSCRIPT", timeout=120)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    print(out)
    if err.strip():
        print(err, file=sys.stderr)
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
