import { makeStyles, tokens } from "@fluentui/react-components";

export const useStyles = makeStyles({
  close: {
    position: "absolute",
    top: tokens.spacingVerticalM,
    right: tokens.spacingHorizontalM,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
});

