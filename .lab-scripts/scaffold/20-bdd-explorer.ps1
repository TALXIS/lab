#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║             20: BDD Explorer — black-box agent definition + Discovered/                ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Scaffolds the black-box exploration agent (.github/agents/bdd-warehouse-explorer.agent.md)
# and Features/Discovered/ as the unvetted landing spot for what it finds, kept out of the
# compiled suite. The agent may not read the repository, so the two URLs it explores are
# baked into its definition here: the Dev environment (model-driven app) and the deployed
# Warehouse Picking code app.
#
# Expects: $PublisherPrefix from parent scope; src/Tests.UI from CP14 and devEnvUrl from CP04
# (the caller checks both).
#
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Host "`n── BDD Explorer agent ──" -ForegroundColor Cyan

# ──────────────────────────────────────────────────────────────────────────────────────────
#                              Resolve the URLs to explore
# ──────────────────────────────────────────────────────────────────────────────────────────
#
# The code app gets its URL only once CP10 has deployed it: Power Apps registers it as a
# canvasapp record named after its schema name (05f-code-app.ps1), and appopenuri is the
# player link. Before that, or in a dry run, the agent gets a placeholder that tells it to
# ask instead of searching the repo for one.
$notDeployed = "NOT DEPLOYED YET (re-run .lab-scripts/CP18-explore-blackbox-and-generate-tests.ps1 after CP10)"
$devEnvUrl  = "$(Get-LabValue 'devEnvUrl')".TrimEnd('/')
$codeAppUrl = $null
if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped — would look up the code app URL with 'txc env data query odata canvasapps'; re-run CP18 after CP10 to fill it in."
} else {
    try {
        $codeAppUrl = @(txc env data query odata canvasapps --select appopenuri `
            --filter "name eq '${PublisherPrefix}_warehousepicking'" `
            --profile (Get-LabValue 'devProfile') --format json 2>$null | ConvertFrom-Json -ErrorAction Stop)[0].appopenuri
    } catch { $codeAppUrl = $null }
    if (-not $codeAppUrl) { Write-Warn2 "Warehouse Picking isn't deployed to Dev yet — the explorer agent gets a placeholder URL; re-run CP18 after CP10." }
}
$urls = @{ devEnvUrl = $devEnvUrl; codeAppUrl = $codeAppUrl }

function Write-ExplorerAgent {
    # Full source: .lab-scripts/templates/20-bdd-explorer/bdd-warehouse-explorer.agent.md
    Expand-LabTemplate -Path "20-bdd-explorer/bdd-warehouse-explorer.agent.md" `
        -Destination ".github/agents/bdd-warehouse-explorer.agent.md" `
        -Tokens @{
            DEV_ENV_URL  = $urls.devEnvUrl
            MDA_APP_NAME = "${PublisherPrefix}_warehouseapp"
            CODE_APP_URL = if ($urls.codeAppUrl) { $urls.codeAppUrl } else { $notDeployed }
        }
    Set-LabValue 'testExplorerUrls' $urls
}

if (-not (Get-LabValue 'testExplorerScaffolded')) {

New-Item -ItemType Directory -Path ".github/agents" -Force | Out-Null
Write-ExplorerAgent
Write-Host "  ✓ Agent definition written: .github/agents/bdd-warehouse-explorer.agent.md" -ForegroundColor Green

# EXPLORATION-NOTES.md is where the agent writes its findings: only seed it when it isn't
# there, so a re-run never swaps a real exploration log for the empty template.
New-Item -ItemType Directory -Path "src/Tests.UI/Features/Discovered" -Force | Out-Null
$notes = "src/Tests.UI/Features/Discovered/EXPLORATION-NOTES.md"
if (-not (Test-Path $notes)) {
    # Full source: .lab-scripts/templates/20-bdd-explorer/EXPLORATION-NOTES.md
    Expand-LabTemplate -Path "20-bdd-explorer/EXPLORATION-NOTES.md" -Destination $notes
}
Write-Host "  ✓ Features/Discovered/ scaffolded" -ForegroundColor Green

# ──────────────────────────────────────────────────────────────────────────────────────────
#                       Keep Discovered/ out of the compiled suite
# ──────────────────────────────────────────────────────────────────────────────────────────
#
# Reqnroll's .props globs **\*.feature into ReqnrollFeatureFile, so anything the agent drops
# here becomes a test with no bindings and fails on its first undefined step - turning a green
# suite red the moment the agent is actually run. The Remove works from the project body
# because that glob lives in a .props, which is imported first. CP17 does the same for
# Planned/; each checks for its own folder's Remove only, so the two can run in either order
# and each adds its line once.
$csproj = "src/Tests.UI/Tests.UI.csproj"
$content = Get-Content -Raw -LiteralPath $csproj
if ($content -notmatch 'ReqnrollFeatureFile Remove="Features/Discovered/') {
    $exclusion = @"
  <!-- Features/Discovered/ is unvetted agent output: readable Gherkin, no bindings, not tests
       until a human promotes one into Features/ and binds it. None keeps them visible. -->
  <ItemGroup>
    <ReqnrollFeatureFile Remove="Features/Discovered/**/*.feature" />
    <None Include="Features/Discovered/**/*.feature" />
  </ItemGroup>

</Project>
"@
    $content = $content.Replace("</Project>", $exclusion)
    Set-Content -LiteralPath $csproj -Value $content -Encoding UTF8 -NoNewline
    Write-Host "  ✓ Tests.UI.csproj: Discovered/ excluded from the compiled suite" -ForegroundColor Green
}

# Set last: a re-run after a partial failure retries the whole block.
Set-LabValue 'testExplorerScaffolded' $true

} else {
    Write-Host "  ✓ BDD Explorer agent + Features/Discovered/ (exists)" -ForegroundColor Green

    # The block above is skipped, but the URLs may have changed since it ran - typically CP18
    # ran before CP10 and baked in the placeholder. The agent file is generated, not something
    # you edit (its findings go to Discovered/), so re-render just that file when the URLs differ
    # from the ones it was rendered with. With nothing recorded it was built by hand (via
    # save-checkpoint.ps1): leave it alone. Nothing else in the block is touched.
    $baked = Get-LabValue 'testExplorerUrls'
    if ($baked -and ($baked.devEnvUrl -ne $urls.devEnvUrl -or $baked.codeAppUrl -ne $urls.codeAppUrl)) {
        Write-ExplorerAgent
        Write-Host "  ✓ Agent definition refreshed with the current app URLs" -ForegroundColor Green
    }
}
