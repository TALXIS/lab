---
agent: agent
description: CP09b - implement the Warehouse Picking code app (Lab 4)
---

Please implement the Warehouse Picking code app from docs/design/lab-4-user-interface.md,
using the TALXIS skills. That's user stories US-06 to US-12 and the technical
specification section "Warehouse Picking code app".

Start from the `pp-app-code` starter. It comes with Fluent UI and the TALXIS base controls,
so use those for the lists, lookups and form fields. Then add the warehouse screens
on top of it, and reference the app from the UI solution the previous prompt created.

Work under src/ and the solution file. Use the project names from the project table in docs/design/00-solution-architecture.md,
because the build and deploy steps look for them, and keep the
table, column and choice names, and the app name, exactly as the spec has them. A few rules
from the spec matter here:
- All data goes through the generated services, with no hand-written calls to Dataverse.
- The app only checks that required fields are filled. It never compares stock itself.
- Server errors are shown with the server's message unchanged.
- The barcode scan comes later, so don't build it now.

You can add extra screens, like a home screen with quick actions, as long as they follow
these rules. Where the spec leaves a design decision open, pick something sensible and
tell me what you chose.

If you get stuck, .lab-scripts/CP09-implement-ui.ps1 does the whole UI step. The code app
part is scaffold/05f-code-app.ps1 and the files under .lab-scripts/templates/05f-code-app/,
which are a good working example.

When you're done, run `dotnet build WarehouseManagement.slnx`. It also builds the code
app, which takes a couple of minutes. Fix anything it reports. Then save the checkpoint:

`.lab-scripts/save-checkpoint.ps1 -Id cp09 -Message "Add warehouse model-driven app, code app, views, forms, ribbon, and TALXIS Grid"`

It opens a pull request on the fork and waits. Give me the PR link and tell me to review it and
merge it on GitHub (Files changed, Merge pull request, Confirm). If the terminal shows "press Enter
to merge", also tell me to press Enter there once I've merged. Don't merge it yourself.
