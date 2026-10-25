import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { Subtitle1, Tab, TabList, mergeClasses } from "@fluentui/react-components"
import { BoxRegular, ArrowSwapRegular, HomeRegular, LocationRegular } from "@fluentui/react-icons"
import type { ReactElement } from "react"
import { useStyles } from "@/styles/Layout.styles"

// Home is the landing page and also owns the quick-action flows; the items list owns /items and the
// /items/:id detail pages.
const FLOW_PATHS = ["/receive", "/pick", "/inventory", "/find"]

function isFlow(pathname: string) {
  return FLOW_PATHS.some((path) => pathname.startsWith(path))
}

function selectedTab(pathname: string) {
  if (pathname.startsWith("/items")) return "/items"
  if (pathname.startsWith("/transactions")) return "/transactions"
  if (pathname.startsWith("/locations")) return "/locations"
  return "/"
}

type NavEntry = { path: string; label: string; icon: ReactElement }

const NAV: NavEntry[] = [
  { path: "/", label: "Home", icon: <HomeRegular /> },
  { path: "/items", label: "Items", icon: <BoxRegular /> },
  { path: "/transactions", label: "Transactions", icon: <ArrowSwapRegular /> },
  { path: "/locations", label: "Locations", icon: <LocationRegular /> },
]

type LayoutProps = { showHeader?: boolean }

export default function Layout({ showHeader = true }: LayoutProps) {
  const styles = useStyles()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const selected = selectedTab(pathname)
  // The quick-action flows are full-screen steps with their own back button and sticky footer
  const flow = isFlow(pathname)

  return (
    <div className={styles.root}>
      {showHeader && (
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Subtitle1>Warehouse Picking</Subtitle1>
            {/* Wide screens: tabs in the top bar, Home set apart from the three back-office lists */}
            <TabList
              className={styles.topTabs}
              selectedValue={selected}
              onTabSelect={(_, data) => navigate(String(data.value))}
            >
              {NAV.map((entry) => (
                <Tab
                  key={entry.path}
                  value={entry.path}
                  icon={entry.icon}
                  className={entry.path === "/items" ? styles.afterHome : undefined}
                >
                  {entry.label}
                </Tab>
              ))}
            </TabList>
          </div>
        </header>
      )}

      <main className={mergeClasses(styles.main, showHeader && !flow && styles.mainWithBottomNav)}>
        <Outlet />
      </main>

      {/* Phones: the same destinations as a bottom bar, thumb-reachable */}
      {showHeader && !flow && (
        <nav className={styles.bottomNav} aria-label="Main">
          {NAV.map((entry) => (
            <button
              key={entry.path}
              type="button"
              className={mergeClasses(
                styles.bottomItem,
                entry.path === "/items" && styles.bottomAfterHome,
                selected === entry.path && styles.bottomItemSelected
              )}
              aria-current={selected === entry.path ? "page" : undefined}
              onClick={() => navigate(entry.path)}
            >
              <span className={styles.bottomIcon}>{entry.icon}</span>
              <span>{entry.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
