# Lab 2: Server-Side Business Logic

Depends on [specification 1](lab-1-data-model.md).

## Scope

Dataverse enforces two stock rules whenever a Warehouse Transaction is **created**, regardless of which app, script, flow or integration creates it:

1. **No over-picking.** An Outbound transaction may not take more than the item has in stock. The save is refused with a fixed error message.
2. **Stock follows transactions.** Every saved transaction changes the item's available quantity: Inbound adds, Outbound subtracts.

## Deliverables

| Project | Kind | Relationships |
|---|---|---|
| `src/Plugins.Warehouse` | Signed plugin assembly, .NET Framework 4.7.2 | Included in `WarehouseManagement.slnx` |
| `src/Solutions.Logic` | Solution (publisher `TALXISLab`, prefix `lab`) | References `Plugins.Warehouse`; referenced by `Packages.Main` |

`Solutions.Logic` contains the plugin assembly registration and two processing steps. Both plugin classes are in namespace `Plugins.Warehouse`, derive from a shared `PluginBase`, accept the standard `(string unsecureConfiguration, string secureConfiguration)` constructor, and implement `ExecuteDataversePlugin(ILocalPluginContext)`.

## Step registrations

| | Validation | Stock |
|---|---|---|
| Class | `ValidateWarehouseTransactionPlugin` | `SubtractQuantityPlugin` |
| Message | Create | Create |
| Primary table | `lab_warehousetransaction` | `lab_warehousetransaction` |
| Stage | **Pre-validation** (10) | **Post-operation** (40) |
| Mode | Synchronous | Synchronous |
| Filtering attributes, images, configuration | None | None |

Neither step is registered on Update or Delete. Later changes to a transaction, such as marking it processed (specification 5), never move stock.

## Rule 1: ValidateWarehouseTransactionPlugin

1. If the target isn't a `lab_warehousetransaction` entity, do nothing.
2. If the target lacks any of `lab_quantity`, `lab_itemid` or `lab_transactiontype`, do nothing.
3. If `lab_transactiontype` isn't **Outbound** (`100000001`), do nothing. Inbound is never validated.
4. Retrieve the item referenced by `lab_itemid`, reading only `lab_availablequantity`. Treat a missing value as `0`.
5. If `quantity > available`, throw `InvalidPluginExecutionException` with this message:

```text
Not enough product in stock. Available: {available}, requested: {quantity}.
```

Taking exactly the available quantity is allowed. Any other exception is written to the tracing service and rethrown. Data access uses an organization service for the calling user (`context.UserId`).

The message text is part of the interface: the user interfaces display it unchanged and the tests check it.

## Rule 2: SubtractQuantityPlugin

1. If the target isn't a `lab_warehousetransaction` entity, or lacks `lab_quantity`, `lab_itemid` or `lab_transactiontype`, do nothing.
2. Retrieve the item's `lab_availablequantity` (missing means `0`).
3. **Inbound** (`100000000`): set it to `available + quantity`. **Outbound** (`100000001`): set it to `available - quantity`. Any other value: do nothing.
4. Update the item, using an organization service for the calling user.

The step is synchronous and Post-operation, so it runs inside the database transaction: if the item update fails, the transaction record is rolled back as well.

## Acceptance criteria

Starting quantities are read before each check, since other activity may have changed them.

| # | Given | When | Then |
|---|---|---|---|
| 1 | Wireless Mouse has N in stock | An **Outbound** transaction for N + 1 is created | The save is refused with `Not enough product in stock. Available: N, requested: N+1.` and stock stays N |
| 2 | Office Laptop has N in stock | An **Outbound** transaction for 5 is created | The save succeeds and stock is N − 5 |
| 3 | Office Laptop has N in stock | An **Inbound** transaction for 10 is created | Stock is N + 10 |
| 4 | Wireless Mouse has N in stock | An **Outbound** transaction for exactly N is created | The save succeeds and stock is 0 |
| 5 | An existing transaction | Any column on it is updated | Stock is unchanged |

- [ ] `dotnet build WarehouseManagement.slnx` succeeds.
- [ ] `Solutions.Logic` contains the assembly and exactly the two steps in the registration table.
- [ ] The package and reference data import into Dev without errors.
- [ ] All five scenarios pass in Dev.

## Design rationale

- **A rule in the browser is not a rule.** Anything that writes to Dataverse bypasses a check that lives only in a screen, so the rule lives on the server.
- **Pre-validation rejects cheaply.** It runs before the database transaction starts.
- **Post-operation keeps data consistent.** The transaction record and the stock change commit or roll back together.
- **Create only.** Stock moves once per transaction, when it's recorded.
