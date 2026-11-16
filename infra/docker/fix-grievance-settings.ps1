<#
.SYNOPSIS
  Set grievance officer fields on prod and clear mistaken footer.body copy.
#>
[CmdletBinding()]
param(
  [string]$PublicIp = '95.135.254.73',
  [string]$SshUser = 'root',
  [string]$RemoteDir = '/opt/jersey',
  [string]$OfficerName = 'Harshal Pachole',
  [string]$OfficerEmail = 'harshalpancholi09@gmail.com'
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
  Install-Module Posh-SSH -Scope CurrentUser -Force -AllowClobber
}
Import-Module Posh-SSH

$plain = Get-SshPassword
$secure = ConvertTo-SecureString $plain -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($SshUser, $secure)

$nameSql = $OfficerName.Replace("'", "''")
$emailSql = $OfficerEmail.Replace("'", "''")

$remote = @"
set -e
cd $RemoteDir
docker compose -f infra/docker/docker-compose.api.yml -f infra/docker/docker-compose.cohost.yml --env-file infra/docker/.env.production exec -T postgres \
  psql -U jersey -d jersey_commerce -v ON_ERROR_STOP=1 <<'SQL'
UPDATE website_settings AS ws
SET
  grievance_officer_name = '$nameSql',
  grievance_officer_email = '$emailSql',
  footer_config = CASE
    WHEN COALESCE(ws.footer_config->>'body','') ILIKE '%grievance officer%'
      THEN jsonb_set(COALESCE(ws.footer_config, '{}'::jsonb), '{body}', to_jsonb(''::text), true)
    ELSE COALESCE(ws.footer_config, '{}'::jsonb)
  END,
  updated_at = NOW()
FROM tenants t
WHERE ws.tenant_id = t.id AND t.slug = 'jerzyfy';

SELECT t.slug, ws.grievance_officer_name, ws.grievance_officer_email, ws.footer_config->>'body' AS footer_body
FROM website_settings ws
JOIN tenants t ON t.id = ws.tenant_id
WHERE t.slug = 'jerzyfy';
SQL
"@

Write-Host "==> Updating grievance settings on $PublicIp"
$session = New-SSHSession -ComputerName $PublicIp -Credential $cred -AcceptKey -Force
if (-not $session) { throw "Could not open SSH session to ${SshUser}@${PublicIp}." }
try {
  $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $remote -TimeOut 120
} finally {
  Remove-SSHSession -SessionId $session.SessionId -ErrorAction SilentlyContinue | Out-Null
}

if ($result.Output) { $result.Output | ForEach-Object { Write-Host $_ } }
if ($result.Error) { $result.Error | ForEach-Object { Write-Host $_ -ForegroundColor Yellow } }
if ($result.ExitStatus -ne 0) { throw "Grievance settings update failed with exit code $($result.ExitStatus)." }
Write-Host '==> Done. Storefront bootstrap cache expires within ~60s.'
