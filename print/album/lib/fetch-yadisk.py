#!/usr/bin/env python3
"""Download public Yandex Disk folder/file into a local directory."""
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'


def api(path, public_key, **params):
    q = urllib.parse.urlencode({'public_key': public_key, **params})
    url = f'https://cloud-api.yandex.net/v1/disk/public/resources/{path}?{q}'
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def download_url(public_key, dest: Path):
    href = api('download', public_key)['href']
    req = urllib.request.Request(href, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=600) as r:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(r.read())
    print(f'✔ {dest.relative_to(dest.parent.parent.parent) if len(dest.parts) > 3 else dest.name} ({dest.stat().st_size // 1024} KB)')


def download_file_in_folder(public_key, file_path, dest: Path):
    q = urllib.parse.urlencode({'public_key': public_key, 'path': file_path})
    req = urllib.request.Request(
        f'https://cloud-api.yandex.net/v1/disk/public/resources/download?{q}',
        headers={'User-Agent': UA},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        href = json.loads(r.read())['href']
    req2 = urllib.request.Request(href, headers={'User-Agent': UA})
    with urllib.request.urlopen(req2, timeout=600) as r:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(r.read())
    print(f'✔ {dest.name} ({dest.stat().st_size // 1024} KB)')


def download_folder(public_key, out: Path):
    info = api('', public_key, limit=500)
    items = info.get('_embedded', {}).get('items', [])
    if not items and info.get('type') == 'file':
        download_url(public_key, out / info.get('name', 'file'))
        return
    for it in items:
        name = it['name']
        dest = out / name
        if it['type'] == 'dir':
            download_folder(public_key, dest)  # nested: pass same key + path prefix if needed
        else:
            download_file_in_folder(public_key, it['path'], dest)


def main():
    if len(sys.argv) < 3:
        print('Usage: fetch-yadisk.py <public_url> <out_dir>', file=sys.stderr)
        sys.exit(1)
    download_folder(sys.argv[1], Path(sys.argv[2]))


if __name__ == '__main__':
    main()
