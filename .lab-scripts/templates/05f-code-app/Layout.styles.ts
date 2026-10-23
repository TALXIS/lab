import { makeStyles, tokens } from "@fluentui/react-components"

const PHONE = "@media (max-width: 640px)"
const BOTTOM_NAV_HEIGHT = "64px"

export const useStyles = makeStyles({
  root: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
  },
  // On phones the bottom bar is the navigation, and a title bar would only cost screen height
  header: {
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    [PHONE]: {
      display: "none",
    },
  },
  headerInner: {
    boxSizing: "border-box",
    maxWidth: "1280px",
    height: "56px",
    margin: "0 auto",
    padding: `0 ${tokens.spacingHorizontalXXL}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTabs: {
    [PHONE]: {
      display: "none",
    },
  },
  // A rule between Home and the three list tabs
  afterHome: {
    marginLeft: tokens.spacingHorizontalM,
    position: "relative",
    "::before": {
      content: '""',
      position: "absolute",
      left: `calc(-1 * ${tokens.spacingHorizontalM} / 2 - 1px)`,
      top: "25%",
      bottom: "25%",
      width: tokens.strokeWidthThin,
      backgroundColor: tokens.colorNeutralStroke2,
    },
  },
  main: {
    flex: 1,
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "1280px",
    margin: "0 auto",
  },
  mainWithBottomNav: {
    [PHONE]: {
      paddingBottom: `calc(${BOTTOM_NAV_HEIGHT} + env(safe-area-inset-bottom, 0px))`,
    },
  },
  bottomNav: {
    display: "none",
    [PHONE]: {
      display: "flex",
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10,
      boxSizing: "border-box",
      height: `calc(${BOTTOM_NAV_HEIGHT} + env(safe-area-inset-bottom, 0px))`,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      backgroundColor: tokens.colorNeutralBackground1,
      borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    },
  },
  bottomItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    border: "none",
    background: "none",
    cursor: "pointer",
    color: tokens.colorNeutralForeground3,
    fontFamily: "inherit",
    fontSize: tokens.fontSizeBase200,
    minWidth: 0,
  },
  bottomAfterHome: {
    borderLeft: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  bottomItemSelected: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  bottomIcon: {
    display: "flex",
    fontSize: "24px",
  },
})
