from pathlib import Path
import re

p = Path(r"c:\hockeystars-app-clean-old-recovered\app\notifications.tsx")
text = p.read_text(encoding="utf-8")

old_imp = "import {buildPlayerPath, buildPlayerSlug} from '../utils/playerSeoPath';"
new_imp = old_imp + "\nimport { navigateToPlayerProfile } from '../utils/navigateToPlayer';"
if old_imp not in text:
    raise SystemExit("import missing")
if "navigateToPlayerProfile" not in text:
    text = text.replace(old_imp, new_imp, 1)

# Need language in notifications - check if useLanguage exists
if "useLanguage" not in text:
    print("WARN: no useLanguage in notifications")

pat = re.compile(
    r"router\.push\(\{\s*pathname:\s*'/player/\[id\]',\s*params:\s*\{([^}]+)\}\s*\}\)",
    re.S,
)


def repl(m: re.Match) -> str:
    body = m.group(1)
    idm = re.search(r"id:\s*buildPlayerSlug\(([^)]+)\)", body)
    if not idm:
        return m.group(0)
    args = idm.group(1).strip()
    parts = [p.strip() for p in re.split(r",(?![^(]*\))", body) if p.strip() and not p.strip().startswith("id:")]
    am = re.match(r"([^,]+)(?:,\s*(.+))?$", args)
    if not am:
        return m.group(0)
    pid = am.group(1).strip()
    name = am.group(2).strip() if am.group(2) else None
    opts = [f"playerId: {pid}"]
    if name:
        opts.append(f"name: {name}")
    for part in parts:
        if ":" not in part:
            continue
        k, v = part.split(":", 1)
        opts.append(f"{k.strip()}: {v.strip()}")
    return "navigateToPlayerProfile(router, { " + ", ".join(opts) + " })"


text, n = pat.subn(repl, text)
print("replaced pathname pushes:", n)

replacements = [
    (
        "router.push((buildPlayerPath(currentUser.id) + '?scrollToVideos=true') as any);",
        "navigateToPlayerProfile(router, { playerId: currentUser.id, name: currentUser.name, returnTo: 'notifications', scrollToVideos: 'true' });",
    ),
    (
        "router.push((buildPlayerPath(currentUser.id) + '?scrollToPhotos=true') as any);",
        "navigateToPlayerProfile(router, { playerId: currentUser.id, name: currentUser.name, returnTo: 'notifications', scrollToPhotos: 'true' });",
    ),
    (
        "router.push((buildPlayerPath(notification.playerId) + '?scrollToMuseum=true') as any);",
        "navigateToPlayerProfile(router, { playerId: notification.playerId, returnTo: 'notifications', scrollToMuseum: 'true' });",
    ),
    (
        "router.push((buildPlayerPath(request.playerId) + '?scrollToGift=true') as any);",
        "navigateToPlayerProfile(router, { playerId: request.playerId, returnTo: 'notifications', scrollToGift: 'true' });",
    ),
]
for a, b in replacements:
    c = text.count(a)
    text = text.replace(a, b)
    print("string replace", c, a[:60])

left = text.count("pathname: '/player/[id]'")
print("left pathname player:", left)
print("navigateToPlayerProfile count:", text.count("navigateToPlayerProfile"))
p.write_text(text, encoding="utf-8")
