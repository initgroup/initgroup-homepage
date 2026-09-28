[CmdletBinding()]
param(
    [ValidateSet(8200)][int]$Port = 8200,
    [switch]$Restart,
    [switch]$PreviewSubdirectory
)

$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$siteUrl = "http://127.0.0.1:$Port/"
$serverRevision = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash.Substring(0, 12)
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'static-files.json') | ConvertFrom-Json
$files = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($entry in $manifest) { $null = $files.Add($entry) }
$existing = $null
try { $existing = Invoke-WebRequest -Uri $siteUrl -UseBasicParsing -TimeoutSec 2 } catch { }
if ($existing -and $existing.Headers['X-INIT-Static-Server']) {
    if (-not $Restart) {
        if ($existing.Headers['X-INIT-Static-Revision'] -ne $serverRevision) {
            throw "An older static server is still running (PID $($existing.Headers['X-INIT-Static-Server'])). Press Ctrl+C in its terminal, then run .\scripts\serve.ps1 -Port 8200 again."
        }
        Write-Host "Static homepage is already running: $siteUrl (revision $serverRevision)"
        return
    }
    $serverProcessId = [int]$existing.Headers['X-INIT-Static-Server']
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $serverProcessId"
    if (-not $process -or $process.Name -notmatch '^powershell(.exe)?$' -or $process.CommandLine -notlike "*$PSScriptRoot*serve.ps1*") {
        throw 'The existing server could not be verified. Stop it manually.'
    }
    Stop-Process -Id $serverProcessId -ErrorAction Stop
    Start-Sleep -Milliseconds 300
}
$occupied = @(netstat.exe -ano -p tcp | Select-String -Pattern (':{0}\s+.*LISTENING\s+\d+$' -f $Port))
if ($occupied.Count) {
    $owners = @($occupied | ForEach-Object { [int](($_.ToString().Trim() -split '\s+')[-1]) } | Sort-Object -Unique)
    $descriptions = foreach ($owner in $owners) {
        $process = Get-Process -Id $owner -ErrorAction SilentlyContinue
        "PID $owner ($($process.ProcessName))"
    }
    throw "Port $Port is occupied by $($descriptions -join ', '). Stop the existing server before starting the static preview."
}

$mime = @{
    '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8';
    '.js' = 'text/javascript; charset=utf-8'; '.json' = 'application/json; charset=utf-8';
    '.txt' = 'text/plain; charset=utf-8'; '.xml' = 'application/xml; charset=utf-8';
    '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg';
    '.webp' = 'image/webp'; '.ico' = 'image/x-icon'; '.pdf' = 'application/pdf'; '.mp4' = 'video/mp4'; '.woff2' = 'font/woff2'
}
# Only known transport disconnects are routine; never suppress disk or other server errors.
function Test-ClientDisconnect([Exception]$Exception) {
    for ($cause = $Exception; $null -ne $cause; $cause = $cause.InnerException) {
        # HTTP.sys also returns ERROR_BAD_COMMAND after a client resets an active response.
        if ($cause -is [Net.HttpListenerException] -and $cause.NativeErrorCode -eq 22) { return $true }
        if (($cause -is [Net.HttpListenerException] -or $cause -is [Net.Sockets.SocketException]) -and
            $cause.NativeErrorCode -in @(64, 995, 1229, 1236, 10053, 10054, 10058)) { return $true }
    }
    return $false
}

function Get-StaticByteRange([string]$Header, [long]$Length) {
    $full = @{ Status = 200; Offset = 0L; Count = $Length; ContentRange = $null }
    # Unsupported/malformed/multipart ranges may be ignored (RFC 9110 section 14).
    if ($Header -notmatch '^bytes=(\d*)-(\d*)$') { return $full }
    $first = $Matches[1]
    $last = $Matches[2]
    if (-not $first -and -not $last) { return $full }
    [long]$start = 0
    [long]$end = 0
    if ($first -and -not [long]::TryParse($first, [ref]$start)) { return $full }
    if ($last -and -not [long]::TryParse($last, [ref]$end)) { return $full }
    if ($first -and $last -and $end -lt $start) { return $full }
    $unsatisfied = @{ Status = 416; Offset = 0L; Count = 0L; ContentRange = "bytes */$Length" }
    if ($Length -eq 0) { return $unsatisfied }
    if (-not $first) {
        if ($end -eq 0) { return $unsatisfied }
        $start = [Math]::Max(0L, $Length - $end)
        $end = $Length - 1
    } else {
        if ($start -ge $Length) { return $unsatisfied }
        if (-not $last -or $end -ge $Length) { $end = $Length - 1 }
    }
    return @{ Status = 206; Offset = $start; Count = $end - $start + 1; ContentRange = "bytes $start-$end/$Length" }
}

function Send-StaticFile($Request, $Response, [string]$Path) {
    $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
    try {
        $header = ''
        # No validators are emitted, so If-Range requires a full response.
        if ($Request.HttpMethod -eq 'GET' -and -not $Request.Headers['If-Range']) {
            $header = $Request.Headers['Range']
        }
        $range = Get-StaticByteRange $header $stream.Length
        $Response.Headers['Accept-Ranges'] = 'bytes'
        $Response.StatusCode = $range.Status
        $Response.ContentLength64 = $range.Count
        if ($range.ContentRange) { $Response.Headers['Content-Range'] = $range.ContentRange }
        if ($Request.HttpMethod -eq 'HEAD' -or $range.Count -eq 0) { return }
        $null = $stream.Seek($range.Offset, [IO.SeekOrigin]::Begin)
        $buffer = New-Object byte[] 65536
        [long]$remaining = $range.Count
        while ($remaining -gt 0) {
            $count = $stream.Read($buffer, 0, [int][Math]::Min($buffer.Length, $remaining))
            if ($count -eq 0) { throw [IO.EndOfStreamException]::new('File ended before the response was complete.') }
            $Response.OutputStream.Write($buffer, 0, $count)
            $remaining -= $count
        }
    } finally { $stream.Dispose() }
}

function Write-StaticRequestError {
    [CmdletBinding()]
    param($Request, [Exception]$Exception)
    if (Test-ClientDisconnect $Exception) { return }
    $cause = $Exception.GetBaseException()
    $detail = $cause.GetType().Name
    if ($cause -is [ComponentModel.Win32Exception]) { $detail += " native=$($cause.NativeErrorCode)" }
    Write-Warning ("{0} {1}: [{2}] {3}" -f $Request.HttpMethod, $Request.Url.AbsolutePath, $detail, $cause.Message)
}

function Close-StaticResponse {
    [CmdletBinding()]
    param($Request, $Response)
    try { $Response.Close() } catch {
        Write-StaticRequestError $Request $_.Exception
    }
}

$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add($siteUrl)
try {
    $listener.Start()
    Write-Host "INIT static homepage: $siteUrl"
    Write-Host "Server revision: $serverRevision (streaming + byte ranges)"
    Write-Host 'Python/PHP/Node are not used. Press Ctrl+C to stop.'
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $response = $context.Response
        $request = $context.Request
        try {
            $response.Headers['X-INIT-Static-Server'] = [string]$PID
            $response.Headers['X-INIT-Static-Revision'] = $serverRevision
            $response.Headers['X-Content-Type-Options'] = 'nosniff'
            $response.Headers['X-Frame-Options'] = 'DENY'
            $response.Headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
            $response.Headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
            $response.Headers['Content-Security-Policy'] = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'"
            $response.Headers['Cache-Control'] = 'no-cache'
            if ($request.HttpMethod -notin @('GET', 'HEAD')) {
                $response.StatusCode = 405
                $response.Headers['Allow'] = 'GET, HEAD'
                continue
            }
            $relative = [Uri]::UnescapeDataString($request.Url.AbsolutePath).TrimStart('/')
            if ($relative -match '(^|/)\.\.(/|$)|\\|:') { $response.StatusCode = 404; continue }
            # A second mount exercises subdirectory hosting using the same public files.
            if ($PreviewSubdirectory -and $relative.StartsWith('preview/')) { $relative = $relative.Substring('preview/'.Length) }
            if (-not $relative -or $relative.EndsWith('/')) { $relative += 'index.html' }
            if (-not $files.Contains($relative) -or $relative -eq '.htaccess') {
                if ($files.Contains($relative + '/index.html')) {
                    $response.StatusCode = 308
                    $response.RedirectLocation = $request.Url.AbsolutePath + '/' + $request.Url.Query
                } else {
                    $response.StatusCode = 404
                    $response.ContentType = 'text/plain; charset=utf-8'
                    $bytes = [Text.Encoding]::UTF8.GetBytes('404 - Page not found')
                    $response.ContentLength64 = $bytes.Length
                    if ($request.HttpMethod -eq 'GET') { $response.OutputStream.Write($bytes, 0, $bytes.Length) }
                }
                continue
            }
            $path = [IO.Path]::GetFullPath((Join-Path $siteRoot $relative))
            if (-not $path.StartsWith($siteRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { $response.StatusCode = 404; continue }
            $extension = [IO.Path]::GetExtension($path).ToLowerInvariant()
            $response.ContentType = if ($mime.ContainsKey($extension)) { $mime[$extension] } else { 'application/octet-stream' }
            Send-StaticFile $request $response $path
        } catch {
            Write-StaticRequestError $request $_.Exception
            # Abort incomplete responses; do not present a truncated body as a successful transfer.
            try { $response.Abort() } catch { Write-StaticRequestError $request $_.Exception }
        } finally { Close-StaticResponse $request $response }
    }
} finally { $listener.Close() }
