import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lab_warehouselocationsService } from "@/generated/services/Lab_warehouselocationsService";
import { Lab_warehouseitemsService } from "@/generated/services/Lab_warehouseitemsService";
import type { Lab_warehouselocations } from "@/generated/models/Lab_warehouselocationsModel";
import type { Lab_warehouseitems } from "@/generated/models/Lab_warehouseitemsModel";
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
  { name: "lab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true, visualSizeFactor: 200 },
  { name: "lab_address", displayName: "Address", dataType: "SingleLine.Text", visualSizeFactor: 260 },
  { name: "lab_capacity", displayName: "Capacity", dataType: "Whole.None", visualSizeFactor: 110 },
  { name: "itemCount", displayName: "Items", dataType: "Whole.None", visualSizeFactor: 90 },
  { name: "active", displayName: "Active", dataType: "OptionSet", visualSizeFactor: 110, metadata: { OptionSet: statusOptions } as IColumn["metadata"] },
];

// The New Location form: only the name is required; a capacity can't be negative.
const formFields: FormField[] = [
  { column: { name: "lab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "lab_address", displayName: "Address", dataType: "SingleLine.Text" } },
  { column: { name: "lab_capacity", displayName: "Capacity", dataType: "Whole.None", metadata: { MinValue: 0 } as IColumn["metadata"] } },
];

export default function LocationsPage() {
  const styles = useStyles();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: locations, error } = useQuery({
    queryKey: ["warehouseLocationsList"],
    queryFn: async () => {
      const result = await serviceResult(Lab_warehouselocationsService.getAll({
        select: [
          "lab_warehouselocationid",
          "lab_name",
          "lab_address",
          "lab_capacity",
          "lab_isactive",
          "statecode",
        ],
        orderBy: ["lab_name asc"],
      }));
      return result.data ?? [];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["itemsByLocation"],
    queryFn: async () => {
      const result = await serviceResult(Lab_warehouseitemsService.getAll({
        select: ["lab_warehouseitemid", "_lab_locationid_value"],
      }));
      return result.data ?? [];
    },
  });

  // Grid rows: per-location item counts, numeric capacity, and isactive as an Active/Inactive option
  const rows = useMemo(() => {
    if (!locations) return undefined;
    const itemCounts = new Map<string, number>();
    (items ?? []).forEach((item: Lab_warehouseitems) => {
      const locId = item._lab_locationid_value;
      if (locId) itemCounts.set(locId, (itemCounts.get(locId) ?? 0) + 1);
    });
    return locations.map((loc: Lab_warehouselocations) => ({
      ...loc,
      lab_capacity: toNumber(loc.lab_capacity),
      itemCount: itemCounts.get(loc.lab_warehouselocationid) ?? 0,
      active: loc.lab_isactive ? 0 : 1,
    }));
  }, [locations, items]);

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      return serviceResult(Lab_warehouselocationsService.create(servicePayload({
        lab_name: values.lab_name,
        lab_address: values.lab_address,
        lab_capacity: values.lab_capacity != null ? String(values.lab_capacity) : undefined,
        lab_isactive: true,
      })));
    },
    onSuccess: async () => {
      // Every list shows the same few records (Pick, Receive and the other tabs keep their own copies
      // for five minutes), so a change makes all of them stale: refetch what is on screen, the rest on its next visit
      await queryClient.invalidateQueries();
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
        entityName="lab_warehouselocation"
        commands={[{ id: "new", label: "New Location", icon: "Add", onExecute: () => setDialogOpen(true) }]}
        onRefresh={() => queryClient.refetchQueries({ queryKey: ["warehouseLocationsList"] })}
      />

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create New Location"
        entityName="lab_warehouselocation"
        fields={formFields}
        onCreate={(values) => createMutation.mutateAsync(values)}
        pending={createMutation.isPending}
      />
    </div>
  );
}

