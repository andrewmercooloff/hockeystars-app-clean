# Скрипт для скачивания YouTube видео по промежутку времени
# Использование: .\download-youtube-segment.ps1 -Url "https://youtube.com/watch?v=..." -StartTime "1:25" -Duration "30"

param(
    [Parameter(Mandatory=$true)]
    [string]$Url,
    
    [Parameter(Mandatory=$true)]
    [string]$StartTime,  # Формат: "ММ:СС" или "ЧЧ:ММ:СС", например "1:25" или "0:1:25"
    
    [Parameter(Mandatory=$false)]
    [string]$Duration = "30",  # Длительность в секундах (по умолчанию 30 сек)
    
    [Parameter(Mandatory=$false)]
    [string]$OutputFile = ""  # Имя выходного файла (если не указано, будет сгенерировано автоматически)
)

Write-Host "📥 Скачивание YouTube видео по промежутку времени" -ForegroundColor Cyan
Write-Host ""

# Проверка наличия yt-dlp
$ytdlp = Get-Command yt-dlp -ErrorAction SilentlyContinue
if (-not $ytdlp) {
    Write-Host "❌ yt-dlp не найден!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Установите yt-dlp:" -ForegroundColor Yellow
    Write-Host "  winget install yt-dlp" -ForegroundColor Cyan
    Write-Host "  или: pip install yt-dlp" -ForegroundColor Cyan
    Write-Host "  или скачайте с: https://github.com/yt-dlp/yt-dlp/releases" -ForegroundColor Cyan
    exit 1
}

# Проверка наличия ffmpeg
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
    Write-Host "❌ ffmpeg не найден!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Установите ffmpeg:" -ForegroundColor Yellow
    Write-Host "  winget install ffmpeg" -ForegroundColor Cyan
    Write-Host "  или скачайте с: https://ffmpeg.org/download.html" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ yt-dlp найден: $($ytdlp.Source)" -ForegroundColor Green
Write-Host "✅ ffmpeg найден: $($ffmpeg.Source)" -ForegroundColor Green
Write-Host ""

# Конвертация времени старта в секунды
function TimeToSeconds {
    param([string]$timeString)
    
    $parts = $timeString.Split(':')
    if ($parts.Length -eq 3) {
        # Формат ЧЧ:ММ:СС
        $hours = [int]$parts[0]
        $minutes = [int]$parts[1]
        $seconds = [int]$parts[2]
        return $hours * 3600 + $minutes * 60 + $seconds
    } elseif ($parts.Length -eq 2) {
        # Формат ММ:СС
        $minutes = [int]$parts[0]
        $seconds = [int]$parts[1]
        return $minutes * 60 + $seconds
    } else {
        Write-Host "❌ Неверный формат времени. Используйте ММ:СС или ЧЧ:ММ:СС" -ForegroundColor Red
        exit 1
    }
}

$startSeconds = TimeToSeconds -timeString $StartTime
$durationSeconds = [int]$Duration

Write-Host "📋 Параметры:" -ForegroundColor Yellow
Write-Host "  URL: $Url"
Write-Host "  Время начала: $StartTime ($startSeconds секунд)"
Write-Host "  Длительность: $Duration секунд"
Write-Host ""

# Генерация имени файла, если не указано
if ([string]::IsNullOrWhiteSpace($OutputFile)) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $OutputFile = "youtube_segment_$timestamp.mp4"
}

Write-Host "💾 Выходной файл: $OutputFile" -ForegroundColor Cyan
Write-Host ""

# Метод 1: Скачать полностью и обрезать (более надежный)
Write-Host "📥 Скачивание видео..." -ForegroundColor Yellow
$tempFile = "temp_youtube_$(Get-Random).mp4"

try {
    # Скачиваем видео в лучшем качестве
    & yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o $tempFile $Url
    
    if (-not (Test-Path $tempFile)) {
        Write-Host "❌ Ошибка при скачивании видео" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Видео скачано" -ForegroundColor Green
    Write-Host ""
    
    # Обрезаем видео через ffmpeg
    Write-Host "✂️  Обрезка видео (с $StartTime, длительность $Duration сек)..." -ForegroundColor Yellow
    
    & ffmpeg -i $tempFile -ss $startSeconds -t $durationSeconds -c copy -avoid_negative_ts make_zero $OutputFile
    
    if (Test-Path $OutputFile) {
        $fileInfo = Get-Item $OutputFile
        Write-Host ""
        Write-Host "✅ Готово! Файл сохранен: $OutputFile" -ForegroundColor Green
        Write-Host "   Размер: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Ошибка при обрезке видео" -ForegroundColor Red
    }
    
} finally {
    # Удаляем временный файл
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
        Write-Host "🧹 Временный файл удален" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🎉 Завершено!" -ForegroundColor Green










