"""Check VPS nginx status via SSH."""
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
    print(f"=== {cmd} (exit {code}) ===")
    if out.strip():
        print(out)
    if err.strip():
        print(err)


def main() -> int:
    password = os.environ.get("VPS_PASS", "").strip()
    if not password:
        print("Set VPS_PASS", file=sys.stderr)
        return 1
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=60)
    run(client, "systemctl is-active nginx")
    run(client, "nginx -t 2>&1")
    run(client, "curl -sS -o /dev/null -w '%{http_code} %{time_total}s\\n' --max-time 15 http://127.0.0.1/rest/v1/ -H 'Host: jvsypfwiajuwsyuzkyda.supabase.co' || true")
    run(client, "grep server_name /etc/nginx/sites-enabled/api 2>/dev/null || echo NO_CONFIG")
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
