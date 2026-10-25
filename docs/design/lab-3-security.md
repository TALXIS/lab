# Lab 3: Security

See [00-solution-architecture.md](00-solution-architecture.md) for conventions.

Depends on [specification 1](lab-1-data-model.md).

## Scope

This specification defines the security roles that govern access to the warehouse tables. The user interface (specification 4) is built for these roles.

## Deliverables

| Project | Kind | Relationships |
|---|---|---|
| `src/Solutions.Security` | Solution (publisher `TALXISLab`, prefix `lab`) | Referenced by `Packages.Main` |

## Security roles

Two roles in `Solutions.Security`. Depth **Basic** means records the user owns; **Global** means the whole organization.

| Table | Privilege | Warehouse worker | Warehouse manager |
|---|---|---|---|
| `lab_warehouselocation` | Read | Global | Global |
| | Create, Write, Delete | None | Global |
| | Append | None | Global |
| | Append To | Global | Global |
| `lab_warehouseitem` | Read, Create, Write | Global | Global |
| | Delete | None | Global |
| | Append, Append To | Global | Global |
| `lab_warehousetransaction` | Read | Global | Global |
| | Create | **Basic** | Global |
| | Write | **Basic** | Global |
| | Delete | None | Global |
| | Append | **Basic** | Global |
| | Append To | None | Global |

Role names are exactly **Warehouse worker** and **Warehouse manager**.

Rationale:

- **Create on transactions** is the pick itself; a worker records every pick and restock as a transaction.
- **Write (Global) on items** is required because the stock rule updates the item as the user who saved the transaction.
- **Write (Basic) on transactions** lets workers correct only their own transactions.
- **Append (Basic) on transactions, Append To (Global) on locations.** Setting a lookup needs Append on the record that holds it and Append To on the record it points to. Without them a worker can't fill in a transaction's Item, or an item's Location.
- **No Delete for workers.** Stock history is never removed by a worker.

## Acceptance criteria

- [ ] `dotnet build WarehouseManagement.slnx` succeeds.
- [ ] Both roles exist, with exactly the names **Warehouse worker** and **Warehouse manager**.
- [ ] Both roles' privileges match the matrix exactly, including **Basic** Create and Write on transactions for the worker.
- [ ] `Packages.Main` references `Solutions.Security`.

## Design rationale

- **Least privilege.** Each role gets only what its users need, at the narrowest depth that works.
- **Roles for personas, not people.** Two roles cover the two kinds of user; individual access is a matter of assignment, not of new roles.
- **Security as source.** The matrix is a reviewable file, so a privilege change is a reviewed diff.
