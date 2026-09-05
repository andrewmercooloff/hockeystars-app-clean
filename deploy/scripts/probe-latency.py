import os, time, urllib.request, ssl, paramiko

ctx = ssl.create_default_context()

def timed(url, timeout=20):
    t0 = time.time()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
            body = r.read(200)
            return round(time.time() - t0, 2), r.status, len(body)
    except Exception as e:
        return round(time.time() - t0, 2), "ERR", str(e)[:100]

for u in [
    "https://hockey-stars.com/",
    "https://hockey-stars.com/feed",
    "https://api.hockey-stars.com/rest/v1/",
]:
    print(u, timed(u))

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("5.42.123.84", username="root", password=os.environ["VPS_PASS"], timeout=30)
cmds = [
    "hostname; curl -s ifconfig.me; echo; free -h | head -2; df -h / | tail -1; uptime",
    'curl -o /dev/null -s -w "to_supabase:%{time_total}\\n" https://jvsypfwiajuwsyuzkyda.supabase.co/rest/v1/ -H "apikey: x"',
    'curl -o /dev/null -s -w "to_api_self:%{time_total}\\n" https://127.0.0.1/rest/v1/ -H "Host: api.hockey-stars.com" -H "apikey: x" -k',
]
for cmd in cmds:
    _, stdout, stderr = c.exec_command(cmd, timeout=40)
    print(stdout.read().decode() + stderr.read().decode())
c.close()
