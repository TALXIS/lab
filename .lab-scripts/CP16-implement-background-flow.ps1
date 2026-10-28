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
# Step 2 deploys to Dev, creates the Dataverse connection and binds the connection
# reference to it with txc, checks through that connection that the column the flow writes
# exists, and turns the flow on. The connection is the one piece that never lives in
# source: it is a signed-in account in one environment.
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
        txc environment connector operation get $dataverseConnector $operation --profile $devProfile --format text
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

Write-Step "CP16: Background flow (step 2: deploy, connect, turn the flow on)"

if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped, would import Solutions.DataModel and Solutions.Logic to"
    Write-Info "  Dev ($devUrl), create a Dataverse connection with 'txc environment connection create',"
    Write-Info "  bind $connectionReference to it and turn the flow on."
    exit 0
}

# Same-version solutions: 'txc env sln import' updates them, where a package re-import would
# be skipped by Package Deployer. DataModel first: the flow filters on its new column.
foreach ($solution in "Solutions.DataModel", "Solutions.Logic") {
    Write-Info "Importing $solution to Dev ($devUrl)..."
    txc env sln import (Join-Path $LabRoot "src/$solution") --wait --profile $devProfile
    if ($LASTEXITCODE -ne 0) { Write-Err "$solution import to Dev failed"; exit 1 }
}
Write-Ok "Deployed - the flow can't run until its connection reference is bound"

# Idempotent by connector and display name: a re-run finds the connection it created.
Write-Info "Creating the Dataverse connection (signs in as you, silently)..."
$created = txc environment connection create --connector $dataverseConnector --display-name "Microsoft Dataverse" `
    --profile $devProfile --format json | Out-String | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $created.connectionId) {
    Write-Err "Creating the Dataverse connection failed: $($created.status) $($created.statusMessage)"
    if ($created.consentLink) { Write-Info "Finish the sign-in here, then run this checkpoint again: $($created.consentLink)" }
    exit 1
}
Write-Ok "Dataverse connection: $($created.connectionId) ($($created.status))"

txc environment connection-reference update $connectionReference --connection-id $created.connectionId --profile $devProfile
if ($LASTEXITCODE -ne 0) { Write-Err "Binding $connectionReference failed"; exit 1 }
Write-Ok "$connectionReference bound to the connection"

# The flow writes item/<column> keys that only exist once the table is known. Ask the
# connector, through the connection just bound, for the real field names of UpdateOnlyRecord
# on this table - the call a flow author (or an agent) makes instead of guessing. It runs as
# you, the connection's owner, and only reads metadata.
$needsRestockField = "item/${PublisherPrefix}_needsrestock"
Write-Info "Checking $needsRestockField against the connector, through the connection..."
$answer = txc environment connector operation parameter get $dataverseConnector UpdateOnlyRecord item `
    --value "entityName=${PublisherPrefix}_warehouseitems" --connection-reference $connectionReference `
    --use-connection --filter needsrestock `
    --profile $devProfile --format json | Out-String | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { Write-Err "Reading UpdateOnlyRecord's fields failed"; exit 1 }
if (-not (@($answer.fields) | Where-Object { $_.name -eq $needsRestockField })) {
    Write-Err "UpdateOnlyRecord has no '$needsRestockField' field ($($answer.status): $($answer.message))"
    exit 1
}
Write-Ok "$needsRestockField is a field of UpdateOnlyRecord"

$flowXml = Get-ChildItem (Join-Path $LabRoot "src/Solutions.Logic/Workflows") -Filter "${PublisherPrefix}_lowstockcheck-*.json.data.xml" | Select-Object -First 1
$workflowId = ([xml](Get-Content -Raw $flowXml.FullName)).Workflow.WorkflowId.Trim('{}')

# Import already marks the flow on (statecode 1) without a connection; an off/on cycle
# makes Power Automate start it against the now bound reference.
foreach ($state in @{ statecode = 0; statuscode = 1 }, @{ statecode = 1; statuscode = 2 }) {
    txc env data record update $workflowId --entity workflow `
        --data ($state | ConvertTo-Json -Compress) --apply --profile $devProfile
    if ($LASTEXITCODE -ne 0) { Write-Err "Turning the flow on failed"; exit 1 }
}
Write-Ok "lowstockcheck is on - it runs every 5 minutes"

Write-Info "Try it: set an item's Available Quantity below 10 in the app and wait for the next run."
Write-Info "Runs are listed at https://make.powerautomate.com under the Dev environment's solution."
