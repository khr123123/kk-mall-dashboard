import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import {
  AlertTriangle,
  Bell,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
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
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { fetchDashboardStats } from "@/lib/api"
import type { DashboardStats, Order } from "@/types"

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  processing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
}

export default function DashBoardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setIsLoading(true)
      const data = await fetchDashboardStats()
      setStats(data)
    } catch (error) {
      console.error("Failed to load dashboard:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !stats) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
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
            <div className="px-4 lg:px-6">
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      change: stats.totalRevenueChange,
      gradient: "from-blue-50 to-white dark:from-blue-950/20 dark:to-card border-blue-100 dark:border-blue-900",
      textColor: "text-blue-700 dark:text-blue-300",
      descColor: "text-blue-600 dark:text-blue-400",
      icon: <DollarSign className="h-5 w-5" />,
      footer: "Compared to yesterday",
    },
    {
      title: "New Customers",
      value: stats.newCustomers.toLocaleString(),
      change: stats.newCustomersChange,
      gradient: "from-green-50 to-white dark:from-green-950/20 dark:to-card border-green-100 dark:border-green-900",
      textColor: "text-green-700 dark:text-green-300",
      descColor: "text-green-600 dark:text-green-400",
      icon: <Users className="h-5 w-5" />,
      footer: stats.newCustomersChange >= 0 ? "Healthy growth" : "Acquisition needs attention",
    },
    {
      title: "Today's Orders",
      value: stats.totalOrders.toLocaleString(),
      change: stats.totalOrdersChange,
      gradient: "from-purple-50 to-white dark:from-purple-950/20 dark:to-card border-purple-100 dark:border-purple-900",
      textColor: "text-purple-700 dark:text-purple-300",
      descColor: "text-purple-600 dark:text-purple-400",
      icon: <ShoppingCart className="h-5 w-5" />,
      footer: "Orders processed today",
    },
    {
      title: "Total Products",
      value: stats.totalProducts.toLocaleString(),
      change: 0,
      gradient: "from-orange-50 to-white dark:from-orange-950/20 dark:to-card border-orange-100 dark:border-orange-900",
      textColor: "text-orange-700 dark:text-orange-300",
      descColor: "text-orange-600 dark:text-orange-400",
      icon: <Package className="h-5 w-5" />,
      footer: `${stats.outOfStockCount} out of stock`,
      isStatic: true,
    },
  ]

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            {statCards.map((card) => (
              <Card key={card.title} className={`@container/card bg-gradient-to-br ${card.gradient}`}>
                <CardHeader>
                  <CardDescription className={`${card.descColor} font-medium`}>
                    {card.title}
                  </CardDescription>
                  <CardTitle className={`text-3xl font-bold tabular-nums ${card.textColor} @[250px]/card:text-4xl`}>
                    {card.value}
                  </CardTitle>
                  {!card.isStatic && (
                    <CardAction>
                      <Badge
                        variant="outline"
                        className={
                          card.change >= 0
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400"
                            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"
                        }
                      >
                        {card.change >= 0 ? <IconTrendingUp className="w-4 h-4" /> : <IconTrendingDown className="w-4 h-4" />}
                        {Math.abs(card.change).toFixed(1)}%
                      </Badge>
                    </CardAction>
                  )}
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className={`flex gap-2 font-medium ${card.textColor}`}>
                    {card.isStatic
                      ? card.footer
                      : card.change >= 0
                        ? "Trending up"
                        : "Trending down"}
                    {!card.isStatic &&
                      (card.change >= 0
                        ? <IconTrendingUp className="size-4" />
                        : <IconTrendingDown className="size-4" />)}
                  </div>
                  {!card.isStatic && <div className="text-muted-foreground">{card.footer}</div>}
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Chart */}
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </div>

          {/* Recent Orders & Low Stock Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 lg:px-6">
            {/* Recent Orders */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    Recent Orders
                  </CardTitle>
                  <CardDescription>Latest 10 orders</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/orders")}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.recentOrders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No orders yet</p>
                  ) : (
                    stats.recentOrders.map((order: Order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate("/orders")}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              #{order.order_number}
                            </span>
                            <Badge className={`text-xs ${statusColors[order.status] || ""}`} variant="outline">
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {order.order_date ? format(new Date(order.order_date), "yyyy-MM-dd HH:mm") : "N/A"}
                          </p>
                        </div>
                        <span className="font-bold text-sm">{formatCurrency(order.total_amount || 0)}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Inventory Alerts
                  </CardTitle>
                  <CardDescription>Products with low stock ({"<="} 10)</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/products")}>
                  Manage
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.lowStockProducts.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-10 w-10 mx-auto text-green-500 mb-2" />
                      <p className="text-muted-foreground">All products are well stocked!</p>
                    </div>
                  ) : (
                    stats.lowStockProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm truncate block">{product.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Price: {formatCurrency(product.price || 0)}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            (product.stock || 0) <= 3
                              ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }
                        >
                          Stock: {product.stock || 0}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Frequently used operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <button
                    onClick={() => navigate("/orders")}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed hover:border-solid hover:bg-accent transition-all"
                  >
                    <ShoppingCart className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">Orders</span>
                  </button>
                  <button
                    onClick={() => navigate("/products/add")}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed hover:border-solid hover:bg-accent transition-all"
                  >
                    <Package className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">Add Product</span>
                  </button>
                  <button
                    onClick={() => navigate("/users")}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed hover:border-solid hover:bg-accent transition-all"
                  >
                    <Users className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">Users</span>
                  </button>
                  <button
                    onClick={() => navigate("/notifications")}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed hover:border-solid hover:bg-accent transition-all"
                  >
                    <Bell className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">Notifications</span>
                  </button>
                  <button
                    onClick={() => navigate("/chart")}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed hover:border-solid hover:bg-accent transition-all"
                  >
                    <DollarSign className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">Analytics</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
