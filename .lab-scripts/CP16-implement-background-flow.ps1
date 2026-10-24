#!/usr/bin/env pwsh
#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                       CP16: Implement a background flow                                ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Background jobs without a user: a Power Automate cloud flow on a 5-minute recurrence
# keeps a Needs Restock flag on warehouse items in sync with their available quantity.
#
# A flow definition is hand-written JSON with no compiler behind it, so an invented
# operation id or parameter name only fails at deployment. Before scaffolding, this
# checkpoint asks the Dev environment for the real contract of the two Dataverse operations
# the flow uses - that is how an agent should author flows too.
#
# Step 2 deploys to Dev and binds the connection reference to a connection created with
# 'pa connection create', then turns the flow on. The connection is the one piece that
# never lives in source: it is a signed-in account in one environment.
#
# Run:  .lab-scripts/CP16-implement-background-flow.ps1
# ──────────────────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/Lab.Common.ps1"
$PublisherName   = Get-LabValue 'publisherName'   $LabDefaultPublisherName
$PublisherPrefix = Get-LabValue 'publisherPrefix' $LabDefaultPublisherPrefix

$devUrl = Get-LabValue 'devEnvUrl'
$devProfile = Get-LabValue 'devProfile'
if (-not $devUrl -or -not $devProfile) { Write-Err "Dev environment not found in lab state. Run CP04 first."; exit 1 }

$dataverseConnector = "shared_commondataserviceforapps"
$connectionReference = "${PublisherPrefix}_sharedcommondataserviceforapps"

Write-Step "CP16: Background flow (step 1: flow from source)"

if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped, would run 'txc environment connector operation get'"
    Write-Info "  for ListRecords and UpdateOnlyRecord against Dev ($devUrl)."
} else {
    # UpdateRecord is "Upsert a row" in this connector; the plain update is UpdateOnlyRecord.
    foreach ($operation in "ListRecords", "UpdateOnlyRecord") {
        Write-Info "Operation contract from Dev: $operation"
        txc environment connector operation get --connector $dataverseConnector --operation $operation --profile $devProfile --format text
        if ($LASTEXITCODE -ne 0) { Write-Err "Connector discovery failed for $operation"; exit 1 }
    }
}

Push-Location $LabRoot
try {
    . "$PSScriptRoot/scaffold/19-background-flow.ps1"
    dotnet build --nologo --verbosity quiet
    if ($LASTEXITCODE -ne 0) { Write-Err "dotnet build failed"; exit 1 }
} finally { Pop-Location }

Save-Checkpoint -Id "cp16" -Message "Add a background flow that flags low-stock items" -Body @'
Add a Power Automate cloud flow that runs every 5 minutes without a user and keeps a Needs Restock flag on warehouse items in sync with their available quantity. The flow, its Dataverse connection reference and the new column all live in source.
- add warehouseitem.needsrestock (Boolean) to Solutions.DataModel
- add a Dataverse connection reference to Solutions.Logic (pp-connection-reference)
- add the lowstockcheck flow to Solutions.Logic (pp-flow, recurrence trigger) with ListRecords and UpdateOnlyRecord actions
- dotnet build --nologo --verbosity quiet passes from the repository root
'@

Write-Step "CP16: Background flow (step 2: deploy, bind the connection, turn the flow on)"

if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped, would publish Packages.Main, run 'txc env pkg import' to"
    Write-Info "  Dev ($devUrl), create a Dataverse connection with 'pa connection create',"
    Write-Info "  bind $connectionReference to it and turn the flow on."
    exit 0
}

Push-Location $LabRoot
try {
    dotnet publish "src/Packages.Main/Packages.Main.csproj" -c Release --nologo --verbosity quiet
    if ($LASTEXITCODE -ne 0) { Write-Err "dotnet publish failed"; exit 1 }
    $pdpkg = Get-ChildItem "src/Packages.Main/bin/Release" -Filter "*.pdpkg.zip" -Recurse | Select-Object -First 1
    if (-not $pdpkg) { Write-Err "Packages.Main.pdpkg.zip not found after publish"; exit 1 }

    Write-Info "Deploying $($pdpkg.Name) to Dev ($devUrl)..."
    txc env pkg import $pdpkg.FullName --profile $devProfile
    if ($LASTEXITCODE -ne 0) { Write-Err "Package import to Dev failed"; exit 1 }
    Write-Ok "Deployed - the flow can't run until its connection reference is bound"

    $connectionId = Get-LabValue 'dataverseConnectionId'
    if (-not $connectionId) {
        # pa resolves the environment from power.config.json, so it runs from the code app.
        Write-Info "pa opens a browser window to sign in to Microsoft Dataverse:"
        Write-Info "  keep Authentication Type = Oauth, click Create, then come back here."
        Push-Location "src/Apps.WarehousePicking"
        try {
            $connectionJson = pa connection create --connector $dataverseConnector --display-name "Microsoft Dataverse" --json
            if ($LASTEXITCODE -ne 0) { throw "pa connection create failed" }
        } finally { Pop-Location }
        # pa prints status lines around the JSON even with --json.
        $raw = $connectionJson | Out-String
        $start = $raw.IndexOf('{'); $end = $raw.LastIndexOf('}')
        if ($start -lt 0 -or $end -lt $start) { Write-Err "pa connection create returned no JSON: $raw"; exit 1 }
        $connectionId = ($raw.Substring($start, $end - $start + 1) | ConvertFrom-Json).connectionId
        if (-not $connectionId) { Write-Err "Could not parse connectionId from 'pa connection create' output"; exit 1 }
        Set-LabValue 'dataverseConnectionId' $connectionId
    }
    Write-Ok "Dataverse connection: $connectionId"

    $references = txc env data query odata connectionreferences `
        --filter "connectionreferencelogicalname eq '$connectionReference'" `
        --select connectionreferenceid --profile $devProfile --format json | ConvertFrom-Json
    $referenceId = @($references)[0].connectionreferenceid
    if (-not $referenceId) { Write-Err "Connection reference $connectionReference not found in Dev"; exit 1 }

    txc env data record update $referenceId --entity connectionreference `
        --data (@{ connectionid = $connectionId } | ConvertTo-Json -Compress) --apply --profile $devProfile
    if ($LASTEXITCODE -ne 0) { Write-Err "Binding the connection reference failed"; exit 1 }
    Write-Ok "$connectionReference bound to the connection"

    $flowXml = Get-ChildItem "src/Solutions.Logic/Workflows" -Filter "${PublisherPrefix}_lowstockcheck-*.json.data.xml" | Select-Object -First 1
    $workflowId = ([xml](Get-Content -Raw $flowXml.FullName)).Workflow.WorkflowId.Trim('{}')

    # Import already marks the flow on (statecode 1) without a connection; an off/on cycle
    # makes Power Automate start it against the now bound reference.
    foreach ($state in @{ statecode = 0; statuscode = 1 }, @{ statecode = 1; statuscode = 2 }) {
        txc env data record update $workflowId --entity workflow `
            --data ($state | ConvertTo-Json -Compress) --apply --profile $devProfile
        if ($LASTEXITCODE -ne 0) { Write-Err "Turning the flow on failed"; exit 1 }
    }
    Write-Ok "lowstockcheck is on - it runs every 5 minutes"
} finally { Pop-Location }

Write-Info "Try it: set an item's Available Quantity below 10 in the app and wait for the next run."
Write-Info "Runs are listed at https://make.powerautomate.com under the Dev environment's solution."
