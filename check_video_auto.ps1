# Automatic video analysis for App Store
param(
    [string]$VideoFile = "IMG_5198.MOV"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VIDEO ANALYSIS FOR APP STORE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check file
if (-not (Test-Path $VideoFile)) {
    Write-Host "ERROR: File '$VideoFile' not found!" -ForegroundColor Red
    exit 1
}

$fileInfo = Get-Item $VideoFile
Write-Host "File: $($fileInfo.Name)" -ForegroundColor Green
Write-Host "Size: $([math]::Round($fileInfo.Length/1MB,2)) MB" -ForegroundColor Green
if ($fileInfo.Length -gt 500MB) {
    Write-Host "  WARNING: EXCEEDS 500 MB!" -ForegroundColor Red
} else {
    Write-Host "  OK: Size is within limits" -ForegroundColor Green
}
Write-Host ""

# Update PATH to include FFmpeg (in case it was just installed)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Check FFmpeg
$ffprobe = Get-Command ffprobe -ErrorAction SilentlyContinue
if (-not $ffprobe) {
    Write-Host "FFmpeg not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install FFmpeg: winget install ffmpeg" -ForegroundColor Yellow
    Write-Host "After installation, RESTART PowerShell." -ForegroundColor Yellow
    exit 1
}

Write-Host "FFmpeg found: $($ffprobe.Source)" -ForegroundColor Green
Write-Host ""
Write-Host "Analyzing video..." -ForegroundColor Yellow
Write-Host ""

# Analyze video
try {
    $json = & ffprobe -v quiet -print_format json -show_format -show_streams $VideoFile 2>&1
    $data = $json | ConvertFrom-Json
    
    $video = $data.streams | Where-Object { $_.codec_type -eq 'video' } | Select-Object -First 1
    $audio = $data.streams | Where-Object { $_.codec_type -eq 'audio' } | Select-Object -First 1
    
    Write-Host "=== VIDEO PARAMETERS ===" -ForegroundColor Green
    
    # Codec
    $codec = $video.codec_name
    Write-Host "Codec: $codec" -ForegroundColor $(if ($codec -eq 'h264') { 'Green' } else { 'Red' })
    $codecOk = ($codec -eq 'h264' -or $codec -eq 'prores')
    
    # Resolution
    Write-Host "Resolution: $($video.width)x$($video.height)"
    
    # FPS
    $fps = $null
    $fpsOk = $true
    if ($video.r_frame_rate) {
        $fpsParts = $video.r_frame_rate.Split('/')
        if ($fpsParts.Length -eq 2 -and $fpsParts[1] -ne "0") {
            $fps = [double]$fpsParts[0] / [double]$fpsParts[1]
            $fpsRounded = [math]::Round($fps, 2)
            Write-Host "FPS: $fpsRounded" -ForegroundColor $(if ($fps -le 30) { 'Green' } else { 'Red' })
            if ($fps -gt 30) {
                Write-Host "  WARNING: EXCEEDS 30 FPS!" -ForegroundColor Red
                $fpsOk = $false
            }
        }
    }
    
    # Duration
    $duration = [double]$data.format.duration
    $durRounded = [math]::Round($duration, 2)
    Write-Host "Duration: $durRounded sec" -ForegroundColor $(if ($duration -ge 15 -and $duration -le 30) { 'Green' } else { 'Red' })
    $durOk = ($duration -ge 15 -and $duration -le 30)
    if ($duration -lt 15) {
        Write-Host "  WARNING: LESS THAN 15 SECONDS!" -ForegroundColor Red
    } elseif ($duration -gt 30) {
        Write-Host "  WARNING: MORE THAN 30 SECONDS!" -ForegroundColor Red
    }
    
    # Audio
    $audioOk = $true
    if ($audio) {
        Write-Host ""
        Write-Host "=== AUDIO PARAMETERS ===" -ForegroundColor Green
        
        $audioCodec = $audio.codec_name
        Write-Host "Codec: $audioCodec" -ForegroundColor $(if ($audioCodec -eq 'aac') { 'Green' } else { 'Red' })
        if ($audioCodec -ne 'aac') {
            $audioOk = $false
        }
        
        $sampleRate = [int]$audio.sample_rate
        Write-Host "Sample Rate: $sampleRate Hz" -ForegroundColor $(if ($sampleRate -eq 44100 -or $sampleRate -eq 48000) { 'Green' } else { 'Yellow' })
        if ($sampleRate -ne 44100 -and $sampleRate -ne 48000) {
            $audioOk = $false
        }
        
        $channels = [int]$audio.channels
        Write-Host "Channels: $channels" -ForegroundColor $(if ($channels -eq 2) { 'Green' } else { 'Yellow' })
        if ($channels -ne 2) {
            $audioOk = $false
        }
        
        if ($audio.bit_rate) {
            $bitrate = [math]::Round([int]$audio.bit_rate / 1000, 0)
            Write-Host "Bitrate: $bitrate kbps" -ForegroundColor $(if ($bitrate -eq 256) { 'Green' } else { 'Yellow' })
            if ($bitrate -ne 256) {
                $audioOk = $false
            }
        }
    } else {
        Write-Host ""
        Write-Host "Audio: missing (OK for video without sound)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "=== RESULT ===" -ForegroundColor Cyan
    
    $allOk = $codecOk -and $fpsOk -and $durOk -and ($audioOk -or -not $audio)
    
    if ($allOk) {
        Write-Host "OK: Video meets all App Store requirements!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Video is ready to upload to App Store Connect." -ForegroundColor Green
    } else {
        Write-Host "Issues found:" -ForegroundColor Red
        Write-Host ""
        
        if (-not $codecOk) {
            Write-Host "  X Codec must be H.264 (current: $codec)" -ForegroundColor Red
        }
        if (-not $fpsOk) {
            Write-Host "  X FPS must be max 30 (current: $([math]::Round($fps,2)))" -ForegroundColor Red
        }
        if (-not $durOk) {
            Write-Host "  X Duration must be 15-30 sec (current: $durRounded)" -ForegroundColor Red
        }
        if (-not $audioOk -and $audio) {
            Write-Host "  X Audio parameters do not meet requirements" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "=== FIX COMMAND ===" -ForegroundColor Cyan
        $outputFile = $VideoFile -replace '\.(MOV|mov|MP4|mp4|M4V|m4v)$', '_fixed.mov'
        Write-Host ""
        Write-Host "ffmpeg -i `"$VideoFile`" -c:v libx264 -profile:v high -r 30 -c:a aac -b:a 256k -ar 48000 -ac 2 -t 30 `"$outputFile`"" -ForegroundColor White
        Write-Host ""
    }
    
} catch {
    Write-Host ""
    Write-Host "Error analyzing video: $_" -ForegroundColor Red
    Write-Host "Make sure FFmpeg is installed correctly." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Analysis complete." -ForegroundColor Green








































