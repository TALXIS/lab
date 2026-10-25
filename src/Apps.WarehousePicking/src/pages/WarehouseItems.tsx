import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lab_warehouseitemsService } from "@/generated/services/Lab_warehouseitemsService";
import { Lab_warehouselocationsService } from "@/generated/services/Lab_warehouselocationsService";
import type { Lab_warehouseitems } from "@/generated/models/Lab_warehouseitemsModel";
import type { Lab_warehouselocations } from "@/generated/models/Lab_warehouselocationsModel";
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
import { servicePayload, serviceResult } from "@/utils/ServicePayload";
import { errorText } from "@/utils/StockTransactions";
import { toNumber } from "@/utils/RecordValues";

const columns: IColumn[] = [
  { name: "lab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true, visualSizeFactor: 220 },
  { name: "lab_sku", displayName: "SKU", dataType: "SingleLine.Text", visualSizeFactor: 130 },
  { name: "lab_availablequantity", displayName: "Available Qty", dataType: "Whole.None", visualSizeFactor: 120 },
  { name: "lab_category", displayName: "Category", dataType: "OptionSet", visualSizeFactor: 140, metadata: { OptionSet: categoryOptionMetadata } as IColumn["metadata"] },
  { name: "location", displayName: "Location", dataType: "SingleLine.Text", visualSizeFactor: 150 },
  { name: "statecode", displayName: "Status", dataType: "OptionSet", visualSizeFactor: 110, metadata: { OptionSet: statusOptions } as IColumn["metadata"] },
  { name: "createdon", displayName: "Created", dataType: "DateAndTime.DateOnly", visualSizeFactor: 120 },
];

// The New Item form: name, SKU, quantity (no negatives) and category are required; the location
// is optional and picked through a RecordLookup (it holds the location's id).
const formFields: FormField[] = [
  { column: { name: "lab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "lab_sku", displayName: "SKU", dataType: "SingleLine.Text" }, required: true },
  { column: { name: "lab_availablequantity", displayName: "Available Quantity", dataType: "Whole.None", metadata: { MinValue: 0 } as IColumn["metadata"] }, required: true },
  { column: { name: "lab_category", displayName: "Category", dataType: "OptionSet", metadata: { OptionSet: categoryOptionMetadata } as IColumn["metadata"] }, required: true },
  { column: { name: "lab_locationid", displayName: "Location", dataType: "SingleLine.Text" }, lookupEntity: "lab_warehouselocation" },
];

export default function WarehouseItemsPage() {
  const styles = useStyles();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: items, error } = useQuery({
    queryKey: ["warehouseItems"],
    queryFn: async () => {
      const result = await serviceResult(Lab_warehouseitemsService.getAll({
        select: [
          "lab_warehouseitemid",
          "lab_name",
          "lab_sku",
          "lab_availablequantity",
          "lab_category",
          "_lab_locationid_value",
          "createdon",
          "statecode",
        ],
        orderBy: ["lab_name asc"],
      }));
      return result.data ?? [];
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["warehouseLocations"],
    queryFn: async () => {
      const result = await serviceResult(Lab_warehouselocationsService.getAll({
        select: ["lab_warehouselocationid", "lab_name"],
        orderBy: ["lab_name asc"],
      }));
      return result.data ?? [];
    },
  });

  const locationRecords = useMemo(
    () =>
      (locations ?? []).map((loc: Lab_warehouselocations) => ({
        id: loc.lab_warehouselocationid,
        name: loc.lab_name ?? "",
      })),
    [locations]
  );

  // Grid rows: numbers for numeric/option set columns, and the location lookup resolved to its name
  const rows = useMemo(() => {
    if (!items) return undefined;
    const locationNames = new Map(locationRecords.map((loc) => [loc.id, loc.name]));
    return items.map((item: Lab_warehouseitems) => ({
      ...item,
      lab_availablequantity: toNumber(item.lab_availablequantity),
      lab_category: toNumber(item.lab_category),
      statecode: toNumber(item.statecode),
      location: locationNames.get(item._lab_locationid_value ?? "") ?? "",
    }));
  }, [items, locationRecords]);

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      return serviceResult(Lab_warehouseitemsService.create(servicePayload({
        lab_name: values.lab_name,
        lab_sku: values.lab_sku,
        lab_availablequantity: String(values.lab_availablequantity),
        // Option set values come out of the form as strings
        lab_category: Number(values.lab_category),
        ...(values.lab_locationid
          ? { "lab_locationid@odata.bind": `/lab_warehouselocations(${values.lab_locationid})` }
          : {}),
      })));
    },
    onSuccess: async () => {
      // Every list shows the same few records (Pick, Receive and the other tabs keep their own copies
      // for five minutes), so a change makes all of them stale: refetch what is on screen, the rest on its next visit
      await queryClient.invalidateQueries();
      toast.success("Item created successfully");
    },
    onError: (err) => {
      toast.error("Failed to create item: " + errorText(err));
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
          <MessageBarBody>Failed to load items: {errorText(error)}</MessageBarBody>
        </MessageBar>
      )}

      <RecordGrid
        rows={rows}
        columns={columns}
        entityName="lab_warehouseitem"
        rowClassName="warehouse-item-row"
        commands={[{ id: "new", label: "New Item", icon: "Add", onExecute: () => setDialogOpen(true) }]}
        onRefresh={() => queryClient.refetchQueries({ queryKey: ["warehouseItems"] })}
      />

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create New Item"
        entityName="lab_warehouseitem"
        fields={formFields}
        lookupRecords={{ lab_locationid: locationRecords }}
        onCreate={(values) => createMutation.mutateAsync(values)}
        pending={createMutation.isPending}
      />
    </div>
  );
}

