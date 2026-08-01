[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 8200,
    [switch]$Restart
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'codex-utf8.ps1')

$siteRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$venvPython = Join-Path $siteRoot 'venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $venvPython -PathType Leaf)) {
    Write-Host 'INIT Homepage venv was not found. Creating it now.' -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot 'setup-venv.ps1')
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $venvPython -PathType Leaf)) {
        throw 'INIT Homepage venv setup failed.'
    }
}

$siteUrl = "http://127.0.0.1:$Port/"

function Get-HomepageListenerProcessId {
    $listenerRows = @(& netstat.exe -ano -p tcp | Select-String -Pattern (':{0}\s+.*LISTENING\s+\d+$' -f $Port))
    $processIds = @(
        foreach ($listenerRow in $listenerRows) {
            $columns = $listenerRow.ToString().Trim() -split '\s+'
            if ($columns.Count -ge 5 -and $columns[1] -eq "127.0.0.1:$Port") {
                [int]$columns[-1]
            }
        }
    ) | Sort-Object -Unique

    if ($processIds.Count -eq 1) { return $processIds[0] }
    if ($processIds.Count -gt 1) { throw "Multiple processes are listening on 127.0.0.1:$Port. Stop them manually before restarting." }
    return $null
}

$existingResponse = $null
try {
    $existingResponse = Invoke-WebRequest -Uri $siteUrl -UseBasicParsing -TimeoutSec 2
} catch {
    $existingResponse = $null
}

if ($existingResponse) {
    if ($existingResponse.Content -match 'EVIDENCE-DRIVEN DATA INTELLIGENCE') {
        if (-not $Restart) {
            Write-Host "INIT Homepage is already running: $siteUrl" -ForegroundColor Green
            return
        }

        $listenerProcessId = Get-HomepageListenerProcessId
        if (-not $listenerProcessId) {
            throw "The existing homepage responded on port $Port, but its listener process could not be identified."
        }

        $listenerProcess = Get-Process -Id $listenerProcessId -ErrorAction Stop
        if ($listenerProcess.ProcessName -notlike 'python*') {
            throw "Port $Port is serving the homepage from unexpected process '$($listenerProcess.ProcessName)' (PID $listenerProcessId). Stop it manually."
        }

        Write-Host "Restarting existing INIT Homepage server (PID $listenerProcessId)." -ForegroundColor Yellow
        Stop-Process -Id $listenerProcessId -ErrorAction Stop
        $releaseDeadline = (Get-Date).AddSeconds(5)
        do {
            Start-Sleep -Milliseconds 100
            $remainingListener = Get-HomepageListenerProcessId
        } while ($remainingListener -and (Get-Date) -lt $releaseDeadline)

        if ($remainingListener) {
            throw "Port $Port was not released after stopping PID $listenerProcessId."
        }
    }
    else {
        throw "Port $Port is already used by another project. Stop that process or run .\scripts\serve.ps1 -Port <another-port>."
    }
}

Write-Host 'INIT Homepage is a static site; uvicorn is not used.' -ForegroundColor DarkGray
Write-Host "INIT Homepage: $siteUrl" -ForegroundColor Green
Write-Host 'Press Ctrl+C to stop the local server.' -ForegroundColor DarkGray
& $venvPython -u -m http.server $Port --bind 127.0.0.1 --directory $siteRoot
if ($LASTEXITCODE -ne 0) {
    throw "INIT Homepage server exited with code $LASTEXITCODE."
}
