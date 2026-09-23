#!/usr/bin/env python3
"""Remove free-sample wording from album landing; use simple request/apply CTAs."""
import os
import sys

import paramiko

HOST = os.environ.get("VPS_HOST", "5.42.123.84")
USER = "root"
FILES = {
    "/var/www/album.hockey-stars.com/index.html": "en",
    "/var/www/album.hockey-stars.com/en/index.html": "en",
    "/var/www/album.hockey-stars.com/ru/index.html": "ru",
}

REPLACEMENTS = {
    "en": [
        ("Free sample", "Contact"),
        ("Get a free sample! →", "Submit request →"),
        ("Get a free sample →", "Submit request →"),
        ("Get a free sample", "Submit request"),
        (
            "Request a free sample kit — we'll ship it at no cost so you can feel the quality. "
            "Team pricing is transparent ($49–$69 per player for teams of 12+), with free US shipping included. "
            "Payment is due only after you receive your order.",
            "Leave your details and we will contact you to discuss your team album. "
            "Team pricing is transparent ($49–$69 per player for teams of 12+), with free US shipping included. "
            "Payment is due only after you receive your order.",
        ),
        (
            "player pricing, free US shipping, and a free sample kit to start.",
            "player pricing and free US shipping.",
        ),
        ("Request a free sample", "Submit request"),
    ],
    "ru": [
        ("Получить пример бесплатно! →", "Оставить заявку →"),
        ("Получить пример бесплатно →", "Оставить заявку →"),
        ("Получить пример бесплатно", "Оставить заявку"),
        ("получите пример бесплатно.", "оставьте заявку — мы свяжемся с вами."),
        (
            "Оставьте заявку, и мы свяжемся с вами для обсуждения деталей. С",
            "Оставьте заявку — мы свяжемся с вами для обсуждения деталей. С",
        ),
    ],
}


def patch(content: str, lang: str) -> str:
    for old, new in REPLACEMENTS[lang]:
        content = content.replace(old, new)
    return content


def main() -> int:
    password = os.environ.get("VPS_PASS", "").strip()
    if not password:
        print("Set VPS_PASS", file=sys.stderr)
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=password, timeout=60)
    sftp = client.open_sftp()

    for path, lang in FILES.items():
        try:
            with sftp.open(path, "r") as remote:
                html = remote.read().decode("utf-8", errors="replace")
        except FileNotFoundError:
            print(f"skip {path}")
            continue
        patched = patch(html, lang)
        if patched == html:
            print(f"unchanged {path}")
            continue
        with sftp.open(path, "w") as remote:
            remote.write(patched)
        print(f"patched {path}")

    sftp.close()
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
