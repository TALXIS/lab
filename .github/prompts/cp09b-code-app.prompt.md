---
agent: agent
description: CP09b - implement the Warehouse Picking code app (Lab 4)
---

Please implement the Warehouse Picking code app from docs/design/lab-4-user-interface.md,
using the TALXIS skills. That's user stories US-06 to US-17 and the technical
specification section "Warehouse Picking code app".

Start from the `pp-app-code` starter. It comes with Fluent UI and the TALXIS base controls.
Build these screens, as the spec's Screens, Layout and Controls rows describe them:

1. Home: the four quick-action tiles, and the header with Home, Items, Transactions, Locations
2. Pick stock: choose an item (search by name, SKU or barcode), quantity stepper, confirm, result
3. Receive stock: scan or search for the item (or create it), quantity, confirm, result
4. Take inventory: count an item, the difference is booked as a stock-count transaction
5. Find item: search, open the item's page
6. Items list with the New item dialog, and the item page with its transaction form and history
7. Transactions list (newest first) with a new-transaction form
8. Locations list with item counts and a new-location form

`.lab-scripts/templates/05f-code-app/` is the reference design for all of this: the same
screens, the same controls (base-controls `Grid`, `Form`, `Lookup`), the phone layout and the
test ids CP14 looks for. Copying files from it and adapting them is fine. Reference the app
from the UI solution the previous prompt created.

Work under src/ and the solution file. Use the project names from the project table in docs/design/00-solution-architecture.md,
because the build and deploy steps look for them, and keep the
table, column and choice names, and the app name, exactly as the spec has them. A few rules
from the spec matter here:
- All data goes through the generated services, with no hand-written calls to Dataverse.
- The app only checks that required fields are filled. It never compares stock itself, and
  the pick screen's stepper doesn't stop at the stock on hand.
- Server errors are shown with the server's message unchanged.
- A lookup comes back as `_lab_locationid_value` only: load the locations and map the id to
  its name. There is no `lab_locationidname`.
- Keep the `data-testid`s the spec's Test hooks row lists.
- The barcode scan comes later, so don't build it now.

This is a lot of UI. Keep going until every screen above exists, and before you finish go
through the list and tell me which items are done. If something is missing, do it before
telling me to continue. Don't make up test records; CP12 loads the real data later.

If you get stuck, .lab-scripts/CP09-implement-ui.ps1 does the whole UI step. The code app
part is scaffold/05f-code-app.ps1 and the files under .lab-scripts/templates/05f-code-app/.

When you're done, run `dotnet build WarehouseManagement.slnx`. It also builds the code
app, which takes a couple of minutes. Fix anything it reports. Then save the checkpoint:

`.lab-scripts/save-checkpoint.ps1 -Id cp09 -Message "Add warehouse model-driven app, code app, views, forms, ribbon, and TALXIS Grid"`

It opens a pull request on the fork and waits. Give me the PR link and tell me to review it and
merge it on GitHub (Files changed, Merge pull request, Confirm). Don't merge it yourself.
