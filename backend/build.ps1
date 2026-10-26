$Root = Split-Path $PSScriptRoot -Parent
Push-Location "$Root\frontend"
$env:VITE_USE_POCKETBASE='true'
$env:VITE_PB_URL=''
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Remove-Item "$Root\backend\dist" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "$Root\backend\dist" -Force | Out-Null
Copy-Item "$Root\frontend\dist\*" "$Root\backend\dist\" -Recurse -Force
Pop-Location
Push-Location "$Root\backend"
$env:CGO_ENABLED='0'
go build -trimpath -o blogku.exe .
Pop-Location
