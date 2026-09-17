[CmdletBinding()]
param(
    [ValidateSet(8200)][int]$Port = 8200,
    [switch]$Restart,
    [switch]$PreviewSubdirectory
)

$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$siteUrl = "http://127.0.0.1:$Port/"
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'static-files.json') | ConvertFrom-Json
$files = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($entry in $manifest) { $null = $files.Add($entry) }
$existing = $null
try { $existing = Invoke-WebRequest -Uri $siteUrl -UseBasicParsing -TimeoutSec 2 } catch { }
if ($existing -and $existing.Headers['X-INIT-Static-Server']) {
    if (-not $Restart) { Write-Host "Static homepage is already running: $siteUrl"; return }
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
    '.webp' = 'image/webp'; '.ico' = 'image/x-icon'; '.pdf' = 'application/pdf'
}
$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add($siteUrl)
try {
    $listener.Start()
    Write-Host "INIT static homepage: $siteUrl"
    Write-Host 'Python/PHP/Node are not used. Press Ctrl+C to stop.'
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $response = $context.Response
        try {
            $response.Headers['X-INIT-Static-Server'] = [string]$PID
            $response.Headers['X-Content-Type-Options'] = 'nosniff'
            $response.Headers['X-Frame-Options'] = 'DENY'
            $response.Headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
            $response.Headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
            $response.Headers['Content-Security-Policy'] = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'"
            $response.Headers['Cache-Control'] = 'no-cache'
            $request = $context.Request
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
            $bytes = [IO.File]::ReadAllBytes($path)
            $response.ContentLength64 = $bytes.Length
            if ($request.HttpMethod -eq 'GET') { $response.OutputStream.Write($bytes, 0, $bytes.Length) }
        } catch {
            Write-Warning $_.Exception.Message
        } finally { $response.Close() }
    }
} finally { $listener.Close() }
