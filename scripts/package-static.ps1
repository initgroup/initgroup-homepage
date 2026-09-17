[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
& (Join-Path $PSScriptRoot 'validate.ps1')
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $siteRoot 'static-files.json') | ConvertFrom-Json
$outputRoot = [IO.Path]::GetFullPath((Join-Path $siteRoot 'dist/site'))
$archive = Join-Path $siteRoot 'dist/cafe24-static.zip'
$distRoot = Join-Path $siteRoot 'dist'
if ((Test-Path -LiteralPath $distRoot) -and ((Get-Item -LiteralPath $distRoot).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'Package parent must not be a link.'
}
if ($outputRoot -ne (Join-Path $siteRoot 'dist\site')) { throw 'Unexpected package output path.' }
# Only the fixed generated folder is replaced; source and user artifacts stay intact.
if (Test-Path -LiteralPath $outputRoot) {
    if ((Get-Item -LiteralPath $outputRoot).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Package output must not be a link.' }
    Remove-Item -LiteralPath $outputRoot -Recurse -Force
}
$null = New-Item -ItemType Directory -Path $outputRoot -Force
foreach ($entry in $manifest) {
    $target = Join-Path $outputRoot $entry
    $null = New-Item -ItemType Directory -Path (Split-Path $target) -Force
    Copy-Item -LiteralPath (Join-Path $siteRoot $entry) -Destination $target
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
[IO.Compression.ZipFile]::CreateFromDirectory($outputRoot, $archive)
Write-Host "Upload the CONTENTS of: $outputRoot"
Write-Host "ZIP: $archive"
