<#
.SYNOPSIS
  Fresh empty cohost install on the shared VM (clone + env + stack + nginx + bootstrap).
  Requires infra/docker/.cohost-ssh-password or $env:COHOST_SSH_PASSWORD.

.EXAMPLE
  .\infra\docker\run-fresh-cohost.ps1
  .\infra\docker\run-fresh-cohost.ps1 -PublicIp 95.135.254.73 -AcmeEmail you@example.com
#>
[CmdletBinding()]
param(
  [string]$PublicIp = '95.135.254.73',
  [string]$SshUser = 'root',
  [string]$RemoteDir = '/opt/jersey',
  [string]$ApiHost = 'api.jerzyfy.in',
  [string]$AcmeEmail = 'rkyves.com@gmail.com',
  [string]$CorsOrigins = 'https://www.jerzyfy.in,https://admin.jerzyfy.in',
  [string]$TenantSlug = 'jerzyfy',
  [string]$OwnerEmail = 'rkyves.com@gmail.com',
  [string]$OwnerPassword = '',
  [string]$RepoUrl = 'https://github.com/Ak2hay-1/jersey-commerce-engine.git'
)

$ErrorActionPreference = 'Stop'

function Get-SshPassword {
  if ($env:COHOST_SSH_PASSWORD) { return $env:COHOST_SSH_PASSWORD }
  $file = Join-Path $PSScriptRoot '.cohost-ssh-password'
  if (Test-Path $file) { return (Get-Content $file -Raw).Trim() }
  throw "Set `$env:COHOST_SSH_PASSWORD or create infra/docker/.cohost-ssh-password with the root password for $PublicIp"
}

if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
  Write-Host '==> Installing Posh-SSH module (one-time)'
  Install-Module Posh-SSH -Scope CurrentUser -Force -AllowClobber
}
Import-Module Posh-SSH

$plain = Get-SshPassword
$secure = ConvertTo-SecureString $plain -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($SshUser, $secure)

$ownerPwBash = if ($OwnerPassword) { $OwnerPassword -replace "'", "'\''" } else { '' }

$remote = @"
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export PUBLIC_IP='$PublicIp'
export API_HOST='$ApiHost'
export ACME_EMAIL='$AcmeEmail'
export CORS_ORIGINS='$CorsOrigins'
export TENANT_SLUG='$TenantSlug'
export OWNER_EMAIL='$OwnerEmail'
export OWNER_PASSWORD='$ownerPwBash'

if ! command -v git >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y git
fi

if [[ ! -d $RemoteDir/.git ]]; then
  echo '==> Cloning repo to $RemoteDir'
  rm -rf $RemoteDir
  git clone '$RepoUrl' $RemoteDir
else
  echo '==> Updating existing $RemoteDir'
  cd $RemoteDir
  git fetch origin
  git reset --hard origin/main
fi

cd $RemoteDir
chmod +x infra/docker/fresh-cohost-bootstrap.sh infra/docker/prod-up-cohost.sh infra/docker/cohost-install-nginx.sh infra/docker/vm-setup.sh
bash infra/docker/fresh-cohost-bootstrap.sh
echo '==> Secrets file (if created):'
ls -la /root/jerzyfy-bootstrap-secrets.txt 2>/dev/null || true
"@

Write-Host "==> Fresh cohost install on $PublicIp ($RemoteDir)"
Write-Host "    Ensure DNS A $ApiHost -> $PublicIp before certbot."
$session = New-SSHSession -ComputerName $PublicIp -Credential $cred -AcceptKey -Force
if (-not $session) { throw "Could not open SSH session to ${SshUser}@${PublicIp}." }
try {
  $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $remote -TimeOut 3600
} finally {
  Remove-SSHSession -SessionId $session.SessionId -ErrorAction SilentlyContinue | Out-Null
}

if ($result.Output) { $result.Output | ForEach-Object { Write-Host $_ } }
if ($result.Error) { $result.Error | ForEach-Object { Write-Host $_ -ForegroundColor Yellow } }
if ($result.ExitStatus -ne 0) { throw "Fresh cohost install failed with exit code $($result.ExitStatus)." }

Write-Host '==> Fetching STOREFRONT_PROXY_SECRET for Vercel'
$session2 = New-SSHSession -ComputerName $PublicIp -Credential $cred -AcceptKey -Force
try {
  $secretResult = Invoke-SSHCommand -SessionId $session2.SessionId -Command "grep '^STOREFRONT_PROXY_SECRET=' $RemoteDir/infra/docker/.env.production | cut -d= -f2-" -TimeOut 60
  $proxySecret = ($secretResult.Output | Out-String).Trim()
  if ($proxySecret) {
    Write-Host "STOREFRONT_PROXY_SECRET=$proxySecret"
    Write-Host 'Set this on the Vercel storefront project, then redeploy.'
  }
} finally {
  Remove-SSHSession -SessionId $session2.SessionId -ErrorAction SilentlyContinue | Out-Null
}

Write-Host '==> Fresh cohost install complete.'
Write-Host "Smoke: Invoke-RestMethod https://$ApiHost/health"
