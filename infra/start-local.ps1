param([switch]$Install)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    if ($Install) { & npm install; if ($LASTEXITCODE) { throw 'No se pudieron instalar las dependencias Node.' } }
    & npm run dev
} finally { Pop-Location }
