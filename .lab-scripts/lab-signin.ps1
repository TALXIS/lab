#!/usr/bin/env pwsh
#
# Sign in to GitHub, Power Platform, Azure and Power Apps. Safe to re-run: it skips what already works.
#
# Run:  .lab-scripts/lab-signin.ps1
# ──────────────────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/Lab.Common.ps1"

if ($env:LAB_LOCAL_MODE) { Write-Info "LAB_LOCAL_MODE: skipped sign-in"; return }
# A sign-in needs a person at the keyboard. An agent's commands have no keyboard (stdin is
# redirected), so only a sign-in that is actually needed stops here: tools that are already signed
# in pass, and CP01 run by an agent completes once the person has signed in themselves.
function Assert-Terminal {
    if ([Console]::IsInputRedirected) { Write-Err "Signing in is up to you: run .lab-scripts/lab-signin.ps1 in your terminal."; exit 1 }
}

# ── 1. GitHub ─────────────────────────────────────────────────────────────────────────────
# Your own login - the GITHUB_TOKEN Codespaces provides can't manage rulesets or workflows.
# A GH_TOKEN your environment provides (e.g. a cloud agent sandbox) is used as is.
Write-Step "Sign in 1/4 — GitHub"
Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue
if (-not $env:GH_TOKEN -and -not (gh auth status 2>&1 | Select-String 'workflow')) {
    Assert-Terminal
    # Piping input in makes gh print the link and code instead of waiting for Enter.
    '' | gh auth login -h github.com -p https -s workflow --web
}
# git doesn't read GH_TOKEN or gh's login by itself: make gh its credential helper either way.
gh auth setup-git --hostname github.com --force
if ($LASTEXITCODE -ne 0) { Write-Err "Could not set up git to push with your GitHub sign-in"; exit 1 }
Write-Ok "GitHub: $(gh api user -q .login)"

# ── 2. Power Platform (txc) ───────────────────────────────────────────────────────────────
# One credential named "lab"; CP04 binds your Dev and Test environments to it.
Write-Step "Sign in 2/4 — Power Platform"
$health = (txc config auth get lab --check-token --format json 2>$null | ConvertFrom-Json).tokenHealth.status
if (-not $health -or $health -eq 'failed') { Assert-Terminal; txc config auth login --alias lab }
$tenantId = (txc config auth get lab --format json | ConvertFrom-Json).tenantId
Write-Ok "Power Platform: tenant $tenantId"

# ── 3. Azure (az) ─────────────────────────────────────────────────────────────────────────
# Same account and tenant as Power Platform: CP05 uses it to call your Test environment.
# Piping the output away also skips az's subscription picker - the lab only needs the tenant.
Write-Step "Sign in 3/4 — Azure"
if ((az account get-access-token --query tenant -o tsv 2>$null) -ne $tenantId) {
    Assert-Terminal
    az login --tenant $tenantId --allow-no-subscriptions | Out-Null
}
$account = az account show --query user.name -o tsv
Set-LabValue 'tenantId' $tenantId
Write-Ok "Azure: $account (tenant $tenantId)"

# ── 4. Power Apps (pa) ────────────────────────────────────────────────────────────────────
# Used by the code app (CP11). Same account as Power Platform.
Write-Step "Sign in 4/4 — Power Apps"
# Unlike txc and az, pa can't tell when no browser can open here (Codespaces, containers).
$deviceCode = if ($IsLinux -and -not $env:DISPLAY) { '--device-code' }
if (-not (pa auth status --json | ConvertFrom-Json).signedIn) {
    Assert-Terminal
    pa auth login $deviceCode --account $account
}
Write-Ok "Power Apps: signed in"
