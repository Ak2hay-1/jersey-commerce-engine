<#
.SYNOPSIS
  Update CORS origins and tenant host mapping on the production VM via Posh-SSH.

.EXAMPLE
  .\infra\docker\run-production-cors.ps1
#>
[CmdletBinding()]
param(
  [string]$PublicIp = '45.76.61.16',
  [string]$SshUser = 'root',
  [string]$StorefrontOrigin = 'https://www.jerzyfy.in',
  [string]$AdminOrigin = 'https://admin.jerzyfy.in'
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

$cors = @(
  $StorefrontOrigin.TrimEnd('/'),
  $AdminOrigin.TrimEnd('/'),
  'https://jerzyfy.vercel.app',
  'https://jerzyfy-admin.vercel.app',
  'http://127.0.0.1:39217',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003'
) -join ','

$remote = @"
set -e
cd /opt/jersey
git fetch origin
git reset --hard origin/main
CORS='$cors'
if grep -q '^CORS_ORIGINS=' infra/docker/.env.production; then
  sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=\$CORS|" infra/docker/.env.production
else
  echo "CORS_ORIGINS=\$CORS" >> infra/docker/.env.production
fi
docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production up -d api
docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production exec -T postgres \
  psql -U jersey -d jersey_commerce -f - <<'SQL'
INSERT INTO tenant_hosts (id, tenant_id, host, kind, created_at, updated_at)
SELECT gen_random_uuid(), t.id, h.host, 'DOMAIN', NOW(), NOW()
FROM tenants t
CROSS JOIN (VALUES ('www.jerzyfy.in'), ('jerzyfy.in')) AS h(host)
WHERE t.slug = 'jerzyfy'
ON CONFLICT (host) DO NOTHING;
SQL
curl -fsS "https://`$(grep '^API_HOST=' infra/docker/.env.production | cut -d= -f2)/health"
"@

$plain = Get-SshPassword
$secure = ConvertTo-SecureString $plain -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($SshUser, $secure)

Write-Host "==> Updating CORS on $PublicIp"
$session = New-SSHSession -ComputerName $PublicIp -Credential $cred -AcceptKey -Force
if (-not $session) { throw "Could not open SSH session to ${SshUser}@${PublicIp}." }
try {
  $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $remote -TimeOut 300
} finally {
  Remove-SSHSession -SessionId $session.SessionId -ErrorAction SilentlyContinue | Out-Null
}

if ($result.Output) { $result.Output | ForEach-Object { Write-Host $_ } }
if ($result.Error) { $result.Error | ForEach-Object { Write-Host $_ -ForegroundColor Yellow } }
if ($result.ExitStatus -ne 0) { throw "Remote command failed with exit code $($result.ExitStatus)." }
Write-Host '==> CORS and tenant hosts updated.'
