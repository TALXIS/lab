#!/usr/bin/env pwsh
#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                    CP05: Setup Continuous Deployment                                   ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# GitHub Actions will build the Package Deployer package and deploy it to Test on every push
# to main. We authenticate with workload identity federation (OIDC) — no secrets/certs:
#   1. Create an Entra app registration + service principal (your own).
#   2. Add a federated credential trusting this repo's main branch.
#   3. Add the SP as an application user in the Test environment.
#   4. Install build.yml + deploy.yml workflows, with AZURE_CLIENT_ID / AZURE_TENANT_ID /
#      DATAVERSE_TEST_URL written into deploy.yml - identifiers, not secrets: the federated
#      credential only trusts this repository's main branch.
#
# Run:  .lab-scripts/CP05-setup-continuous-deployment.ps1
# ──────────────────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/Lab.Common.ps1"

Write-Step "CP05 — Continuous Deployment (OIDC)"

$rid     = Initialize-RandomIdentifier
$repo    = Get-LabValue 'repo'
$testUrl = Get-LabValue 'testEnvUrl'
if (-not $repo -and -not $env:LAB_LOCAL_MODE) { $originUrl = git -C $LabRoot remote get-url origin 2>$null; if ($originUrl -match 'github\.com[:/](.+?)(?:\.git)?$') { $repo = $Matches[1] }; Set-LabValue 'repo' $repo }
if (-not $testUrl) { Write-Err "Run CP04 first (Test environment URL missing)"; exit 1 }

if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped — would verify Azure sign-in, create an Entra app"
    Write-Info "  registration + service principal, add a federated credential trusting"
    Write-Info "  this repo's main branch, and add the SP as a System Administrator"
    Write-Info "  application user in the Test environment via the Dataverse OData API."
    $tenantId = Get-LabValue 'tenantId'; if (-not $tenantId) { $tenantId = "00000000-0000-0000-0000-000000000000"; Set-LabValue 'tenantId' $tenantId }
    $appId = Get-LabValue 'appId'; if (-not $appId) { $appId = "00000000-0000-0000-0000-000000000000"; Set-LabValue 'appId' $appId }
} else {

# Step 1: Verify Azure sign-in and tenant (done in CP01).
$tenantId = Get-LabValue 'tenantId'
if (-not $tenantId) {
    $tenantId = az account show --query tenantId -o tsv 2>$null
    if (-not $tenantId) { Write-Err "Not signed in to Azure — run .lab-scripts/lab-signin.ps1"; exit 1 }
    Set-LabValue 'tenantId' $tenantId
}
Write-Ok "Azure: tenant $tenantId"

# Step 2: App registration + service principal.
$appName = "wm-deploy-$rid"
$appId = Get-LabValue 'appId'
if ($appId -and -not (az ad app show --id $appId --query id -o tsv 2>$null)) {
    # Cached appId in lab-state no longer exists in Azure AD (e.g. deleted, or lab-state
    # inherited from another tenant/machine) — treat as absent and recreate below.
    Write-Warn2 "Cached appId '$appId' not found in Azure AD — recreating."
    $appId = $null
}
if (-not $appId) {
    $appId = az ad app list --display-name $appName --query "[0].appId" -o tsv 2>$null
    if (-not $appId) {
        $appId = az ad app create --display-name $appName --query appId -o tsv
        az ad sp create --id $appId | Out-Null
        Write-Ok "App registration: $appName ($appId)"
    } else {
        Write-Ok "App registration already exists: $appName ($appId)"
    }
}
Set-LabValue 'appId' $appId
if (-not (az ad sp show --id $appId --query id -o tsv 2>$null)) {
    az ad sp create --id $appId | Out-Null
}

# Step 3: Federated credentials trusting main of this repo.
# GitHub's OIDC subject is name-based by default (repo:<owner>/<repo>:ref:...), but a repo can use
# the ID-based form (repo:<owner>@<id>/<repo>@<id>:ref:...), and Entra compares subjects exactly -
# a mismatch fails every deploy with AADSTS700213. So register the name-based subject, plus the
# repo's actual prefix when it differs; either setting works, and re-running CP05 repairs a fork.
function Get-GitHubOidcSubjects {
    param([Parameter(Mandatory)][string]$Repo)
    $subjects = [ordered]@{ 'github-main' = "repo:$Repo`:ref:refs/heads/main" }
    $raw = gh api "repos/$Repo/actions/oidc/customization/sub" 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $raw) {
        Write-Warn2 "Could not read the repo's OIDC subject settings - registering the default (name-based) subject only."
        return $subjects
    }
    $settings = ($raw -join "`n") | ConvertFrom-Json
    if ($settings.use_default -eq $false) {
        Write-Warn2 "This repo uses a custom OIDC subject template; deploys may be refused with AADSTS700213 (https://github.com/$Repo/settings/actions)."
    }
    # Case-sensitive: Entra matches the subject exactly, and lab state may hold the repo in another case.
    if ($settings.sub_claim_prefix -and "$($settings.sub_claim_prefix)" -cne "repo:$Repo") {
        $subjects['github-main-id'] = "$($settings.sub_claim_prefix):ref:refs/heads/main"
    }
    return $subjects
}

function Set-FederatedCredential {
    param([Parameter(Mandatory)][string]$AppId, [Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][string]$Subject)
    $current = az ad app federated-credential list --id $AppId --query "[?name=='$Name'] | [0].subject" -o tsv 2>$null
    if ($LASTEXITCODE -ne 0) { Write-Err "Could not list the federated credentials of app $AppId"; exit 1 }
    if ($current -ceq $Subject) { Write-Ok "Federated credential $Name exists ($Subject)"; return }
    $tmp = New-TemporaryFile
    try {
        @{ name=$Name; issuer="https://token.actions.githubusercontent.com"; subject=$Subject; audiences=@("api://AzureADTokenExchange") } |
            ConvertTo-Json | Set-Content $tmp -Encoding UTF8
        $out = if ($current) { az ad app federated-credential update --id $AppId --federated-credential-id $Name --parameters "@$tmp" 2>&1 }
               else          { az ad app federated-credential create --id $AppId --parameters "@$tmp" 2>&1 }
        if ($LASTEXITCODE -ne 0) { Write-Err "Could not register federated credential $Name ($Subject): $out"; exit 1 }
    } finally { Remove-Item $tmp -ErrorAction SilentlyContinue }
    Write-Ok "Federated credential $Name $(if ($current) { "corrected from $current to" } else { 'created' }) ($Subject)"
}

$oidcSubjects = Get-GitHubOidcSubjects -Repo $repo
foreach ($name in $oidcSubjects.Keys) { Set-FederatedCredential -AppId $appId -Name $name -Subject $oidcSubjects[$name] }

# Step 4: Add SP as application user with System Administrator role in Test env.
# We use the Dataverse OData API directly (pac admin assign-user requires a pac
# auth profile which is not available in Codespaces; az is already authenticated).
# NOTE: System Administrator keeps the lab simple but breaks the least-privilege rule we
# apply to users in CP08. In production, give the deploy principal a custom role scoped to
# what imports actually need, and never a tenant-level Power Platform admin role.
$dvToken = (az account get-access-token --resource $testUrl --query accessToken -o tsv 2>$null)
$dvHeaders = @{ Authorization="Bearer $dvToken"; 'Content-Type'='application/json'; 'OData-Version'='4.0' }
$dvBase   = $testUrl.TrimEnd('/')

# Check if already registered
$existing = (Invoke-RestMethod "$dvBase/api/data/v9.2/systemusers?`$filter=applicationid eq $appId&`$select=systemuserid" -Headers $dvHeaders).value
if (-not $existing) {
    # Get root business unit
    $buId = (Invoke-RestMethod "$dvBase/api/data/v9.2/businessunits?`$filter=parentbusinessunitid eq null&`$select=businessunitid" -Headers $dvHeaders).value[0].businessunitid
    # Create application user
    $body = @{ applicationid=$appId; 'businessunitid@odata.bind'="/businessunits($buId)" } | ConvertTo-Json
    Invoke-RestMethod "$dvBase/api/data/v9.2/systemusers" -Method Post -Headers $dvHeaders -Body $body | Out-Null
    $existing = (Invoke-RestMethod "$dvBase/api/data/v9.2/systemusers?`$filter=applicationid eq $appId&`$select=systemuserid" -Headers $dvHeaders).value
}
$userId = $existing[0].systemuserid
# Assign System Administrator role (root BU scope only)
$roleId = (Invoke-RestMethod "$dvBase/api/data/v9.2/roles?`$filter=name eq 'System Administrator' and _parentroleid_value eq null&`$select=roleid" -Headers $dvHeaders).value[0].roleid
$alreadyAssigned = (Invoke-RestMethod "$dvBase/api/data/v9.2/systemusers($userId)/systemuserroles_association?`$filter=roleid eq $roleId&`$select=roleid" -Headers $dvHeaders).value
if (-not $alreadyAssigned) {
    $ref = @{ '@odata.id'="$dvBase/api/data/v9.2/roles($roleId)" } | ConvertTo-Json
    Invoke-RestMethod "$dvBase/api/data/v9.2/systemusers($userId)/systemuserroles_association/`$ref" -Method Post -Headers $dvHeaders -Body $ref | Out-Null
}
Write-Ok "Service principal added to Test environment as application user (System Administrator)"

}

# Step 5: Enable GitHub Actions on the fork (forks have them disabled by default).
if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped — would run 'gh api -X PUT repos/<repo>/actions/permissions'"
} else {
    gh api -X PUT "repos/$repo/actions/permissions" -F enabled=true -f allowed_actions=all 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Ok "GitHub Actions enabled on the fork" }
    else { Write-Warn2 "If Actions are off on your fork, open https://github.com/$repo/actions and click the green button." }
}

# Step 6: Install workflows, with your app's client id, tenant id and Test URL written into
# deploy.yml. These are identifiers, not secrets: the federated credential only trusts this
# repo's main branch, so knowing them grants nothing.
$wf = Join-Path $LabRoot ".github/workflows"
New-Item -ItemType Directory -Path $wf -Force | Out-Null
Copy-Item "$PSScriptRoot/workflows/build.yml" $wf -Force
Expand-LabTemplate -Path "../workflows/deploy.yml" -Destination "$wf/deploy.yml" `
    -Tokens @{ AZURE_CLIENT_ID = $appId; AZURE_TENANT_ID = $tenantId; DATAVERSE_TEST_URL = $testUrl }
Write-Ok "Installed build.yml + deploy.yml"

Save-Checkpoint -Id "cp05" -Message "Configure OIDC deployment identity and GitHub workflows" -Body @'
Set up GitHub Actions deployment for the warehouse app without long-lived secrets. This adds an Entra application identity, federated trust, and the workflows needed to build and deploy from main.

## Changes
- create an Entra app registration, service principal, and OIDC credential
- install build.yml and deploy.yml under .github/workflows, with the deployment identifiers written into deploy.yml
## Testing
- GitHub Actions is enabled and deploy.yml names the app registration, tenant and Test environment
'@
Write-Host "`nNext: .lab-scripts/CP06-implement-data-model.ps1" -ForegroundColor Cyan
