#!/bin/bash
# Запустить на VPS (Timeweb → Cloud Shell или ssh root@5.42.123.84)
set -euo pipefail

echo "=== Album site root ==="
for d in /var/www/album.hockey-stars.com /var/www/album /var/www/hockeystars-album; do
  [ -f "$d/send.php" ] && echo "FOUND $d"
done
find /var/www -maxdepth 3 -name send.php 2>/dev/null

echo ""
echo "=== Lead files ==="
find /var/www -maxdepth 4 \( -name 'leads.ndjson' -o -name 'leads.json' -o -name 'submissions*.log' \) 2>/dev/null -print -exec wc -l {} \;

echo ""
echo "=== Recent POST send.php (nginx) ==="
grep -h 'POST.*send\.php' /var/log/nginx/access.log /var/log/nginx/access.log.* 2>/dev/null | tail -50 || true

echo ""
echo "=== send.php mail config hint ==="
grep -E 'mail|smtp|support@|HS_' /var/www/*/send.php /var/www/*/*/send.php 2>/dev/null | head -30 || true

echo ""
echo "=== If leads.ndjson exists, last 20 entries ==="
for f in /var/www/album/data/leads.ndjson /var/www/album.hockey-stars.com/data/leads.ndjson; do
  if [ -f "$f" ]; then
    echo "--- $f ---"
    tail -20 "$f"
  fi
done
