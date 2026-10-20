import { makeStyles, tokens } from "@fluentui/react-components";

export const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  row: {
    display: "flex",
    alignItems: "stretch",
    gap: tokens.spacingHorizontalM,
  },
  step: {
    minWidth: "64px",
    minHeight: "64px",
    fontSize: "28px",
  },
  input: {
    flex: 1,
    minWidth: 0,
    "& input": {
      textAlign: "center",
      fontSize: "32px",
      fontWeight: tokens.fontWeightSemibold,
      minHeight: "56px",
    },
  },
  // Counting mode: the number on top, a big +1 for every item touched and a small minus under it for slips
  counterInput: {
    "& input": {
      textAlign: "center",
      fontSize: "56px",
      fontWeight: tokens.fontWeightSemibold,
      minHeight: "88px",
    },
  },
  counterRow: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  add: {
    width: "100%",
    minHeight: "128px",
    fontSize: "56px",
    fontWeight: tokens.fontWeightSemibold,
  },
  minus: {
    width: "100%",
    // An icon-only Fluent button caps its own width
    maxWidth: "none",
    minHeight: "56px",
    fontSize: "24px",
  },
  hint: {
    color: tokens.colorNeutralForeground3,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
  },
});
