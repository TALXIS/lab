import { RecordFormDialog } from "@/components/RecordFormDialog";
import type { FormField } from "@/components/RecordFormFields";
import { useCreateItem } from "@/hooks/UseCreateItem";
import { usePickItems, type PickItem } from "@/hooks/UsePickItems";
import type { IColumn } from "@talxis/client-libraries";
import { useToast } from "@/hooks/use-toast";
import { categoryOptionMetadata } from "@/utils/OptionSets";
import { errorText } from "@/utils/StockTransactions";
import type { BarcodeProduct } from "@/utils/BarcodeLookup";

// A new item's fields: what it is (name, SKU, category) is required, where it lives and its barcode
// are not. A scanned barcode and a name from a catalog arrive as starting values.
const fields: FormField[] = [
  { column: { name: "almlab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "almlab_sku", displayName: "SKU", dataType: "SingleLine.Text" }, required: true },
  { column: { name: "almlab_category", displayName: "Category", dataType: "OptionSet", metadata: { OptionSet: categoryOptionMetadata } as IColumn["metadata"] }, required: true },
  { column: { name: "almlab_locationid", displayName: "Location", dataType: "SingleLine.Text" }, lookupEntity: "almlab_warehouselocation" },
  { column: { name: "almlab_barcode", displayName: "Barcode", dataType: "SingleLine.Text" } },
];

type NewItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Starting values: the scanned barcode, a name typed in the search or found in a catalog. */
  defaults?: { name?: string; barcode?: string };
  /** Present when a catalog knows the barcode: links the new item to its catalog record. */
  product?: BarcodeProduct | null;
  onCreated: (item: PickItem) => void;
};

// Creates a warehouse item from the Receive screen, then hands it back to carry on receiving it.
export function NewItemDialog({ open, onOpenChange, defaults, product, onCreated }: NewItemDialogProps) {
  const create = useCreateItem();
  const toast = useToast();
  const { locationRecords } = usePickItems();

  return (
    <RecordFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New item"
      entityName="almlab_warehouseitem"
      fields={fields}
      lookupRecords={{ almlab_locationid: locationRecords }}
      defaults={{ almlab_name: defaults?.name, almlab_barcode: defaults?.barcode }}
      pending={create.isPending}
      onCreate={async (values) => {
        try {
          onCreated(await create.mutateAsync({ values, ensureProductId: product?.ensureProductId }));
        } catch (error) {
          // The form keeps the entered values; say why nothing was created
          toast.error("Failed to create item: " + errorText(error));
          throw error;
        }
      }}
    />
  );
}
