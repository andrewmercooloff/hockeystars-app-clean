import json
import urllib.request

ANON = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30."
    "8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM"
)
URL = "https://api.hockey-stars.com"
H = {"apikey": ANON, "Authorization": "Bearer " + ANON, "Content-Type": "application/json", "Prefer": "return=minimal"}

patches = [
    ("a7431492-ba1e-45bb-b9d8-281ebb9683a0", {
        "name": "Sport-Ice Юность",
        "country": "Belarus",
        "city": "Минск",
    }),
    ("5927c485-13f6-4680-ad27-4bb12a25157e", {
        "country": "Russia",
        "city": "Санкт-Петербург",
        "photos": json.dumps(["https://hockeybezgranic.ru/upload/medialibrary/1ca/KOSMOS.jpg"]),
    }),
]

for pid, body in patches:
    req = urllib.request.Request(
        URL + "/rest/v1/players?id=eq." + pid,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        method="PATCH",
        headers=H,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(pid, resp.status)
    except Exception as e:
        print(pid, "fail", e)

# Final count summary for seeded phones
phones = [
    "+375293609691","+375291488008","+375173969593","+375296116655","+375296669422","+375336669421",
    "+79215639010","+74994443159","+79850688483","+74956137325","+79261928282",
    "+78126020274","+78126110032","+78129419491","+78125350811","+78124297151",
]
q = ",".join(phones)
req = urllib.request.Request(
    URL + f"/rest/v1/players?phone=in.({q})&select=name,phone,city,country,status,avatar",
    headers={"apikey": ANON, "Authorization": "Bearer " + ANON},
)
rows = json.load(urllib.request.urlopen(req, timeout=60))
print("seeded phones found", len(rows))
for r in sorted(rows, key=lambda x: (x.get("country") or "", x.get("city") or "", x.get("name") or "")):
    print(f"- {r['name']} | {r['city']} | {r['phone']} | {r['status']} | logo={'yes' if r.get('avatar') else 'no'}")
