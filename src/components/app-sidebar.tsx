import * as React from "react"
import { Link } from "react-router"
import {
  IconBell,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconPackage,
  IconReport,
  IconSettings,
  IconShoppingCart,
  IconTags,
  IconUsers,
} from "@tabler/icons-react"

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

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: IconDashboard,
    },
    {
      title: "Orders",
      url: "/orders",
      icon: IconShoppingCart,
    },
    {
      title: "Products",
      url: "/products",
      icon: IconPackage,
    },
    {
      title: "Catalog",
      url: "/catalog",
      icon: IconTags,
    },
    {
      title: "Users",
      url: "/users",
      icon: IconUsers,
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: IconBell,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
  ],
  documents: [
    {
      name: "Analytics",
      url: "/chart",
      icon: IconChartBar,
    },
    {
      name: "Data Library",
      url: "/dataLibrary",
      icon: IconDatabase,
    },
    {
      name: "Reports",
      url: "/reports",
      icon: IconReport,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const authState = useAuthStore.getState()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/">
                <div className="text-primary-foreground flex size-6 items-center justify-center rounded-md">
                  <img src={logo} alt="Logo" />
                </div>
                <span className="text-base font-semibold">K Mall.</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={authState.user!} userLogoutHandel={authState.logout} />
      </SidebarFooter>
    </Sidebar>
  )
}
