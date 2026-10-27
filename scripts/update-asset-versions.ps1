[CmdletBinding()]
param([switch]$Check, [switch]$Quiet)

# Deployment preparation only. Browser runtime uses the resulting static files.
$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$utf8 = New-Object Text.UTF8Encoding($false)
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'static-files.json') | ConvertFrom-Json
$configPath = Join-Path $siteRoot 'assets/shared/site.json'
$publicFiles = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($entry in $manifest) { $null = $publicFiles.Add($entry) }
$script:updatedFiles = 0

function Save-ChangedText([string]$Path, [string]$Text) {
    if ([IO.File]::ReadAllText($Path,$utf8) -ceq $Text) { return }
    if ($Check) { throw "Asset versions are stale: $Path. Run scripts/update-asset-versions.ps1." }
    [IO.File]::WriteAllText($Path,$Text,$utf8)
    $script:updatedFiles++
}
function Get-AssetVersion([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.Substring(0,16).ToLowerInvariant()
}
function Set-VersionQuery([string]$Reference, [string]$Version) {
    $parts = $Reference -split '#',2
    $queryParts = $parts[0] -split '\?',2
    $query = @()
    if ($queryParts.Count -eq 2) { $query = @($queryParts[1] -split '&' | Where-Object { $_ -and $_ -notmatch '^v=' }) }
    $query += 'v=' + $Version
    $result = $queryParts[0] + '?' + ($query -join '&')
    if ($parts.Count -eq 2) { $result += '#' + $parts[1] }
    return $result
}

# First version CSS dependencies, then hash CSS itself so an image/font update propagates.
foreach ($entry in @($manifest | Where-Object { $_.EndsWith('.css') } | Sort-Object)) {
    $cssPath = Join-Path $siteRoot $entry
    $source = [IO.File]::ReadAllText($cssPath,$utf8)
    $updated = [regex]::Replace($source,'url\(\s*(["'']?)([^)''"\s]+)\1\s*\)',[Text.RegularExpressions.MatchEvaluator]{
        param($match)
        $reference = $match.Groups[2].Value
        if ($reference -match '^(?:[a-z][a-z0-9+.-]*:|/|#)') { return $match.Value }
        $relative = [Uri]::UnescapeDataString(($reference -split '[?#]',2)[0])
        $target = [IO.Path]::GetFullPath((Join-Path (Split-Path $cssPath) $relative))
        if (-not $target.StartsWith($siteRoot + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'CSS dependency escapes the project.' }
        $publicPath = $target.Substring($siteRoot.Length + 1).Replace('\','/')
        if (-not $publicFiles.Contains($publicPath)) { throw "CSS dependency is not deployed: $publicPath" }
        if ($publicPath.EndsWith('.css')) { throw 'Nested CSS imports need an explicit dependency order.' }
        return $match.Value.Replace($reference,(Set-VersionQuery $reference (Get-AssetVersion $target)))
    })
    Save-ChangedText $cssPath $updated
}
$loaderVersion = Get-AssetVersion (Join-Path $siteRoot 'assets/js/common.js')
$pageVersionLines = @()
foreach ($entry in @($manifest | Where-Object { $_.EndsWith('.html') -and -not $_.StartsWith('assets/') } | Sort-Object)) {
    $htmlPath = Join-Path $siteRoot $entry
    $source = [IO.File]::ReadAllText($htmlPath,$utf8)
    $updated = [regex]::Replace($source,'<script src="((?:\.\./)*assets/js/common\.js)(?:\?[^"]*)?"',[Text.RegularExpressions.MatchEvaluator]{
        param($match)
        '<script src="' + $match.Groups[1].Value + '?v=' + $loaderVersion + '"'
    })
    # Only the bootstrap query is changed; the authored body remains the source.
    Save-ChangedText $htmlPath $updated
    $pageVersionLines += '    "' + $entry + '": "' + (Get-AssetVersion $htmlPath) + '"'
}
$versionLines = @()
foreach ($entry in @($manifest | Where-Object { $_.StartsWith('assets/') -and $_ -ne 'assets/shared/site.json' } | Sort-Object)) {
    $versionLines += '    "' + $entry + '": "' + (Get-AssetVersion (Join-Path $siteRoot $entry)) + '"'
}
$block = '  "assetVersions": {' + "`n" + ($versionLines -join ",`n") + "`n  },`n"
$config = [IO.File]::ReadAllText($configPath,$utf8)
$existingPattern = '(?ms)^  "assetVersions": \{\r?\n.*?^  \},\r?\n'
if ([regex]::IsMatch($config,$existingPattern)) {
    $updatedConfig = [regex]::Replace($config,$existingPattern,[Text.RegularExpressions.MatchEvaluator]{ param($match) $block })
} else {
    $anchor = '  "components":'
    $offset = $config.IndexOf($anchor,[StringComparison]::Ordinal)
    if ($offset -lt 0) { throw 'Missing shared component configuration.' }
    $updatedConfig = $config.Insert($offset,$block)
}
$pageBlock = '  "pageVersions": {' + "`n" + ($pageVersionLines -join ",`n") + "`n  },`n"
$pagePattern = '(?ms)^  "pageVersions": \{\r?\n.*?^  \},\r?\n'
if ([regex]::IsMatch($updatedConfig,$pagePattern)) {
    $updatedConfig = [regex]::Replace($updatedConfig,$pagePattern,[Text.RegularExpressions.MatchEvaluator]{ param($match) $pageBlock })
} else {
    $offset = $updatedConfig.IndexOf('  "assetVersions":',[StringComparison]::Ordinal)
    $updatedConfig = $updatedConfig.Insert($offset,$pageBlock)
}
Save-ChangedText $configPath $updatedConfig
if (-not $Quiet) { Write-Host "Asset versions current: content-based SHA-256, $script:updatedFiles file(s) updated; unchanged files keep their version." }
