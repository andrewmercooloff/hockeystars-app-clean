from pathlib import Path

p = Path(r"c:\hockeystars-app-clean-old-recovered\app\chat") / "[id].tsx"
t = p.read_text(encoding="utf-8")
needle = "import {buildPlayerPath, buildPlayerSlug} from '../../utils/playerSeoPath';"
insert = needle + "\nimport { navigateToPlayerProfile } from '../../utils/navigateToPlayer';"
if "utils/navigateToPlayer" not in t:
    if needle not in t:
        raise SystemExit("needle missing")
    t = t.replace(needle, insert, 1)
    p.write_text(t, encoding="utf-8")
    print("ok")
else:
    print("already present")
