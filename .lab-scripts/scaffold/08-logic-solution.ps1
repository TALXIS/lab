#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║          08: Logic Solution — Plugin Registration via Build                            ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Creates Solutions.Logic and references Plugins.Warehouse from it. Nothing about the plugin
# is scaffolded: dotnet build of the solution writes the plugin assembly (PluginAssemblies/)
# and the steps declared by [PluginStep] attributes (SdkMessageProcessingSteps/) into it.
# Expects: $PublisherName, $PublisherPrefix from parent scope.
# Expects: Plugins.Warehouse already built (07-plugins.ps1).
#
# ──────────────────────────────────────────────────────────────────────────────────────────
#                                  Solutions.Logic
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n── Solutions.Logic ──" -ForegroundColor Cyan

if (-not (Get-LabValue 'logicSolutionScaffolded')) {

txc workspace component create pp-solution `
    --output "src/Solutions.Logic" `
    --param "PublisherName=$PublisherName" `
    --param "PublisherPrefix=$PublisherPrefix"

Write-Host "  ✓ Solutions.Logic" -ForegroundColor Green

# Add Solutions.Logic to the Package Deployer project
cd src/Packages.Main
dotnet add "./Packages.Main.csproj" reference "../Solutions.Logic/Solutions.Logic.csproj"
cd ../..

Write-Host "  ✓ ProjectReference: Logic → Packages.Main" -ForegroundColor Green

# Link plugin project to the logic solution
cd src/Solutions.Logic
dotnet add reference ../Plugins.Warehouse/Plugins.Warehouse.csproj
cd ../..

Write-Host "  ✓ ProjectReference: Plugins.Warehouse → Solutions.Logic" -ForegroundColor Green


# ──────────────────────────────────────────────────────────────────────────────────────────
#                              Build Logic Solution
# ──────────────────────────────────────────────────────────────────────────────────────────

# Generates PluginAssemblies/ and SdkMessageProcessingSteps/ from the referenced plugin project.
Write-Host "  → Building Solutions.Logic..." -ForegroundColor White
cd src/Solutions.Logic
dotnet build --nologo --verbosity quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Logic build succeeded" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Logic build had issues (exit code: $LASTEXITCODE)" -ForegroundColor Yellow
}
cd ../..

# Marks the whole block done — checked instead of Test-Path on the solution csproj so a
# re-run after a partial failure (e.g. solution created but the reference or build
# didn't finish) retries everything rather than silently skipping the missing work.
Set-LabValue 'logicSolutionScaffolded' $true

} else {
    Write-Host "  ✓ Solutions.Logic (exists)" -ForegroundColor Green
}