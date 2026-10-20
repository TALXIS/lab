import { makeStyles, tokens } from "@fluentui/react-components";

export const useStyles = makeStyles({
  root: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacingVerticalM,
    textAlign: "center",
    padding: `${tokens.spacingVerticalXXL} 0`,
  },
  icon: {
    fontSize: "72px",
    color: tokens.colorPaletteGreenForeground1,
    display: "flex",
  },
  detail: {
    color: tokens.colorNeutralForeground2,
  },
  actions: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalL,
  },
  button: {
    minHeight: "56px",
    fontSize: tokens.fontSizeBase400,
  },
});
