import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lab_warehousetransactionsService } from "@/generated/services/Lab_warehousetransactionsService";
import { Lab_warehouseitemsService } from "@/generated/services/Lab_warehouseitemsService";
import type { Lab_warehousetransactions } from "@/generated/models/Lab_warehousetransactionsModel";
import type { Lab_warehouseitems } from "@/generated/models/Lab_warehouseitemsModel";
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
  { name: "lab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true, visualSizeFactor: 240 },
  { name: "lab_quantity", displayName: "Quantity", dataType: "Whole.None", visualSizeFactor: 110 },
  { name: "lab_transactiontype", displayName: "Type", dataType: "OptionSet", visualSizeFactor: 130, metadata: transactionTypeMetadata },
  { name: "item", displayName: "Item", dataType: "SingleLine.Text", visualSizeFactor: 200 },
  { name: "lab_transactiondate", displayName: "Date", dataType: "DateAndTime.DateAndTime", visualSizeFactor: 120 },
];

// The New Transaction form: every field is required, and a quantity must be at least 1 - the
// direction comes from the type. The item is an id string, picked through a RecordLookup.
const formFields: FormField[] = [
  { column: { name: "lab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "lab_itemid", displayName: "Warehouse Item", dataType: "SingleLine.Text" }, required: true, lookupEntity: "lab_warehouseitem" },
  { column: { name: "lab_quantity", displayName: "Quantity", dataType: "Whole.None", metadata: { MinValue: 1 } as IColumn["metadata"] }, required: true },
  { column: { name: "lab_transactiontype", displayName: "Transaction Type", dataType: "OptionSet", metadata: transactionTypeMetadata }, required: true },
];

export default function TransactionsPage() {
  const styles = useStyles();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: transactions, error } = useQuery({
    queryKey: ["allTransactions"],
    queryFn: async () => {
      const result = await serviceResult(Lab_warehousetransactionsService.getAll({
        select: [
          "lab_warehousetransactionid",
          "lab_name",
          "lab_quantity",
          "lab_transactiontype",
          "lab_transactiondate",
          "_lab_itemid_value",
        ],
        orderBy: ["lab_transactiondate desc"],
      }));
      return result.data ?? [];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["warehouseItemsLookup"],
    queryFn: async () => {
      const result = await serviceResult(Lab_warehouseitemsService.getAll({
        // All items, inactive ones too: the grid names the item of every transaction
        select: ["lab_warehouseitemid", "lab_name", "statecode"],
        orderBy: ["lab_name asc"],
      }));
      return result.data ?? [];
    },
  });

  // Only active items can be picked for a new transaction
  const itemRecords = useMemo(
    () =>
      (items ?? [])
        .filter((item: Lab_warehouseitems) => Number(item.statecode) === 0)
        .map((item: Lab_warehouseitems) => ({
          id: item.lab_warehouseitemid,
          name: item.lab_name ?? "",
        })),
    [items]
  );

  const itemNames = useMemo(
    () => new Map((items ?? []).map((item: Lab_warehouseitems) => [item.lab_warehouseitemid, item.lab_name ?? ""])),
    [items]
  );

  // Grid rows: numbers for numeric/option set columns, and the item lookup resolved to its name
  const rows = useMemo(
    () =>
      transactions?.map((tx: Lab_warehousetransactions) => ({
        ...tx,
        lab_quantity: toNumber(tx.lab_quantity),
        lab_transactiontype: toNumber(tx.lab_transactiontype),
        item: itemNames.get(tx._lab_itemid_value ?? "") ?? "",
      })),
    [transactions, itemNames]
  );

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      return serviceResult(Lab_warehousetransactionsService.create(servicePayload({
        lab_name: values.lab_name,
        lab_quantity: String(values.lab_quantity),
        // Option set values come out of the form as strings
        lab_transactiontype: Number(values.lab_transactiontype),
        lab_transactiondate: new Date().toISOString(),
        "lab_itemid@odata.bind": `/lab_warehouseitems(${values.lab_itemid})`,
      })));
    },
    onSuccess: async () => {
      // Every list shows the same few records (Pick, Receive and the other tabs keep their own copies
      // for five minutes), so a change makes all of them stale: refetch what is on screen, the rest on its next visit
      await queryClient.invalidateQueries();
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
        entityName="lab_warehousetransaction"
        commands={[{ id: "new", label: "New Transaction", icon: "Add", onExecute: () => setDialogOpen(true) }]}
        onRefresh={() => queryClient.refetchQueries({ queryKey: ["allTransactions"] })}
      />

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create New Transaction"
        entityName="lab_warehousetransaction"
        fields={formFields}
        lookupRecords={{ lab_itemid: itemRecords }}
        onCreate={(values) => createMutation.mutateAsync(values)}
        pending={createMutation.isPending}
      />
    </div>
  );
}

