#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                 20d: Enrich Products flow (Teams, through a connection)                ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# After the update, post a Teams message. Unlike everything before it, this action's inputs
# only exist through a signed-in connection: who posts, where, and the body fields that
# depend on both. CP17 asks the connector for them through the Teams connection and passes
# the answers in.
#
# Expects: $PublisherPrefix, $EnrichFlowName, $TeamsReference, $TeamsPoster, $TeamsLocation,
#          $TeamsRecipient from parent scope.
# Expects: 20c-enrich-lookup.ps1 has run.
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n── Enrich Products flow: Teams message ──" -ForegroundColor Cyan

if (-not (Get-LabValue 'enrichNotifyScaffolded')) {
    $flowJson = Get-ChildItem -Path "src/Solutions.Logic/Workflows" -Filter "${PublisherPrefix}_${EnrichFlowName}-*.json" |
                Select-Object -First 1
    if (-not $flowJson) { throw "No ${PublisherPrefix}_$EnrichFlowName flow - run 20a-enrich-flow.ps1 first." }

    txc workspace component create pp-connection-reference `
        --output "src/Solutions.Logic" `
        --param "PublisherPrefix=$PublisherPrefix" `
        --param "ConnectorName=shared_teams" `
        --param "LogicalName=$TeamsReference" `
        --param "DisplayName=Microsoft Teams"
    if ($LASTEXITCODE -ne 0) { throw "Connection reference scaffold failed - re-run this step." }
    Write-Host "  ✓ $TeamsReference connection reference (shared_teams)" -ForegroundColor Green

    $partsPath = Join-Path ([System.IO.Path]::GetTempPath()) "lab-enrich-notify.json"
    Expand-LabTemplate -Path "20-enrich-products/notify.json" -Destination $partsPath -Tokens @{
        PREFIX          = $PublisherPrefix
        TEAMS_REFERENCE = $TeamsReference
        POSTER          = $TeamsPoster
        LOCATION        = $TeamsLocation
        RECIPIENT       = $TeamsRecipient
    }
    $parts = Get-Content -Raw $partsPath | ConvertFrom-Json
    Remove-Item $partsPath

    $flow = Get-Content -Raw $flowJson.FullName | ConvertFrom-Json
    $flow.properties.connectionReferences | Add-Member -NotePropertyName shared_teams `
        -NotePropertyValue $parts.connectionReferences.shared_teams -Force
    $flow.properties.definition.actions.Has_barcode.actions | Add-Member -NotePropertyName Post_in_Teams `
        -NotePropertyValue $parts.actions.Post_in_Teams -Force
    $flow | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $flowJson.FullName -Encoding UTF8

    Write-Host "  ✓ Post_in_Teams ($TeamsPoster, $TeamsLocation, to $TeamsRecipient)" -ForegroundColor Green
    Set-LabValue 'enrichNotifyScaffolded' $true
} else {
    Write-Host "  ✓ Teams message (exists)" -ForegroundColor Green
}
