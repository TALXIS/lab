import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from "@fluentui/react-components"
import type { Lab_warehousetransactions } from "@/generated/models/Lab_warehousetransactionsModel"

export function TransactionTable({ rows, showItem = true }: { rows: Lab_warehousetransactions[]; showItem?: boolean }) {
  return (
    <Table size="small" aria-label="Transactions">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          {showItem && <TableHeaderCell>Item</TableHeaderCell>}
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Quantity</TableHeaderCell>
          <TableHeaderCell>Date</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => (
          <TableRow key={t.lab_warehousetransactionid}>
            <TableCell>{t.lab_name}</TableCell>
            {showItem && <TableCell>{t.lab_itemidname}</TableCell>}
            <TableCell>{t.lab_transactiontypename}</TableCell>
            <TableCell>{t.lab_quantity}</TableCell>
            <TableCell>{t.lab_transactiondate ? new Date(t.lab_transactiondate).toLocaleString() : ""}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
