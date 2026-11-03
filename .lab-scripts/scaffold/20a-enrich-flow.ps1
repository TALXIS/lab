#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                     20a: Enrich Products flow (clean)                                  ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# A clean cloud flow: the pp-flow template's manual trigger and no actions. Nothing here
# talks to an environment - the next three scaffolds grow it one source at a time.
#
# Expects: $PublisherPrefix, $EnrichFlowName from parent scope.
# Expects: Solutions.Logic already scaffolded (08-logic-solution.ps1, via CP07).
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n── Enrich Products flow: clean ──" -ForegroundColor Cyan

if (-not (Get-LabValue 'enrichFlowScaffolded')) {
    txc workspace component create pp-flow `
        --output "src/Solutions.Logic" `
        --param "PublisherPrefix=$PublisherPrefix" `
        --param "LogicalName=$EnrichFlowName" `
        --param "Trigger=manual"
    if ($LASTEXITCODE -ne 0) { throw "Flow scaffold failed - re-run this step." }

    Write-Host "  ✓ ${PublisherPrefix}_$EnrichFlowName (manual trigger, no actions)" -ForegroundColor Green
    Set-LabValue 'enrichFlowScaffolded' $true
} else {
    Write-Host "  ✓ ${PublisherPrefix}_$EnrichFlowName (exists)" -ForegroundColor Green
}
