import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { __PASCAL___warehouseitemsService } from "@/generated/services/__PASCAL___warehouseitemsService";
import { __PASCAL___warehouselocationsService } from "@/generated/services/__PASCAL___warehouselocationsService";
import type { __PASCAL___warehouseitems } from "@/generated/models/__PASCAL___warehouseitemsModel";
import type { __PASCAL___warehouselocations } from "@/generated/models/__PASCAL___warehouselocationsModel";
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
  { name: "__PREFIX___name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true, visualSizeFactor: 220 },
  { name: "__PREFIX___sku", displayName: "SKU", dataType: "SingleLine.Text", visualSizeFactor: 130 },
  { name: "__PREFIX___availablequantity", displayName: "Available Qty", dataType: "Whole.None", visualSizeFactor: 120 },
  { name: "__PREFIX___category", displayName: "Category", dataType: "OptionSet", visualSizeFactor: 140, metadata: { OptionSet: categoryOptionMetadata } as IColumn["metadata"] },
  { name: "location", displayName: "Location", dataType: "SingleLine.Text", visualSizeFactor: 150 },
  { name: "statecode", displayName: "Status", dataType: "OptionSet", visualSizeFactor: 110, metadata: { OptionSet: statusOptions } as IColumn["metadata"] },
  { name: "createdon", displayName: "Created", dataType: "DateAndTime.DateOnly", visualSizeFactor: 120 },
];

// The New Item form: name, SKU, quantity (no negatives) and category are required; the location
// is optional and picked through a RecordLookup (it holds the location's id).
const formFields: FormField[] = [
  { column: { name: "__PREFIX___name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "__PREFIX___sku", displayName: "SKU", dataType: "SingleLine.Text" }, required: true },
  { column: { name: "__PREFIX___availablequantity", displayName: "Available Quantity", dataType: "Whole.None", metadata: { MinValue: 0 } as IColumn["metadata"] }, required: true },
  { column: { name: "__PREFIX___category", displayName: "Category", dataType: "OptionSet", metadata: { OptionSet: categoryOptionMetadata } as IColumn["metadata"] }, required: true },
  { column: { name: "__PREFIX___locationid", displayName: "Location", dataType: "SingleLine.Text" }, lookupEntity: "__PREFIX___warehouselocation" },
];

export default function WarehouseItemsPage() {
  const styles = useStyles();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: items, error } = useQuery({
    queryKey: ["warehouseItems"],
    queryFn: async () => {
      const result = await serviceResult(__PASCAL___warehouseitemsService.getAll({
        select: [
          "__PREFIX___warehouseitemid",
          "__PREFIX___name",
          "__PREFIX___sku",
          "__PREFIX___availablequantity",
          "__PREFIX___category",
          "___PREFIX___locationid_value",
          "createdon",
          "statecode",
        ],
        orderBy: ["__PREFIX___name asc"],
      }));
      return result.data ?? [];
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["warehouseLocations"],
    queryFn: async () => {
      const result = await serviceResult(__PASCAL___warehouselocationsService.getAll({
        select: ["__PREFIX___warehouselocationid", "__PREFIX___name"],
        orderBy: ["__PREFIX___name asc"],
      }));
      return result.data ?? [];
    },
  });

  const locationRecords = useMemo(
    () =>
      (locations ?? []).map((loc: __PASCAL___warehouselocations) => ({
        id: loc.__PREFIX___warehouselocationid,
        name: loc.__PREFIX___name ?? "",
      })),
    [locations]
  );

  // Grid rows: numbers for numeric/option set columns, and the location lookup resolved to its name
  const rows = useMemo(() => {
    if (!items) return undefined;
    const locationNames = new Map(locationRecords.map((loc) => [loc.id, loc.name]));
    return items.map((item: __PASCAL___warehouseitems) => ({
      ...item,
      __PREFIX___availablequantity: toNumber(item.__PREFIX___availablequantity),
      __PREFIX___category: toNumber(item.__PREFIX___category),
      statecode: toNumber(item.statecode),
      location: locationNames.get(item.___PREFIX___locationid_value ?? "") ?? "",
    }));
  }, [items, locationRecords]);

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      return serviceResult(__PASCAL___warehouseitemsService.create(servicePayload({
        __PREFIX___name: values.__PREFIX___name,
        __PREFIX___sku: values.__PREFIX___sku,
        __PREFIX___availablequantity: String(values.__PREFIX___availablequantity),
        // Option set values come out of the form as strings
        __PREFIX___category: Number(values.__PREFIX___category),
        ...(values.__PREFIX___locationid
          ? { "__PREFIX___locationid@odata.bind": `/__PREFIX___warehouselocations(${values.__PREFIX___locationid})` }
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
        entityName="__PREFIX___warehouseitem"
        rowClassName="warehouse-item-row"
        commands={[{ id: "new", label: "New Item", icon: "Add", onExecute: () => setDialogOpen(true) }]}
        onRefresh={() => queryClient.refetchQueries({ queryKey: ["warehouseItems"] })}
      />

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create New Item"
        entityName="__PREFIX___warehouseitem"
        fields={formFields}
        lookupRecords={{ __PREFIX___locationid: locationRecords }}
        onCreate={(values) => createMutation.mutateAsync(values)}
        pending={createMutation.isPending}
      />
    </div>
  );
}
