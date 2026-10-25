#!/usr/bin/env pwsh
#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║              CP11: Integrate External Data (Custom Connector)                          ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Teaches the full round trip: external API -> custom connector -> code app -> Dataverse.
# A warehouse worker scans a product's barcode in the WarehousePicking code app; the app
# calls a custom connector to look up the product's catalog data; the result is upserted
# into a dedicated Product table and linked to the scanned Item.
#
# This checkpoint lands in stages, each its own reviewable update:
#   1. Data model: the Product table and the Item -> Product lookup column, deployed to Dev.
#   2. The custom connector project, deployed to Dev.
#   3. Wiring the connector and the Product table into the WarehousePicking code app.
#   4. Barcode-scanning UI that ties the whole flow together.
# All four run in this one script, each closed out by its own Save-Checkpoint - the PR/commit
# history is what makes them individually reviewable, not separate files to run by hand.
# Each save opens its own PR and moves the cp11 tag, so the tag always marks the last step
# that landed; an interrupted run picks up at the first step whose work is missing.
#
# Run:  .lab-scripts/CP11-integrate-external-data.ps1
# ──────────────────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/Lab.Common.ps1"
$PublisherName = Get-LabValue 'publisherName' $LabDefaultPublisherName
$PublisherPrefix = Get-LabValue 'publisherPrefix' $LabDefaultPublisherPrefix

$devUrl = Get-LabValue 'devEnvUrl'
$devProfile = Get-LabValue 'devProfile'
if (-not $devUrl -or -not $devProfile) { Write-Err "Dev environment not found in lab state. Run CP04 first."; exit 1 }

Write-Step "CP11 — Integrate external data (step 1: data model)"
Push-Location $LabRoot
try {
    . "$PSScriptRoot/scaffold/15-product-table.ps1"
    dotnet build --nologo --verbosity quiet
    if ($LASTEXITCODE -ne 0) { Write-Err "dotnet build failed"; exit 1 }
} finally { Pop-Location }

# CP10 deployed the whole package before the Product table existed; Dev has to learn about it
# now, before the code app binds to it (step 3) and before CP12 seeds Product rows. This is the
# per-solution counterpart of CP10's package deploy: 'txc env sln import' builds just
# Solutions.DataModel in Debug, so unmanaged - the same flavour CP10 installed in Dev - and
# imports it. Not 'txc env pkg import' again: every local build carries the same version
# number, and Package Deployer skips a solution whose version is already installed, whereas a
# plain solution import updates it in place - which also makes a re-run of this step harmless.
if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped — would run 'txc env sln import src/Solutions.DataModel'"
    Write-Info "  (Debug, unmanaged) to bring the Product table and the Item lookup into Dev ($devUrl)."
} elseif (Get-LabValue 'productTableDeployed') {
    Write-Ok "Product table and Item lookup already deployed to Dev"
} else {
    Write-Info "Deploying Solutions.DataModel to Dev environment ($devUrl)..."
    txc env sln import (Join-Path $LabRoot "src/Solutions.DataModel") --wait --profile $devProfile
    if ($LASTEXITCODE -ne 0) { Write-Err "Solutions.DataModel import to Dev failed"; exit 1 }
    Set-LabValue 'productTableDeployed' $true
    Write-Ok "Product table and Item lookup are live in Dev"
}

Save-Checkpoint -Id "cp11" -Message "Add Product table and Item lookup for external data integration" -Body @'
Add the data model for external product-catalog integration: a dedicated Product table for barcode-sourced data (name, brand, quantity, image), and a lookup column linking Item to Product. That one solution is deployed to Dev right away, so the table exists before anything binds to it. No connector or UI yet - those land in follow-up checkpoint updates.

## Changes
- add Product table (EAN, Brand, Quantity, Image URL, Last Synced On) to Solutions.DataModel
- add Item.Product lookup column, pointing to Product
- deploy Solutions.DataModel to Dev via txc env sln import (a same-version update, unlike a package re-import)
## Testing
- dotnet build --nologo --verbosity quiet passes from the repository root
- the Product table and the Item.Product column exist in the Dev environment
'@

Write-Step "CP11 — Integrate external data (step 2: connector)"
Push-Location $LabRoot
try {
    . "$PSScriptRoot/scaffold/16-connector.ps1"
} finally { Pop-Location }

if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped — would run 'txc env sln import src/Solutions.Connectors'"
    Write-Info "  (Debug, unmanaged) to deploy it to Dev ($devUrl) on its own, independently of the rest of the app."
} elseif (Get-LabValue 'connectorDeployed') {
    Write-Ok "Connectors.OpenFoodFacts already deployed to Dev"
} else {
    # Like step 1: txc builds the project in Debug (unmanaged, like the rest of Dev) and imports the
    # solution zip it produced.
    Write-Info "Deploying Solutions.Connectors to Dev environment ($devUrl)..."
    txc env sln import (Join-Path $LabRoot "src/Solutions.Connectors") --wait --profile $devProfile
    if ($LASTEXITCODE -ne 0) { Write-Err "Solutions.Connectors import to Dev failed"; exit 1 }
    Set-LabValue 'connectorDeployed' $true
    Write-Ok "Connectors.OpenFoodFacts deployed to Dev - try it in the maker portal's connector test pane before wiring it into the code app."
}

Save-Checkpoint -Id "cp11" -Message "Add Open Food Facts custom connector, deployed to Dev" -Body @'
Add the Connectors.OpenFoodFacts custom connector project (GET /product/{barcode}.json, no auth, custom code for the required User-Agent header and response flattening) packaged in its own Solutions.Connectors solution, and deploy it to the Dev environment. Deployed standalone - the code app is wired to it in a later checkpoint update.

## Changes
- add Connectors.OpenFoodFacts (ProjectType=Connector): real apiDefinition.swagger.json + script.csx for the Open Food Facts API
- add Solutions.Connectors, referencing Connectors.OpenFoodFacts
- deploy Solutions.Connectors to Dev via txc env sln import
## Testing
- dotnet build succeeds for Solutions.Connectors
- connector appears in the Dev environment and returns real data from the maker portal's test pane for a known EAN (e.g. 3017620422003)
'@

Write-Step "CP11 — Integrate external data (step 3: wire connector + Product into the code app)"
Push-Location $LabRoot
try {
    . "$PSScriptRoot/scaffold/17-connector-datasource.ps1"
    Push-Location "$LabRoot/src/Apps.WarehousePicking"
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { Write-Err "npm run build failed"; exit 1 }
    } finally { Pop-Location }
} finally { Pop-Location }

Save-Checkpoint -Id "cp11" -Message "Wire the Product table and Open Food Facts connector into the code app" -Body @'
Register the Product table as a code app data source alongside the existing 3, and wire the Open Food Facts connector: typed model/service files plus a dataSourcesInfo.ts entry for its GetProductByBarcode operation, so the app can call it. Binding a live Dev connection (pa connection create + pa app add data-source --connector) is a separate, LAB_LOCAL_MODE-gated step here - run it once you have the connector deployed to get a working runtime connection.

## Changes
- add a Product data source to Apps.WarehousePicking (pp-app-code-data)
- add OpenFoodFactsModel.ts / OpenFoodFactsService.ts and a dataSourcesInfo.ts entry for the connector
## Testing
- npm run build succeeds in src/Apps.WarehousePicking
'@

Write-Step "CP11 — Integrate external data (step 4: barcode scan UI)"
Push-Location $LabRoot
try {
    . "$PSScriptRoot/scaffold/18-barcode-scan-ui.ps1"
    Push-Location "$LabRoot/src/Apps.WarehousePicking"
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { Write-Err "npm run build failed"; exit 1 }
    } finally { Pop-Location }
} finally { Pop-Location }

Save-Checkpoint -Id "cp11" -Message "Add barcode scan UI to the item detail page" -Body @'
Add a "Scan Barcode" button to the item detail page. It opens a dialog that decodes a barcode with the device camera (or accepts one typed in manually), looks it up via the Open Food Facts connector, and on confirmation upserts a Product record (matched by EAN) and links it to the item.

## Changes
- add components/BarcodeScanDialog.tsx (built on the camera scanner and barcode helpers the phone screens already have)
- wire it into the header of pages/WarehouseItemDetail.tsx
- replace the Receive screen's do-nothing barcode lookup with Open Food Facts: a barcode that matches no item prefills the New item form with the product's name and links the new item to its Product record
- linking a product also stores the barcode on the item, so the Receive screen finds it on later scans
## Testing
- npm run build succeeds in src/Apps.WarehousePicking
- manual: npm run dev, open an item, Scan Barcode, type a known EAN (e.g. 3017620422003), confirm the lookup preview and Link to Item
'@
Write-Host "`nNext: .lab-scripts/CP12-move-configuration.ps1" -ForegroundColor Cyan
