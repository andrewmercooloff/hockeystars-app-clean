#!/usr/bin/env python3
"""Create support@hockey-stars.com mailbox via Timeweb Cloud Mail API v2."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

DOMAIN = os.environ.get("HS_MAIL_DOMAIN", "hockey-stars.com")
MAILBOX = os.environ.get("HS_MAILBOX", "support")
API = "https://api.timeweb.cloud"


def main() -> int:
    token = os.environ.get("TIMEWEB_API_TOKEN", "").strip()
    password = os.environ.get("HS_SMTP_PASS", "").strip()
    if not token:
        print("Set TIMEWEB_API_TOKEN (Timeweb Cloud → API → токен с правами Mail)", file=sys.stderr)
        return 1
    if not password:
        print("Set HS_SMTP_PASS (password for the new mailbox)", file=sys.stderr)
        return 1

    body = json.dumps(
        {
            "mailbox": MAILBOX,
            "password": password,
            "owner_full_name": "HockeyStars Support",
            "filter_status": True,
            "filter_action": "directory",
            "comment": "Album leads + site contact",
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        f"{API}/api/v2/mail/domains/{DOMAIN}",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(resp.read().decode("utf-8", errors="replace"))
        print(f"OK — mailbox {MAILBOX}@{DOMAIN} created (or already exists).")
        return 0
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        print(f"HTTP {e.code}: {err}", file=sys.stderr)
        if e.code == 409:
            print("Mailbox may already exist — set password in Timeweb panel → Почта.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
