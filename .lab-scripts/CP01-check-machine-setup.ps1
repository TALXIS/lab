#!/usr/bin/env pwsh
#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                          CP01: Check machine setup                                     ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Before we develop a Power Platform app with proper ALM, we confirm that every tool the
# lab depends on is available. In Codespaces (agentbox image) they all are — this is your
# sanity check. We also seed a random identifier so your environment/app names won't clash
# with other attendees in the shared training tenant.
#
# We then sign in to all four services at once so you are not interrupted later:
#   1. GitHub CLI          — branch rules, PRs, secrets, Actions
#   2. TALXIS CLI (txc)    — Power Platform environments and deploy
#   3. Azure CLI (az)      — Entra app registrations and OIDC federation
#   4. Power Apps CLI (pa) — code app connections
#
# Auth hygiene: stale credentials are how deployments end up in the wrong tenant or the
# wrong environment. That is why we use your own GitHub login instead of the injected token,
# and keep Power Platform and Azure on the same account and tenant (lab-signin.ps1).
#
# Run:  .lab-scripts/CP01-check-machine-setup.ps1
# ──────────────────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/Lab.Common.ps1"

Write-Step "CP01 — Machine setup + sign-in"

# ── 1. Tool check ────────────────────────────────────────────────────────────────────────
# A Codespace brings its tools up to date on every start (agentbox prerequisite update, about
# 90 s). While it swaps them, pac is missing for over a minute and others can be half-installed,
# so first wait for that update to finish. Its lock file is never deleted: wait on the lock
# with flock, not for the file to disappear. No lock file means no update to wait for.
$updateLock = Join-Path $HOME ".agentbox/update.lock"
if ((Test-Path $updateLock) -and (Get-Command flock -ErrorAction SilentlyContinue)) {
    Write-Info "Waiting for the Codespace's tool update to finish (up to 3 minutes)..."
    flock -w 180 $updateLock true
    if ($LASTEXITCODE -ne 0) { Write-Warn2 "The tool update is still running after 3 minutes - checking the tools anyway." }
}

# Each tool is actually run, not just looked up on PATH: a tool mid-update can be on PATH and
# still fail. MinVersion is optional — set it when a tool's version, not just its presence,
# matters for the lab's npm-based builds (Scripts.UI, code apps, PCF).
$tools = [ordered]@{
    "dotnet" = @{ Cmd = "dotnet --version" }     # .NET SDK — builds solutions, plugins, packages
    "git"    = @{ Cmd = "git --version" }        # version control
    "gh"     = @{ Cmd = "gh --version" }         # GitHub CLI — repo, PRs, secrets, workflows
    "pac"    = @{ Cmd = "pac help" }             # Power Platform CLI
    "txc"    = @{ Cmd = "txc --version" }        # TALXIS CLI — scaffolding, env, deploy
    "az"     = @{ Cmd = "az version" }           # Azure CLI — app registration + OIDC
    "pa"     = @{ Cmd = "pa --version" }         # Power Apps CLI — code app connections
    "node"   = @{ Cmd = "node --version"; MinVersion = "22.12" }  # Node.js — npm-based builds
}

$missing = @()
foreach ($name in $tools.Keys) {
    $tool = $tools[$name]
    $cmd = $tool.Cmd.Split(' ')[0]
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Err "$name NOT found"; $missing += $name; continue
    }
    $global:LASTEXITCODE = 0
    $output = try { Invoke-Expression "$($tool.Cmd) 2>&1" } catch { $global:LASTEXITCODE = 1 }
    if ($LASTEXITCODE -ne 0) {
        Write-Err "$name is installed but '$($tool.Cmd)' failed (exit $LASTEXITCODE)"; $missing += $name; continue
    }
    if (-not $tool.MinVersion) { Write-Ok "$name available"; continue }

    $rawVersion = ($output | Select-String -Pattern '\d+\.\d+\.\d+' | Select-Object -First 1).Matches.Value
    if ($rawVersion -and [version]$rawVersion -ge [version]$tool.MinVersion) {
        Write-Ok "$name $rawVersion (>= $($tool.MinVersion))"
    } else {
        Write-Err "$name $rawVersion is older than the required $($tool.MinVersion)"; $missing += $name
    }
}
if ($missing.Count -gt 0) {
    Write-Err "Missing, failing or outdated tools: $($missing -join ', '). In a Codespace that was just"
    Write-Err "  started, wait a minute and re-run this checkpoint; otherwise open this repo in GitHub Codespaces."
    exit 1
}

# Seed the unique identifier used for all named cloud assets.
$rid = Initialize-RandomIdentifier
Write-Ok "Random identifier for this lab: $rid"

# ── 2. Sign in to GitHub, Power Platform, Azure and Power Apps ───────────────────────────
. "$PSScriptRoot/lab-signin.ps1"

Save-Checkpoint -Id "cp01" -Message "Verify developer tooling and initialize lab credentials" -Body @'
Verify the local toolchain and sign in to the services required to build and deploy the warehouse app. This seeds shared lab state so later checkpoints can reuse the same identities and environment metadata.

## Changes
- wait for the Codespace's start-time tool update, then run dotnet, git, gh, pac, txc, az, pa and node
- authenticate GitHub CLI, TALXIS CLI, and Azure CLI
- persist the random identifier, tenant id, and auth profile references
## Testing
- tool checks pass; authenticated sessions are ready for subsequent scripts
'@
Write-Host "`nNext: .lab-scripts/CP02-create-repository-layout.ps1" -ForegroundColor Cyan
