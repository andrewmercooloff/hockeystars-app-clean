"""Fix firewall and verify external HTTPS on VPS."""
import os
import sys
import paramiko

HOST = os.environ.get("VPS_HOST", "5.42.123.84")
USER = "root"


def run(client, cmd: str) -> None:
    _, stdout, stderr = client.exec_command(cmd, timeout=120)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    print(f"=== {cmd[:80]}... (exit {code}) ===" if len(cmd) > 80 else f"=== {cmd} (exit {code}) ===")
    if out.strip():
        print(out.strip()[:2000])
    if err.strip():
        print("ERR:", err.strip()[:1000])


def main() -> int:
    password = os.environ.get("VPS_PASS", "").strip()
    if not password:
        return 1
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=60)

    run(client, "which ufw && ufw status verbose || echo no-ufw")
    run(client, "ss -tlnp | grep -E ':80|:443' || true")
    run(client, "apt-get install -y ufw 2>/dev/null; ufw allow 22/tcp; ufw allow 80/tcp; ufw allow 443/tcp; ufw --force enable; ufw status")
    run(client, f"curl -sS -o /dev/null -w '%{{http_code}} %{{time_total}}s\\n' --max-time 15 https://127.0.0.1/rest/v1/ -k -H 'Host: api.hockey-stars.com' || true")
    run(client, f"curl -sS -o /dev/null -w '%{{http_code}} %{{time_total}}s\\n' --max-time 15 https://{HOST}/rest/v1/ -k || true")
    run(client, "tail -20 /var/log/nginx/error.log 2>/dev/null || true")

    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
