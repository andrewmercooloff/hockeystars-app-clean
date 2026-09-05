"""Probe RocketSMS international routing via VPS auth-otp.php."""
import os
import paramiko

HOST = "5.42.123.84"
PHP = r"""<?php
require '/var/www/hockeystars-site/config.php';
require '/var/www/hockeystars-site/includes/auth-otp.php';
$phones = ['+48508758893', '+37060015315', '+37120881095'];
foreach ($phones as $p) {
    $r = hs_send_sms_for_phone($p, '556677');
    echo $p, ' ', json_encode($r, JSON_UNESCAPED_UNICODE), "\n";
}
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username="root", password=os.environ["VPS_PASS"], timeout=60)
sftp = c.open_sftp()
with sftp.file("/tmp/probe-rocketsms-intl.php", "w") as f:
    f.write(PHP)
sftp.close()
_, o, e = c.exec_command("php /tmp/probe-rocketsms-intl.php; rm -f /tmp/probe-rocketsms-intl.php", timeout=90)
print(o.read().decode("utf-8", "replace"))
err = e.read().decode("utf-8", "replace")
if err.strip():
    print("stderr:", err[:800])
c.close()
