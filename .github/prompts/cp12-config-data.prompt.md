---
agent: agent
description: CP12 - move configuration data as source (Lab 1, reference data)
---

Please implement the reference data from docs/design/lab-1-data-model.md
(the Reference data section) as a Configuration Migration package, using the TALXIS
skills, so the records travel with the app instead of being typed into each environment.

Work under src/ and the solution file. Use the project names from the project table in docs/design/00-solution-architecture.md,
because the build and deploy steps look for them, and keep
the table and column names exactly as the spec has them. Give each seed record a fixed
GUID, so every environment imports the same records.

The data needs the tables to exist first, so build on the earlier checkpoints.

If you get stuck, .lab-scripts/CP12-move-configuration.ps1 does this same step
and is a good example to read.

When you're done, run `dotnet build WarehouseManagement.slnx` and fix anything it
reports. Then load the records into my Dev environment, so I can try the picking app with
real data:

`txc data pkg import src/Packages.Main/Data --profile dev`

If the import fails, tell me what it said and wait. Don't retry it with other options.

When the import has worked, set `environmentId` in `src/Apps.WarehousePicking/power.config.json` to my Dev
environment's id (the `environmentId` that `txc env list` shows for it). Without it,
`npm run dev` can't open the app in Power Apps. Then save the checkpoint:

`.lab-scripts/save-checkpoint.ps1 -Id cp12 -Message "Add configuration data package for environment promotion"`

It opens a pull request on the fork and waits. Give me the PR link and tell me to review it and
merge it on GitHub (Files changed, Merge pull request, Confirm). Don't merge it yourself.
