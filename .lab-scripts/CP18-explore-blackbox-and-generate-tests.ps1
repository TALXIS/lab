#!/usr/bin/env pwsh
#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                       CP18: Black-box exploration agent                                ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# The last step in the chain, and deliberately the opposite of CP17: that planner reads the
# bindings catalog first and reuses what already exists. This agent is FORBIDDEN from
# reading this repository's source at all — no .feature files, no StepDefinitions, no
# Support/Bindings, nothing. It only ever sees the running apps, the same way a real user
# or a tester with zero implementation knowledge would.
#
# The point isn't coverage efficiency, it's an honest second opinion: a suite planned by an
# agent that read the bindings catalog will only ever find what that catalog already
# anticipates. An agent that can't read any of that has no such ceiling — it can only find
# what the actual running UI lets it find, which is exactly the kind of gap a
# spec-first/bindings-first workflow is structurally blind to.
#
# Everything this agent produces lands in Features/Discovered/, kept separate from the
# reviewed suite. A human reviews it — promote what's real, discard what's noise — before
# any of it is bound and added to CI. This checkpoint scaffolds that agent and the
# Discovered/ convention; it does not invoke the agent itself, same as CP17.
#
# Since the agent can't read the repo, the app URLs are written into its definition. The
# code app's URL exists only after CP10 deploys it: run this before CP10 and the agent gets
# a placeholder - re-run it after CP10 to fill the URL in.
#
# Run:  .lab-scripts/CP18-explore-blackbox-and-generate-tests.ps1
# ──────────────────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/Lab.Common.ps1"
$PublisherPrefix = Get-LabValue 'publisherPrefix' $LabDefaultPublisherPrefix

Write-Step "CP18 — Black-box exploration agent"
Push-Location $LabRoot
try {
    if (-not (Test-Path "src/Tests.UI/Tests.UI.csproj")) {
        Write-Err "src/Tests.UI/Tests.UI.csproj not found — run CP14 first (the agent's findings land in the UI test project)."
        exit 1
    }
    if (-not (Get-LabValue 'devEnvUrl')) { Write-Err "Dev environment not found in lab state. Run CP04 first."; exit 1 }

    . "$PSScriptRoot/scaffold/20-bdd-explorer.ps1"
    dotnet build src/Tests.UI/Tests.UI.csproj --nologo --verbosity quiet
    if ($LASTEXITCODE -ne 0) { Write-Err "dotnet build failed"; exit 1 }
} finally { Pop-Location }

Save-Checkpoint -Id "cp18" -Message "Add black-box exploration agent forbidden from reading source" -Body @'
Add the last step of the BDD-agent chain: an agent that only ever sees the running apps, never the source, so its scenarios aren't bounded by what the bindings catalog or the human authors already anticipated.

## Changes
- add .github/agents/bdd-warehouse-explorer.agent.md — hard constraint against reading any repo file, browser-only exploration of the model-driven app and the picking code app (both URLs written into the definition), told to actively try to break things (boundaries, malformed input, double-submit, abandoned flows)
- add src/Tests.UI/Features/Discovered/ with EXPLORATION-NOTES.md as the unvetted landing spot for what it finds, excluded from the compiled suite in Tests.UI.csproj, pending human review before anything is bound or merged
## Testing
- dotnet build src/Tests.UI/Tests.UI.csproj passes; validate the agent by running it against the dev environment and confirming EXPLORATION-NOTES.md and any Discovered/*.feature files only reference what's observable in the running UI
'@
Write-Host "`n✓ Lab complete — you built the app, tested it, and closed the loop with agents that plan and explore it." -ForegroundColor Green
