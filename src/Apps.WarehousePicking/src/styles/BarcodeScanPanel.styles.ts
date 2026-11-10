import { makeStyles, tokens } from "@fluentui/react-components";

export const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
  },
  video: {
    width: "100%",
    aspectRatio: "16 / 9",
    objectFit: "cover",
    backgroundColor: "black",
    borderRadius: tokens.borderRadiusMedium,
  },
  videoHidden: {
    display: "none",
  },
  row: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
  },
  input: {
    flex: 1,
    minWidth: 0,
    "& input": {
      minHeight: "48px",
      fontSize: tokens.fontSizeBase400,
    },
  },
  lookup: {
    minHeight: "48px",
  },
  hint: {
    color: tokens.colorNeutralForeground3,
  },
});
