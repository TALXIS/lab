import { createBrowserRouter } from "react-router-dom"
import Layout from "@/pages/Layout"
import QuickActionsPage from "@/pages/QuickActions"
import QuickTransactionPage from "@/pages/QuickTransaction"
import StockCountPage from "@/pages/StockCount"
import FindItemPage from "@/pages/FindItem"
import WarehouseItemsPage from "@/pages/WarehouseItems"
import WarehouseItemDetailPage from "@/pages/WarehouseItemDetail"
import TransactionsPage from "@/pages/Transactions"
import LocationsPage from "@/pages/Locations"
import NotFoundPage from "@/pages/not-found"
import { registerEntities, setHostNavigate } from "@/providers/pcf-host"
import { warehouseEntities } from "@/utils/Entities"

// IMPORTANT: Do not remove or modify the code below!
// Normalize basename when hosted in Power Apps
const BASENAME = new URL(".", location.href).pathname
if (location.pathname.endsWith("/index.html")) {
  history.replaceState(null, "", BASENAME + location.search + location.hash);
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout showHeader={true} />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <QuickActionsPage /> },
      { path: "receive", element: <QuickTransactionPage mode="receive" /> },
      { path: "pick", element: <QuickTransactionPage mode="pick" /> },
      { path: "inventory", element: <StockCountPage /> },
      { path: "find", element: <FindItemPage /> },
      { path: "items", element: <WarehouseItemsPage /> },
      { path: "items/:id", element: <WarehouseItemDetailPage /> },
      { path: "transactions", element: <TransactionsPage /> },
      { path: "locations", element: <LocationsPage /> },
    ],
  },
], {
  basename: BASENAME // IMPORTANT: Set basename for proper routing when hosted in Power Apps
})

// What TALXIS base controls need from this app: the warehouse tables, and in-app navigation for
// opening their records (context.navigation.openForm)
registerEntities(...warehouseEntities)
setHostNavigate((path) => router.navigate(path))
