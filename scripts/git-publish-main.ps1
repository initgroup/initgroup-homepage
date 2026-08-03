<#
.SYNOPSIS
Validates and publishes changes when the user explicitly runs this script.
#>
[CmdletBinding()]
param(
    [string]$Remote = 'origin',
    [string]$Branch = 'main',
    [string]$Message = '',
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'codex-utf8.ps1')

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    Write-Host "git $($GitArgs -join ' ')" -ForegroundColor Cyan
    & git -c "safe.directory=$repoRoot" @GitArgs
    if ($LASTEXITCODE -ne 0) { throw "Git command failed: git $($GitArgs -join ' ')" }
}

function Get-DefaultCommitMessage {
    $messagePrefix = Split-Path -Leaf $repoRoot
    $dateText = Get-Date -Format 'yyyyMMdd'
    $pattern = '^' + [regex]::Escape("$messagePrefix-$dateText-") + '(\d+)$'
    $maxSequence = 0

    foreach ($subject in (& git -c "safe.directory=$repoRoot" log --all --format=%s 2>$null)) {
        $match = [regex]::Match($subject, $pattern)
        if ($match.Success) {
            $maxSequence = [Math]::Max($maxSequence, [int]$match.Groups[1].Value)
        }
    }

    return "$messagePrefix-$dateText-$($maxSequence + 1)"
}

if (-not (Test-Path -LiteralPath (Join-Path $repoRoot '.git'))) { throw 'Git metadata was not found.' }
$remoteUrl = (& git -c "safe.directory=$repoRoot" remote get-url $Remote 2>$null | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($remoteUrl)) {
    throw "Git remote '$Remote' is not configured. Add it before publishing."
}

$currentBranch = (& git -c "safe.directory=$repoRoot" branch --show-current | Out-String).Trim()
if ($currentBranch -ne $Branch) { throw "Current branch is '$currentBranch'. Switch to '$Branch' before publishing." }

Write-Host 'INIT Homepage publish preflight' -ForegroundColor Green
Write-Host "Repository: $repoRoot"
Write-Host "Remote:     $remoteUrl"
Write-Host "Branch:     $currentBranch"
Write-Host 'Commit mode: this manual command stages, commits, and pushes the listed changes' -ForegroundColor Yellow

$workingChanges = @(& git -c "safe.directory=$repoRoot" status --short)
if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect working tree changes.' }
if ($workingChanges.Count -gt 0) {
    Write-Host 'Changes selected for commit:' -ForegroundColor Yellow
    $workingChanges | ForEach-Object { Write-Host "  $_" }
}

if ($DryRun) {
    Write-Host 'Dry run: no files were staged, committed, pulled, or pushed.' -ForegroundColor Yellow
    & git -c "safe.directory=$repoRoot" status --short --branch
    return
}

if ($workingChanges.Count -eq 0) {
    $trackingRef = "refs/remotes/$Remote/$Branch"
    & git -c "safe.directory=$repoRoot" show-ref --verify --quiet $trackingRef
    $trackingRefExitCode = $LASTEXITCODE
    if ($trackingRefExitCode -notin 0, 1) { throw "Unable to inspect tracking branch '$Remote/$Branch'." }

    if ($trackingRefExitCode -eq 0) {
        $localHead = (& git -c "safe.directory=$repoRoot" rev-parse HEAD | Out-String).Trim()
        if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect the local HEAD commit.' }
        $trackingHead = (& git -c "safe.directory=$repoRoot" rev-parse $trackingRef | Out-String).Trim()
        if ($LASTEXITCODE -ne 0) { throw "Unable to inspect tracking branch '$Remote/$Branch'." }

        if ($localHead -eq $trackingHead) {
            Write-Host "No changes to publish. Local $Branch already matches $Remote/$Branch." -ForegroundColor Yellow
            return
        }
    }
}

& (Join-Path $PSScriptRoot 'validate.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Homepage validation failed before publish.' }

if ($workingChanges.Count -gt 0) {
    $defaultMessage = Get-DefaultCommitMessage
    $commitMessage = if ([string]::IsNullOrWhiteSpace($Message)) { $defaultMessage } else { $Message.Trim() }

    Invoke-Git add -A
    Invoke-Git commit -m $commitMessage
}

& git -c "safe.directory=$repoRoot" ls-remote --exit-code --heads $Remote "refs/heads/$Branch" | Out-Null
$remoteBranchExists = $LASTEXITCODE -eq 0
if ($LASTEXITCODE -notin 0, 2) { throw "Unable to inspect remote branch '$Remote/$Branch'." }
if ($remoteBranchExists) { Invoke-Git fetch $Remote $Branch }

if ($remoteBranchExists) {
    Invoke-Git pull --rebase $Remote $Branch
    Invoke-Git push $Remote $Branch
}
else {
    Invoke-Git push --set-upstream $Remote $Branch
}

$publishedCommit = (& git -c "safe.directory=$repoRoot" rev-parse --short HEAD | Out-String).Trim()
Write-Host "Publish complete: $publishedCommit -> $Remote/$Branch" -ForegroundColor Green
