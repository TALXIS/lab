#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║              20c: Enrich Products flow (custom connector, from local)                  ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Inside the condition: look the barcode up with the lab's own Open Food Facts connector,
# then write name, brand, quantity, image URL and sync time back to the Product row. Both
# contracts come from the repository - the connector's apiDefinition.swagger.json and the
# Product table's Entity.xml - so this step needs no environment at all.
#
# The connection reference names the connector by its logical name, like the source does
# everywhere. A custom connector's id in an environment carries a hash nobody can know
# locally, so the reference also carries <customconnectorid>: the connector's build-time id,
# read from the built Solutions.Connectors.zip. On import, Dataverse resolves it and rewrites
# the reference to the environment's connector.
#
# Expects: $PublisherPrefix, $EnrichFlowName, $ConnectorName, $ConnectorReference from parent scope.
# Expects: 20b-enrich-trigger.ps1 has run; Solutions.Connectors exists (CP11).
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n── Enrich Products flow: Open Food Facts lookup ──" -ForegroundColor Cyan

if (-not (Get-LabValue 'enrichLookupScaffolded')) {
    $flowJson = Get-ChildItem -Path "src/Solutions.Logic/Workflows" -Filter "${PublisherPrefix}_${EnrichFlowName}-*.json" |
                Select-Object -First 1
    if (-not $flowJson) { throw "No ${PublisherPrefix}_$EnrichFlowName flow - run 20a-enrich-flow.ps1 first." }

    # The connector's build-time id. The DevKit derives it from the connector's name, so it is
    # the same on every build; read it from the zip rather than computing it here.
    $connectorsZip = "src/Solutions.Connectors/bin/Debug/net472/Solutions.Connectors.zip"
    if (-not (Test-Path $connectorsZip)) {
        dotnet build "src/Solutions.Connectors" --nologo --verbosity quiet
        if ($LASTEXITCODE -ne 0) { throw "Building Solutions.Connectors failed." }
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $connectorsZip))
    try {
        $reader = [System.IO.StreamReader]::new($zip.GetEntry("customizations.xml").Open())
        $customizations = [xml]$reader.ReadToEnd(); $reader.Dispose()
    } finally { $zip.Dispose() }
    $connector = $customizations.ImportExportXml.Connectors.Connector | Where-Object { $_.name -eq $ConnectorName }
    if (-not $connector) { throw "Solutions.Connectors.zip has no connector '$ConnectorName'." }
    $connectorId = $connector.connectorid

    txc workspace component create pp-connection-reference `
        --output "src/Solutions.Logic" `
        --param "PublisherPrefix=$PublisherPrefix" `
        --param "ConnectorName=$ConnectorName" `
        --param "LogicalName=$ConnectorReference" `
        --param "DisplayName=Open Food Facts"
    if ($LASTEXITCODE -ne 0) { throw "Connection reference scaffold failed - re-run this step." }

    # pp-connection-reference has no parameter for a custom connector's id yet; add it here.
    # A text edit keeps the file's layout as the template wrote it.
    $customizationsPath = "src/Solutions.Logic/Other/Customizations.xml"
    $xml = Get-Content -Raw $customizationsPath
    $block = "(?s)(<connectionreference connectionreferencelogicalname=`"$ConnectorReference`">.*?</connectorid>)(?!\s*<customconnectorid>)"
    $xml = $xml -replace $block, {
        "$($_.Groups[1].Value)`n      <customconnectorid>`n        <connectorid>$connectorId</connectorid>`n      </customconnectorid>"
    }
    Set-Content -LiteralPath $customizationsPath -Value $xml -NoNewline -Encoding UTF8
    Write-Host "  ✓ $ConnectorReference connection reference ($ConnectorName, build id $connectorId)" -ForegroundColor Green

    $partsPath = Join-Path ([System.IO.Path]::GetTempPath()) "lab-enrich-lookup.json"
    Expand-LabTemplate -Path "20-enrich-products/lookup.json" -Destination $partsPath -Tokens @{
        PREFIX              = $PublisherPrefix
        CONNECTOR           = $ConnectorName
        CONNECTOR_REFERENCE = $ConnectorReference
    }
    $parts = Get-Content -Raw $partsPath | ConvertFrom-Json
    Remove-Item $partsPath

    $flow = Get-Content -Raw $flowJson.FullName | ConvertFrom-Json
    $flow.properties.connectionReferences | Add-Member -NotePropertyName $ConnectorName `
        -NotePropertyValue $parts.connectionReferences.$ConnectorName -Force
    $flow.properties.definition.actions.Has_barcode.actions = $parts.actions
    $flow | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $flowJson.FullName -Encoding UTF8

    Write-Host "  ✓ Get_product_by_barcode (Open Food Facts) and Update_the_product (Dataverse)" -ForegroundColor Green
    Set-LabValue 'enrichLookupScaffolded' $true
} else {
    Write-Host "  ✓ Open Food Facts lookup (exists)" -ForegroundColor Green
}
