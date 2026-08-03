<#
.SYNOPSIS
Stages all changes, creates an auto-numbered daily commit, validates the site,
rebases from the configured remote branch, and pushes.

.DESCRIPTION
Default commit message format:
<repository-folder>-yyyyMMdd-N

The configured remote URL must match the expected repository URL before any
changes are staged or pushed.

The sequence number is calculated as the largest existing commit number for
the current date plus one. Running this script immediately stages, validates,
commits, rebases, and pushes without an additional confirmation prompt.

.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\git-publish-main.ps1
#>

[CmdletBinding()]
param(
    [string]$Remote = 'origin',
    [string]$Branch = 'main',
    [string]$MessagePrefix = '',
    [string]$RepositoryUrl = 'https://github.com/initgroup/initgroup-homepage.git'
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'codex-utf8.ps1')

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

if ([string]::IsNullOrWhiteSpace($MessagePrefix)) {
    $MessagePrefix = Split-Path -Leaf $repoRoot
}

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)

    Write-Host ''
    Write-Host "git $($GitArgs -join ' ')" -ForegroundColor Cyan
    & git -c "safe.directory=$repoRoot" @GitArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($GitArgs -join ' ')"
    }
}

function Test-RemoteBranch {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RemoteName,

        [Parameter(Mandatory = $true)]
        [string]$BranchName
    )

    Write-Host ''
    Write-Host "Checking remote branch: $RemoteName/$BranchName" -ForegroundColor Cyan
    & git -c "safe.directory=$repoRoot" ls-remote --exit-code --heads $RemoteName "refs/heads/$BranchName" | Out-Null

    if ($LASTEXITCODE -eq 0) {
        return $true
    }
    if ($LASTEXITCODE -eq 2) {
        return $false
    }

    throw "Unable to inspect remote branch '$RemoteName/$BranchName'."
}

function Get-NextCommitMessage {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Prefix,

        [Parameter(Mandatory = $true)]
        [string]$DateText
    )

    $escapedPrefix = [regex]::Escape($Prefix)
    $escapedDate = [regex]::Escape($DateText)
    $pattern = "^$escapedPrefix-$escapedDate-(\d+)$"
    $commitCount = & git -c "safe.directory=$repoRoot" rev-list --all --count
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to count Git commits.'
    }

    $subjects = @()
    if ([int]$commitCount -gt 0) {
        $subjects = & git -c "safe.directory=$repoRoot" log --all --format=%s --grep="$Prefix-$DateText-"
        if ($LASTEXITCODE -ne 0) {
            throw 'Unable to read git log for commit sequence.'
        }
    }

    $maxSequence = 0
    foreach ($subject in $subjects) {
        $match = [regex]::Match($subject, $pattern)
        if ($match.Success) {
            $sequence = [int]$match.Groups[1].Value
            if ($sequence -gt $maxSequence) {
                $maxSequence = $sequence
            }
        }
    }

    return "$Prefix-$DateText-$($maxSequence + 1)"
}

if (-not (Test-Path -LiteralPath (Join-Path $repoRoot '.git'))) {
    throw "Git metadata was not found: $repoRoot"
}

$remoteUrl = (& git -c "safe.directory=$repoRoot" remote get-url $Remote | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($remoteUrl)) {
    throw "Git remote '$Remote' is not configured. Add it before publishing."
}

$normalizedRemoteUrl = $remoteUrl.TrimEnd('/')
$normalizedRepositoryUrl = $RepositoryUrl.Trim().TrimEnd('/')
if (-not $normalizedRemoteUrl.Equals($normalizedRepositoryUrl, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Git remote '$Remote' points to '$remoteUrl'. Expected '$RepositoryUrl'."
}

$currentBranch = (& git -c "safe.directory=$repoRoot" branch --show-current | Out-String).Trim()
if ($LASTEXITCODE -ne 0) {
    throw 'Unable to read the current Git branch.'
}
if ($currentBranch -ne $Branch) {
    throw "Current branch is '$currentBranch'. Switch to '$Branch' before publishing."
}

Write-Host 'INIT Homepage publish preflight' -ForegroundColor Green
Write-Host "Repository: $repoRoot"
Write-Host "Remote:     $remoteUrl"
Write-Host "Branch:     $currentBranch"
Write-Host 'Commit mode: this manual command stages, validates, commits, rebases, and pushes all changes' -ForegroundColor Yellow

Invoke-Git status --short
$remoteBranchExists = Test-RemoteBranch -RemoteName $Remote -BranchName $Branch

if ($remoteBranchExists) {
    Invoke-Git fetch $Remote $Branch
}
else {
    Write-Host ''
    Write-Host "Remote branch '$Remote/$Branch' does not exist. Preparing the first publish." -ForegroundColor Yellow
}

Invoke-Git add -A

$staged = @(& git -c "safe.directory=$repoRoot" diff --cached --name-only)
if ($LASTEXITCODE -ne 0) {
    throw 'Unable to inspect staged changes.'
}

if ($staged.Count -eq 0) {
    Write-Host ''
    Write-Host 'No staged changes. Nothing to commit or push.' -ForegroundColor Yellow
    return
}

& (Join-Path $PSScriptRoot 'validate.ps1')
if ($LASTEXITCODE -ne 0) {
    throw 'Homepage validation failed before publish.'
}

$dateText = Get-Date -Format 'yyyyMMdd'
$commitMessage = Get-NextCommitMessage -Prefix $MessagePrefix -DateText $dateText

Write-Host ''
Write-Host "Commit message: $commitMessage" -ForegroundColor Green
Invoke-Git commit -m $commitMessage

if ($remoteBranchExists) {
    Invoke-Git pull --rebase $Remote $Branch
    Invoke-Git push $Remote $Branch
}
else {
    Invoke-Git push --set-upstream $Remote $Branch
}

$publishedCommit = (& git -c "safe.directory=$repoRoot" rev-parse --short HEAD | Out-String).Trim()
Write-Host ''
Write-Host "Publish complete: $publishedCommit -> $Remote/$Branch" -ForegroundColor Green
