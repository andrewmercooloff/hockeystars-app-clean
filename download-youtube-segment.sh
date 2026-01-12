#!/bin/bash

# Скрипт для скачивания YouTube видео по промежутку времени
# Использование: ./download-youtube-segment.sh "https://youtube.com/watch?v=..." "1:25" 30

if [ $# -lt 2 ]; then
    echo "Использование: $0 <URL> <Время_начала> [Длительность_в_секундах] [Выходной_файл]"
    echo "Пример: $0 'https://youtube.com/watch?v=...' '1:25' 30"
    echo ""
    echo "Параметры:"
    echo "  URL - ссылка на YouTube видео"
    echo "  Время_начала - формат ММ:СС или ЧЧ:ММ:СС (например: 1:25 или 0:1:25)"
    echo "  Длительность - в секундах (по умолчанию 30)"
    echo "  Выходной_файл - имя файла (по умолчанию youtube_segment_TIMESTAMP.mp4)"
    exit 1
fi

URL="$1"
START_TIME="$2"
DURATION="${3:-30}"  # По умолчанию 30 секунд
OUTPUT_FILE="${4:-}"

echo "📥 Скачивание YouTube видео по промежутку времени"
echo ""

# Проверка наличия yt-dlp
if ! command -v yt-dlp &> /dev/null; then
    echo "❌ yt-dlp не найден!"
    echo ""
    echo "Установите yt-dlp:"
    echo "  pip install yt-dlp"
    echo "  или: brew install yt-dlp"
    echo "  или скачайте с: https://github.com/yt-dlp/yt-dlp/releases"
    exit 1
fi

# Проверка наличия ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg не найден!"
    echo ""
    echo "Установите ffmpeg:"
    echo "  brew install ffmpeg"
    echo "  или: apt-get install ffmpeg"
    echo "  или скачайте с: https://ffmpeg.org/download.html"
    exit 1
fi

echo "✅ yt-dlp найден: $(which yt-dlp)"
echo "✅ ffmpeg найден: $(which ffmpeg)"
echo ""

# Конвертация времени в секунды
time_to_seconds() {
    local time_str="$1"
    IFS=':' read -ra PARTS <<< "$time_str"
    
    if [ ${#PARTS[@]} -eq 3 ]; then
        # Формат ЧЧ:ММ:СС
        local hours=${PARTS[0]}
        local minutes=${PARTS[1]}
        local seconds=${PARTS[2]}
        echo $((hours * 3600 + minutes * 60 + seconds))
    elif [ ${#PARTS[@]} -eq 2 ]; then
        # Формат ММ:СС
        local minutes=${PARTS[0]}
        local seconds=${PARTS[1]}
        echo $((minutes * 60 + seconds))
    else
        echo "❌ Неверный формат времени. Используйте ММ:СС или ЧЧ:ММ:СС" >&2
        exit 1
    fi
}

START_SECONDS=$(time_to_seconds "$START_TIME")

echo "📋 Параметры:"
echo "  URL: $URL"
echo "  Время начала: $START_TIME ($START_SECONDS секунд)"
echo "  Длительность: $DURATION секунд"
echo ""

# Генерация имени файла, если не указано
if [ -z "$OUTPUT_FILE" ]; then
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    OUTPUT_FILE="youtube_segment_${TIMESTAMP}.mp4"
fi

echo "💾 Выходной файл: $OUTPUT_FILE"
echo ""

# Временный файл
TEMP_FILE="temp_youtube_$(date +%s).mp4"

# Скачиваем видео
echo "📥 Скачивание видео..."
yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o "$TEMP_FILE" "$URL"

if [ ! -f "$TEMP_FILE" ]; then
    echo "❌ Ошибка при скачивании видео"
    exit 1
fi

echo "✅ Видео скачано"
echo ""

# Обрезаем видео
echo "✂️  Обрезка видео (с $START_TIME, длительность $DURATION сек)..."
ffmpeg -i "$TEMP_FILE" -ss "$START_SECONDS" -t "$DURATION" -c copy -avoid_negative_ts make_zero "$OUTPUT_FILE"

if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo ""
    echo "✅ Готово! Файл сохранен: $OUTPUT_FILE"
    echo "   Размер: $FILE_SIZE"
else
    echo "❌ Ошибка при обрезке видео"
fi

# Удаляем временный файл
if [ -f "$TEMP_FILE" ]; then
    rm "$TEMP_FILE"
    echo "🧹 Временный файл удален"
fi

echo ""
echo "🎉 Завершено!"










