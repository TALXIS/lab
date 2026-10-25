import { makeStyles, tokens } from "@fluentui/react-components";

export const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
  },
  text: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  meta: {
    color: tokens.colorNeutralForeground3,
  },
  onHand: {
    color: tokens.colorNeutralForeground2,
  },
  change: {
    flexShrink: 0,
    minHeight: "44px",
  },
});

