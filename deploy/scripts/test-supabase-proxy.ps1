# Quick check after nginx proxy is deployed
param(
    [string]$BaseUrl = "https://api.hockey-stars.com"
)

Write-Host "DNS:" -ForegroundColor Cyan
nslookup ([Uri]$BaseUrl).Host 2>$null

Write-Host "`nHTTPS HEAD $BaseUrl/rest/v1/ :" -ForegroundColor Cyan
curl.exe -I --max-time 20 "$BaseUrl/rest/v1/" 2>&1 | Select-String -Pattern "HTTP/|server:|cf-ray|error|timed out"

Write-Host "`nExpected: HTTP 401, Server should NOT show CF-RAY from client perspective on BY proxy" -ForegroundColor Yellow
Write-Host "On phone (no VPN): open $BaseUrl/rest/v1/ in browser" -ForegroundColor Yellow
