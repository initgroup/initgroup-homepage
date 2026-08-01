[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 8200
)

$ErrorActionPreference = 'Stop'
$siteRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$venvPython = Join-Path $siteRoot 'venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $venvPython -PathType Leaf)) {
    throw 'venv Python was not found. Run scripts\setup-venv.ps1 first.'
}

Write-Host "INIT Homepage: http://127.0.0.1:$Port"
& $venvPython -m http.server $Port --bind 127.0.0.1 --directory $siteRoot
