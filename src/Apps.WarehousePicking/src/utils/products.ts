import { useQuery } from "@tanstack/react-query"
import { getClient } from "@microsoft/power-apps/data"
import { dataSourcesInfo } from "../../.power/schemas/appschemas/dataSourcesInfo"
import { Lab_productsService } from "@/generated/services/Lab_productsService"
import { OpenFoodFactsService } from "@/generated/services/OpenFoodFactsService"
import type { Product } from "@/generated/models/OpenFoodFactsModel"
import { payload, unwrap } from "@/utils/service"

const client = getClient(dataSourcesInfo)

// A binary connector response arrives as a base64 string.
export function base64ToBytes(data: unknown): Uint8Array | null {
  if (typeof data !== "string") return null
  try {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

// The code app CSP allows data: images but not blob: URLs.
export function bytesToDataUrl(bytes: Uint8Array, mime = "image/jpeg"): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return `data:${mime};base64,${btoa(binary)}`
}

export async function lookUpBarcode(barcode: string): Promise<Product> {
  const result = await OpenFoodFactsService.GetProductByBarcode(barcode)
  if (!result.success) {
    const text = result.error?.message ?? ""
    throw new Error(/404|No product found/i.test(text) ? "No product found for this barcode" : text || "Lookup failed")
  }
  return result.data
}

export async function fetchImageBytes(imageUrl: string): Promise<Uint8Array | null> {
  const result = await OpenFoodFactsService.GetProductImage(imageUrl)
  return result.success ? base64ToBytes(result.data) : null
}

/** Reuses the Product with this EAN, or creates it. Returns its id. */
export async function ensureProduct(ean: string, product: Product): Promise<string> {
  const safeEan = ean.replace(/'/g, "''")
  const existing = await unwrap(Lab_productsService.getAll({ filter: `lab_ean eq '${safeEan}'`, top: 1 }))
  if (existing.length) return existing[0].lab_productid
  const created = await unwrap(Lab_productsService.create(payload({
    lab_name: product.name || ean,
    lab_ean: ean,
    lab_brand: product.brand,
    lab_quantity: product.quantity,
    lab_imageurl: product.imageUrl,
    lab_lastsyncedon: new Date().toISOString(),
  })))
  return created.lab_productid
}

export async function uploadProductImage(productId: string, ean: string, bytes: Uint8Array): Promise<void> {
  const result = await client.uploadFileToRecord("lab_products", productId, "lab_productimage", `${ean}.jpg`, bytes)
  if (!result.success) throw new Error(result.error?.message ?? "Image upload failed")
}

export function useProductImage(productId?: string) {
  return useQuery({
    queryKey: ["productImage", productId],
    enabled: !!productId,
    retry: false,
    queryFn: async () => {
      const result = await client.downloadFileFromRecord("lab_products", productId!, "lab_productimage")
      if (!result.success || !result.data?.length) return null
      return bytesToDataUrl(result.data)
    },
  })
}
