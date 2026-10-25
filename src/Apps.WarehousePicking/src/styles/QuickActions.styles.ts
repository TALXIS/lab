import { makeStyles, tokens } from "@fluentui/react-components";

const PHONE = "@media (max-width: 640px)";

export const useStyles = makeStyles({
  page: {
    boxSizing: "border-box",
    maxWidth: "960px",
    margin: "0 auto",
    padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalXXL}`,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXL,
    [PHONE]: {
      padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalL}`,
    },
  },
  intro: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
  },
  muted: {
    color: tokens.colorNeutralForeground3,
  },
  tiles: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 900px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    [PHONE]: {
      gap: tokens.spacingHorizontalM,
    },
  },
  tile: {
    boxSizing: "border-box",
    minHeight: "160px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    textDecorationLine: "none",
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow4,
    ":active": {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
    },
    ":hover": {
      boxShadow: tokens.shadow8,
    },
    [PHONE]: {
      minHeight: "148px",
    },
  },
  tileIcon: {
    display: "flex",
    width: "56px",
    height: "56px",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    borderRadius: tokens.borderRadiusLarge,
    color: tokens.colorNeutralForegroundOnBrand,
    backgroundColor: tokens.colorBrandBackground,
  },
  tileLabel: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase500,
  },
  tileHint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase300,
  },
  tileText: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
});

