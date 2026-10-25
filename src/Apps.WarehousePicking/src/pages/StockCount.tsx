import { useState } from "react";
import { Button, MessageBar, MessageBarBody } from "@fluentui/react-components";
import { Lab_warehouseitemsService } from "@/generated/services/Lab_warehouseitemsService";
import { ItemPicker } from "@/components/mobile/ItemPicker";
import { ItemSummary } from "@/components/mobile/ItemSummary";
import { MobilePage } from "@/components/mobile/MobilePage";
import { QuantityStepper } from "@/components/mobile/QuantityStepper";
import { ResultPanel } from "@/components/mobile/ResultPanel";
import type { PickItem } from "@/hooks/UsePickItems";
import { errorText, useStockTransaction } from "@/utils/StockTransactions";
import { useStyles } from "@/styles/QuickTransaction.styles";
import { serviceResult } from "@/utils/ServicePayload";

// Take inventory: the worker counts what is on the shelf, starting from 0 like a tally counter (big Add,
// small minus, or type the total), and the app books the difference to what is on record as an Inbound
// or Outbound "Stock count" transaction (the server then settles the quantity). The quantity on record
// is kept off the screens until the count is confirmed, so it can't colour the count.
export default function StockCountPage() {
  const styles = useStyles();
  const stock = useStockTransaction();
  const [item, setItem] = useState<PickItem | null>(null);
  const [counted, setCounted] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; detail: string } | null>(null);

  const restart = () => {
    setItem(null);
    setCounted(null);
    setNotice(null);
    setFailure(null);
    setResult(null);
    stock.reset();
  };

  const choose = (picked: PickItem) => {
    setItem(picked);
    setCounted(0);
  };

  if (result) {
    return (
      <MobilePage title="Take inventory">
        <ResultPanel title={result.title} detail={result.detail} onAgain={restart} againLabel="Count another item" />
      </MobilePage>
    );
  }

  if (!item) {
    return (
      <MobilePage title="Take inventory">
        <ItemPicker onSelect={choose} hideOnHand />
      </MobilePage>
    );
  }

  const valid = counted !== null;

  const confirm = async () => {
    if (counted === null) return;
    setChecking(true);
    setNotice(null);
    setFailure(null);
    try {
      // The quantity shown may be stale: another worker may have moved stock since this item was picked
      const live = Number((await serviceResult(Lab_warehouseitemsService.get(item.id))).data?.lab_availablequantity);
      if (live !== item.quantity) {
        setItem({ ...item, quantity: live });
        // No numbers: the count should stay blind. Say it and let the worker check
        setNotice("Stock changed while you were counting. Check your count and confirm again.");
        return;
      }

      const difference = counted - live;
      if (difference === 0) {
        setResult({ title: "Count matches", detail: `${item.name} - ${live} on hand, nothing to adjust` });
        return;
      }
      await stock.mutateAsync({
        itemId: item.id,
        itemName: item.name,
        type: difference > 0 ? "inbound" : "outbound",
        quantity: Math.abs(difference),
        label: "Stock count",
      });
      setResult({
        title: `Adjusted by ${difference > 0 ? "+" : "-"}${Math.abs(difference)}`,
        detail: `${item.name} - ${counted} on hand now (was ${live})`,
      });
    } catch (err) {
      setFailure(errorText(err));
    } finally {
      setChecking(false);
    }
  };

  return (
    <MobilePage
      title="Take inventory"
      footer={
        <Button
          className={styles.confirm}
          appearance="primary"
          size="large"
          disabled={!valid || checking}
          onClick={() => void confirm()}
          data-testid="flow-confirm"
        >
          {checking ? "Saving..." : "Confirm count"}
        </Button>
      }
    >
      <ItemSummary item={item} onChange={restart} hideOnHand />
      <QuantityStepper
        id="counted-quantity"
        variant="counter"
        label="Counted on the shelf"
        value={counted}
        onChange={setCounted}
        min={0}
        hint={counted === null ? "Enter how many you counted" : "Tap +1 for each one you count"}
      />
      {notice && (
        <MessageBar intent="warning">
          <MessageBarBody>{notice}</MessageBarBody>
        </MessageBar>
      )}
      {failure && (
        <MessageBar intent="error">
          <MessageBarBody>{failure}</MessageBarBody>
        </MessageBar>
      )}
    </MobilePage>
  );
}

