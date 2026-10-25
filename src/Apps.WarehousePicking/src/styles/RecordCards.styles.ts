import { makeStyles, tokens } from "@fluentui/react-components";

export const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    padding: `${tokens.spacingVerticalM} 0`,
  },
  search: {
    "& input": {
      minHeight: "44px",
    },
  },
  card: {
    boxSizing: "border-box",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalL,
    textAlign: "left",
    fontFamily: "inherit",
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
  },
  cardTappable: {
    cursor: "pointer",
    ":active": {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
    },
  },
  title: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
  },
  titlePlain: {
    color: tokens.colorNeutralForeground1,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    minHeight: "28px",
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase300,
  },
  value: {
    overflowWrap: "anywhere",
  },
  badge: {
    justifySelf: "start",
    padding: `2px ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  empty: {
    padding: tokens.spacingVerticalXL,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
});

