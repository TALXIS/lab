import { makeStyles, tokens } from "@fluentui/react-components";

const card = {
  backgroundColor: tokens.colorNeutralBackground1,
  borderRadius: tokens.borderRadiusLarge,
  boxShadow: tokens.shadow4,
};

export const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  ribbon: {
    ...card,
    padding: `0 ${tokens.spacingHorizontalS}`,
  },
  header: {
    ...card,
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL} 0`,
    display: "flex",
    flexDirection: "column",
  },
  headerTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalL,
  },
  titleBlock: {
    display: "flex",
    flexDirection: "column",
  },
  titleRow: {
    display: "flex",
    alignItems: "baseline",
    gap: tokens.spacingHorizontalS,
  },
  status: {
    color: tokens.colorNeutralForeground3,
  },
  statusUnsaved: {
    color: tokens.colorPaletteMarigoldForeground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  subtitle: {
    color: tokens.colorNeutralForeground2,
  },
  extras: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalL,
  },
  body: {
    // The form's own section draws the card
    display: "flex",
    flexDirection: "column",
  },
});
