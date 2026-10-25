import type { HostEntity } from "@/providers/pcf-host";

// The warehouse tables as TALXIS base controls see them (registered in Router.tsx): lookups read
// their metadata, grids their primary columns, and items open on their detail page.
export const warehouseEntities: HostEntity[] = [
  {
    logicalName: "lab_warehouseitem",
    displayName: "Warehouse Item",
    primaryIdAttribute: "lab_warehouseitemid",
    primaryNameAttribute: "lab_name",
    formPath: (id) => `/items/${id}`,
  },
  {
    logicalName: "lab_warehouselocation",
    displayName: "Location",
    primaryIdAttribute: "lab_warehouselocationid",
    primaryNameAttribute: "lab_name",
  },
  {
    logicalName: "lab_warehousetransaction",
    displayName: "Warehouse Transaction",
    primaryIdAttribute: "lab_warehousetransactionid",
    primaryNameAttribute: "lab_name",
  },
];

