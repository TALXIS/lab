import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lab_warehouseitemsService } from "@/generated/services/Lab_warehouseitemsService";
import { Lab_warehousetransactionsService } from "@/generated/services/Lab_warehousetransactionsService";
import { Lab_warehouselocationsService } from "@/generated/services/Lab_warehouselocationsService";
import type { Lab_warehousetransactions } from "@/generated/models/Lab_warehousetransactionsModel";
import type { Lab_warehouselocations } from "@/generated/models/Lab_warehouselocationsModel";
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
import { servicePayload, serviceResult } from "@/utils/ServicePayload";
import { errorText } from "@/utils/StockTransactions";
import { toNumber } from "@/utils/RecordValues";

const transactionColumns: IColumn[] = [
  { name: "lab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true, visualSizeFactor: 240 },
  { name: "lab_quantity", displayName: "Quantity", dataType: "Whole.None", visualSizeFactor: 110 },
  {
    name: "lab_transactiontype",
    displayName: "Type",
    dataType: "OptionSet",
    visualSizeFactor: 130,
    metadata: { OptionSet: transactionTypeOptionMetadata } as IColumn["metadata"],
  },
  { name: "lab_transactiondate", displayName: "Date", dataType: "DateAndTime.DateAndTime", visualSizeFactor: 120 },
];

// The New Transaction form for this item (the item itself is bound on create): name, quantity of at
// least 1 - the direction comes from the type - and type are all required.
const formFields: FormField[] = [
  { column: { name: "lab_name", displayName: "Transaction Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "lab_quantity", displayName: "Quantity", dataType: "Whole.None", metadata: { MinValue: 1 } as IColumn["metadata"] }, required: true },
  { column: { name: "lab_transactiontype", displayName: "Transaction Type", dataType: "OptionSet", metadata: { OptionSet: transactionTypeOptionMetadata } as IColumn["metadata"] }, required: true },
];

// The item's detail form: name, SKU and category are required; the quantity is shown but not
// editable (only transactions change it, so the ledger and the quantity can't drift), and so is the
// status. The location holds the picked location's id (RecordLookup).
const itemFields: FormField[] = [
  { column: { name: "lab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "lab_sku", displayName: "SKU", dataType: "SingleLine.Text" }, required: true },
  { column: { name: "lab_availablequantity", displayName: "Available Quantity", dataType: "Whole.None" }, disabled: true, testId: "item-detail-qty" },
  { column: { name: "lab_category", displayName: "Category", dataType: "OptionSet", metadata: { OptionSet: categoryOptionMetadata } as IColumn["metadata"] }, required: true },
  { column: { name: "lab_locationid", displayName: "Location", dataType: "SingleLine.Text" }, lookupEntity: "lab_warehouselocation" },
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
      const result = await serviceResult(Lab_warehouseitemsService.get(id!));
      return result.data;
    },
    enabled: !!id,
  });

  const { data: transactions } = useQuery({
    queryKey: ["itemTransactions", id],
    queryFn: async () => {
      const result = await serviceResult(Lab_warehousetransactionsService.getAll({
        select: [
          "lab_warehousetransactionid",
          "lab_name",
          "lab_quantity",
          "lab_transactiontype",
          "lab_transactiondate",
        ],
        filter: `_lab_itemid_value eq '${id}'`,
        orderBy: ["lab_transactiondate desc"],
      }));
      return result.data ?? [];
    },
    enabled: !!id,
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

  const transactionRows = useMemo(
    () =>
      transactions?.map((tx: Lab_warehousetransactions) => ({
        ...tx,
        lab_quantity: toNumber(tx.lab_quantity),
        lab_transactiontype: toNumber(tx.lab_transactiontype),
      })),
    [transactions]
  );

  const locationRecords = useMemo(
    () =>
      (locations ?? []).map((loc: Lab_warehouselocations) => ({
        id: loc.lab_warehouselocationid,
        name: loc.lab_name ?? "",
      })),
    [locations]
  );

  // The item as the detail form's record: reloads the form whenever the item is refetched
  const itemRecord = useMemo(
    () =>
      item
        ? {
            id: item.lab_warehouseitemid,
            values: {
              lab_name: item.lab_name,
              lab_sku: item.lab_sku,
              lab_availablequantity: toNumber(item.lab_availablequantity),
              lab_category: toNumber(item.lab_category),
              lab_locationid: item._lab_locationid_value ?? null,
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
      if ("lab_name" in values) payload.lab_name = values.lab_name;
      if ("lab_sku" in values) payload.lab_sku = values.lab_sku;
      // Option set values come out of the form as strings
      if ("lab_category" in values) payload.lab_category = Number(values.lab_category);
      if ("lab_locationid" in values) {
        payload["lab_locationid@odata.bind"] = values.lab_locationid
          ? `/lab_warehouselocations(${values.lab_locationid})`
          : null;
      }
      if (Object.keys(payload).length === 0) return;
      return serviceResult(Lab_warehouseitemsService.update(id!, servicePayload(payload)));
    },
    onSuccess: async () => {
      // Every list shows the same few records (Pick, Receive and the other tabs keep their own copies
      // for five minutes), so a change makes all of them stale: refetch what is on screen, the rest on its next visit
      await queryClient.invalidateQueries();
      toast.success("Item saved");
    },
    onError: (err) => {
      toast.error("Failed to save item: " + errorText(err));
    },
  });

  const createTxMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      return serviceResult(Lab_warehousetransactionsService.create(servicePayload({
        lab_name: values.lab_name,
        lab_quantity: String(values.lab_quantity),
        // Option set values come out of the form as strings
        lab_transactiontype: Number(values.lab_transactiontype),
        lab_transactiondate: new Date().toISOString(),
        "lab_itemid@odata.bind": `/lab_warehouseitems(${id})`,
      })));
    },
    onSuccess: async () => {
      // Every list shows the same few records (Pick, Receive and the other tabs keep their own copies
      // for five minutes), so a change makes all of them stale: refetch what is on screen, the rest on its next visit
      await queryClient.invalidateQueries();
      toast.success("Transaction created");
    },
    onError: (err) => {
      toast.error("Failed to create transaction: " + errorText(err));
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
            entityName="lab_warehouseitem"
            record={itemRecord}
            fields={itemFields}
            columnCount={3}
            title={item.lab_name ?? ""}
            onBack={() => navigate("/items")}
            lookupRecords={{ lab_locationid: locationRecords }}
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
                    entityName="lab_warehousetransaction"
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
        title={`New Transaction for ${item.lab_name}`}
        entityName="lab_warehousetransaction"
        fields={formFields}
        onCreate={(values) => createTxMutation.mutateAsync(values)}
        pending={createTxMutation.isPending}
        submitTestId="submit-transaction"
      />
    </div>
  );
}

