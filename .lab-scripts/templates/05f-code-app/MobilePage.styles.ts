import { makeStyles, tokens } from "@fluentui/react-components";

export const useStyles = makeStyles({
  root: {
    boxSizing: "border-box",
    minHeight: "calc(100dvh - 56px)",
    maxWidth: "640px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
  },
  back: {
    minWidth: "48px",
    minHeight: "48px",
  },
  body: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL} ${tokens.spacingVerticalXL}`,
  },
  footer: {
    position: "sticky",
    bottom: 0,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    paddingBottom: `calc(${tokens.spacingVerticalM} + env(safe-area-inset-bottom, 0px))`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
});
