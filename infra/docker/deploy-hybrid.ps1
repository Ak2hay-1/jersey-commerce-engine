<#
.SYNOPSIS
  Wrapper that runs hybrid API deploy using JCE_* environment variables.
#>
[CmdletBinding()]
param(
  [switch]$UpdateCorsOnly,
  [switch]$SkipSetup,
  [string]$SshUser = "root",
  [string]$SshKey = ""
)

$ErrorActionPreference = "Stop"

function Require-Env([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if (-not $value) {
    throw "Set environment variable $Name first. See infra/docker/PRODUCTION-CUTOVER.md"
  }
  return $value
}

$publicIp = Require-Env "JCE_PUBLIC_IP"
$apiHost = Require-Env "JCE_API_HOST"
$acmeEmail = Require-Env "JCE_ACME_EMAIL"
$storefront = Require-Env "JCE_STOREFRONT_ORIGIN"
$admin = Require-Env "JCE_ADMIN_ORIGIN"

$deploy = Join-Path $PSScriptRoot "deploy.ps1"
$argList = @(
  "-PublicIp", $publicIp,
  "-ApiHost", $apiHost,
  "-AcmeEmail", $acmeEmail,
  "-StorefrontOrigin", $storefront,
  "-AdminOrigin", $admin,
  "-SshUser", $SshUser
)
if ($SshKey) { $argList += @("-SshKey", $SshKey) }
if ($SkipSetup) { $argList += "-SkipSetup" }
if ($UpdateCorsOnly) { $argList += "-UpdateCorsOnly" }

& $deploy @argList
