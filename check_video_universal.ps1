# Универсальный скрипт для проверки видео для App Store
param(
    [Parameter(Mandatory=$false)]
    [string]$VideoPath = ""
)

Write-Host "=== ПРОВЕРКА ВИДЕО ДЛЯ APP STORE ===" -ForegroundColor Cyan
Write-Host ""

# Поиск файла, если путь не указан
if ([string]::IsNullOrEmpty($VideoPath)) {
    Write-Host "Поиск видео файлов..." -ForegroundColor Yellow
    
    $possiblePaths = @(
        "$env:USERPROFILE\Downloads\IMG_5198.MOV",
        "$env:USERPROFILE\Downloads\IMG_5198.mov",
        "$env:USERPROFILE\Desktop\IMG_5198.MOV",
        "$env:USERPROFILE\Desktop\IMG_5198.mov"
    )
    
    $found = $false
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $VideoPath = $path
            $found = $true
            Write-Host "Найден файл: $VideoPath" -ForegroundColor Green
            break
        }
    }
    
    if (-not $found) {
        # Ищем последние MOV файлы
        $recentMovs = Get-ChildItem -Path "$env:USERPROFILE\Downloads" -Filter "*.MOV" -ErrorAction SilentlyContinue | 
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        
        if ($recentMovs) {
            $VideoPath = $recentMovs.FullName
            Write-Host "Найден последний MOV файл: $VideoPath" -ForegroundColor Green
            $found = $true
        }
    }
    
    if (-not $found) {
        Write-Host "Файл IMG_5198.MOV не найден в стандартных местах." -ForegroundColor Red
        Write-Host ""
        Write-Host "Укажите полный путь к файлу:" -ForegroundColor Yellow
        Write-Host "  .\check_video_universal.ps1 -VideoPath `"C:\путь\к\файлу\IMG_5198.MOV`"" -ForegroundColor White
        Write-Host ""
        Write-Host "Или перетащите файл в папку Downloads с именем IMG_5198.MOV" -ForegroundColor Yellow
        exit
    }
}

# Проверка существования файла
if (-not (Test-Path $VideoPath)) {
    Write-Host "Ошибка: Файл не найден: $VideoPath" -ForegroundColor Red
    exit
}

$fileInfo = Get-Item $VideoPath
Write-Host "=== ИНФОРМАЦИЯ О ФАЙЛЕ ===" -ForegroundColor Green
Write-Host "  Имя: $($fileInfo.Name)"
Write-Host "  Размер: $([math]::Round($fileInfo.Length / 1MB, 2)) MB"
Write-Host "  Дата: $($fileInfo.LastWriteTime)"
Write-Host ""

# Проверка размера
if ($fileInfo.Length -gt 500MB) {
    Write-Host "⚠ Размер файла превышает 500 MB!" -ForegroundColor Red
} else {
    Write-Host "✓ Размер файла в пределах нормы (макс. 500 MB)" -ForegroundColor Green
}

# Проверка расширения
$validExtensions = @('.mov', '.mp4', '.m4v')
if ($fileInfo.Extension.ToLower() -in $validExtensions) {
    Write-Host "✓ Формат файла поддерживается" -ForegroundColor Green
} else {
    Write-Host "⚠ Формат файла может быть не поддерживаемым: $($fileInfo.Extension)" -ForegroundColor Yellow
}

Write-Host ""

# Проверка наличия ffprobe
$ffprobePath = Get-Command ffprobe -ErrorAction SilentlyContinue
if (-not $ffprobePath) {
    Write-Host "=== FFMPEG НЕ УСТАНОВЛЕН ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Для детального анализа видео необходимо установить FFmpeg:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Через winget (рекомендуется):" -ForegroundColor Cyan
    Write-Host "   winget install ffmpeg" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Или скачайте с официального сайта:" -ForegroundColor Cyan
    Write-Host "   https://ffmpeg.org/download.html" -ForegroundColor White
    Write-Host ""
    Write-Host "3. После установки перезапустите PowerShell и запустите скрипт снова" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "=== БАЗОВАЯ ПРОВЕРКА БЕЗ FFMPEG ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Требования App Store:" -ForegroundColor Green
    Write-Host "  ✓ Формат: .mov, .m4v, .mp4"
    Write-Host "  ✓ Кодек видео: H.264 или ProRes 422 (HQ)"
    Write-Host "  ✓ Частота кадров: максимум 30 fps"
    Write-Host "  ✓ Длительность: 15-30 секунд"
    Write-Host "  ✓ Размер: максимум 500 MB"
    Write-Host "  ✓ Аудио: AAC, 256 kbps, 44.1/48 kHz, стерео"
    Write-Host ""
    Write-Host "Для проверки кодека и других параметров установите FFmpeg." -ForegroundColor Yellow
    exit
}

Write-Host "=== ДЕТАЛЬНЫЙ АНАЛИЗ С FFMPEG ===" -ForegroundColor Cyan
Write-Host ""

# Анализ видео
try {
    Write-Host "Анализ видео потока..." -ForegroundColor Yellow
    $videoJson = & ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,duration,bit_rate -show_entries format=duration,size,bit_rate -of json "$VideoPath" 2>&1
    $videoInfo = $videoJson | ConvertFrom-Json
    
    Write-Host "=== ПАРАМЕТРЫ ВИДЕО ===" -ForegroundColor Green
    
    if ($videoInfo.streams -and $videoInfo.streams.Count -gt 0) {
        $stream = $videoInfo.streams[0]
        
        # Кодек
        $codec = $stream.codec_name
        if ($codec -eq "h264") {
            Write-Host "  ✓ Кодек: H.264 (соответствует требованиям)" -ForegroundColor Green
        } elseif ($codec -eq "prores") {
            Write-Host "  ✓ Кодек: ProRes (соответствует требованиям)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Кодек: $codec (должен быть H.264 или ProRes 422)" -ForegroundColor Red
        }
        
        # Разрешение
        Write-Host "  Разрешение: $($stream.width)x$($stream.height)"
        
        # Частота кадров
        if ($stream.r_frame_rate) {
            $fpsParts = $stream.r_frame_rate.Split('/')
            if ($fpsParts.Length -eq 2 -and $fpsParts[1] -ne "0") {
                $fps = [double]$fpsParts[0] / [double]$fpsParts[1]
                $fpsRounded = [math]::Round($fps, 2)
                if ($fps -le 30) {
                    Write-Host "  ✓ Частота кадров: $fpsRounded fps (соответствует требованиям)" -ForegroundColor Green
                } else {
                    Write-Host "  ✗ Частота кадров: $fpsRounded fps (превышает максимум 30 fps!)" -ForegroundColor Red
                }
            }
        }
        
        # Длительность
        $duration = $null
        if ($stream.duration) {
            $duration = [double]$stream.duration
        } elseif ($videoInfo.format.duration) {
            $duration = [double]$videoInfo.format.duration
        }
        
        if ($duration) {
            $durationRounded = [math]::Round($duration, 2)
            if ($duration -ge 15 -and $duration -le 30) {
                Write-Host "  ✓ Длительность: $durationRounded сек (соответствует требованиям)" -ForegroundColor Green
            } elseif ($duration -lt 15) {
                Write-Host "  ✗ Длительность: $durationRounded сек (минимум 15 секунд!)" -ForegroundColor Red
            } else {
                Write-Host "  ✗ Длительность: $durationRounded сек (максимум 30 секунд!)" -ForegroundColor Red
            }
        }
        
        # Битрейт видео
        if ($stream.bit_rate) {
            $bitrateMB = [math]::Round([int]$stream.bit_rate / 1000000, 2)
            Write-Host "  Битрейт видео: $bitrateMB Mbps"
        }
    } else {
        Write-Host "  ⚠ Видео поток не найден" -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    # Анализ аудио
    Write-Host "Анализ аудио потока..." -ForegroundColor Yellow
    $audioJson = & ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels,bit_rate -of json "$VideoPath" 2>&1
    $audioInfo = $audioJson | ConvertFrom-Json
    
    Write-Host "=== ПАРАМЕТРЫ АУДИО ===" -ForegroundColor Green
    
    if ($audioInfo.streams -and $audioInfo.streams.Count -gt 0) {
        $audioStream = $audioInfo.streams[0]
        
        # Кодек аудио
        $audioCodec = $audioStream.codec_name
        if ($audioCodec -eq "aac") {
            Write-Host "  ✓ Кодек: AAC (соответствует требованиям)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Кодек: $audioCodec (должен быть AAC)" -ForegroundColor Red
        }
        
        # Частота дискретизации
        if ($audioStream.sample_rate) {
            $sampleRate = [int]$audioStream.sample_rate
            if ($sampleRate -eq 44100 -or $sampleRate -eq 48000) {
                Write-Host "  ✓ Частота дискретизации: $sampleRate Hz (соответствует требованиям)" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Частота дискретизации: $sampleRate Hz (должна быть 44100 или 48000 Hz)" -ForegroundColor Red
            }
        }
        
        # Каналы
        if ($audioStream.channels) {
            $channels = [int]$audioStream.channels
            if ($channels -eq 2) {
                Write-Host "  ✓ Каналы: $channels (стерео, соответствует требованиям)" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Каналы: $channels (должно быть стерео - 2 канала)" -ForegroundColor Red
            }
        }
        
        # Битрейт аудио
        if ($audioStream.bit_rate) {
            $audioBitrate = [math]::Round([int]$audioStream.bit_rate / 1000, 0)
            if ($audioBitrate -eq 256) {
                Write-Host "  ✓ Битрейт: $audioBitrate kbps (соответствует требованиям)" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Битрейт: $audioBitrate kbps (должен быть 256 kbps)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  ⚠ Аудио поток не найден (видео без звука)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "=== РЕЗУЛЬТАТ ===" -ForegroundColor Cyan
    
    # Подсчет проблем
    $issues = @()
    if ($videoInfo.streams) {
        $stream = $videoInfo.streams[0]
        if ($stream.codec_name -ne "h264" -and $stream.codec_name -ne "prores") {
            $issues += "Кодек видео должен быть H.264 или ProRes"
        }
        if ($stream.r_frame_rate) {
            $fpsParts = $stream.r_frame_rate.Split('/')
            if ($fpsParts.Length -eq 2 -and $fpsParts[1] -ne "0") {
                $fps = [double]$fpsParts[0] / [double]$fpsParts[1]
                if ($fps -gt 30) {
                    $issues += "Частота кадров превышает 30 fps"
                }
            }
        }
        $duration = $null
        if ($stream.duration) { $duration = [double]$stream.duration }
        elseif ($videoInfo.format.duration) { $duration = [double]$videoInfo.format.duration }
        if ($duration) {
            if ($duration -lt 15 -or $duration -gt 30) {
                $issues += "Длительность должна быть 15-30 секунд"
            }
        }
    }
    
    if ($audioInfo.streams) {
        $audioStream = $audioInfo.streams[0]
        if ($audioStream.codec_name -ne "aac") {
            $issues += "Кодек аудио должен быть AAC"
        }
        if ($audioStream.sample_rate -and $audioStream.sample_rate -ne 44100 -and $audioStream.sample_rate -ne 48000) {
            $issues += "Частота дискретизации должна быть 44100 или 48000 Hz"
        }
        if ($audioStream.channels -and $audioStream.channels -ne 2) {
            $issues += "Аудио должно быть стерео (2 канала)"
        }
        if ($audioStream.bit_rate) {
            $audioBitrate = [int]$audioStream.bit_rate / 1000
            if ($audioBitrate -ne 256) {
                $issues += "Битрейт аудио должен быть 256 kbps"
            }
        }
    }
    
    if ($issues.Count -eq 0) {
        Write-Host "✓ Все параметры соответствуют требованиям App Store!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Видео готово к загрузке в App Store Connect." -ForegroundColor Green
    } else {
        Write-Host "Найдены проблемы:" -ForegroundColor Red
        foreach ($issue in $issues) {
            Write-Host "  ✗ $issue" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "=== КОМАНДА ДЛЯ ИСПРАВЛЕНИЯ ===" -ForegroundColor Cyan
        $outputPath = Join-Path $fileInfo.DirectoryName "$($fileInfo.BaseName)_fixed.mov"
        Write-Host ""
        Write-Host "Запустите эту команду для исправления:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "ffmpeg -i `"$VideoPath`" -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -r 30 -c:a aac -b:a 256k -ar 48000 -ac 2 -t 30 `"$outputPath`"" -ForegroundColor White
        Write-Host ""
    }
    
} catch {
    Write-Host "Ошибка при анализе видео: $_" -ForegroundColor Red
    Write-Host "Убедитесь, что FFmpeg установлен правильно." -ForegroundColor Yellow
}















