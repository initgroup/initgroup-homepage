<#
.SYNOPSIS
Stages all changes, creates a numbered daily commit, rebases, and pushes main.
#>
[CmdletBinding()]
param(
    [string]$Remote = 'origin',
    [string]$Branch = 'main',
    [string]$MessagePrefix = ''
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'codex-utf8.ps1')

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot
if ([string]::IsNullOrWhiteSpace($MessagePrefix)) { $MessagePrefix = Split-Path -Leaf $repoRoot }

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    Write-Host "git $($GitArgs -join ' ')" -ForegroundColor Cyan
    & git -c "safe.directory=$repoRoot" @GitArgs
    if ($LASTEXITCODE -ne 0) { throw "Git command failed: git $($GitArgs -join ' ')" }
}

if (-not (Test-Path -LiteralPath (Join-Path $repoRoot '.git'))) { throw 'Git metadata was not found.' }
$remoteUrl = (& git -c "safe.directory=$repoRoot" remote get-url $Remote 2>$null | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($remoteUrl)) {
    throw "Git remote '$Remote' is not configured. Add it before publishing."
}

$currentBranch = (& git -c "safe.directory=$repoRoot" branch --show-current | Out-String).Trim()
if ($currentBranch -ne $Branch) { throw "Current branch is '$currentBranch'. Switch to '$Branch' before publishing." }

& git -c "safe.directory=$repoRoot" ls-remote --exit-code --heads $Remote "refs/heads/$Branch" | Out-Null
$remoteBranchExists = $LASTEXITCODE -eq 0
if ($LASTEXITCODE -notin 0, 2) { throw "Unable to inspect remote branch '$Remote/$Branch'." }
if ($remoteBranchExists) { Invoke-Git fetch $Remote $Branch }

Invoke-Git add -A
$staged = & git -c "safe.directory=$repoRoot" diff --cached --name-only
if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect staged changes.' }
if (-not $staged) { Write-Host 'No changes to publish.' -ForegroundColor Yellow; exit 0 }

$dateText = Get-Date -Format 'yyyyMMdd'
$pattern = '^' + [regex]::Escape("$MessagePrefix-$dateText-") + '(\d+)$'
$maxSequence = 0
foreach ($subject in (& git -c "safe.directory=$repoRoot" log --all --format=%s 2>$null)) {
    $match = [regex]::Match($subject, $pattern)
    if ($match.Success) { $maxSequence = [Math]::Max($maxSequence, [int]$match.Groups[1].Value) }
}
$message = "$MessagePrefix-$dateText-$($maxSequence + 1)"
Invoke-Git commit -m $message

if ($remoteBranchExists) {
    Invoke-Git pull --rebase $Remote $Branch
    Invoke-Git push $Remote $Branch
}
else {
    Invoke-Git push --set-upstream $Remote $Branch
}

Write-Host 'Publish complete.' -ForegroundColor Green
