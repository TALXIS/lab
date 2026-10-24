# Lab 3: User Interface

Depends on specifications [1](lab-1-data-model-and-security.md) and [2](lab-2-server-side-business-logic.md).

## Scope

Each persona gets an interface suited to their work, and both ship in one solution:

| Persona | Interface | Character |
|---|---|---|
| Warehouse manager (office) | **Warehouse app**, a model-driven app | Complete: every table, form and view, plus productivity aids |
| Warehouse worker (floor) | **Warehouse Picking**, a Power Apps code app | Narrow and fast: find an item, pick or restock it |

Neither interface decides whether a stock movement is allowed. That is the server's rule (specification 2); the interfaces show its outcome.

## Fixed and open design decisions

| Fixed: must match this specification | Open: left to the design |
|---|---|
| App, sitemap, view and web resource names | Form layout, tabs, sections and field order |
| Form script and ribbon behaviour, including message text | Colours, typography and component library |
| Grid customization behaviour | Additional views, charts and dashboards |
| Code app name, data sources and the outcomes in the user stories | Code app layout, navigation style and extra screens |
| The test-hook contract (test ids and element ids) | How each hooked element looks |

The browser scenarios in specification 5 exercise only the fixed parts. Any design that satisfies the user stories and passes those scenarios is acceptable.

## User stories: Warehouse app (manager)

### US-01 Find warehouse data

**As a** warehouse manager, **I want** one app with clear navigation to locations, items and transactions, **so that** I can get to any record in two clicks.

| # | Given | When | Then |
|---|---|---|---|
| 1 | I open the Warehouse app | The app loads | The sitemap shows area **Warehouse**, group **Management**, with **Warehouse Locations**, **Warehouse Items** and **Warehouse Transactions** |
| 2 | The app is open | I select **Warehouse Items** | The **Active Warehouse Items** view lists items with SKU, Category, Available Quantity, Unit Price, Location and Reorder Point |
| 3 | The app is open | I select **Warehouse Locations** or **Warehouse Transactions** | The **Active Warehouse Locations** or **Active Warehouse Transactions** view is shown |

### US-02 See a location's stock at a glance

**As a** warehouse manager, **I want** a location's items grouped and totalled, with low stock highlighted, **so that** I can spot what needs restocking without running a report.

| # | Given | When | Then |
|---|---|---|---|
| 1 | I open the Main Warehouse location | The form loads | Its items are shown in the TALXIS Grid, grouped by Category |
| 2 | The Grid has loaded | I look at the quantity column | Its header reads **Qty on hand** and each group shows a sum |
| 3 | An item's quantity is at or below its reorder point (Wireless Mouse: 5 ≤ 10) | The Grid shows it | Its quantity cell is highlighted |
| 4 | An item has no reorder point | Its quantity is 10 or less | Its quantity cell is highlighted |
| 5 | The Grid has loaded | The form is shown | An information notification reads `TALXIS Grid ready — {n} warehouse item(s) loaded` |

### US-03 Record a stock movement quickly

**As a** warehouse manager, **I want** the transaction form to fill in the date and total for me, **so that** I only enter what I know.

| # | Given | When | Then |
|---|---|---|---|
| 1 | I open a new transaction | The form loads | Transaction Date is set to now |
| 2 | I open an existing transaction with a date | The form loads | Transaction Date is unchanged |
| 3 | I have selected Office Laptop (unit price 899.00) | I enter a quantity of 2 | Total Value becomes 1,798.00 |
| 4 | The selected item has no unit price | I change the quantity | Total Value is unchanged and no error appears |
| 5 | I save an Outbound transaction above stock | The server refuses it | The form shows the server's message unchanged |

### US-04 Check an item's stock level

**As a** warehouse manager, **I want** a one-click stock check on an item, **so that** I know whether to reorder.

| # | Given | When | Then |
|---|---|---|---|
| 1 | I open an item | I select **Check Stock Levels** on the command bar | An alert titled **Stock Check** opens |
| 2 | Its quantity is at or below its reorder point | The alert opens | It reads `Stock level for {name}: {qty} units.`, a new line, then `⚠ Below reorder point ({reorder}). Consider restocking.` |
| 3 | Its quantity is above its reorder point | The alert opens | The second line reads `✓ Stock is above reorder point ({reorder}).` |
| 4 | The item has no name, quantity or reorder point | The alert opens | Name shows as `Unknown`; a missing quantity or reorder point counts as `0` |

### US-05 Review an item's history

**As a** warehouse manager, **I want** to see every transaction for an item on its form, **so that** I can explain its current stock.

| # | Given | When | Then |
|---|---|---|---|
| 1 | I open an item | The form loads | A **Warehouse Transactions** subgrid lists only that item's transactions, using the *Active Warehouse Transactions* view |

## User stories: Warehouse Picking (worker)

### US-06 Find an item

**As a** warehouse worker, **I want** a list of all items with their quantity on hand, **so that** I can find what I need to pick.

| # | Given | When | Then |
|---|---|---|---|
| 1 | I open Warehouse Picking | The home screen loads | Every item is listed with its quantity on hand |
| 2 | The list is shown | I select an item | Its detail screen opens, showing quantity on hand, category and location |

### US-07 Pick an item

**As a** warehouse worker, **I want** to record a pick from the item's screen, **so that** stock stays accurate as I work.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Office Laptop shows N on hand | I record an **Outbound** transaction for 5 with a name | A success message appears and quantity on hand shows N − 5, refreshed from the server |
| 2 | I leave the name, quantity or type empty | I submit | I'm told to fill all required fields and nothing is saved |
| 3 | I have recorded a transaction | I look at the item's transactions | The new transaction is listed first (newest first) |

### US-08 Restock an item

**As a** warehouse worker, **I want** to record goods received, **so that** new stock is available to pick.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Office Laptop shows N on hand | I record an **Inbound** transaction for 10 | Quantity on hand shows N + 10 |

### US-09 Be stopped from over-picking

**As a** warehouse worker, **I want** to be told clearly when I try to pick more than is in stock, **so that** I don't promise stock we don't have.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Wireless Mouse shows N on hand | I record an Outbound transaction for N + 1 | The message `Not enough product in stock. Available: N, requested: N+1.` is visible on screen |
| 2 | The pick was refused | I look at the item | Quantity on hand is still N |
| 3 | Any screen of the app | I enter a quantity above stock | The app sends it to the server; it doesn't block it itself |

### US-10 Add an item

**As a** warehouse worker, **I want** to add a new item from the floor, **so that** unexpected stock can be recorded straight away.

| # | Given | When | Then |
|---|---|---|---|
| 1 | I'm on the items list | I create an item with name, SKU, available quantity, category and (optionally) location | It appears in the list |

### US-11 See all stock movements

**As a** warehouse worker, **I want** a list of all transactions, **so that** I can see what happened on my shift.

| # | Given | When | Then |
|---|---|---|---|
| 1 | I open Transactions | The screen loads | All transactions are listed, newest first |
| 2 | I'm on Transactions | I create a transaction choosing any item | It's saved through the same server rules as US-07 and US-09 |

### US-12 See locations

**As a** warehouse worker, **I want** to see each location and how many items it holds, **so that** I know where to go.

| # | Given | When | Then |
|---|---|---|---|
| 1 | I open Locations | The screen loads | Each location is listed with its count of items |
| 2 | I'm on Locations | I create a location with name, address and capacity | It appears in the list |

## Technical specification

### Solution and model-driven app

| Item | Value |
|---|---|
| Solution | `src/Solutions.UI` (publisher `TALXISLab`, prefix `lab`), referenced by `Packages.Main` |
| Table references | `lab_warehouselocation`, `lab_warehouseitem`, `lab_warehousetransaction`, included as **existing** tables. The UI solution doesn't own them |
| Model-driven app | Unique name `lab_warehouseapp`, containing the three tables and their main forms |
| Sitemap | Area **Warehouse** → group **Management** → subareas **Warehouse Locations**, **Warehouse Items**, **Warehouse Transactions** |

**Main forms**: one per table, each containing every column listed.

| Form | Columns | Subgrid |
|---|---|---|
| Warehouse Location | Name, Capacity, Address, Is Active, Notes | **Warehouse Items**: related through `lab_locationid`, view *Active Warehouse Items*, rendered by the TALXIS Grid |
| Warehouse Item | Name, SKU, Available Quantity, Location, Description, Unit Price, Weight (kg), Category, Is Perishable, Expiration Date, Barcode, Reorder Point | **Warehouse Transactions**: related through `lab_itemid`, view *Active Warehouse Transactions* |
| Warehouse Transaction | Name, Item, Quantity, Transaction Type, Transaction Date, Notes, Total Value, Is Processed, Processed By, Reference Number | None |

Both subgrids are bound to their relationship, so each shows only the parent's records.

**Views**

| View | Table | Columns after the primary name |
|---|---|---|
| Active Warehouse Locations | Location | Address, Capacity, Is Active |
| Active Warehouse Items | Item | SKU, Category, Available Quantity, Unit Price, Location, Reorder Point |
| Active Warehouse Transactions | Transaction | Transaction Type, Item, Quantity, Transaction Date, Total Value |

### Script library

| Item | Value |
|---|---|
| Project | `src/Scripts.UI` (TypeScript, bundled with rollup), referenced by `Solutions.UI` |
| Web resource | `lab_main.js` |
| Global namespace | `WarehouseScripts` |
| Exported classes | `TransactionForm`, `RibbonActions`, `GridApi`, `LocationForm` |

| Handler | Registered on | Implements |
|---|---|---|
| `WarehouseScripts.TransactionForm.onLoad` | Transaction main form, OnLoad | US-03 #1–2 |
| `WarehouseScripts.TransactionForm.onQuantityChange` | Transaction main form, OnChange of `lab_quantity` | US-03 #3–4. Reads the price with `Xrm.WebApi.retrieveRecord("lab_warehouseitem", <id without braces>, "?$select=lab_unitprice")` and swallows failures |
| `WarehouseScripts.RibbonActions.checkStockLevels` | Ribbon button **Check Stock Levels** on the Item **form**, sequence 31, template alias `o1`, with a `PrimaryControl` parameter | US-04 |
| `WarehouseScripts.GridApi.onDatasetControlInitialized` | Called by the TALXIS Grid when its dataset exists | US-02 #2–4 |
| `WarehouseScripts.LocationForm.onLoad` | Location main form, OnLoad | US-02 #5. Notification id `talxisgrid`, level INFO. Works whether the form or the Grid loads first |

### TALXIS Grid on the Location form

The **Warehouse Items** subgrid uses the TALXIS Grid PCF control (package `TALXIS.Controls.Grid.Package`), keeping the subgrid's view and relationship.

| Parameter | Value |
|---|---|
| Columns | `lab_category` grouped; `lab_availablequantity` aggregated with `sum`; `lab_reorderpoint` hidden |
| EnableGrouping, EnableAggregation, EnableOptionSetColors | `true` |
| ClientApiWebresourceName | `lab_main.js` |
| ClientApiFunctionName | `WarehouseScripts.GridApi.onDatasetControlInitialized` |

The low-stock highlight colour is `#FDE7E9`. Group headers and empty cells are never highlighted.

### Warehouse Picking code app

| Item | Value |
|---|---|
| Project | `src/Apps.WarehousePicking`, in `WarehouseManagement.slnx`, referenced by `Solutions.UI` |
| App | Display name **Warehouse Picking**, app name `warehousepicking` |
| Stack | Vite, React, TypeScript, Power Apps SDK (`@microsoft/power-apps`) |
| Data sources | `lab_warehouseitem`, `lab_warehousetransaction`, `lab_warehouselocation`, through generated typed services (for example `Lab_warehouseitemsService`) |
| Local development | `npm run dev` → `http://localhost:5173` |

Rules that apply to every screen:

- All data access goes through the generated services; no hand-written calls to the Dataverse API.
- The only client-side validation is that required fields are filled. No stock comparison happens in the app.
- A transaction created from an item's screen saves `lab_name`, `lab_quantity`, `lab_transactiontype`, `lab_transactiondate` (now) and binds `lab_itemid` to that item.
- Server errors are shown to the user with the server's message unchanged.

### Test-hook contract

| Hook | Where | Purpose |
|---|---|---|
| `data-testid="warehouse-item-row"` | One per item on the items list; contains the item name and a link to its detail | Find and open an item |
| `data-testid="item-detail-qty"` | Item detail | Quantity on hand as a plain integer, nothing else |
| `data-testid="new-transaction-button"` | Item detail | Opens the new transaction form |
| `id="txName"`, `id="txQuantity"` | Inputs in that form | Name and quantity |
| `data-testid="tx-type-trigger"` | Type selector in that form | Opens options with `role=option` named **Inbound** and **Outbound** |
| `data-testid="submit-transaction"` | That form | Saves |

Specification 4 adds hooks for the barcode scan.

## Acceptance criteria

- [ ] `dotnet build WarehouseManagement.slnx` succeeds, including the script bundle and the code app.
- [ ] Every name in the technical specification matches.
- [ ] US-01 to US-12 pass in Dev, verified with a System Administrator account.
- [ ] No stock comparison exists in `Scripts.UI` or `Apps.WarehousePicking`.

## Design rationale

- **Two personas, two interfaces, one rule.** Both apps write through the same server logic, so neither re-implements it.
- **Interfaces as source.** A form or screen change is a reviewable diff.
- **Scripts assist, the server decides.** Form scripts set defaults and totals; the stock rule stays on the server.
