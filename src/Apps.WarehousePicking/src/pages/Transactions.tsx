import { Spinner, Subtitle1, Title2 } from "@fluentui/react-components"
import { useTransactions } from "@/hooks/use-warehouse"
import { TransactionForm } from "@/components/TransactionForm"
import { TransactionTable } from "@/components/TransactionTable"

export default function TransactionsPage() {
  const transactions = useTransactions()
  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <Title2>Transactions</Title2>
      <Subtitle1>New transaction</Subtitle1>
      <TransactionForm />
      <Subtitle1>All transactions (newest first)</Subtitle1>
      {transactions.isLoading ? <Spinner /> : <TransactionTable rows={transactions.data ?? []} />}
    </div>
  )
}
