import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { Body1, Title1 } from "@fluentui/react-components";
import {
  ArrowDownloadRegular,
  ArrowUploadRegular,
  ClipboardTaskListLtrRegular,
  SearchRegular,
} from "@fluentui/react-icons";
import { useStyles } from "@/styles/QuickActions.styles";

type Tile = { to: string; label: string; hint: string; icon: ReactElement };

// The jobs a warehouse worker does most, one tap away
const TILES: Tile[] = [
  { to: "/pick", label: "Pick stock", hint: "Take goods out", icon: <ArrowUploadRegular /> },
  { to: "/receive", label: "Receive stock", hint: "Book goods in", icon: <ArrowDownloadRegular /> },
  { to: "/inventory", label: "Take inventory", hint: "Count an item on the shelf", icon: <ClipboardTaskListLtrRegular /> },
  { to: "/find", label: "Find item", hint: "Where is it, how many", icon: <SearchRegular /> },
];

// Home: big tiles for the quick actions, laid out for a phone (two per row) and wider screens.
export default function QuickActionsPage() {
  const styles = useStyles();

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <Title1 as="h1">Quick actions</Title1>
        <Body1 className={styles.muted}>What are you doing?</Body1>
      </div>

      <div className={styles.tiles}>
        {TILES.map((tile) => (
          <Link key={tile.to} to={tile.to} className={styles.tile} data-testid={`tile-${tile.to.slice(1)}`}>
            <span className={styles.tileIcon}>{tile.icon}</span>
            <span className={styles.tileText}>
              <span className={styles.tileLabel}>{tile.label}</span>
              <span className={styles.tileHint}>{tile.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

