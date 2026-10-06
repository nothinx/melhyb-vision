# Unggah demo SIGMA (satu berkas, mode demo) ke Hugging Face Space statis.
# Space Docker butuh akun PRO; Space statis gratis. Prasyarat: `hf auth login`.
# Pakai: .\deploy-hf\unggah.ps1 -Space nama-user/sigma
param([Parameter(Mandatory)][string]$Space)
# Tanpa ErrorActionPreference=Stop: di PS 5.1 peringatan stderr hf dianggap error.
Set-Location (Split-Path $PSScriptRoot)

Push-Location frontend; npm run build:tunggal; $gagal = $LASTEXITCODE; Pop-Location
if ($gagal) { exit 1 }
Copy-Item deploy-hf\README.md frontend\dist-tunggal\README.md
hf repos create $Space --repo-type space --space-sdk static --exist-ok
if ($LASTEXITCODE) { exit 1 }
hf upload $Space frontend\dist-tunggal . --repo-type space --commit-message "deploy demo"
if ($LASTEXITCODE) { exit 1 }
Write-Host "Selesai: https://huggingface.co/spaces/$Space"
