#!/usr/bin/env pwsh
#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                          CP04: Setup runtime                                           ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Source control is our single source of truth, which lets Dev/Test environments be
# ephemeral. We create two Dataverse environments — Dev and Test — using txc.
# Their domains include your random identifier so they won't clash in the shared tenant.
#
# Why two? Dev is your personal build-and-break space; Test is the stable target the CD
# pipeline deploys to, where the packaged app is validated before real users see it. Never
# share a Dev environment between developers - parallel unmanaged edits overwrite each
# other and ownership of changes gets lost. Because everything lives in source, an
# environment is cheap to recreate; larger teams even keep a queue of pre-provisioned
# environments with the latest CI build that developers claim when they need one.
#
# Sign-in uses device code: a code is shown, you open https://aka.ms/devicelogin and paste it.
#
# Run:  .lab-scripts/CP04-setup-runtime.ps1
# ──────────────────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/Lab.Common.ps1"

Write-Step "CP04 — Runtime environments (Dev + Test)"

$rid = Initialize-RandomIdentifier

function Get-ConnectionByIdOrUrl {
    param(
        [object[]]$Connections,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Url
    )

    if (-not $Connections -or $Connections.Count -eq 0) {
        return $null
    }

    return $Connections |
        Where-Object { $_.id -eq $Name -or $_.environmentUrl -eq $Url } |
        Select-Object -First 1
}

if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped — would sign in to Power Platform and provision real"
    Write-Info "  Dev + Test Dataverse environments via 'txc env create'. Stubbing"
    Write-Info "  devEnvUrl/testEnvUrl with unreachable placeholder URLs so later checkpoints"
    Write-Info "  that only check for their presence can still run."
    foreach ($key in @('dev', 'test')) {
        Set-LabValue "${key}EnvUrl" "https://local-$key.stub.invalid"
        Set-LabValue "${key}EnvId" "00000000-0000-0000-0000-00000000000$(if ($key -eq 'dev') { 1 } else { 2 })"
        Set-LabValue "${key}Profile" $key
    }
} else {

# Step 1: Verify Power Platform sign-in - the 'lab' credential created by lab-signin.ps1.
txc config auth get lab *> $null
if ($LASTEXITCODE -ne 0) { Write-Err "Not signed in to Power Platform — run .lab-scripts/lab-signin.ps1."; exit 1 }
Write-Ok "Signed in to Power Platform"

# Step 2: Create Dev + Test environments (unique domains via $rid).
$envs = [ordered]@{ dev = "wm-dev-$rid"; test = "wm-test-$rid" }

# US region and USD by default. To use another region, set LAB_REGION / LAB_CURRENCY
# (or the 'region' / 'currency' lab values) before running this checkpoint, e.g. europe / EUR.
$region   = if ($env:LAB_REGION)   { $env:LAB_REGION }   else { Get-LabValue 'region'   'unitedstates' }
$currency = if ($env:LAB_CURRENCY) { $env:LAB_CURRENCY } else { Get-LabValue 'currency' 'USD' }

# Developer environments by default: many tenants let only admins create Sandbox environments,
# while any maker can create a Developer one (owned by the person who signs in). If you can
# create sandboxes and want them, set LAB_ENV_TYPE=Sandbox (or the 'envType' lab value).
$envType = if ($env:LAB_ENV_TYPE) { $env:LAB_ENV_TYPE } else { Get-LabValue 'envType' 'Developer' }

$connections = @(txc config connection list --format json | ConvertFrom-Json)
$profiles    = @(txc config profile list --format json | ConvertFrom-Json)
foreach ($key in $envs.Keys) {
    $domain = $envs[$key]
    $displayName = "Warehouse $key $rid"
    $url = Get-LabValue "${key}EnvUrl"
    if (-not $url) {
        Write-Info "Creating $key environment ($domain, type $envType, region $region, currency $currency)..."
        txc env create --type $envType --name $displayName --domain $domain `
            --region $region --currency $currency --language 1033 --wait
        if ($LASTEXITCODE -ne 0) { Write-Err "Failed to create $key"; exit 1 }
        # Read the real URL back: its host suffix depends on the region (crm for the US, crm4 for Europe, ...).
        $created = @(txc env list --filter $domain --format json | ConvertFrom-Json) | Select-Object -First 1
        $url = "$($created.environmentUrl)".TrimEnd('/')
        if (-not $url) { Write-Err "Created $key but could not read its URL. Run: txc env list --filter $domain"; exit 1 }
    } else {
        Write-Ok "$key environment exists: $url"
    }

    Set-LabValue "${key}EnvUrl" $url

    # Bind the existing credential to a connection+profile (no extra sign-in).
    $connection = Get-ConnectionByIdOrUrl -Connections $connections -Name $key -Url $url
    if (-not $connection) {
        # Give the connection the environment's ids too: txc builds maker-portal links from them
        # (CP10's link to the security role), and doesn't look them up later by itself.
        $listed = @(txc env list --filter $domain --format json | ConvertFrom-Json) | Select-Object -First 1
        $ids = @()
        if ($listed.environmentId)  { $ids += '--environment-id', $listed.environmentId }
        if ($listed.organizationId) { $ids += '--organization-id', $listed.organizationId }
        txc config connection create $key --provider Dataverse --url $url @ids 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { Write-Err "Failed to create $key connection"; exit 1 }
        $connections = @(txc config connection list --format json | ConvertFrom-Json)
        $connection = Get-ConnectionByIdOrUrl -Connections $connections -Name $key -Url $url
    } else {
        Write-Ok "$key connection exists"
    }

    if (-not ($profiles | Where-Object { $_.id -eq $key })) {
        txc config profile create --name $key --auth lab --connection $key 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { Write-Err "Failed to create $key profile"; exit 1 }
        $profiles = @(txc config profile list --format json | ConvertFrom-Json)
    } else {
        Write-Ok "$key profile exists"
    }

    if ($connection.environmentId) { Set-LabValue "${key}EnvId" $connection.environmentId }
    if ($connection.organizationId) { Set-LabValue "${key}OrgId" $connection.organizationId }
    Set-LabValue "${key}Profile" $key
    Write-Ok "$key ready: $url"

    # Code apps are off by default; the Warehouse Picking code app won't run without them.
    txc env setting set PowerApps_AllowCodeApps true --profile $key 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Err "Failed to enable code apps on $key"; exit 1 }
}

# Pin the dev profile as default for local deploys.
txc config profile select dev | Out-Null
Write-Ok "Active profile: dev"

}

Save-Checkpoint -Id "cp04" -Message "Provision Dev and Test Dataverse environments" -Body @'
Create dedicated Dev and Test Dataverse environments so the warehouse app can be built and validated in isolated environments. The script also wires local txc profiles to both environments for repeatable deployments.

## Changes
- provision Dev and Test environments (Developer type unless LAB_ENV_TYPE says otherwise) with unique domains
- create txc connections and profiles for both environments
- enable code apps on both (off by default, needed by the Warehouse Picking app)
- select the dev profile as the default local deployment target
## Testing
- environment provisioning completes and txc can target the dev profile locally
'@
Write-Host "`nNext: .lab-scripts/CP05-setup-continuous-deployment.ps1" -ForegroundColor Cyan
