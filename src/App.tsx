/**
 * App — root layout shell
 *
 * Provides the sidebar + header + page content structure.
 * The sidebar width and header height are set via CSS custom
 * properties so child pages can reference them.
 */

import * as React from "react"
import { Outlet } from "react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function App() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width":  "calc(var(--spacing) * 72)",
          "--header-height":  "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      {/* Navigation sidebar */}
      <AppSidebar variant="inset" />

      {/* Main content area */}
      <SidebarInset>
        <SiteHeader />

        {/* Skip-link target: keyboard users land here after "skip to content" */}
        <div id="main-content" tabIndex={-1} className="outline-none">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
