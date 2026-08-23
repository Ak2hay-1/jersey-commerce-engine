<#
.SYNOPSIS
  SSH to the production VM, pull latest code, and reset staff accounts for a tenant.

.EXAMPLE
  .\infra\docker\reset-staff-remote.ps1 -PublicIp 45.76.61.16 -SshUser root
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$PublicIp,

  [string]$SshUser = 'root',

  [string]$SshKey = '',

  [string]$RemoteDir = '/opt/jersey',

  [string]$TenantSlug = 'jerzyfy',

  [string]$StaffPassword = 'DevPassword123!'
)

$ErrorActionPreference = 'Stop'

function Get-SshArgs {
  $argsList = @('-o', 'StrictHostKeyChecking=accept-new')
  if ($SshKey) {
    return @('-i', $SshKey) + $argsList
  }
  return $argsList
}

$sshPrefix = Get-SshArgs
$remote = @"
set -e
cd '$RemoteDir'
git pull --ff-only
chmod +x infra/docker/reset-staff.sh
TENANT_SLUG='$TenantSlug' STAFF_PASSWORD='$StaffPassword' bash infra/docker/reset-staff.sh '$TenantSlug'
"@

Write-Host "==> Resetting staff on $PublicIp for tenant $TenantSlug"
& ssh @sshPrefix "${SshUser}@${PublicIp}" $remote
