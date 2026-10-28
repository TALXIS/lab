#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                      17: Wire Connector into Code App                                  ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Registers the connector as a code app data source. Unlike Dataverse tables (generated
# offline from Entity.xml), a connector operation has no offline generator — the typed
# model/service files are written directly here, and the live Connection + power.config.json
# binding are created via the real `pa` CLI commands below, gated behind LAB_LOCAL_MODE like
# every other live-environment step in this lab.
#
# Expects: Apps.WarehousePicking already scaffolded (CP09) and the connector deployed (step 2).
# Expects: $PublisherPrefix from parent scope.
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n── Code App Data Source: Product ──" -ForegroundColor Cyan

# txc's codegen title-cases just the first character of the publisher prefix (matches
# scaffold/05f-code-app.ps1's own $prefixPascal), e.g. lab -> Lab_productsService.
$prefixPascal = [char]::ToUpper($PublisherPrefix[0]) + $PublisherPrefix.Substring(1)

# The Product table (CP11 step 1) needs its own typed data source in the code app, exactly
# like the 3 tables CP09 already registered - no live environment needed here either, since
# pp-app-code-data reads Entity.xml straight from Solutions.DataModel.
if (-not (Get-LabValue 'productDataSourceScaffolded')) {
    txc workspace component create pp-app-code-data `
        --output "src/Apps.WarehousePicking" `
        --param "EntityLogicalName=${PublisherPrefix}_product" `
        --param "ModelSolutionPath=../Solutions.DataModel"
    if ($LASTEXITCODE -ne 0) { throw "Data source ${PublisherPrefix}_product failed" }
    # Belt-and-braces: confirm the file actually landed, not just that txc exited 0 - a silent
    # no-op here would otherwise only surface much later as a confusing TypeScript error.
    $productServicePath = "src/Apps.WarehousePicking/src/generated/services/${prefixPascal}_productsService.ts"
    if (-not (Test-Path $productServicePath)) {
        throw "pp-app-code-data reported success but $productServicePath was not written - re-run this step."
    }
    Write-Host "  ✓ Data source: ${PublisherPrefix}_product" -ForegroundColor Green
    Set-LabValue 'productDataSourceScaffolded' $true
} else {
    Write-Host "  ✓ Data source: ${PublisherPrefix}_product (exists)" -ForegroundColor Green
}

# CP11 step 1 added a Product lookup column to warehouseitem *after* CP09 first generated its
# data source - re-run pp-app-code-data for it too, so the stale model picks up the new
# productid field. Re-running for a table that already has a data source just regenerates its
# Model/Service files fresh from the entity's current Entity.xml; idempotent either way.
txc workspace component create pp-app-code-data `
    --output "src/Apps.WarehousePicking" `
    --param "EntityLogicalName=${PublisherPrefix}_warehouseitem" `
    --param "ModelSolutionPath=../Solutions.DataModel"
if ($LASTEXITCODE -ne 0) { throw "Refreshing ${PublisherPrefix}_warehouseitem data source failed" }
$warehouseitemModelPath = "src/Apps.WarehousePicking/src/generated/models/${prefixPascal}_warehouseitemsModel.ts"
if (-not ((Get-Content $warehouseitemModelPath -Raw) -match "${PublisherPrefix}_productid")) {
    throw "$warehouseitemModelPath still missing ${PublisherPrefix}_productid after refresh - re-run this step."
}

# Re-running pp-app-code-data for a table that already has a data source regenerates its
# Model/Service files correctly, but its index.ts post-action just appends - re-registering an
# existing table duplicates its two export lines rather than leaving them alone. Deduplicate
# rather than avoid the re-run entirely: index.ts is otherwise a flat list of "export ..."
# lines, so keeping only the first occurrence of each is exactly the intended fix.
$indexTsPath = "src/Apps.WarehousePicking/src/generated/index.ts"
Set-Content -Path $indexTsPath -Value (Get-Content $indexTsPath | Select-Object -Unique) -Encoding UTF8

Write-Host "  ✓ Data source: ${PublisherPrefix}_warehouseitem (refreshed for new Product lookup)" -ForegroundColor Green

# The refresh above re-runs the template for a table whose service file already exists. The
# template's ReplacePlaceholder.ps1 renames its placeholder copy with Rename-Item, which
# refuses an existing target ("The file ... already exists"); the error is non-terminating,
# so the post-actions still report success and the cleanup runs, but the freshly generated
# service stays under the placeholder name next to the stale one. Two files declaring the
# same class break the build with TS2308 as soon as 'pa app add data-source' regenerates
# index.ts. Finish the rename here until the template does: TALXIS/tools-devkit-templates#169
# (and #177 for the pattern across templates); 1.25.1 still fails.
$servicesDir = "src/Apps.WarehousePicking/src/generated/services"
$strayService = Join-Path $servicesDir "capitalizedentitylogicalnameexamplesService.ts"
if (Test-Path $strayService) {
    Move-Item -LiteralPath $strayService -Destination (Join-Path $servicesDir "${prefixPascal}_warehouseitemsService.ts") -Force
    Write-Host "  ✓ ${prefixPascal}_warehouseitemsService.ts (finished the template's rename of its refreshed copy)" -ForegroundColor Green
}

# The Power Platform environment id (not the Dataverse organization id): the one CP04 stored
# for the Dev environment, re-resolved from the tenant's environment list when asked to - a
# recreated Dev environment keeps its URL but gets a new id.
function Resolve-DevEnvironmentId {
    param([switch]$Refresh)
    $id = if ($Refresh) { $null } else { Get-LabValue 'devEnvId' }
    if (-not $id) {
        $devEnvUrl = Get-LabValue 'devEnvUrl'
        try {
            $id = @(txc env list --profile (Get-LabValue 'devProfile') --format json 2>$null | ConvertFrom-Json -ErrorAction Stop |
                Where-Object { "$($_.environmentUrl)".TrimEnd('/') -eq "$devEnvUrl".TrimEnd('/') })[0].environmentId
        } catch { $id = $null }
        if (-not $id) { throw "Could not resolve the Dev environment id for $devEnvUrl - run CP04 again." }
        Set-LabValue 'devEnvId' $id
    }
    return $id
}

# pa prints status lines around the JSON even with --json: keep what sits between the first
# '{' and the last '}'.
function ConvertFrom-PaJson {
    param([Parameter(Mandatory)]$Output)
    $raw = ($Output | Out-String)
    $start = $raw.IndexOf('{'); $end = $raw.LastIndexOf('}')
    if ($start -lt 0 -or $end -lt $start) { throw "pa returned no JSON: $raw" }
    return $raw.Substring($start, $end - $start + 1) | ConvertFrom-Json
}

Write-Host "`n── Connector Data Source: Open Food Facts ──" -ForegroundColor Cyan

if (-not (Get-LabValue 'connectorDataSourceScaffolded')) {
    $appRoot = "src/Apps.WarehousePicking"
    $dataSourcesInfoPath = "$appRoot/.power/schemas/appschemas/dataSourcesInfo.ts"

    if (-not (Test-Path $dataSourcesInfoPath)) {
        throw "dataSourcesInfo.ts not found at $dataSourcesInfoPath - run CP09 first."
    }

    $newEntry = @'
  "OpenFoodFacts": {
    "tableId": "",
    "version": "",
    "dataSourceType": "Connector",
    "apis": {
      "GetProductByBarcode": {
        "path": "/product/{barcode}.json",
        "method": "GET",
        "parameters": [
          { "name": "barcode", "in": "path", "required": true, "type": "string" }
        ]
      },
      "GetProductImage": {
        "path": "/product-image",
        "method": "GET",
        "parameters": [
          { "name": "imageUrl", "in": "query", "required": true, "type": "string" }
        ],
        "responseInfo": {
          "200": { "type": "file" }
        }
      }
    }
  }
'@

    $text = [System.IO.File]::ReadAllText($dataSourcesInfoPath)
    if ($text.Contains('"OpenFoodFacts"')) {
        Write-Host "  ✓ dataSourcesInfo.ts (OpenFoodFacts entry exists)" -ForegroundColor Green
    } else {
        # Same insertion approach pp-app-code-data's own AddDataSourceInfo.ps1 uses: find the
        # object literal's closing '};', insert the new entry right before it (after a comma
        # on the previous entry's closing '}', if there is one).
        $lines = [System.IO.File]::ReadAllLines($dataSourcesInfoPath)
        $result = [System.Collections.Generic.List[string]]::new()

        $closingIdx = -1
        for ($i = $lines.Count - 1; $i -ge 0; $i--) {
            if ($lines[$i].TrimStart() -eq '};') { $closingIdx = $i; break }
        }
        if ($closingIdx -eq -1) { throw "Could not find closing '};' in $dataSourcesInfoPath" }

        $lastEntryClose = -1
        for ($i = $closingIdx - 1; $i -ge 0; $i--) {
            if ($lines[$i].TrimStart() -eq '}' -or $lines[$i].TrimStart() -eq '},') { $lastEntryClose = $i; break }
        }

        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($i -eq $lastEntryClose -and $lastEntryClose -ne -1) {
                $line = $lines[$i].TrimEnd()
                if (-not $line.EndsWith(',')) { $line += ',' }
                $result.Add($line)
                foreach ($entryLine in $newEntry.Split("`n")) { $result.Add($entryLine.TrimEnd("`r")) }
            } elseif ($i -eq $closingIdx -and $lastEntryClose -eq -1) {
                foreach ($entryLine in $newEntry.Split("`n")) { $result.Add($entryLine.TrimEnd("`r")) }
                $result.Add($lines[$i])
            } else {
                $result.Add($lines[$i])
            }
        }
        [System.IO.File]::WriteAllLines($dataSourcesInfoPath, $result)
        Write-Host "  ✓ dataSourcesInfo.ts (added OpenFoodFacts entry)" -ForegroundColor Green
    }

    Expand-LabTemplate -Path "17-connector-datasource/OpenFoodFactsModel.ts" `
        -Destination "$appRoot/src/generated/models/OpenFoodFactsModel.ts"
    Expand-LabTemplate -Path "17-connector-datasource/OpenFoodFactsService.ts" `
        -Destination "$appRoot/src/generated/services/OpenFoodFactsService.ts"
    Write-Host "  ✓ OpenFoodFactsModel.ts + OpenFoodFactsService.ts" -ForegroundColor Green

    $connectorSchemaName = "${PublisherPrefix}_connectorsopenfoodfacts"
    if ($env:LAB_LOCAL_MODE) {
        Write-Info "LAB_LOCAL_MODE: skipped — would look the connector up with 'txc environment connector list',"
        Write-Info "  run 'txc environment connection create --connector $connectorSchemaName' and 'pa app add"
        Write-Info "  data-source --connector <id> --connection-id <connection>' from src/Apps.WarehousePicking"
        Write-Info "  to bind a real Dev connection into power.config.json."
    } else {
        # Non-interactive pa (an agent, an unattended run) refuses without --environment-id.
        $environmentId = Resolve-DevEnvironmentId
        Write-Ok "Environment id: $environmentId"

        Push-Location $appRoot
        try {
            # The code app addresses the connector by its environment-specific apiId (the
            # hex-escaped display name plus a generated suffix, e.g. shared_lab-5fopen-20food-20facts-5f7e99...),
            # which cannot be derived locally; txc maps the stable logical name to it.
            Write-Info "Resolving the connector's id..."
            $connectors = txc environment connector list --filter "Open Food Facts" --profile $devProfile --format json |
                Out-String | ConvertFrom-Json
            if ($LASTEXITCODE -ne 0) { throw "txc environment connector list failed" }
            $connectorApiName = @($connectors) | Where-Object { $_.logicalName -eq $connectorSchemaName } |
                Select-Object -First 1 -ExpandProperty apiId
            if (-not $connectorApiName) {
                throw "The 'Open Food Facts' connector is not in this environment. Deploy Solutions.Connectors (CP11 step 2) before wiring it into the app."
            }
            Write-Ok "Connector id: $connectorApiName (logical name $connectorSchemaName)"

            # Idempotent by connector and display name: a re-run finds the connection it created
            # rather than adding another, and replaces one deleted in the maker portal.
            Write-Info "Creating a connection to the Open Food Facts connector..."
            $created = txc environment connection create --connector $connectorSchemaName --display-name "Open Food Facts" `
                --profile $devProfile --format json | Out-String | ConvertFrom-Json
            if ($LASTEXITCODE -ne 0 -or -not $created.connectionId) {
                throw "txc environment connection create failed: $($created.status) $($created.statusMessage)"
            }
            $connectionId = $created.connectionId
            Set-LabValue 'openFoodFactsConnectionId' $connectionId
            Write-Ok "Connection $($created.status): $connectionId"

            Write-Info "Adding the connector as a data source..."
            pa app add data-source --environment-id $environmentId --connector $connectorApiName --connection-id $connectionId
            if ($LASTEXITCODE -ne 0) { throw "pa app add data-source failed" }
            Write-Ok "Connector wired into power.config.json - re-run 'npm run build' to confirm"
        } finally { Pop-Location }
    }

    Set-LabValue 'connectorDataSourceScaffolded' $true
} else {
    Write-Host "  ✓ Connector data source (exists)" -ForegroundColor Green
}
