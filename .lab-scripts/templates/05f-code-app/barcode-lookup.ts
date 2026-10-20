/** What is known about a barcode from an outside catalog. */
export type BarcodeProduct = {
  /** The product's name, to prefill a new item with. */
  name?: string;
  /** Creates (or finds) the catalog record for the barcode and returns its id, to link a new item to. */
  ensureProductId?: () => Promise<string | undefined>;
};

// Looks a barcode up in an outside product catalog so a new item can start from its data. Nothing is
// connected here, so nothing is found and a new item is typed in by hand. The Open Food Facts step
// (script 18, CP11) replaces this file with a version that asks the connector.
export async function lookupBarcode(ean: string): Promise<BarcodeProduct | null> {
  void ean;
  return null;
}
