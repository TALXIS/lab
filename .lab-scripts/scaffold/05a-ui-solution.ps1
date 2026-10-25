#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║           05a: UI Solution — Project, Entity Refs, App, App Components                 ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Creates Solutions.UI with existing entity references, a model-driven app,
# and entity app components.
# Expects: $PublisherName, $PublisherPrefix from parent scope.
#
# ──────────────────────────────────────────────────────────────────────────────────────────
#                                    Solutions.UI
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n── Solutions.UI ──" -ForegroundColor Cyan

if (-not (Get-LabValue 'uiSolutionScaffolded')) {
    txc workspace component create pp-solution `
        --output "src/Solutions.UI" `
        --param "PublisherName=$PublisherName" `
        --param "PublisherPrefix=$PublisherPrefix"

    Write-Host "  ✓ Solutions.UI" -ForegroundColor Green

    # Add Solutions.UI to the Package Deployer project as a .NET ProjectReference
    cd src/Packages.Main
    dotnet add "./Packages.Main.csproj" reference "../Solutions.UI/Solutions.UI.csproj"
    cd ../..

    Write-Host "  ✓ ProjectReference: UI → Packages.Main" -ForegroundColor Green

    # ──────────────────────────────────────────────────────────────────────────────────────
    #                              Existing Entity References
    # ──────────────────────────────────────────────────────────────────────────────────────

    Write-Host "`n── Entity References (UI) ──" -ForegroundColor Cyan

    # Behavior=Existing creates a reference, not a table: the schema stays owned by
    # Solutions.DataModel; this solution only layers UI (forms, views, ribbon) on top of it.

    txc workspace component create pp-entity `
        --output "src/Solutions.UI" `
        --param "Behavior=Existing" `
        --param "PublisherPrefix=$PublisherPrefix" `
        --param "LogicalName=warehouselocation" `
        --param "DisplayName=Warehouse Location"

    Write-Host "  ✓ Entity ref: Warehouse Location" -ForegroundColor Green

    txc workspace component create pp-entity `
        --output "src/Solutions.UI" `
        --param "Behavior=Existing" `
        --param "PublisherPrefix=$PublisherPrefix" `
        --param "LogicalName=warehouseitem" `
        --param "DisplayName=Warehouse Item"

    Write-Host "  ✓ Entity ref: Warehouse Item" -ForegroundColor Green

    txc workspace component create pp-entity `
        --output "src/Solutions.UI" `
        --param "Behavior=Existing" `
        --param "PublisherPrefix=$PublisherPrefix" `
        --param "LogicalName=warehousetransaction" `
        --param "DisplayName=Warehouse Transaction"

    Write-Host "  ✓ Entity ref: Warehouse Transaction" -ForegroundColor Green

    # ──────────────────────────────────────────────────────────────────────────────────────
    #                                  Model-Driven App
    # ──────────────────────────────────────────────────────────────────────────────────────

    Write-Host "`n── Model-Driven App ──" -ForegroundColor Cyan

    txc workspace component create pp-app-model `
        --output "src/Solutions.UI" `
        --param "PublisherPrefix=$PublisherPrefix" `
        --param "LogicalName=warehouseapp"

    # The template names the app (and its sitemap) after its logical name and has no
    # display-name parameter, so set the name people see in the app list here. The unique
    # name stays ${PublisherPrefix}_warehouseapp — that's what the sitemap, forms and tests use.
    # A text replace, not an [xml] round-trip, so the rest of the file (BOM, CRLF, the empty
    # <OptimizedFor></OptimizedFor>) stays exactly as the template wrote it.
    foreach ($appFile in "src/Solutions.UI/AppModules/${PublisherPrefix}_warehouseapp/AppModule.xml",
                        "src/Solutions.UI/AppModuleSiteMaps/${PublisherPrefix}_warehouseapp/AppModuleSiteMap.xml") {
        $appFilePath = (Resolve-Path $appFile).Path
        $text = [System.IO.File]::ReadAllText($appFilePath).Replace('description="warehouseapp"', 'description="Warehouse Management"')
        [System.IO.File]::WriteAllText($appFilePath, $text, [System.Text.UTF8Encoding]::new($true))
    }

    Write-Host "  ✓ App: warehouseapp (Warehouse Management)" -ForegroundColor Green

    # ──────────────────────────────────────────────────────────────────────────────────────
    #                                  App Components
    # ──────────────────────────────────────────────────────────────────────────────────────

    Write-Host "`n── App Components ──" -ForegroundColor Cyan

    txc workspace component create pp-app-model-component `
        --output "src/Solutions.UI" `
        --param "EntityLogicalName=${PublisherPrefix}_warehouselocation" `
        --param "AppName=${PublisherPrefix}_warehouseapp"

    Write-Host "  ✓ App component: warehouselocation" -ForegroundColor Green

    txc workspace component create pp-app-model-component `
        --output "src/Solutions.UI" `
        --param "EntityLogicalName=${PublisherPrefix}_warehouseitem" `
        --param "AppName=${PublisherPrefix}_warehouseapp"

    Write-Host "  ✓ App component: warehouseitem" -ForegroundColor Green

    txc workspace component create pp-app-model-component `
        --output "src/Solutions.UI" `
        --param "EntityLogicalName=${PublisherPrefix}_warehousetransaction" `
        --param "AppName=${PublisherPrefix}_warehouseapp"

    Write-Host "  ✓ App component: warehousetransaction" -ForegroundColor Green

    # Marks the whole block done — checked instead of Test-Path on the solution csproj so a
    # re-run after a partial failure (e.g. solution created but the app/components didn't
    # finish) retries everything rather than silently skipping the missing work.
    Set-LabValue 'uiSolutionScaffolded' $true
} else {
    Write-Host "  ✓ Solutions.UI (exists)" -ForegroundColor Green
}
