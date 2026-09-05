"""Upload login fix files to VPS."""
import os
import paramiko

HOST = "5.42.123.84"
files = [
    ("website/index.html", "/var/www/hockeystars-site/index.html"),
    ("website/index-en.html", "/var/www/hockeystars-site/index-en.html"),
    ("website/script.js", "/var/www/hockeystars-site/script.js"),
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username="root", password=os.environ["VPS_PASS"], timeout=60)
sftp = c.open_sftp()
for local, remote in files:
    sftp.put(local, remote)
    print("uploaded", local)
sftp.close()
c.close()
print("OK")
