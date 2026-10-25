import { Body1, Button, Subtitle1 } from "@fluentui/react-components";
import type { PickItem } from "@/hooks/UsePickItems";
import { useStyles } from "@/styles/ItemSummary.styles";

type ItemSummaryProps = {
  item: PickItem;
  onChange: () => void;
  /** Leave out the quantity on record, e.g. for a blind count. */
  hideOnHand?: boolean;
};

// The item a flow is working on: name, where it is, how many are on record, and a way to pick another.
export function ItemSummary({ item, onChange, hideOnHand }: ItemSummaryProps) {
  const styles = useStyles();

  return (
    <div className={styles.root} data-testid="selected-item">
      <div className={styles.text}>
        <Subtitle1>{item.name}</Subtitle1>
        <Body1 className={styles.meta}>{[item.sku, item.location].filter(Boolean).join(" · ")}</Body1>
        {!hideOnHand && <Body1 className={styles.onHand}>On hand: {item.quantity}</Body1>}
      </div>
      <Button className={styles.change} onClick={onChange}>
        Change
      </Button>
    </div>
  );
}

