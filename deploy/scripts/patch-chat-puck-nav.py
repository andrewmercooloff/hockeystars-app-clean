from pathlib import Path

chat = Path(r"c:\hockeystars-app-clean-old-recovered\app\chat") / "[id].tsx"
t = chat.read_text(encoding="utf-8")
needle = "import {buildPlayerPath, buildPlayerSlug} from '../../utils/playerSeoPath';"
if "utils/navigateToPlayer" not in t:
    t = t.replace(
        needle,
        needle + "\nimport { navigateToPlayerProfile } from '../../utils/navigateToPlayer';",
        1,
    )
    chat.write_text(t, encoding="utf-8")
    print("chat import ok")
else:
    print("chat import already")

puck = Path(r"c:\hockeystars-app-clean-old-recovered\app\puck-speed-sound.tsx")
t = puck.read_text(encoding="utf-8")
if "utils/navigateToPlayer" not in t:
    t = t.replace(
        "import { buildPlayerPath } from '../utils/playerSeoPath';",
        "import { buildPlayerPath } from '../utils/playerSeoPath';\nimport { navigateToPlayerProfile } from '../utils/navigateToPlayer';",
        1,
    )
old = "router.replace((buildPlayerPath(currentUser.id) + '?scrollToSpeed=true') as any);"
new = "navigateToPlayerProfile(router, { playerId: currentUser.id, name: currentUser.name, scrollToSpeed: 'true', replace: true });"
print("puck replaces", t.count(old))
t = t.replace(old, new)
puck.write_text(t, encoding="utf-8")
print("puck done")
