import io
import os
import paramiko
from pathlib import Path

HOST = "5.42.123.84"
REPO = Path(__file__).resolve().parents[2]
LOCAL = REPO / "website" / "seed-hockey-shops.php"
REMOTE_DIR = "/var/www/hockeystars-site"

password = os.environ["VPS_PASS"]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username="root", password=password, timeout=60)
sftp = c.open_sftp()
sftp.put(str(LOCAL), f"{REMOTE_DIR}/seed-hockey-shops.php")

extract = r'''<?php
$f = __DIR__ . "/config.local.php";
$key = "";
if (is_readable($f)) {
  $t = file_get_contents($f);
  foreach ([
    "/HS_SUPABASE_SERVICE_ROLE_KEY['\"]?\s*,\s*['\"]([^'\"]+)/",
    "/SERVICE_ROLE_KEY['\"]?\s*,\s*['\"]([^'\"]+)/",
  ] as $re) {
    if (preg_match($re, $t, $m)) { $key = $m[1]; break; }
  }
}
$php = "<?php\n";
if ($key !== "") {
  $php .= "if (!defined('HS_SUPABASE_SERVICE_ROLE_KEY')) define('HS_SUPABASE_SERVICE_ROLE_KEY', " . var_export($key, true) . ");\n";
  echo "service_key:yes\n";
} else {
  echo "service_key:no\n";
}
file_put_contents(__DIR__ . "/.seed-env.php", $php);
'''
sftp.putfo(io.BytesIO(extract.encode("utf-8")), f"{REMOTE_DIR}/_extract_service_key.php")
sftp.close()

cmds = f"""
set -e
cd {REMOTE_DIR}
php _extract_service_key.php
php -d display_errors=1 -r 'require ".seed-env.php"; require "seed-hockey-shops.php";'
rm -f seed-hockey-shops.php _extract_service_key.php .seed-env.php
"""
_, stdout, stderr = c.exec_command(cmds, timeout=300)
print(stdout.read().decode("utf-8", "replace"))
err = stderr.read().decode("utf-8", "replace")
if err.strip():
    print("STDERR:", err[-2000:])
c.close()
