import { useState } from "react"
import {
  Button, Field, Input, MessageBar, MessageBarBody, SpinButton, Spinner, Subtitle1, Table, TableBody, TableCell,
  TableHeader, TableHeaderCell, TableRow, Title2,
} from "@fluentui/react-components"
import { useCreateLocation, useItems, useLocations } from "@/hooks/use-warehouse"
import { useToast } from "@/hooks/use-toast"
import { errorText } from "@/utils/service"

export default function LocationsPage() {
  const locations = useLocations()
  const items = useItems()
  const create = useCreateLocation()
  const toast = useToast()
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [capacity, setCapacity] = useState<number | null>(null)
  const [error, setError] = useState<string>()

  const count = (id: string) => (items.data ?? []).filter((i) => i._lab_locationid_value === id).length

  const save = async () => {
    setError(undefined)
    if (!name.trim() || !address.trim() || capacity == null) {
      setError("Fill in all required fields.")
      return
    }
    try {
      await create.mutateAsync({ name: name.trim(), address: address.trim(), capacity })
      toast.success(`${name} added`)
      setName(""); setAddress(""); setCapacity(null)
    } catch (e) {
      setError(errorText(e))
    }
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <Title2>Locations</Title2>
      {locations.isLoading ? <Spinner /> : (
        <Table aria-label="Locations">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Address</TableHeaderCell>
              <TableHeaderCell>Capacity</TableHeaderCell>
              <TableHeaderCell>Items</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(locations.data ?? []).map((l) => (
              <TableRow key={l.lab_warehouselocationid}>
                <TableCell>{l.lab_name}</TableCell>
                <TableCell>{l.lab_address}</TableCell>
                <TableCell>{l.lab_capacity}</TableCell>
                <TableCell>{count(l.lab_warehouselocationid)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Subtitle1>New location</Subtitle1>
      <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
        <Field label="Name" required><Input value={name} onChange={(_, d) => setName(d.value)} /></Field>
        <Field label="Address" required><Input value={address} onChange={(_, d) => setAddress(d.value)} /></Field>
        <Field label="Capacity" required>
          <SpinButton min={0} value={capacity} onChange={(_, d) => {
            const v = d.value ?? (d.displayValue ? Number(d.displayValue) : null)
            setCapacity(v == null || Number.isNaN(v) ? null : v)
          }} />
        </Field>
        {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
        <Button appearance="primary" onClick={save} disabled={create.isPending}>Add location</Button>
      </div>
    </div>
  )
}
