#Requires -Version 5.1
# Runs the real build and deployment orchestration with a fake Firebase CLI.
# No login, cloud project, HTTP request or deployment is performed.
$ErrorActionPreference = 'Stop'
$global:hostingTestScenario = 'success'
$global:hostingTestCalls = [System.Collections.Generic.List[string]]::new()
$script:deploymentScript = Join-Path $PSScriptRoot 'Publish-FreeHosting.ps1'

function npx.cmd {
    $command = $args -join ' '
    $global:hostingTestCalls.Add($command)
    $global:LASTEXITCODE = 0
    if ($command -match 'projects:list') {
        throw 'Do not infer project access from the global project list.'
    }
    if ($command -match 'hosting:sites:list') {
        if ($global:hostingTestScenario -eq 'access-denied') { $global:LASTEXITCODE = 1; return }
        if ($global:hostingTestScenario -eq 'malformed-response') { return '{"status":"success","result":{}}' }
        if ($global:hostingTestScenario -eq 'missing-site') { return '{"status":"success","result":{"sites":[]}}' }
        return '{"status":"success","result":{"sites":[{"name":"projects/12345/sites/codex-hosting-test"}]}}'
    }
    if ($command -match ' deploy ' -and $global:hostingTestScenario -eq 'deploy-error') {
        $global:LASTEXITCODE = 1
    }
}
function Invoke-WebRequest {
    param($Uri, [switch]$UseBasicParsing, $TimeoutSec)
    if ($Uri -ne 'https://codex-hosting-test.web.app/tr/') { throw "Wrong published URL: $Uri" }
    $global:hostingTestCalls.Add('verified-http')
    return @{ StatusCode = 200 }
}
function Assert-That([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}
$savedUrl = $env:SITE_URL
$savedCode = $env:GOOGLE_SITE_VERIFICATION
$savedLocation = (Get-Location).Path
try {
    $env:SITE_URL = 'https://previous.invalid/'
    $env:GOOGLE_SITE_VERIFICATION = 'previous-code'
    foreach ($case in @('success','missing-site','malformed-response','access-denied','deploy-error')) {
        $global:hostingTestScenario = $case
        $global:hostingTestCalls.Clear()
        $failed = $false
        try { & $script:deploymentScript -ProjectId 'codex-hosting-test' }
        catch { $failed = $true; Write-Host "Observed ($case): $($_.Exception.Message)" }
        $shouldFail = $case -in @('malformed-response','access-denied','deploy-error')
        Assert-That ($failed -eq $shouldFail) "Unexpected result: $case"
        Assert-That ($env:SITE_URL -eq 'https://previous.invalid/') 'SITE_URL was not restored'
        Assert-That ($env:GOOGLE_SITE_VERIFICATION -eq 'previous-code') 'Verification environment was not restored'
        Assert-That ((Get-Location).Path -eq $savedLocation) 'Working directory was not restored'
        $deployCalls = @($global:hostingTestCalls | Where-Object { $_ -match ' deploy ' })
        if ($case -in @('malformed-response','access-denied')) {
            Assert-That ($deployCalls.Count -eq 0) 'Published after failed access check'
        } else {
            Assert-That ($deployCalls.Count -eq 1) 'Expected exactly one deploy'
            Assert-That ($deployCalls[0] -match '--only hosting --project codex-hosting-test --non-interactive') 'Deployment was not limited to selected Hosting project'
        }
        Assert-That (($global:hostingTestCalls -contains 'verified-http') -eq (-not $shouldFail)) 'Verified HTTP after a failed deployment'
        $createSite = @($global:hostingTestCalls | Where-Object { $_ -match 'hosting:sites:create' }).Count -gt 0
        Assert-That ($createSite -eq ($case -eq 'missing-site')) 'Incorrect Hosting site creation'
        Write-Host "PASS: $case"
    }
} finally {
    $env:SITE_URL = $savedUrl
    $env:GOOGLE_SITE_VERIFICATION = $savedCode
}
# The final scenario deliberately leaves a failed native exit code. Assertions
# above have verified that failure; do not propagate it as a CI test failure.
$global:LASTEXITCODE = 0
