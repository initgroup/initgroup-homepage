[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'validate.ps1'), [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }
$function = $ast.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Test-LocalReference' }, $true)
. ([scriptblock]::Create($function.Extent.Text))
$internalHosts = @('initgroup.kr', 'www.initgroup.kr', 'moved.example')
$errors = [Collections.Generic.List[string]]::new()
$publicFiles = @{}
$htmlContents = @{}
foreach ($entry in @('index.html', 'services/index.html', 'solutions/in-surveyone/index.html', 'assets/js/site.js')) {
    $file = [IO.Path]::GetFullPath((Join-Path $siteRoot $entry))
    $publicFiles[$file] = $true
    if ($entry.EndsWith('.html')) { $htmlContents[$file] = Get-Content -Raw -Encoding UTF8 -LiteralPath $file }
}
$source = Join-Path $siteRoot 'solutions/in-surveyone/index.html'
$cases = @(
    @('../../index.html', $false),
    @('../../services/index.html#quality', $false),
    @('../../assets/js/site.js?v=abc123', $false),
    @('./?from=nav', $false),
    @('./?from=nav#__relative_reference_missing_anchor__', $true),
    @('https://initgroup.kr/solutions/in-surveyone/', $true),
    @('http://www.initgroup.kr/solutions/in-surveyone/', $true),
    @('https://moved.example/team/site/solutions/in-surveyone/', $true),
    @('//initgroup.kr/solutions/in-surveyone/', $true),
    @('/solutions/in-surveyone/', $true),
    @('/assets/js/site.js', $true),
    @('..\index.html', $true),
    @('../../missing/index.html', $true),
    @('https://outside.example/resource', $false),
    @('mailto:support@initgroup.kr', $false),
    @('tel:+827087859647', $false)
)
foreach ($case in $cases) {
    $errors.Clear()
    Test-LocalReference $source $case[0]
    if (($errors.Count -gt 0) -ne $case[1]) { throw "Unexpected validation result: $($case[0]) : $($errors -join '; ')" }
}
Write-Host "PASS: $($cases.Count) relative-reference cases; deep paths, query/hash, same-site hosts, root paths, external URLs, mail and phone."
