#!/usr/bin/env pwsh
#
# Save a checkpoint the way every CP script ends: commit on checkpoint/<Id>, open a PR on your
# fork, wait for it to be merged on GitHub, then tag <Id>. Use it when you or an agent built a
# checkpoint by hand instead of running its script.
#
# Before saving, it records the checkpoint's lab-state flags, the ones the CP script's scaffold
# steps set. lab-status.ps1 only calls a checkpoint done when its tag AND these flags are there,
# and the scaffold steps skip work whose flag is set, so a checkpoint saved here is treated like
# one the script built. Run it only after the build passes.
#
# It otherwise only calls Save-Checkpoint from lib/Lab.Common.ps1. It runs as its own process on
# purpose: Save-Checkpoint calls 'exit' when something goes wrong, which would close your terminal
# if the function were loaded into it.
#
# Run:  .lab-scripts/save-checkpoint.ps1 -Id cp06 -Message "Add warehouse data model schema and column definitions"
#       .lab-scripts/save-checkpoint.ps1 -Id cp11 -Step 2 -Message "Add Open Food Facts custom connector, deployed to Dev"
#       (-Body takes the PR description; without it the PR body is the message. CP11 saves four
#        times, so it needs -Step 1 to 4.)
# ──────────────────────────────────────────────────────────────────────────────────────────

param(
    [Parameter(Mandatory)][string]$Id,
    [Parameter(Mandatory)][string]$Message,
    [string]$Body,
    [ValidateRange(0, 4)][int]$Step = 0
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/Lab.Common.ps1"

# The same keys lab-status.ps1 checks, from $LabCheckpoints in lib/Lab.Common.ps1. Only the
# *Scaffolded flags are true/false; the other keys hold values a script looked up. CP11 lands
# in four steps, each with its own flags.
$checkpoint = $LabCheckpoints | Where-Object { $_.Id -eq $Id }
if (-not $checkpoint) { Write-Err "Unknown checkpoint '$Id' - use cp06 to cp15."; exit 1 }
$keys = $checkpoint.Keys
if ($checkpoint.Steps) {
    if ($Step -lt 1 -or $Step -gt $checkpoint.Steps.Count) { Write-Err "$Id saves in $($checkpoint.Steps.Count) steps: pass -Step 1 to $($checkpoint.Steps.Count)."; exit 1 }
    $keys = $checkpoint.Steps[$Step - 1]
}
foreach ($key in $keys | Where-Object { $_ -like '*Scaffolded' }) { Set-LabValue $key $true }

# Steps 1 and 2 of CP11 import into Dev, as the prompt says; the script then skips those imports.
if ($Id -eq 'cp11' -and $Step -eq 1) { Set-LabValue 'productTableDeployed' $true }
if ($Id -eq 'cp11' -and $Step -eq 2) { Set-LabValue 'connectorDeployed' $true }

# CP12's flags hold the paths of the reference data package, not true/false.
if ($Id -eq 'cp12') {
    $dataDir = Join-Path $LabRoot "src/Packages.Main/Data"
    Set-LabValue 'configDataDirectory'  $dataDir
    Set-LabValue 'configDataSchemaPath' (Join-Path $dataDir "data_schema.xml")
    Set-LabValue 'configDataFilePath'   (Join-Path $dataDir "data.xml")
}

Save-Checkpoint -Id $Id -Message $Message -Body $Body
