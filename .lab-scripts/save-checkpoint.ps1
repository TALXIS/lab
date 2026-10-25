#!/usr/bin/env pwsh
#
# Save a checkpoint the way every CP script ends: commit on checkpoint/<Id>, open a PR on your
# fork, wait for it to be merged on GitHub, then tag <Id>. Use it when you or an agent built a
# checkpoint by hand instead of running its script.
#
# It calls Save-Checkpoint from lib/Lab.Common.ps1 and records <Id>HandBuilt in lab-state, which
# the commit carries: a hand-built checkpoint never sets the *Scaffolded flags its script would,
# and without this lab-status.ps1 would call it unfinished and name its script as the next one
# to run. It runs as its own process on purpose: Save-Checkpoint calls 'exit' when something
# goes wrong, which would close your terminal if the function were loaded into it.
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

Set-LabValue "${Id}HandBuilt" $true
Save-Checkpoint -Id $Id -Message $Message -Body $Body
