import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Dropdown, Field, Input,
  MessageBar, MessageBarBody, Option, SpinButton, Spinner, Table, TableBody, TableCell, TableHeader,
  TableHeaderCell, TableRow, Title2,
} from "@fluentui/react-components"
import { useCreateItem, useItems, useLocations } from "@/hooks/use-warehouse"
import { useToast } from "@/hooks/use-toast"
import { CATEGORY, errorText } from "@/utils/service"

export default function ItemsPage() {
  const items = useItems()
  const navigate = useNavigate()

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title2>Items</Title2>
        <NewItemDialog />
      </div>
      {items.isLoading && <Spinner label="Loading items…" />}
      {items.error && <MessageBar intent="error"><MessageBarBody>{errorText(items.error)}</MessageBarBody></MessageBar>}
      <Table aria-label="Items">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>SKU</TableHeaderCell>
            <TableHeaderCell>On hand</TableHeaderCell>
            <TableHeaderCell>Location</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(items.data ?? []).map((i) => (
            <TableRow key={i.lab_warehouseitemid} onClick={() => navigate(`/items/${i.lab_warehouseitemid}`)} style={{ cursor: "pointer" }}>
              <TableCell>{i.lab_name}</TableCell>
              <TableCell>{i.lab_sku}</TableCell>
              <TableCell>{i.lab_availablequantity}</TableCell>
              <TableCell>{i.lab_locationidname}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function NewItemDialog() {
  const toast = useToast()
  const locations = useLocations()
  const create = useCreateItem()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [quantity, setQuantity] = useState<number | null>(null)
  const [category, setCategory] = useState<string>()
  const [locationId, setLocationId] = useState<string>()
  const [error, setError] = useState<string>()

  const save = async () => {
    setError(undefined)
    if (!name.trim() || !sku.trim() || quantity == null || !category) {
      setError("Fill in all required fields.")
      return
    }
    try {
      await create.mutateAsync({ name: name.trim(), sku: sku.trim(), quantity, category: CATEGORY[category as keyof typeof CATEGORY], locationId })
      toast.success(`${name} added`)
      setOpen(false)
      setName(""); setSku(""); setQuantity(null); setCategory(undefined); setLocationId(undefined)
    } catch (e) {
      setError(errorText(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, d) => setOpen(d.open)}>
      <Button appearance="primary" onClick={() => setOpen(true)}>New item</Button>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>New item</DialogTitle>
          <DialogContent style={{ display: "grid", gap: 12 }}>
            <Field label="Name" required><Input value={name} onChange={(_, d) => setName(d.value)} /></Field>
            <Field label="SKU" required><Input value={sku} onChange={(_, d) => setSku(d.value)} /></Field>
            <Field label="Available quantity" required>
              <SpinButton min={0} value={quantity} onChange={(_, d) => {
                const v = d.value ?? (d.displayValue ? Number(d.displayValue) : null)
                setQuantity(v == null || Number.isNaN(v) ? null : v)
              }} />
            </Field>
            <Field label="Category" required>
              <Dropdown selectedOptions={category ? [category] : []} value={category ?? ""} onOptionSelect={(_, d) => setCategory(d.optionValue)}>
                {Object.keys(CATEGORY).map((c) => <Option key={c} value={c}>{c}</Option>)}
              </Dropdown>
            </Field>
            <Field label="Location">
              <Dropdown selectedOptions={locationId ? [locationId] : []}
                value={locations.data?.find((l) => l.lab_warehouselocationid === locationId)?.lab_name ?? ""}
                onOptionSelect={(_, d) => setLocationId(d.optionValue)}>
                {(locations.data ?? []).map((l) => <Option key={l.lab_warehouselocationid} value={l.lab_warehouselocationid}>{l.lab_name}</Option>)}
              </Dropdown>
            </Field>
            {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button appearance="primary" onClick={save} disabled={create.isPending}>Save</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
