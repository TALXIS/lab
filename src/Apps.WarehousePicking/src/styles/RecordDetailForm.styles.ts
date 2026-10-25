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
  // The header (title and tabs) and the active tab's content read as one card
  detail: {
    ...card,
    overflow: "hidden",
    // The form's section draws its own card; inside this one it is just the content, so its card
    // look (border, shadow, rounding, slide-in) goes
    "& [data-id^='section-']": {
      border: "none",
      borderRadius: 0,
      boxShadow: "none",
      transitionProperty: "none",
    },
  },
  header: {
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL} 0`,
    display: "flex",
    flexDirection: "column",
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
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
    display: "flex",
    flexDirection: "column",
  },
});

