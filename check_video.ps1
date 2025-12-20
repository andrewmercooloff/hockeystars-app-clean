# Скрипт для проверки параметров видео для App Store
param(
    [string]$VideoPath = "$env:USERPROFILE\Downloads\IMG_5198.MOV"
)

Write-Host "Проверка видео: $VideoPath" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $VideoPath)) {
    Write-Host "Файл не найден: $VideoPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Поиск файла в папке загрузок..." -ForegroundColor Yellow
    
    $foundFiles = Get-ChildItem -Path "$env:USERPROFILE\Downloads" -Filter "*5198*" -ErrorAction SilentlyContinue
    if ($foundFiles) {
        Write-Host "Найдены похожие файлы:" -ForegroundColor Green
        $foundFiles | ForEach-Object {
            Write-Host "  - $($_.FullName)" -ForegroundColor White
        }
    } else {
        Write-Host "Файлы не найдены. Укажите полный путь к файлу." -ForegroundColor Red
    }
    exit
}

$fileInfo = Get-Item $VideoPath
Write-Host "Информация о файле:" -ForegroundColor Green
Write-Host "  Имя: $($fileInfo.Name)"
Write-Host "  Размер: $([math]::Round($fileInfo.Length / 1MB, 2)) MB"
Write-Host "  Дата изменения: $($fileInfo.LastWriteTime)"
Write-Host ""

# Проверка наличия ffprobe
$ffprobePath = Get-Command ffprobe -ErrorAction SilentlyContinue
if (-not $ffprobePath) {
    Write-Host "ffprobe не найден. Установите FFmpeg для детального анализа." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Требования App Store для видео:" -ForegroundColor Cyan
    Write-Host "  ✓ Формат: .mov, .m4v, .mp4"
    Write-Host "  ✓ Кодек видео: H.264 или ProRes 422 (HQ)"
    Write-Host "  ✓ Частота кадров: максимум 30 fps"
    Write-Host "  ✓ Разрешение: должно соответствовать размеру скриншотов устройства"
    Write-Host "  ✓ Длительность: 15-30 секунд"
    Write-Host "  ✓ Размер файла: максимум 500 MB"
    Write-Host "  ✓ Аудио кодек: AAC, 256 kbps, 44.1 или 48 kHz, стерео"
    Write-Host ""
    Write-Host "Для детального анализа установите FFmpeg:" -ForegroundColor Yellow
    Write-Host "  winget install ffmpeg"
    Write-Host "  или скачайте с https://ffmpeg.org/download.html"
    exit
}

Write-Host "Анализ видео с помощью ffprobe..." -ForegroundColor Cyan
Write-Host ""

# Получаем информацию о видео
$videoInfo = & ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,duration,bit_rate -show_entries format=duration,size,bit_rate -of json "$VideoPath" 2>&1 | ConvertFrom-Json

$audioInfo = & ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels,bit_rate -of json "$VideoPath" 2>&1 | ConvertFrom-Json

Write-Host "=== ПАРАМЕТРЫ ВИДЕО ===" -ForegroundColor Green
if ($videoInfo.streams) {
    $stream = $videoInfo.streams[0]
    Write-Host "  Кодек: $($stream.codec_name)" -ForegroundColor $(if ($stream.codec_name -eq "h264") { "Green" } else { "Red" })
    Write-Host "  Разрешение: $($stream.width)x$($stream.height)"
    
    # Проверка разрешения
    $isValidResolution = $false
    $commonResolutions = @(
        @{w=1080; h=1920; name="iPhone портрет"},
        @{w=1920; h=1080; name="iPhone ландшафт"},
        @{w=1290; h=2796; name="iPhone 14 Pro Max портрет"},
        @{w=2796; h=1290; name="iPhone 14 Pro Max ландшафт"},
        @{w=1242; h=2688; name="iPhone XS Max портрет"},
        @{w=2688; h=1242; name="iPhone XS Max ландшафт"}
    )
    
    foreach ($res in $commonResolutions) {
        if ($stream.width -eq $res.w -and $stream.height -eq $res.h) {
            Write-Host "    ✓ Соответствует: $($res.name)" -ForegroundColor Green
            $isValidResolution = $true
            break
        }
    }
    
    if (-not $isValidResolution) {
        Write-Host "    ⚠ Нестандартное разрешение" -ForegroundColor Yellow
    }
    
    # Частота кадров
    if ($stream.r_frame_rate) {
        $fpsParts = $stream.r_frame_rate.Split('/')
        if ($fpsParts.Length -eq 2) {
            $fps = [double]$fpsParts[0] / [double]$fpsParts[1]
            Write-Host "  Частота кадров: $([math]::Round($fps, 2)) fps" -ForegroundColor $(if ($fps -le 30) { "Green" } else { "Red" })
            if ($fps -gt 30) {
                Write-Host "    ✗ Превышает максимум 30 fps!" -ForegroundColor Red
            }
        }
    }
    
    # Длительность
    if ($stream.duration) {
        $duration = [math]::Round([double]$stream.duration, 2)
        Write-Host "  Длительность: $duration секунд" -ForegroundColor $(if ($duration -ge 15 -and $duration -le 30) { "Green" } else { "Yellow" })
        if ($duration -lt 15 -or $duration -gt 30) {
            Write-Host "    ⚠ Должна быть от 15 до 30 секунд" -ForegroundColor Yellow
        }
    }
    
    # Битрейт видео
    if ($stream.bit_rate) {
        $bitrateMB = [math]::Round([int]$stream.bit_rate / 1000000, 2)
        Write-Host "  Битрейт видео: $bitrateMB Mbps"
    }
}

Write-Host ""
Write-Host "=== ПАРАМЕТРЫ АУДИО ===" -ForegroundColor Green
if ($audioInfo.streams) {
    $audioStream = $audioInfo.streams[0]
    Write-Host "  Кодек: $($audioStream.codec_name)" -ForegroundColor $(if ($audioStream.codec_name -eq "aac") { "Green" } else { "Yellow" })
    
    if ($audioStream.sample_rate) {
        $sampleRate = [int]$audioStream.sample_rate
        Write-Host "  Частота дискретизации: $sampleRate Hz" -ForegroundColor $(if ($sampleRate -eq 44100 -or $sampleRate -eq 48000) { "Green" } else { "Yellow" })
        if ($sampleRate -ne 44100 -and $sampleRate -ne 48000) {
            Write-Host "    ⚠ Должна быть 44100 или 48000 Hz" -ForegroundColor Yellow
        }
    }
    
    if ($audioStream.channels) {
        Write-Host "  Каналы: $($audioStream.channels)" -ForegroundColor $(if ($audioStream.channels -eq 2) { "Green" } else { "Yellow" })
        if ($audioStream.channels -ne 2) {
            Write-Host "    ⚠ Должно быть стерео (2 канала)" -ForegroundColor Yellow
        }
    }
    
    if ($audioStream.bit_rate) {
        $audioBitrate = [math]::Round([int]$audioStream.bit_rate / 1000, 0)
        Write-Host "  Битрейт аудио: $audioBitrate kbps" -ForegroundColor $(if ($audioBitrate -eq 256) { "Green" } else { "Yellow" })
        if ($audioBitrate -ne 256) {
            Write-Host "    ⚠ Должен быть 256 kbps" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  Аудио не найдено" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== РЕЗУЛЬТАТ ПРОВЕРКИ ===" -ForegroundColor Cyan

$issues = @()

if ($videoInfo.streams) {
    $stream = $videoInfo.streams[0]
    
    if ($stream.codec_name -ne "h264") {
        $issues += "Кодек видео должен быть H.264 (сейчас: $($stream.codec_name))"
    }
    
    if ($stream.r_frame_rate) {
        $fpsParts = $stream.r_frame_rate.Split('/')
        if ($fpsParts.Length -eq 2) {
            $fps = [double]$fpsParts[0] / [double]$fpsParts[1]
            if ($fps -gt 30) {
                $issues += "Частота кадров превышает 30 fps (сейчас: $([math]::Round($fps, 2)) fps)"
            }
        }
    }
    
    if ($stream.duration) {
        $duration = [double]$stream.duration
        if ($duration -lt 15 -or $duration -gt 30) {
            $issues += "Длительность должна быть 15-30 секунд (сейчас: $([math]::Round($duration, 2)) сек)"
        }
    }
}

if ($audioInfo.streams) {
    $audioStream = $audioInfo.streams[0]
    
    if ($audioStream.codec_name -ne "aac") {
        $issues += "Кодек аудио должен быть AAC (сейчас: $($audioStream.codec_name))"
    }
    
    if ($audioStream.sample_rate -and $audioStream.sample_rate -ne 44100 -and $audioStream.sample_rate -ne 48000) {
        $issues += "Частота дискретизации должна быть 44100 или 48000 Hz (сейчас: $($audioStream.sample_rate) Hz)"
    }
    
    if ($audioStream.channels -and $audioStream.channels -ne 2) {
        $issues += "Аудио должно быть стерео (2 канала) (сейчас: $($audioStream.channels) каналов)"
    }
    
    if ($audioStream.bit_rate) {
        $audioBitrate = [int]$audioStream.bit_rate / 1000
        if ($audioBitrate -ne 256) {
            $issues += "Битрейт аудио должен быть 256 kbps (сейчас: $audioBitrate kbps)"
        }
    }
}

if ($fileInfo.Length -gt 500MB) {
    $issues += "Размер файла превышает 500 MB (сейчас: $([math]::Round($fileInfo.Length / 1MB, 2)) MB)"
}

if ($issues.Count -eq 0) {
    Write-Host "✓ Все параметры соответствуют требованиям App Store!" -ForegroundColor Green
} else {
    Write-Host "Найдены проблемы:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  ✗ $issue" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Команда для исправления (ffmpeg):" -ForegroundColor Cyan
    Write-Host "ffmpeg -i `"$VideoPath`" -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -r 30 -c:a aac -b:a 256k -ar 48000 -ac 2 -t 30 `"$($fileInfo.DirectoryName)\IMG_5198_fixed.mov`"" -ForegroundColor White
}





































