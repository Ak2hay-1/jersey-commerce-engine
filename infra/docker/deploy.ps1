<#
.SYNOPSIS
  Clone the public GitHub repo onto a Vultr Ubuntu VM and start the production stack.

.EXAMPLE
  .\infra\docker\deploy.ps1 -PublicIp 45.76.12.34 -SshUser root

.EXAMPLE
  .\infra\docker\deploy.ps1 -PublicIp 45.76.12.34 -SshUser ubuntu -SshKey $env:USERPROFILE\.ssh\id_ed25519
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$PublicIp,

  [string]$SshUser = "root",

  [string]$SshKey = "",

  [string]$RepoUrl = "https://github.com/Ak2hay-1/jersey-commerce-engine.git",

  [string]$RemoteDir = "/opt/jersey",

  [switch]$SkipSetup
)

$ErrorActionPreference = "Stop"

if ($PublicIp -notmatch '^\d{1,3}(\.\d{1,3}){3}$') {
  throw @"
PUBLIC_IP looks wrong: '$PublicIp'
Put a space before each parameter. Example:
  .\infra\docker\deploy.ps1 -PublicIp 45.76.61.16 -SshUser root
"@
}

$sudo = if ($SshUser -eq "root") { "" } else { "sudo " }

function New-AlphanumericSecret {
  param([int]$Length = 40)
  $chars = [char[]]((48..57) + (65..90) + (97..122))
  -join (1..$Length | ForEach-Object { $chars | Get-Random })
}

function Get-SshPrefixArgs {
  $argsList = @("-o", "StrictHostKeyChecking=accept-new")
  if ($SshKey) {
    $argsList = @("-i", $SshKey) + $argsList
  }
  return $argsList
}

function Invoke-Remote {
  param([Parameter(Mandatory = $true)][string]$Command)
  $sshArgs = (Get-SshPrefixArgs) + @("${SshUser}@${PublicIp}", $Command)
  & ssh @sshArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Remote command failed ($LASTEXITCODE): $Command"
  }
}

function Invoke-RemoteText {
  param([Parameter(Mandatory = $true)][string]$Command)
  $sshArgs = (Get-SshPrefixArgs) + @("${SshUser}@${PublicIp}", $Command)
  $output = & ssh @sshArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Remote command failed ($LASTEXITCODE): $Command"
  }
  return ($output | Out-String).Trim()
}

function Send-RemoteFile {
  param(
    [Parameter(Mandatory = $true)][string]$Content,
    [Parameter(Mandatory = $true)][string]$RemotePath
  )
  $tmp = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllText($tmp, ($Content -replace "`r`n", "`n"), (New-Object System.Text.UTF8Encoding $false))
  $scpArgs = (Get-SshPrefixArgs) + @($tmp, "${SshUser}@${PublicIp}:${RemotePath}")
  & scp @scpArgs
  Remove-Item $tmp -Force
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to copy file to $RemotePath"
  }
}

Write-Host "==> Connecting to ${SshUser}@${PublicIp}"
Invoke-Remote "echo connected && uname -a"

Write-Host "==> Installing git and cloning $RepoUrl"
$clone = @"
set -e
export DEBIAN_FRONTEND=noninteractive
${sudo}apt-get update -y
${sudo}apt-get install -y git
${sudo}mkdir -p /opt
if [ -d '$RemoteDir/.git' ]; then
  ${sudo}git -C '$RemoteDir' fetch origin
  ${sudo}git -C '$RemoteDir' reset --hard origin/main
else
  ${sudo}rm -rf '$RemoteDir'
  ${sudo}git clone '$RepoUrl' '$RemoteDir'
fi
${sudo}chown -R `${USER}:`${USER} '$RemoteDir' || true
"@
Invoke-Remote $clone

if (-not $SkipSetup) {
  Write-Host "==> Docker, swap, and firewall"
  Invoke-Remote "${sudo}bash $RemoteDir/infra/docker/vm-setup.sh"
}

$envExists = Invoke-RemoteText "test -f $RemoteDir/infra/docker/.env.production && echo yes || echo no"
if ($envExists -ne "yes") {
  Write-Host "==> Writing infra/docker/.env.production (secrets printed once below)"
  $postgresPassword = New-AlphanumericSecret 24
  $jwtAccess = New-AlphanumericSecret 48
  $jwtRefresh = New-AlphanumericSecret 48
  $bootstrap = New-AlphanumericSecret 40
  $envFile = @"
PUBLIC_IP=$PublicIp
POSTGRES_USER=jersey
POSTGRES_PASSWORD=$postgresPassword
POSTGRES_DB=jersey_commerce
NEXT_PUBLIC_DEFAULT_TENANT_SLUG=demo-jersey-store
JWT_ACCESS_SECRET=$jwtAccess
JWT_REFRESH_SECRET=$jwtRefresh
BOOTSTRAP_SECRET=$bootstrap
LOG_LEVEL=info
"@
  Send-RemoteFile -Content $envFile -RemotePath "$RemoteDir/infra/docker/.env.production"
  Write-Host ""
  Write-Host "Save these values. They are not stored in git."
  Write-Host "POSTGRES_PASSWORD=$postgresPassword"
  Write-Host "BOOTSTRAP_SECRET=$bootstrap"
  Write-Host ""
}
else {
  Write-Host "==> Keeping existing .env.production on the VM"
}

Write-Host "==> Building and starting containers (15-30 minutes on 4GB)"
$up = @"
set -e
cd '$RemoteDir'
if [ -f infra/docker/prod-up.sh ]; then
  ${sudo}bash infra/docker/prod-up.sh
else
  COMPOSE_PARALLEL_LIMIT=1 ${sudo}docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.production up -d --build
fi
"@
Invoke-Remote $up

Write-Host ""
Write-Host "Storefront  http://${PublicIp}/"
Write-Host "Admin       http://${PublicIp}:3001/"
Write-Host "POS         http://${PublicIp}:3002/"
Write-Host "API         http://${PublicIp}:4000/"
Write-Host "Health      http://${PublicIp}:4000/health"
Write-Host ""
Write-Host "After health is 200, create the first shop in PowerShell:"
Write-Host '  $ip = "' + $PublicIp + '"'
Write-Host '  $bootstrap = "BOOTSTRAP_SECRET_FROM_ABOVE"'
Write-Host '  $body = @{ name = "My Jersey Store"; slug = "demo-jersey-store"; ownerEmail = "owner@example.com"; ownerPassword = "ChangeMe1!"; ownerName = "Store Owner" } | ConvertTo-Json'
Write-Host '  Invoke-RestMethod -Method Post -Uri "http://$($ip):4000/api/v1/admin/tenants" -Headers @{ "X-Bootstrap-Secret" = $bootstrap } -ContentType "application/json" -Body $body'
