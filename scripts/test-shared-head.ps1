[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Optional browser regression needs Node.js and Playwright; website runtime does not.' }
& $node.Source (Join-Path $PSScriptRoot 'test-common-loader.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Shared browser loader regression failed.' }
