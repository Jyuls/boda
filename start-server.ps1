param($port=8000)
Write-Host "Iniciando servidor en puerto $port..."
python -m http.server $port