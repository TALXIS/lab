import { useReducer, useState } from "react";
import { Body1, Input, Spinner, mergeClasses } from "@fluentui/react-components";
import { SearchRegular } from "@fluentui/react-icons";
import { useEventEmitter } from "@talxis/base-controls";
import type { Dataset, IColumn, IRecord, MemoryDataProvider } from "@talxis/client-libraries";
import { useStyles } from "@/styles/RecordCards.styles";

type RecordCardsProps = {
  /** The dataset a RecordGrid keeps for its rows: the cards show what the grid would. */
  dataset: Dataset<MemoryDataProvider>;
  columns: IColumn[];
  /** Makes a card tappable (the record has a page); gets the record's id. */
  onOpen?: (id: string) => void;
};

// Only worth a search box once the list is longer than what fits on a screen or two
const SEARCH_FROM = 6;

type OptionSetChoice = { Value: number; Label: string; Color?: string };

// A grid's records for a phone: one card per record, like a small read-only form. The primary column
// is the title and the other columns follow as label/value rows, formatted by the dataset exactly as
// the grid formats them. Option sets with a colour show as a coloured badge.
export function RecordCards({ dataset, columns, onOpen }: RecordCardsProps) {
  const styles = useStyles();
  const [search, setSearch] = useState("");
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  useEventEmitter(dataset, ["onNewDataLoaded", "onLoading"], rerender);

  const primary = columns.find((column) => column.isPrimary) ?? columns[0];
  const fields = columns.filter((column) => column !== primary && !column.isHidden);

  const records = dataset.sortedRecordIds.map((id) => dataset.records[id] as unknown as IRecord);
  const cards = records.map((record) => ({
    id: record.getRecordId(),
    title: record.getFormattedValue(primary.name) ?? "",
    rows: fields.map((column) => ({
      label: column.displayName ?? column.name,
      text: record.getFormattedValue(column.name) ?? "",
      color: badgeColor(column, record),
    })),
  }));

  const needle = search.trim().toLowerCase();
  const visible = needle
    ? cards.filter((card) => [card.title, ...card.rows.map((row) => row.text)].some((text) => text.toLowerCase().includes(needle)))
    : cards;

  return (
    <div className={styles.root}>
      {cards.length >= SEARCH_FROM && (
        <Input
          className={styles.search}
          size="large"
          type="search"
          placeholder="Search"
          aria-label="Search"
          contentBefore={<SearchRegular />}
          value={search}
          onChange={(_, data) => setSearch(data.value)}
        />
      )}

      {dataset.loading && cards.length === 0 && <Spinner label="Loading" />}

      {visible.map((card) => {
        const content = (
          <>
            <span className={mergeClasses(styles.title, !onOpen && styles.titlePlain)}>{card.title}</span>
            {card.rows.map((row) => (
              <div key={row.label} className={styles.row}>
                <span className={styles.label}>{row.label}</span>
                {row.color && row.text ? (
                  <span className={styles.badge} style={{ backgroundColor: row.color }}>
                    {row.text}
                  </span>
                ) : (
                  <span className={styles.value}>{row.text || "-"}</span>
                )}
              </div>
            ))}
          </>
        );
        return onOpen ? (
          <button
            key={card.id}
            type="button"
            className={mergeClasses(styles.card, styles.cardTappable)}
            data-testid="record-card"
            onClick={() => onOpen(card.id)}
          >
            {content}
          </button>
        ) : (
          <div key={card.id} className={styles.card} data-testid="record-card">
            {content}
          </div>
        );
      })}

      {!dataset.loading && cards.length > 0 && visible.length === 0 && (
        <Body1 className={styles.empty}>Nothing matches "{search}".</Body1>
      )}
      {!dataset.loading && cards.length === 0 && <Body1 className={styles.empty}>No records found.</Body1>}
    </div>
  );
}

// The colour an option set column defines for the record's current choice, if any
function badgeColor(column: IColumn, record: IRecord): string | undefined {
  if (column.dataType !== "OptionSet") return undefined;
  const options = (column.metadata as { OptionSet?: OptionSetChoice[] } | undefined)?.OptionSet;
  const value = record.getValue(column.name);
  if (!options || value === null || value === undefined) return undefined;
  return options.find((option) => option.Value === Number(value))?.Color || undefined;
}

