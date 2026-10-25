import { Outlet, NavLink } from "react-router-dom"
import { mergeClasses } from "@fluentui/react-components"
import { useStyles } from "./_layout.styles"

type LayoutProps = { showHeader?: boolean }

export default function Layout({ showHeader = true }: LayoutProps) {
  const styles = useStyles()

  return (
    <div className={styles.root}>
      {showHeader && (
        <header className={styles.header}>
          <div className={styles.container}>
            <nav className={styles.nav}>
              {[["/", "Items"], ["/transactions", "Transactions"], ["/locations", "Locations"]].map(([to, label]) => (
                <NavLink key={to} to={to} end={to === "/"}
                  className={({ isActive }) =>
                    mergeClasses(styles.navLink, isActive && styles.navLinkActive)
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>
      )}

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
