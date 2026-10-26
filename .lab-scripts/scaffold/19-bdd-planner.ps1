#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║              19: BDD Planner — agent definition + TestPlans convention                 ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Scaffolds the planning agent (.github/agents/bdd-warehouse-planner.agent.md), the
# TestPlans/ folder for its missing-bindings write-ups and Features/Planned/ as the landing
# spot for the scenarios it proposes, kept out of the compiled suite until a human promotes them.
#
# Expects: src/Tests.UI from CP14 (the caller checks for Support/Bindings).
#
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n── BDD Planner agent ──" -ForegroundColor Cyan

if (-not (Get-LabValue 'testPlannerScaffolded')) {

New-Item -ItemType Directory -Path ".github/agents" -Force | Out-Null
# Full source: .lab-scripts/templates/19-bdd-planner/bdd-warehouse-planner.agent.md
Expand-LabTemplate -Path "19-bdd-planner/bdd-warehouse-planner.agent.md" `
    -Destination ".github/agents/bdd-warehouse-planner.agent.md"
Write-Host "  ✓ Agent definition written: .github/agents/bdd-warehouse-planner.agent.md" -ForegroundColor Green

New-Item -ItemType Directory -Path "TestPlans" -Force | Out-Null
New-Item -ItemType Directory -Path "src/Tests.UI/Features/Planned" -Force | Out-Null
New-Item -ItemType File -Path "src/Tests.UI/Features/Planned/.gitkeep" -Force | Out-Null
# Full source: .lab-scripts/templates/19-bdd-planner/TestPlans-README.md
Expand-LabTemplate -Path "19-bdd-planner/TestPlans-README.md" `
    -Destination "TestPlans/README.md"
Write-Host "  ✓ TestPlans/ scaffolded" -ForegroundColor Green

# ──────────────────────────────────────────────────────────────────────────────────────────
#                        Keep Planned/ out of the compiled suite
# ──────────────────────────────────────────────────────────────────────────────────────────
#
# Reqnroll's .props globs **\*.feature into ReqnrollFeatureFile, so a planned scenario with a
# '# needs binding' step would compile into a test whose step has no binding - and reqnroll.json
# sets missingOrPendingStepsOutcome to Error, so the suite goes red the first time the planner
# is run. The Remove works from the project body because that glob lives in a .props, which is
# imported first. CP18 does the same for Discovered/; each checks for its own folder's Remove
# only, so the two can run in either order and each adds its line once.
$csproj = "src/Tests.UI/Tests.UI.csproj"
$content = Get-Content -Raw -LiteralPath $csproj
if ($content -notmatch 'ReqnrollFeatureFile Remove="Features/Planned/') {
    $exclusion = @"
  <!-- Features/Planned/ is agent-planned Gherkin awaiting review and bindings, not tests until
       it is moved into Features/. None keeps the files visible in the IDE. -->
  <ItemGroup>
    <ReqnrollFeatureFile Remove="Features/Planned/**/*.feature" />
    <None Include="Features/Planned/**/*.feature" />
  </ItemGroup>

</Project>
"@
    $content = $content.Replace("</Project>", $exclusion)
    Set-Content -LiteralPath $csproj -Value $content -Encoding UTF8 -NoNewline
    Write-Host "  ✓ Tests.UI.csproj: Planned/ excluded from the compiled suite" -ForegroundColor Green
}

# Set last: a re-run after a partial failure retries the whole block. The agent file and the
# TestPlans/ README are yours to edit afterwards, so a re-run leaves them alone.
Set-LabValue 'testPlannerScaffolded' $true

} else {
    Write-Host "  ✓ BDD Planner agent + TestPlans/ (exists)" -ForegroundColor Green
}
