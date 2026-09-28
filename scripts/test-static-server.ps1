[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
# Load only function definitions; never start or stop the user's server.
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'serve.ps1'), [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }
foreach ($function in $ast.FindAll({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] }, $false)) {
    . ([scriptblock]::Create($function.Extent.Text))
}
function Assert-Equal($Actual, $Expected, [string]$Label) {
    if ($Actual -cne $Expected) { throw "$Label : expected '$Expected', got '$Actual'" }
}
$cases = @(
    @('', 200, 0, 100, $null),
    @('bytes=0-9', 206, 0, 10, 'bytes 0-9/100'),
    @('bytes=90-', 206, 90, 10, 'bytes 90-99/100'),
    @('bytes=-10', 206, 90, 10, 'bytes 90-99/100'),
    @('bytes=-200', 206, 0, 100, 'bytes 0-99/100'),
    @('bytes=90-200', 206, 90, 10, 'bytes 90-99/100'),
    @('bytes=100-', 416, 0, 0, 'bytes */100'),
    @('bytes=-0', 416, 0, 0, 'bytes */100'),
    @('bytes=9-1', 200, 0, 100, $null),
    @('bytes=0-1,5-9', 200, 0, 100, $null),
    @('bytes=999999999999999999999999999-', 200, 0, 100, $null),
    @('invalid', 200, 0, 100, $null)
)
foreach ($case in $cases) {
    $result = Get-StaticByteRange $case[0] 100
    Assert-Equal $result.Status $case[1] "$($case[0]) status"
    Assert-Equal $result.Offset $case[2] "$($case[0]) offset"
    Assert-Equal $result.Count $case[3] "$($case[0]) length"
    Assert-Equal $result.ContentRange $case[4] "$($case[0]) content range"
}
Assert-Equal (Get-StaticByteRange 'bytes=0-' 0).Status 416 'Empty file range'
Assert-Equal (Get-StaticByteRange '' 0).Status 200 'Empty file full response'
foreach ($code in @(22, 64, 995, 1229, 1236, 10053, 10054, 10058)) {
    $wrapped = [Exception]::new('Write wrapper', [Net.HttpListenerException]::new($code))
    Assert-Equal (Test-ClientDisconnect $wrapped) $true "Disconnect $code"
}
Assert-Equal (Test-ClientDisconnect ([Net.HttpListenerException]::new(5))) $false 'Access denied remains visible'
Assert-Equal (Test-ClientDisconnect ([IO.IOException]::new('Disk failure'))) $false 'Disk errors remain visible'
Assert-Equal (Test-ClientDisconnect ([ComponentModel.Win32Exception]::new(22))) $false 'Non-HTTP device errors remain visible'
$request = [pscustomobject]@{ HttpMethod = 'GET'; Headers = @{}; Url = [uri]'http://127.0.0.1:8200/video.mp4' }
$warnings = @()
Write-StaticRequestError $request ([Exception]::new('Write', [Net.HttpListenerException]::new(64))) -WarningVariable +warnings
Assert-Equal $warnings.Count 0 'Disconnect warning suppressed'
Write-StaticRequestError $request ([IO.IOException]::new('Disk failure')) -WarningVariable +warnings -WarningAction SilentlyContinue
Assert-Equal $warnings.Count 1 'Unexpected error warning retained'
$tempFile = [IO.Path]::GetTempFileName()
try {
    $bytes = New-Object byte[] 200000
    [Random]::new(42).NextBytes($bytes)
    [IO.File]::WriteAllBytes($tempFile, $bytes)
    foreach ($case in @(
        @('GET', '', '', 200, 0, 200000),
        @('GET', 'bytes=65000-135000', '', 206, 65000, 70001),
        @('GET', 'bytes=-123', '', 206, 199877, 123),
        @('GET', 'bytes=200000-', '', 416, 0, 0),
        @('GET', 'bytes=0-9', '"old-validator"', 200, 0, 200000),
        @('HEAD', 'bytes=0-9', '', 200, 0, 200000)
    )) {
        $request.HttpMethod = $case[0]
        $request.Headers = @{ Range = $case[1]; 'If-Range' = $case[2] }
        $output = [IO.MemoryStream]::new()
        try {
            $response = [pscustomobject]@{ Headers = @{}; StatusCode = 0; ContentLength64 = 0L; OutputStream = $output }
            Send-StaticFile $request $response $tempFile
            Assert-Equal $response.StatusCode $case[3] 'Transfer status'
            Assert-Equal $response.ContentLength64 $case[5] 'Content-Length'
            Assert-Equal $response.Headers['Accept-Ranges'] 'bytes' 'Accept-Ranges'
            $expected = New-Object byte[] 0
            if ($case[0] -eq 'GET' -and $case[5] -gt 0) {
                $expected = New-Object byte[] $case[5]
                [Array]::Copy($bytes, $case[4], $expected, 0, $case[5])
            }
            Assert-Equal ([Convert]::ToBase64String($output.ToArray())) ([Convert]::ToBase64String($expected)) 'Transferred bytes'
        } finally { $output.Dispose() }
    }
    # A real disposed stream simulates a failed send: file handles must still be released.
    $output = [IO.MemoryStream]::new()
    $output.Dispose()
    $response.OutputStream = $output
    $request.HttpMethod = 'GET'
    $request.Headers = @{}
    $failed = $false
    try { Send-StaticFile $request $response $tempFile } catch { $failed = $true }
    Assert-Equal $failed $true 'Send failure propagated'
    $exclusive = [IO.File]::Open($tempFile, 'Open', 'ReadWrite', 'None')
    $exclusive.Dispose()
    $response | Add-Member -MemberType ScriptMethod -Name Close -Value { throw [Net.HttpListenerException]::new(64) }
    $warnings = @()
    Close-StaticResponse $request $response -WarningVariable +warnings
    Assert-Equal $warnings.Count 0 'Disconnect on close suppressed'
} finally { Remove-Item -LiteralPath $tempFile -Force }
Write-Host 'Static server tests OK: ranges, byte contents, HEAD, If-Range, error filtering and stream cleanup.'
