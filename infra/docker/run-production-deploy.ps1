<#
.SYNOPSIS
  Pull latest main on the Vultr API VM, rebuild the stack, and apply Jerzyfy shipping rules.

.EXAMPLE
  .\infra\docker\run-production-deploy.ps1
#>
[CmdletBinding()]
param(
  [string]$PublicIp = '45.76.61.16',
  [string]$SshUser = 'root',
  [string]$TenantSlug = 'jerzyfy'
)

$ErrorActionPreference = 'Stop'

function Get-SshPassword {
  if ($env:VULTR_SSH_PASSWORD) {
    return $env:VULTR_SSH_PASSWORD
  }
  $file = Join-Path $PSScriptRoot '.vultr-ssh-password'
  if (Test-Path $file) {
    return (Get-Content $file -Raw).Trim()
  }
  throw "Set `$env:VULTR_SSH_PASSWORD or create $file with the Vultr root SSH password."
}

if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
  Write-Host '==> Installing Posh-SSH module (one-time)'
  Install-Module Posh-SSH -Scope CurrentUser -Force -AllowClobber
}

Import-Module Posh-SSH

$plain = Get-SshPassword
$secure = ConvertTo-SecureString $plain -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($SshUser, $secure)

$remote = @'
set -e
cd /opt/jersey
git fetch origin
git reset --hard origin/main
echo "==> Deploying $(git log -1 --oneline)"
chmod +x infra/docker/prod-up.sh 2>/dev/null || true
bash infra/docker/prod-up.sh || {
  echo "==> Retrying stack start after removing stale api container"
  docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production rm -sf api 2>/dev/null || true
  docker rm -f jce-api 2>/dev/null || true
  docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production up -d --force-recreate --remove-orphans
}
echo "==> Applying shipping rules for TENANT_SLUG_PLACEHOLDER"
docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production exec -T postgres \
  psql -U jersey -d jersey_commerce -c \
  "UPDATE tenants SET shipping_calculation_mode = 'FIXED', shipping_fixed_amount = 99, free_shipping_min_subtotal = 2000 WHERE slug = 'TENANT_SLUG_PLACEHOLDER';"
curl -fsS "https://$(grep '^API_HOST=' infra/docker/.env.production | cut -d= -f2)/health"
'@ -replace 'TENANT_SLUG_PLACEHOLDER', $TenantSlug

Write-Host "==> Deploying API on $PublicIp"
$session = New-SSHSession -ComputerName $PublicIp -Credential $cred -AcceptKey -Force
if (-not $session) {
  throw "Could not open SSH session to ${SshUser}@${PublicIp}."
}
try {
  $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $remote -TimeOut 900
} finally {
  Remove-SSHSession -SessionId $session.SessionId -ErrorAction SilentlyContinue | Out-Null
}

if ($result.Output) {
  $result.Output | ForEach-Object { Write-Host $_ }
}
if ($result.Error) {
  $result.Error | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
}
if ($result.ExitStatus -ne 0) {
  throw "Remote deploy failed with exit code $($result.ExitStatus)."
}

Write-Host '==> API deploy complete. Deploy storefront/admin on Vercel next.'
