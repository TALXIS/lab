import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Almlab_warehouseitemsService } from "@/generated/services/Almlab_warehouseitemsService";
import { Almlab_warehouselocationsService } from "@/generated/services/Almlab_warehouselocationsService";
import type { Almlab_warehouseitems } from "@/generated/models/Almlab_warehouseitemsModel";
import type { Almlab_warehouselocations } from "@/generated/models/Almlab_warehouselocationsModel";
import { categoryOptionMetadata, statusOptions } from "@/utils/OptionSets";
import {
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components";
import { BoxRegular } from "@fluentui/react-icons";
import type { IColumn } from "@talxis/client-libraries";
import { PageHeader } from "@/components/PageHeader";
import { RecordGrid } from "@/components/RecordGrid";
import { RecordFormDialog } from "@/components/RecordFormDialog";
import type { FormField } from "@/components/RecordFormFields";
import { useToast } from "@/hooks/use-toast";
import { useStyles } from "@/styles/WarehouseItems.styles";
import { servicePayload } from "@/utils/ServicePayload";

const columns: IColumn[] = [
  { name: "almlab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true, visualSizeFactor: 220 },
  { name: "almlab_sku", displayName: "SKU", dataType: "SingleLine.Text", visualSizeFactor: 130 },
  { name: "almlab_availablequantity", displayName: "Available Qty", dataType: "Whole.None", visualSizeFactor: 120 },
  { name: "almlab_category", displayName: "Category", dataType: "OptionSet", visualSizeFactor: 140, metadata: { OptionSet: categoryOptionMetadata } as IColumn["metadata"] },
  { name: "location", displayName: "Location", dataType: "SingleLine.Text", visualSizeFactor: 150 },
  { name: "statecode", displayName: "Status", dataType: "OptionSet", visualSizeFactor: 110, metadata: { OptionSet: statusOptions } as IColumn["metadata"] },
  { name: "createdon", displayName: "Created", dataType: "DateAndTime.DateOnly", visualSizeFactor: 120 },
];

// The New Item form: name, SKU, quantity (no negatives) and category are required; the location
// is optional and picked through a RecordLookup (it holds the location's id).
const formFields: FormField[] = [
  { column: { name: "almlab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "almlab_sku", displayName: "SKU", dataType: "SingleLine.Text" }, required: true },
  { column: { name: "almlab_availablequantity", displayName: "Available Quantity", dataType: "Whole.None", metadata: { MinValue: 0 } as IColumn["metadata"] }, required: true },
  { column: { name: "almlab_category", displayName: "Category", dataType: "OptionSet", metadata: { OptionSet: categoryOptionMetadata } as IColumn["metadata"] }, required: true },
  { column: { name: "almlab_locationid", displayName: "Location", dataType: "SingleLine.Text" }, lookupEntity: "almlab_warehouselocation" },
];

export default function WarehouseItemsPage() {
  const styles = useStyles();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: items, error } = useQuery({
    queryKey: ["warehouseItems"],
    queryFn: async () => {
      const result = await Almlab_warehouseitemsService.getAll({
        select: [
          "almlab_warehouseitemid",
          "almlab_name",
          "almlab_sku",
          "almlab_availablequantity",
          "almlab_category",
          "_almlab_locationid_value",
          "createdon",
          "statecode",
        ],
        orderBy: ["almlab_name asc"],
      });
      return result.data ?? [];
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["warehouseLocations"],
    queryFn: async () => {
      const result = await Almlab_warehouselocationsService.getAll({
        select: ["almlab_warehouselocationid", "almlab_name"],
        orderBy: ["almlab_name asc"],
      });
      return result.data ?? [];
    },
  });

  const locationRecords = useMemo(
    () =>
      (locations ?? []).map((loc: Almlab_warehouselocations) => ({
        id: loc.almlab_warehouselocationid,
        name: loc.almlab_name ?? "",
      })),
    [locations]
  );

  // Grid rows: numbers for numeric/option set columns, and the location lookup resolved to its name
  const rows = useMemo(() => {
    if (!items) return undefined;
    const locationNames = new Map(locationRecords.map((loc) => [loc.id, loc.name]));
    return items.map((item: Almlab_warehouseitems) => ({
      ...item,
      almlab_availablequantity: Number(item.almlab_availablequantity),
      almlab_category: Number(item.almlab_category),
      statecode: Number(item.statecode),
      location: locationNames.get(item._almlab_locationid_value ?? "") ?? "",
    }));
  }, [items, locationRecords]);

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      return Almlab_warehouseitemsService.create(servicePayload({
        almlab_name: values.almlab_name,
        almlab_sku: values.almlab_sku,
        almlab_availablequantity: String(values.almlab_availablequantity),
        // Option set values come out of the form as strings
        almlab_category: Number(values.almlab_category),
        ...(values.almlab_locationid
          ? { "almlab_locationid@odata.bind": `/almlab_warehouselocations(${values.almlab_locationid})` }
          : {}),
      }));
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["warehouseItems"] });
      toast.success("Item created successfully");
    },
    onError: (err) => {
      toast.error("Failed to create item: " + String(err));
    },
  });

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<BoxRegular />}
        title="Warehouse Items"
        subtitle="Manage your warehouse inventory"
      />

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>Failed to load items: {String(error)}</MessageBarBody>
        </MessageBar>
      )}

      <RecordGrid
        rows={rows}
        columns={columns}
        entityName="almlab_warehouseitem"
        rowClassName="warehouse-item-row"
        commands={[{ id: "new", label: "New Item", icon: "Add", onExecute: () => setDialogOpen(true) }]}
        onRefresh={() => queryClient.refetchQueries({ queryKey: ["warehouseItems"] })}
      />

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create New Item"
        entityName="almlab_warehouseitem"
        fields={formFields}
        lookupRecords={{ almlab_locationid: locationRecords }}
        onCreate={(values) => createMutation.mutateAsync(values)}
        pending={createMutation.isPending}
      />
    </div>
  );
}
