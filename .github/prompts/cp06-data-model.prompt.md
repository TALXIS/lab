---
agent: agent
description: CP06 - implement the data model (Lab 1)
---

Please implement the data model in docs/design/lab-1-data-model.md
(the Data dictionary section): the Location, Item and Transaction tables with all
their columns, using the TALXIS skills.

Work under src/ and the solution file. Use the project names from the project table in docs/design/00-solution-architecture.md,
because the build and deploy steps look for them, and keep
the table, column and choice names exactly as the spec has them, because later
checkpoints read them by name.

Put the tables in their own Dataverse solution, and add a Package Deployer project
that references it, so one `dotnet build` produces the single package we deploy. Make sure
both projects are in `WarehouseManagement.slnx` (`dotnet sln list`, then `dotnet sln add`
what's missing): the package template doesn't add itself, and the build check publishes
`src/Packages.Main`.

Delete the empty `RibbonDiff.xml` the entity template puts next to each `Entity.xml`. Ribbon
buttons belong to the UI solution of CP09; an empty ribbon in the data model removes them from
Dev whenever the data model is imported on its own, as CP11 does.

If you get stuck, .lab-scripts/CP06-implement-data-model.ps1 does this same step
and is a good example to read.

When you're done, run `dotnet build WarehouseManagement.slnx` and fix anything it
reports. Then save the checkpoint:

`.lab-scripts/save-checkpoint.ps1 -Id cp06 -Message "Add warehouse data model schema and column definitions"`

It opens a pull request on the fork and waits. Give me the PR link and tell me to review it and
merge it on GitHub (Files changed, Merge pull request, Confirm). If the terminal shows "press Enter
to merge", also tell me to press Enter there once I've merged. Don't merge it yourself.
