import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { __PASCAL___warehouseitemsService } from "@/generated/services/__PASCAL___warehouseitemsService";
import { __PASCAL___warehouselocationsService } from "@/generated/services/__PASCAL___warehouselocationsService";
import type { __PASCAL___warehouseitems } from "@/generated/models/__PASCAL___warehouseitemsModel";
import type { __PASCAL___warehouselocations } from "@/generated/models/__PASCAL___warehouselocationsModel";
import { serviceResult } from "@/utils/ServicePayload";

/** An active item as the quick-action screens list it. */
export type PickItem = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  quantity: number;
  /** The location's name, "" when the item has none. */
  location: string;
};

export const PICK_ITEMS_KEY = ["mobileItems"];
export const LOCATIONS_KEY = ["warehouseLocations"];

/** Items as the quick-action screens list them, with their location names resolved. */
export function toPickItems(items: __PASCAL___warehouseitems[], locations: __PASCAL___warehouselocations[]): PickItem[] {
  const locationNames = new Map(locations.map((loc) => [loc.__PREFIX___warehouselocationid, loc.__PREFIX___name ?? ""]));
  return items.map((item) => ({
    id: item.__PREFIX___warehouseitemid,
    name: item.__PREFIX___name ?? "",
    sku: item.__PREFIX___sku ?? "",
    barcode: item.__PREFIX___barcode ?? "",
    quantity: Number(item.__PREFIX___availablequantity),
    location: locationNames.get(item.___PREFIX___locationid_value ?? "") ?? "",
  }));
}

// The active items the quick actions choose from, with their location names resolved. Loaded
// whole and filtered on the device: instant typing on a phone, fine for a warehouse's item list.
export function usePickItems() {
  const itemsQuery = useQuery({
    queryKey: PICK_ITEMS_KEY,
    queryFn: async () => {
      const result = await serviceResult(__PASCAL___warehouseitemsService.getAll({
        select: [
          "__PREFIX___warehouseitemid",
          "__PREFIX___name",
          "__PREFIX___sku",
          "__PREFIX___barcode",
          "__PREFIX___availablequantity",
          "___PREFIX___locationid_value",
        ],
        filter: "statecode eq 0",
        orderBy: ["__PREFIX___name asc"],
      }));
      return result.data ?? [];
    },
  });

  // Same query (and key) as the Items page's location lookup, so the two share one request
  const { data: locations } = useQuery({
    queryKey: LOCATIONS_KEY,
    queryFn: async () => {
      const result = await serviceResult(__PASCAL___warehouselocationsService.getAll({
        select: ["__PREFIX___warehouselocationid", "__PREFIX___name"],
        orderBy: ["__PREFIX___name asc"],
      }));
      return result.data ?? [];
    },
  });

  const items = useMemo(() => toPickItems(itemsQuery.data ?? [], locations ?? []), [itemsQuery.data, locations]);
  // For a location lookup (id and name)
  const locationRecords = useMemo(
    () => (locations ?? []).map((loc: __PASCAL___warehouselocations) => ({ id: loc.__PREFIX___warehouselocationid, name: loc.__PREFIX___name ?? "" })),
    [locations]
  );

  return { items, locationRecords, isLoading: itemsQuery.isLoading, error: itemsQuery.error };
}
