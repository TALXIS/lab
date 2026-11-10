import { makeStyles, tokens } from "@fluentui/react-components";

export const useStyles = makeStyles({
  page: {
    padding: tokens.spacingHorizontalXXL,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXL,
  },
  details: {
    display: "flex",
    flexDirection: "column",
  },
  // inline, muted and name are also used by the markup 18-barcode-scan-ui patches in
  inline: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  name: {
    fontWeight: tokens.fontWeightSemibold,
  },
  muted: {
    color: tokens.colorNeutralForeground3,
  },
  skeletonTitle: {
    width: "200px",
    height: "32px",
  },
  skeletonCards: {
    height: "128px",
  },
  skeletonTable: {
    height: "256px",
  },
});
