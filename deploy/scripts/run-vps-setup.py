"""One-shot VPS nginx setup via SSH. Password via env VPS_PASS."""
import os
import sys
import paramiko

HOST = os.environ.get("VPS_HOST", "5.42.123.84")
USER = "root"
SCRIPT = os.path.join(os.path.dirname(__file__), "vps-setup-remote.sh")


def main() -> int:
    password = os.environ.get("VPS_PASS", "").strip()
    if not password:
        print("Set VPS_PASS environment variable", file=sys.stderr)
        return 1

    with open(SCRIPT, encoding="utf-8") as f:
        remote_script = f.read()

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {HOST}...")
    client.connect(HOST, username=USER, password=password, timeout=60, banner_timeout=60)

    print("Running setup (apt + nginx)...")
    stdin, stdout, stderr = client.exec_command(f"bash -s << 'REMOTEEOF'\n{remote_script}\nREMOTEEOF", timeout=600)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()

    if out:
        print(out.encode("utf-8", errors="replace").decode("utf-8", errors="replace"))
    if err:
        print(err.encode("utf-8", errors="replace").decode("utf-8", errors="replace"), file=sys.stderr)
    print(f"Exit code: {code}")

    if code == 0 and "NGINX_OK" in out:
        print("SUCCESS: nginx is running on port 80")
        print("Next: DNS A api -> 178.253.23.47, then on VPS: certbot --nginx -d api.hockey-stars.com")

    client.close()
    return code


if __name__ == "__main__":
    raise SystemExit(main())
