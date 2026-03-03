/**
 * DashBoardPage — Operations Overview
 *
 * Layout: PageLayout wrapper → PageHeader → StatsGrid → two-row content
 * Accessibility: all cards have semantic labels, status colours paired with
 *                text / icons (never colour-only), ARIA live regions for
 *                async states.
 */

import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import {
  IconTrendingUp,
  IconTrendingDown,
  IconRefresh,
  IconDollar,
  IconPackageOutline,
  IconCartOutline,
  IconUsersOutline,
  IconCalendar,
  IconCheckCircle,
  IconClockOutline,
  IconTruckOutline,
  IconXCircle,
  IconBarChart,
  IconBellOutline,
  IconTrendUp,
  IconWarning,
} from "@/lib/icons.tsx"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PageLayout, PageHeader, EmptyState, StatsGrid } from "@/components/layout"
import { formatCurrency, formatShortDate } from "@/lib/i18n"
import { fetchDashboardStats } from "@/lib/api"
import type { DashboardStats, Order, OrderStatus } from "@/types"

// ── Order status display config ───────────────────────────────
const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "待付款",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    icon: <IconClockOutline className="h-3 w-3" aria-hidden="true" />,
  },
  processing: {
    label: "处理中",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800",
    icon: <IconBarChart className="h-3 w-3" aria-hidden="true" />,
  },
  paid: {
    label: "已付款",
    color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    icon: <IconDollar className="h-3 w-3" aria-hidden="true" />,
  },
  shipped: {
    label: "已发货",
    color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
    icon: <IconTruckOutline className="h-3 w-3" aria-hidden="true" />,
  },
  delivered: {
    label: "已收货",
    color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    icon: <IconCheckCircle className="h-3 w-3" aria-hidden="true" />,
  },
  cancelled: {
    label: "已取消",
    color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    icon: <IconXCircle className="h-3 w-3" aria-hidden="true" />,
  },
  refunded: {
    label: "已退款",
    color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800",
    icon: <IconXCircle className="h-3 w-3" aria-hidden="true" />,
  },
}

// ── StatusBadge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span
      className={`status-badge ${cfg.color}`}
      role="status"
      aria-label={`订单状态：${cfg.label}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ── DashboardSkeleton ─────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div
      className="page-inner"
      role="status"
      aria-live="polite"
      aria-label="正在加载运营数据…"
    >
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} aria-hidden="true">
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-36 mt-2" />
            </CardHeader>
            <CardFooter>
              <Skeleton className="h-4 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-52 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────
interface StatCardProps {
  title: string
  value: string
  change?: number
  footer: string
  icon: React.ReactNode
  gradient: string
  textColor: string
  descColor: string
  isStatic?: boolean
}

function StatCard({
  title,
  value,
  change = 0,
  footer,
  icon,
  gradient,
  textColor,
  descColor,
  isStatic,
}: StatCardProps) {
  const isPositive = change >= 0
  const trendLabel = isStatic
    ? footer
    : isPositive
    ? `较昨日上升 ${Math.abs(change).toFixed(1)}%`
    : `较昨日下降 ${Math.abs(change).toFixed(1)}%`

  return (
    <Card
      className={`@container/card bg-gradient-to-br ${gradient}`}
      aria-label={`${title}：${value}`}
    >
      <CardHeader>
        <CardDescription className={`${descColor} font-medium flex items-center gap-1.5`}>
          <span aria-hidden="true">{icon}</span>
          {title}
        </CardDescription>
        <CardTitle
          className={`text-3xl font-bold tabular-nums ${textColor} @[250px]/card:text-4xl`}
        >
          {value}
        </CardTitle>
        {!isStatic && (
          <CardAction>
            <Badge
              variant="outline"
              className={
                isPositive
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
                  : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
              }
              aria-label={`环比变化：${trendLabel}`}
            >
              {isPositive ? (
                <IconTrendingUp className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              ) : (
                <IconTrendingDown className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              )}
              {Math.abs(change).toFixed(1)}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1 text-sm">
        <div className={`flex gap-1.5 items-center font-medium ${textColor}`}>
          {isStatic ? (
            footer
          ) : (
            <>
              <span aria-hidden="true">
                {isPositive ? (
                  <IconTrendingUp className="size-4" />
                ) : (
                  <IconTrendingDown className="size-4" />
                )}
              </span>
              <span>{isPositive ? "较昨日上升" : "较昨日下降"}</span>
            </>
          )}
        </div>
        {!isStatic && (
          <div className="text-muted-foreground text-xs">{footer}</div>
        )}
      </CardFooter>
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function DashBoardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchDashboardStats()
      setStats(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Failed to load dashboard:", err)
      setError("数据加载失败，请检查 PocketBase 连接是否正常。")
      toast.error("数据加载失败")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <DashboardSkeleton />

  if (error) {
    return (
      <PageLayout>
        <div className="flex flex-1 items-center justify-center p-8" role="alert">
          <Card className="max-w-md w-full border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <IconWarning className="h-5 w-5" aria-hidden="true" />
                加载失败
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={loadDashboard} className="w-full gap-2">
                <IconRefresh className="h-4 w-4" aria-hidden="true" />
                重新加载
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    )
  }

  if (!stats) return <DashboardSkeleton />

  // ── Stat cards config ─────────────────────────────────────
  const statCards: StatCardProps[] = [
    {
      title:    "今日营收",
      value:    formatCurrency(stats.todayRevenue),
      change:   stats.todayRevenueChange,
      gradient: "from-blue-50 to-white dark:from-blue-950/20 dark:to-card border-blue-100 dark:border-blue-900",
      textColor: "text-blue-700 dark:text-blue-300",
      descColor: "text-blue-600 dark:text-blue-400",
      icon:     <IconDollar className="h-4 w-4" />,
      footer:   "与昨日对比",
    },
    {
      title:    "本月营收",
      value:    formatCurrency(stats.monthRevenue),
      gradient: "from-emerald-50 to-white dark:from-emerald-950/20 dark:to-card border-emerald-100 dark:border-emerald-900",
      textColor: "text-emerald-700 dark:text-emerald-300",
      descColor: "text-emerald-600 dark:text-emerald-400",
      icon:     <IconCalendar className="h-4 w-4" />,
      footer:   `本月共 ${stats.monthOrders} 笔订单`,
      isStatic: true,
    },
    {
      title:    "今日订单",
      value:    stats.todayOrders.toLocaleString("zh-CN"),
      change:   stats.todayOrdersChange,
      gradient: "from-purple-50 to-white dark:from-purple-950/20 dark:to-card border-purple-100 dark:border-purple-900",
      textColor: "text-purple-700 dark:text-purple-300",
      descColor: "text-purple-600 dark:text-purple-400",
      icon:     <IconCartOutline className="h-4 w-4" />,
      footer:   "今日已处理订单数",
    },
    {
      title:    "用户总数",
      value:    stats.totalUsers.toLocaleString("zh-CN"),
      change:   stats.newUsersTodayChange,
      gradient: "from-orange-50 to-white dark:from-orange-950/20 dark:to-card border-orange-100 dark:border-orange-900",
      textColor: "text-orange-700 dark:text-orange-300",
      descColor: "text-orange-600 dark:text-orange-400",
      icon:     <IconUsersOutline className="h-4 w-4" />,
      footer:   `今日新增 ${stats.newUsersToday} 位用户`,
    },
  ]

  const totalOrderCount = Object.values(stats.orderStatusStats).reduce(
    (a, b) => a + b,
    0
  )

  return (
    <PageLayout>
      {/* Page header */}
      <PageHeader
        title="运营总览"
        description={
          lastUpdated
            ? `最后更新：${lastUpdated.toLocaleTimeString("zh-CN")}`
            : "实时数据"
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboard}
            className="gap-2"
            aria-label="刷新仪表盘数据"
          >
            <IconRefresh className="h-4 w-4" aria-hidden="true" />
            刷新
          </Button>
        }
      />

      {/* ── Row 1: Core stat cards ── */}
      <StatsGrid cols={4}>
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </StatsGrid>

      {/* ── Row 2: Product overview + Order status ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Product overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconPackageOutline className="h-5 w-5 text-primary" aria-hidden="true" />
                商品概览
              </CardTitle>
              <CardDescription>库存与商品状态</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/products")}
              aria-label="前往商品管理页面"
            >
              管理商品
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center" role="list">
              {[
                { value: stats.totalProducts,          label: "商品总数", color: "text-primary" },
                { value: stats.outOfStockCount,         label: "缺货商品", color: "text-destructive" },
                { value: stats.lowStockProducts.length, label: "低库存预警", color: "text-yellow-600 dark:text-yellow-400" },
              ].map(({ value, label, color }) => (
                <div key={label} className="space-y-1" role="listitem">
                  <p className={`text-3xl font-bold tabular-nums ${color}`} aria-label={`${label}：${value}`}>
                    {value}
                  </p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {stats.lowStockProducts.length > 0 && (
              <>
                <Separator className="my-3" aria-hidden="true" />
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  库存预警商品（≤10 件）
                </p>
                <ul className="space-y-1.5" aria-label="低库存商品列表">
                  {stats.lowStockProducts.slice(0, 4).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate max-w-[180px] font-medium">
                        {p.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          (p.stock ?? 0) <= 3
                            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400"
                        }
                        aria-label={`库存剩余 ${p.stock ?? 0} 件`}
                      >
                        剩余 {p.stock ?? 0}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* Order status distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconBarChart className="h-5 w-5 text-primary" aria-hidden="true" />
                订单状态统计
              </CardTitle>
              <CardDescription>
                全部订单：{totalOrderCount.toLocaleString("zh-CN")} 笔
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/orders")}
              aria-label="前往订单管理页面"
            >
              查看订单
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5" aria-label="订单状态分布">
              {(
                [
                  "pending",
                  "processing",
                  "paid",
                  "shipped",
                  "delivered",
                  "cancelled",
                  "refunded",
                ] as OrderStatus[]
              ).map((status) => {
                const count = stats.orderStatusStats[status] ?? 0
                const config = STATUS_CONFIG[status]
                const pct =
                  totalOrderCount > 0
                    ? Math.round((count / totalOrderCount) * 100)
                    : 0
                return (
                  <li key={status} className="flex items-center gap-3">
                    <div className="w-20 shrink-0">
                      <StatusBadge status={status} />
                    </div>
                    <div
                      className="flex-1 bg-muted rounded-full h-2 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${config.label} 占比 ${pct}%`}
                    >
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium tabular-nums w-8 text-right">
                      {count}
                    </span>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Recent orders + Top products + Quick actions ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconCartOutline className="h-5 w-5 text-primary" aria-hidden="true" />
                最近订单
              </CardTitle>
              <CardDescription>最新 10 笔订单</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/orders")}
              aria-label="查看全部订单"
            >
              查看全部
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length === 0 ? (
              <EmptyState
                icon={<IconCartOutline className="h-10 w-10" />}
                title="暂无订单数据"
                description="订单将在有用户下单后出现这里"
              />
            ) : (
              <ul className="space-y-2" aria-label="最近订单列表">
                {stats.recentOrders.map((order: Order) => {
                  const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
                  return (
                    <li key={order.id}>
                      <button
                        className="interactive-row w-full text-left"
                        onClick={() => navigate("/orders")}
                        aria-label={`订单 #${order.order_number}，状态：${sc.label}，金额：${formatCurrency(order.total_amount || 0)}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm tabular-nums">
                                #{order.order_number}
                              </span>
                              <StatusBadge status={order.status} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatShortDate(order.order_date)}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-sm shrink-0 tabular-nums">
                          {formatCurrency(order.total_amount || 0)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Right column: Top products + Quick actions */}
        <div className="space-y-4">
          {/* Top products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IconTrendUp className="h-4 w-4 text-primary" aria-hidden="true" />
                热门商品
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topProducts.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  暂无数据
                </p>
              ) : (
                <ul className="space-y-2" aria-label="热门商品列表">
                  {stats.topProducts.slice(0, 5).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate max-w-[140px]">{p.name}</span>
                      <div className="flex gap-1 shrink-0">
                        {p.isHot && (
                          <Badge
                            className="text-xs bg-red-500 text-white px-1.5 py-0"
                            aria-label="热卖商品"
                          >
                            热卖
                          </Badge>
                        )}
                        {p.isNew && (
                          <Badge
                            className="text-xs bg-blue-500 text-white px-1.5 py-0"
                            aria-label="新品"
                          >
                            新品
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">快捷操作</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="grid grid-cols-2 gap-2"
                role="group"
                aria-label="快捷导航操作"
              >
                {[
                  { label: "查看订单",  icon: <IconCartOutline className="h-5 w-5" />,    path: "/orders" },
                  { label: "添加商品",  icon: <IconPackageOutline className="h-5 w-5" />, path: "/products/add" },
                  { label: "用户管理",  icon: <IconUsersOutline className="h-5 w-5" />,   path: "/users" },
                  { label: "消息通知",  icon: <IconBellOutline className="h-5 w-5" />,    path: "/notifications" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-dashed hover:border-solid hover:bg-accent transition-all duration-200 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={item.label}
                  >
                    <span className="text-primary" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}
