# СКА Стрельна — альбом наклеек

## Уже собрано автоматически

- Составы **2012–2018** + фото с [fhspb.ru](https://fhspb.ru) → `rosters/YYYY.csv`, `rosters/photos/YYYY/`
- Логотип + 4 руководителя (без Филиппова) с [strelna.ska.ru](https://strelna.ska.ru/about/management/)
- Каркас `team.json`, список источников `sources.json`

## Нужно от вас

### Обязательно

1. **Яндекс.Диск** — скачивается автоматически (API `cloud-api.yandex.net`):

```bash
cd print/album
python3 lib/fetch-yadisk.py "https://disk.yandex.ru/d/khSz66eC-SzC_g" teams/ska-strelna/assets/reference/yadisk-albums
python3 -c "
import json,urllib.request,urllib.parse
from pathlib import Path
url='https://disk.yandex.ru/i/owOwSLQj-jcCOw'
d=json.loads(urllib.request.urlopen('https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key='+urllib.parse.quote(url)).read())
Path('teams/ska-strelna/assets/reference/SKA_STRELNA_logo.ai').write_bytes(urllib.request.urlopen(d['href']).read())
"
```

   Уже локально: `SKA_STRELNA_logo.ai`, превью CDR (`assets/reference/cdr-previews/`), фото из папки «Альбомы СКА Стрельна».
   CDR (~73 MB) в git не хранятся — только на диске после загрузки.

2. **Из CDR — фото и ФИО** (в `staff.csv` помечены `УТОЧНИТЬ`):
   - скаут
   - тренер по ОФП
   - PR-менеджер

3. **Командные фото по годам** — по 1–2 на каждый год (2011–2018) для наклеек «Команда YYYY»

4. **2011 год** — на fhspb.ru заявка пустая; нужен состав + фото вручную или ссылка на другую страницу

### Желательно

5. **2019 год** — если нужен в альбоме, дайте ссылку на fhspb.ru (в первом ТЗ был 2019–2011)
6. **Спецразворот**: фото арены, болельщиков, символа клуба
7. **Тексты**: история школы (5–10 пунктов), факты, цитаты хоккеистов
8. **Размер наклеек** — подтвердить по CDR (сейчас черновик 45×60 мм)

## Перезагрузка составов с fhspb

```bash
cd print/album
for y in 2018 2017 2016 2015 2014 2013 2012; do
  url=$(python3 -c "import json; print(json.load(open('teams/ska-strelna/sources.json'))['years']['$y'])")
  python3 lib/fetch-fhspb.py $y "$url" teams/ska-strelna/rosters
done
```
