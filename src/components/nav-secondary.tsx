import * as React from "react"
import { type Icon } from "@tabler/icons-react"
import { Link, useLocation } from "react-router" // 👈 添加导入

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({
                                 items,
                                 ...props
                             }: {
    items: {
        title: string
        url: string
        icon: Icon
    }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
    const location = useLocation()

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild // 👈 保留 asChild
                                className={
                                    location.pathname === item.url
                                        ? "bg-primary font-mono text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                                        : ""
                                }
                            >
                                <Link to={item.url}> {/* 👈 改成 Link */}
                                    <item.icon />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}
