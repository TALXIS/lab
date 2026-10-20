// What a barcode can be before it's worth a lookup: digits only, in one of the standard lengths
// (EAN-8, UPC-A, EAN-13, GTIN-14). Deliberately no checksum - a typo that happens to keep the length
// is cheap to find out from the lookup itself.
export function eanError(value: string): string | undefined {
  if (!value) return undefined; // nothing typed yet: not an error
  if (!/^\d+$/.test(value)) return "A barcode contains only digits";
  if (![8, 12, 13, 14].includes(value.length)) return "A barcode has 8, 12, 13 or 14 digits";
  return undefined;
}

const significantDigits = (value: string) => value.replace(/\D/g, "").replace(/^0+/, "");

/** Whether two barcodes are the same code: UPC-A and its EAN-13 spelling differ by leading zeros only. */
export function sameBarcode(a: string, b: string) {
  const digits = significantDigits(a);
  return digits !== "" && digits === significantDigits(b);
}
