[CmdletBinding()]
param([switch]$ReportOnly)

# Read-only production checks. Upload and Search Advisor submission are separate actions.
$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$config = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'assets/shared/site.json') | ConvertFrom-Json
$ko = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'assets/i18n/ko.json') | ConvertFrom-Json
$base = [uri]$config.sitemapBaseUrl
Add-Type -AssemblyName System.Net.Http
$handler = [Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$handler.AutomaticDecompression = [Net.DecompressionMethods]::GZip -bor [Net.DecompressionMethods]::Deflate
$client = [Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(20)
$client.DefaultRequestHeaders.CacheControl = [Net.Http.Headers.CacheControlHeaderValue]::Parse('no-cache')
$checks = [Collections.Generic.List[object]]::new()
function Record([string]$Name,[bool]$Passed,[string]$Detail) { $checks.Add([pscustomobject]@{name=$Name;passed=$Passed;detail=$Detail}) }
function Request([uri]$Url) {
    $response = $client.GetAsync($Url).GetAwaiter().GetResult()
    try {
        $bytes = $response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
        return [pscustomobject]@{status=[int]$response.StatusCode;location=[string]$response.Headers.Location;body=[Text.Encoding]::UTF8.GetString($bytes);bytes=$bytes}
    } finally { $response.Dispose() }
}
try {
    foreach ($pageFile in $config.pages.PSObject.Properties.Name) {
        $page = $config.pages.PSObject.Properties[$pageFile].Value
        $url = [uri]::new($base,[string]$page.canonicalPath)
        if ($pageFile -eq '404.html') { $url = [uri]::new($base,'404.html') }
        try {
            $response = Request $url
            Record ("HTML 200: $pageFile") ($response.status -eq 200) ([string]$response.status)
            $canonical = [regex]::Matches($response.body,'<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"')
            $expectedCanonical = [uri]::new($base,[string]$page.canonicalPath).AbsoluteUri
            Record ("Static canonical: $pageFile") ($canonical.Count -eq 1 -and $canonical[0].Groups[1].Value -ceq $expectedCanonical) $expectedCanonical
            $titleKey = if ($page.titleKey) { $page.titleKey } else { $config.defaults.titleKey }
            $title = [regex]::Matches($response.body,'<title\b[^>]*>(.*?)</title>')
            Record ("Static title: $pageFile") ($title.Count -eq 1 -and [Net.WebUtility]::HtmlDecode($title[0].Groups[1].Value) -ceq [string]$ko.PSObject.Properties[$titleKey].Value) $titleKey
            $descriptionKey = if ($page.descriptionKey) { $page.descriptionKey } else { $config.defaults.descriptionKey }
            $description = [regex]::Matches($response.body,'<meta\b[^>]*name="description"[^>]*content="([^"]*)"')
            Record ("Static description: $pageFile") ($description.Count -eq 1 -and [Net.WebUtility]::HtmlDecode($description[0].Groups[1].Value) -ceq [string]$ko.PSObject.Properties[$descriptionKey].Value) $descriptionKey
            $header = [regex]::Match($response.body,'(?s)<!-- site:header:start -->.*?<!-- site:header:end -->')
            $productName = [regex]::Unescape('\uC778\uC5D0\uB514\uD0C0\uC6D0 IN-EDITAONE')
            Record ("Static navigation: $pageFile") ($header.Success -and [regex]::Matches($header.Value,'<a href=').Count -eq 10 -and $header.Value.Contains($productName)) '10 current-brand links'
            Record ("No retired brand: $pageFile") ($response.body -notmatch '(?i)\uC778\uB381\uC2A4|in[-_ ]?deps') ''
            if ($page.robots) { Record ("Noindex: $pageFile") ($response.body -match '<meta name="robots" content="noindex') '' }
        } catch { Record ("Request: $pageFile") $false $_.Exception.Message }
    }
    $probe = [uri]::new($base,'solutions/data-editing-system/?from=seo&term=data%20quality')
    foreach ($alias in @("http://$($base.DnsSafeHost)","http://www.$($base.DnsSafeHost)","https://www.$($base.DnsSafeHost)")) {
        try {
            $requestUrl = [uri]($alias + $probe.PathAndQuery)
            $response = Request $requestUrl
            Record ("Single-hop 301: $alias") ($response.status -eq 301 -and $response.location -ceq $probe.AbsoluteUri) ([string]$response.status + ' ' + $response.location)
        } catch { Record ("Redirect: $alias") $false $_.Exception.Message }
    }
    try {
        $response = Request ([uri]::new($base,'sitemap.xml'))
        [xml]$xml = $response.body
        $actual = @($xml.urlset.url | ForEach-Object { [string]$_.loc })
        $expected = @($config.sitemapPages | ForEach-Object { [uri]::new($base,[string]$config.pages.PSObject.Properties[$_].Value.canonicalPath).AbsoluteUri })
        Record 'Sitemap 10 URLs' ($response.status -eq 200 -and $actual.Count -eq 10 -and ($actual -join '|') -ceq ($expected -join '|')) ([string]$actual.Count)
        $robots = Request ([uri]::new($base,'robots.txt'))
        Record 'Robots crawl allowed' ($robots.status -eq 200 -and $robots.body -match '(?m)^Allow:\s*/\s*$' -and $robots.body -notmatch '(?m)^Disallow:\s*/\s*$' -and $robots.body.Contains([uri]::new($base,'sitemap.xml').AbsoluteUri)) ''
    } catch { Record 'Search discovery requests' $false $_.Exception.Message }
    foreach ($retired in @('html/About.html','html/Solution.html','insights/')) {
        try { $response = Request ([uri]::new($base,$retired)); Record ("Retired path: $retired") ($response.status -in @(404,410)) ([string]$response.status) }
        catch { Record ("Retired path: $retired") $false $_.Exception.Message }
    }
    try {
        $response = Request ([uri]::new($base,'assets/shared/site.json'))
        $remote = $response.body | ConvertFrom-Json
        foreach ($asset in @('assets/js/common.js','assets/js/navigation.js','assets/js/site.js','assets/brand-2026/design.js','assets/css/site.css','assets/css/menu-hero.css')) {
            $version = [string]$config.assetVersions.PSObject.Properties[$asset].Value
            $remoteVersion = [string]$remote.assetVersions.PSObject.Properties[$asset].Value
            Record ("Config version: $asset") ($version -ceq $remoteVersion) ("local=$version remote=$remoteVersion")
            $resource = Request ([uri]::new($base,($asset + '?v=' + $version)))
            $sha = [Security.Cryptography.SHA256]::Create()
            try { $actualHash = ([BitConverter]::ToString($sha.ComputeHash($resource.bytes))).Replace('-','').Substring(0,16).ToLowerInvariant() }
            finally { $sha.Dispose() }
            Record ("Served bytes: $asset") ($resource.status -eq 200 -and $actualHash -ceq $version) $actualHash
        }
    } catch { Record 'Production asset versions' $false $_.Exception.Message }
} finally { $client.Dispose(); $handler.Dispose() }
$reportPath = Join-Path $siteRoot '.tmp/seo-production.json'
$null = New-Item -ItemType Directory -Path (Split-Path $reportPath) -Force
[IO.File]::WriteAllText($reportPath,((ConvertTo-Json -InputObject @($checks) -Depth 5) + "`n"),[Text.UTF8Encoding]::new($false))
$failed = @($checks | Where-Object { -not $_.passed })
Write-Host "Production checks: $($checks.Count - $failed.Count)/$($checks.Count) passed. Report: $reportPath"
foreach ($item in $failed) { Write-Host ("PENDING: " + $item.name + ' ' + $item.detail) }
if ($failed.Count -and -not $ReportOnly) { throw 'Production SEO is not fully deployed/verified. Source/ZIP completion is separate from Cafe24 upload and Naver recrawl.' }
