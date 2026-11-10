import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Almlab_warehouselocationsService } from "@/generated/services/Almlab_warehouselocationsService";
import { Almlab_warehouseitemsService } from "@/generated/services/Almlab_warehouseitemsService";
import type { Almlab_warehouselocations } from "@/generated/models/Almlab_warehouselocationsModel";
import type { Almlab_warehouseitems } from "@/generated/models/Almlab_warehouseitemsModel";
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
import { servicePayload } from "@/utils/ServicePayload";

const columns: IColumn[] = [
  { name: "almlab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true, visualSizeFactor: 200 },
  { name: "almlab_address", displayName: "Address", dataType: "SingleLine.Text", visualSizeFactor: 260 },
  { name: "almlab_capacity", displayName: "Capacity", dataType: "Whole.None", visualSizeFactor: 110 },
  { name: "itemCount", displayName: "Items", dataType: "Whole.None", visualSizeFactor: 90 },
  { name: "active", displayName: "Active", dataType: "OptionSet", visualSizeFactor: 110, metadata: { OptionSet: statusOptions } as IColumn["metadata"] },
];

// The New Location form: only the name is required; a capacity can't be negative.
const formFields: FormField[] = [
  { column: { name: "almlab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "almlab_address", displayName: "Address", dataType: "SingleLine.Text" } },
  { column: { name: "almlab_capacity", displayName: "Capacity", dataType: "Whole.None", metadata: { MinValue: 0 } as IColumn["metadata"] } },
];

export default function LocationsPage() {
  const styles = useStyles();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: locations, error } = useQuery({
    queryKey: ["warehouseLocationsList"],
    queryFn: async () => {
      const result = await Almlab_warehouselocationsService.getAll({
        select: [
          "almlab_warehouselocationid",
          "almlab_name",
          "almlab_address",
          "almlab_capacity",
          "almlab_isactive",
          "statecode",
        ],
        orderBy: ["almlab_name asc"],
      });
      return result.data ?? [];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["itemsByLocation"],
    queryFn: async () => {
      const result = await Almlab_warehouseitemsService.getAll({
        select: ["almlab_warehouseitemid", "_almlab_locationid_value"],
      });
      return result.data ?? [];
    },
  });

  // Grid rows: per-location item counts, numeric capacity, and isactive as an Active/Inactive option
  const rows = useMemo(() => {
    if (!locations) return undefined;
    const itemCounts = new Map<string, number>();
    (items ?? []).forEach((item: Almlab_warehouseitems) => {
      const locId = item._almlab_locationid_value;
      if (locId) itemCounts.set(locId, (itemCounts.get(locId) ?? 0) + 1);
    });
    return locations.map((loc: Almlab_warehouselocations) => ({
      ...loc,
      almlab_capacity: loc.almlab_capacity != null ? Number(loc.almlab_capacity) : null,
      itemCount: itemCounts.get(loc.almlab_warehouselocationid) ?? 0,
      active: loc.almlab_isactive ? 0 : 1,
    }));
  }, [locations, items]);

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      return Almlab_warehouselocationsService.create(servicePayload({
        almlab_name: values.almlab_name,
        almlab_address: values.almlab_address,
        almlab_capacity: values.almlab_capacity != null ? String(values.almlab_capacity) : undefined,
        almlab_isactive: true,
      }));
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["warehouseLocationsList"] });
      toast.success("Location created successfully");
    },
    onError: (err) => {
      toast.error("Failed to create location: " + String(err));
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
          <MessageBarBody>Failed to load locations: {String(error)}</MessageBarBody>
        </MessageBar>
      )}

      <RecordGrid
        rows={rows}
        columns={columns}
        entityName="almlab_warehouselocation"
        commands={[{ id: "new", label: "New Location", icon: "Add", onExecute: () => setDialogOpen(true) }]}
        onRefresh={() => queryClient.refetchQueries({ queryKey: ["warehouseLocationsList"] })}
      />

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create New Location"
        entityName="almlab_warehouselocation"
        fields={formFields}
        onCreate={(values) => createMutation.mutateAsync(values)}
        pending={createMutation.isPending}
      />
    </div>
  );
}
