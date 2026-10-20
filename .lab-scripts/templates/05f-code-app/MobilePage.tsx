import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Title2 } from "@fluentui/react-components";
import { ArrowLeftRegular } from "@fluentui/react-icons";
import { useStyles } from "@/styles/MobilePage.styles";

type MobilePageProps = {
  title: string;
  /** Where the back arrow goes; Home by default. */
  backTo?: string;
  children: ReactNode;
  /** Pinned to the bottom of the screen, within thumb reach: the step's main button. */
  footer?: ReactNode;
};

// The frame of a quick-action screen on a phone: a back arrow and title, the step's content, and an
// optional footer that stays at the bottom while the content scrolls.
export function MobilePage({ title, backTo = "/", children, footer }: MobilePageProps) {
  const styles = useStyles();
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Button
          className={styles.back}
          appearance="subtle"
          size="large"
          icon={<ArrowLeftRegular />}
          aria-label="Back"
          onClick={() => navigate(backTo)}
        />
        <Title2 as="h1">{title}</Title2>
      </div>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
