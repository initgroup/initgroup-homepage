$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'codex-utf8.ps1')

$repoRoot = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $repoRoot 'venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $venvPython -PathType Leaf)) {
    throw "venv Python not found: $venvPython"
}

& $venvPython @args
