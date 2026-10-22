[CmdletBinding()]
param([switch]$Check, [switch]$Quiet)
# Compatibility entry point: sync sitemap/robots only. HTML is never generated.
& (Join-Path $PSScriptRoot 'build-site.ps1') @PSBoundParameters
