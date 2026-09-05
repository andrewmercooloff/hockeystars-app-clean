# Build Expo Web for VPS (app.hockey-stars.com) or cPanel (/web/)
# Usage: .\deploy\scripts\build-web-export.ps1

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..\..")

$env:EXPO_PUBLIC_SUPABASE_URL = "https://api.hockey-stars.com"
if (-not $env:EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    Write-Host "Set EXPO_PUBLIC_SUPABASE_ANON_KEY before running (Supabase anon key)."
    exit 1
}

Write-Host "Building Expo Web export..."
npm run web:export

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Done. Output: dist/"
Write-Host "VPS:  scp -r dist/* root@5.42.123.84:/var/www/hockeystars-web/"
Write-Host "cPanel: upload dist/* to public_html/web/ (set experiments.baseUrl=/web in app.json first)"
