[CmdletBinding()]
param([switch]$Check, [switch]$Quiet)
# Compatibility command: only search-discovery files are synchronized.
# Public HTML is authored directly and is never expanded or rewritten here.
$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$configPath = Join-Path $siteRoot 'assets/shared/site.json'
if (-not (Test-Path -LiteralPath $configPath)) { throw 'Missing browser site configuration.' }
$config = Get-Content -Raw -Encoding UTF8 -LiteralPath $configPath | ConvertFrom-Json
$base = [uri]$config.sitemapBaseUrl
if ($base.Scheme -notin @('https','http') -or -not $config.sitemapBaseUrl.EndsWith('/') -or $base.Query -or $base.Fragment -or $base.UserInfo) { throw 'Invalid sitemapBaseUrl.' }
$lines = @('<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
# The approved sitemap list and its order are explicit, independent of other public pages.
if (-not $config.sitemapPages) { throw 'Missing approved sitemap page list.' }
$seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($pageFile in $config.sitemapPages) {
    if (-not $seen.Add([string]$pageFile)) { throw "Duplicate sitemap page: $pageFile" }
    $page = $config.pages.PSObject.Properties[[string]$pageFile]
    if (-not $page -or $page.Value.robots -match 'noindex') { throw "Invalid sitemap page: $pageFile" }
    $relative = [string]$page.Value.canonicalPath
    if ($relative -match '(^/|\\|(^|/)\.\.(/|$)|:|[?#])') { throw 'Invalid canonicalPath.' }
    $lines += '    <url><loc>' + [Net.WebUtility]::HtmlEncode([uri]::new($base,$relative).AbsoluteUri) + '</loc></url>'
}
$lines += '</urlset>'
$utf8 = [Text.UTF8Encoding]::new($false)
$updates = @{'sitemap.xml' = ($lines -join "`n") + "`n"}
$robots = [IO.File]::ReadAllText((Join-Path $siteRoot 'robots.txt'),$utf8)
$updates['robots.txt'] = [regex]::Replace($robots,'(?m)^Sitemap:.*$', 'Sitemap: ' + [uri]::new($base,'sitemap.xml').AbsoluteUri)
foreach ($file in $updates.Keys) {
    $path = Join-Path $siteRoot $file
    if ([IO.File]::ReadAllText($path,$utf8) -cne $updates[$file]) {
        if ($Check) { throw "Search discovery is stale: $file. Run scripts/build-site.ps1." }
        [IO.File]::WriteAllText($path,$updates[$file],$utf8)
    }
}
if (-not $Quiet) { Write-Host 'Search discovery is current. HTML/CSS/JS run directly in the browser; no HTML generation.' }
