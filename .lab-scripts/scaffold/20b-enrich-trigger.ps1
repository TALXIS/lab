#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                 20b: Enrich Products flow (trigger and condition)                      ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Replaces the manual trigger with Dataverse "When a row is added" on Product, and adds a
# condition that the new row has a barcode. Written from the operation contract only (CP17
# prints it) - no connection is used. The trigger's three values (Added, the Product table,
# Organization) are the connector's dynamic lists; CP17 checks them through the connection
# once it has one (step 4).
#
# Expects: $PublisherPrefix, $EnrichFlowName, $DataverseReference from parent scope.
# Expects: 20a-enrich-flow.ps1 has run.
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n── Enrich Products flow: trigger and condition ──" -ForegroundColor Cyan

if (-not (Get-LabValue 'enrichTriggerScaffolded')) {
    $flowJson = Get-ChildItem -Path "src/Solutions.Logic/Workflows" -Filter "${PublisherPrefix}_${EnrichFlowName}-*.json" |
                Select-Object -First 1
    if (-not $flowJson) { throw "No ${PublisherPrefix}_$EnrichFlowName flow - run 20a-enrich-flow.ps1 first." }

    $partsPath = Join-Path ([System.IO.Path]::GetTempPath()) "lab-enrich-trigger.json"
    Expand-LabTemplate -Path "20-enrich-products/trigger.json" -Destination $partsPath -Tokens @{
        PREFIX              = $PublisherPrefix
        DATAVERSE_REFERENCE = $DataverseReference
    }
    $parts = Get-Content -Raw $partsPath | ConvertFrom-Json
    Remove-Item $partsPath

    $flow = Get-Content -Raw $flowJson.FullName | ConvertFrom-Json
    $flow.properties | Add-Member -NotePropertyName connectionReferences -NotePropertyValue $parts.connectionReferences -Force
    $flow.properties.definition.triggers = $parts.triggers
    $flow.properties.definition.actions = $parts.actions
    $flow | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $flowJson.FullName -Encoding UTF8

    Write-Host "  ✓ trigger: a ${PublisherPrefix}_product row is added (organization)" -ForegroundColor Green
    Write-Host "  ✓ condition: the row has a barcode (${PublisherPrefix}_ean)" -ForegroundColor Green
    Set-LabValue 'enrichTriggerScaffolded' $true
} else {
    Write-Host "  ✓ Trigger and condition (exist)" -ForegroundColor Green
}
