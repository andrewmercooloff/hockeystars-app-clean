# Простая проверка видео
$file = "IMG_5198.MOV"

Write-Host "Проверка файла: $file" -ForegroundColor Cyan

if (-not (Test-Path $file)) {
    Write-Host "Файл не найден!" -ForegroundColor Red
    exit
}

$info = Get-Item $file
Write-Host "Размер: $([math]::Round($info.Length/1MB,2)) MB" -ForegroundColor Green

# Проверка FFprobe
$ffprobe = Get-Command ffprobe -ErrorAction SilentlyContinue
if (-not $ffprobe) {
    Write-Host ""
    Write-Host "FFprobe не установлен!" -ForegroundColor Yellow
    Write-Host "Установите FFmpeg: winget install ffmpeg" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Базовые требования App Store:" -ForegroundColor Green
    Write-Host "  - Формат: .mov, .m4v, .mp4"
    Write-Host "  - Кодек: H.264 или ProRes 422"
    Write-Host "  - FPS: максимум 30"
    Write-Host "  - Длительность: 15-30 сек"
    Write-Host "  - Размер: максимум 500 MB"
    Write-Host "  - Аудио: AAC, 256 kbps, 44.1/48 kHz, стерео"
    exit
}

Write-Host ""
Write-Host "Анализ видео..." -ForegroundColor Yellow

# Получаем информацию
$json = & ffprobe -v quiet -print_format json -show_format -show_streams $file 2>&1
$data = $json | ConvertFrom-Json

# Видео поток
$video = $data.streams | Where-Object { $_.codec_type -eq 'video' } | Select-Object -First 1
if ($video) {
    Write-Host ""
    Write-Host "=== ВИДЕО ===" -ForegroundColor Green
    Write-Host "Кодек: $($video.codec_name)" -ForegroundColor $(if ($video.codec_name -eq 'h264') { 'Green' } else { 'Red' })
    Write-Host "Разрешение: $($video.width)x$($video.height)"
    
    if ($video.r_frame_rate) {
        $fpsParts = $video.r_frame_rate.Split('/')
        $fps = [double]$fpsParts[0] / [double]$fpsParts[1]
        Write-Host "FPS: $([math]::Round($fps,2))" -ForegroundColor $(if ($fps -le 30) { 'Green' } else { 'Red' })
        if ($fps -gt 30) {
            Write-Host "  ⚠ ПРЕВЫШАЕТ 30 FPS!" -ForegroundColor Red
        }
    }
}

# Длительность
$duration = [double]$data.format.duration
Write-Host "Длительность: $([math]::Round($duration,2)) сек" -ForegroundColor $(if ($duration -ge 15 -and $duration -le 30) { 'Green' } else { 'Red' })
if ($duration -lt 15) {
    Write-Host "  ⚠ МЕНЬШЕ 15 СЕКУНД!" -ForegroundColor Red
} elseif ($duration -gt 30) {
    Write-Host "  ⚠ БОЛЬШЕ 30 СЕКУНД!" -ForegroundColor Red
}

# Аудио поток
$audio = $data.streams | Where-Object { $_.codec_type -eq 'audio' } | Select-Object -First 1
if ($audio) {
    Write-Host ""
    Write-Host "=== АУДИО ===" -ForegroundColor Green
    Write-Host "Кодек: $($audio.codec_name)" -ForegroundColor $(if ($audio.codec_name -eq 'aac') { 'Green' } else { 'Red' })
    Write-Host "Частота: $($audio.sample_rate) Hz" -ForegroundColor $(if ($audio.sample_rate -eq 44100 -or $audio.sample_rate -eq 48000) { 'Green' } else { 'Yellow' })
    Write-Host "Каналы: $($audio.channels)" -ForegroundColor $(if ($audio.channels -eq 2) { 'Green' } else { 'Yellow' })
    if ($audio.bit_rate) {
        $bitrate = [math]::Round([int]$audio.bit_rate / 1000, 0)
        Write-Host "Битрейт: $bitrate kbps" -ForegroundColor $(if ($bitrate -eq 256) { 'Green' } else { 'Yellow' })
    }
}

Write-Host ""
Write-Host "=== РЕЗУЛЬТАТ ===" -ForegroundColor Cyan

$issues = @()
if ($video.codec_name -ne 'h264' -and $video.codec_name -ne 'prores') {
    $issues += "Кодек должен быть H.264"
}
if ($video.r_frame_rate) {
    $fpsParts = $video.r_frame_rate.Split('/')
    $fps = [double]$fpsParts[0] / [double]$fpsParts[1]
    if ($fps -gt 30) { $issues += "FPS превышает 30" }
}
if ($duration -lt 15 -or $duration -gt 30) {
    $issues += "Длительность должна быть 15-30 сек"
}
if ($audio -and $audio.codec_name -ne 'aac') {
    $issues += "Аудио кодек должен быть AAC"
}

if ($issues.Count -eq 0) {
    Write-Host "✓ Видео соответствует требованиям App Store!" -ForegroundColor Green
} else {
    Write-Host "Найдены проблемы:" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "  ✗ $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Команда для исправления:" -ForegroundColor Cyan
    Write-Host "ffmpeg -i `"$file`" -c:v libx264 -profile:v high -r 30 -c:a aac -b:a 256k -ar 48000 -ac 2 -t 30 `"${file}_fixed.mov`"" -ForegroundColor White
}












