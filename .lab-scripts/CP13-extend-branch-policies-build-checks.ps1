#!/usr/bin/env pwsh
#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║            CP13: Extend branch policies with build checks                              ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# A PR should only merge if it builds. We extend the main ruleset to require the 'build'
# status check (dotnet build, which runs TALXIS workspace validation). Now broken solutions
# can't reach main.
#
# Run:  .lab-scripts/CP13-extend-branch-policies-build-checks.ps1
# ──────────────────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/Lab.Common.ps1"

Write-Step "CP13 — Require build check on PRs"

if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped — would resolve the repo via 'gh repo view' and PUT"
    Write-Info "  repos/<repo>/rulesets/<id> to add a required_status_checks rule for 'build'."
} else {
$repo = Get-LabValue 'repo'; if (-not $repo) { $repo = gh repo view --json nameWithOwner -q .nameWithOwner }
Set-LabValue 'repo' $repo

$id = Get-LabValue 'mainRulesetId'
if (-not $id) {
    $rulesetName = Get-LabValue 'mainRulesetName' 'lab-main-protection'
    $id = gh api "repos/$repo/rulesets" -q ".[] | select(.name==`"$rulesetName`") | .id"
    if ($id) { Set-LabValue 'mainRulesetId' $id }
}
if (-not $id) { Write-Err "Main ruleset not found on $repo — run CP03-setup-continuous-integration.ps1 first (it must actually complete at least once, not just be skipped)."; exit 1 }
$rules = @(
    @{ type="deletion" }, @{ type="non_fast_forward" },
    @{ type="pull_request"; parameters=@{ required_approving_review_count=0
        dismiss_stale_reviews_on_push=$true; require_code_owner_review=$false
        require_last_push_approval=$false; required_review_thread_resolution=$false } },
    @{ type="required_status_checks"; parameters=@{ strict_required_status_checks_policy=$true
        required_status_checks=@(@{ context="build" }) } }
) | ConvertTo-Json -Depth 10
$tmp = New-TemporaryFile; "{`"rules`":$rules}" | Set-Content $tmp -Encoding UTF8
$updated = gh api -X PUT "repos/$repo/rulesets/$id" --input $tmp 2>&1
if ($LASTEXITCODE -ne 0) {
    if (($updated -join "`n") -notmatch 'HTTP 40[34]') { Write-Err "Ruleset update failed: $updated"; Remove-Item $tmp; exit 1 }
    # Some sandboxes can't change repository settings - then you add the rule yourself.
    Write-Warn2 "GitHub refused to change the ruleset from here: $updated"
    Write-Warn2 "Add it yourself: https://github.com/$repo/settings/rules/$id → Require status checks to pass → add 'build'."
    $deadline = (Get-Date).AddMinutes(30)
    while ((gh api "repos/$repo/rulesets/$id" -q '[.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[].context] | index("build")' 2>$null) -in @($null, '', 'null')) {
        if ((Get-Date) -gt $deadline) { Write-Err "The 'build' check is still not required on $repo - add it, then re-run this checkpoint."; Remove-Item $tmp; exit 1 }
        Start-Sleep 15
    }
}
Remove-Item $tmp
Set-LabValue 'mainRulesetId' $id
Write-Ok "Ruleset now requires 'build' to pass"

}

Save-Checkpoint -Id "cp13" -Message "Require build status checks before merging into main" -Body @'
Tighten the main branch rules so pull requests must pass the build before they can merge. This turns the warehouse solution build into an enforceable quality gate for every change.

## Changes
- update the main branch ruleset in GitHub
- require the build status check on pull requests targeting main
- keep the existing PR-only protection while adding automated validation
## Testing
- ruleset update succeeds and the build check is registered as a required status
'@
Write-Host "`nNext: .lab-scripts/CP14-automate-ui-testing.ps1" -ForegroundColor Cyan
