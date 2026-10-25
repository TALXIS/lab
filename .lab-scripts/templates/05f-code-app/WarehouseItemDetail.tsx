import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { __PASCAL___warehouseitemsService } from "@/generated/services/__PASCAL___warehouseitemsService";
import { __PASCAL___warehousetransactionsService } from "@/generated/services/__PASCAL___warehousetransactionsService";
import { __PASCAL___warehouselocationsService } from "@/generated/services/__PASCAL___warehouselocationsService";
import type { __PASCAL___warehousetransactions } from "@/generated/models/__PASCAL___warehousetransactionsModel";
import type { __PASCAL___warehouselocations } from "@/generated/models/__PASCAL___warehouselocationsModel";
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
  { name: "__PREFIX___name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true, visualSizeFactor: 240 },
  { name: "__PREFIX___quantity", displayName: "Quantity", dataType: "Whole.None", visualSizeFactor: 110 },
  {
    name: "__PREFIX___transactiontype",
    displayName: "Type",
    dataType: "OptionSet",
    visualSizeFactor: 130,
    metadata: { OptionSet: transactionTypeOptionMetadata } as IColumn["metadata"],
  },
  { name: "__PREFIX___transactiondate", displayName: "Date", dataType: "DateAndTime.DateAndTime", visualSizeFactor: 120 },
];

// The New Transaction form for this item (the item itself is bound on create): name, quantity of at
// least 1 - the direction comes from the type - and type are all required.
const formFields: FormField[] = [
  { column: { name: "__PREFIX___name", displayName: "Transaction Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "__PREFIX___quantity", displayName: "Quantity", dataType: "Whole.None", metadata: { MinValue: 1 } as IColumn["metadata"] }, required: true },
  { column: { name: "__PREFIX___transactiontype", displayName: "Transaction Type", dataType: "OptionSet", metadata: { OptionSet: transactionTypeOptionMetadata } as IColumn["metadata"] }, required: true },
];

// The item's detail form: name, SKU and category are required; the quantity is shown but not
// editable (only transactions change it, so the ledger and the quantity can't drift), and so is the
// status. The location holds the picked location's id (RecordLookup).
const itemFields: FormField[] = [
  { column: { name: "__PREFIX___name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "__PREFIX___sku", displayName: "SKU", dataType: "SingleLine.Text" }, required: true },
  { column: { name: "__PREFIX___availablequantity", displayName: "Available Quantity", dataType: "Whole.None" }, disabled: true, testId: "item-detail-qty" },
  { column: { name: "__PREFIX___category", displayName: "Category", dataType: "OptionSet", metadata: { OptionSet: categoryOptionMetadata } as IColumn["metadata"] }, required: true },
  { column: { name: "__PREFIX___locationid", displayName: "Location", dataType: "SingleLine.Text" }, lookupEntity: "__PREFIX___warehouselocation" },
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
      const result = await serviceResult(__PASCAL___warehouseitemsService.get(id!));
      return result.data;
    },
    enabled: !!id,
  });

  const { data: transactions } = useQuery({
    queryKey: ["itemTransactions", id],
    queryFn: async () => {
      const result = await serviceResult(__PASCAL___warehousetransactionsService.getAll({
        select: [
          "__PREFIX___warehousetransactionid",
          "__PREFIX___name",
          "__PREFIX___quantity",
          "__PREFIX___transactiontype",
          "__PREFIX___transactiondate",
        ],
        filter: `___PREFIX___itemid_value eq '${id}'`,
        orderBy: ["__PREFIX___transactiondate desc"],
      }));
      return result.data ?? [];
    },
    enabled: !!id,
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

  const transactionRows = useMemo(
    () =>
      transactions?.map((tx: __PASCAL___warehousetransactions) => ({
        ...tx,
        __PREFIX___quantity: toNumber(tx.__PREFIX___quantity),
        __PREFIX___transactiontype: toNumber(tx.__PREFIX___transactiontype),
      })),
    [transactions]
  );

  const locationRecords = useMemo(
    () =>
      (locations ?? []).map((loc: __PASCAL___warehouselocations) => ({
        id: loc.__PREFIX___warehouselocationid,
        name: loc.__PREFIX___name ?? "",
      })),
    [locations]
  );

  // The item as the detail form's record: reloads the form whenever the item is refetched
  const itemRecord = useMemo(
    () =>
      item
        ? {
            id: item.__PREFIX___warehouseitemid,
            values: {
              __PREFIX___name: item.__PREFIX___name,
              __PREFIX___sku: item.__PREFIX___sku,
              __PREFIX___availablequantity: toNumber(item.__PREFIX___availablequantity),
              __PREFIX___category: toNumber(item.__PREFIX___category),
              __PREFIX___locationid: item.___PREFIX___locationid_value ?? null,
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
      if ("__PREFIX___name" in values) payload.__PREFIX___name = values.__PREFIX___name;
      if ("__PREFIX___sku" in values) payload.__PREFIX___sku = values.__PREFIX___sku;
      // Option set values come out of the form as strings
      if ("__PREFIX___category" in values) payload.__PREFIX___category = Number(values.__PREFIX___category);
      if ("__PREFIX___locationid" in values) {
        payload["__PREFIX___locationid@odata.bind"] = values.__PREFIX___locationid
          ? `/__PREFIX___warehouselocations(${values.__PREFIX___locationid})`
          : null;
      }
      if (Object.keys(payload).length === 0) return;
      return serviceResult(__PASCAL___warehouseitemsService.update(id!, servicePayload(payload)));
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
      return serviceResult(__PASCAL___warehousetransactionsService.create(servicePayload({
        __PREFIX___name: values.__PREFIX___name,
        __PREFIX___quantity: String(values.__PREFIX___quantity),
        // Option set values come out of the form as strings
        __PREFIX___transactiontype: Number(values.__PREFIX___transactiontype),
        __PREFIX___transactiondate: new Date().toISOString(),
        "__PREFIX___itemid@odata.bind": `/__PREFIX___warehouseitems(${id})`,
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
            entityName="__PREFIX___warehouseitem"
            record={itemRecord}
            fields={itemFields}
            columnCount={3}
            title={item.__PREFIX___name ?? ""}
            onBack={() => navigate("/items")}
            lookupRecords={{ __PREFIX___locationid: locationRecords }}
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
                    entityName="__PREFIX___warehousetransaction"
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
        title={`New Transaction for ${item.__PREFIX___name}`}
        entityName="__PREFIX___warehousetransaction"
        fields={formFields}
        onCreate={(values) => createTxMutation.mutateAsync(values)}
        pending={createTxMutation.isPending}
        submitTestId="submit-transaction"
      />
    </div>
  );
}
