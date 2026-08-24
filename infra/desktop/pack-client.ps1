# Pack a per-client Jersey Staff Windows installer (POS + ERP) pointed at a cloud VM API.
#
# Example:
#   .\infra\desktop\pack-client.ps1 -ApiUrl "http://203.0.113.10:4000" -ClientName "ClientShop"
#
# Output: apps/desktop/dist/Jersey-Staff-Setup-<version>.exe (and a client-named copy when -ClientName is set)

param(
  [Parameter(Mandatory = $true)]
  [string]$ApiUrl,

  [string]$ClientName = "",

  [string]$DefaultMode = "pos"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$desktopDir = Join-Path $repoRoot "apps\desktop"
$configPath = Join-Path $desktopDir "config.json"

$trimmed = $ApiUrl.Trim().TrimEnd("/")
if ($trimmed -notmatch '^https?://') {
  throw "ApiUrl must start with http:// or https:// (got: $ApiUrl)"
}

if ($DefaultMode -ne "pos" -and $DefaultMode -ne "erp") {
  throw "DefaultMode must be 'pos' or 'erp'"
}

Write-Host "Writing desktop config -> $trimmed"
$json = (@{
  apiUrl = $trimmed
  defaultMode = $DefaultMode
} | ConvertTo-Json -Compress)
[System.IO.File]::WriteAllText($configPath, $json + "`n", (New-Object System.Text.UTF8Encoding $false))

Push-Location $repoRoot
try {
  Write-Host "Installing workspace deps (if needed)…"
  npm install

  Write-Host "Building and packing Windows NSIS installer…"
  npm run desktop:pack
}
finally {
  Pop-Location
}

$distDir = Join-Path $desktopDir "dist"
$setup = Get-ChildItem -Path $distDir -Filter "Jerzyfy-Staff-Setup-*.exe" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $setup) {
  $setup = Get-ChildItem -Path $distDir -Filter "Jersey-Staff-Setup-*.exe" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

if (-not $setup) {
  throw "Installer not found under $distDir"
}

Write-Host "Built: $($setup.FullName)"

if ($ClientName) {
  $safe = ($ClientName -replace '[^\w\-]+', '-').Trim('-')
  if (-not $safe) { $safe = "client" }
  $copyName = "Jerzyfy-Staff-Setup-$safe.exe"
  $copyPath = Join-Path $distDir $copyName
  if ($setup.FullName -ne $copyPath) {
    Copy-Item -Path $setup.FullName -Destination $copyPath -Force
    Write-Host "Client copy: $copyPath"
  }
  Write-Host "Share this EXE with the client. After install they log in against $trimmed"
}
else {
  Write-Host "Share $($setup.Name) with the client. After install they log in against $trimmed"
}
