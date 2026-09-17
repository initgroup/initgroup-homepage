[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$siteRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$errors = [System.Collections.Generic.List[string]]::new()
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'static-files.json') | ConvertFrom-Json
$publicFiles = @{}
$htmlContents = @{}

foreach ($entry in $manifest) {
    if ($entry -match '(^/|\\|(^|/)\.\.(/|$)|:)' -or $entry -match '^assets/images/reference/in-surveyone/') {
        throw "Invalid public file: $entry"
    }
    $path = [IO.Path]::GetFullPath((Join-Path $siteRoot $entry))
    if (-not $path.StartsWith($siteRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Public file escapes repository: $entry"
    }
    $publicFiles[$path] = $true
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { $errors.Add("Missing public file: $entry"); continue }
    if ($entry.EndsWith('.html')) { $htmlContents[$path] = Get-Content -Raw -Encoding UTF8 -LiteralPath $path }
}
if ($htmlContents.Count -eq 0) { throw 'No static HTML pages found.' }

function Test-LocalReference([string]$file, [string]$reference) {
    $reference = [Net.WebUtility]::HtmlDecode($reference)
    if (-not $reference -or $reference -match '^[a-z][a-z0-9+.-]*:') { return }
    if ($reference.StartsWith('/') -or $reference.Contains('\')) {
        $errors.Add("$file : absolute or invalid internal reference '$reference'")
        return
    }
    $fragmentParts = $reference -split '#', 2
    $urlPath = [Uri]::UnescapeDataString(($fragmentParts[0] -split '\?', 2)[0])
    $target = if ($urlPath) { [IO.Path]::GetFullPath((Join-Path (Split-Path $file) $urlPath)) } else { $file }
    if ((Test-Path -LiteralPath $target -PathType Container) -or $urlPath.EndsWith('/')) { $target = Join-Path $target 'index.html' }
    if (-not $publicFiles.ContainsKey($target)) { $errors.Add("$file : missing public target '$reference'"); return }
    if ($fragmentParts.Count -eq 2 -and $fragmentParts[1] -and $htmlContents.ContainsKey($target)) {
        $fragment = [regex]::Escape([Uri]::UnescapeDataString($fragmentParts[1]))
        if ($htmlContents[$target] -notmatch ('\sid="' + $fragment + '"')) {
            $errors.Add("$file : missing fragment '$reference'")
        }
    }
}

foreach ($file in $htmlContents.Keys) {
    $content = $htmlContents[$file]
    foreach ($contract in @{
        title = '<title>.*?</title>'; description = '<meta\s+name="description"';
        canonical = '<link\s+rel="canonical"'; viewport = '<meta\s+name="viewport"';
        h1 = '<h1(?:\s|>)'; main = '<main(?:\s|>)'
    }.GetEnumerator()) {
        $count = [regex]::Matches($content, $contract.Value, 'IgnoreCase, Singleline').Count
        if ($count -ne 1) { $errors.Add("$file : expected one $($contract.Key), found $count") }
    }
    if ($content -match '\{%|\{\{') { $errors.Add("$file : unrendered template") }
    if ($content -match '<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>') { $errors.Add("$file : executable inline script") }
    foreach ($payload in [regex]::Matches($content, '<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', 'IgnoreCase, Singleline')) {
        try { $null = $payload.Groups[1].Value | ConvertFrom-Json } catch { $errors.Add("$file : invalid JSON-LD") }
    }
    $ids = [regex]::Matches($content, '\sid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
    foreach ($duplicate in @($ids | Group-Object | Where-Object Count -gt 1)) { $errors.Add("$file : duplicate id '$($duplicate.Name)'") }
    foreach ($image in [regex]::Matches($content, '<img\b[^>]*>', 'IgnoreCase')) {
        if ($image.Value -notmatch '\salt="[^"]*"') { $errors.Add("$file : image without alt") }
    }
    foreach ($reference in [regex]::Matches($content, '(?:^|\s)(?:src|href|data-image|data-i18n-config|data-history-fallback)="([^"]*)"', 'IgnoreCase')) {
        Test-LocalReference $file $reference.Groups[1].Value
    }
    foreach ($imageBase in [regex]::Matches($content, 'data-i18n-image-base="([^"]+)"')) {
        $base = $imageBase.Groups[1].Value
        if ($base -match '_(kor|eng)$') { $errors.Add("$file : localized image base contains suffix") }
        foreach ($suffix in @('kor', 'eng')) { Test-LocalReference $file "${base}_${suffix}.png" }
    }
}

$cssFiles = @(Get-ChildItem -LiteralPath (Join-Path $siteRoot 'assets/css') -File -Filter '*.css')
foreach ($file in $cssFiles) {
    $content = Get-Content -Raw -Encoding UTF8 -LiteralPath $file.FullName
    if ([regex]::Matches($content, '\{').Count -ne [regex]::Matches($content, '\}').Count) { $errors.Add("$($file.Name) : CSS brace mismatch") }
    foreach ($reference in [regex]::Matches($content, 'url\(\s*["'']?([^\)"''\s]+)')) {
        if (-not $reference.Groups[1].Value.StartsWith('#')) { Test-LocalReference $file.FullName $reference.Groups[1].Value }
    }
}

$configPath = Join-Path $siteRoot 'assets/i18n/config.json'
$config = Get-Content -Raw -Encoding UTF8 -LiteralPath $configPath | ConvertFrom-Json
$ko = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'assets/i18n/ko.json') | ConvertFrom-Json
$en = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'assets/i18n/en.json') | ConvertFrom-Json
$koKeys = @($ko.PSObject.Properties.Name | Sort-Object)
$enKeys = @($en.PSObject.Properties.Name | Sort-Object)
if (Compare-Object $koKeys $enKeys) { $errors.Add('Korean and English catalog keys differ') }
foreach ($catalog in $config.catalogs.PSObject.Properties) { Test-LocalReference $configPath $catalog.Value }
foreach ($entry in $en.PSObject.Properties) {
    $original = $ko.PSObject.Properties[$entry.Name].Value
    if ($entry.Value -match '[\uac00-\ud7a3]' -or (-not $entry.Value -and $original -notin @(([regex]::Unescape('\uc5d0\uc11c \uc2dc\uc791\ub429\ub2c8\ub2e4')), ([regex]::Unescape('\ub97c')), ([regex]::Unescape('\uc785\ub2c8\ub2e4'))))) {
        $errors.Add("Missing English translation: $($entry.Name)")
    }
}
[xml]$sitemap = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'sitemap.xml')
foreach ($url in $sitemap.urlset.url) {
    $location = [uri]$url.loc
    if ($location.Host -ne 'initgroup.kr') { $errors.Add("Unexpected sitemap domain: $location") }
    Test-LocalReference (Join-Path $siteRoot 'index.html') $location.AbsolutePath.TrimStart('/')
}

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    foreach ($file in Get-ChildItem -LiteralPath (Join-Path $siteRoot 'assets/js') -File -Filter '*.js') {
        & $node.Source --check $file.FullName
        if ($LASTEXITCODE -ne 0) { $errors.Add("$($file.Name) : JavaScript syntax error") }
    }
}
if ($errors.Count) {
    $errors | ForEach-Object { Write-Host "ERROR: $_" -ForegroundColor Red }
    throw "Static validation failed: $($errors.Count) issue(s)"
}
Write-Host "Static validation OK: $($htmlContents.Count) HTML pages, $($manifest.Count) public files, $($koKeys.Count) language keys."
