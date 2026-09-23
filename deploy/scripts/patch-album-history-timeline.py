#!/usr/bin/env python3
"""Remove yellow timeline icons and connector line from album landing history section."""
from __future__ import annotations

import os
import re
import sys

import paramiko

HOST = os.environ.get("VPS_HOST", "5.42.123.84")
USER = "root"
ROOT = "/var/www/album.hockey-stars.com"
PATHS = [f"{ROOT}/index.html", f"{ROOT}/ru/index.html", f"{ROOT}/en/index.html"]

ICON_BLOCK = re.compile(
    r'<div class="relative z-10 flex justify-center mb-6">'
    r'<div class="w-20 h-20 bg-gradient-to-br from-\[#FFB800\] to-\[#FF8800\] rounded-full flex items-center justify-center shadow-lg border-4 border-\[#1a0008\]">'
    r'<span class="ri-[^"]+ text-3xl text-black"></span></div></div>',
    re.S,
)
CONNECTOR = (
    '<div class="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r '
    'from-[#E31837]/20 via-[#E31837] to-[#FFB800]"></div>'
)


def patch_html(html: str) -> str:
    html = html.replace(CONNECTOR, "")
    return ICON_BLOCK.sub("", html)


def main() -> int:
    password = os.environ.get("VPS_PASS", "").strip()
    if not password:
        print("Set VPS_PASS", file=sys.stderr)
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=60)
    sftp = client.open_sftp()

    for path in PATHS:
        try:
            with sftp.open(path, "r") as remote:
                html = remote.read().decode("utf-8", errors="replace")
        except FileNotFoundError:
            print(f"skip {path}")
            continue
        patched = patch_html(html)
        if patched == html:
            print(f"unchanged {path}")
            continue
        with sftp.open(path, "w") as remote:
            remote.write(patched)
        print(f"patched {path}")

    sftp.close()
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
