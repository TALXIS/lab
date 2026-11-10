import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Almlab_warehouseitemsService } from "@/generated/services/Almlab_warehouseitemsService";
import { Almlab_warehouselocationsService } from "@/generated/services/Almlab_warehouselocationsService";
import type { Almlab_warehouseitems } from "@/generated/models/Almlab_warehouseitemsModel";
import type { Almlab_warehouselocations } from "@/generated/models/Almlab_warehouselocationsModel";

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
export function toPickItems(items: Almlab_warehouseitems[], locations: Almlab_warehouselocations[]): PickItem[] {
  const locationNames = new Map(locations.map((loc) => [loc.almlab_warehouselocationid, loc.almlab_name ?? ""]));
  return items.map((item) => ({
    id: item.almlab_warehouseitemid,
    name: item.almlab_name ?? "",
    sku: item.almlab_sku ?? "",
    barcode: item.almlab_barcode ?? "",
    quantity: Number(item.almlab_availablequantity),
    location: locationNames.get(item._almlab_locationid_value ?? "") ?? "",
  }));
}

// The active items the quick actions choose from, with their location names resolved. Loaded
// whole and filtered on the device: instant typing on a phone, fine for a warehouse's item list.
export function usePickItems() {
  const itemsQuery = useQuery({
    queryKey: PICK_ITEMS_KEY,
    queryFn: async () => {
      const result = await Almlab_warehouseitemsService.getAll({
        select: [
          "almlab_warehouseitemid",
          "almlab_name",
          "almlab_sku",
          "almlab_barcode",
          "almlab_availablequantity",
          "_almlab_locationid_value",
        ],
        filter: "statecode eq 0",
        orderBy: ["almlab_name asc"],
      });
      return result.data ?? [];
    },
  });

  // Same query (and key) as the Items page's location lookup, so the two share one request
  const { data: locations } = useQuery({
    queryKey: LOCATIONS_KEY,
    queryFn: async () => {
      const result = await Almlab_warehouselocationsService.getAll({
        select: ["almlab_warehouselocationid", "almlab_name"],
        orderBy: ["almlab_name asc"],
      });
      return result.data ?? [];
    },
  });

  const items = useMemo(() => toPickItems(itemsQuery.data ?? [], locations ?? []), [itemsQuery.data, locations]);
  // For a location lookup (id and name)
  const locationRecords = useMemo(
    () => (locations ?? []).map((loc: Almlab_warehouselocations) => ({ id: loc.almlab_warehouselocationid, name: loc.almlab_name ?? "" })),
    [locations]
  );

  return { items, locationRecords, isLoading: itemsQuery.isLoading, error: itemsQuery.error };
}
