"""Add download.* keys to locale JSON files (en + others with EN text fallback ok via en)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "locales"

KEYS = {
    "en": {
        "installTitle": "Install the app",
        "scanQr": "Scan with your phone — App Store or Google Play opens automatically",
        "appStoreCta": "Get it on the App Store",
        "playStoreCta": "Get it on Google Play",
    },
    "ru": {
        "installTitle": "Установить приложение",
        "scanQr": "Наведите камеру телефона — откроется App Store или Google Play",
        "appStoreCta": "Скачать в App Store",
        "playStoreCta": "Скачать в Google Play",
    },
}

# Light translations for other app languages
OTHER = {
    "lt": {
        "installTitle": "Įdiegti programėlę",
        "scanQr": "Nuskaitykite telefonu — atsidarys App Store arba Google Play",
        "appStoreCta": "Atsisiųsti iš App Store",
        "playStoreCta": "Atsisiųsti iš Google Play",
    },
    "lv": {
        "installTitle": "Instalēt lietotni",
        "scanQr": "Noskenējiet ar tālruni — atvērsies App Store vai Google Play",
        "appStoreCta": "Lejupielādēt App Store",
        "playStoreCta": "Lejupielādēt Google Play",
    },
    "pl": {
        "installTitle": "Zainstaluj aplikację",
        "scanQr": "Zeskanuj telefonem — otworzy się App Store lub Google Play",
        "appStoreCta": "Pobierz z App Store",
        "playStoreCta": "Pobierz z Google Play",
    },
    "de": {
        "installTitle": "App installieren",
        "scanQr": "Mit dem Handy scannen — App Store oder Google Play öffnet sich",
        "appStoreCta": "Im App Store laden",
        "playStoreCta": "Bei Google Play laden",
    },
    "fr": {
        "installTitle": "Installer l'application",
        "scanQr": "Scannez avec votre téléphone — App Store ou Google Play s'ouvre",
        "appStoreCta": "Télécharger sur l'App Store",
        "playStoreCta": "Télécharger sur Google Play",
    },
    "it": {
        "installTitle": "Installa l'app",
        "scanQr": "Scansiona con il telefono — si apre App Store o Google Play",
        "appStoreCta": "Scarica dall'App Store",
        "playStoreCta": "Scarica da Google Play",
    },
    "sv": {
        "installTitle": "Installera appen",
        "scanQr": "Skanna med telefonen — App Store eller Google Play öppnas",
        "appStoreCta": "Ladda ner från App Store",
        "playStoreCta": "Ladda ner från Google Play",
    },
    "cs": {
        "installTitle": "Nainstalovat aplikaci",
        "scanQr": "Naskenujte telefonem — otevře se App Store nebo Google Play",
        "appStoreCta": "Stáhnout z App Store",
        "playStoreCta": "Stáhnout z Google Play",
    },
    "sk": {
        "installTitle": "Nainštalovať aplikáciu",
        "scanQr": "Naskenujte telefónom — otvorí sa App Store alebo Google Play",
        "appStoreCta": "Stiahnuť z App Store",
        "playStoreCta": "Stiahnuť z Google Play",
    },
    "fi": {
        "installTitle": "Asenna sovellus",
        "scanQr": "Skannaa puhelimella — App Store tai Google Play avautuu",
        "appStoreCta": "Lataa App Storesta",
        "playStoreCta": "Lataa Google Playsta",
    },
}

def patch(lang: str, download_keys: dict):
    path = ROOT / f"{lang}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    block = data.get("download")
    if not isinstance(block, dict):
        block = {}
    block.update(download_keys)
    data["download"] = block
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("patched", lang)

for lang, keys in KEYS.items():
    patch(lang, keys)
for lang, keys in OTHER.items():
    patch(lang, keys)
print("done")
