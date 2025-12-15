$file = "IMG_5198.MOV"
$outputFile = "video_analysis.txt"

Write-Host "Анализ видео: $file" -ForegroundColor Cyan

if (-not (Test-Path $file)) {
    Write-Host "Ошибка: Файл не найден!" -ForegroundColor Red
    exit
}

$info = Get-Item $file
$results = @()
$results += "=== ИНФОРМАЦИЯ О ФАЙЛЕ ==="
$results += "Имя: $($info.Name)"
$results += "Размер: $([math]::Round($info.Length/1MB,2)) MB"
$results += "Дата: $($info.LastWriteTime)"
$results += ""

# Проверка размера
if ($info.Length -gt 500MB) {
    $results += "⚠ РАЗМЕР ПРЕВЫШАЕТ 500 MB!"
} else {
    $results += "✓ Размер в пределах нормы"
}

$results += ""

# Проверка FFprobe
$hasFFprobe = Get-Command ffprobe -ErrorAction SilentlyContinue
if (-not $hasFFprobe) {
    $results += "FFprobe не установлен. Установите FFmpeg: winget install ffmpeg"
    $results | Out-File -FilePath $outputFile -Encoding UTF8
    $results | ForEach-Object { Write-Host $_ }
    exit
}

# Анализ видео
$results += "=== АНАЛИЗ ВИДЕО ==="
try {
    $videoJson = & ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,duration -show_entries format=duration -of json $file 2>&1
    $videoInfo = $videoJson | ConvertFrom-Json
    
    if ($videoInfo.streams -and $videoInfo.streams.Count -gt 0) {
        $s = $videoInfo.streams[0]
        
        # Кодек
        $codec = $s.codec_name
        $results += "Кодек: $codec"
        if ($codec -eq "h264") {
            $results += "✓ Кодек H.264 соответствует требованиям"
        } elseif ($codec -eq "prores") {
            $results += "✓ Кодек ProRes соответствует требованиям"
        } else {
            $results += "✗ Кодек должен быть H.264 или ProRes 422"
        }
        
        # Разрешение
        $results += "Разрешение: $($s.width)x$($s.height)"
        
        # Частота кадров
        if ($s.r_frame_rate) {
            $fpsParts = $s.r_frame_rate.Split('/')
            if ($fpsParts.Length -eq 2 -and $fpsParts[1] -ne "0") {
                $fps = [double]$fpsParts[0] / [double]$fpsParts[1]
                $fpsRounded = [math]::Round($fps, 2)
                $results += "Частота кадров: $fpsRounded fps"
                if ($fps -le 30) {
                    $results += "✓ Частота кадров соответствует требованиям"
                } else {
                    $results += "✗ Частота кадров превышает максимум 30 fps!"
                }
            }
        }
        
        # Длительность
        $duration = $null
        if ($s.duration) {
            $duration = [double]$s.duration
        } elseif ($videoInfo.format.duration) {
            $duration = [double]$videoInfo.format.duration
        }
        
        if ($duration) {
            $durRounded = [math]::Round($duration, 2)
            $results += "Длительность: $durRounded сек"
            if ($duration -ge 15 -and $duration -le 30) {
                $results += "✓ Длительность соответствует требованиям"
            } elseif ($duration -lt 15) {
                $results += "✗ Длительность меньше минимума 15 секунд!"
            } else {
                $results += "✗ Длительность превышает максимум 30 секунд!"
            }
        }
    }
} catch {
    $results += "Ошибка анализа видео: $_"
}

$results += ""
$results += "=== АНАЛИЗ АУДИО ==="
try {
    $audioJson = & ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels,bit_rate -of json $file 2>&1
    $audioInfo = $audioJson | ConvertFrom-Json
    
    if ($audioInfo.streams -and $audioInfo.streams.Count -gt 0) {
        $a = $audioInfo.streams[0]
        
        $results += "Кодек: $($a.codec_name)"
        if ($a.codec_name -eq "aac") {
            $results += "✓ Кодек AAC соответствует требованиям"
        } else {
            $results += "✗ Кодек должен быть AAC"
        }
        
        if ($a.sample_rate) {
            $sr = [int]$a.sample_rate
            $results += "Частота дискретизации: $sr Hz"
            if ($sr -eq 44100 -or $sr -eq 48000) {
                $results += "✓ Частота дискретизации соответствует требованиям"
            } else {
                $results += "✗ Частота дискретизации должна быть 44100 или 48000 Hz"
            }
        }
        
        if ($a.channels) {
            $ch = [int]$a.channels
            $results += "Каналы: $ch"
            if ($ch -eq 2) {
                $results += "✓ Стерео соответствует требованиям"
            } else {
                $results += "✗ Должно быть стерео (2 канала)"
            }
        }
        
        if ($a.bit_rate) {
            $br = [math]::Round([int]$a.bit_rate / 1000, 0)
            $results += "Битрейт: $br kbps"
            if ($br -eq 256) {
                $results += "✓ Битрейт соответствует требованиям"
            } else {
                $results += "✗ Битрейт должен быть 256 kbps"
            }
        }
    } else {
        $results += "Аудио поток не найден (видео без звука)"
    }
} catch {
    $results += "Ошибка анализа аудио: $_"
}

# Сохранение результатов
$results | Out-File -FilePath $outputFile -Encoding UTF8
$results | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "Результаты сохранены в: $outputFile" -ForegroundColor Green















