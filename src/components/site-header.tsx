/**
 * SiteHeader — top app bar
 *
 * Design principles:
 * - Single consistent header across all pages
 * - Theme toggle (light / dark / system) using next-themes
 * - Keyboard-accessible: all interactive elements focusable
 * - Semantic landmark: <header> with role="banner"
 * - Page title derived from route map (not raw pathname mangling)
 */

import { useLocation } from "react-router"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/lib/theme"
import {
  IconThemeLight,
  IconThemeDark,
  IconThemeSystem,
} from "@/lib/icons.tsx"

// ── Route → Page title map ────────────────────────────────────
const ROUTE_TITLES: Record<string, string> = {
  "/":             "运营总览",
  "/orders":       "订单管理",
  "/orderConsole": "订单管理",
  "/products":     "商品管理",
  "/products/add": "新建商品",
  "/catalog":      "商品目录",
  "/users":        "用户管理",
  "/notifications":"消息通知",
  "/chart":        "数据图表",
  "/dataLibrary":  "数据资产",
  "/reports":      "运营报告",
  "/settings":     "系统设置",
}

function getPageTitle(pathname: string): string {
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  // Dynamic routes (e.g. /products/edit/:id)
  if (pathname.startsWith("/products/edit/")) return "编辑商品"
  // Fallback: strip leading slash, capitalize
  return pathname.substring(1).replace(/[-_/]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "管理后台"
}

// ── ThemeToggle ───────────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: "light",  icon: <IconThemeLight  className="h-4 w-4" />, label: "浅色模式" },
    { value: "dark",   icon: <IconThemeDark   className="h-4 w-4" />, label: "深色模式" },
    { value: "system", icon: <IconThemeSystem className="h-4 w-4" />, label: "跟随系统" },
  ] as const

  return (
    <div className="flex items-center rounded-lg border p-0.5 gap-0.5" role="group" aria-label="主题切换">
      {themes.map((t) => (
        <Tooltip key={t.value}>
          <TooltipTrigger asChild>
            <Button
              variant={theme === t.value ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setTheme(t.value)}
              aria-label={t.label}
              aria-pressed={theme === t.value}
            >
              {t.icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {t.label}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

// ── SiteHeader ────────────────────────────────────────────────
export function SiteHeader() {
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)

  return (
    <header
      role="banner"
      className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) sticky top-0 z-30"
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {/* Sidebar trigger — keyboard accessible */}
        <SidebarTrigger
          className="-ml-1"
          aria-label="切换侧边栏"
        />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
          aria-hidden="true"
        />

        {/* Current page breadcrumb / title */}
        <nav aria-label="当前位置" className="flex-1 min-w-0">
          <h1
            className="text-sm font-semibold text-foreground truncate"
            id="page-title"
          >
            {pageTitle}
          </h1>
        </nav>

        {/* Right-side actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex text-muted-foreground hover:text-foreground text-xs"
            asChild
          >
            <a
              href="https://github.com/khr123123"
              rel="noopener noreferrer"
              target="_blank"
              aria-label="在 GitHub 查看源码（在新标签页中打开）"
            >
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
