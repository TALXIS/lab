import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Almlab_warehouseitemsService } from "@/generated/services/Almlab_warehouseitemsService";
import type { Almlab_warehouseitems } from "@/generated/models/Almlab_warehouseitemsModel";
import type { Almlab_warehouselocations } from "@/generated/models/Almlab_warehouselocationsModel";
import { LOCATIONS_KEY, PICK_ITEMS_KEY, toPickItems, type PickItem } from "@/hooks/UsePickItems";
import { servicePayload } from "@/utils/ServicePayload";

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
      await Almlab_warehouseitemsService.create(
        servicePayload({
          almlab_name: values.almlab_name,
          almlab_sku: values.almlab_sku,
          almlab_category: Number(values.almlab_category),
          almlab_barcode: values.almlab_barcode || undefined,
          almlab_availablequantity: "0",
          ...(values.almlab_locationid
            ? { "almlab_locationid@odata.bind": `/almlab_warehouselocations(${values.almlab_locationid})` }
            : {}),
          ...(productId ? { "almlab_productid@odata.bind": `/almlab_products(${productId})` } : {}),
        })
      );

      await queryClient.refetchQueries({ queryKey: PICK_ITEMS_KEY });
      const items = queryClient.getQueryData<Almlab_warehouseitems[]>(PICK_ITEMS_KEY) ?? [];
      const locations = queryClient.getQueryData<Almlab_warehouselocations[]>(LOCATIONS_KEY) ?? [];
      // Name and SKU identify it; if two match, the last one listed is taken
      const created = toPickItems(items, locations)
        .filter((item) => item.name === values.almlab_name && item.sku === values.almlab_sku)
        .pop();
      if (!created) throw new Error("The item was created but could not be found again - search for it.");

      void queryClient.invalidateQueries({ queryKey: ["warehouseItems"] });
      return created;
    },
  });
}
