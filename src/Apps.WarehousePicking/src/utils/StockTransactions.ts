import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Almlab_warehousetransactionsService } from "@/generated/services/Almlab_warehousetransactionsService";
import { PICK_ITEMS_KEY } from "@/hooks/UsePickItems";
import { servicePayload } from "@/utils/ServicePayload";

// The transaction type option values; the server adds Inbound to an item's quantity and subtracts
// Outbound (and refuses an Outbound larger than what is on hand).
const TRANSACTION_TYPE = { inbound: 100000000, outbound: 100000001 } as const;

/** A failure as the worker should read it: the server's message without the "Error: " wrapper. */
export function errorText(error: unknown): string {
  return String(error).replace(/^Error:\s*/, "");
}

type StockTransactionInput = {
  itemId: string;
  itemName: string;
  type: keyof typeof TRANSACTION_TYPE;
  quantity: number;
  /** What the movement is, e.g. "Receive": the transaction is named "<label> - <item>". */
  label: string;
};

// Posts one stock movement and refreshes everything that shows quantities, so the other pages are
// right when the worker moves on. Rejects with the server's message, e.g. when over-picking.
export function useStockTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, itemName, type, quantity, label }: StockTransactionInput) => {
      return Almlab_warehousetransactionsService.create(servicePayload({
        almlab_name: `${label} - ${itemName}`,
        almlab_quantity: String(quantity),
        almlab_transactiontype: TRANSACTION_TYPE[type],
        almlab_transactiondate: new Date().toISOString(),
        "almlab_itemid@odata.bind": `/almlab_warehouseitems(${itemId})`,
      }));
    },
    onSuccess: async (_result, { itemId }) => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: PICK_ITEMS_KEY }),
        queryClient.invalidateQueries({ queryKey: ["warehouseItems"] }),
        queryClient.invalidateQueries({ queryKey: ["allTransactions"] }),
        queryClient.invalidateQueries({ queryKey: ["itemTransactions", itemId] }),
        queryClient.invalidateQueries({ queryKey: ["warehouseItem", itemId] }),
      ]);
    },
  });
}
