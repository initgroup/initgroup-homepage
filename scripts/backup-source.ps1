[CmdletBinding()]
param(
    [ValidateSet('Git', 'Working')]
    [string]$Mode = 'Working',
    [string]$BackupRoot = ''
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'codex-utf8.ps1')

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$projectName = Split-Path -Leaf $repoRoot
$safeProjectName = [regex]::Replace($projectName, '[^A-Za-z0-9._-]', '-').Trim('-')
if ([string]::IsNullOrWhiteSpace($safeProjectName)) { $safeProjectName = 'web-project' }
if ([string]::IsNullOrWhiteSpace($BackupRoot)) {
    $BackupRoot = Join-Path (Split-Path -Parent $repoRoot) 'backup'
}

$repoRootFull = [System.IO.Path]::GetFullPath($repoRoot).TrimEnd('\', '/')
$backupRootFull = [System.IO.Path]::GetFullPath($BackupRoot).TrimEnd('\', '/')
$comparison = [System.StringComparison]::OrdinalIgnoreCase
$repoPrefix = $repoRootFull + [System.IO.Path]::DirectorySeparatorChar
if ($backupRootFull.Equals($repoRootFull, $comparison) -or $backupRootFull.StartsWith($repoPrefix, $comparison)) {
    throw "BackupRoot must be outside the project directory: $backupRootFull"
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$groupName = if ($Mode -eq 'Git') { "${safeProjectName}_GIT_BACKUP" } else { "${safeProjectName}_WORKING_BACKUP" }
$groupRoot = Join-Path $backupRootFull $groupName
$backupDir = Join-Path $groupRoot $stamp

if ($Mode -eq 'Git') {
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot '.git'))) { throw 'Git metadata was not found.' }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git command was not found.' }
}
elseif (-not (Get-Command robocopy -ErrorAction SilentlyContinue)) {
    throw 'robocopy command was not found.'
}

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

if ($Mode -eq 'Git') {
    Push-Location $repoRoot
    try {
        $head = (& git -c "safe.directory=$repoRootFull" show-ref --head --hash HEAD | Out-String).Trim()
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($head)) {
            throw 'Git backup requires at least one commit. Use -Mode Working before the initial commit.'
        }
        $zipPath = Join-Path $env:TEMP "$safeProjectName-$stamp.zip"
        & git -c "safe.directory=$repoRootFull" archive --format=zip --output=$zipPath HEAD
        if ($LASTEXITCODE -ne 0) { throw 'git archive failed.' }
        try { Expand-Archive -LiteralPath $zipPath -DestinationPath $backupDir -Force }
        finally { if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force } }
        & git -c "safe.directory=$repoRootFull" bundle create (Join-Path $backupDir 'repository.bundle') --branches --tags
        if ($LASTEXITCODE -ne 0) { throw 'git bundle failed.' }
    }
    finally { Pop-Location }
}
else {
    $robocopyArgs = @(
        $repoRoot, $backupDir, '/E', '/COPY:DAT', '/DCOPY:DAT', '/XJ', '/R:2', '/W:1',
        '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/XD',
        '.git', 'venv', '.venv', 'node_modules', 'secrets', '.secrets', '__pycache__',
        '.pytest_cache', '.mypy_cache', '.ruff_cache', 'backup', '/XF',
        '.env', '.env.*', '*.env.local', '.envrc', '*.pyc', '*.pem', '*.key', '*.p12', '*.pfx'
    )
    & robocopy @robocopyArgs
    if ($LASTEXITCODE -gt 7) { throw "robocopy failed with exit code $LASTEXITCODE" }
}

$branch = 'N/A'
$headCommit = 'N/A'
if (Test-Path -LiteralPath (Join-Path $repoRoot '.git')) {
    $branch = (& git -c "safe.directory=$repoRootFull" -C $repoRoot branch --show-current 2>$null | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($branch)) { $branch = 'UNBORN/DETACHED' }
    $headCommit = (& git -c "safe.directory=$repoRootFull" -C $repoRoot show-ref --head --hash HEAD | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($headCommit)) { $headCommit = 'UNCOMMITTED' }
}

$manifest = @(
    "Project: $safeProjectName",
    "Mode: $Mode",
    "Created: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')",
    "Source: $repoRootFull",
    "Branch: $branch",
    "HEAD: $headCommit"
)
[System.IO.File]::WriteAllLines((Join-Path $backupDir 'BACKUP_INFO.txt'), $manifest, [System.Text.UTF8Encoding]::new($false))

Write-Host 'Backup completed.' -ForegroundColor Green
Write-Host "Path: $backupDir"
