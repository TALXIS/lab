#!/usr/bin/env pwsh
#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                       CP10: Deploy & Sync with Dev environment                         ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# After implementing the app in source (CP06–09), we deploy the full package to Dev so we
# can work with a live running app. This is the "source → environment" push.
#
# Then we'll make manual changes in the Dev environment (e.g. tweaking a security role)
# and pull them back to source with `txc env solution pull`. This demonstrates the
# bidirectional inner loop: source ↔ environment.
#
# Managed vs unmanaged, the core solution concept: unmanaged solutions are open for editing
# - the working state of a dev environment. Managed solutions are sealed, layered artifacts
# for every downstream environment: they merge as diff layers, can be cleanly uninstalled,
# and managed properties can restrict edits. Rule of thumb: production should never contain
# unmanaged components. That is why we pull the unmanaged layer from Dev - the place where
# humans edit - while pipelines only ever ship built packages forward.
#
# In auto mode: deploy + pull (no manual changes expected).
#
# Run:  .lab-scripts/CP10-deploy-and-sync.ps1
# ──────────────────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/Lab.Common.ps1"

Write-Step "CP10 — Deploy to Dev & sync changes back"

$devUrl = Get-LabValue 'devEnvUrl'
$devProfile = Get-LabValue 'devProfile'
if (-not $devUrl -or -not $devProfile) { Write-Err "Dev environment not found in lab state. Run CP04 first."; exit 1 }

# ──────────────────────────────────────────────────────────────────────────────────────────
# Step 0: Import the TALXIS Grid control package FIRST. The Warehouse Location form
# references talxis_TALXIS.PCF.Grid (attached in CP09) — importing the app package into an
# environment that doesn't have the control yet fails on a missing-dependency check.
# The package comes from nuget.org by name, latest version.
# ──────────────────────────────────────────────────────────────────────────────────────────

$gridPackage = 'TALXIS.Controls.Grid.Package'

if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped — would run 'txc env pkg import $gridPackage' to"
    Write-Info "  import the TALXIS Grid control package into Dev ($devUrl)."
} else {
    Write-Info "Importing TALXIS Grid control package ($gridPackage)..."
    txc env pkg import $gridPackage
    if ($LASTEXITCODE -ne 0) { Write-Err "Grid control package import failed"; exit 1 }
}


# ──────────────────────────────────────────────────────────────────────────────────────────
# Step 1: Build the full Package Deployer package and deploy to Dev.
# This mirrors what the CD pipeline does for Test, but locally for the Dev environment - with
# one difference: Dev gets the Debug build, whose solutions are unmanaged, so they can be
# edited in Dev and pulled back to source in step 3. The pipeline builds Release (managed)
# for Test.
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Info "Building the deployment package..."
$pkgProj = Join-Path $LabRoot "src/Packages.Main/Packages.Main.csproj"

# No -o here on purpose: passing an explicit output dir makes dotnet set a global
# PublishDir property that leaks into every nested project build in the graph — including
# Plugins.Warehouse's own auto-publish-on-build step (Microsoft.PowerApps.MSBuild.Plugin
# defaults PublishOnBuild=true), redirecting its output away from its own bin/<Config>/
# <TFM>/publish/ folder and breaking EnsurePluginAssemblyDataXml downstream.
# See: https://github.com/TALXIS/tools-devkit-build/issues/109
dotnet publish $pkgProj -c Debug --nologo --verbosity quiet
if ($LASTEXITCODE -ne 0) { Write-Err "dotnet publish failed"; exit 1 }

# Locate the pdpkg.zip (Package Deployer package archive) at its natural output location —
# no need to stage/copy it anywhere, bin/ is gitignored either way.
$pdpkg = Get-ChildItem (Join-Path $LabRoot "src/Packages.Main/bin/Debug") -Filter "*.pdpkg.zip" -Recurse | Select-Object -First 1
if (-not $pdpkg) { Write-Err "Packages.Main.pdpkg.zip not found after publish"; exit 1 }
Write-Ok "Package built: $($pdpkg.Name)"

# The role step 2 asks you to edit, as CP08 created it. Checked here rather than in step 2 so the
# local dry run also catches a role renamed in CP08 without this checkpoint being updated.
$roleFile = Join-Path $LabRoot "src/Solutions.Security/Roles/Warehouse worker.xml"
if (-not (Test-Path $roleFile)) {
    Write-Err "CP10 asks you to edit the Warehouse worker role, but $roleFile does not exist. Run CP08 first, or update this checkpoint if CP08 renamed the role."
    exit 1
}
$roleName = ([xml](Get-Content $roleFile -Raw)).Role.name

if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped — would run 'txc env pkg import' to deploy the built"
    Write-Info "  package to Dev ($devUrl), then 'txc env solution pull' to sync manual"
    Write-Info "  environment changes back to src/Solutions.Security."
} else {

# Lab-state only remembers the profile NAME — confirm it still exists in this machine's own
# txc session before using it (a fresh machine/Codespace won't have it even if lab-state does).
# Wrapped in try/catch: a missing txc binary or unexpected output must fall through to the
# clear error below, not crash with a raw PowerShell exception.
$devProfileFound = $false
try {
    $devProfileFound = [bool](txc config profile list --format json | ConvertFrom-Json -ErrorAction Stop | Where-Object { $_.id -eq $devProfile })
} catch { $devProfileFound = $false }
if (-not $devProfileFound) {
    Write-Err "txc profile '$devProfile' not found on this machine — run CP04 again."
    exit 1
}

Write-Info "Deploying package to Dev environment ($devUrl)..."
txc env pkg import $pdpkg.FullName --profile $devProfile
if ($LASTEXITCODE -ne 0) { Write-Err "Package import to Dev failed"; exit 1 }
Write-Ok "Package deployed to Dev environment"

# ──────────────────────────────────────────────────────────────────────────────────────────
# Step 2: Pause for manual environment changes (interactive mode).
# In a real workflow you'd open the environment, tweak security roles, forms, etc.
# We'll then pull those changes back to source.
# ──────────────────────────────────────────────────────────────────────────────────────────

$autoMode = $env:LAB_AUTO -eq '1'
if (-not $autoMode) {
    # txc builds the maker-portal link: the role editor, found from the role's source file (its
    # GUID is in there) and opened inside the security solution. Without a link, say where to click.
    $roleUrl = txc env component url get --file $roleFile --param solution=SolutionsSecurity --profile $devProfile --format text 2>$null |
        Where-Object { $_ -match '^https://' } | Select-Object -First 1
    Write-Ok "Your app is live in Dev: $devUrl"
    Write-Info "  Open it at https://make.powerapps.com: pick your Dev environment, then Apps → Warehouse Management (manager app) or Warehouse Picking (code app)."
    Write-Info "Change a security role in Dev, then this checkpoint pulls the change back to source."
    if ($roleUrl) {
        Write-Info "  Open the $roleName role: $roleUrl"
    } else {
        Write-Info "  Open https://make.powerapps.com, pick your Dev environment, then Solutions → Solutions.Security → Security roles → $roleName."
    }
    Write-Info "  Let workers delete their own transactions: on the Warehouse Transaction table set Delete to User, then Save."
    Read-Host "`n  Make the change in your browser, then press Enter to pull it back to source"
}

# ──────────────────────────────────────────────────────────────────────────────────────────
# Step 3: Pull environment changes back to source.
# txc env solution pull downloads the unmanaged solution from Dev into the source tree.
# This is how manual customizations in the maker portal get committed as source.
# ──────────────────────────────────────────────────────────────────────────────────────────

Write-Info "Pulling Solutions.Security from Dev back to source..."
txc env solution pull (Join-Path $LabRoot "src/Solutions.Security") --profile $devProfile
if ($LASTEXITCODE -ne 0) { Write-Err "Pulling Solutions.Security from Dev failed"; exit 1 }
Write-Ok "Solutions.Security pulled from Dev"

# Show what changed (if anything).
$changes = git -C $LabRoot status --short -- src/
if ($changes) {
    Write-Info "Changes pulled from environment:"
    Write-Host $changes
} else {
    Write-Info "No environment changes detected (expected in auto mode)."
}

}

Save-Checkpoint -Id "cp10" -Message "Deploy package to Dev and sync environment changes" -Body @'
Deploy the full solution package to the Dev environment and demonstrate the bidirectional inner loop: push source to environment, make manual changes, then pull them back with txc env solution pull.

## Changes
- deploy the Debug build of the package (all 4 solutions, unmanaged) to the Dev Dataverse environment
- pull any manual security role changes back to src/Solutions.Security
## Testing
- warehouse app is accessible in the Dev environment
- txc env solution pull completes without error
'@
Write-Host "`nNext: .lab-scripts/CP11-integrate-external-data.ps1" -ForegroundColor Cyan
