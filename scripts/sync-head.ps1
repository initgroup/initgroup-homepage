[CmdletBinding()]
param([switch]$Check, [switch]$Quiet)
# Compatibility entry point: sync generated static SEO/header blocks and sitemap/robots.
& (Join-Path $PSScriptRoot 'build-site.ps1') @PSBoundParameters
