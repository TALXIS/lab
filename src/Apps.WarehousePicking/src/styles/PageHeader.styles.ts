import { makeStyles, tokens } from "@fluentui/react-components"

export const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "center",
  },
  heading: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
  },
  icon: {
    fontSize: "32px",
    color: tokens.colorBrandForeground1,
  },
  text: {
    display: "flex",
    flexDirection: "column",
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
  },
})

