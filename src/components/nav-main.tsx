/**
 * NavMain — primary navigation list
 *
 * Accessibility:
 * - <nav> landmark with descriptive label
 * - aria-current="page" on the active item
 * - Keyboard-focusable with visible ring
 * - Icon decorative (aria-hidden)
 */

import { type Icon } from "@tabler/icons-react"
import { Link, useLocation } from "react-router"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavItem {
  title: string
  url: string
  icon?: Icon
}

interface NavMainProps {
  items: NavItem[]
}

export function NavMain({ items }: NavMainProps) {
  const location = useLocation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">
        主菜单
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.url === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.url)

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive}
                  className={
                    isActive
                      ? "bg-primary text-primary-foreground font-medium hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground transition-colors duration-200"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
                  }
                >
                  <Link
                    to={item.url}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={item.title}
                  >
                    {item.icon && (
                      <item.icon
                        className="shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
