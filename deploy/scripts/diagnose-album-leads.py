#!/usr/bin/env python3
"""Inspect album.hockey-stars.com lead delivery: logs, send.php, Supabase."""
from __future__ import annotations

import json
import os
import sys
import urllib.request

import paramiko

HOST = os.environ.get("VPS_HOST", "5.42.123.84")
USER = "root"
ANON = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30."
    "8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM"
)
API = "https://api.hockey-stars.com/rest/v1/album_leads"

CANDIDATE_ROOTS = [
    "/var/www/album.hockey-stars.com",
    "/var/www/album",
    "/var/www/hockeystars-album",
    "/var/www/html/album",
]


def run(client: paramiko.SSHClient, cmd: str) -> str:
    _, stdout, stderr = client.exec_command(cmd, timeout=120)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    print(f"\n=== {cmd} (exit {code}) ===")
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print(err.rstrip())
    return out


def fetch_supabase_leads() -> None:
    print("\n=== Supabase album_leads (needs table + service/anon read policy) ===")
    req = urllib.request.Request(
        API + "?select=created_at,name,email,phone,club,message&order=created_at.desc&limit=50",
        headers={
            "apikey": ANON,
            "Authorization": f"Bearer {ANON}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            rows = json.loads(resp.read().decode())
            if not rows:
                print("No rows (table empty or RLS blocks anon SELECT — check Dashboard with service role).")
            else:
                print(json.dumps(rows, ensure_ascii=False, indent=2))
    except Exception as exc:
        print(f"Supabase query failed: {exc}")
        print("Run database/album_leads.sql in Supabase if the table does not exist yet.")


def main() -> int:
    password = os.environ.get("VPS_PASS", "").strip()
    if not password:
        print("Set VPS_PASS to inspect server logs and recover local lead files.", file=sys.stderr)
        fetch_supabase_leads()
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=60)

    run(client, "grep -r album.hockey-stars /etc/nginx/sites-enabled/ 2>/dev/null | head -20")
    for root in CANDIDATE_ROOTS:
        run(client, f"test -d {root} && echo FOUND {root} || true")

    run(
        client,
        "for d in /var/www/*; do "
        "test -f \"$d/send.php\" && echo SENDPHP \"$d/send.php\"; "
        "test -f \"$d/index.html\" && grep -l contact-form \"$d/index.html\" 2>/dev/null && echo INDEX \"$d/index.html\"; "
        "done",
    )

    run(client, "find /var/www -name 'leads.ndjson' -o -name 'submissions*.log' -o -name 'leads.json' 2>/dev/null | head -20")
    run(client, "grep -h 'POST.*send.php' /var/log/nginx/access.log 2>/dev/null | tail -30")
    run(client, "grep -h 'POST.*send.php' /var/log/nginx/access.log.1 2>/dev/null | tail -20")

    for path in [
        "/var/www/album/data/leads.ndjson",
        "/var/www/album.hockey-stars.com/data/leads.ndjson",
    ]:
        out = run(client, f"test -f {path} && wc -l {path} && tail -20 {path} || true")

    client.close()
    fetch_supabase_leads()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
