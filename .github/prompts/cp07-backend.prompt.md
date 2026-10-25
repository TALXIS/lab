---
agent: agent
description: CP07 - implement the server-side business logic (Lab 2)
---

Please implement the two plugin rules in
docs/design/lab-2-server-side-business-logic.md, ValidateWarehouseTransactionPlugin
and SubtractQuantityPlugin, using the TALXIS skills.

Work under src/ and the solution file. Use the project names from the project table in docs/design/00-solution-architecture.md,
because the build and deploy steps look for them, and keep
the table, column and choice names exactly as the spec has them.

Keep the plugin code in its own project, and register the steps in a separate logic
solution. Create the steps after the first build of the logic solution, since the
build registers the assembly. Follow the stages in the spec's step registrations.

If you get stuck, .lab-scripts/CP07-implement-backend.ps1 does this same step
and is a good example to read.

When you're done, run `dotnet build WarehouseManagement.slnx` and fix anything it
reports. Then save the checkpoint:

`.lab-scripts/save-checkpoint.ps1 -Id cp07 -Message "Add inventory transaction plugin and logic solution steps"`

It opens a pull request on the fork and waits. Give me the PR link and tell me to review it and
merge it on GitHub (Files changed, Merge pull request, Confirm). Don't merge it yourself.
