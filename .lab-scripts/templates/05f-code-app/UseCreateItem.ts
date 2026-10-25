import { useMutation, useQueryClient } from "@tanstack/react-query";
import { __PASCAL___warehouseitemsService } from "@/generated/services/__PASCAL___warehouseitemsService";
import type { __PASCAL___warehouseitems } from "@/generated/models/__PASCAL___warehouseitemsModel";
import type { __PASCAL___warehouselocations } from "@/generated/models/__PASCAL___warehouselocationsModel";
import { LOCATIONS_KEY, PICK_ITEMS_KEY, toPickItems, type PickItem } from "@/hooks/UsePickItems";
import { servicePayload, serviceResult } from "@/utils/ServicePayload";

type CreateItemInput = {
  /** The New item form's values. */
  values: Record<string, unknown>;
  /** From a catalog lookup: makes the catalog record the new item is linked to. */
  ensureProductId?: () => Promise<string | undefined>;
};

// Creates a warehouse item at 0 on hand (the Inbound transaction that follows books the received
// quantity) and hands back the new item as the quick-action screens list it. The create call's
// response doesn't reliably carry the new id, so the item is found again by re-reading the list.
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ values, ensureProductId }: CreateItemInput): Promise<PickItem> => {
      const productId = await ensureProductId?.();
      // The items listed before the create: the new one is the match that isn't among them
      const known = new Set(
        (queryClient.getQueryData<__PASCAL___warehouseitems[]>(PICK_ITEMS_KEY) ?? []).map((item) => item.__PREFIX___warehouseitemid)
      );
      await serviceResult(__PASCAL___warehouseitemsService.create(
        servicePayload({
          __PREFIX___name: values.__PREFIX___name,
          __PREFIX___sku: values.__PREFIX___sku,
          __PREFIX___category: Number(values.__PREFIX___category),
          __PREFIX___barcode: values.__PREFIX___barcode || undefined,
          __PREFIX___availablequantity: "0",
          ...(values.__PREFIX___locationid
            ? { "__PREFIX___locationid@odata.bind": `/__PREFIX___warehouselocations(${values.__PREFIX___locationid})` }
            : {}),
          ...(productId ? { "__PREFIX___productid@odata.bind": `/__PREFIX___products(${productId})` } : {}),
        })
      ));

      await queryClient.refetchQueries({ queryKey: PICK_ITEMS_KEY });
      const items = queryClient.getQueryData<__PASCAL___warehouseitems[]>(PICK_ITEMS_KEY) ?? [];
      const locations = queryClient.getQueryData<__PASCAL___warehouselocations[]>(LOCATIONS_KEY) ?? [];
      // Name and SKU aren't unique: of the matches, take the one that wasn't there before
      const matches = toPickItems(items, locations)
        .filter((item) => item.name === values.__PREFIX___name && item.sku === values.__PREFIX___sku);
      const created = matches.find((item) => !known.has(item.id)) ?? matches.pop();
      if (!created) throw new Error("The item was created but could not be found again - search for it.");

      void queryClient.invalidateQueries({ queryKey: ["warehouseItems"] });
      return created;
    },
  });
}
