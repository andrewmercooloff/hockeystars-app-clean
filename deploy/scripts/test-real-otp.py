"""Full OTP diagnostic with real player phone (masked logs)."""
import os
import json
import paramiko

HOST = "5.42.123.84"
ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username="root", password=os.environ["VPS_PASS"], timeout=60)

# Get one RU phone fully (server-side only)
_, o, _ = c.exec_command(
    f"curl -sS 'https://api.hockey-stars.com/rest/v1/players?select=phone,name,country&phone=like.%2B79%25&limit=1' "
    f"-H 'apikey: {ANON}' -H 'Authorization: Bearer {ANON}'"
)
rows = json.loads(o.read().decode())
phone = rows[0]["phone"]
name = rows[0]["name"]
print(f"test player={name} phone={phone[:4]}***{phone[-2:]}")

# Call send-otp as browser would
cmd = (
    "curl -sS -X POST https://hockey-stars.com/api/send-otp.php "
    "-H 'Content-Type: application/json' "
    f"-d '{{\"contact\":\"{phone}\"}}'"
)
_, o, e = c.exec_command(cmd)
print("send-otp response:", o.read().decode("utf-8", "replace"))
print("stderr:", e.read().decode("utf-8", "replace")[:300])

# Dump last verification row for that key
key = phone.replace("+", "") if phone.startswith("+7") else phone
# For +79... key should be 79... (7 + 10 digits)
if phone.startswith("+7") and len(phone) == 12:
    key = phone[1:]  # 79xxxxxxxxx

_, o, _ = c.exec_command(
    f"curl -sS 'https://api.hockey-stars.com/rest/v1/email_verification_codes?email=eq.{key}&select=email,code,expires_at,created_at&order=created_at.desc&limit=1' "
    f"-H 'apikey: {ANON}' -H 'Authorization: Bearer {ANON}'"
)
print("verification row:", o.read().decode("utf-8", "replace")[:400])

# Check php-fpm log
_, o, _ = c.exec_command("journalctl -u php8.3-fpm --no-pager -n 20 2>/dev/null | tail -20")
print("php-fpm:", o.read().decode("utf-8", "replace")[-800:])

c.close()
