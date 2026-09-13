<#
.SYNOPSIS
  Deploy / update Jerzyfy API on the shared Cullinos VM (cohost: nginx TLS, no Caddy).

.EXAMPLE
  .\infra\docker\run-cohost-deploy.ps1
  .\infra\docker\run-cohost-deploy.ps1 -PublicIp 95.135.254.46 -RemoteDir /opt/jersey
#>
[CmdletBinding()]
param(
  [string]$PublicIp = '95.135.254.46',
  [string]$SshUser = 'root',
  [string]$RemoteDir = '/opt/jersey',
  [string]$TenantSlug = 'jerzyfy',
  [string]$ApiHost = '95-135-254-46.sslip.io'
)

$ErrorActionPreference = 'Stop'

function Get-SshPassword {
  if ($env:COHOST_SSH_PASSWORD) { return $env:COHOST_SSH_PASSWORD }
  if ($env:VULTR_SSH_PASSWORD) { return $env:VULTR_SSH_PASSWORD }
  $file = Join-Path $PSScriptRoot '.cohost-ssh-password'
  if (Test-Path $file) { return (Get-Content $file -Raw).Trim() }
  $legacy = Join-Path $PSScriptRoot '.vultr-ssh-password'
  if (Test-Path $legacy) { return (Get-Content $legacy -Raw).Trim() }
  throw "Set `$env:COHOST_SSH_PASSWORD or create infra/docker/.cohost-ssh-password"
}

if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
  Write-Host '==> Installing Posh-SSH module (one-time)'
  Install-Module Posh-SSH -Scope CurrentUser -Force -AllowClobber
}
Import-Module Posh-SSH

$plain = Get-SshPassword
$secure = ConvertTo-SecureString $plain -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($SshUser, $secure)

$remote = @"
set -e
cd $RemoteDir
git fetch origin
git reset --hard origin/main
echo "==> Deploying `$(git log -1 --oneline) (cohost)"
chmod +x infra/docker/prod-up-cohost.sh
bash infra/docker/prod-up-cohost.sh
docker compose -f infra/docker/docker-compose.api.yml -f infra/docker/docker-compose.cohost.yml --env-file infra/docker/.env.production exec -T postgres \
  psql -U jersey -d jersey_commerce -c \
  "UPDATE tenants SET shipping_calculation_mode = 'FIXED', shipping_fixed_amount = 99, free_shipping_min_subtotal = 2000 WHERE slug = '$TenantSlug';" || true
curl -fsS "http://127.0.0.1:4000/health"
curl -fsS "https://$ApiHost/health" || echo "(public health not ready — check nginx/DNS)"
"@

Write-Host "==> Cohost deploy on $PublicIp ($RemoteDir)"
$session = New-SSHSession -ComputerName $PublicIp -Credential $cred -AcceptKey -Force
if (-not $session) { throw "Could not open SSH session to ${SshUser}@${PublicIp}." }
try {
  $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $remote -TimeOut 1200
} finally {
  Remove-SSHSession -SessionId $session.SessionId -ErrorAction SilentlyContinue | Out-Null
}

if ($result.Output) { $result.Output | ForEach-Object { Write-Host $_ } }
if ($result.Error) { $result.Error | ForEach-Object { Write-Host $_ -ForegroundColor Yellow } }
if ($result.ExitStatus -ne 0) { throw "Remote cohost deploy failed with exit code $($result.ExitStatus)." }

Write-Host '==> Cohost API deploy complete. Redeploy Vercel if NEXT_PUBLIC_API_URL changed.'
