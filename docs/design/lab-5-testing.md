# Lab 5: Testing

Depends on specifications 1 to 4.

## Scope

Automated tests prove the system meets specifications 1 to 4 at three levels:

| Level | Tool | Runs against | Speed |
|---|---|---|---|
| Plugin unit tests | FakeXrmEasy (in-memory Dataverse) | The compiled plugins | Milliseconds |
| Script unit tests | Jest with a mocked `Xrm` | The built `lab_main.js` | Milliseconds |
| Browser scenarios | Reqnroll (Gherkin) and Playwright | The Dev environment and the code app | Minutes |

These tests are the acceptance gate. Where specification 3 leaves the design open, they determine whether a design is acceptable.

## Part A: Plugin unit tests

| Item | Value |
|---|---|
| Project | `src/Tests.Plugins`, targeting **net10.0** with FakeXrmEasy 3.x and MSTest, in `WarehouseManagement.slnx` |
| Reference to the plugins | A `<ProjectReference>` to `../Plugins.Warehouse/Plugins.Warehouse.csproj`, declared in the project file. The plugins target net462; the resulting `NU1702` warning is expected |
| Run | `dotnet test src/Tests.Plugins/Tests.Plugins.csproj` |

Each test seeds an item in the in-memory Dataverse, runs one plugin with a transaction `Target` holding `lab_itemid`, `lab_quantity` and `lab_transactiontype`, and reads the result. Constants: `Inbound = 100000000`, `Outbound = 100000001`.

| Class | Test | Seed | Transaction | Expected |
|---|---|---|---|---|
| `ValidateWarehouseTransactionPluginTests` | `Outbound_With_Enough_Stock_Does_Not_Throw` | 10 in stock | Outbound 3 | No exception; item still has 10 |
| | `Outbound_With_Too_High_Quantity_Throws` | 5 | Outbound 10 | Exactly `InvalidPluginExecutionException`; message contains `Not enough product in stock`, `Available: 5` and `requested: 10` |
| | `Inbound_Is_Not_Validated` | 0 | Inbound 100 | No exception |
| `SubtractQuantityPluginTests` | `Outbound_Subtracts_Quantity_From_Item` | 10 | Outbound 3 | Item has 7 |
| | `Inbound_Adds_Quantity_To_Item` | 10 | Inbound 5 | Item has 15 |

## Part B: Script unit tests

| Item | Value |
|---|---|
| Project | `src/Tests.Scripts`, testing `../Scripts.UI/build/lab_main.js` |
| Under test | The built bundle, the same file deployed as the web resource, called through the `WarehouseScripts` global |
| Run | Build `src/Scripts.UI`, then `dotnet test src/Tests.Scripts/Tests.Scripts.csproj` (runs Jest) |

| File | Test | Arrange | Expected |
|---|---|---|---|
| `transactionForm.test.js` | onLoad defaults transaction date to today when empty | Date empty | `setValue` called once with a `Date` |
| | onLoad keeps an already filled transaction date | Date has a value | `setValue` not called |
| | onQuantityChange recalculates total value from unit price | Quantity 4, item `{e3588fd9-c98c-4c13-9b75-5ff09688b468}`, price lookup returns `{ lab_unitprice: 25 }` | `retrieveRecord("lab_warehouseitem", "e3588fd9-c98c-4c13-9b75-5ff09688b468", "?$select=lab_unitprice")`; Total Value set to `100` |
| `ribbonActions.test.js` | checkStockLevels warns when stock is at or below reorder point | Printer, quantity 3, reorder point 5 | One alert titled `Stock Check`; text contains `Stock level for Printer: 3 units.` and `Below reorder point (5)` |
| | checkStockLevels reports healthy stock above reorder point | Monitor, quantity 20, reorder point 5 | Text contains `Stock is above reorder point (5)` |

## Part C: Browser scenarios

| Item | Value |
|---|---|
| Project | `src/Tests.UI` (Reqnroll and Playwright), in `WarehouseManagement.slnx` |
| Model-driven app steps | Shared, generic bindings in `Support/Bindings/` for sign-in, app navigation, sitemap and views |
| Code app steps | `StepDefinitions/WarehousePickingSteps.cs` |
| Selectors | Elements are located by the test hooks in specifications 3 and 4 (test ids, `#txName`, `#txQuantity`, role `option`, role `link`). Visible text is used only to narrow to a named item or option, or to assert a message. No fixed waits |

### Features

`WarehouseItemNavigation.feature`:

```gherkin
Feature: WarehouseItemNavigation

Scenario: User can open a warehouse item from the main view
    Given I am logged in as '<test user>'
    And I open the 'lab_warehouseapp' app
    When I click on 'Warehouse Items' in the sitemap
    Then I should see the 'Active Warehouse Items' view
```

`WarehousePicking.feature`:

```gherkin
Feature: Warehouse Picking
    As a warehouse floor worker
    I want to pick and restock items from the code app
    So that available quantities stay accurate and over-picking is blocked

    Background:
        Given I am logged in as '<test user>'
        And I open the warehouse picking app

    Scenario: Not enough stock blocks the pick
        Given I open the 'Wireless Mouse' item
        When I try to pick more than the available quantity
        Then I should see an error that the requested quantity exceeds the available stock

    Scenario: A valid pick updates the available quantity
        Given I open the 'Office Laptop' item
        When I pick a quantity of '5'
        Then the quantity on hand should have decreased by '5'

    Scenario: Scanning a barcode links product data to an item
        Given I open the 'Wireless Mouse' item
        When I enter the barcode '3017620422003' and look it up
        Then I should see the product 'Nutella' in the scan preview
        When I link the scanned product to the item
        Then the item should show 'Nutella' as its linked product
```

`<test user>` is the account the tests sign in as.

### Code app step definitions

| Step | Behaviour |
|---|---|
| I open the warehouse picking app | Go to `TXC_CODEAPP_URL` (default `http://localhost:5173`); wait for the first `warehouse-item-row` |
| I open the '{name}' item | Select the link in the `warehouse-item-row` containing the name; record the starting quantity from `item-detail-qty` |
| I pick a quantity of '{n}' | `new-transaction-button` → fill `#txName` (a unique name) and `#txQuantity` → `tx-type-trigger` → option **Outbound** → `submit-transaction` |
| I try to pick more than the available quantity | The same, with the starting quantity + 1 |
| …error that the requested quantity exceeds the available stock | Text containing `Not enough product in stock. Available: {start}, requested: {start+1}.` is visible |
| …decreased by '{n}' | `item-detail-qty` shows the starting quantity − n |
| I enter the barcode '{ean}' and look it up | `scan-barcode-button` → fill `scan-ean-input` → `scan-lookup-button` |
| …the product '{name}' in the scan preview | `scan-product-name` has exactly that text |
| I link the scanned product to the item | `scan-link-button` |
| …'{name}' as its linked product | `linked-product-name` contains the name |

Assertions are relative to the quantity read on screen, never to reference data values. Dev is shared and has no teardown, so quantities change over time.

### Configuration

`src/Tests.UI/appsettings.json`:

| Key | Value |
|---|---|
| `EnvironmentUrl` | The Dev environment URL |
| `AppName` | `Warehouse Management` |
| `Headless` | `true` |
| `SlowMo` | `0` |
| `Timeout` | `60000` |
| `StorageStatePath` | Absolute path to a saved Playwright sign-in state (a relative path is ignored) |
| `ScreenshotOnFailure` | `true` |
| `TracingEnabled` | `false` |
| `OutputPath` | `TestResults` |

Environment variables override these at run time: `TXC_ENVIRONMENT_URL`, `TXC_APP_NAME`, `TXC_HEADLESS`, `TXC_SLOWMO`, `TXC_TIMEOUT`, `TXC_STORAGE_STATE_PATH`, `TXC_SCREENSHOT_ON_FAILURE`, `TXC_TRACING_ENABLED`. `TXC_CODEAPP_URL` sets the code app URL.

Each test starts signed out and loads a saved sign-in state, captured once in a visible browser:

```powershell
playwright-cli open --browser=msedge --headed <dev-environment-url>
playwright-cli state-save src/Tests.UI/auth-state.json
playwright-cli close
```

The saved state is a credential and is never committed. Scenarios run with a System Administrator account.

Run: `dotnet test src/Tests.UI/Tests.UI.csproj`.

## Part D: Continuous integration

| Workflow | Trigger | Runs |
|---|---|---|
| `.github/workflows/unit-tests.yml` | Pull requests, and pushes to `main` | Plugin tests, then a `Scripts.UI` build, then script tests (.NET 10, Release) |
| `.github/workflows/test.yml` | Manual (`workflow_dispatch`) | Browser scenarios with `TXC_HEADLESS=true` |

## Acceptance criteria

- [ ] All 5 plugin tests pass.
- [ ] All 5 script tests pass.
- [ ] All 4 browser scenarios pass against Dev.
- [ ] **Each test can fail.** Removing the `throw` in `ValidateWarehouseTransactionPlugin` makes `Outbound_With_Too_High_Quantity_Throws` and *Not enough stock blocks the pick* fail; restoring it makes them pass.
- [ ] `unit-tests.yml` passes on a pull request.

## Test backlog

| Test | Closes this gap |
|---|---|
| `Outbound_Equal_To_Available_Does_Not_Throw` (5 in stock, Outbound 5, no exception) | No current test picks exactly the available stock, so changing `>` to `>=` goes undetected |
| Scenario *An Inbound restock raises the available quantity* | US-08 has no browser scenario |
| A check that **Process transactions** marks a transaction processed without changing stock | Specification 4, Part E has no automated test |

## Design rationale

- **Fast tests underneath, few slow ones on top.** Unit tests run in milliseconds and pinpoint failures; browser scenarios prove the whole path.
- **Gherkin is readable by the business.** The same feature file describes the behaviour and verifies it.
- **Tests describe what users expect.** A test is changed only when the expected behaviour changes, never to make failing code pass.
- **A test that can't fail proves nothing.** Breaking a rule deliberately confirms the gate works.
