#!/usr/bin/env pwsh
# Deploys the GaztaindiGrill web client: runs the checks, builds the static
# export and mirrors out/ onto the Home Assistant share over Samba, wiping
# whatever was served there before.
#
# -SkipBuild reuses the export already in out/ and goes straight to the upload.
# Use it to retry when only the Samba step failed.

param([switch]$SkipBuild)

$ErrorActionPreference = 'Stop'

# --------------------------------- Config -----------------------------------
$HaHost     = 'homeassistant.local'
$SambaUser  = 'izeta'
$SambaPass  = 'izeta'
$SambaShare = 'share'
$RemoteDir  = 'htdocs'
# The Apache2 add-on serves /share/htdocs on its port 80, mapped to 8081. It reads
# from disk per request, so replacing the files needs no restart.
$WebPort    = 8081
# -----------------------------------------------------------------------------

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutDir      = Join-Path $ScriptDir 'out'
$HtaccessSrc = Join-Path $ScriptDir 'deploy.htaccess'
$RemoteShare = "\\$HaHost\$SambaShare"
$RemoteSite  = "$RemoteShare\$RemoteDir"
$SiteUrl     = "http://${HaHost}:$WebPort/"

function Get-SambaSessionsTo($hostName) {
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    $pattern = "\\\\$([regex]::Escape($hostName))\\\S+"
    $found = @()
    (net use) | Select-String -Pattern $pattern -AllMatches | ForEach-Object {
        foreach ($m in $_.Matches) { $found += $m.Value }
    }
    $ErrorActionPreference = $prevEAP
    return @($found | Select-Object -Unique)
}

function Remove-SambaSessionsTo($hostName) {
    foreach ($conn in (Get-SambaSessionsTo $hostName)) {
        cmd /c "net use `"$conn`" /delete /y" 2>$null | Out-Null
    }
}

if ($SkipBuild) {
    Write-Host '[1/4] Checks skipped (-SkipBuild)' -ForegroundColor Yellow
    Write-Host '[2/4] Build skipped (-SkipBuild), reusing out' -ForegroundColor Yellow
} else {
    # next dev (turbopack) and next build (webpack) write to the same .next, so
    # building under a live dev server leaves it throwing ENOENT on every request.
    $devServer = Get-CimInstance Win32_Process -Filter "Name like '%node%'" |
        Where-Object { $_.CommandLine -like "*$ScriptDir*" -and $_.CommandLine -like '*next*dev*' }
    if ($devServer) { throw 'npm run dev is running. Stop it first, or the build will break its .next manifests.' }

    # No test suite exists in this project yet; lint and typecheck are the gates
    # there are. Add `npm test` here once there is something to run.
    Write-Host '[1/4] Running the checks' -ForegroundColor Cyan
    npm run lint
    if ($LASTEXITCODE -ne 0) { throw 'next lint failed' }
    npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'tsc failed' }

    Write-Host '[2/4] Building the static export' -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'next build failed' }
}

if (-not (Test-Path (Join-Path $OutDir 'index.html'))) {
    throw "No static export at $OutDir - build first, or check that output: 'export' is still set in next.config.ts"
}

# Shipped from a tracked file rather than public/, because whether next copies a
# dotfile out of public/ is not something the deploy should depend on.
if (-not (Test-Path $HtaccessSrc)) { throw "Missing $HtaccessSrc" }
Copy-Item $HtaccessSrc (Join-Path $OutDir '.htaccess') -Force

Write-Host "[3/4] Mirroring out -> $RemoteSite via Samba" -ForegroundColor Cyan

# Windows allows only one credential set per SMB server at a time, so any
# stale connection to $HaHost must be torn down before authenticating again.
Remove-SambaSessionsTo $HaHost
$stuck = Get-SambaSessionsTo $HaHost
if ($stuck) {
    throw "Cannot drop the existing connection to $($stuck -join ', '). An Explorer window sitting on that share holds it open and recreates it - close it and retry with: npm run deploy -- -SkipBuild"
}

cmd /c "net use $RemoteShare /user:$SambaUser $SambaPass" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Samba auth against $RemoteShare failed. Check user/password/host, and that nothing else (an Explorer window, a mapped drive) is already connected to $HaHost with other credentials." }
try {
    robocopy $OutDir $RemoteSite /MIR /NFL /NDL /NJH /NJS /NP /R:2 /W:2 | Out-Null
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy (Samba upload) failed (code $LASTEXITCODE). The export in out/ is still good - retry with: npm run deploy -- -SkipBuild"
    }
    $global:LASTEXITCODE = 0
} finally {
    Remove-SambaSessionsTo $HaHost
}

Write-Host "[4/4] Checking $SiteUrl" -ForegroundColor Cyan
try {
    $resp = Invoke-WebRequest -Uri $SiteUrl -UseBasicParsing -TimeoutSec 10
    if ($resp.StatusCode -ne 200) {
        Write-Host "Files are in place, but $SiteUrl answered $($resp.StatusCode)." -ForegroundColor Yellow
    } else {
        # An ignored .htaccess (AllowOverride None, mod_headers missing) fails
        # silently, and the only symptom is a browser serving yesterday's HTML.
        $cacheControl = $resp.Headers['Cache-Control']
        if ($cacheControl) {
            Write-Host "Done. Serving from $SiteUrl (Cache-Control: $cacheControl)" -ForegroundColor Green
        } else {
            Write-Host "Done, but $SiteUrl sends no Cache-Control: the .htaccess is being ignored, so browsers will keep caching the old HTML." -ForegroundColor Yellow
        }

        # The export writes control.html, so an extensionless /control only works
        # through the rewrite in deploy.htaccess. Check it actually took.
        try {
            $deep = Invoke-WebRequest -Uri "${SiteUrl}control" -UseBasicParsing -TimeoutSec 10
            if ($deep.StatusCode -ne 200) {
                Write-Host "  ${SiteUrl}control answered $($deep.StatusCode): deep links are not resolving to .html." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ${SiteUrl}control is not resolving to control.html - mod_rewrite is off or the .htaccess rewrite is being ignored." -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Files are in place, but $SiteUrl did not answer - check the Apache2 add-on is started. $($_.Exception.Message)" -ForegroundColor Yellow
}
