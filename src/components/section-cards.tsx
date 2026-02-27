import { useEffect, useState } from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchDashboardStats } from "@/lib/api"
import type { DashboardStats } from "@/types"

export function SectionCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      const data = await fetchDashboardStats()
      setStats(data)
    } catch (error) {
      console.error("Failed to load dashboard stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(amount)

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32 mt-2" />
            </CardHeader>
            <CardFooter>
              <Skeleton className="h-4 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: "今日营收",
      value: formatCurrency(stats.todayRevenue),
      change: stats.todayRevenueChange,
      gradient: "from-blue-50 to-white dark:from-blue-950/20 dark:to-card border-blue-100 dark:border-blue-900",
      textColor: "text-blue-700 dark:text-blue-300",
      descColor: "text-blue-600 dark:text-blue-400",
      footer: "与昨日对比",
    },
    {
      title: "新增用户",
      value: stats.newUsersToday.toLocaleString(),
      change: stats.newUsersTodayChange,
      gradient: "from-green-50 to-white dark:from-green-950/20 dark:to-card border-green-100 dark:border-green-900",
      textColor: "text-green-700 dark:text-green-300",
      descColor: "text-green-600 dark:text-green-400",
      footer: stats.newUsersTodayChange >= 0 ? "用户增长良好" : "获客需关注",
    },
    {
      title: "活跃用户",
      value: stats.activeAccounts.toLocaleString(),
      change: stats.activeAccountsChange,
      gradient: "from-purple-50 to-white dark:from-purple-950/20 dark:to-card border-purple-100 dark:border-purple-900",
      textColor: "text-purple-700 dark:text-purple-300",
      descColor: "text-purple-600 dark:text-purple-400",
      footer: "近 7 天活跃",
    },
    {
      title: "今日订单",
      value: stats.todayOrders.toLocaleString(),
      change: stats.todayOrdersChange,
      gradient: "from-orange-50 to-white dark:from-orange-950/20 dark:to-card border-orange-100 dark:border-orange-900",
      textColor: "text-orange-700 dark:text-orange-300",
      descColor: "text-orange-600 dark:text-orange-400",
      footer: "今日已处理订单",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={`@container/card bg-gradient-to-br ${card.gradient}`}
        >
          <CardHeader>
            <CardDescription className={`${card.descColor} font-medium`}>
              {card.title}
            </CardDescription>
            <CardTitle
              className={`text-3xl font-bold tabular-nums ${card.textColor} @[250px]/card:text-4xl`}
            >
              {card.value}
            </CardTitle>
            <CardAction>
              <Badge
                variant="outline"
                className={
                  card.change >= 0
                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"
                }
              >
                {card.change >= 0 ? (
                  <IconTrendingUp className="w-4 h-4" />
                ) : (
                  <IconTrendingDown className="w-4 h-4" />
                )}
                {Math.abs(card.change).toFixed(1)}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className={`flex gap-2 font-medium ${card.textColor}`}>
              {card.change >= 0 ? "趋势上升" : "趋势下降"}
              {card.change >= 0 ? (
                <IconTrendingUp className="size-4" />
              ) : (
                <IconTrendingDown className="size-4" />
              )}
            </div>
            <div className="text-muted-foreground">{card.footer}</div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
