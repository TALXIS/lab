#!/usr/bin/env pwsh
#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                       CP09: Implement UI                                               ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# The UI solution: a model-driven app, sitemap navigation, forms, views and subgrids, plus
# form scripts, ribbon buttons and the TALXIS Grid PCF overlaid on the items subgrid
# (attached manifest-driven via `txc workspace control attach`, customized from Scripts.UI
# through the control's Client API). On top of that a Power Apps code app — a fully custom
# Vite + React SPA built with TALXIS base controls for warehouse picking — referenced
# straight into this same solution, so both UI styles ship from the same repo and the same
# package. This completes the inner loop — a working app from source. The Grid control
# package itself is imported into the environment by CP10, before the app package.
#
# Solutions.UI does not own the tables: it references them (Behavior=Existing) from
# Solutions.DataModel and only layers forms, views and commands on top. A reference carries
# just enough metadata to attach UI components without duplicating the schema, which keeps
# DataModel the single owner of every table definition.
#
# Run:  .lab-scripts/CP09-implement-ui.ps1
# ──────────────────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/Lab.Common.ps1"
$PublisherName   = Get-LabValue 'publisherName'   $LabDefaultPublisherName
$PublisherPrefix = Get-LabValue 'publisherPrefix' $LabDefaultPublisherPrefix

Write-Step "CP09 — UI"
Push-Location $LabRoot
# A failed txc call must stop the scaffolds: each one sets its *Scaffolded flag on its last line,
# and a re-run skips it once that is set.
$prevNativeErrorPref = $PSNativeCommandUseErrorActionPreference
$PSNativeCommandUseErrorActionPreference = $true
try {
    . "$PSScriptRoot/scaffold/05a-ui-solution.ps1"
    . "$PSScriptRoot/scaffold/05b-sitemap.ps1"
    . "$PSScriptRoot/scaffold/05c-forms.ps1"
    . "$PSScriptRoot/scaffold/05d-views-subgrids.ps1"
    . "$PSScriptRoot/scaffold/05f-code-app.ps1"
    . "$PSScriptRoot/scaffold/09-form-scripts.ps1"
    . "$PSScriptRoot/scaffold/10-ribbon.ps1"
    . "$PSScriptRoot/scaffold/05e-grid-control.ps1"

    # Building the code app runs npm install + vite build, so this takes a couple of minutes
    dotnet build --nologo --verbosity quiet
    if ($LASTEXITCODE -ne 0) { Write-Err "dotnet build failed"; exit 1 }

    # The build workflow now needs Node to build the code app — refresh the copy CP05 installed
    if (Test-Path ".github/workflows") {
        Copy-Item "$PSScriptRoot/workflows/build.yml" ".github/workflows/build.yml" -Force
        Write-Ok "build.yml refreshed (Node setup for the code app)"
    }
} finally { Pop-Location; $PSNativeCommandUseErrorActionPreference = $prevNativeErrorPref }

Save-Checkpoint -Id "cp09" -Message "Add warehouse model-driven app, code app, views, forms, ribbon, and TALXIS Grid" -Body @'
Build the model-driven warehouse experience so users can navigate inventory data from a complete Dataverse app. This adds the app shell along with the core forms, views, scripts, and command surface, swaps the stock items subgrid for the TALXIS Grid PCF customized from our own script library through the control's Client API, and adds a code app for warehouse-floor work — two UI styles for two personas, shipped from the same solution.

## Changes
- add src/Solutions.UI with the warehouse model-driven application
- configure sitemap navigation, entity forms, views, and subgrids
- add form scripts and ribbon commands for warehouse workflows
- attach talxis_TALXIS.PCF.Grid to the Warehouse Items subgrid via txc workspace control attach (group by category, sum of quantity, low-stock highlighting from Scripts.UI)
- add src/Apps.WarehousePicking, a Vite + React + TypeScript code app referenced directly into Solutions.UI
- build the code app's screens with TALXIS base controls on the pp-app-code starter's Fluent UI shell, so it looks and behaves like Dataverse: Grids with a dataset ribbon (New / Refresh), and base-controls Forms for the create dialogs and the item page (ribbon with Back and Save, a header with the record state, General and Transactions tabs), all validated by their columns
- register the three warehouse tables as code app data sources (typed models + services)
- implement the code app UI: items list, item detail form with its transactions, a transactions list and a locations list (with per-location item counts), all querying Dataverse through the generated services; locations also resolve the item's location lookup
- make the code app work on a phone: a Home screen of big quick-action tiles (Pick stock, Receive stock, Take inventory as a blind counter, Find item) that end in one stock transaction, a bottom navigation bar, and form-style record cards in place of grids at phone width
- let the Receive screen scan a barcode with the phone camera (or type it): a match jumps to the item, no match offers a New item form prefilled with the barcode, so new goods are created and received in one flow
- add Node setup to the build workflow so the code app builds in CI
## Testing
- dotnet build --nologo --verbosity quiet passes with the UI, TALXIS Grid, and code app included
'@
Write-Host "`nNext: .lab-scripts/CP10-deploy-and-sync.ps1" -ForegroundColor Cyan
