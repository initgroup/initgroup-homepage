[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
& (Join-Path $PSScriptRoot 'build-site.ps1') -Check -Quiet
& (Join-Path $PSScriptRoot 'update-asset-versions.ps1') -Check -Quiet
$errors = [Collections.Generic.List[string]]::new()
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'static-files.json') | ConvertFrom-Json
$headDefinition = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'assets/shared/site.json') | ConvertFrom-Json
$sitemapBaseUri = [uri]$headDefinition.sitemapBaseUrl
$internalHosts = @($sitemapBaseUri.DnsSafeHost,'initgroup.kr','www.initgroup.kr') | Sort-Object -Unique
if ($headDefinition.PSObject.Properties['publicBaseUrl']) { $errors.Add('Obsolete publicBaseUrl: browser metadata must be relative') }
$publicFiles = @{}
$htmlContents = @{}
if (@($manifest | Sort-Object -Unique).Count -ne $manifest.Count) { $errors.Add('Duplicate deployment entries') }
foreach ($entry in $manifest) {
    if ($entry -match '(^/|\\|(^|/)\.\.(/|$)|:)|^(insights/|templates/|content/|scripts/|references/|includes/|assets/images/reference/in-surveyone/)|\.(php|py|cgi|exe|dll|ps1|cjs|sh)$') { throw "Invalid static deployment file: $entry" }
    $path = [IO.Path]::GetFullPath((Join-Path $siteRoot $entry))
    if (-not $path.StartsWith($siteRoot + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Path escapes workspace.' }
    $publicFiles[$path] = $true
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { $errors.Add("Missing deployment file: $entry"); continue }
    if ($entry.EndsWith('.html') -and -not $entry.StartsWith('assets/')) { $htmlContents[$path] = Get-Content -Raw -Encoding UTF8 -LiteralPath $path }
}

function Test-LocalReference([string]$file, [string]$reference) {
    $reference = [Net.WebUtility]::HtmlDecode($reference)
    if (-not $reference) { return }
    if ($reference -match '^https?://') {
        $absolute = $null
        if ([uri]::TryCreate($reference, [UriKind]::Absolute, [ref]$absolute) -and $absolute.DnsSafeHost -in $internalHosts) {
            $errors.Add("$file : same-site absolute reference must be relative '$reference'")
        }
        return
    }
    if ($reference -match '^[a-z][a-z0-9+.-]*:') { return }
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

$layout = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot $headDefinition.components)
$componentIds = @([regex]::Matches($layout,'<template id="([a-z][a-z0-9-]*)">') | ForEach-Object { $_.Groups[1].Value })
if (@($componentIds | Sort-Object -Unique).Count -ne $componentIds.Count) { $errors.Add('Duplicate HTML component ids') }
$pages = @($manifest | Where-Object { $_.EndsWith('.html') -and -not $_.StartsWith('assets/') })
if (@(Compare-Object $pages @($headDefinition.pages.PSObject.Properties.Name)).Count) { $errors.Add('Common page definitions differ from public pages') }
foreach ($file in $htmlContents.Keys) {
    $source = $htmlContents[$file]
    $relative = $file.Substring($siteRoot.Length + 1).Replace('\','/')
    $loaders = [regex]::Matches($source,'<script[^>]*src="([^"]+)"[^>]*>')
    if ($loaders.Count -ne 1 -or $loaders[0].Groups[1].Value -notmatch '^(?:\.\./)*assets/js/common\.js\?v=[a-f0-9]{16}$') { $errors.Add("$relative : expected exactly one common loader") }
    if ($source -notmatch ('data-page-file="' + [regex]::Escape($relative) + '"')) { $errors.Add("$relative : incorrect loader page key") }
    if ($source -match '<\?php|<meta\b|<link\b|application/ld\+json|data-site-header|class="site-footer"|\{\{|<script(?![^>]*\bsrc=)') { $errors.Add("$relative : duplicated common markup, inline script or unresolved server code") }
    foreach ($tag in @('h1','main')) {
        if ([regex]::Matches($source,'<'+$tag+'(?:\s|>)').Count -ne 1) { $errors.Add("$relative : expected one $tag") }
    }
    foreach ($include in [regex]::Matches($source,'data-site-include="([^"]+)"')) {
        if ($include.Groups[1].Value -notin $componentIds) { $errors.Add("$relative : unknown HTML include") }
    }
    $ids = @([regex]::Matches($source,'\sid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
    if (@($ids | Sort-Object -Unique).Count -ne $ids.Count) { $errors.Add("$relative : duplicate id") }
    foreach ($image in [regex]::Matches($source,'<img\b[^>]*>')) { if ($image.Value -notmatch '\salt="[^"]*"') { $errors.Add("$relative : missing image alt") } }
    foreach ($match in [regex]::Matches($source,'(?:^|\s)(?:src|href|poster|action|data-image|data-history-fallback|data-promo-src-ko|data-promo-src-en)="([^"]*)"')) { Test-LocalReference $file $match.Groups[1].Value }
    foreach ($match in [regex]::Matches($source,'data-i18n-image-base="([^"]+)"')) {
        foreach ($suffix in @('kor','eng')) { Test-LocalReference $file ($match.Groups[1].Value + "_$suffix.png") }
    }
}
foreach ($include in [regex]::Matches($layout,'\{\{include:([^{}]+)\}\}')) { if ($include.Groups[1].Value -notin $componentIds) { $errors.Add('Unknown nested HTML include') } }
foreach ($entry in @($manifest | Where-Object { $_.EndsWith('.css') })) {
    $file = Join-Path $siteRoot $entry
    $source = Get-Content -Raw -Encoding UTF8 -LiteralPath $file
    if ([regex]::Matches($source,'\{').Count -ne [regex]::Matches($source,'\}').Count) { $errors.Add("$entry : CSS brace mismatch") }
    foreach ($reference in [regex]::Matches($source,'url\(\s*["'']?([^\)"''\s]+)')) {
        if (-not $reference.Groups[1].Value.StartsWith('#')) { Test-LocalReference $file $reference.Groups[1].Value }
    }
}
$hostPattern = '(?:https?:)?//(?:' + (($internalHosts | ForEach-Object { [regex]::Escape($_) }) -join '|') + ')(?=[:/?#]|$)'
foreach ($entry in @($manifest | Where-Object { $_ -match '\.(js|json)$' -and $_ -ne 'assets/shared/site.json' })) {
    $source = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot $entry)
    if ($source -match $hostPattern) { $errors.Add("$entry : hardcoded same-site absolute URL") }
}

$browserSettings = ($headDefinition.PSObject.Properties | Where-Object { $_.Name -ne 'sitemapBaseUrl' } | ForEach-Object { ConvertTo-Json $_.Value -Depth 50 }) -join "`n"
if ($browserSettings -match $hostPattern) { $errors.Add('Same-site absolute URL in browser configuration') }

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
foreach ($file in $htmlContents.Keys) {
    foreach ($match in [regex]::Matches($htmlContents[$file], 'data-i18n="([^"]+)"')) {
        $key = $match.Groups[1].Value
        if (-not $ko.PSObject.Properties[$key] -or -not $en.PSObject.Properties[$key]) {
            $errors.Add("$file : missing explicit translation key '$key'")
        }
    }
}


$assetRoot = Join-Path $siteRoot 'index.html'
foreach ($kind in @('styles','scripts','icons')) {
    $items = @($headDefinition.PSObject.Properties[$kind].Value)
    if (@($items.path | Sort-Object -Unique).Count -ne $items.Count) { $errors.Add("Duplicate shared $kind") }
    foreach ($item in $items) { Test-LocalReference $assetRoot $item.path }
}
Test-LocalReference $assetRoot $headDefinition.components
Test-LocalReference $assetRoot $headDefinition.i18n
foreach ($item in $headDefinition.navigation.links.PSObject.Properties) {
    if (-not $item.Value.path.StartsWith('#')) { Test-LocalReference $assetRoot $item.Value.path }
    foreach ($language in @('ko','en')) {
        if (-not $item.Value.label.PSObject.Properties[$language].Value) { $errors.Add("Missing $language menu label: $($item.Name)") }
    }
}
foreach ($group in $headDefinition.navigation.groups) {
    foreach ($id in @($group.root) + @($group.items)) {
        if (-not $headDefinition.navigation.links.PSObject.Properties[$id]) { $errors.Add("Unknown menu item: $id") }
    }
}
foreach ($key in $koKeys) { if ($key.StartsWith('navigation.')) { $errors.Add('Menu translations must exist only in assets/shared/site.json') } }
foreach ($entry in $headDefinition.navigation.mobileActions.PSObject.Properties) {
    foreach ($id in $entry.Value.links) {
        $item = $headDefinition.navigation.links.PSObject.Properties[$id].Value
        if (-not $item) { $errors.Add("Unknown mobile action: $id"); continue }
        if ($item.path.StartsWith('#')) { Test-LocalReference (Join-Path $siteRoot $entry.Name) $item.path }
    }
}
$expectedUrls = @()
foreach ($page in $headDefinition.pages.PSObject.Properties) {
    $relative = [string]$page.Value.canonicalPath
    if ($relative -match '(^/|\\|(^|/)\.\.(/|$)|:|[?#])') { $errors.Add("Invalid canonical path: $($page.Name)") }
    Test-LocalReference $assetRoot $(if ($relative) { $relative } else { 'index.html' })
    foreach ($key in @($headDefinition.defaults.titleKey,$headDefinition.defaults.descriptionKey,$headDefinition.defaults.siteNameKey,$headDefinition.defaults.ogImageAltKey,$page.Value.titleKey,$page.Value.descriptionKey,$page.Value.ogImageAltKey) | Where-Object { $_ }) {
        if (-not $ko.PSObject.Properties[$key] -or -not $en.PSObject.Properties[$key]) { $errors.Add("Missing metadata translation: $key") }
    }
    if ($page.Value.ogImage) { Test-LocalReference $assetRoot $page.Value.ogImage }
}
Test-LocalReference $assetRoot $headDefinition.defaults.ogImage
foreach ($reference in [regex]::Matches((ConvertTo-Json $headDefinition -Depth 50),'"sitePath":\s*"([^"]*)"')) {
    $relative = ($reference.Groups[1].Value -split '#',2)[0]
    Test-LocalReference $assetRoot $(if ($relative) { $relative } else { 'index.html' })
}
$sitemapPages = @($headDefinition.sitemapPages)
if (-not $headDefinition.sitemapPages -or @($sitemapPages | Sort-Object -Unique).Count -ne $sitemapPages.Count) { $errors.Add('Missing or duplicate approved sitemap pages') }
foreach ($pageFile in $sitemapPages) {
    $page = $headDefinition.pages.PSObject.Properties[[string]$pageFile]
    if (-not $page -or $page.Value.robots -match 'noindex') { $errors.Add("Invalid approved sitemap page: $pageFile"); continue }
    $expectedUrls += [uri]::new($sitemapBaseUri,[string]$page.Value.canonicalPath).AbsoluteUri
}
[xml]$sitemap = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'sitemap.xml')
$actualUrls = @($sitemap.urlset.url | ForEach-Object { [string]$_.loc })
if (($expectedUrls -join "|") -cne ($actualUrls -join "|") -or @($actualUrls | Sort-Object -Unique).Count -ne $actualUrls.Count) { $errors.Add('Sitemap URLs or their order differ from the approved sitemapPages list') }
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    foreach ($entry in @($manifest | Where-Object { $_.EndsWith('.js') })) {
        & $node.Source --check (Join-Path $siteRoot $entry)
        if ($LASTEXITCODE -ne 0) { $errors.Add("JavaScript syntax error: $entry") }
    }
}
if ($errors.Count) {
    $errors | ForEach-Object { Write-Host "ERROR: $_" -ForegroundColor Red }
    throw "Static-source validation failed: $($errors.Count) issue(s)"
}
Write-Host "Static-source validation OK: $($pages.Count) pages, $($manifest.Count) deployment files, $($koKeys.Count) body/metadata translation keys plus shared bilingual navigation."
