import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Almlab_warehousetransactionsService } from "@/generated/services/Almlab_warehousetransactionsService";
import { Almlab_warehouseitemsService } from "@/generated/services/Almlab_warehouseitemsService";
import type { Almlab_warehousetransactions } from "@/generated/models/Almlab_warehousetransactionsModel";
import type { Almlab_warehouseitems } from "@/generated/models/Almlab_warehouseitemsModel";
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
import { servicePayload } from "@/utils/ServicePayload";

const transactionTypeMetadata = {
  OptionSet: transactionTypeOptionMetadata,
} as IColumn["metadata"];

const columns: IColumn[] = [
  { name: "almlab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true, visualSizeFactor: 240 },
  { name: "almlab_quantity", displayName: "Quantity", dataType: "Whole.None", visualSizeFactor: 110 },
  { name: "almlab_transactiontype", displayName: "Type", dataType: "OptionSet", visualSizeFactor: 130, metadata: transactionTypeMetadata },
  { name: "item", displayName: "Item", dataType: "SingleLine.Text", visualSizeFactor: 200 },
  { name: "almlab_transactiondate", displayName: "Date", dataType: "DateAndTime.DateOnly", visualSizeFactor: 120 },
];

// The New Transaction form: every field is required, and a quantity must be at least 1 - the
// direction comes from the type. The item is an id string, picked through a RecordLookup.
const formFields: FormField[] = [
  { column: { name: "almlab_name", displayName: "Name", dataType: "SingleLine.Text", isPrimary: true }, required: true },
  { column: { name: "almlab_itemid", displayName: "Warehouse Item", dataType: "SingleLine.Text" }, required: true, lookupEntity: "almlab_warehouseitem" },
  { column: { name: "almlab_quantity", displayName: "Quantity", dataType: "Whole.None", metadata: { MinValue: 1 } as IColumn["metadata"] }, required: true },
  { column: { name: "almlab_transactiontype", displayName: "Transaction Type", dataType: "OptionSet", metadata: transactionTypeMetadata }, required: true },
];

export default function TransactionsPage() {
  const styles = useStyles();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: transactions, error } = useQuery({
    queryKey: ["allTransactions"],
    queryFn: async () => {
      const result = await Almlab_warehousetransactionsService.getAll({
        select: [
          "almlab_warehousetransactionid",
          "almlab_name",
          "almlab_quantity",
          "almlab_transactiontype",
          "almlab_transactiondate",
          "_almlab_itemid_value",
        ],
        orderBy: ["almlab_transactiondate desc"],
      });
      return result.data ?? [];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["warehouseItemsLookup"],
    queryFn: async () => {
      const result = await Almlab_warehouseitemsService.getAll({
        // All items, inactive ones too: the grid names the item of every transaction
        select: ["almlab_warehouseitemid", "almlab_name", "statecode"],
        orderBy: ["almlab_name asc"],
      });
      return result.data ?? [];
    },
  });

  // Only active items can be picked for a new transaction
  const itemRecords = useMemo(
    () =>
      (items ?? [])
        .filter((item: Almlab_warehouseitems) => Number(item.statecode) === 0)
        .map((item: Almlab_warehouseitems) => ({
          id: item.almlab_warehouseitemid,
          name: item.almlab_name ?? "",
        })),
    [items]
  );

  const itemNames = useMemo(
    () => new Map((items ?? []).map((item: Almlab_warehouseitems) => [item.almlab_warehouseitemid, item.almlab_name ?? ""])),
    [items]
  );

  // Grid rows: numbers for numeric/option set columns, and the item lookup resolved to its name
  const rows = useMemo(
    () =>
      transactions?.map((tx: Almlab_warehousetransactions) => ({
        ...tx,
        almlab_quantity: Number(tx.almlab_quantity),
        almlab_transactiontype: Number(tx.almlab_transactiontype),
        item: itemNames.get(tx._almlab_itemid_value ?? "") ?? "",
      })),
    [transactions, itemNames]
  );

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      return Almlab_warehousetransactionsService.create(servicePayload({
        almlab_name: values.almlab_name,
        almlab_quantity: String(values.almlab_quantity),
        // Option set values come out of the form as strings
        almlab_transactiontype: Number(values.almlab_transactiontype),
        almlab_transactiondate: new Date().toISOString(),
        "almlab_itemid@odata.bind": `/almlab_warehouseitems(${values.almlab_itemid})`,
      }));
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["allTransactions"] });
      toast.success("Transaction created successfully");
    },
    onError: (err) => {
      toast.error("Failed to create transaction: " + String(err));
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
          <MessageBarBody>Failed to load transactions: {String(error)}</MessageBarBody>
        </MessageBar>
      )}

      <RecordGrid
        rows={rows}
        columns={columns}
        entityName="almlab_warehousetransaction"
        commands={[{ id: "new", label: "New Transaction", icon: "Add", onExecute: () => setDialogOpen(true) }]}
        onRefresh={() => queryClient.refetchQueries({ queryKey: ["allTransactions"] })}
      />

      <RecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create New Transaction"
        entityName="almlab_warehousetransaction"
        fields={formFields}
        lookupRecords={{ almlab_itemid: itemRecords }}
        onCreate={(values) => createMutation.mutateAsync(values)}
        pending={createMutation.isPending}
      />
    </div>
  );
}
