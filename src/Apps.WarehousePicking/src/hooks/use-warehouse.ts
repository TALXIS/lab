import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Lab_warehouseitemsService } from "@/generated/services/Lab_warehouseitemsService"
import { Lab_warehouselocationsService } from "@/generated/services/Lab_warehouselocationsService"
import { Lab_warehousetransactionsService } from "@/generated/services/Lab_warehousetransactionsService"
import { payload, unwrap, TRANSACTION_TYPE, type TransactionType } from "@/utils/service"

export const useItems = () =>
  useQuery({
    queryKey: ["items"],
    queryFn: () => unwrap(Lab_warehouseitemsService.getAll({ orderBy: ["lab_name asc"] })),
  })

export const useItem = (id: string) =>
  useQuery({ queryKey: ["item", id], queryFn: () => unwrap(Lab_warehouseitemsService.get(id)) })

export const useLocations = () =>
  useQuery({
    queryKey: ["locations"],
    queryFn: () => unwrap(Lab_warehouselocationsService.getAll({ orderBy: ["lab_name asc"] })),
  })

export const useTransactions = (itemId?: string) =>
  useQuery({
    queryKey: ["transactions", itemId ?? "all"],
    queryFn: () =>
      unwrap(Lab_warehousetransactionsService.getAll({
        orderBy: ["createdon desc"],
        filter: itemId ? `_lab_itemid_value eq ${itemId}` : undefined,
      })),
  })

export type NewTransaction = { itemId: string; name: string; quantity: number; type: TransactionType }

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, name, quantity, type }: NewTransaction) =>
      unwrap(Lab_warehousetransactionsService.create(payload({
        lab_name: name,
        lab_quantity: quantity,
        lab_transactiontype: TRANSACTION_TYPE[type],
        lab_transactiondate: new Date().toISOString(),
        "lab_itemid@odata.bind": `/lab_warehouseitems(${itemId})`,
      }))),
    onSettled: () => queryClient.invalidateQueries(),
  })
}

export type NewItem = { name: string; sku: string; quantity: number; category: number; locationId?: string }

export function useCreateItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, sku, quantity, category, locationId }: NewItem) =>
      unwrap(Lab_warehouseitemsService.create(payload({
        lab_name: name,
        lab_sku: sku,
        lab_availablequantity: quantity,
        lab_category: category,
        ...(locationId ? { "lab_locationid@odata.bind": `/lab_warehouselocations(${locationId})` } : {}),
      }))),
    onSettled: () => queryClient.invalidateQueries(),
  })
}

export type NewLocation = { name: string; address: string; capacity: number }

export function useCreateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, address, capacity }: NewLocation) =>
      unwrap(Lab_warehouselocationsService.create(payload({
        lab_name: name,
        lab_address: address,
        lab_capacity: capacity,
      }))),
    onSettled: () => queryClient.invalidateQueries(),
  })
}
