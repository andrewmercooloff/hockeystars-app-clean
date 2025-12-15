# Automatic video fix for App Store
param(
    [string]$VideoFile = "IMG_5198.MOV"
)

$outputFile = $VideoFile -replace '\.(MOV|mov|MP4|mp4|M4V|m4v)$', '_fixed.mov'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FIXING VIDEO FOR APP STORE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Update PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Check file
if (-not (Test-Path $VideoFile)) {
    Write-Host "ERROR: File '$VideoFile' not found!" -ForegroundColor Red
    exit 1
}

# Check FFmpeg
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
    Write-Host "FFmpeg not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Input file: $VideoFile" -ForegroundColor Green
Write-Host "Output file: $outputFile" -ForegroundColor Green
Write-Host ""
Write-Host "Converting video..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow
Write-Host ""

# Convert video
& ffmpeg -i "`"$VideoFile`"" -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -r 30 -c:a aac -b:a 256k -ar 48000 -ac 2 -t 30 "`"$outputFile`"" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "OK: Video successfully converted!" -ForegroundColor Green
    Write-Host "File saved: $outputFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now upload '$outputFile' to App Store Connect." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "ERROR: Conversion failed!" -ForegroundColor Red
    exit 1
}















