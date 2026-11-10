import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Almlab_warehouseitemsService } from "@/generated/services/Almlab_warehouseitemsService";
import { Almlab_warehousetransactionsService } from "@/generated/services/Almlab_warehousetransactionsService";
import { Almlab_warehouselocationsService } from "@/generated/services/Almlab_warehouselocationsService";
import type { Almlab_warehousetransactions } from "@/generated/models/Almlab_warehousetransactionsModel";
import type { Almlab_warehouselocations } from "@/generated/models/Almlab_warehouselocationsModel";
import { categoryOptionMetadata, statusOptions, transactionTypeOptionMetadata } from "@/utils/OptionSets";
import {
  Body1,
  Button,
  Skeleton,
  SkeletonItem,
} from "@fluentui/react-components";
import { ArrowLeftRegular } from "@fluentui/react-icons";
import type { IColumn } from "@talxis/client-libraries";
import { RecordDetailForm } from "@/components/RecordDetailForm";
import { RecordFormDialog } from "@/components/RecordFormDialog";
import type { FormField } from "@/components/RecordFormFields";
import { RecordGrid } from "@/components/RecordGrid";
import { useToast } from "@/hooks/use-toast";
import { useStyles } from "@/styles/WarehouseItemDetail.styles";
import { servicePayload } from "@/utils/ServicePayload";

const transactionColumns: IColumn[] = [
  { name: "almlab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true, visualSizeFactor: 240 },
  { name: "almlab_quantity", displayName: "Quantity", dataType: "Whole.None", visualSizeFactor: 110 },
  {
    name: "almlab_transactiontype",
    displayName: "Type",
    dataType: "OptionSet",
    visualSizeFactor: 130,
    metadata: { OptionSet: transactionTypeOptionMetadata } as IColumn["metadata"],
  },
  { name: "almlab_transactiondate", displayName: "Date", dataType: "DateAndTime.DateOnly", visualSizeFactor: 120 },
];

// The New Transaction form for this item (the item itself is bound on create): name, quantity of at
// least 1 - the direction comes from the type - and type are all required.
const formFields: FormField[] = [
  { column: { name: "almlab_name", displayName: "Transaction Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "almlab_quantity", displayName: "Quantity", dataType: "Whole.None", metadata: { MinValue: 1 } as IColumn["metadata"] }, required: true },
  { column: { name: "almlab_transactiontype", displayName: "Transaction Type", dataType: "OptionSet", metadata: { OptionSet: transactionTypeOptionMetadata } as IColumn["metadata"] }, required: true },
];

// The item's detail form: name, SKU and category are required; the quantity is shown but not
// editable (only transactions change it, so the ledger and the quantity can't drift), and so is the
// status. The location holds the picked location's id (RecordLookup).
const itemFields: FormField[] = [
  { column: { name: "almlab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "almlab_sku", displayName: "SKU", dataType: "SingleLine.Text" }, required: true },
  { column: { name: "almlab_availablequantity", displayName: "Available Quantity", dataType: "Whole.None" }, disabled: true, testId: "item-detail-qty" },
  { column: { name: "almlab_category", displayName: "Category", dataType: "OptionSet", metadata: { OptionSet: categoryOptionMetadata } as IColumn["metadata"] }, required: true },
  { column: { name: "almlab_locationid", displayName: "Location", dataType: "SingleLine.Text" }, lookupEntity: "almlab_warehouselocation" },
  { column: { name: "statecode", displayName: "Status", dataType: "OptionSet", metadata: { OptionSet: statusOptions } as IColumn["metadata"] }, disabled: true },
];

export default function WarehouseItemDetailPage() {
  const styles = useStyles();
  const toast = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: item, isLoading: itemLoading } = useQuery({
    queryKey: ["warehouseItem", id],
    queryFn: async () => {
      const result = await Almlab_warehouseitemsService.get(id!);
      return result.data;
    },
    enabled: !!id,
  });

  const { data: transactions } = useQuery({
    queryKey: ["itemTransactions", id],
    queryFn: async () => {
      const result = await Almlab_warehousetransactionsService.getAll({
        select: [
          "almlab_warehousetransactionid",
          "almlab_name",
          "almlab_quantity",
          "almlab_transactiontype",
          "almlab_transactiondate",
        ],
        filter: `_almlab_itemid_value eq '${id}'`,
        orderBy: ["almlab_transactiondate desc"],
      });
      return result.data ?? [];
    },
    enabled: !!id,
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

  const transactionRows = useMemo(
    () =>
      transactions?.map((tx: Almlab_warehousetransactions) => ({
        ...tx,
        almlab_quantity: Number(tx.almlab_quantity),
        almlab_transactiontype: Number(tx.almlab_transactiontype),
      })),
    [transactions]
  );

  const locationRecords = useMemo(
    () =>
      (locations ?? []).map((loc: Almlab_warehouselocations) => ({
        id: loc.almlab_warehouselocationid,
        name: loc.almlab_name ?? "",
      })),
    [locations]
  );

  // The item as the detail form's record: reloads the form whenever the item is refetched
  const itemRecord = useMemo(
    () =>
      item
        ? {
            id: item.almlab_warehouseitemid,
            values: {
              almlab_name: item.almlab_name,
              almlab_sku: item.almlab_sku,
              almlab_availablequantity: Number(item.almlab_availablequantity),
              almlab_category: Number(item.almlab_category),
              almlab_locationid: item._almlab_locationid_value ?? null,
              statecode: Number(item.statecode),
            },
          }
        : undefined,
    [item]
  );

  const updateItemMutation = useMutation({
    // Only the fields the form says changed come in
    mutationFn: async (values: Record<string, unknown>) => {
      const payload: Record<string, unknown> = {};
      if ("almlab_name" in values) payload.almlab_name = values.almlab_name;
      if ("almlab_sku" in values) payload.almlab_sku = values.almlab_sku;
      // Option set values come out of the form as strings
      if ("almlab_category" in values) payload.almlab_category = Number(values.almlab_category);
      if ("almlab_locationid" in values) {
        payload["almlab_locationid@odata.bind"] = values.almlab_locationid
          ? `/almlab_warehouselocations(${values.almlab_locationid})`
          : null;
      }
      if (Object.keys(payload).length === 0) return;
      return Almlab_warehouseitemsService.update(id!, servicePayload(payload));
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["warehouseItem", id] });
      await queryClient.invalidateQueries({ queryKey: ["warehouseItems"] });
      toast.success("Item saved");
    },
    onError: (err) => {
      toast.error("Failed to save item: " + String(err));
    },
  });

  const createTxMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      return Almlab_warehousetransactionsService.create(servicePayload({
        almlab_name: values.almlab_name,
        almlab_quantity: String(values.almlab_quantity),
        // Option set values come out of the form as strings
        almlab_transactiontype: Number(values.almlab_transactiontype),
        almlab_transactiondate: new Date().toISOString(),
        "almlab_itemid@odata.bind": `/almlab_warehouseitems(${id})`,
      }));
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["itemTransactions", id] });
      await queryClient.refetchQueries({ queryKey: ["warehouseItem", id] });
      toast.success("Transaction created");
    },
    onError: (err) => {
      toast.error("Failed to create transaction: " + String(err));
    },
  });

  if (itemLoading) {
    return (
      <Skeleton className={styles.page}>
        <SkeletonItem className={styles.skeletonTitle} />
        <SkeletonItem className={styles.skeletonCards} />
        <SkeletonItem className={styles.skeletonTable} />
      </Skeleton>
    );
  }

  if (!item) {
    return (
      <div className={styles.page}>
        <Body1 className={styles.muted}>Item not found.</Body1>
        <div>
          <Button appearance="transparent" icon={<ArrowLeftRegular />} onClick={() => navigate("/items")}>
            Back to items
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.details}>
        {itemRecord && (
          <RecordDetailForm
            entityName="almlab_warehouseitem"
            record={itemRecord}
            fields={itemFields}
            columnCount={3}
            title={item.almlab_name ?? ""}
            onBack={() => navigate("/items")}
            lookupRecords={{ almlab_locationid: locationRecords }}
            onSave={(values) => updateItemMutation.mutateAsync(values)}
            tabs={[
              {
                id: "transactions",
                label: "Transactions",
                // The grid's own ribbon carries New Transaction (and Refresh), like a model-driven subgrid
                content: (
                  <RecordGrid
                    rows={transactionRows}
                    columns={transactionColumns}
                    entityName="almlab_warehousetransaction"
                    commands={[
                      { id: "new", label: "New Transaction", icon: "Add", onExecute: () => setDialogOpen(true) },
                    ]}
                    onRefresh={() => queryClient.refetchQueries({ queryKey: ["itemTransactions", id] })}
                  />
                ),
              },
            ]}
          />
        )}
      </div>

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`New Transaction for ${item.almlab_name}`}
        entityName="almlab_warehousetransaction"
        fields={formFields}
        onCreate={(values) => createTxMutation.mutateAsync(values)}
        pending={createTxMutation.isPending}
        submitTestId="submit-transaction"
      />
    </div>
  );
}
