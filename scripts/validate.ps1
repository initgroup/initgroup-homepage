[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$siteRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$errors = [System.Collections.Generic.List[string]]::new()
$venvPython = Join-Path $siteRoot 'venv\Scripts\python.exe'
$validationRoot = [System.IO.Path]::GetFullPath((Join-Path $siteRoot '.tmp\validate-site'))

if (-not (Test-Path -LiteralPath $venvPython -PathType Leaf)) {
    throw 'venv Python is missing; run scripts\setup-venv.ps1'
}

Push-Location $siteRoot
try {
    & $venvPython scripts\build_site.py --check
    if ($LASTEXITCODE -ne 0) { throw 'Template render validation failed' }
    & $venvPython scripts\build_site.py --output-dir $validationRoot
    if ($LASTEXITCODE -ne 0) { throw 'Validation HTML render failed' }
}
finally {
    Pop-Location
}

$htmlFiles = @(Get-ChildItem -LiteralPath $validationRoot -Recurse -File -Filter '*.html')

if ($htmlFiles.Count -eq 0) {
    throw 'No HTML files were found.'
}

foreach ($file in $htmlFiles) {
    $content = Get-Content -Raw -Encoding UTF8 -LiteralPath $file.FullName
    $relative = $file.FullName.Substring($validationRoot.Length).TrimStart('\')
    $h1Count = [regex]::Matches($content, '<h1(?:\s|>)', 'IgnoreCase').Count
    $titleCount = [regex]::Matches($content, '<title>.*?</title>', 'IgnoreCase, Singleline').Count
    $canonicalCount = [regex]::Matches($content, '<link\s+rel="canonical"', 'IgnoreCase').Count
    $descriptionCount = [regex]::Matches($content, '<meta\s+name="description"', 'IgnoreCase').Count
    $mainCount = [regex]::Matches($content, '<main(?:\s|>)', 'IgnoreCase').Count
    $viewportCount = [regex]::Matches($content, '<meta\s+name="viewport"', 'IgnoreCase').Count
    if ($h1Count -ne 1) { $errors.Add("$relative : expected one H1, found $h1Count") }
    if ($titleCount -ne 1) { $errors.Add("$relative : expected one title, found $titleCount") }
    if ($canonicalCount -ne 1) { $errors.Add("$relative : expected one canonical, found $canonicalCount") }
    if ($descriptionCount -ne 1) { $errors.Add("$relative : expected one description, found $descriptionCount") }
    if ($mainCount -ne 1) { $errors.Add("$relative : expected one main, found $mainCount") }
    if ($viewportCount -ne 1) { $errors.Add("$relative : expected one viewport, found $viewportCount") }

    $inlineExecutableScripts = [regex]::Matches($content, '<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>', 'IgnoreCase')
    if ($inlineExecutableScripts.Count -gt 0) {
        $errors.Add("$relative : executable inline script blocks strict CSP")
    }

    $jsonLdMatches = [regex]::Matches($content, '<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', 'IgnoreCase, Singleline')
    foreach ($jsonLd in $jsonLdMatches) {
        try {
            $null = $jsonLd.Groups[1].Value | ConvertFrom-Json -ErrorAction Stop
        } catch {
            $errors.Add("$relative : invalid JSON-LD")
        }
    }

    $ids = [regex]::Matches($content, '\sid="([^"]+)"', 'IgnoreCase') | ForEach-Object { $_.Groups[1].Value }
    $duplicateIds = @($ids | Group-Object | Where-Object Count -gt 1)
    foreach ($duplicate in $duplicateIds) { $errors.Add("$relative : duplicate id '$($duplicate.Name)'") }

    $assetMatches = [regex]::Matches($content, '(?:src|href)="(/assets/[^"?#]+)', 'IgnoreCase')
    foreach ($match in $assetMatches) {
        $assetPath = Join-Path $siteRoot ($match.Groups[1].Value.TrimStart('/') -replace '/', '\')
        if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) {
            $errors.Add("$relative : missing asset '$($match.Groups[1].Value)'")
        }
    }

    $imageMatches = [regex]::Matches($content, '<img\b[^>]*>', 'IgnoreCase')
    foreach ($match in $imageMatches) {
        if ($match.Value -notmatch '\salt="[^"]*"') {
            $errors.Add("$relative : image without alt attribute")
        }
    }

    $linkMatches = [regex]::Matches($content, 'href="(/[^"?#]*)(?:[?#][^"]*)?"', 'IgnoreCase')
    foreach ($match in $linkMatches) {
        $urlPath = $match.Groups[1].Value
        if ($urlPath.StartsWith('/assets/')) { continue }
        if ($urlPath -eq '/') {
            $targetPath = Join-Path $validationRoot 'index.html'
        } elseif ([System.IO.Path]::GetExtension($urlPath)) {
            $targetPath = Join-Path $validationRoot ($urlPath.TrimStart('/') -replace '/', '\')
        } else {
            $targetPath = Join-Path $validationRoot (($urlPath.Trim('/') -replace '/', '\') + '\index.html')
        }
        if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
            $errors.Add("$relative : broken internal link '$urlPath'")
        }
    }

    $fragmentMatches = [regex]::Matches($content, 'href="(?:(/[^"#?]*))?#([^"?]+)"', 'IgnoreCase')
    foreach ($match in $fragmentMatches) {
        $urlPath = $match.Groups[1].Value
        $fragment = $match.Groups[2].Value
        if (-not $urlPath) {
            $targetPath = $file.FullName
        } elseif ($urlPath -eq '/') {
            $targetPath = Join-Path $validationRoot 'index.html'
        } elseif ([System.IO.Path]::GetExtension($urlPath)) {
            $targetPath = Join-Path $validationRoot ($urlPath.TrimStart('/') -replace '/', '\')
        } else {
            $targetPath = Join-Path $validationRoot (($urlPath.Trim('/') -replace '/', '\') + '\index.html')
        }
        if (Test-Path -LiteralPath $targetPath -PathType Leaf) {
            $targetContent = Get-Content -Raw -Encoding UTF8 -LiteralPath $targetPath
            $escapedFragment = [regex]::Escape($fragment)
            if ($targetContent -notmatch ('\sid="' + $escapedFragment + '"')) {
                $errors.Add("$relative : missing fragment '$urlPath#$fragment'")
            }
        }
    }
}

$cssFiles = @(Get-ChildItem -LiteralPath (Join-Path $siteRoot 'assets\css') -File -Filter '*.css')
foreach ($file in $cssFiles) {
    $content = Get-Content -Raw -Encoding UTF8 -LiteralPath $file.FullName
    if (($content.ToCharArray() | Where-Object { $_ -eq '{' }).Count -ne ($content.ToCharArray() | Where-Object { $_ -eq '}' }).Count) {
        $errors.Add("$($file.Name) : CSS brace mismatch")
    }
}

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    foreach ($file in Get-ChildItem -LiteralPath (Join-Path $siteRoot 'assets\js') -File -Filter '*.js') {
        & $node.Source --check $file.FullName
        if ($LASTEXITCODE -ne 0) { $errors.Add("$($file.Name) : JavaScript syntax error") }
    }
}

Push-Location $siteRoot
try {
    & $venvPython -c "from main import app, resolve_public_page; assert app.title == 'INIT Homepage'; assert resolve_public_page('company/') is not None; assert resolve_public_page('requirements.txt') is None; assert resolve_public_page('../AGENTS.md') is None"
    $pythonValidationExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}
if ($pythonValidationExitCode -ne 0) {
    $errors.Add('FastAPI application import or public-path validation failed')
}

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Host "ERROR: $_" -ForegroundColor Red }
    throw "Homepage validation failed: $($errors.Count) issue(s)"
}

Write-Host "HTML contract OK: $($htmlFiles.Count) files"
Write-Host "CSS structure OK: $($cssFiles.Count) files"
Write-Host 'Homepage validation completed.'
