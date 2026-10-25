import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { __PASCAL___warehouselocationsService } from "@/generated/services/__PASCAL___warehouselocationsService";
import { __PASCAL___warehouseitemsService } from "@/generated/services/__PASCAL___warehouseitemsService";
import type { __PASCAL___warehouselocations } from "@/generated/models/__PASCAL___warehouselocationsModel";
import type { __PASCAL___warehouseitems } from "@/generated/models/__PASCAL___warehouseitemsModel";
import {
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components";
import { LocationRegular } from "@fluentui/react-icons";
import type { IColumn } from "@talxis/client-libraries";
import { PageHeader } from "@/components/PageHeader";
import { RecordFormDialog } from "@/components/RecordFormDialog";
import type { FormField } from "@/components/RecordFormFields";
import { RecordGrid } from "@/components/RecordGrid";
import { statusOptions } from "@/utils/OptionSets";
import { useToast } from "@/hooks/use-toast";
import { useStyles } from "@/styles/Locations.styles";
import { servicePayload, serviceResult } from "@/utils/ServicePayload";
import { errorText } from "@/utils/StockTransactions";
import { toNumber } from "@/utils/RecordValues";

const columns: IColumn[] = [
  { name: "__PREFIX___name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true, visualSizeFactor: 200 },
  { name: "__PREFIX___address", displayName: "Address", dataType: "SingleLine.Text", visualSizeFactor: 260 },
  { name: "__PREFIX___capacity", displayName: "Capacity", dataType: "Whole.None", visualSizeFactor: 110 },
  { name: "itemCount", displayName: "Items", dataType: "Whole.None", visualSizeFactor: 90 },
  { name: "active", displayName: "Active", dataType: "OptionSet", visualSizeFactor: 110, metadata: { OptionSet: statusOptions } as IColumn["metadata"] },
];

// The New Location form: only the name is required; a capacity can't be negative.
const formFields: FormField[] = [
  { column: { name: "__PREFIX___name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "__PREFIX___address", displayName: "Address", dataType: "SingleLine.Text" } },
  { column: { name: "__PREFIX___capacity", displayName: "Capacity", dataType: "Whole.None", metadata: { MinValue: 0 } as IColumn["metadata"] } },
];

export default function LocationsPage() {
  const styles = useStyles();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: locations, error } = useQuery({
    queryKey: ["warehouseLocationsList"],
    queryFn: async () => {
      const result = await serviceResult(__PASCAL___warehouselocationsService.getAll({
        select: [
          "__PREFIX___warehouselocationid",
          "__PREFIX___name",
          "__PREFIX___address",
          "__PREFIX___capacity",
          "__PREFIX___isactive",
          "statecode",
        ],
        orderBy: ["__PREFIX___name asc"],
      }));
      return result.data ?? [];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["itemsByLocation"],
    queryFn: async () => {
      const result = await serviceResult(__PASCAL___warehouseitemsService.getAll({
        select: ["__PREFIX___warehouseitemid", "___PREFIX___locationid_value"],
      }));
      return result.data ?? [];
    },
  });

  // Grid rows: per-location item counts, numeric capacity, and isactive as an Active/Inactive option
  const rows = useMemo(() => {
    if (!locations) return undefined;
    const itemCounts = new Map<string, number>();
    (items ?? []).forEach((item: __PASCAL___warehouseitems) => {
      const locId = item.___PREFIX___locationid_value;
      if (locId) itemCounts.set(locId, (itemCounts.get(locId) ?? 0) + 1);
    });
    return locations.map((loc: __PASCAL___warehouselocations) => ({
      ...loc,
      __PREFIX___capacity: toNumber(loc.__PREFIX___capacity),
      itemCount: itemCounts.get(loc.__PREFIX___warehouselocationid) ?? 0,
      active: loc.__PREFIX___isactive ? 0 : 1,
    }));
  }, [locations, items]);

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      return serviceResult(__PASCAL___warehouselocationsService.create(servicePayload({
        __PREFIX___name: values.__PREFIX___name,
        __PREFIX___address: values.__PREFIX___address,
        __PREFIX___capacity: values.__PREFIX___capacity != null ? String(values.__PREFIX___capacity) : undefined,
        __PREFIX___isactive: true,
      })));
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["warehouseLocationsList"] });
      toast.success("Location created successfully");
    },
    onError: (err) => {
      toast.error("Failed to create location: " + errorText(err));
    },
  });

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<LocationRegular />}
        title="Locations"
        subtitle="Warehouse locations and their stock"
      />

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>Failed to load locations: {errorText(error)}</MessageBarBody>
        </MessageBar>
      )}

      <RecordGrid
        rows={rows}
        columns={columns}
        entityName="__PREFIX___warehouselocation"
        commands={[{ id: "new", label: "New Location", icon: "Add", onExecute: () => setDialogOpen(true) }]}
        onRefresh={() => queryClient.refetchQueries({ queryKey: ["warehouseLocationsList"] })}
      />

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create New Location"
        entityName="__PREFIX___warehouselocation"
        fields={formFields}
        onCreate={(values) => createMutation.mutateAsync(values)}
        pending={createMutation.isPending}
      />
    </div>
  );
}
