import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import {
  IconTrendingDown,
  IconTrendingUp,
  IconRefresh,
} from "@tabler/icons-react"
import {
  AlertTriangle,
  Bell,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  BarChart3,
} from "lucide-react"
import { format } from "date-fns"
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
import { fetchDashboardStats } from "@/lib/api"
import type { DashboardStats, Order, OrderStatus } from "@/types"

// ==================== 工具函数 ====================
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(amount)

const statusConfig: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "待付款",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: <Clock className="h-3 w-3" />,
  },
  processing: {
    label: "处理中",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    icon: <BarChart3 className="h-3 w-3" />,
  },
  paid: {
    label: "已付款",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <DollarSign className="h-3 w-3" />,
  },
  shipped: {
    label: "已发货",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    icon: <Truck className="h-3 w-3" />,
  },
  delivered: {
    label: "已收货",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  cancelled: {
    label: "已取消",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: <XCircle className="h-3 w-3" />,
  },
  refunded: {
    label: "已退款",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    icon: <XCircle className="h-3 w-3" />,
  },
}

// ==================== Skeleton 加载占位 ====================
function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        {/* 统计卡片骨架 */}
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
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
        {/* 第二行骨架 */}
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
        {/* 第三行骨架 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-lg lg:col-span-2" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// ==================== 统计卡片 ====================
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
  return (
    <Card className={`@container/card bg-gradient-to-br ${gradient}`}>
      <CardHeader>
        <CardDescription className={`${descColor} font-medium flex items-center gap-1.5`}>
          {icon}
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
                change >= 0
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400"
                  : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"
              }
            >
              {change >= 0 ? (
                <IconTrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <IconTrendingDown className="w-4 h-4 mr-1" />
              )}
              {Math.abs(change).toFixed(1)}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1 text-sm">
        <div className={`flex gap-2 items-center font-medium ${textColor}`}>
          {isStatic ? (
            footer
          ) : (
            <>
              {change >= 0 ? "较昨日上升" : "较昨日下降"}
              {change >= 0 ? (
                <IconTrendingUp className="size-4" />
              ) : (
                <IconTrendingDown className="size-4" />
              )}
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

// ==================== 主页面 ====================
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
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="max-w-md w-full border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              加载失败
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadDashboard} className="w-full">
              <IconRefresh className="h-4 w-4 mr-2" />
              重新加载
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) return <DashboardSkeleton />

  // 统计卡片数据
  const statCards: StatCardProps[] = [
    {
      title: "今日营收",
      value: formatCurrency(stats.todayRevenue),
      change: stats.todayRevenueChange,
      gradient:
        "from-blue-50 to-white dark:from-blue-950/20 dark:to-card border-blue-100 dark:border-blue-900",
      textColor: "text-blue-700 dark:text-blue-300",
      descColor: "text-blue-600 dark:text-blue-400",
      icon: <DollarSign className="h-4 w-4" />,
      footer: "与昨日对比",
    },
    {
      title: "本月营收",
      value: formatCurrency(stats.monthRevenue),
      gradient:
        "from-emerald-50 to-white dark:from-emerald-950/20 dark:to-card border-emerald-100 dark:border-emerald-900",
      textColor: "text-emerald-700 dark:text-emerald-300",
      descColor: "text-emerald-600 dark:text-emerald-400",
      icon: <Calendar className="h-4 w-4" />,
      footer: `本月共 ${stats.monthOrders} 笔订单`,
      isStatic: true,
    },
    {
      title: "今日订单",
      value: stats.todayOrders.toLocaleString(),
      change: stats.todayOrdersChange,
      gradient:
        "from-purple-50 to-white dark:from-purple-950/20 dark:to-card border-purple-100 dark:border-purple-900",
      textColor: "text-purple-700 dark:text-purple-300",
      descColor: "text-purple-600 dark:text-purple-400",
      icon: <ShoppingCart className="h-4 w-4" />,
      footer: "今日已处理订单数",
    },
    {
      title: "用户总数",
      value: stats.totalUsers.toLocaleString(),
      change: stats.newUsersTodayChange,
      gradient:
        "from-orange-50 to-white dark:from-orange-950/20 dark:to-card border-orange-100 dark:border-orange-900",
      textColor: "text-orange-700 dark:text-orange-300",
      descColor: "text-orange-600 dark:text-orange-400",
      icon: <Users className="h-4 w-4" />,
      footer: `今日新增 ${stats.newUsersToday} 位用户`,
    },
  ]

  // 订单状态统计总数
  const totalOrderCount = Object.values(stats.orderStatusStats).reduce(
    (a, b) => a + b,
    0
  )

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">运营总览</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {lastUpdated
                ? `最后更新：${format(lastUpdated, "HH:mm:ss")}`
                : "实时数据"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadDashboard} className="gap-2">
            <IconRefresh className="h-4 w-4" />
            刷新
          </Button>
        </div>

        {/* ── 第一行：4 个核心统计卡片 ── */}
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </div>

        {/* ── 第二行：商品统计 + 订单状态分布 ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 商品概览 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  商品概览
                </CardTitle>
                <CardDescription>库存与商品状态</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/products")}
              >
                管理商品
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-primary">
                    {stats.totalProducts}
                  </p>
                  <p className="text-xs text-muted-foreground">商品总数</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-red-500">
                    {stats.outOfStockCount}
                  </p>
                  <p className="text-xs text-muted-foreground">缺货商品</p>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-yellow-500">
                    {stats.lowStockProducts.length}
                  </p>
                  <p className="text-xs text-muted-foreground">低库存预警</p>
                </div>
              </div>
              {stats.lowStockProducts.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    库存预警商品（≤10件）
                  </p>
                  <div className="space-y-1.5">
                    {stats.lowStockProducts.slice(0, 4).map((p) => (
                      <div
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
                              ? "bg-red-100 text-red-700 border-red-200"
                              : "bg-yellow-100 text-yellow-700 border-yellow-200"
                          }
                        >
                          剩余 {p.stock ?? 0}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 订单状态分布 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  订单状态统计
                </CardTitle>
                <CardDescription>
                  全部订单：{totalOrderCount} 笔
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/orders")}
              >
                查看订单
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
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
                  const config = statusConfig[status]
                  const pct =
                    totalOrderCount > 0
                      ? Math.round((count / totalOrderCount) * 100)
                      : 0
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className="w-20 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}
                        >
                          {config.icon}
                          {config.label}
                        </span>
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 第三行：最近订单 + 热门商品 ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* 最近订单 */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  最近订单
                </CardTitle>
                <CardDescription>最新 10 笔订单</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/orders")}
              >
                查看全部
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {stats.recentOrders.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 mb-2 opacity-40" />
                    <p>暂无订单数据</p>
                  </div>
                ) : (
                  stats.recentOrders.map((order: Order) => {
                    const sc = statusConfig[order.status] || statusConfig.pending
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate("/orders")}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                #{order.order_number}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}
                              >
                                {sc.icon}
                                {sc.label}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {order.order_date
                                ? format(
                                    new Date(order.order_date),
                                    "MM-dd HH:mm"
                                  )
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-sm shrink-0">
                          {formatCurrency(order.total_amount || 0)}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* 热门商品 + 快捷操作 */}
          <div className="space-y-4">
            {/* 热门商品 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  热门商品
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.topProducts.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    暂无数据
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stats.topProducts.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="truncate max-w-[140px]">{p.name}</span>
                        <div className="flex gap-1 shrink-0">
                          {p.isHot && (
                            <Badge className="text-xs bg-red-500 text-white px-1.5 py-0">
                              热卖
                            </Badge>
                          )}
                          {p.isNew && (
                            <Badge className="text-xs bg-blue-500 text-white px-1.5 py-0">
                              新品
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 快捷操作 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">快捷操作</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: "查看订单",
                      icon: <ShoppingCart className="h-5 w-5" />,
                      path: "/orders",
                    },
                    {
                      label: "添加商品",
                      icon: <Package className="h-5 w-5" />,
                      path: "/products/add",
                    },
                    {
                      label: "用户管理",
                      icon: <Users className="h-5 w-5" />,
                      path: "/users",
                    },
                    {
                      label: "消息通知",
                      icon: <Bell className="h-5 w-5" />,
                      path: "/notifications",
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => navigate(item.path)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-dashed hover:border-solid hover:bg-accent transition-all text-center"
                    >
                      <span className="text-primary">{item.icon}</span>
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
