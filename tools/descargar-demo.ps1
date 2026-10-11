# Descarga los recursos visuales usados por la invitacion a assets/img.
$ErrorActionPreference = 'Continue'
$base = 'https://chungdoi.com'
$assets = 'https://assets.chungdoi.com'

# Directorio de recursos del tema
$dirs = @('assets/img/minimalism')
foreach ($d in $dirs) { if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null } }

function Bajar($url, $dest) {
  if (Test-Path $dest) { Write-Host "OK (ya) $dest" -ForegroundColor DarkGray; return }
  try {
    curl.exe -sL --fail --max-time 90 -o $dest $url
    if ((Get-Item $dest).Length -gt 0) { Write-Host "OK $dest" -ForegroundColor Green }
    else { Write-Host "VACIO $url" -ForegroundColor Red }
  } catch { Write-Host "FALLO $url -> $dest" -ForegroundColor Red }
}

# Tema
$tema = @('paper','castle-background','castle-background-1','castle2-background','goldenline2-decoration','goldenline3-decoration','flower-background','flower2-decoration','flower3-decoration','flower4-decoration','flower5-decoration','flower6-decoration','envelope-background','envelope-cover')
foreach ($t in $tema) { Bajar "$base/images/themes/minimalism-dark-blue/$t.webp" "assets/img/minimalism/$t.webp" }

Write-Host "DESCARGA TERMINADA"