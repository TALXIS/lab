---
agent: agent
description: CP09a - implement the Warehouse model-driven app (Lab 4)
---

Please implement the manager's Warehouse Management app from docs/design/lab-4-user-interface.md,
using the TALXIS skills. That's user stories US-01 to US-05 and the technical
specification sections "Solution and model-driven app", "Script library" and "TALXIS Grid
on the Location form": the UI solution, the model-driven app with its sitemap, the forms,
views and subgrids, the form and ribbon scripts, and the TALXIS Grid on the Location form.

Work under src/ and the solution file. Use the project names from the project table in docs/design/00-solution-architecture.md,
because the build and deploy steps look for them, and keep the
table, column and choice names, and the app, sitemap, view and web resource names, exactly
as the spec has them. The form script and ribbon messages need to match the spec's text.
Where the spec leaves a design decision open, pick something sensible and tell me what
you chose.

The UI solution should use the existing tables rather than define them again, so the data
model stays the single owner of every table.

This is the first half of the UI checkpoint. Leave the Warehouse Picking code app for
the next prompt, /cp09b-code-app.

If you get stuck, .lab-scripts/CP09-implement-ui.ps1 does the whole UI step, and the
scaffold files it calls (05a to 05d, 09, 10 and 05e) are good examples for this half.

When you're done, run `dotnet build WarehouseManagement.slnx` and fix anything it
reports. Then tell me to continue with /cp09b-code-app. Don't save the checkpoint yet.
