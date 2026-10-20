import { useNavigate } from "react-router-dom";
import { Body1, Button, Title2 } from "@fluentui/react-components";
import { CheckmarkCircleFilled } from "@fluentui/react-icons";
import { useStyles } from "@/styles/ResultPanel.styles";

type ResultPanelProps = {
  title: string;
  detail: string;
  /** Starts the flow over, e.g. for the next item. */
  onAgain: () => void;
  againLabel?: string;
};

// What a flow ends on: a big tick, what happened, and two big choices - go again, or back Home.
export function ResultPanel({ title, detail, onAgain, againLabel = "Do another" }: ResultPanelProps) {
  const styles = useStyles();
  const navigate = useNavigate();

  return (
    <div className={styles.root} data-testid="flow-result">
      <span className={styles.icon}>
        <CheckmarkCircleFilled />
      </span>
      <Title2>{title}</Title2>
      <Body1 className={styles.detail}>{detail}</Body1>
      <div className={styles.actions}>
        <Button className={styles.button} appearance="primary" size="large" onClick={onAgain}>
          {againLabel}
        </Button>
        <Button className={styles.button} size="large" onClick={() => navigate("/")}>
          Home
        </Button>
      </div>
    </div>
  );
}
