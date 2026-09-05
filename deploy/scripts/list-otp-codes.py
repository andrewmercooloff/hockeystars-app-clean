import os
import json
import paramiko

ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM"
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("5.42.123.84", username="root", password=os.environ["VPS_PASS"])

cmd = (
    "curl -sS 'https://api.hockey-stars.com/rest/v1/email_verification_codes"
    "?select=email,code,expires_at,created_at&order=created_at.desc&limit=10' "
    f"-H 'apikey: {ANON}' -H 'Authorization: Bearer {ANON}'"
)
_, o, _ = c.exec_command(cmd)
raw = o.read().decode("utf-8", "replace")
print(raw[:1500])
rows = json.loads(raw)
for r in rows:
    code = str(r.get("code") or "")
    email = str(r.get("email") or "")
    kind = "2FA" if code.startswith("2FA:") else "LOCAL"
    print(f"{email[:4]}*** kind={kind} created={r.get('created_at')} len={len(code)}")

# Also patch send-otp with logging and retest one RU number via API (server logs only)
c.close()
