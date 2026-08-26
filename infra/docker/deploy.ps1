<#
.SYNOPSIS
  Deploy the hybrid API stack (Postgres + Redis + API + Caddy TLS) to a Vultr Ubuntu VM.
  Storefront and Admin are deployed separately on Vercel. Staff use the Jersey Staff EXE.

.EXAMPLE
  .\infra\docker\deploy.ps1 -PublicIp 45.76.12.34 -ApiHost api.yourshop.com -AcmeEmail you@example.com `
    -StorefrontOrigin https://your-shop.vercel.app -AdminOrigin https://your-admin.vercel.app

.EXAMPLE
  .\infra\docker\deploy.ps1 -PublicIp 45.76.12.34 -ApiHost api.yourshop.com -AcmeEmail you@example.com `
    -StorefrontOrigin https://shop.yourshop.com -AdminOrigin https://admin.yourshop.com `
    -SshUser root -SkipSetup
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$PublicIp,

  [Parameter(Mandatory = $true)]
  [string]$ApiHost,

  [Parameter(Mandatory = $true)]
  [string]$AcmeEmail,

  [Parameter(Mandatory = $true)]
  [string]$StorefrontOrigin,

  [Parameter(Mandatory = $true)]
  [string]$AdminOrigin,

  [string]$SshUser = "root",

  [string]$SshKey = "",

  [string]$RepoUrl = "https://github.com/Ak2hay-1/jersey-commerce-engine.git",

  [string]$RemoteDir = "/opt/jersey",

  [string]$PlatformDomain = "",

  [switch]$SkipSetup,

  [switch]$ResumeBuild,

  [switch]$UpdateCorsOnly
)

$ErrorActionPreference = "Stop"

if ($PublicIp -notmatch '^\d{1,3}(\.\d{1,3}){3}$') {
  throw @"
PUBLIC_IP looks wrong: '$PublicIp'
Example:
  .\infra\docker\deploy.ps1 -PublicIp 45.76.61.16 -ApiHost api.example.com -AcmeEmail you@example.com -StorefrontOrigin https://shop.vercel.app -AdminOrigin https://admin.vercel.app
"@
}

function Normalize-Origin([string]$value) {
  return $value.Trim().TrimEnd("/")
}

$ApiHost = $ApiHost.Trim().TrimStart("https://").TrimStart("http://").TrimEnd("/")
$StorefrontOrigin = Normalize-Origin $StorefrontOrigin
$AdminOrigin = Normalize-Origin $AdminOrigin
$AcmeEmail = $AcmeEmail.Trim()

$corsParts = @(
  $StorefrontOrigin,
  $AdminOrigin,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003"
) | Select-Object -Unique
$corsOrigins = ($corsParts -join ",")

$sudo = if ($SshUser -eq "root") { "" } else { "sudo " }

function New-AlphanumericSecret {
  param([int]$Length = 40)
  $chars = [char[]]((48..57) + (65..90) + (97..122))
  -join (1..$Length | ForEach-Object { $chars | Get-Random })
}

function Get-SshPrefixArgs {
  $argsList = @(
    "-o", "StrictHostKeyChecking=accept-new",
    "-o", "ServerAliveInterval=15",
    "-o", "ServerAliveCountMax=40",
    "-o", "TCPKeepAlive=yes"
  )
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

if ($UpdateCorsOnly) {
  Write-Host "==> Updating CORS_ORIGINS on the VM"
  $escaped = $corsOrigins.Replace("'", "'\''")
  Invoke-Remote "cd $RemoteDir && sed -i 's|^CORS_ORIGINS=.*|CORS_ORIGINS=$escaped|' infra/docker/.env.production && docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production up -d api"
  Write-Host "CORS_ORIGINS=$corsOrigins"
  return
}

if (-not $ResumeBuild) {
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
    $secretsKey = New-AlphanumericSecret 48
    $platformLine = if ($PlatformDomain) { "PLATFORM_DOMAIN=$PlatformDomain" } else { "PLATFORM_DOMAIN=" }
    $envFile = @"
PUBLIC_IP=$PublicIp
API_HOST=$ApiHost
ACME_EMAIL=$AcmeEmail
CORS_ORIGINS=$corsOrigins
COOKIE_SECURE=true
COOKIE_SAMESITE=none
POSTGRES_USER=jersey
POSTGRES_PASSWORD=$postgresPassword
POSTGRES_DB=jersey_commerce
NEXT_PUBLIC_DEFAULT_TENANT_SLUG=demo-jersey-store
JWT_ACCESS_SECRET=$jwtAccess
JWT_REFRESH_SECRET=$jwtRefresh
BOOTSTRAP_SECRET=$bootstrap
SECRETS_ENCRYPTION_KEY=$secretsKey
LOG_LEVEL=info
$platformLine
"@
    Send-RemoteFile -Content $envFile -RemotePath "$RemoteDir/infra/docker/.env.production"
    Write-Host ""
    Write-Host "Save these values. They are not stored in git."
    Write-Host "POSTGRES_PASSWORD=$postgresPassword"
    Write-Host "BOOTSTRAP_SECRET=$bootstrap"
    Write-Host "API_HOST=$ApiHost"
    Write-Host "CORS_ORIGINS=$corsOrigins"
    Write-Host ""
  }
  else {
    Write-Host "==> Keeping existing .env.production; refreshing API_HOST / CORS / ACME"
    $escapedCors = $corsOrigins.Replace("'", "'\''")
    $escapedHost = $ApiHost.Replace("'", "'\''")
    $escapedEmail = $AcmeEmail.Replace("'", "'\''")
    Invoke-Remote @"
set -e
cd '$RemoteDir'
f=infra/docker/.env.production
grep -q '^API_HOST=' \$f && sed -i 's|^API_HOST=.*|API_HOST=$escapedHost|' \$f || echo 'API_HOST=$escapedHost' >> \$f
grep -q '^ACME_EMAIL=' \$f && sed -i 's|^ACME_EMAIL=.*|ACME_EMAIL=$escapedEmail|' \$f || echo 'ACME_EMAIL=$escapedEmail' >> \$f
grep -q '^CORS_ORIGINS=' \$f && sed -i 's|^CORS_ORIGINS=.*|CORS_ORIGINS=$escapedCors|' \$f || echo 'CORS_ORIGINS=$escapedCors' >> \$f
grep -q '^COOKIE_SECURE=' \$f && sed -i 's|^COOKIE_SECURE=.*|COOKIE_SECURE=true|' \$f || echo 'COOKIE_SECURE=true' >> \$f
grep -q '^COOKIE_SAMESITE=' \$f && sed -i 's|^COOKIE_SAMESITE=.*|COOKIE_SAMESITE=none|' \$f || echo 'COOKIE_SAMESITE=none' >> \$f
"@
  }
}

Write-Host "==> Building API stack on the VM (Docker keeps going if SSH drops)."
$up = @"
set -e
cd '$RemoteDir'
nohup bash infra/docker/prod-up.sh > /var/log/jce-prod-up.log 2>&1 &
sleep 2
set +e
tail -n +1 -f /var/log/jce-prod-up.log
true
"@
Invoke-Remote $up

Write-Host ""
Write-Host "API (HTTPS)  https://${ApiHost}/"
Write-Host "Health       https://${ApiHost}/health"
Write-Host "Storefront   $StorefrontOrigin  (deploy on Vercel)"
Write-Host "Admin        $AdminOrigin  (deploy on Vercel)"
Write-Host "Staff EXE    pack with -ApiUrl https://${ApiHost}"
Write-Host ""
Write-Host "After health is 200, create the first shop:"
Write-Host '  $api = "https://' + $ApiHost + '"'
Write-Host '  $bootstrap = "BOOTSTRAP_SECRET_FROM_ABOVE"'
Write-Host '  $body = @{ name = "My Jersey Store"; slug = "demo-jersey-store"; ownerEmail = "owner@example.com"; ownerPassword = "ChangeMe1!"; ownerName = "Store Owner" } | ConvertTo-Json'
Write-Host '  Invoke-RestMethod -Method Post -Uri "$api/api/v1/admin/tenants" -Headers @{ "X-Bootstrap-Secret" = $bootstrap } -ContentType "application/json" -Body $body'
