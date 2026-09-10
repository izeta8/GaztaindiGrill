#!/usr/bin/env pwsh
# Deploys GaztaindiGrill-API to its Home Assistant local add-on: mirrors
# app/ onto addons/gaztaindigrill_api/app, pushes the add-on to HA over
# Samba, and optionally rebuilds + restarts it over SSH.
#
# -HaHost forces which address the host is reached by; without it the first of
# the two below that answers on the Samba port wins.

param([string]$HaHost)

$ErrorActionPreference = 'Stop'

# --------------------------------- Config -----------------------------------
# The LAN address is unreachable from outside the network; the Tailscale name
# answers from anywhere in the tailnet, the LAN included.
$LanHost       = '192.168.1.76'
$TailscaleHost = 'homeassistant.tailbedb82.ts.net'
$SambaUser  = 'izeta'
$SambaPass  = 'izeta'
$SambaShare = 'addons'
$HaPort     = 22
$HaUser     = 'gaztaindi'
$AddonSlug  = 'local_gaztaindigrill_api'
$DoRebuild  = $true
# -----------------------------------------------------------------------------

# A raw IP always "resolves", so unlike the web client's deploy this one has to
# probe the port instead of asking DNS.
function Test-HostReachable($hostName, $port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($hostName, $port, $null, $null)
        if (-not $iar.AsyncWaitHandle.WaitOne(2000, $false)) { return $false }
        $client.EndConnect($iar)
        return $true
    } catch { return $false } finally { $client.Close() }
}

function Resolve-HaHost {
    foreach ($candidate in @($LanHost, $TailscaleHost)) {
        if (Test-HostReachable $candidate 445) { return $candidate }
    }
    throw "Neither $LanHost nor $TailscaleHost answers on the Samba port. On the LAN, check the host is up; from outside it, check Tailscale is connected."
}

if (-not $HaHost) { $HaHost = Resolve-HaHost }
Write-Host "Deploying to $HaHost" -ForegroundColor DarkGray

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$DevApp      = Join-Path $ScriptDir 'app'
$AddonRoot   = Join-Path $ScriptDir 'addons\gaztaindigrill_api'
$AddonApp    = Join-Path $AddonRoot 'app'
$RemoteShare = "\\$HaHost\$SambaShare"
$RemoteAddon = "$RemoteShare\gaztaindigrill_api"

if (-not (Test-Path $DevApp))    { throw "Source not found: $DevApp" }
if (-not (Test-Path $AddonRoot)) { throw "Add-on copy not found: $AddonRoot" }

# Windows allows only one credential set per SMB server at a time, so any
# stale connection to $HaHost (different user, different share, opened by
# hand in Explorer) must be torn down before authenticating again.
function Close-SambaSessionsTo($hostName) {
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $pattern = "\\\\$([regex]::Escape($hostName))\\\S+"
    (net use) | Select-String -Pattern $pattern -AllMatches | ForEach-Object {
        foreach ($m in $_.Matches) {
            cmd /c "net use `"$($m.Value)`" /delete /y" 2>$null | Out-Null
        }
    }
    $ErrorActionPreference = $prevEAP
}

Write-Host '[1/3] Mirroring app -> addons/gaztaindigrill_api/app' -ForegroundColor Cyan
robocopy $DevApp $AddonApp /MIR /XD __pycache__ /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy (local mirror) failed (code $LASTEXITCODE)" }
$global:LASTEXITCODE = 0

Write-Host "[2/3] Uploading add-on to $RemoteAddon via Samba" -ForegroundColor Cyan
Close-SambaSessionsTo $HaHost
cmd /c "net use $RemoteShare /user:$SambaUser $SambaPass" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Samba auth against $RemoteShare failed (check user/password/host). Over Tailscale, the Samba add-on also needs 100.64.0.0/10 in its allow_hosts, or it drops the session with 'network name is no longer available'." }
try {
    robocopy $AddonRoot $RemoteAddon /MIR /XD __pycache__ /NFL /NDL /NJH /NJS /NP /R:2 /W:2 | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy (Samba upload) failed (code $LASTEXITCODE)" }
    $global:LASTEXITCODE = 0
} finally {
    Close-SambaSessionsTo $HaHost
}

if ($DoRebuild) {
    Write-Host '[3/3] Rebuilding and restarting the add-on over SSH' -ForegroundColor Cyan
    # A plain `ssh host "command"` runs a non-login shell, which never exports
    # SUPERVISOR_TOKEN (the SSH add-on only sets it up for login shells) - `ha`
    # then fails with "missing or invalid API token". Wrapping in `bash -lc`
    # forces a login shell so the token is present.
    # accept-new, because reaching the host by a second name means a first
    # connection: the default would stop on the fingerprint prompt, and with no
    # terminal attached the deploy hangs there instead of failing.
    $remoteCmd = "bash -lc 'ha addons rebuild $AddonSlug && ha addons restart $AddonSlug'"
    ssh -p $HaPort -o StrictHostKeyChecking=accept-new "${HaUser}@${HaHost}" $remoteCmd
    if ($LASTEXITCODE -ne 0) { throw "Remote rebuild/restart failed. Verify the slug with: ssh ... 'ha addons'" }
} else {
    Write-Host '[3/3] Skipped (DoRebuild = $false) - rebuild manually in HA > Add-ons > GaztaindiGrill API' -ForegroundColor Yellow
}

Write-Host 'Done.' -ForegroundColor Green
