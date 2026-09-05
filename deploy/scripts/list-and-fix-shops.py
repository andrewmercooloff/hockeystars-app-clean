import json
import urllib.request

ANON = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30."
    "8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM"
)
URL = "https://api.hockey-stars.com"
q = (
    "/rest/v1/players?status=in.(shop,skateSharpening)"
    "&select=id,name,status,phone,email,city,country,address,website,avatar,photos,working_hours"
    "&order=country.asc,city.asc,name.asc"
)
req = urllib.request.Request(
    URL + q,
    headers={"apikey": ANON, "Authorization": "Bearer " + ANON},
)
rows = json.load(urllib.request.urlopen(req, timeout=60))
print("count", len(rows))
for r in rows:
    photos = r.get("photos")
    if isinstance(photos, str):
        try:
            photos = json.loads(photos)
        except Exception:
            photos = []
    nphotos = len(photos) if isinstance(photos, list) else 0
    print(
        "|".join(
            [
                str(r.get("country") or ""),
                str(r.get("city") or ""),
                str(r.get("status") or ""),
                str(r.get("name") or ""),
                str(r.get("phone") or ""),
                "avatar=Y" if r.get("avatar") else "avatar=N",
                f"photos={nphotos}",
            ]
        )
    )

# Create the two that failed due to email uniqueness
missing = [
    {
        "name": "Sport-Ice Yunost",
        "status": "shop",
        "phone": "+375173969593",
        "email": None,
        "country": "Belarus",
        "city": "Минск",
        "address": "ул. Первомайская 3 (адм. здание ХК «Юность»)",
        "working_hours": "Вт–Пт 10:00–19:00, Сб 10:00–18:00",
        "website": "http://sport-ice.by/contact/",
        "position": "Магазин",
        "team": "",
        "age": 0,
        "height": "",
        "weight": "",
        "is_hidden": False,
        "photos": "[]",
    },
    {
        "name": "Хоккей без границ (Космос)",
        "status": "shop",
        "phone": "+78126110032",
        "email": None,
        "country": "Russia",
        "city": "Санкт-Петербург",
        "address": "ул. Типанова 27/39, ТРК «Космос», 2 этаж, секция 222",
        "working_hours": "ежедневно 10:00–22:00",
        "website": "https://hockeybezgranic.ru/kontakty/",
        "position": "Магазин",
        "team": "",
        "age": 0,
        "height": "",
        "weight": "",
        "is_hidden": False,
        "photos": json.dumps(
            ["https://hockeybezgranic.ru/upload/medialibrary/1ca/KOSMOS.jpg"]
        ),
    },
]

existing_phones = {str(r.get("phone") or "") for r in rows}
for row in missing:
    if row["phone"] in existing_phones:
        print("already have", row["name"])
        continue
    body = json.dumps(row, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        URL + "/rest/v1/players",
        data=body,
        method="POST",
        headers={
            "apikey": ANON,
            "Authorization": "Bearer " + ANON,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            created = json.load(resp)
            print("created", row["name"], created[0]["id"] if created else created)
    except Exception as e:
        print("fail", row["name"], e)
