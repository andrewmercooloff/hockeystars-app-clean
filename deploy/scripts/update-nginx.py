"""Upload updated nginx config to VPS and reload."""
import os
import sys
import pathlib
import paramiko

VPS_IP = "5.42.123.84"
VPS_USER = "root"
VPS_PASS = os.environ.get("VPS_PASS", "").strip()
if not VPS_PASS:
    print("Set VPS_PASS environment variable", file=sys.stderr)
    sys.exit(1)

CONF_PATH = pathlib.Path(__file__).parent.parent / "nginx" / "api.hockey-stars.com.conf"
REMOTE_PATH = "/etc/nginx/sites-available/api.hockey-stars.com"
ENABLED_LINK = "/etc/nginx/sites-enabled/api.hockey-stars.com"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print(f"Connecting to {VPS_IP}...")
client.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=30)

sftp = client.open_sftp()
print(f"Uploading {CONF_PATH} -> {REMOTE_PATH}")
sftp.put(str(CONF_PATH), REMOTE_PATH)
sftp.close()

_, stdout, stderr = client.exec_command(
    f"ln -sf {REMOTE_PATH} {ENABLED_LINK} && "
    "rm -f /etc/nginx/sites-enabled/api && "
    "nginx -t && systemctl reload nginx && echo NGINX_OK"
)
out = stdout.read().decode()
err = stderr.read().decode()
print(out)
if err:
    print("STDERR:", err, file=sys.stderr)
if "NGINX_OK" in out:
    print("Nginx reloaded successfully")
else:
    print("Nginx reload failed")
    sys.exit(1)
client.close()
