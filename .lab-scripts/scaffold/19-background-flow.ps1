#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                            19: Background Flow                                         ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# A cloud flow that runs without a user: every 5 minutes it flags warehouse items whose
# available quantity dropped below the threshold, and clears the flag once they are restocked.
#
# Everything is source: the Needs Restock column, the Dataverse connection reference the
# flow binds to, and the flow definition. Only the connection (a signed-in account) lives in
# the environment, and the checkpoint binds it after deployment.
#
# Expects: $PublisherPrefix from parent scope.
# Expects: Solutions.Logic already scaffolded (08-logic-solution.ps1, via CP07).
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n── Background flow ──" -ForegroundColor Cyan

$FlowLogicalName = "lowstockcheck"
$RestockThreshold = 10

if (-not (Get-LabValue 'needsRestockColumnScaffolded')) {
    txc workspace component create pp-entity-attribute `
        --output "src/Solutions.DataModel" `
        --param "EntitySchemaName=${PublisherPrefix}_warehouseitem" `
        --param "AttributeType=Boolean" `
        --param "RequiredLevel=none" `
        --param "PublisherPrefix=$PublisherPrefix" `
        --param "LogicalName=needsrestock" `
        --param "DisplayName=Needs Restock" `
        --param "BooleanTrueLabel=Yes" `
        --param "BooleanFalseLabel=No"
    if ($LASTEXITCODE -ne 0) { throw "needsrestock column scaffold failed - re-run this step." }

    Write-Host "  ✓ warehouseitem.needsrestock (Boolean)" -ForegroundColor Green
    Set-LabValue 'needsRestockColumnScaffolded' $true
} else {
    Write-Host "  ✓ warehouseitem.needsrestock (exists)" -ForegroundColor Green
}

if (-not (Get-LabValue 'backgroundFlowScaffolded')) {
    txc workspace component create pp-connection-reference `
        --output "src/Solutions.Logic" `
        --param "PublisherPrefix=$PublisherPrefix" `
        --param "ConnectorName=shared_commondataserviceforapps" `
        --param "DisplayName=Microsoft Dataverse"
    if ($LASTEXITCODE -ne 0) { throw "Connection reference scaffold failed - re-run this step." }

    Write-Host "  ✓ Dataverse connection reference" -ForegroundColor Green

    txc workspace component create pp-flow `
        --output "src/Solutions.Logic" `
        --param "PublisherPrefix=$PublisherPrefix" `
        --param "LogicalName=$FlowLogicalName" `
        --param "Trigger=recurrence" `
        --param "RecurrenceFrequency=Minute" `
        --param "RecurrenceInterval=5"
    if ($LASTEXITCODE -ne 0) { throw "Flow scaffold failed - re-run this step." }

    $flowJson = Get-ChildItem -Path "src/Solutions.Logic/Workflows" -Filter "${PublisherPrefix}_${FlowLogicalName}-*.json" |
                Select-Object -First 1
    if (-not $flowJson) { throw "Flow scaffold produced no definition JSON." }

    # The template ships a recurrence trigger with no actions. The actions come from
    # .lab-scripts/templates/19-background-flow/, with operation ids and parameter names
    # taken from 'txc environment connector operation get' (shown by CP16).
    $partsPath = Join-Path ([System.IO.Path]::GetTempPath()) "lab-flow-actions.json"
    Expand-LabTemplate -Path "19-background-flow/flow-actions.json" -Destination $partsPath -Tokens @{
        PREFIX               = $PublisherPrefix
        THRESHOLD            = $RestockThreshold
        CONNECTION_REFERENCE = "${PublisherPrefix}_sharedcommondataserviceforapps"
    }
    $parts = Get-Content -Raw $partsPath | ConvertFrom-Json
    Remove-Item $partsPath

    $flow = Get-Content -Raw $flowJson.FullName | ConvertFrom-Json
    $flow.properties.connectionReferences = $parts.connectionReferences
    $flow.properties.definition.actions = $parts.actions
    $flow | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $flowJson.FullName -Encoding UTF8

    Write-Host "  ✓ $($flowJson.Name) (every 5 minutes, threshold $RestockThreshold)" -ForegroundColor Green
    Set-LabValue 'backgroundFlowScaffolded' $true
} else {
    Write-Host "  ✓ Background flow (exists)" -ForegroundColor Green
}
