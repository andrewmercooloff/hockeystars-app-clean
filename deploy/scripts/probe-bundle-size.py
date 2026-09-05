import re, ssl, time, urllib.request
from pathlib import Path

ctx = ssl.create_default_context()
dist = Path(r"c:\hockeystars-app-clean-old-recovered\dist-web\_expo\static\js\web")
if dist.exists():
    files = sorted(dist.glob("*.js"), key=lambda p: -p.stat().st_size)
    print("local bundles:")
    for p in files[:8]:
        print(f"  {p.name} {round(p.stat().st_size/1e6,2)} MB")

html = urllib.request.urlopen("https://hockey-stars.com/feed", context=ctx, timeout=30).read().decode("utf-8", "replace")
scripts = re.findall(r'src="(/_expo/static/js/web/[^"]+)"', html)
print("live scripts", scripts)
for s in scripts:
    u = "https://hockey-stars.com" + s
    t0 = time.time()
    req = urllib.request.Request(
        u,
        headers={
            "Accept-Encoding": "gzip, deflate, br",
            "User-Agent": "Mozilla/5.0",
        },
    )
    with urllib.request.urlopen(req, context=ctx, timeout=90) as r:
        data = r.read()
        print(
            s.split("/")[-1],
            "downloaded",
            round(len(data) / 1e6, 2),
            "MB",
            "encoding",
            r.headers.get("Content-Encoding"),
            "cache",
            r.headers.get("Cache-Control"),
            "sec",
            round(time.time() - t0, 2),
        )
