import { RecordFormDialog } from "@/components/RecordFormDialog";
import type { FormField } from "@/components/RecordFormFields";
import { useCreateItem } from "@/hooks/UseCreateItem";
import { usePickItems, type PickItem } from "@/hooks/UsePickItems";
import type { IColumn } from "@talxis/client-libraries";
import { useToast } from "@/hooks/use-toast";
import { categoryOptionMetadata } from "@/utils/OptionSets";
import { errorText } from "@/utils/StockTransactions";

// A new item's fields: what it is (name, SKU, category) is required, where it lives and its barcode
// are not. A scanned barcode and a name from a catalog arrive as starting values.
const fields: FormField[] = [
  { column: { name: "lab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "lab_sku", displayName: "SKU", dataType: "SingleLine.Text" }, required: true },
  { column: { name: "lab_category", displayName: "Category", dataType: "OptionSet", metadata: { OptionSet: categoryOptionMetadata } as IColumn["metadata"] }, required: true },
  { column: { name: "lab_locationid", displayName: "Location", dataType: "SingleLine.Text" }, lookupEntity: "lab_warehouselocation" },
  { column: { name: "lab_barcode", displayName: "Barcode", dataType: "SingleLine.Text" } },
];

type NewItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Starting values: the scanned barcode, a name typed in the search or found in a catalog. */
  defaults?: { name?: string; barcode?: string };
  onCreated: (item: PickItem) => void;
};

// Creates a warehouse item from the Receive screen, then hands it back to carry on receiving it.
export function NewItemDialog({ open, onOpenChange, defaults, onCreated }: NewItemDialogProps) {
  const create = useCreateItem();
  const toast = useToast();
  const { locationRecords } = usePickItems();

  return (
    <RecordFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New item"
      entityName="lab_warehouseitem"
      fields={fields}
      lookupRecords={{ lab_locationid: locationRecords }}
      defaults={{ lab_name: defaults?.name, lab_barcode: defaults?.barcode }}
      pending={create.isPending}
      onCreate={async (values) => {
        try {
          onCreated(await create.mutateAsync({ values }));
        } catch (error) {
          // The form keeps the entered values; say why nothing was created
          toast.error("Failed to create item: " + errorText(error));
          throw error;
        }
      }}
    />
  );
}

