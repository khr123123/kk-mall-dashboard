/**
 * AppSidebar — application navigation sidebar
 *
 * Design principles:
 * - All nav items use semantic ARIA labels
 * - Active item visually distinct with consistent styling
 * - Nav groups clearly labelled for screen readers
 * - Logo / brand area uses a proper <a> with descriptive label
 */

import * as React from "react"
import { Link } from "react-router"

import {
  NavIconDashboard,
  NavIconOrders,
  NavIconProducts,
  NavIconCatalog,
  NavIconUsers,
  NavIconNotifications,
  NavIconSettings,
  NavIconAnalytics,
  NavIconDataLibrary,
  NavIconReports,
} from "@/lib/icons.tsx"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/stores/authStore.ts"
import logo from "@/assets/logo.png"

// ── Navigation config (semantic names, i18n-ready) ────────────
const NAV_MAIN = [
  { title: "运营总览",  url: "/",             icon: NavIconDashboard },
  { title: "订单管理",  url: "/orders",        icon: NavIconOrders },
  { title: "商品管理",  url: "/products",      icon: NavIconProducts },
  { title: "商品目录",  url: "/catalog",       icon: NavIconCatalog },
  { title: "用户管理",  url: "/users",         icon: NavIconUsers },
  { title: "消息通知",  url: "/notifications", icon: NavIconNotifications },
]

const NAV_SECONDARY = [
  { title: "系统设置", url: "/settings", icon: NavIconSettings },
]

const NAV_DOCUMENTS = [
  { name: "数据图表",  url: "/chart",        icon: NavIconAnalytics },
  { name: "数据资产",  url: "/dataLibrary",  icon: NavIconDataLibrary },
  { name: "运营报告",  url: "/reports",      icon: NavIconReports },
]

// ── AppSidebar ────────────────────────────────────────────────
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const authState = useAuthStore.getState()

  return (
    <Sidebar
      collapsible="offcanvas"
      aria-label="主导航侧边栏"
      {...props}
    >
      {/* ── Brand / Logo ── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link
                to="/"
                aria-label="K Mall 管理后台 — 返回首页"
              >
                <div
                  className="flex size-6 items-center justify-center rounded-md shrink-0"
                  aria-hidden="true"
                >
                  <img src={logo} alt="" className="size-5 object-contain" />
                </div>
                <span className="text-base font-semibold tracking-tight">
                  K Mall.
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent>
        {/* Main navigation group */}
        <NavMain items={NAV_MAIN} />

        {/* Analytics / documents group */}
        <NavDocuments items={NAV_DOCUMENTS} />

        {/* Secondary / settings group (pushed to bottom) */}
        <NavSecondary items={NAV_SECONDARY} className="mt-auto" />
      </SidebarContent>

      {/* ── User profile ── */}
      <SidebarFooter>
        <NavUser
          user={authState.user!}
          userLogoutHandel={authState.logout}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
