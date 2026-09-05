import os
import json
import paramiko

ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM"
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("5.42.123.84", username="root", password=os.environ["VPS_PASS"])

# Find player by phone variants
for q in ["79015919901", "+79015919901", "89015919901"]:
    cmd = (
        f"curl -sS 'https://api.hockey-stars.com/rest/v1/players?phone=eq.{q}&select=id,name,phone' "
        f"-H 'apikey: {ANON}' -H 'Authorization: Bearer {ANON}'"
    )
    _, o, _ = c.exec_command(cmd)
    print(q, "->", o.read().decode()[:200])

# like search
cmd = (
    "curl -sS 'https://api.hockey-stars.com/rest/v1/players?phone=like.*9015919901&select=id,name,phone' "
    f"-H 'apikey: {ANON}' -H 'Authorization: Bearer {ANON}'"
)
_, o, _ = c.exec_command(cmd)
print("like", o.read().decode()[:300])

# Test verify endpoint with wrong assumption - simulate find after known contact
php = r'''
<?php
require '/var/www/hockeystars-site/includes/auth-otp.php';
foreach (['+79015919901','79015919901','89015919901'] as $p) {
  $found = hs_find_player($p, 'phone');
  echo $p . ' => ' . ($found ? ($found['name'].' | '.$found['phone']) : 'NULL') . "\n";
  echo 'variants=' . implode(',', hs_phone_lookup_variants($p)) . "\n";
}
'''
sftp = c.open_sftp()
with sftp.file("/tmp/find-phone.php", "w") as f:
    f.write(php)
sftp.close()
_, o, _ = c.exec_command("php /tmp/find-phone.php")
print(o.read().decode("utf-8", "replace"))
c.close()
