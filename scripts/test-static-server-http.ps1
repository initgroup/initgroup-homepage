[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$baseUrl = 'http://127.0.0.1:8200'
$expectedRevision = (Get-FileHash -LiteralPath (Join-Path $PSScriptRoot 'serve.ps1') -Algorithm SHA256).Hash.Substring(0, 12)
function Assert-Equal($Actual, $Expected, [string]$Label) {
    if ($Actual -cne $Expected) { throw "$Label : expected '$Expected', got '$Actual'" }
}
function Get-TestResponse([string]$Path, [string]$Method = 'GET', [long]$Start = -1, [long]$End = -1) {
    $request = [Net.HttpWebRequest]::Create($baseUrl + $Path)
    $request.Proxy = $null
    $request.Method = $Method
    if ($Method -eq 'POST') { $request.ContentLength = 0 }
    $request.Timeout = 5000
    $request.ReadWriteTimeout = 5000
    if ($Start -ge 0) { $request.AddRange($Start, $End) }
    $response = $null
    try {
        try { $response = $request.GetResponse() } catch [Net.WebException] {
            if (-not $_.Exception.Response) { throw }
            $response = $_.Exception.Response
        }
        $body = [IO.MemoryStream]::new()
        try {
            $response.GetResponseStream().CopyTo($body)
            return [pscustomobject]@{
                Status = [int]$response.StatusCode
                Length = $response.ContentLength
                Range = $response.Headers['Content-Range']
                AcceptRanges = $response.Headers['Accept-Ranges']
                Revision = $response.Headers['X-INIT-Static-Revision']
                Body = $body.ToArray()
            }
        } finally { $body.Dispose() }
    } finally { if ($response) { $response.Close() } }
}
$homeResponse = Get-TestResponse '/' 'HEAD'
Assert-Equal $homeResponse.Status 200 'Home'
Assert-Equal $homeResponse.Revision $expectedRevision 'Running server revision (restart the server first)'
Assert-Equal $homeResponse.AcceptRanges 'bytes' 'Range support'
Assert-Equal $homeResponse.Body.Length 0 'HEAD body'

$moviePath = '/assets/videos/initgroup-promo_kor.mp4'
$movieFile = Join-Path $siteRoot 'assets/videos/initgroup-promo_kor.mp4'
$movieLength = (Get-Item -LiteralPath $movieFile).Length
$range = Get-TestResponse $moviePath 'GET' 65000 135000
Assert-Equal $range.Status 206 'Partial video status'
Assert-Equal $range.Range "bytes 65000-135000/$movieLength" 'Partial video header'
Assert-Equal $range.Body.Length 70001 'Partial video size'
$expected = New-Object byte[] 70001
$file = [IO.File]::OpenRead($movieFile)
try {
    $null = $file.Seek(65000, [IO.SeekOrigin]::Begin)
    $null = $file.Read($expected, 0, $expected.Length)
} finally { $file.Dispose() }
Assert-Equal ([Convert]::ToBase64String($range.Body)) ([Convert]::ToBase64String($expected)) 'Partial video bytes'
$head = Get-TestResponse $moviePath 'HEAD' 0 9
Assert-Equal $head.Status 200 'HEAD ignores Range'
Assert-Equal $head.Length $movieLength 'HEAD full length'
Assert-Equal $head.Body.Length 0 'Video HEAD body'
$invalid = Get-TestResponse $moviePath 'GET' $movieLength ($movieLength + 10)
Assert-Equal $invalid.Status 416 'Out-of-bounds range'
Assert-Equal $invalid.Range "bytes */$movieLength" 'Unsatisfied range header'
Assert-Equal $invalid.Body.Length 0 'Unsatisfied range body'
Assert-Equal (Get-TestResponse '/missing-test-file').Status 404 'Missing file'
Assert-Equal (Get-TestResponse '/' 'POST').Status 405 'Unsupported method'

# Reset real TCP connections during a large response, as closing/seeking a video can do.
for ($i = 0; $i -lt 12; $i++) {
    $client = [Net.Sockets.TcpClient]::new()
    try {
        $client.Connect('127.0.0.1', 8200)
        $client.ReceiveTimeout = 5000
        $client.Client.LingerState = [Net.Sockets.LingerOption]::new($true, 0)
        $stream = $client.GetStream()
        $requestBytes = [Text.Encoding]::ASCII.GetBytes("GET $moviePath HTTP/1.1`r`nHost: 127.0.0.1:8200`r`nConnection: close`r`n`r`n")
        $stream.Write($requestBytes, 0, $requestBytes.Length)
        $buffer = New-Object byte[] 256
        $count = $stream.Read($buffer, 0, $buffer.Length)
        if ($count -eq 0) { throw 'Server closed before sending a response' }
    } finally { $client.Close() }
    # The next request verifies that the server survived the reset.
    Assert-Equal (Get-TestResponse '/' 'HEAD').Status 200 "Server survived disconnect $i"
}
$poster = Get-TestResponse '/assets/images/home/initgroup-promo-poster.jpg'
$expected = [IO.File]::ReadAllBytes((Join-Path $siteRoot 'assets/images/home/initgroup-promo-poster.jpg'))
Assert-Equal $poster.Status 200 'Poster after disconnects'
Assert-Equal ([Convert]::ToBase64String($poster.Body)) ([Convert]::ToBase64String($expected)) 'Complete poster bytes'
Write-Host "HTTP server tests OK: revision $expectedRevision, 206/416/HEAD, exact bytes, 404/405 and 12 mid-transfer TCP resets."
