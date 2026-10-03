# Descarga los recursos del demo de ChungDoi a assets/img (fase 1: clon)
$ErrorActionPreference = 'Continue'
$base = 'https://chungdoi.com'
$assets = 'https://assets.chungdoi.com'

# Directorios
$dirs = @('assets/img/minimalism', 'assets/img/minimalism/gift', 'assets/img/minimalism/iconos', 'assets/img/fotos')
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
$tema = @('paper','castle-background','castle-background-1','castle2-background','goldenline2-decoration','goldenline3-decoration','flower-background','flower2-decoration','flower3-decoration','flower4-decoration','flower5-decoration','flower6-decoration','envelope-background','envelope-cover','church','cake','cook')
foreach ($t in $tema) { Bajar "$base/images/themes/minimalism-dark-blue/$t.webp" "assets/img/minimalism/$t.webp" }

# Regalo
$gift = @('minimalism_darkblue','mini/nhat_binh_red','mini/baroque_v2_darkred','mini/silk_ribbon_pink','mini/chateau_green','mini/qasr_gold','mini/cherry_blossom_pink','mini/minimalism_darkred')
foreach ($g in $gift) {
  $n = Split-Path $g -Leaf
  Bajar "$base/images/giftbox/$g.webp" "assets/img/minimalism/gift/$n.webp"
}

# Iconos de pago
Bajar "$base/icons/payments/bank-generic.svg" "assets/img/minimalism/iconos/bank-generic.svg"
Bajar "$base/icons/payments/wise.svg" "assets/img/minimalism/iconos/wise.svg"

# Fotos del demo
$fotos = @(
 'a3a7119579b59f29e194052ef6380b640ae9c30bebd1344517a305e42227eccf',
 'ef8eaddf160e53fcaea63d5c3bf5859cf4878ae20ce20f75a1e99d82124151b4',
 'bd79ed0923d4d287f5a856fc5a1aa9a8be73604e395ddcc347d0aaed2e595414',
 'e8dab61e670259209f83a67cb2feb137040657de6b0312a21537aa2334bebafb',
 '5565436e89d21c2a44ea7a66c30a37739f1c902988bd037c31a40697f427251e',
 '4fbce8bac89a516f456a7b862810b6e16e14b5a7ae9813c33fa39570941f8bf4',
 'd203408de57f94ad27de1cb6ba3ecf6597a45ebe07ce4fdb24e3a83e419df48c',
 'f2ad59d3b9620019d1c374bf00b5ce107ef3b3e937b57dd4c960dc3bce47c8d2',
 '8725e122fab49e4fa0843ea43bca042cc8037716964f52a5a457d9b91c889a37'
)
$i = 0
foreach ($f in $fotos) {
  $i++
  Bajar "$assets/photo-library/design/$f.webp" "assets/img/fotos/foto$i.webp"
}

Write-Host "DESCARGA TERMINADA"