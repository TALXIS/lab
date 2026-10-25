import { useEffect, useRef, useState } from "react"
import {
  Body1, Button, Caption1, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Field, Image,
  Input, MessageBar, MessageBarBody, Spinner,
} from "@fluentui/react-components"
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser"
import { useQueryClient } from "@tanstack/react-query"
import { Lab_warehouseitemsService } from "@/generated/services/Lab_warehouseitemsService"
import type { Product } from "@/generated/models/OpenFoodFactsModel"
import { useToast } from "@/hooks/use-toast"
import { bytesToDataUrl, ensureProduct, fetchImageBytes, lookUpBarcode, uploadProductImage } from "@/utils/products"
import { errorText, payload, unwrap } from "@/utils/service"

type Props = { itemId: string; hasProduct: boolean }

export function BarcodeScanDialog({ itemId, hasProduct }: Props) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [barcode, setBarcode] = useState("")
  const [product, setProduct] = useState<Product>()
  const [imageBytes, setImageBytes] = useState<Uint8Array | null>(null)
  const [busy, setBusy] = useState<"lookup" | "link">()
  const [error, setError] = useState<string>()
  const [cameraError, setCameraError] = useState<string>()
  const videoRef = useRef<HTMLVideoElement>(null)

  const reset = () => {
    setBarcode(""); setProduct(undefined); setImageBytes(null); setError(undefined); setCameraError(undefined)
  }

  const lookUp = async (code: string) => {
    const ean = code.trim()
    if (!ean) return
    setBusy("lookup"); setError(undefined); setProduct(undefined); setImageBytes(null)
    try {
      const found = await lookUpBarcode(ean)
      setProduct({ ...found, ean: found.ean || ean })
      if (found.imageUrl) setImageBytes(await fetchImageBytes(found.imageUrl).catch(() => null))
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(undefined)
    }
  }

  // Camera scanning; the typed barcode field always works too.
  useEffect(() => {
    if (!open || product) return
    let controls: IScannerControls | undefined
    let cancelled = false
    const reader = new BrowserMultiFormatReader()
    const start = async () => {
      try {
        if (!videoRef.current) return
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (result && !cancelled) {
            cancelled = true
            controls?.stop()
            setBarcode(result.getText())
            void lookUp(result.getText())
          }
        })
      } catch {
        setCameraError("No camera available. Type the barcode instead.")
      }
    }
    void start()
    return () => { cancelled = true; controls?.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product])

  const link = async () => {
    if (!product?.ean) return
    setBusy("link"); setError(undefined)
    try {
      const productId = await ensureProduct(product.ean, product)
      await unwrap(Lab_warehouseitemsService.update(itemId, payload({
        "lab_productid@odata.bind": `/lab_products(${productId})`,
      })))
      if (imageBytes) {
        try {
          await uploadProductImage(productId, product.ean, imageBytes)
        } catch (e) {
          toast.warning(`Product linked, but its image failed to save: ${errorText(e)}`)
        }
      }
      toast.success(`${product.name || product.ean} linked to the item`)
      await queryClient.invalidateQueries()
      setOpen(false)
      reset()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, d) => { setOpen(d.open); if (!d.open) reset() }}>
      <Button onClick={() => setOpen(true)}>{hasProduct ? "Rescan Barcode" : "Scan Barcode"}</Button>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{hasProduct ? "Rescan Barcode" : "Scan Barcode"}</DialogTitle>
          <DialogContent style={{ display: "grid", gap: 12 }}>
            {!product && (
              <>
                <video ref={videoRef} style={{ width: "100%", maxHeight: 240, background: "#000" }} muted playsInline />
                {cameraError && <Caption1>{cameraError}</Caption1>}
              </>
            )}
            <Field label="Barcode">
              <Input value={barcode} onChange={(_, d) => setBarcode(d.value)} inputMode="numeric"
                onKeyDown={(e) => { if (e.key === "Enter") void lookUp(barcode) }} />
            </Field>
            {busy === "lookup" && <Spinner size="small" label="Looking up…" />}
            {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
            {product && (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {imageBytes ? <Image src={bytesToDataUrl(imageBytes)} alt={product.name} width={96} height={96} fit="contain" /> : <Caption1>No image</Caption1>}
                <div>
                  <Body1><b>{product.name || product.ean}</b></Body1>
                  <Caption1>{[product.brand, product.quantity].filter(Boolean).join(" · ")}</Caption1>
                </div>
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpen(false); reset() }}>Cancel</Button>
            <Button onClick={() => lookUp(barcode)} disabled={!barcode.trim() || !!busy}>Look Up</Button>
            <Button appearance="primary" onClick={link} disabled={!product || !!busy}>
              {busy === "link" ? "Linking…" : "Link to Item"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
