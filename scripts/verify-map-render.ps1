# verify-map-render.ps1
#
# Regression check for the frontend map's initial viewport. Loads a FRESH
# http://localhost/ in headless Edge (no query params), waits for real tile
# fetches, screenshots, and pixel-samples the map area.
#
# Passes when the map shows land (Skopje via the geolocation fallback), fails
# when the map area is dominated by OpenFreeMap "liberty" water color,
# i.e. the map centered on null island (lat 0, lng 0, the Gulf of Guinea).
#
# That failure mode was the Number(null) === 0 bug (2026-10-18): parseViewport
# treated absent ?lat=/?lng= params as 0 and overrode the geolocation start.
# See .scratch/frontend-map/issues/03 and docs/implementation-status.md section 13.
#
# Windows-only (Edge + System.Drawing). Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\verify-map-render.ps1
# Optional params:  -Url http://localhost/  -TimeoutSec 30

param(
  [string]$Url = 'http://localhost/',
  [int]$TimeoutSec = 30
)

$ErrorActionPreference = 'Stop'

$edgeCandidates = @(
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
)
$edge = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Error 'msedge.exe not found' }

$tmp = Join-Path $env:TEMP 'opencode-map-check'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$shot = Join-Path $tmp ("map-" + (Get-Date -Format 'HHmmss') + '.png')
$profile = Join-Path $tmp ("profile-" + ([guid]::NewGuid().ToString('N').Substring(0, 8)))

# Fresh profile every run: no cached geolocation grant, no prior ?lat/lng state.
$args = @(
  '--headless=new', '--no-first-run',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  "--user-data-dir=$profile",
  "--screenshot=$shot", '--window-size=1400,900',
  "--timeout=$($TimeoutSec * 1000)", '--hide-scrollbars',
  '--run-all-compositor-stages-before-draw',
  $Url
)
$p = Start-Process -FilePath $edge -ArgumentList $args -Wait -PassThru
if ($p.ExitCode -ne 0) { Write-Error "Edge exited $($p.ExitCode)" }
if (-not (Test-Path $shot)) { Write-Error 'screenshot not produced' }

Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile($shot)
$w = $bmp.Width; $h = $bmp.Height
$sumR = 0; $sumG = 0; $sumB = 0; $n = 0; $water = 0
for ($x = 150; $x -lt $w; $x += 40) {
  for ($y = 150; $y -lt $h; $y += 40) {
    $c = $bmp.GetPixel($x, $y)
    $sumR += $c.R; $sumG += $c.G; $sumB += $c.B; $n++
    # liberty water fill is rgb(158,189,255); match it loosely
    if (($c.B -ge 190) -and ($c.B -gt ($c.R + 30)) -and ($c.G -gt ($c.R + 10)) -and ($c.B -ge $c.G)) {
      $water++
    }
  }
}
$bmp.Dispose()

$avg = "$([math]::Round($sumR / $n)),$([math]::Round($sumG / $n)),$([math]::Round($sumB / $n))"
$ratio = [math]::Round($water / $n * 100, 1)
Write-Output "avg RGB: $avg | water-ish: $ratio% ($water/$n) | shot: $shot"

if ($water -gt ($n / 2)) {
  Write-Error "FAIL: map area is dominated by water color - initial viewport landed on null island (0,0). Regression!"
}
Write-Output 'PASS: map renders land tiles (geolocation fallback applied).'
