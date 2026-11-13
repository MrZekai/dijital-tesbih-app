#Requires -Version 5.1
[CmdletBinding()]
param(
    [ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')][string]$ProjectId,
    [switch]$CreateProject,
    [switch]$Login,
    [switch]$PreviewOnly,
    [string]$VerificationCode = ''
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$previousSiteUrl = $env:SITE_URL
$previousVerification = $env:GOOGLE_SITE_VERIFICATION

function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed (exit $LASTEXITCODE). Nothing else will be deployed." }
}

try {
    Push-Location -LiteralPath $repoRoot
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw 'Install Node.js LTS from https://nodejs.org/ and open a new PowerShell window.'
    }
    if ($PreviewOnly) {
        $env:SITE_URL = 'http://localhost:4173/'
        Invoke-Checked 'node' @('site/build.mjs')
        Invoke-Checked 'node' @('site/test.mjs')
        Write-Host 'Preview only. Press Ctrl+C to stop: http://localhost:4173/tr/'
        Invoke-Checked 'node' @('site/serve.mjs')
        return
    }
    if (-not $ProjectId) { throw 'Supply -ProjectId with your Firebase project ID, or use -PreviewOnly.' }
    $nodeMajor = [int]((& node -p 'process.versions.node.split(".")[0]') | Select-Object -Last 1)
    if ($nodeMajor -lt 22) { throw 'Use Node.js 22 LTS or later for the Firebase CLI.' }
    # CLI is installed by npx in its cache. No global package or billing account is created.
    $cli = @('--yes', '--package', 'firebase-tools@15.36.0', 'firebase')
    if ($Login) { Invoke-Checked 'npx.cmd' ($cli + @('login')) }
    if ($CreateProject) {
        Invoke-Checked 'npx.cmd' ($cli + @('projects:create', $ProjectId, '--display-name', 'Zikirmatik'))
    }
    $projectsOutput = & npx.cmd @cli projects:list --json
    if ($LASTEXITCODE -ne 0) { throw 'Firebase access failed. Run again with -Login.' }
    $projects = $projectsOutput | Out-String | ConvertFrom-Json
    if (-not ($projects.result | Where-Object { $_.projectId -eq $ProjectId })) {
        throw 'This Google account cannot access the specified project. Check ProjectId.'
    }
    $sitesOutput = & npx.cmd @cli hosting:sites:list --project $ProjectId --json
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect Hosting sites.' }
    $sites = $sitesOutput | Out-String | ConvertFrom-Json
    if (-not ($sites.result.sites | Where-Object { $_.name -eq "projects/$ProjectId/sites/$ProjectId" -or $_.name -like "*/sites/$ProjectId" })) {
        Invoke-Checked 'npx.cmd' ($cli + @('hosting:sites:create', $ProjectId, '--project', $ProjectId))
    }
    $env:SITE_URL = "https://$ProjectId.web.app/"
    $env:GOOGLE_SITE_VERIFICATION = $VerificationCode
    Invoke-Checked 'node' @('site/build.mjs', '--production')
    Invoke-Checked 'node' @('site/test.mjs')
    Write-Host "Publishing static pages to $env:SITE_URL"
    Write-Host 'No database, Functions, App Hosting or paid billing setup is used.'
    Invoke-Checked 'npx.cmd' ($cli + @('deploy', '--only', 'hosting', '--project', $ProjectId, '--non-interactive'))
    $publishedPage = Invoke-WebRequest -Uri "$($env:SITE_URL)tr/" -UseBasicParsing -TimeoutSec 30
    if ($publishedPage.StatusCode -ne 200) { throw 'Deployment returned, but the Turkish page did not return HTTP 200.' }
    Write-Host "Ready: $($env:SITE_URL)tr/"
    Write-Host "Sitemap: $($env:SITE_URL)sitemap.xml"
    Write-Host 'Verify the site in Google Search Console and submit this sitemap. Indexing and ranking are not immediate.'
} finally {
    $env:SITE_URL = $previousSiteUrl
    $env:GOOGLE_SITE_VERIFICATION = $previousVerification
    Pop-Location
}
