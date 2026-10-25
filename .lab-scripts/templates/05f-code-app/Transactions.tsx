import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { __PASCAL___warehousetransactionsService } from "@/generated/services/__PASCAL___warehousetransactionsService";
import { __PASCAL___warehouseitemsService } from "@/generated/services/__PASCAL___warehouseitemsService";
import type { __PASCAL___warehousetransactions } from "@/generated/models/__PASCAL___warehousetransactionsModel";
import type { __PASCAL___warehouseitems } from "@/generated/models/__PASCAL___warehouseitemsModel";
import { transactionTypeOptionMetadata } from "@/utils/OptionSets";
import {
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components";
import { ArrowSwapRegular } from "@fluentui/react-icons";
import type { IColumn } from "@talxis/client-libraries";
import { PageHeader } from "@/components/PageHeader";
import { RecordGrid } from "@/components/RecordGrid";
import { RecordFormDialog } from "@/components/RecordFormDialog";
import type { FormField } from "@/components/RecordFormFields";
import { useToast } from "@/hooks/use-toast";
import { useStyles } from "@/styles/Transactions.styles";
import { servicePayload, serviceResult } from "@/utils/ServicePayload";
import { errorText } from "@/utils/StockTransactions";
import { toNumber } from "@/utils/RecordValues";

const transactionTypeMetadata = {
  OptionSet: transactionTypeOptionMetadata,
} as IColumn["metadata"];

const columns: IColumn[] = [
  { name: "__PREFIX___name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true, visualSizeFactor: 240 },
  { name: "__PREFIX___quantity", displayName: "Quantity", dataType: "Whole.None", visualSizeFactor: 110 },
  { name: "__PREFIX___transactiontype", displayName: "Type", dataType: "OptionSet", visualSizeFactor: 130, metadata: transactionTypeMetadata },
  { name: "item", displayName: "Item", dataType: "SingleLine.Text", visualSizeFactor: 200 },
  { name: "__PREFIX___transactiondate", displayName: "Date", dataType: "DateAndTime.DateAndTime", visualSizeFactor: 120 },
];

// The New Transaction form: every field is required, and a quantity must be at least 1 - the
// direction comes from the type. The item is an id string, picked through a RecordLookup.
const formFields: FormField[] = [
  { column: { name: "__PREFIX___name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "__PREFIX___itemid", displayName: "Warehouse Item", dataType: "SingleLine.Text" }, required: true, lookupEntity: "__PREFIX___warehouseitem" },
  { column: { name: "__PREFIX___quantity", displayName: "Quantity", dataType: "Whole.None", metadata: { MinValue: 1 } as IColumn["metadata"] }, required: true },
  { column: { name: "__PREFIX___transactiontype", displayName: "Transaction Type", dataType: "OptionSet", metadata: transactionTypeMetadata }, required: true },
];

export default function TransactionsPage() {
  const styles = useStyles();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: transactions, error } = useQuery({
    queryKey: ["allTransactions"],
    queryFn: async () => {
      const result = await serviceResult(__PASCAL___warehousetransactionsService.getAll({
        select: [
          "__PREFIX___warehousetransactionid",
          "__PREFIX___name",
          "__PREFIX___quantity",
          "__PREFIX___transactiontype",
          "__PREFIX___transactiondate",
          "___PREFIX___itemid_value",
        ],
        orderBy: ["__PREFIX___transactiondate desc"],
      }));
      return result.data ?? [];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["warehouseItemsLookup"],
    queryFn: async () => {
      const result = await serviceResult(__PASCAL___warehouseitemsService.getAll({
        // All items, inactive ones too: the grid names the item of every transaction
        select: ["__PREFIX___warehouseitemid", "__PREFIX___name", "statecode"],
        orderBy: ["__PREFIX___name asc"],
      }));
      return result.data ?? [];
    },
  });

  // Only active items can be picked for a new transaction
  const itemRecords = useMemo(
    () =>
      (items ?? [])
        .filter((item: __PASCAL___warehouseitems) => Number(item.statecode) === 0)
        .map((item: __PASCAL___warehouseitems) => ({
          id: item.__PREFIX___warehouseitemid,
          name: item.__PREFIX___name ?? "",
        })),
    [items]
  );

  const itemNames = useMemo(
    () => new Map((items ?? []).map((item: __PASCAL___warehouseitems) => [item.__PREFIX___warehouseitemid, item.__PREFIX___name ?? ""])),
    [items]
  );

  // Grid rows: numbers for numeric/option set columns, and the item lookup resolved to its name
  const rows = useMemo(
    () =>
      transactions?.map((tx: __PASCAL___warehousetransactions) => ({
        ...tx,
        __PREFIX___quantity: toNumber(tx.__PREFIX___quantity),
        __PREFIX___transactiontype: toNumber(tx.__PREFIX___transactiontype),
        item: itemNames.get(tx.___PREFIX___itemid_value ?? "") ?? "",
      })),
    [transactions, itemNames]
  );

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      return serviceResult(__PASCAL___warehousetransactionsService.create(servicePayload({
        __PREFIX___name: values.__PREFIX___name,
        __PREFIX___quantity: String(values.__PREFIX___quantity),
        // Option set values come out of the form as strings
        __PREFIX___transactiontype: Number(values.__PREFIX___transactiontype),
        __PREFIX___transactiondate: new Date().toISOString(),
        "__PREFIX___itemid@odata.bind": `/__PREFIX___warehouseitems(${values.__PREFIX___itemid})`,
      })));
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["allTransactions"] });
      toast.success("Transaction created successfully");
    },
    onError: (err) => {
      toast.error("Failed to create transaction: " + errorText(err));
    },
  });

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<ArrowSwapRegular />}
        title="Transactions"
        subtitle="All warehouse transactions"
      />

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>Failed to load transactions: {errorText(error)}</MessageBarBody>
        </MessageBar>
      )}

      <RecordGrid
        rows={rows}
        columns={columns}
        entityName="__PREFIX___warehousetransaction"
        commands={[{ id: "new", label: "New Transaction", icon: "Add", onExecute: () => setDialogOpen(true) }]}
        onRefresh={() => queryClient.refetchQueries({ queryKey: ["allTransactions"] })}
      />

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create New Transaction"
        entityName="__PREFIX___warehousetransaction"
        fields={formFields}
        lookupRecords={{ __PREFIX___itemid: itemRecords }}
        onCreate={(values) => createMutation.mutateAsync(values)}
        pending={createMutation.isPending}
      />
    </div>
  );
}
