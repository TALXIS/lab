#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║    05f: Code App — Warehouse Picking (Vite + React + TypeScript + base controls)       ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Creates Apps.WarehousePicking — a Power Apps code app: a fully custom SPA hosted by Power
# Apps, built with Vite, React and TypeScript instead of Dataverse metadata. Two personas,
# two UI styles: Solutions.UI's model-driven app is the back-office view for office staff
# (full CRUD, grids, everything CP08's Warehouse Manager/Worker roles cover); this code app
# is the narrow, fast, task-focused screen a warehouse floor worker uses to pick a
# transaction — a code app's custom UI is the right tool for that, a general-purpose
# CRUD grid is not.
#
# It's consumed by Solutions.UI as a plain ProjectReference — the DevKit build has no
# separate-solution requirement for a CodeApp project, it discovers and builds any
# ProjectType=CodeApp reference regardless of which solution carries it, so this rides
# alongside the model-driven components instead of needing its own solution project.
# During the solution build the DevKit runs npm install / npm run build, registers the app
# as a CanvasApp root component and packs dist/ into the solution.
#
# After scaffolding and data-source generation, the placeholder UI is replaced with a real
# implementation (templates/05f-code-app/): an items list, an item detail form with its
# transactions, a transactions list and a locations list — all built on the typed models
# and services that pp-app-code-data generated from the Solutions.DataModel metadata.
# Lists are TALXIS base-controls Grids with a dataset ribbon (New / Refresh); records are created
# in dialogs and edited on the item page through base-controls Forms (ribbon, header, tabs), validated
# by their columns — the same Dataverse controls as PCF — on the pp-app-code starter's Fluent UI shell.
# All three tables get their own page; locations additionally resolve the item's location
# lookup (list column, detail form field, New Item picker) and show a per-location item count.
# The app opens on a Home screen of big quick-action tiles for the same floor worker on a phone:
# Take inventory, Receive stock, Pick stock and Find item (components/mobile/, pages/quick-*.tsx,
# StockCount.tsx, FindItem.tsx). Each is a few touch-sized steps that end in one stock transaction
# (Inbound/Outbound, a stock count books the difference), so the server-side quantity logic is reused.
# Receive can also scan a barcode with the camera and create the item when nothing matches it.
# The top tabs become a bottom bar on phones (styles/Layout.styles.ts), and every RecordGrid shows its
# records as form-style cards there (RecordCards.tsx), since a table doesn't fit a phone.
# Expects: $PublisherPrefix from parent scope.
#
# ──────────────────────────────────────────────────────────────────────────────────────────
#                                 Apps.WarehousePicking
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n── Code App: Warehouse Picking ──" -ForegroundColor Cyan

# Scaffolded once. Everything below rewrites the app's sources, and CP11 and your own work edit
# them afterwards, so a re-run of CP09 must leave the app alone. The flag is set only at the end,
# so a run that failed part-way retries the whole block.
if (Get-LabValue 'codeAppScaffolded') {
    Write-Host "  ✓ Apps.WarehousePicking (exists, left as is)" -ForegroundColor Green
    return
}

# Pin AppName so the CanvasApp schema name doesn't depend on the project folder name.
$appName = "warehousepicking"

txc workspace component create pp-app-code `
    --output "src/Apps.WarehousePicking" `
    --param "DisplayName=Warehouse Picking" `
    --param "AppName=$appName"
if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ Apps.WarehousePicking scaffold failed" -ForegroundColor Red; throw "Apps.WarehousePicking scaffold failed" }

Write-Host "  ✓ Apps.WarehousePicking project created" -ForegroundColor Green
Write-Host "  ℹ CanvasApp schema name: ${PublisherPrefix}_$appName" -ForegroundColor DarkGray

# Add the code app project to the Visual Studio solution file (run from repo root)
dotnet sln add src/Apps.WarehousePicking
if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ dotnet sln add Apps.WarehousePicking failed" -ForegroundColor Red; throw "dotnet sln add Apps.WarehousePicking failed" }

# Link the code app straight into Solutions.UI — no dedicated solution needed
dotnet add "src/Solutions.UI/Solutions.UI.csproj" reference "src/Apps.WarehousePicking/Apps.WarehousePicking.csproj"
if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ ProjectReference Apps.WarehousePicking → Solutions.UI failed" -ForegroundColor Red; throw "ProjectReference Apps.WarehousePicking to Solutions.UI failed" }

Write-Host "  ✓ ProjectReference: Apps.WarehousePicking → Solutions.UI" -ForegroundColor Green

# ──────────────────────────────────────────────────────────────────────────────────────────
#                                     Data Sources
# ──────────────────────────────────────────────────────────────────────────────────────────
#
# A code app talks to Dataverse through declared data sources. txc generates them from
# the table metadata already sitting in src/Solutions.DataModel — no live environment
# needed: typed models and services under src/generated, schema files under .power, and
# the data source registration in power.config.json that the solution build packs with
# the app.

Write-Host "`n── Code App Data Sources ──" -ForegroundColor Cyan

# ModelSolutionPath is resolved from the --output folder (the template runs its
# post-actions there), so it points at the data model project relative to the code app.
# One pp-app-code-data invocation per table — three tables, three data sources.

# Warehouse Items — items list page, item detail page, item lookup in transaction forms
txc workspace component create pp-app-code-data `
    --output "src/Apps.WarehousePicking" `
    --param "EntityLogicalName=${PublisherPrefix}_warehouseitem" `
    --param "ModelSolutionPath=../Solutions.DataModel"
if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ Data source ${PublisherPrefix}_warehouseitem failed" -ForegroundColor Red; throw "Data source ${PublisherPrefix}_warehouseitem failed" }
Write-Host "  ✓ Data source: ${PublisherPrefix}_warehouseitem" -ForegroundColor Green

# Warehouse Transactions — transactions list page, per-item transactions, create dialogs
txc workspace component create pp-app-code-data `
    --output "src/Apps.WarehousePicking" `
    --param "EntityLogicalName=${PublisherPrefix}_warehousetransaction" `
    --param "ModelSolutionPath=../Solutions.DataModel"
if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ Data source ${PublisherPrefix}_warehousetransaction failed" -ForegroundColor Red; throw "Data source ${PublisherPrefix}_warehousetransaction failed" }
Write-Host "  ✓ Data source: ${PublisherPrefix}_warehousetransaction" -ForegroundColor Green

# Warehouse Locations — location names on the items list/detail, location pick on New Item
txc workspace component create pp-app-code-data `
    --output "src/Apps.WarehousePicking" `
    --param "EntityLogicalName=${PublisherPrefix}_warehouselocation" `
    --param "ModelSolutionPath=../Solutions.DataModel"
if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ Data source ${PublisherPrefix}_warehouselocation failed" -ForegroundColor Red; throw "Data source ${PublisherPrefix}_warehouselocation failed" }
Write-Host "  ✓ Data source: ${PublisherPrefix}_warehouselocation" -ForegroundColor Green

# ──────────────────────────────────────────────────────────────────────────────────────────
#                                    Pages (picking UI)
# ──────────────────────────────────────────────────────────────────────────────────────────
#
# The base pp-app-code template already scaffolds a working Fluent UI starter: router,
# layout, a counter-demo home page, and providers for the Fluent theme (light/dark),
# toasts (useToast) and react-query. We add the real warehouse screens on top of it: an
# items list, an item detail page with its transactions, a global transactions ledger, and
# a locations list — then wire them into the router/nav and drop the now-superseded demo page.
# Lists and form fields are TALXIS base controls, which the starter already wires to a PCF context;
# lab components adapt them to a code app: RecordGrid feeds a Grid (or, on phones, RecordCards) from
# rows the page loaded through the generated services and carries the dataset ribbon; RecordForm wraps
# a base-controls Form over one in-memory record, RecordFormDialog builds the create dialogs on it and
# RecordDetailForm the item's editable detail form (both validate through the fields' columns, sharing
# RecordFormFields); RecordLookup searches an in-memory list instead of Dataverse views; and
# servicePayload hands Dataverse-shaped records to the generated services.
# Full sources: .lab-scripts/templates/05f-code-app/

Write-Host "`n── Code App Pages ──" -ForegroundColor Cyan

# Pascal-cased prefix for generated identifiers (Lab_warehouseitemsService etc.) —
# txc's codegen title-cases just the first character of the publisher prefix.
$prefixPascal = [char]::ToUpper($PublisherPrefix[0]) + $PublisherPrefix.Substring(1)
$appSrc = "src/Apps.WarehousePicking/src"
$uiTokens = @{ PREFIX = $PublisherPrefix; PASCAL = $prefixPascal }

# Router.tsx and pages/Layout.tsx below replace the starter's router.tsx and pages/_layout.tsx. Drop
# those first: on a case-sensitive file system router.tsx would stay next to Router.tsx (and win the
# "@/router" import); on a case-insensitive one Router.tsx would be written into it under the old name.
Remove-Item "$appSrc/router.tsx", "$appSrc/pages/_layout.tsx", "$appSrc/pages/_layout.styles.ts" -ErrorAction SilentlyContinue

foreach ($file in @(
    @{ Template = "ServicePayload.ts";        Target = "utils/ServicePayload.ts" },
    @{ Template = "RecordValues.ts";          Target = "utils/RecordValues.ts" },
    @{ Template = "OptionSets.ts";             Target = "utils/OptionSets.ts" },
    @{ Template = "Entities.ts";               Target = "utils/Entities.ts" },
    @{ Template = "PageHeader.tsx";            Target = "components/PageHeader.tsx" },
    @{ Template = "PageHeader.styles.ts";      Target = "styles/PageHeader.styles.ts" },
    @{ Template = "UseIsPhone.ts"; Target = "hooks/UseIsPhone.ts" },
    @{ Template = "RecordCards.tsx"; Target = "components/RecordCards.tsx" },
    @{ Template = "RecordCards.styles.ts"; Target = "styles/RecordCards.styles.ts" },
    @{ Template = "RecordGrid.tsx";            Target = "components/RecordGrid.tsx" },
    @{ Template = "RecordForm.tsx";            Target = "components/RecordForm.tsx" },
    @{ Template = "RecordFormDialog.tsx";      Target = "components/RecordFormDialog.tsx" },
    @{ Template = "RecordFormDialog.styles.ts"; Target = "styles/RecordFormDialog.styles.ts" },
    @{ Template = "RecordFormFields.tsx";      Target = "components/RecordFormFields.tsx" },
    @{ Template = "RecordDetailForm.tsx";      Target = "components/RecordDetailForm.tsx" },
    @{ Template = "RecordDetailForm.styles.ts"; Target = "styles/RecordDetailForm.styles.ts" },
    @{ Template = "main.tsx";                  Target = "main.tsx" },
    @{ Template = "RecordLookup.tsx";          Target = "components/RecordLookup.tsx" },
    @{ Template = "UsePickItems.ts"; Target = "hooks/UsePickItems.ts" },
    @{ Template = "StockTransactions.ts"; Target = "utils/StockTransactions.ts" },
    @{ Template = "MobilePage.tsx"; Target = "components/mobile/MobilePage.tsx" },
    @{ Template = "ItemPicker.tsx"; Target = "components/mobile/ItemPicker.tsx" },
    @{ Template = "QuantityStepper.tsx"; Target = "components/mobile/QuantityStepper.tsx" },
    @{ Template = "ItemSummary.tsx"; Target = "components/mobile/ItemSummary.tsx" },
    @{ Template = "ResultPanel.tsx"; Target = "components/mobile/ResultPanel.tsx" },
    @{ Template = "MobilePage.styles.ts"; Target = "styles/MobilePage.styles.ts" },
    @{ Template = "QuantityStepper.styles.ts"; Target = "styles/QuantityStepper.styles.ts" },
    @{ Template = "ItemPicker.styles.ts"; Target = "styles/ItemPicker.styles.ts" },
    @{ Template = "ItemSummary.styles.ts"; Target = "styles/ItemSummary.styles.ts" },
    @{ Template = "ResultPanel.styles.ts"; Target = "styles/ResultPanel.styles.ts" },
    @{ Template = "QuickActions.tsx"; Target = "pages/QuickActions.tsx" },
    @{ Template = "QuickActions.styles.ts"; Target = "styles/QuickActions.styles.ts" },
    @{ Template = "QuickTransaction.tsx"; Target = "pages/QuickTransaction.tsx" },
    @{ Template = "QuickTransaction.styles.ts"; Target = "styles/QuickTransaction.styles.ts" },
    @{ Template = "StockCount.tsx"; Target = "pages/StockCount.tsx" },
    @{ Template = "FindItem.tsx"; Target = "pages/FindItem.tsx" },
    @{ Template = "Barcode.ts"; Target = "utils/Barcode.ts" },
    @{ Template = "BarcodeLookup.ts"; Target = "utils/BarcodeLookup.ts" },
    @{ Template = "UseBarcodeCamera.ts"; Target = "hooks/UseBarcodeCamera.ts" },
    @{ Template = "UseCreateItem.ts"; Target = "hooks/UseCreateItem.ts" },
    @{ Template = "BarcodeScanPanel.tsx"; Target = "components/mobile/BarcodeScanPanel.tsx" },
    @{ Template = "BarcodeScanPanel.styles.ts"; Target = "styles/BarcodeScanPanel.styles.ts" },
    @{ Template = "NewItemDialog.tsx"; Target = "components/mobile/NewItemDialog.tsx" },
    @{ Template = "ReceiveItemChooser.tsx"; Target = "components/mobile/ReceiveItemChooser.tsx" },
    @{ Template = "ReceiveItemChooser.styles.ts"; Target = "styles/ReceiveItemChooser.styles.ts" },
    @{ Template = "Router.tsx";                Target = "Router.tsx" },
    @{ Template = "Layout.tsx";               Target = "pages/Layout.tsx" },
    @{ Template = "Layout.styles.ts";         Target = "styles/Layout.styles.ts" },
    @{ Template = "WarehouseItems.tsx";       Target = "pages/WarehouseItems.tsx" },
    @{ Template = "WarehouseItems.styles.ts"; Target = "styles/WarehouseItems.styles.ts" },
    @{ Template = "WarehouseItemDetail.tsx"; Target = "pages/WarehouseItemDetail.tsx" },
    @{ Template = "WarehouseItemDetail.styles.ts"; Target = "styles/WarehouseItemDetail.styles.ts" },
    @{ Template = "Transactions.tsx";          Target = "pages/Transactions.tsx" },
    @{ Template = "Transactions.styles.ts";    Target = "styles/Transactions.styles.ts" },
    @{ Template = "Locations.tsx";             Target = "pages/Locations.tsx" },
    @{ Template = "Locations.styles.ts";       Target = "styles/Locations.styles.ts" }
)) {
    Expand-LabTemplate -Path "05f-code-app/$($file.Template)" `
        -Destination "$appSrc/$($file.Target)" `
        -Tokens $uiTokens
    Write-Host "  ✓ $($file.Target)" -ForegroundColor Green
}

# Form.Field's requiredLevel takes a RequiredLevelEnum from @talxis/client-metadata, which base
# controls only pull in transitively: declare it so the import is a real dependency
# The Receive screen reads barcodes from the phone's camera with @zxing/browser.
# The starter also brings two packages nothing in this app uses (a state store and a table library).
Push-Location "src/Apps.WarehousePicking"
npm pkg set "dependencies.@talxis/client-metadata=^0.0.7" "dependencies.@zxing/browser=^0.2.1"
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "npm pkg set @talxis/client-metadata / @zxing/browser failed" }
npm pkg delete dependencies.zustand "dependencies.@tanstack/react-table"
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "npm pkg delete zustand/react-table failed" }
Pop-Location

# Drop the now-superseded counter-demo home page (and its styles) — the router no longer references it
Remove-Item "$appSrc/pages/home.tsx", "$appSrc/pages/home.styles.ts" -ErrorAction SilentlyContinue

# Point App.tsx at the lab's Router.tsx (the starter's router.tsx was dropped above)
(Get-Content "$appSrc/App.tsx" -Raw) -replace 'from "@/router"', 'from "@/Router"' | Set-Content "$appSrc/App.tsx" -NoNewline

# ...and the starter's theme toggle (never placed in the layout) with its hook, and its React logo
Remove-Item "$appSrc/components/mode-toggle.tsx", "$appSrc/hooks/use-theme.ts", "$appSrc/assets/react.svg" -ErrorAction SilentlyContinue
if (-not (Get-ChildItem "$appSrc/assets" -ErrorAction SilentlyContinue)) { Remove-Item "$appSrc/assets" -ErrorAction SilentlyContinue }

# Styles live apart from components and pages: move the starter's own page styles there too
New-Item -ItemType Directory -Force "$appSrc/styles" | Out-Null
Move-Item "$appSrc/pages/not-found.styles.ts" "$appSrc/styles/not-found.styles.ts" -Force -ErrorAction SilentlyContinue
(Get-Content "$appSrc/pages/not-found.tsx" -Raw) -replace 'from "\./not-found\.styles"', 'from "@/styles/not-found.styles"' | Set-Content "$appSrc/pages/not-found.tsx" -NoNewline

Set-LabValue 'codeAppScaffolded' $true

Write-Host "  ℹ Local preview: cd src/Apps.WarehousePicking && npm run dev" -ForegroundColor DarkGray
