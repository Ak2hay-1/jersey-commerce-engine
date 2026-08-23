<#
.SYNOPSIS
  Upload Jerzyfy logo to production VM storage and set website_settings.logo + favicon.

.EXAMPLE
  .\infra\docker\run-production-logo.ps1
#>
[CmdletBinding()]
param(
  [string]$PublicIp = '45.76.61.16',
  [string]$SshUser = 'root',
  [string]$TenantSlug = 'jerzyfy',
  [string]$LogoPath = 'apps/desktop/build/logo.png',
  [string]$ApiHost = '45-76-61-16.sslip.io'
)

$ErrorActionPreference = 'Stop'

function Get-SshPassword {
  if ($env:VULTR_SSH_PASSWORD) { return $env:VULTR_SSH_PASSWORD }
  $file = Join-Path $PSScriptRoot '.vultr-ssh-password'
  if (Test-Path $file) { return (Get-Content $file -Raw).Trim() }
  throw "Set `$env:VULTR_SSH_PASSWORD or create $file with the Vultr root SSH password."
}

if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
  Install-Module Posh-SSH -Scope CurrentUser -Force -AllowClobber
}
Import-Module Posh-SSH

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$logoFile = Join-Path $repoRoot $LogoPath
if (-not (Test-Path $logoFile)) {
  throw "Logo not found: $logoFile"
}

$uuid = [guid]::NewGuid().ToString()
$logoBytes = [IO.File]::ReadAllBytes($logoFile)
$logoB64 = [Convert]::ToBase64String($logoBytes)

$remote = @"
set -e
cd /opt/jersey
echo '$logoB64' | base64 -d > /tmp/jerzyfy-logo.png
TENANT_ID=`$(docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production exec -T postgres \
  psql -U jersey -d jersey_commerce -tAc "SELECT id FROM tenants WHERE slug = '$TenantSlug' LIMIT 1;" | tr -d '[:space:]')
if [ -z "`$TENANT_ID" ]; then echo "Tenant not found"; exit 1; fi
KEY="`${TENANT_ID}/website/$uuid.png"
DEST="/app/apps/api/uploads/`$KEY"
docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production exec -T api \
  sh -c "mkdir -p `$(dirname `$DEST) && cat > `$DEST" < /tmp/jerzyfy-logo.png
URL="https://$ApiHost/api/v1/media/`${TENANT_ID}/website/$uuid.png"
docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production exec -T postgres \
  psql -U jersey -d jersey_commerce -c \
  "INSERT INTO website_settings (id, tenant_id, logo, favicon, created_at, updated_at)
   VALUES (gen_random_uuid(), '`$TENANT_ID', '`$URL', '`$URL', NOW(), NOW())
   ON CONFLICT (tenant_id) DO UPDATE SET logo = EXCLUDED.logo, favicon = EXCLUDED.favicon, updated_at = NOW();"
echo "Logo URL: `$URL"
"@

$plain = Get-SshPassword
$secure = ConvertTo-SecureString $plain -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($SshUser, $secure)

Write-Host "==> Uploading logo for tenant $TenantSlug on $PublicIp"
$session = New-SSHSession -ComputerName $PublicIp -Credential $cred -AcceptKey -Force
if (-not $session) { throw "Could not open SSH session." }

try {
  $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $remote -TimeOut 120
} finally {
  Remove-SSHSession -SessionId $session.SessionId -ErrorAction SilentlyContinue | Out-Null
}

if ($result.Output) { $result.Output | ForEach-Object { Write-Host $_ } }
if ($result.Error) { $result.Error | ForEach-Object { Write-Host $_ -ForegroundColor Yellow } }
if ($result.ExitStatus -ne 0) { throw "Logo upload failed with exit code $($result.ExitStatus)." }
Write-Host '==> Logo uploaded and saved to website_settings.'
