#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                      10: Ribbon Buttons — Custom Ribbon Commands                       ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Adds custom ribbon buttons to entity forms and home pages.
# Expects: $PublisherPrefix from parent scope.
# Expects: Scripts.UI already built (09-form-scripts.ps1).
#
# The RibbonActions class the buttons call is part of the script library's rollup entry,
# templates/09-form-scripts/index.ts (exported as WarehouseScripts.RibbonActions), so there
# is no TypeScript to add or rebuild here.
#
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n── Ribbon Buttons ──" -ForegroundColor Cyan

# Skipped once it has fully run, so re-running the checkpoint doesn't create everything again.
if (Get-LabValue 'ribbonScaffolded') {
    Write-Host "  ✓ Ribbon buttons (exist)" -ForegroundColor Green
    return
}

# ──────────────────────────────────────────────────────────────────────────────────────────
#                      Ribbon Button: Check Stock Levels (warehouseitem form)
# ──────────────────────────────────────────────────────────────────────────────────────────

txc workspace component create pp-ribbon-button `
    --output "src/Solutions.UI" `
    --param "Location=Form" `
    --param "EntityLogicalName=${PublisherPrefix}_warehouseitem" `
    --param "ButtonLabel=Check Stock Levels" `
    --param "PublisherPrefix=$PublisherPrefix" `
    --param "LibraryLogicalName=${PublisherPrefix}_main.js" `
    --param "FunctionName=WarehouseScripts.RibbonActions.checkStockLevels" `
    --param "Sequence=31" `
    --param "TemplateAlias=o1"

Write-Host "  ✓ Ribbon button: Check Stock Levels (warehouseitem form)" -ForegroundColor Green

# Add PrimaryControl parameter so the function receives the form context
txc workspace component create pp-ribbon-command-parameter `
    --output "src/Solutions.UI" `
    --param "EntityLogicalName=${PublisherPrefix}_warehouseitem" `
    --param "PublisherPrefix=$PublisherPrefix" `
    --param "ParameterType=CrmPrimaryControl" `
    --param "FunctionName=WarehouseScripts.RibbonActions.checkStockLevels" `
    --param "ButtonLogicalName=checkstocklevels"

Write-Host "  ✓ Ribbon command parameter: PrimaryControl" -ForegroundColor Green

# Set last: a re-run after a partial failure retries the whole script.
Set-LabValue 'ribbonScaffolded' $true
