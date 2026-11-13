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
# Signs in to one service unless $Test says it already works. A device code expires after
# 15 minutes, and a sign-in that wasn't finished in time used to go unnoticed until a later
# command failed. Each sign-in is checked, and one that didn't complete gets one fresh code.
function Invoke-SignIn {
    param([Parameter(Mandatory)][string]$Service, [Parameter(Mandatory)][scriptblock]$Login, [Parameter(Mandatory)][scriptblock]$Test)
    if (& $Test) { return }
    Assert-Terminal
    & $Login
    if (& $Test) { return }
    Write-Warn2 "The $Service sign-in didn't complete. Its code may have expired (codes last 15 minutes) - here is a new one."
    & $Login
    if (& $Test) { return }
    Write-Err "Signing in to $Service failed. Run .lab-scripts/lab-signin.ps1 again when you're ready."
    exit 1
}

# ── 1. GitHub ─────────────────────────────────────────────────────────────────────────────
# Your own login - the GITHUB_TOKEN Codespaces provides can't manage rulesets or workflows.
# A GH_TOKEN your environment provides (e.g. a cloud agent sandbox) is used as is.
Write-Step "Sign in 1/4 — GitHub"
Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue
# Piping input in makes gh print the link and code instead of waiting for Enter.
Invoke-SignIn -Service "GitHub" -Login { '' | gh auth login -h github.com -p https -s workflow --web } `
    -Test { $env:GH_TOKEN -or (gh auth status 2>&1 | Select-String 'workflow') }
# git doesn't read GH_TOKEN or gh's login by itself. If git can already push to your fork (a
# credential helper your environment set up), its configuration is left alone; otherwise gh
# becomes git's credential helper. A dry-run push checks that: it signs in but writes nothing,
# and reading alone would succeed without any sign-in on a public fork.
$savedPrompt = $env:GIT_TERMINAL_PROMPT; $env:GIT_TERMINAL_PROMPT = '0'
try {
    git -C $LabRoot -c http.lowSpeedLimit=1 -c http.lowSpeedTime=20 push --dry-run --quiet origin HEAD:refs/heads/lab-signin-check 2>&1 | Out-Null
    $gitCanPush = $LASTEXITCODE -eq 0
} finally { $env:GIT_TERMINAL_PROMPT = $savedPrompt }
if ($gitCanPush) {
    Write-Info "git can already push to your fork - its credential setup is left as it is."
} else {
    # --force: also when gh only knows the host through GH_TOKEN.
    gh auth setup-git --hostname github.com --force
    if ($LASTEXITCODE -ne 0) { Write-Err "Could not set up git to push with your GitHub sign-in"; exit 1 }
}
Write-Ok "GitHub: $(gh api user -q .login)"

# ── 2. Power Platform (txc) ───────────────────────────────────────────────────────────────
# One credential named "lab"; CP04 binds your Dev and Test environments to it.
Write-Step "Sign in 2/4 — Power Platform"
Invoke-SignIn -Service "Power Platform" -Login { txc config auth login --alias lab } -Test {
    $health = (txc config auth get lab --check-token --format json 2>$null | ConvertFrom-Json).tokenHealth.status
    $health -and $health -ne 'failed'
}
$tenantId = (txc config auth get lab --format json | ConvertFrom-Json).tenantId
Write-Ok "Power Platform: tenant $tenantId"

# ── 3. Azure (az) ─────────────────────────────────────────────────────────────────────────
# Same account and tenant as Power Platform: CP05 uses it to call your Test environment.
# Piping the output away also skips az's subscription picker - the lab only needs the tenant.
Write-Step "Sign in 3/4 — Azure"
Invoke-SignIn -Service "Azure" -Login { az login --tenant $tenantId --allow-no-subscriptions | Out-Null } `
    -Test { (az account get-access-token --query tenant -o tsv 2>$null) -eq $tenantId }
$account = az account show --query user.name -o tsv
Set-LabValue 'tenantId' $tenantId
Write-Ok "Azure: $account (tenant $tenantId)"

# ── 4. Power Apps (pa) ────────────────────────────────────────────────────────────────────
# Used by the code app (CP11). Same account as Power Platform.
Write-Step "Sign in 4/4 — Power Apps"
# Unlike txc and az, pa can't tell when no browser can open here (Codespaces, containers).
$deviceCode = if ($IsLinux -and -not $env:DISPLAY) { '--device-code' }
Invoke-SignIn -Service "Power Apps" -Login { pa auth login $deviceCode --account $account } `
    -Test { (pa auth status --json | ConvertFrom-Json).signedIn }
Write-Ok "Power Apps: signed in"
