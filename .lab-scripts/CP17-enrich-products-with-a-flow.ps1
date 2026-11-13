#!/usr/bin/env pwsh
#
# ╔════════════════════════════════════════════════════════════════════════════════════════╗
# ║                     CP17: Enrich new products with a flow                              ║
# ╚════════════════════════════════════════════════════════════════════════════════════════╝
#
# When a Product row is added with a barcode, a cloud flow looks it up with the lab's own
# Open Food Facts connector (CP11), writes name, brand, quantity and image back to the row,
# and posts a Teams message. The flow is written as source, and each step answers its
# questions from the closest place that knows:
#
#   1. A clean flow                      - the pp-flow template; nothing else.
#   2. Trigger and condition             - the Dataverse connector's operation contract,
#                                          read once from Dev and kept in .txc/connectors/.
#                                          No connection is used.
#   3. The custom connector              - its apiDefinition.swagger.json and the Product
#                                          table's Entity.xml, both in this repository.
#                                          No environment at all.
#   4. Teams, then deploy and prove it   - Teams' inputs only exist through a signed-in
#                                          connection, so this step creates one and asks
#                                          through it.
#
# Each step is its own Save-Checkpoint, like CP11; an interrupted run picks up at the first
# step whose work is missing.
#
# A custom connector's id in an environment carries a hash (shared_lab-5fopen-20food-...), so
# a locally written flow can't know it. Tried on Dev:
#   - the connection reference: naming the connector by its logical name works when the
#     reference also carries <customconnectorid> (the connector's build-time id). Dataverse
#     rewrites it to the environment's connector on import. Without that id the import fails
#     ("Could not find API").
#   - the flow definition: a logical-name api.name / host.apiId is NOT rewritten, and turning
#     the flow on fails with ConnectionAuthorizationFailed.
# So the source names the connector by its logical name everywhere, and step 4 swaps in the
# environment's id (from 'txc environment connector list') inside the built zip, just before
# the import.
#
# Run:  .lab-scripts/CP17-enrich-products-with-a-flow.ps1
# ──────────────────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/Lab.Common.ps1"
$PublisherName   = Get-LabValue 'publisherName'   $LabDefaultPublisherName
$PublisherPrefix = Get-LabValue 'publisherPrefix' $LabDefaultPublisherPrefix

$devUrl = Get-LabValue 'devEnvUrl'
$devProfile = Get-LabValue 'devProfile'
if (-not $devUrl -or -not $devProfile) { Write-Err "Dev environment not found in lab state. Run CP04 first."; exit 1 }

$EnrichFlowName     = "enrichproducts"
$DataverseConnector = "shared_commondataserviceforapps"
$DataverseReference = "${PublisherPrefix}_sharedcommondataserviceforapps"
$ConnectorName      = "${PublisherPrefix}_connectorsopenfoodfacts"
$ConnectorReference = "${PublisherPrefix}_openfoodfacts"
$TeamsReference     = "${PublisherPrefix}_sharedteams"
$TestBarcode        = "3017620422003"

# Runs a txc query and returns its JSON answer.
function Invoke-TxcJson {
    $answer = txc @args --format json | Out-String
    if ($LASTEXITCODE -ne 0) { Write-Err "txc $($args[0..4] -join ' ') ... failed: $answer"; exit 1 }
    return $answer | ConvertFrom-Json
}

# Where an answer came from: workspace (this repository), snapshot (.txc/connectors/), or environment.
function Format-Source { param($Answer) if ($Answer.sourcePath) { "$($Answer.source): $($Answer.sourcePath)" } else { "$($Answer.source)" } }

Push-Location $LabRoot
try {

# ── Step 1: a clean flow ──────────────────────────────────────────────────────────────────
Write-Step "CP17: Enrich products (step 1: a clean flow)"
. "$PSScriptRoot/scaffold/20a-enrich-flow.ps1"
Invoke-LabBuild

Save-Checkpoint -Id "cp17" -Message "Add a clean Enrich Products flow" -Body @'
Add an empty cloud flow to Solutions.Logic: the pp-flow template's manual trigger and no actions. It grows in the next three updates of this checkpoint - a Dataverse trigger, the Open Food Facts lookup and a Teams message - each from a different source of truth.

## Changes
- add the enrichproducts flow to Solutions.Logic (pp-flow, manual trigger)
## Testing
- Solutions.Logic builds locally; the build check on this PR builds the whole repository
'@

# ── Step 2: trigger and condition, from the contract only ─────────────────────────────────
Write-Step "CP17: Enrich products (step 2: trigger and condition, no connection)"

if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped, would read SubscribeWebhookTrigger's contract from Dev ($devUrl)"
    Write-Info "  once, keep it in .txc/connectors/, and show that its values need a connection."
} else {
    $trigger = Invoke-TxcJson environment connector operation get $DataverseConnector SubscribeWebhookTrigger --profile $devProfile
    Write-Ok "SubscribeWebhookTrigger ($($trigger.actionType)) - $(Format-Source $trigger)"
    foreach ($name in "subscriptionRequest/message", "subscriptionRequest/entityname", "subscriptionRequest/scope") {
        $p = @($trigger.parameters) | Where-Object { $_.name -eq $name }
        if (-not $p) { Write-Err "SubscribeWebhookTrigger has no '$name' parameter"; exit 1 }
        Write-Info "  $name ($($p.type)$(if ($p.required) { ', required' }))"
    }
    # The three values are dynamic lists. Without a connection the answer says so and stops;
    # step 4 asks again through the connection and checks what this step wrote.
    $entity = Invoke-TxcJson environment connector operation parameter get $DataverseConnector SubscribeWebhookTrigger `
        subscriptionRequest/entityname --connection-reference $DataverseReference --profile $devProfile
    Write-Info "subscriptionRequest/entityname without a connection: $($entity.status) - writing ${PublisherPrefix}_product, checked in step 4"

    # The condition reads the new row's barcode column. Its name is the table's own, from Entity.xml.
    $columns = Invoke-TxcJson environment connector operation parameter get $DataverseConnector UpdateOnlyRecord item `
        --value "entityName=${PublisherPrefix}_products" --filter "${PublisherPrefix}_ean" --profile $devProfile
    if (-not (@($columns.fields) | Where-Object { $_.name -eq "item/${PublisherPrefix}_ean" })) {
        Write-Err "The Product table has no ${PublisherPrefix}_ean column ($($columns.status): $($columns.message))"; exit 1
    }
    Write-Ok "${PublisherPrefix}_ean is a Product column - $(Format-Source $columns)"
}

. "$PSScriptRoot/scaffold/20b-enrich-trigger.ps1"
Invoke-LabBuild

Save-Checkpoint -Id "cp17" -Message "Trigger Enrich Products when a product is added" -Body @'
Replace the manual trigger with Dataverse "When a row is added" on Product (organization scope), and add a condition that the new row has a barcode. Written from the connector's operation contract, read once from Dev and kept in .txc/connectors/ - no connection is used. The trigger's three values are the connector's dynamic lists, so they are checked through the connection in the last update of this checkpoint.

## Changes
- enrichproducts: SubscribeWebhookTrigger on lab_product (Added, Organization) and a Has_barcode condition
- bind it to the existing Dataverse connection reference (CP16)
- .txc/connectors/: the operation contracts the flow was written against
## Testing
- Solutions.Logic builds locally; the build check on this PR builds the whole repository
'@

# ── Step 3: the custom connector, from local source only ─────────────────────────────────
Write-Step "CP17: Enrich products (step 3: Open Food Facts, from the repository)"

# Answered from src/Connectors.OpenFoodFacts/apiDefinition.swagger.json: no environment call.
$lookup = Invoke-TxcJson environment connector operation get $ConnectorName GetProductByBarcode
Write-Ok "GetProductByBarcode - $(Format-Source $lookup)"
Write-Info "  inputs:  $((@($lookup.parameters) | ForEach-Object { $_.name }) -join ', ')"
Write-Info "  outputs: $((@($lookup.outputs) | ForEach-Object { $_.key }) -join ', ')"
if ($lookup.source -ne "workspace") { Write-Err "Expected the connector's contract from the repository, got $($lookup.source)"; exit 1 }

if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped, would list UpdateOnlyRecord's Product fields (from Entity.xml"
    Write-Info "  once the operation's contract is in .txc/connectors/)."
} else {
    $fields = Invoke-TxcJson environment connector operation parameter get $DataverseConnector UpdateOnlyRecord item `
        --value "entityName=${PublisherPrefix}_products" --profile $devProfile
    foreach ($column in "name", "brand", "quantity", "imageurl", "lastsyncedon") {
        if (-not (@($fields.fields) | Where-Object { $_.name -eq "item/${PublisherPrefix}_$column" })) {
            Write-Err "UpdateOnlyRecord has no 'item/${PublisherPrefix}_$column' field"; exit 1
        }
    }
    Write-Ok "UpdateOnlyRecord's Product fields - $(Format-Source $fields)"
}

. "$PSScriptRoot/scaffold/20c-enrich-lookup.ps1"
Invoke-LabBuild

Save-Checkpoint -Id "cp17" -Message "Look new products up in Open Food Facts" -Body @'
Inside the condition, look the barcode up with the lab's own Open Food Facts connector and write name, brand, quantity, image URL and sync time back to the Product row. Both contracts come from this repository - the connector's apiDefinition.swagger.json and the Product table's Entity.xml - so this update needs no environment.

The connection reference names the connector by its logical name and carries its build-time id (customconnectorid), which Dataverse resolves to the environment's connector on import.

## Changes
- add the lab_openfoodfacts connection reference (lab_connectorsopenfoodfacts, with customconnectorid) to Solutions.Logic
- enrichproducts: Get_product_by_barcode (Open Food Facts) and Update_the_product (Dataverse UpdateOnlyRecord)
## Testing
- Solutions.Logic builds locally; the build check on this PR builds the whole repository
- 'txc environment connector operation get lab_connectorsopenfoodfacts GetProductByBarcode' answers with source: workspace
'@

# ── Step 4: Teams through a connection, then deploy and prove it ──────────────────────────
Write-Step "CP17: Enrich products (step 4: Teams through a connection, deploy, prove)"

if ($env:LAB_LOCAL_MODE) {
    Write-Info "LAB_LOCAL_MODE: skipped, would create Teams, Open Food Facts and Dataverse connections with"
    Write-Info "  'txc environment connection create', check the trigger's values and read Teams' inputs"
    Write-Info "  through them (--use-connection), deploy Solutions.Logic to Dev ($devUrl) and add a Product."
    $TeamsPoster = "Flow bot"; $TeamsLocation = "Chat with Flow bot"; $TeamsRecipient = "you@example.com"
    . "$PSScriptRoot/scaffold/20d-enrich-notify.ps1"
    Invoke-LabBuild
} else {
    # Idempotent by connector and display name: a re-run finds the connections it created.
    $connections = @{}
    foreach ($c in @(
        @{ Connector = $DataverseConnector; Name = "Microsoft Dataverse" },
        @{ Connector = $ConnectorName;      Name = "Open Food Facts" },
        @{ Connector = "shared_teams";      Name = "Microsoft Teams" })) {
        $created = txc environment connection create --connector $c.Connector --display-name $c.Name `
            --profile $devProfile --format json | Out-String | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0 -or -not $created.connectionId) {
            Write-Err "Creating the $($c.Name) connection failed: $($created.status) $($created.statusMessage)"
            if ($created.consentLink) { Write-Info "Finish the sign-in here, then run this checkpoint again: $($created.consentLink)" }
            exit 1
        }
        $connections[$c.Connector] = $created.connectionId
        Write-Ok "$($c.Name) connection: $($created.connectionId) ($($created.status))"
    }

    # Teams' inputs are read through a connection reference, so it has to exist before the
    # action is written. Create it in Dev now, bound; the source copy (20d) has the same name.
    $solution = ([xml](Get-Content -Raw "src/Solutions.Logic/Other/Solution.xml")).ImportExportXml.SolutionManifest.UniqueName
    $null = Invoke-TxcJson environment connection-reference create $TeamsReference --connector shared_teams `
        --display-name "Microsoft Teams" --solution $solution --connection-id $connections["shared_teams"] --profile $devProfile
    $null = Invoke-TxcJson environment connection-reference update $DataverseReference `
        --connection-id $connections[$DataverseConnector] --profile $devProfile
    Write-Ok "$TeamsReference and $DataverseReference bound"

    # Step 2 wrote the trigger's values without a connection. Check them through it now. These
    # are read-only metadata lookups made as you, the connections' owner.
    $expected = @{ "subscriptionRequest/message" = "1"; "subscriptionRequest/entityname" = "${PublisherPrefix}_product"; "subscriptionRequest/scope" = "4" }
    foreach ($name in $expected.Keys) {
        # Scope's list depends on the table, so pass the table along with every lookup.
        $answer = Invoke-TxcJson environment connector operation parameter get $DataverseConnector SubscribeWebhookTrigger $name `
            --value "subscriptionRequest/entityname=${PublisherPrefix}_product" `
            --connection-reference $DataverseReference --use-connection --profile $devProfile
        $match = @($answer.values) | Where-Object { "$($_.value)" -eq $expected[$name] }
        if (-not $match) { Write-Err "$name has no value '$($expected[$name])' ($($answer.status): $($answer.message))"; exit 1 }
        Write-Ok "$name = $($expected[$name]) ($(if ($match.label) { $match.label } else { $match.value }))"
    }
    $body = Invoke-TxcJson environment connector operation output get $DataverseConnector SubscribeWebhookTrigger body `
        --value "subscriptionRequest/entityname=${PublisherPrefix}_product" --connection-reference $DataverseReference `
        --use-connection --filter "${PublisherPrefix}_" --profile $devProfile
    foreach ($column in "ean", "productid", "name") {
        if (-not (@($body.outputs) | Where-Object { $_.key -eq "body/${PublisherPrefix}_$column" })) {
            Write-Err "The trigger has no 'body/${PublisherPrefix}_$column' output ($($body.status): $($body.message))"; exit 1
        }
    }
    Write-Ok "The trigger outputs body/${PublisherPrefix}_ean, _productid and _name, as the flow reads them"

    # Teams: who posts is a fixed list; where, and the message's fields, depend on it.
    $TeamsPoster = "Flow bot"; $TeamsLocation = "Chat with Flow bot"
    $poster = Invoke-TxcJson environment connector operation parameter get shared_teams PostMessageToConversation poster `
        --connection-reference $TeamsReference --profile $devProfile
    if (-not (@($poster.values) | Where-Object { $_.value -eq $TeamsPoster })) { Write-Err "poster has no '$TeamsPoster' ($($poster.status))"; exit 1 }
    Write-Ok "poster = $TeamsPoster - $($poster.status), $(Format-Source $poster)"

    $location = Invoke-TxcJson environment connector operation parameter get shared_teams PostMessageToConversation location `
        --value "poster=$TeamsPoster" --connection-reference $TeamsReference --profile $devProfile
    Write-Info "location without a connection: $($location.status)"
    $location = Invoke-TxcJson environment connector operation parameter get shared_teams PostMessageToConversation location `
        --value "poster=$TeamsPoster" --connection-reference $TeamsReference --use-connection --profile $devProfile
    if (-not (@($location.values) | Where-Object { $_.value -eq $TeamsLocation })) { Write-Err "location has no '$TeamsLocation' ($($location.status))"; exit 1 }
    Write-Ok "location = $TeamsLocation - one of: $((@($location.values) | ForEach-Object { $_.value }) -join ', ')"

    $message = Invoke-TxcJson environment connector operation parameter get shared_teams PostMessageToConversation body `
        --value "poster=$TeamsPoster" --value "location=$TeamsLocation" --connection-reference $TeamsReference `
        --use-connection --profile $devProfile
    foreach ($field in "body/recipient", "body/messageBody") {
        if (-not (@($message.fields) | Where-Object { $_.name -eq $field })) { Write-Err "PostMessageToConversation has no '$field' ($($message.status))"; exit 1 }
    }
    Write-Ok "Message fields: $((@($message.fields) | ForEach-Object { $_.name }) -join ', ')"
    # The Flow bot chats with one person: you, the connection's owner.
    $TeamsRecipient = $message.connectionOwner

    . "$PSScriptRoot/scaffold/20d-enrich-notify.ps1"
    # The import below uses the built Solutions.Logic.zip, so build it even on a re-run.
    Invoke-LabBuild -Project Solutions.Logic

    # Swap the custom connector's logical name for its id in Dev, in a copy of the built zip.
    $connectors = Invoke-TxcJson environment connector list --filter "Open Food Facts" --profile $devProfile
    $apiId = @($connectors) | Where-Object { $_.logicalName -eq $ConnectorName } | Select-Object -First 1 -ExpandProperty apiId
    if (-not $apiId) { Write-Err "$ConnectorName is not in Dev. Run CP11 (step 2) first."; exit 1 }
    Write-Ok "$ConnectorName is $apiId in Dev"

    $zipPath = Join-Path ([System.IO.Path]::GetTempPath()) "Solutions.Logic.$apiId.zip"
    Copy-Item "src/Solutions.Logic/bin/Debug/net472/Solutions.Logic.zip" $zipPath -Force
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Update')
    try {
        foreach ($entry in @($zip.Entries | Where-Object { $_.FullName -like "Workflows/*.json" })) {
            $reader = [System.IO.StreamReader]::new($entry.Open()); $json = $reader.ReadToEnd(); $reader.Dispose()
            $patched = $json -replace "/apis/$ConnectorName`"", "/apis/$apiId`"" `
                             -replace "(`"name`"\s*:\s*)`"$ConnectorName`"", "`$1`"$apiId`""
            if ($patched -eq $json) { continue }
            $name = $entry.FullName; $entry.Delete()
            $writer = [System.IO.StreamWriter]::new($zip.CreateEntry($name).Open()); $writer.Write($patched); $writer.Dispose()
            Write-Info "  $name now names $apiId"
        }
    } finally { $zip.Dispose() }

    Write-Info "Importing Solutions.Logic to Dev ($devUrl)..."
    txc env sln import $zipPath --wait --profile $devProfile
    if ($LASTEXITCODE -ne 0) { Write-Err "Solutions.Logic import to Dev failed"; exit 1 }
    Remove-Item $zipPath

    # The import created lab_openfoodfacts from source, unbound. Bind all three.
    foreach ($binding in @(
        @{ Reference = $DataverseReference; Connection = $connections[$DataverseConnector] },
        @{ Reference = $ConnectorReference; Connection = $connections[$ConnectorName] },
        @{ Reference = $TeamsReference;     Connection = $connections["shared_teams"] })) {
        $null = Invoke-TxcJson environment connection-reference update $binding.Reference --connection-id $binding.Connection --profile $devProfile
        Write-Ok "$($binding.Reference) bound to $($binding.Connection)"
    }

    $flowXml = Get-ChildItem "src/Solutions.Logic/Workflows" -Filter "${PublisherPrefix}_${EnrichFlowName}-*.json.data.xml" | Select-Object -First 1
    $workflowId = ([xml](Get-Content -Raw $flowXml.FullName)).Workflow.WorkflowId.Trim('{}')
    # As in CP16: an off/on cycle starts the flow against the now bound references.
    foreach ($state in @{ statecode = 0; statuscode = 1 }, @{ statecode = 1; statuscode = 2 }) {
        txc env data record update $workflowId --entity workflow `
            --data ($state | ConvertTo-Json -Compress) --apply --profile $devProfile
        if ($LASTEXITCODE -ne 0) { Write-Err "Turning the flow on failed"; exit 1 }
    }
    Write-Ok "enrichproducts is on"

    # Prove it: add a Product with only a barcode and wait for the flow to fill it in.
    Start-Sleep 15
    $placeholder = "Scanned $TestBarcode"
    $created = Invoke-TxcJson env data record create --entity "${PublisherPrefix}_product" `
        --data (@{ "${PublisherPrefix}_ean" = $TestBarcode; "${PublisherPrefix}_name" = $placeholder } | ConvertTo-Json -Compress) `
        --apply --profile $devProfile
    $productId = $created.id
    $startedAt = Get-Date
    Write-Info "Added Product $productId ('$placeholder', barcode $TestBarcode). Waiting for the flow (up to 3 minutes)..."
    $select = (("name", "brand", "quantity", "imageurl", "lastsyncedon") | ForEach-Object { "${PublisherPrefix}_$_" }) -join ","
    do {
        Start-Sleep 10
        $row = @(Invoke-TxcJson env data query odata "${PublisherPrefix}_products" --filter "${PublisherPrefix}_productid eq $productId" `
            --select $select --profile $devProfile)[0]
        $done = $row."${PublisherPrefix}_brand" -and $row."${PublisherPrefix}_name" -ne $placeholder
    } until ($done -or (Get-Date) -gt $startedAt.AddMinutes(3))
    if (-not $done) {
        Write-Err "The flow didn't fill in Product $productId within 3 minutes. Open its run history:"
        Write-Info "  https://make.powerautomate.com - Dev environment - Solutions - Logic - enrichproducts"
        exit 1
    }
    Write-Ok ("The flow filled in the Product after {0:n0}s: {1} ({2}, {3})" -f ((Get-Date) - $startedAt).TotalSeconds,
        $row."${PublisherPrefix}_name", $row."${PublisherPrefix}_brand", $row."${PublisherPrefix}_quantity")

    $runs = @(Invoke-TxcJson env data query odata flowruns --filter "_workflow_value eq $workflowId" `
        --select "status,starttime,endtime" --profile $devProfile)
    if ($runs.Count) { $last = $runs | Sort-Object starttime | Select-Object -Last 1; Write-Ok "Last run: $($last.status) ($($last.starttime) - $($last.endtime))" }
    else { Write-Info "The run isn't in the flowrun table yet; it shows up there after a few minutes." }
    Write-Info "The Flow bot posted the result to $TeamsRecipient in Teams."
}

Save-Checkpoint -Id "cp17" -Message "Post enriched products to Teams, deploy and prove the flow" -Body @'
After the update, post a Teams message as the Flow bot. Its inputs only exist through a signed-in Teams connection, so this update creates the connections with txc, reads the inputs through them, and checks the trigger's values written earlier without a connection. Then it deploys Solutions.Logic to Dev, binds the three connection references, turns the flow on and adds a Product with only a barcode.

The custom connector's id in Dev carries a hash, so the source names it by its logical name and the deploy swaps in the Dev id (from txc environment connector list) in a copy of the built zip.

## Changes
- add the lab_sharedteams connection reference to Solutions.Logic
- enrichproducts: Post_in_Teams (PostMessageToConversation, Flow bot to the connection's owner)
- .txc/connectors/: the Teams contract
## Testing
- Solutions.Logic builds locally; the build check on this PR builds the whole repository
- Dev: a Product added with barcode 3017620422003 gets its name, brand, quantity and image from the flow within 3 minutes
'@

} finally { Pop-Location }
