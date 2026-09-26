#!/usr/bin/env python3
"""Scrape FHSPb team roster + coach list and download portrait photos."""
import csv
import re
import sys
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path

POSITIONS = {
    'Вр': 'Вратарь', 'Зщ': 'Защитник', 'Нп': 'Нападающий',
    'В': 'Вратарь', 'З': 'Защитник', 'Н': 'Нападающий',
}

ROW_RE = re.compile(
    r'<tr>\s*'
    r'<td>\s*<span class="label">№<b>(\d+)</b></span>\s*</td>\s*'
    r'<td>\s*<a[^>]+><img src="([^"]+)"[^>]*alt="([^"]*)"[^>]*/></a>\s*</td>\s*'
    r'<td>\s*<h5>\s*<a[^>]+>([^<]+)</a>\s*</h5>(.*?)</td>',
    re.S,
)
COACH_RE = re.compile(
    r'<tr>\s*<td>\s*<a href="Person\?[^"]+"><img src="([^"]+)"[^>]*alt=[\'"]([^\'"]*)[\'"][^>]*/></a>\s*</td>\s*'
    r'<td>\s*<h5>\s*<a[^>]+>([^<]+)</a>\s*</h5>\s*([^<]+)\s*</td>',
    re.S,
)


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'hockeystars-album/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


def split_name(full):
    full = re.sub(r'\s+', ' ', unescape(full.strip()))
    parts = full.split(' ')
    if len(parts) >= 3:
        return parts[0], ' '.join(parts[1:])
    if len(parts) == 2:
        return parts[0], parts[1]
    return full, ''


def parse_role(ka):
    ka = (ka or '').strip()
    if ka == 'К':
        return 'К'
    if ka == 'А':
        return 'А'
    return ''


def parse_players(html):
    rows = []
    for m in ROW_RE.finditer(html):
        number, img, alt, fio, rest = m.groups()
        chunk = rest + html[m.end(): m.end() + 800]
        ka = ''
        ka_m = re.search(r'<span class="label ka[^"]*">([^<]*)</span>', chunk)
        if ka_m:
            ka = ka_m.group(1).strip()
        pos = ''
        for cell in re.findall(r'<td[^>]*>\s*([^<]+?)\s*</td>', chunk):
            raw = cell.strip()
            if raw in POSITIONS or raw in ('Вр', 'Зщ', 'Нп'):
                pos = POSITIONS.get(raw, raw)
                break
        surname, name = split_name(alt or fio)
        if name and ' ' in name:
            parts = name.split(' ', 1)
            name = parts[0]
        rows.append({
            'number': number,
            'surname': surname,
            'name': name,
            'position': pos,
            'role': parse_role(ka),
            'photo_url': img,
            'type': 'player',
        })
    return rows


def parse_coaches(html):
    # coaches table follows players; match simpler pattern
    coaches = []
    for m in COACH_RE.finditer(html):
        img, alt, fio, title = m.groups()
        surname, name = split_name(fio)
        if not surname:
            surname, name = split_name(alt)
        coaches.append({
            'number': '',
            'surname': surname,
            'name': name,
            'position': unescape(title.strip()),
            'role': '',
            'photo_url': img,
            'type': 'coach',
        })
    return coaches


def download_photo(base_url, rel, dest: Path):
    if rel.startswith('http'):
        url = rel
    else:
        root = base_url.split('/Team')[0]
        url = urllib.parse.urljoin(root + '/', rel)
    if 'Size=M' in url:
        url = url.replace('Size=M', 'Size=L')
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        return
    req = urllib.request.Request(url, headers={'User-Agent': 'hockeystars-album/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())


def slug_photo(row):
    num = row['number'] or '0'
    if row['number']:
        return f"{num}.jpg"
    base = re.sub(r'[^\w\-]+', '-', row['surname'], flags=re.UNICODE).strip('-').lower()
    return f"coach-{base}.jpg"


def write_csv(path: Path, rows):
    fields = ['number', 'surname', 'name', 'position', 'role', 'photo', 'type']
    with path.open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fields, delimiter=';')
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, '') for k in fields})


def main():
    if len(sys.argv) < 4:
        print('Usage: fetch-fhspb.py <year> <team_url> <out_dir>', file=sys.stderr)
        sys.exit(1)
    year, url, out_dir = sys.argv[1], sys.argv[2], Path(sys.argv[3])
    html = fetch(url)
    if 'Заявка не заполнена' in html and '№<b>' not in html:
        print(f'⚠ {year}: roster empty on FHSPb')
        write_csv(out_dir / f'{year}.csv', [])
        return
    players = parse_players(html)
    coaches = parse_coaches(html)
    rows = coaches + players
    photos_dir = out_dir / 'photos' / year
    for row in rows:
        if row.get('photo_url'):
            fname = slug_photo(row)
            try:
                download_photo(url, row['photo_url'], photos_dir / fname)
                row['photo'] = f'photos/{year}/{fname}'
            except Exception as e:
                print(f'  photo fail {row["surname"]}: {e}')
                row['photo'] = ''
        else:
            row['photo'] = ''
        row.pop('photo_url', None)
    write_csv(out_dir / f'{year}.csv', rows)
    print(f'✔ {year}: {len(coaches)} coaches, {len(players)} players → {out_dir}/{year}.csv')


if __name__ == '__main__':
    main()
