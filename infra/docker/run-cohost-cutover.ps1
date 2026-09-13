<#
.SYNOPSIS
  Orchestrate Jerzyfy cutover: export from old VM, local SFTP, import on shared Cullinos VM.

.NOTES
  Passwords:
    Old VM: VULTR_SSH_PASSWORD or infra/docker/.vultr-ssh-password
    New VM: COHOST_SSH_PASSWORD or infra/docker/.cohost-ssh-password
            (falls back to .vultr-ssh-password)

  Uploads cohost scripts from the local workspace so origin/main need not have them yet.

.EXAMPLE
  .\infra\docker\run-cohost-cutover.ps1
  .\infra\docker\run-cohost-cutover.ps1 -SkipNginx
#>
[CmdletBinding()]
param(
  [string]$OldIp = '45.76.61.16',
  [string]$NewIp = '95.135.254.46',
  [string]$SshUser = 'root',
  [string]$OldRemoteDir = '/opt/jersey',
  [string]$NewRemoteDir = '/opt/jersey',
  [string]$RepoUrl = 'https://github.com/Ak2hay-1/jersey-commerce-engine.git',
  [string]$ApiHost = '95-135-254-46.sslip.io',
  [string]$CorsOrigins = 'https://www.jerzyfy.in,https://admin.jerzyfy.in',
  [switch]$SkipExport,
  [switch]$SkipNginx,
  [switch]$SkipClone
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot

function Get-PasswordFrom([string]$EnvName, [string[]]$Files) {
  $envVal = [Environment]::GetEnvironmentVariable($EnvName)
  if ($envVal) { return $envVal }
  foreach ($f in $Files) {
    if (Test-Path $f) { return (Get-Content $f -Raw).Trim() }
  }
  return $null
}

function Get-OldPassword {
  $p = Get-PasswordFrom 'VULTR_SSH_PASSWORD' @((Join-Path $here '.vultr-ssh-password'))
  if (-not $p) { throw 'Set VULTR_SSH_PASSWORD or infra/docker/.vultr-ssh-password for the old VM.' }
  return $p
}

function Get-NewPassword {
  $p = Get-PasswordFrom 'COHOST_SSH_PASSWORD' @(
    (Join-Path $here '.cohost-ssh-password'),
    (Join-Path $here '.vultr-ssh-password')
  )
  if (-not $p) { throw 'Set COHOST_SSH_PASSWORD or infra/docker/.cohost-ssh-password for the new VM.' }
  return $p
}

function New-Cred([string]$Password) {
  $secure = ConvertTo-SecureString $Password -AsPlainText -Force
  return New-Object System.Management.Automation.PSCredential($SshUser, $secure)
}

if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
  Write-Host '==> Installing Posh-SSH'
  Install-Module Posh-SSH -Scope CurrentUser -Force -AllowClobber
}
Import-Module Posh-SSH

function Invoke-Remote {
  param(
    [string]$Ip,
    [pscredential]$Cred,
    [string]$Command,
    [int]$Timeout = 900
  )
  $session = New-SSHSession -ComputerName $Ip -Credential $Cred -AcceptKey -Force
  if (-not $session) { throw "SSH failed to ${SshUser}@${Ip}" }
  try {
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $Command -TimeOut $Timeout
    if ($result.Output) { $result.Output | ForEach-Object { Write-Host $_ } }
    if ($result.Error) { $result.Error | ForEach-Object { Write-Host $_ -ForegroundColor Yellow } }
    if ($result.ExitStatus -ne 0) { throw "Remote command on $Ip failed (exit $($result.ExitStatus))" }
    return $result
  } finally {
    Remove-SSHSession -SessionId $session.SessionId -ErrorAction SilentlyContinue | Out-Null
  }
}

function Send-File([string]$Ip, [pscredential]$Cred, [string]$LocalPath, [string]$RemotePath) {
  Set-SCPItem -ComputerName $Ip -Credential $Cred -Path $LocalPath -Destination $RemotePath -AcceptKey -Force
}

function Get-RemoteFile([string]$Ip, [pscredential]$Cred, [string]$RemotePath, [string]$LocalDir) {
  Get-SCPItem -ComputerName $Ip -Credential $Cred -Path $RemotePath -PathType File -Destination $LocalDir -AcceptKey -Force
}

$oldCred = New-Cred (Get-OldPassword)
$newCred = New-Cred (Get-NewPassword)

Write-Host ""
Write-Host "==> Jerzyfy cohost cutover"
Write-Host "    Old API VM : $OldIp"
Write-Host "    New shared : $NewIp"
Write-Host "    API host   : $ApiHost"
Write-Host "    CORS       : $CorsOrigins"
Write-Host ""

$localScripts = @(
  'docker-compose.cohost.yml',
  'prod-up-cohost.sh',
  'cohost-export.sh',
  'cohost-import.sh',
  'cohost-install-nginx.sh',
  'nginx-jerzyfy-api.conf'
)

if (-not $SkipClone) {
  Write-Host "==> Ensuring repo at $NewRemoteDir on $NewIp"
  $cloneCmd = @"
set -e
if [[ ! -d $NewRemoteDir/.git ]]; then
  git clone $RepoUrl $NewRemoteDir
fi
cd $NewRemoteDir
git fetch origin || true
git reset --hard origin/main || true
mkdir -p infra/docker
"@
  Invoke-Remote -Ip $NewIp -Cred $newCred -Command $cloneCmd -Timeout 600
}

Write-Host '==> Uploading cohost scripts to both VMs (local workspace -> remote)'
foreach ($name in $localScripts) {
  $local = Join-Path $here $name
  if (-not (Test-Path $local)) { throw "Missing local script: $local" }
  Send-File $NewIp $newCred $local "$NewRemoteDir/infra/docker/"
  if (-not $SkipExport) {
    Send-File $OldIp $oldCred $local "$OldRemoteDir/infra/docker/"
  }
}
Invoke-Remote -Ip $NewIp -Cred $newCred -Command "chmod +x $NewRemoteDir/infra/docker/*.sh" -Timeout 60
if (-not $SkipExport) {
  Invoke-Remote -Ip $OldIp -Cred $oldCred -Command "chmod +x $OldRemoteDir/infra/docker/*.sh" -Timeout 60
}

$localMigrate = Join-Path ([System.IO.Path]::GetTempPath()) ("jerzyfy-migrate-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $localMigrate | Out-Null

try {
  if (-not $SkipExport) {
    Write-Host "==> Exporting from old VM $OldIp (API write freeze)"
    $exportCmd = @"
set -e
cd $OldRemoteDir
bash infra/docker/cohost-export.sh /root/jerzyfy-migrate
"@
    Invoke-Remote -Ip $OldIp -Cred $oldCred -Command $exportCmd -Timeout 1200

    Write-Host "==> Downloading migrate bundle to $localMigrate"
    foreach ($f in @('jersey_commerce.dump', 'api_uploads.tar.gz', 'env.production.copy')) {
      Get-RemoteFile $OldIp $oldCred "/root/jerzyfy-migrate/$f" $localMigrate
    }

    Write-Host "==> Uploading migrate bundle to $NewIp"
    Invoke-Remote -Ip $NewIp -Cred $newCred -Command 'mkdir -p /root/jerzyfy-migrate; chmod 700 /root/jerzyfy-migrate' -Timeout 60
    foreach ($f in @('jersey_commerce.dump', 'api_uploads.tar.gz', 'env.production.copy')) {
      Send-File $NewIp $newCred (Join-Path $localMigrate $f) '/root/jerzyfy-migrate/'
    }
  }

  Write-Host "==> Import + start cohost stack on $NewIp"
  $importCmd = @"
set -e
cd $NewRemoteDir
chmod +x infra/docker/*.sh
PUBLIC_IP=$NewIp API_HOST=$ApiHost CORS_ORIGINS='$CorsOrigins' \
  bash infra/docker/cohost-import.sh /root/jerzyfy-migrate
"@
  Invoke-Remote -Ip $NewIp -Cred $newCred -Command $importCmd -Timeout 1800

  if (-not $SkipNginx) {
    Write-Host "==> Installing nginx site + cert for $ApiHost"
    Write-Host "    Ensure DNS A record $ApiHost points at $NewIp before certbot."
    $nginxCmd = @"
set -e
cd $NewRemoteDir
API_HOST=$ApiHost bash infra/docker/cohost-install-nginx.sh
"@
    Invoke-Remote -Ip $NewIp -Cred $newCred -Command $nginxCmd -Timeout 600
  }
}
finally {
  if (Test-Path $localMigrate) {
    Remove-Item -Recurse -Force $localMigrate -ErrorAction SilentlyContinue
  }
}

Write-Host ""
Write-Host "==> Cutover stack complete."
Write-Host ""
Write-Host "Next (manual):"
Write-Host "  1. DNS: $ApiHost A record -> $NewIp (if not already)"
Write-Host "  2. Vercel storefront + admin: NEXT_PUBLIC_API_URL=https://$ApiHost then redeploy both"
Write-Host "  3. Smoke: https://$ApiHost/health , www.jerzyfy.in , admin.jerzyfy.in/pos/"
Write-Host "  4. Confirm Cullinos domains still work"
Write-Host "  5. Keep old VM ($OldIp) idle for rollback a few days"
Write-Host ""
