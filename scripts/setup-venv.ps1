[CmdletBinding()]
param(
    [string]$PythonCommand = 'py',
    [string]$PythonVersion = '3.12'
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'codex-utf8.ps1')

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$venvDir = Join-Path $repoRoot 'venv'
$venvPython = Join-Path $venvDir 'Scripts\python.exe'
$requirementsFile = Join-Path $repoRoot 'requirements.txt'

if (-not (Test-Path -LiteralPath $requirementsFile -PathType Leaf)) {
    throw "requirements.txt was not found: $requirementsFile"
}

if (-not (Test-Path -LiteralPath $venvPython -PathType Leaf)) {
    $python = Get-Command $PythonCommand -ErrorAction SilentlyContinue
    if (-not $python) {
        throw "Python command was not found: $PythonCommand"
    }

    $pythonArgs = @()
    if ([System.IO.Path]::GetFileNameWithoutExtension($python.Name) -eq 'py') {
        $pythonArgs += "-$PythonVersion"
    }

    & $python.Source @pythonArgs -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)'
    if ($LASTEXITCODE -ne 0) {
        throw 'Python 3.12 or newer is required.'
    }

    Write-Host "Creating virtual environment: $venvDir" -ForegroundColor Cyan
    & $python.Source @pythonArgs -m venv $venvDir
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $venvPython -PathType Leaf)) {
        throw 'Virtual environment creation failed.'
    }
}
else {
    Write-Host "Using existing virtual environment: $venvDir" -ForegroundColor Cyan
}

& $venvPython -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)'
if ($LASTEXITCODE -ne 0) {
    throw 'The virtual environment must use Python 3.12 or newer.'
}

Write-Host 'Virtual environment is ready.' -ForegroundColor Green
Write-Host "Python: $venvPython"
