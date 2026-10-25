import { makeStyles, tokens } from "@fluentui/react-components";

export const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  search: {
    "& input": {
      minHeight: "48px",
      fontSize: tokens.fontSizeBase400,
    },
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  row: {
    boxSizing: "border-box",
    width: "100%",
    minHeight: "72px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    ":active": {
      backgroundColor: tokens.colorNeutralBackground1Pressed,
    },
  },
  createRow: {
    border: `${tokens.strokeWidthThin} dashed ${tokens.colorBrandStroke1}`,
    color: tokens.colorBrandForeground1,
  },
  rowText: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  name: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  meta: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase300,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  quantity: {
    flexShrink: 0,
    textAlign: "right",
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
  },
  quantityLabel: {
    display: "block",
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightRegular,
  },
  empty: {
    padding: tokens.spacingVerticalXL,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
});

