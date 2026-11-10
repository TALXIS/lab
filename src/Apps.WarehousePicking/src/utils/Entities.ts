import type { HostEntity } from "@/providers/pcf-host";

// The warehouse tables as TALXIS base controls see them (registered in router.tsx): lookups read
// their metadata, grids their primary columns, and items open on their detail page.
export const warehouseEntities: HostEntity[] = [
  {
    logicalName: "almlab_warehouseitem",
    displayName: "Warehouse Item",
    primaryIdAttribute: "almlab_warehouseitemid",
    primaryNameAttribute: "almlab_name",
    formPath: (id) => `/items/${id}`,
  },
  {
    logicalName: "almlab_warehouselocation",
    displayName: "Location",
    primaryIdAttribute: "almlab_warehouselocationid",
    primaryNameAttribute: "almlab_name",
  },
  {
    logicalName: "almlab_warehousetransaction",
    displayName: "Warehouse Transaction",
    primaryIdAttribute: "almlab_warehousetransactionid",
    primaryNameAttribute: "almlab_name",
  },
];
