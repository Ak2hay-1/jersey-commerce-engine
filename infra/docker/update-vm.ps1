<#
.SYNOPSIS
  Copy local login-page fixes to the Vultr VM and rebuild admin + POS.

.EXAMPLE
  .\infra\docker\update-vm.ps1 -PublicIp 45.76.61.16 -SshUser root
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$PublicIp,

  [string]$SshUser = "root"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$sshOpts = @(
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "ServerAliveInterval=15",
  "-o", "ServerAliveCountMax=40"
)

$files = @(
  "apps/admin/app/login/page.tsx",
  "apps/pos/app/login/page.tsx"
)

foreach ($rel in $files) {
  $local = Join-Path $root $rel
  if (-not (Test-Path $local)) {
    throw "Missing $rel"
  }
  $unix = $rel.Replace("\", "/")
  Write-Host "==> Copy $unix"
  & scp @sshOpts $local "${SshUser}@${PublicIp}:/opt/jersey/$unix"
  if ($LASTEXITCODE -ne 0) {
    throw "scp failed for $rel"
  }
}

$remote = @'
set -e
cd /opt/jersey
echo "==> Building nginx with admin and POS login pages"
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.production build nginx
echo "==> Restarting nginx"
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.production up -d nginx
echo "==> Done"
'@

Write-Host "==> Rebuild on VM (enter SSH password if asked)"
$remote | & ssh @sshOpts "${SshUser}@${PublicIp}" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Remote rebuild failed ($LASTEXITCODE)"
}

Write-Host ""
Write-Host "Admin  http://${PublicIp}:3001/login"
Write-Host "POS    http://${PublicIp}:3002/login"
Write-Host "Sign in with owner@example.com / ChangeMe1! / demo-jersey-store"
