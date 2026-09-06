#!/usr/bin/env python3
"""Upload app-send-code.php + config.local.php to VPS. Requires VPS_PASS."""
import os
import sys
from pathlib import Path

import paramiko

HOST = os.environ.get("VPS_HOST", "5.42.123.84")
USER = "root"
PASSWORD = os.environ.get("VPS_PASS", "").strip()
REMOTE_SITE = "/var/www/hockeystars-site"
REPO = Path(__file__).resolve().parents[2]

if not PASSWORD:
    print("Set VPS_PASS", file=sys.stderr)
    sys.exit(1)

local_php = REPO / "website" / "config.local.php"
if not local_php.is_file():
    print("Missing website/config.local.php (gitignored). Create it first.", file=sys.stderr)
    sys.exit(1)

files = [
    (REPO / "website" / "api" / "app-send-code.php", f"{REMOTE_SITE}/api/app-send-code.php"),
    (local_php, f"{REMOTE_SITE}/config.local.php"),
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print(f"Connecting to {HOST}...")
client.connect(HOST, username=USER, password=PASSWORD, timeout=60)
sftp = client.open_sftp()
for local, remote in files:
    sftp.put(str(local), remote)
    print("uploaded", local.name, "->", remote)
sftp.close()

_, out, err = client.exec_command(
    f"php -l {REMOTE_SITE}/api/app-send-code.php; "
    f"test -f {REMOTE_SITE}/config.local.php && echo CONFIG_OK"
)
print(out.read().decode())
e = err.read().decode()
if e:
    print(e, file=sys.stderr)
client.close()
print("DONE")
