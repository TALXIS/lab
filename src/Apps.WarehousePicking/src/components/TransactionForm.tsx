import { useState } from "react"
import { Button, Dropdown, Field, Input, MessageBar, MessageBarBody, Option, SpinButton } from "@fluentui/react-components"
import { useCreateTransaction, useItems } from "@/hooks/use-warehouse"
import { useToast } from "@/hooks/use-toast"
import { errorText, type TransactionType } from "@/utils/service"

type Props = { itemId?: string; itemName?: string }

// Records one stock movement. The app only checks that the fields are filled; the server decides.
export function TransactionForm({ itemId, itemName }: Props) {
  const toast = useToast()
  const items = useItems()
  const create = useCreateTransaction()
  const [selectedItem, setSelectedItem] = useState<string | undefined>(itemId)
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState<number | null>(null)
  const [type, setType] = useState<TransactionType | undefined>()
  const [error, setError] = useState<string>()

  const submit = async () => {
    setError(undefined)
    if (!selectedItem || !name.trim() || quantity == null || !type) {
      setError("Fill in all required fields.")
      return
    }
    try {
      await create.mutateAsync({ itemId: selectedItem, name: name.trim(), quantity, type })
      toast.success(`${type} of ${quantity} recorded`)
      setName("")
      setQuantity(null)
      setType(undefined)
    } catch (e) {
      setError(errorText(e))
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
      {itemId ? (
        <Field label="Item"><Input value={itemName ?? ""} disabled /></Field>
      ) : (
        <Field label="Item" required>
          <Dropdown
            placeholder="Select an item"
            selectedOptions={selectedItem ? [selectedItem] : []}
            value={items.data?.find((i) => i.lab_warehouseitemid === selectedItem)?.lab_name ?? ""}
            onOptionSelect={(_, d) => setSelectedItem(d.optionValue)}
          >
            {(items.data ?? []).map((i) => (
              <Option key={i.lab_warehouseitemid} value={i.lab_warehouseitemid}>{i.lab_name}</Option>
            ))}
          </Dropdown>
        </Field>
      )}
      <Field label="Name" required>
        <Input value={name} onChange={(_, d) => setName(d.value)} />
      </Field>
      <Field label="Quantity" required>
        <SpinButton min={1} value={quantity} onChange={(_, d) => {
          const v = d.value ?? (d.displayValue ? Number(d.displayValue) : null)
          setQuantity(v == null || Number.isNaN(v) ? null : v)
        }} />
      </Field>
      <Field label="Type" required>
        <Dropdown placeholder="Inbound or Outbound" selectedOptions={type ? [type] : []} value={type ?? ""}
          onOptionSelect={(_, d) => setType(d.optionValue as TransactionType)}>
          <Option value="Outbound">Outbound (pick)</Option>
          <Option value="Inbound">Inbound (restock)</Option>
        </Dropdown>
      </Field>
      {error && (
        <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>
      )}
      <Button appearance="primary" onClick={submit} disabled={create.isPending}>
        {create.isPending ? "Saving…" : "Record transaction"}
      </Button>
    </div>
  )
}
