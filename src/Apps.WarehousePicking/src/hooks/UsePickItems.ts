import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lab_warehouseitemsService } from "@/generated/services/Lab_warehouseitemsService";
import { Lab_warehouselocationsService } from "@/generated/services/Lab_warehouselocationsService";
import type { Lab_warehouseitems } from "@/generated/models/Lab_warehouseitemsModel";
import type { Lab_warehouselocations } from "@/generated/models/Lab_warehouselocationsModel";
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
export function toPickItems(items: Lab_warehouseitems[], locations: Lab_warehouselocations[]): PickItem[] {
  const locationNames = new Map(locations.map((loc) => [loc.lab_warehouselocationid, loc.lab_name ?? ""]));
  return items.map((item) => ({
    id: item.lab_warehouseitemid,
    name: item.lab_name ?? "",
    sku: item.lab_sku ?? "",
    barcode: item.lab_barcode ?? "",
    quantity: Number(item.lab_availablequantity),
    location: locationNames.get(item._lab_locationid_value ?? "") ?? "",
  }));
}

// The active items the quick actions choose from, with their location names resolved. Loaded
// whole and filtered on the device: instant typing on a phone, fine for a warehouse's item list.
export function usePickItems() {
  const itemsQuery = useQuery({
    queryKey: PICK_ITEMS_KEY,
    queryFn: async () => {
      const result = await serviceResult(Lab_warehouseitemsService.getAll({
        select: [
          "lab_warehouseitemid",
          "lab_name",
          "lab_sku",
          "lab_barcode",
          "lab_availablequantity",
          "_lab_locationid_value",
        ],
        filter: "statecode eq 0",
        orderBy: ["lab_name asc"],
      }));
      return result.data ?? [];
    },
  });

  // Same query (and key) as the Items page's location lookup, so the two share one request
  const { data: locations } = useQuery({
    queryKey: LOCATIONS_KEY,
    queryFn: async () => {
      const result = await serviceResult(Lab_warehouselocationsService.getAll({
        select: ["lab_warehouselocationid", "lab_name"],
        orderBy: ["lab_name asc"],
      }));
      return result.data ?? [];
    },
  });

  const items = useMemo(() => toPickItems(itemsQuery.data ?? [], locations ?? []), [itemsQuery.data, locations]);
  // For a location lookup (id and name)
  const locationRecords = useMemo(
    () => (locations ?? []).map((loc: Lab_warehouselocations) => ({ id: loc.lab_warehouselocationid, name: loc.lab_name ?? "" })),
    [locations]
  );

  return { items, locationRecords, isLoading: itemsQuery.isLoading, error: itemsQuery.error };
}

