#!/usr/bin/env pwsh
#
# Save a checkpoint the way every CP script ends: commit on checkpoint/<Id>, open a PR on your
# fork, wait for it to be merged on GitHub, then tag <Id>. Use it when you or an agent built a
# checkpoint by hand instead of running its script.
#
# It only calls Save-Checkpoint from lib/Lab.Common.ps1; nothing else changes. It runs as its own
# process on purpose: Save-Checkpoint calls 'exit' when something goes wrong, which would close
# your terminal if the function were loaded into it.
#
# Run:  .lab-scripts/save-checkpoint.ps1 -Id cp06 -Message "Add warehouse data model schema and column definitions"
#       (-Body takes the PR description; without it the PR body is the message.)
# ──────────────────────────────────────────────────────────────────────────────────────────

param(
    [Parameter(Mandatory)][string]$Id,
    [Parameter(Mandatory)][string]$Message,
    [string]$Body
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/Lab.Common.ps1"

Save-Checkpoint -Id $Id -Message $Message -Body $Body
