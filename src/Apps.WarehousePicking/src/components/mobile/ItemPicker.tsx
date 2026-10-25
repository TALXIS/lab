import { useState } from "react";
import { Body1, Input, MessageBar, MessageBarBody, Spinner, mergeClasses } from "@fluentui/react-components";
import { AddRegular, SearchRegular } from "@fluentui/react-icons";
import { usePickItems, type PickItem } from "@/hooks/UsePickItems";
import { useStyles } from "@/styles/ItemPicker.styles";

type ItemPickerProps = {
  onSelect: (item: PickItem) => void;
  /** Leave out each item's quantity on record, e.g. for a blind count. */
  hideOnHand?: boolean;
  /** Adds a "New item" row at the end of the list; gets what was typed in the search. */
  onCreate?: (search: string) => void;
};

const MAX_ROWS = 50;

// Search box and a list of big rows to choose an item from. Matches the name, SKU or barcode as typed
// (any part, any case); with nothing typed it lists the first items alphabetically.
export function ItemPicker({ onSelect, hideOnHand, onCreate }: ItemPickerProps) {
  const styles = useStyles();
  const { items, isLoading, error } = usePickItems();
  const [search, setSearch] = useState("");

  const needle = search.trim().toLowerCase();
  const matches = (needle
    ? items.filter((item) => [item.name, item.sku, item.barcode].some((text) => text.toLowerCase().includes(needle)))
    : items
  ).slice(0, MAX_ROWS);

  return (
    <div className={styles.root}>
      <Input
        className={styles.search}
        size="large"
        type="search"
        placeholder="Search name, SKU or barcode"
        aria-label="Search items"
        contentBefore={<SearchRegular />}
        value={search}
        onChange={(_, data) => setSearch(data.value)}
      />

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>Failed to load items: {String(error)}</MessageBarBody>
        </MessageBar>
      )}
      {isLoading && <Spinner label="Loading items" />}

      <div className={styles.list} role="list">
        {matches.map((item) => (
          <button
            key={item.id}
            type="button"
            role="listitem"
            className={styles.row}
            data-testid="pick-item-row"
            onClick={() => onSelect(item)}
          >
            <span className={styles.rowText}>
              <span className={styles.name}>{item.name}</span>
              <span className={styles.meta}>{[item.sku, item.location].filter(Boolean).join(" · ")}</span>
            </span>
            {!hideOnHand && (
              <span className={styles.quantity}>
                {item.quantity}
                <span className={styles.quantityLabel}>on hand</span>
              </span>
            )}
          </button>
        ))}
        {!isLoading && !error && matches.length === 0 && (
          <Body1 className={styles.empty}>No items match "{search}".</Body1>
        )}
        {onCreate && !isLoading && (
          <button type="button" className={mergeClasses(styles.row, styles.createRow)} data-testid="new-item-row" onClick={() => onCreate(search.trim())}>
            <span className={styles.rowText}>
              <span className={styles.name}>{needle ? `New item "${search.trim()}"` : "New item"}</span>
              <span className={styles.meta}>Not in the list? Add it</span>
            </span>
            <AddRegular />
          </button>
        )}
      </div>
    </div>
  );
}

