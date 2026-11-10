import { useState } from "react";
import { Button, MessageBar, MessageBarActions, MessageBarBody } from "@fluentui/react-components";
import { BarcodeScannerRegular } from "@fluentui/react-icons";
import { BarcodeScanPanel } from "@/components/mobile/BarcodeScanPanel";
import { ItemPicker } from "@/components/mobile/ItemPicker";
import { NewItemDialog } from "@/components/mobile/NewItemDialog";
import { usePickItems, type PickItem } from "@/hooks/UsePickItems";
import { sameBarcode } from "@/utils/Barcode";
import { lookupBarcode, type BarcodeProduct } from "@/utils/BarcodeLookup";
import { useStyles } from "@/styles/ReceiveItemChooser.styles";

type ReceiveItemChooserProps = {
  onSelect: (item: PickItem) => void;
};

type NewItem = { defaults: { name?: string; barcode?: string }; product: BarcodeProduct | null };

// The first step of Receive: goods arrive, so they may not be in the system yet. Scan or type the
// barcode to jump to the item that carries it, search by name, or - when nothing matches - add the
// item right here (a scanned barcode comes along, and a connected catalog can supply the name).
export function ReceiveItemChooser({ onSelect }: ReceiveItemChooserProps) {
  const styles = useStyles();
  const { items } = usePickItems();
  const [scanning, setScanning] = useState(false);
  const [unmatched, setUnmatched] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [newItem, setNewItem] = useState<NewItem | null>(null);

  const handleBarcode = (barcode: string) => {
    setScanning(false);
    const match = items.find((item) => sameBarcode(item.barcode, barcode));
    if (match) {
      onSelect(match);
      return;
    }
    setUnmatched(barcode);
  };

  const startNewItem = async (defaults: NewItem["defaults"]) => {
    let product: BarcodeProduct | null = null;
    // A scanned barcode is asked of the catalog first, so the form opens with the product's name
    if (defaults.barcode) {
      setLooking(true);
      try {
        product = await lookupBarcode(defaults.barcode);
      } catch {
        product = null; // no catalog answer is not an error: the item is typed in by hand
      } finally {
        setLooking(false);
      }
    }
    setNewItem({ defaults: { ...defaults, name: defaults.name ?? product?.name }, product });
  };

  return (
    <div className={styles.root}>
      <Button
        className={styles.scan}
        appearance="primary"
        size="large"
        icon={<BarcodeScannerRegular />}
        data-testid="scan-barcode"
        onClick={() => {
          setScanning((open) => !open);
          setUnmatched(null);
        }}
      >
        {scanning ? "Close scanner" : "Scan barcode"}
      </Button>

      {scanning && <BarcodeScanPanel onDetected={handleBarcode} />}

      {unmatched && (
        <MessageBar intent="warning" layout="multiline" data-testid="no-barcode-match">
          <MessageBarBody>No item has the barcode {unmatched}.</MessageBarBody>
          <MessageBarActions>
            <Button disabled={looking} onClick={() => void startNewItem({ barcode: unmatched })}>
              {looking ? "Looking up..." : "Create new item"}
            </Button>
          </MessageBarActions>
        </MessageBar>
      )}

      <ItemPicker onSelect={onSelect} onCreate={(search) => void startNewItem({ name: search || undefined })} />

      <NewItemDialog
        open={newItem !== null}
        onOpenChange={(open) => !open && setNewItem(null)}
        defaults={newItem?.defaults}
        product={newItem?.product}
        onCreated={(item) => {
          setNewItem(null);
          onSelect(item);
        }}
      />
    </div>
  );
}
