[CmdletBinding()]
param([switch]$Check, [switch]$Quiet)

# Local deployment preparation only; Cafe24 serves the resulting static HTML.
$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$utf8 = [Text.UTF8Encoding]::new($false)
$config = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'assets/shared/site.json') | ConvertFrom-Json
if (-not $config.pages) { return }
$ko = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'assets/i18n/ko.json') | ConvertFrom-Json
$en = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'assets/i18n/en.json') | ConvertFrom-Json
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'static-files.json') | ConvertFrom-Json
$base = [uri]$config.sitemapBaseUrl
if ($base.Scheme -ne 'https' -or -not $config.sitemapBaseUrl.EndsWith('/') -or $base.Query -or $base.Fragment -or $base.UserInfo) { throw 'Invalid canonical site base URL.' }

function Escape-Html([string]$Value) { return [Security.SecurityElement]::Escape($Value) }
function Search-Url([string]$Path) {
    if ($Path -match '(^/|\\|(^|/)\.\.(/|$)|:)') { throw "Invalid search path: $Path" }
    return [uri]::new($base,$Path).AbsoluteUri
}
function Translate([string]$Key) {
    $property = $ko.PSObject.Properties[$Key]
    if (-not $property -or -not $en.PSObject.Properties[$Key]) { throw "Missing bilingual SEO translation: $Key" }
    return [string]$property.Value
}
function Tag([string]$Name, [Collections.IDictionary]$Attributes) {
    $items = @($Attributes.GetEnumerator() | ForEach-Object { $_.Key + '="' + (Escape-Html ([string]$_.Value)) + '"' })
    return '    <' + $Name + ' ' + ($items -join ' ') + ' data-site-meta="true">'
}
function Resolve-Value($Value, $Tokens) {
    if ($Value -is [string]) {
        if ($Value -match '^\{(\w+)\}$' -and $Tokens.Contains($Matches[1])) { return $Tokens[$Matches[1]] }
        return $Value
    }
    if ($null -eq $Value) { return $null }
    if ($Value -is [pscustomobject]) {
        if ($Value.PSObject.Properties['sitePath']) { return Search-Url ([string]$Value.sitePath) }
        $result = [ordered]@{}
        foreach ($property in $Value.PSObject.Properties) { $result[$property.Name] = Resolve-Value $property.Value $Tokens }
        return $result
    }
    if ($Value -is [Collections.IEnumerable]) {
        $items = @(foreach ($item in $Value) { Resolve-Value $item $Tokens })
        return ,$items
    }
    return $Value
}
function Seo-Block($Page) {
    $defaults = $config.defaults
    $titleKey = if ($Page.titleKey) { $Page.titleKey } else { $defaults.titleKey }
    $descriptionKey = if ($Page.descriptionKey) { $Page.descriptionKey } else { $defaults.descriptionKey }
    $tokens = [ordered]@{
        themeColor = [string]$defaults.themeColor
        colorScheme = [string]$defaults.colorScheme
        pageTitle = Translate $titleKey
        pageDescription = Translate $descriptionKey
        canonical = Search-Url ([string]$Page.canonicalPath)
    }
    $lines = @('    <!-- site:seo:start -->')
    foreach ($definition in $config.meta) {
        $attributes = [ordered]@{}
        foreach ($property in $definition.PSObject.Properties) {
            $value = [string]$property.Value
            foreach ($key in $tokens.Keys) { $value = $value.Replace('{' + $key + '}',[string]$tokens[$key]) }
            $attributes[$property.Name] = $value
        }
        $lines += Tag 'meta' $attributes
    }
    $lines += '    <title data-site-meta="true">' + (Escape-Html $tokens.pageTitle) + '</title>'
    $lines += Tag 'meta' ([ordered]@{ name='description'; content=$tokens.pageDescription })
    $lines += Tag 'link' ([ordered]@{ rel='canonical'; href=$tokens.canonical })
    if ($Page.robots) { $lines += Tag 'meta' ([ordered]@{ name='robots'; content=[string]$Page.robots }) }
    if ($Page.openGraph) {
        $image = if ($Page.ogImage) { $Page.ogImage } else { $defaults.ogImage }
        $imageAltKey = if ($Page.ogImageAltKey) { $Page.ogImageAltKey } else { $defaults.ogImageAltKey }
        $og = [ordered]@{
            type=$defaults.ogType; locale=$defaults.ogLocale; site_name=(Translate $defaults.siteNameKey)
            title=$tokens.pageTitle; description=$tokens.pageDescription; url=$tokens.canonical
            image=(Search-Url $image); 'image:alt'=(Translate $imageAltKey)
        }
        foreach ($key in $og.Keys) { $lines += Tag 'meta' ([ordered]@{ property=('og:' + $key); content=$og[$key] }) }
    }
    if ($Page.schemas) {
        $graphs = @(foreach ($schema in $Page.schemas) {
            $source = if ($schema.shared) { $config.sharedSchemas.PSObject.Properties[[string]$schema.shared].Value } else { $schema }
            if (-not $source) { throw 'Unknown shared SEO schema.' }
            Resolve-Value $source $tokens
        })
        $json = ConvertTo-Json -InputObject ([ordered]@{ '@context'='https://schema.org'; '@graph'=$graphs }) -Depth 80 -Compress
        $json = $json.Replace('<','\u003c').Replace('>','\u003e').Replace('&','\u0026')
        $lines += '    <script type="application/ld+json" data-site-meta="true">' + $json + '</script>'
    }
    $lines += '    <!-- site:seo:end -->'
    return $lines -join "`n"
}
function Header-Block([string]$File) {
    $depth = @($File.Split('/')).Count - 1
    $prefix = '../' * $depth
    $component = if ($File -eq '404.html') { 'header-compact' } else { 'header' }
    $lines = @('<!-- site:header:start -->',('<header data-site-include="' + $component + '" data-site-prerender="navigation">'),'    <nav>','        <ul>')
    foreach ($target in $config.sitemapPages) {
        $page = $config.pages.PSObject.Properties[[string]$target].Value
        $definition = $config.navigation.searchLabels.PSObject.Properties[[string]$target].Value
        if (-not $page -or -not $definition -or $page.robots -match 'noindex') { throw "Invalid static navigation entry: $target" }
        if ($definition.link) {
            $link = $config.navigation.links.PSObject.Properties[[string]$definition.link].Value
            if (-not $link.label.ko -or -not $link.label.en -or $link.path -ne $target) { throw "Invalid static navigation link: $target" }
            $label = [string]$link.label.ko
        } else { $label = Translate ([string]$definition.labelKey) }
        $href = $prefix + [string]$page.canonicalPath
        if (-not $href) { $href = './' }
        $lines += '            <li><a href="' + (Escape-Html $href) + '">' + (Escape-Html $label) + '</a></li>'
    }
    $lines += @('        </ul>','    </nav>','</header>','<!-- site:header:end -->')
    return $lines -join "`n"
}

$updates = [ordered]@{}
foreach ($entry in $config.pages.PSObject.Properties) {
    $file = [string]$entry.Name
    if ($file -notin $manifest -or $file -notmatch '^(?:[a-z0-9-]+/)*(?:index|404)\.html$') { throw "Invalid public SEO page: $file" }
    $path = Join-Path $siteRoot $file
    $source = [IO.File]::ReadAllText($path,$utf8)
    $updated = $source.Replace("`r`n","`n")
    $seo = Seo-Block $entry.Value
    $seoPattern = '(?ms)^    <!-- site:seo:start -->\n.*?^    <!-- site:seo:end -->'
    if ([regex]::IsMatch($updated,$seoPattern)) {
        if ([regex]::Matches($updated,$seoPattern).Count -ne 1) { throw "Duplicate static SEO block: $file" }
        $updated = [regex]::Replace($updated,$seoPattern,[Text.RegularExpressions.MatchEvaluator]{ param($match) $seo })
    } else {
        if ($updated.Contains('site:seo:')) { throw "Invalid static SEO markers: $file" }
        $updated = [regex]::Replace($updated,'(?m)^(<head[^>]*>)[ \t]*\n',[Text.RegularExpressions.MatchEvaluator]{ param($match) $match.Groups[1].Value + "`n" + $seo + "`n" })
        if (-not $updated.Contains('site:seo:start')) { throw "Missing head: $file" }
    }
    $header = Header-Block $file
    $headerPattern = '(?ms)^<!-- site:header:start -->\n.*?^<!-- site:header:end -->'
    if ([regex]::IsMatch($updated,$headerPattern)) {
        if ([regex]::Matches($updated,$headerPattern).Count -ne 1) { throw "Duplicate static header block: $file" }
        $updated = [regex]::Replace($updated,$headerPattern,[Text.RegularExpressions.MatchEvaluator]{ param($match) $header })
    } else {
        if ($updated.Contains('site:header:')) { throw "Invalid static header markers: $file" }
        $component = if ($file -eq '404.html') { 'header-compact' } else { 'header' }
        $placeholder = '<template data-site-include="' + $component + '"></template>'
        if ([regex]::Matches($updated,[regex]::Escape($placeholder)).Count -ne 1) { throw "Missing single header include: $file" }
        $updated = $updated.Replace($placeholder,$header)
    }
    if ($source -cne $updated) { $updates[$path] = $updated }
}
if ($Check -and $updates.Count) { throw ('Static SEO is stale: ' + ($updates.Keys -join ', ') + '. Run scripts/build-site.ps1.') }
foreach ($path in $updates.Keys) { [IO.File]::WriteAllText($path,$updates[$path],$utf8) }
if (-not $Quiet) { Write-Host "Static SEO current: $($config.pages.PSObject.Properties.Name.Count) pages; $($updates.Count) file(s) updated. Authored main content and runtime assets are preserved." }
