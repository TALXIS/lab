import { useParams, Link } from "react-router-dom"
import { Body1, Card, MessageBar, MessageBarBody, Spinner, Subtitle1, Title2 } from "@fluentui/react-components"
import { useItem, useTransactions } from "@/hooks/use-warehouse"
import { TransactionForm } from "@/components/TransactionForm"
import { TransactionTable } from "@/components/TransactionTable"
import { LinkedProduct } from "@/components/LinkedProduct"
import { BarcodeScanDialog } from "@/components/BarcodeScanDialog"
import { errorText } from "@/utils/service"

export default function ItemDetailPage() {
  const { id = "" } = useParams()
  const item = useItem(id)
  const transactions = useTransactions(id)

  if (item.isLoading) return <Spinner label="Loading item…" />
  if (item.error || !item.data) {
    return <MessageBar intent="error"><MessageBarBody>{errorText(item.error ?? "Item not found")}</MessageBarBody></MessageBar>
  }
  const i = item.data

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <Link to="/">← Items</Link>
      <Title2>{i.lab_name}</Title2>
      <Card>
        <Body1><b>On hand:</b> {i.lab_availablequantity}</Body1>
        <Body1><b>Category:</b> {i.lab_categoryname ?? "—"}</Body1>
        <Body1><b>Location:</b> {i.lab_locationidname ?? "—"}</Body1>
        <Body1><b>SKU:</b> {i.lab_sku}</Body1>
      </Card>
      <LinkedProduct productId={i._lab_productid_value} productName={i.lab_productidname} />
      <div><BarcodeScanDialog itemId={id} hasProduct={!!i._lab_productid_value} /></div>
      <Subtitle1>Pick or restock</Subtitle1>
      <TransactionForm itemId={id} itemName={i.lab_name} />
      <Subtitle1>Transactions</Subtitle1>
      <TransactionTable rows={transactions.data ?? []} showItem={false} />
    </div>
  )
}
