#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                          Lab.Common.ps1 — shared helpers                               ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# Dot-source this file at the top of every checkpoint:  . "$PSScriptRoot/lib/Lab.Common.ps1"
#
# It provides:
#   - Lab state persistence (.lab-state.json, committed to the repo) so your variables
#     survive terminal/Codespaces crashes and you can resume from any checkpoint.
#   - A random identifier so attendees don't clash on names in the shared training tenant.
#   - Logging helpers and a Save-Checkpoint function that commits on checkpoint/<id>, opens
#     a PR on your fork, merges it and tags the result <id>.
#
# ──────────────────────────────────────────────────────────────────────────────────────────

# Repo root = parent of .lab-scripts
$Global:LabRoot      = (Resolve-Path "$PSScriptRoot/../..").Path
$Global:LabStateFile = Join-Path $LabRoot ".lab-state.json"

# Dataverse publisher defaults. CP02 writes them into .lab-state.json; later checkpoints read them back.
$Global:LabDefaultPublisherName   = "TALXISLab"
$Global:LabDefaultPublisherPrefix = "lab"

# The lab-state keys each checkpoint leaves behind: values later checkpoints read, and the
# *Scaffolded flags each scaffold block sets once it has fully run. lab-status.ps1 checks them
# against the tags; save-checkpoint.ps1 sets the *Scaffolded ones for a checkpoint built by hand.
# CP11 saves four times under one tag, so its flags are split by step.
$cp11Steps = @(
    @('productTableScaffolded'),
    @('connectorScaffolded'),
    @('productDataSourceScaffolded', 'connectorDataSourceScaffolded'),
    @('barcodeScanUiScaffolded')
)
$Global:LabCheckpoints = @(
    @{ Id = "cp01"; Keys = @("tenantId", "randomIdentifier") }
    @{ Id = "cp02"; Keys = @("slnxName", "publisherName", "publisherPrefix") }
    @{ Id = "cp03"; Keys = @("repo", "mainRulesetId", "mainRulesetName") }
    @{ Id = "cp04"; Keys = @("devEnvUrl", "testEnvUrl", "devProfile", "testProfile") }
    @{ Id = "cp05"; Keys = @("appId") }
    @{ Id = "cp06"; Keys = @("packageDeployerScaffolded", "dataModelScaffolded", "columnsScaffolded") }
    @{ Id = "cp07"; Keys = @("pluginsScaffolded", "logicSolutionScaffolded") }
    @{ Id = "cp08"; Keys = @("securityScaffolded") }
    @{ Id = "cp09"; Keys = @("uiSolutionScaffolded", "sitemapScaffolded", "formsScaffolded", "viewsSubgridsScaffolded", "codeAppScaffolded", "formScriptsScaffolded", "ribbonScaffolded", "gridControlScaffolded") }
    @{ Id = "cp10"; Keys = @() }
    @{ Id = "cp11"; Keys = @($cp11Steps | ForEach-Object { $_ }); Steps = $cp11Steps }
    @{ Id = "cp12"; Keys = @("configDataDirectory", "configDataSchemaPath", "configDataFilePath") }
    @{ Id = "cp13"; Keys = @("mainRulesetId") }
    @{ Id = "cp14"; Keys = @("testsUiScaffolded") }
    @{ Id = "cp15"; Keys = @("pluginsTestsScaffolded", "scriptsTestsScaffolded") }
    @{ Id = "cp16"; Keys = @("needsRestockColumnScaffolded", "backgroundFlowScaffolded") }
)

# Codespaces injects a GITHUB_TOKEN into every terminal, and gh prefers it over your own login.
# Once you've signed in with lab-signin.ps1, use your login instead.
$injectedToken = $env:GITHUB_TOKEN; $env:GITHUB_TOKEN = $null
if ($injectedToken -and -not (gh auth token 2>$null)) { $env:GITHUB_TOKEN = $injectedToken }

# ── Logging ────────────────────────────────────────────────────────────────────────────────
function Write-Step  { param([string]$m) Write-Host "`n── $m ──" -ForegroundColor Cyan }
function Write-Ok    { param([string]$m) Write-Host "  ✓ $m" -ForegroundColor Green }
function Write-Warn2 { param([string]$m) Write-Host "  ⚠ $m" -ForegroundColor Yellow }
function Write-Err   { param([string]$m) Write-Host "  ✗ $m" -ForegroundColor Red }
function Write-Info  { param([string]$m) Write-Host "  $m" -ForegroundColor Gray }

# ── State load/save ──────────────────────────────────────────────────────────────────────
# State is a flat hashtable stored as JSON in the repo. Loaded into $Global:Lab.
function Import-LabState {
    if (Test-Path $LabStateFile) {
        $raw = Get-Content -Raw -Path $LabStateFile
        try { $Global:Lab = $raw | ConvertFrom-Json -AsHashtable } catch { $Global:Lab = @{} }
    } else {
        $Global:Lab = @{}
    }
    return $Global:Lab
}

function Save-LabState {
    $Global:Lab | ConvertTo-Json -Depth 10 | Set-Content -Path $LabStateFile -Encoding UTF8
}

function Set-LabValue {
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)]$Value)
    if (-not $Global:Lab) { Import-LabState }
    $Global:Lab[$Name] = $Value
    Save-LabState
}

function Get-LabValue {
    param([Parameter(Mandatory)][string]$Name, $Default = $null)
    if (-not $Global:Lab) { Import-LabState }
    if ($Global:Lab.ContainsKey($Name)) { return $Global:Lab[$Name] }
    return $Default
}

# Seed the random identifier once; reused for all unique names in the shared tenant.
function Initialize-RandomIdentifier {
    if (-not (Get-LabValue 'randomIdentifier')) {
        Set-LabValue 'randomIdentifier' (Get-Random -Minimum 1000 -Maximum 9999)
    }
    return (Get-LabValue 'randomIdentifier')
}

# ── Template expansion ──────────────────────────────────────────────────────────────────
# Renders a whole-file template from .lab-scripts/templates/ by replacing __TOKEN__
# placeholders with literal values (plain string replace, no regex — so scaffold scripts
# no longer need backtick-escaping for target languages that use $ themselves, like C#
# interpolated strings or JS/TS template literals).
function Expand-LabTemplate {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Destination,
        [hashtable]$Tokens = @{}
    )
    $content = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot "../templates/$Path")
    foreach ($key in $Tokens.Keys) {
        $content = $content.Replace("__${key}__", [string]$Tokens[$key])
    }
    $destDir = Split-Path $Destination -Parent
    if ($destDir -and -not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Set-Content -LiteralPath $Destination -Value $content -Encoding UTF8
}

# ── Checkpoint via Pull Request ─────────────────────────────────────────────────────────
# Proper ALM: every checkpoint lands on main through a PR. We branch, commit, push, open a
# PR, pause so you can review the diff + checks in the browser, then merge + tag for rollback.
#
# The work branch is checkpoint/<Id>; the tag is <Id>. They must never share a name: git
# resolves an ambiguous name to the tag, so a checkpoint that saves more than once (CP11) or
# any re-run that brings new changes would silently merge nothing and lose its work.
#
# GitHub is driven through its REST API (gh api) only - gh's own pr commands use GraphQL,
# which some sandboxes block. The merge has no admin bypass: once CP13 makes the build check
# required, GitHub refuses the merge until it passes, and this waits for that.
#
# Re-running a checkpoint is safe: no changes means nothing is opened (only a missing tag is
# added), new changes open another PR for the same checkpoint and move the tag, and an open
# PR left by an interrupted run is reused.
# Set LAB_AUTO_MERGE=1 to skip the pause (used for unattended testing).
# Set LAB_LOCAL_MODE=1 to skip GitHub entirely — commits merge into main locally, no push/PR.
function Save-Checkpoint {
    param(
        [Parameter(Mandatory)][string]$Id,
        [Parameter(Mandatory)][string]$Message,
        [string]$Body
    )
    $branch = "checkpoint/$Id"
    Push-Location $LabRoot
    try {
        # Always target the fork's origin repo explicitly (avoids gh resolving upstream instead)
        $forkRepo = (git remote get-url origin) -replace 'https://github.com/',''-replace '\.git$',''
        $owner = $forkRepo.Split('/')[0]
        if (-not (git config user.email)) {
            if ($env:LAB_LOCAL_MODE) {
                git config user.email "agent@local.test"
                git config user.name  "lab-agent"
            } else {
                git config user.email "$(gh api user -q .id)+$(gh api user -q .login)@users.noreply.github.com"
                git config user.name (gh api user -q .login)
            }
        }
        # A run that stopped after committing (a refused merge, a lost connection) leaves HEAD on
        # this checkpoint's branch with the work already on it. Carry on from there instead of
        # switching to main, which would drop that work from the working tree.
        $resuming = (git branch --show-current) -eq $branch
        if ($resuming) {
            Write-Info "Resuming the interrupted save of $Id on $branch..."
            if (-not $env:LAB_LOCAL_MODE) {
                # Stopped between the merge on GitHub and the local pull? Then origin/main already
                # holds this branch's tree and there is nothing left to push - just finish.
                git fetch origin main --quiet 2>&1 | Out-Null
                git diff --quiet origin/main HEAD 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Info "The PR for $Id was already merged - finishing the checkpoint."
                    Complete-Checkpoint -Id $Id -Branch $branch -Repo $forkRepo
                    return
                }
            }
        } else {
            Write-Info "Syncing main..."
            git switch main --quiet 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Err "Could not switch to main. Check 'git status' (leftovers of an interrupted run?), then re-run this checkpoint."
                exit 1
            }
            if (-not $env:LAB_LOCAL_MODE) {
                git pull --ff-only --quiet 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    Write-Err "Could not fast-forward main from origin. Check your connection and 'git status', then re-run this checkpoint."
                    exit 1
                }
            }
            git branch -D $branch 2>&1 | Out-Null   # left behind by an interrupted run
            git switch -c $branch --quiet 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) { Write-Err "Could not create branch $branch"; exit 1 }
        }
        # A local branch named like the tag, from before work branches had the checkpoint/ prefix,
        # would make 'git checkout cp05' pick the branch instead of the tag.
        git show-ref --verify --quiet "refs/heads/$Id" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { git branch -D $Id 2>&1 | Out-Null }

        Save-LabState  # write state AFTER branch switch so lab-state.json diff is captured
        git add --all
        $dirty = [bool](git status --porcelain)
        $ahead = if ($resuming) { [int](git rev-list --count main..HEAD) } else { 0 }
        if (-not $dirty -and $ahead -eq 0) {
            Write-Info "No changes for $Id"
            git switch main --quiet
            git branch -D $branch 2>&1 | Out-Null
            # Merged on an earlier run that stopped before tagging: the tag belongs on main as it is now.
            if (-not (git tag --list $Id)) { git tag $Id 2>&1 | Out-Null }
            Publish-CheckpointTag $Id
            return
        }
        if ($dirty) {
            Write-Info "Committing changes..."
            git commit -m "$Id`: $Message" --quiet
            if ($LASTEXITCODE -ne 0) { Write-Err "git commit failed"; exit 1 }
        }

        if ($env:LAB_LOCAL_MODE) {
            Write-Info "LAB_LOCAL_MODE: skipping push/PR — merging '$branch' into main locally"
            git switch main --quiet
            git merge --no-ff --quiet -m "Merge $Id`: $Message" $branch 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) { Write-Err "Merging $branch into main failed. Resolve it, then re-run this checkpoint."; exit 1 }
            git branch -D $branch 2>&1 | Out-Null
            git tag -f $Id 2>&1 | Out-Null
            Write-Ok "Committed + tagged $Id locally (rollback: git reset --hard $Id) [LAB_LOCAL_MODE]"
            return
        }

        git push -u origin $branch --force --quiet 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Pushing $branch to origin failed. Check 'gh auth status' (or run .lab-scripts/lab-signin.ps1), then re-run this checkpoint."
            exit 1
        }
        $prBody = if ([string]::IsNullOrWhiteSpace($Body)) { "## Summary`n$Message" } else { $Body }
        # An interrupted run may have left this checkpoint's PR open; the push above refreshed it.
        $pr = gh api "repos/$forkRepo/pulls?state=open&head=${owner}:$branch" 2>$null | ConvertFrom-Json | Select-Object -First 1
        if ($pr.number) {
            Write-Ok "Reusing the open PR: $($pr.html_url)"
        } else {
            $raw = gh api "repos/$forkRepo/pulls" -f base=main -f head=$branch -f title="$Id`: $Message" -f body=$prBody 2>&1
            $pr = if ($LASTEXITCODE -eq 0) { ($raw -join "`n") | ConvertFrom-Json } else { $null }
            if (-not $pr.number) { Write-Err "Opening the PR failed: $raw"; exit 1 }
            Write-Ok "PR opened: $($pr.html_url)"
        }
        $url = $pr.html_url
        if ([Console]::IsInputRedirected -and -not $env:LAB_AUTO_MERGE) {
            # No terminal (e.g. an agent runs this): a person reviews and merges on GitHub.
            Write-Info "Review and merge the PR on GitHub: $url"
            $failures = 0
            do {
                Start-Sleep 15
                $state = gh api "repos/$forkRepo/pulls/$($pr.number)" -q .state 2>$null
                if ($LASTEXITCODE -ne 0) { if (++$failures -ge 10) { Write-Err "Lost contact with GitHub while waiting for $url - re-run this checkpoint once it is back."; exit 1 } }
                else { $failures = 0 }
            } while ($state -ne 'closed')
            $merged = gh api "repos/$forkRepo/pulls/$($pr.number)" -q .merged 2>$null
            if ($LASTEXITCODE -ne 0 -or $merged -ne 'true') { Write-Err "PR was closed without merging: $url"; exit 1 }
        } else {
            if (-not $env:LAB_AUTO_MERGE) { Read-Host "`n  Open the PR link above in your browser, review the diff, then press Enter to merge" }
            Merge-CheckpointPullRequest -Repo $forkRepo -Number $pr.number -Url $url
        }

        Complete-Checkpoint -Id $Id -Branch $branch -Repo $forkRepo
    } finally { Pop-Location }
}

# After the PR is merged: bring main up to date, drop the work branch here and on the fork,
# move the tag. Also the whole job when a re-run finds the merge already done.
function Complete-Checkpoint {
    param([Parameter(Mandatory)][string]$Id, [Parameter(Mandatory)][string]$Branch, [Parameter(Mandatory)][string]$Repo)
    git switch main --quiet 2>&1 | Out-Null
    git pull --ff-only --quiet 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Could not fast-forward main to the merged PR. Check 'git status', then re-run this checkpoint - it only finishes the tag."
        exit 1
    }
    git branch -D $Branch 2>&1 | Out-Null
    gh api -X DELETE "repos/$Repo/git/refs/heads/$Branch" 2>&1 | Out-Null   # merged; keep the fork tidy
    git tag -f $Id 2>&1 | Out-Null
    Publish-CheckpointTag $Id
    Write-Ok "Merged + tagged $Id (rollback: git reset --hard $Id)"
}

# Squash-merges the checkpoint's PR through the REST API. GitHub answers 405 while a required
# check is still running (CP13 onwards) - that is the gate working, so keep trying while the
# PR's own state says the checks are pending. A conflict, a failed check or anything but a
# 405 needs a person: say so and stop, the re-run reuses the same PR. A PR already merged on
# GitHub (the person clicked Merge before pressing Enter) also answers 405, so check that first.
function Merge-CheckpointPullRequest {
    param([Parameter(Mandatory)][string]$Repo, [Parameter(Mandatory)]$Number, [Parameter(Mandatory)][string]$Url)
    Write-Info "Merging..."
    $deadline = (Get-Date).AddMinutes(30)
    $waiting = $false
    while ($true) {
        if ((gh api "repos/$Repo/pulls/$Number" -q .merged 2>$null) -eq 'true') { Write-Ok "Already merged on GitHub"; return }
        $result = gh api -X PUT "repos/$Repo/pulls/$Number/merge" -f merge_method=squash 2>&1
        if ($LASTEXITCODE -eq 0) { return }
        $text = $result -join "`n"
        $stop = $null
        if ($text -notmatch 'HTTP 405') {
            $stop = $text
        } else {
            $pr = gh api "repos/$Repo/pulls/$Number" 2>$null | ConvertFrom-Json
            $state = "$($pr.mergeable_state)"
            if ($state -eq 'dirty') {
                $stop = "the PR has a merge conflict with main"
            } elseif ($state -in 'blocked', 'unknown', 'behind', '') {
                # A required check is still running - or has failed; the check runs on the head commit tell.
                $conclusions = gh api "repos/$Repo/commits/$($pr.head.sha)/check-runs" -q '[.check_runs[].conclusion | select(. != null)] | join(",")' 2>$null
                if ("$conclusions" -match 'failure|cancelled|timed_out|action_required') { $stop = "a required check failed ($conclusions)" }
            }
            # clean / unstable / has_hooks: GitHub accepts the merge in principle - retry.
        }
        if ($stop) {
            Write-Err "Merge failed: $stop"
            Write-Info "Resolve it on GitHub: $Url - then re-run this checkpoint (it reuses the PR)."
            exit 1
        }
        if ((Get-Date) -gt $deadline) { Write-Err "Gave up waiting for the PR to become mergeable: $Url"; Write-Info "Last answer: $text"; exit 1 }
        if (-not $waiting) { Write-Info "Waiting for the required checks to pass (see $Url)..."; $waiting = $true }
        Start-Sleep 15
    }
}

# Pushes the checkpoint tag to the fork. The explicit refspec matters: 'git push origin cp05'
# is ambiguous whenever a branch of that name exists or has existed, and git then pushes
# nothing. The tags are what 'git checkout tags/cp05' relies on when resuming elsewhere.
function Publish-CheckpointTag {
    param([Parameter(Mandatory)][string]$Id)
    if ($env:LAB_LOCAL_MODE) { return }
    git push --force origin "refs/tags/${Id}:refs/tags/${Id}" --quiet 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Err "Pushing tag $Id to origin failed. Re-run this checkpoint to retry."; exit 1 }
}

# Real mode: bring main up to date before a checkpoint starts scaffolding. A run interrupted
# after its PR merged leaves local main one squash commit behind origin; if the scaffolds
# regenerate those files first, the later fast-forward pull would refuse to run over them.
# Best effort: offline, on another branch, or with local changes it simply does nothing.
if (-not $env:LAB_LOCAL_MODE -and (git -C $LabRoot branch --show-current 2>$null) -eq 'main' -and -not (git -C $LabRoot status --porcelain 2>$null)) {
    $savedPrompt = $env:GIT_TERMINAL_PROMPT; $env:GIT_TERMINAL_PROMPT = '0'
    try { git -C $LabRoot pull --ff-only --quiet 2>&1 | Out-Null } finally { $env:GIT_TERMINAL_PROMPT = $savedPrompt }
}

Import-LabState | Out-Null
