<#
.SYNOPSIS
  Reset production staff via SSH (reads password from VULTR_SSH_PASSWORD or infra/docker/.vultr-ssh-password).

.EXAMPLE
  $env:VULTR_SSH_PASSWORD = 'your-vultr-root-password'
  .\infra\docker\run-production-staff-reset.ps1
#>
[CmdletBinding()]
param(
  [string]$PublicIp = '45.76.61.16',
  [string]$SshUser = 'root',
  [string]$TenantSlug = 'jerzyfy',
  [string]$StaffPassword = 'DevPassword123!'
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

$remote = @"
set -e
cd /opt/jersey
git pull --ff-only
chmod +x infra/docker/reset-staff.sh
TENANT_SLUG='$TenantSlug' STAFF_PASSWORD='$StaffPassword' bash infra/docker/reset-staff.sh '$TenantSlug'
"@

Write-Host "==> Resetting staff on $PublicIp for tenant $TenantSlug"
$session = New-SSHSession -ComputerName $PublicIp -Credential $cred -AcceptKey -Force
if (-not $session) {
  throw "Could not open SSH session to ${SshUser}@${PublicIp}."
}
try {
  $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $remote -TimeOut 300
} finally {
  Remove-SSHSession -SessionId $session.SessionId -ErrorAction SilentlyContinue | Out-Null
}

if ($result.Output) {
  $result.Output | ForEach-Object { Write-Host $_ }
}
if ($result.Error) {
  $result.Error | ForEach-Object { Write-Host $_ -ForegroundColor Red }
}
if ($result.ExitStatus -ne 0) {
  throw "Remote command failed with exit code $($result.ExitStatus)."
}

Write-Host '==> Done. Test login from PowerShell:'
Write-Host @"
`$body = @{ email = 'rkyves.com@gmail.com'; password = '$StaffPassword'; tenantSlug = '$TenantSlug' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'https://45-76-61-16.sslip.io/api/v1/auth/login' -ContentType 'application/json' -Body `$body
"@
