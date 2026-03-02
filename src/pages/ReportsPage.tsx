import { useEffect, useState } from "react"
import { toast } from "sonner"
import { format, subDays, startOfMonth } from "date-fns"
import {
  IconReport,
  IconDownload,
  IconRefresh,
} from "@tabler/icons-react"
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import pb from "@/lib/pocketbase"
import { COLLECTIONS } from "@/lib/api"
import type { Order, Product, User } from "@/types"

// ==================== 工具函数 ====================
const formatCurrency = (n: number) =>
  new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(n)

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

const STATUS_LABELS: Record<string, string> = {
  pending: "待付款",
  processing: "处理中",
  paid: "已付款",
  shipped: "已发货",
  delivered: "已收货",
  cancelled: "已取消",
  refunded: "已退款",
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#6366f1",
  paid: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
  refunded: "#6b7280",
}

interface ReportData {
  // 概览
  totalRevenue: number
  totalOrders: number
  totalUsers: number
  totalProducts: number
  averageOrderValue: number
  conversionRate: number

  // 趋势数据
  dailyRevenue: { date: string; revenue: number; orders: number }[]
  weeklyRevenue: { week: string; revenue: number; orders: number }[]

  // 订单状态
  orderStatusDistribution: { name: string; value: number; color: string }[]
  
  // 支付方式
  paymentMethodDistribution: { name: string; value: number }[]
  
  // 商品分析
  topSellingCategories: { name: string; count: number; revenue: number }[]
  priceRangeDistribution: { range: string; count: number }[]
  stockSummary: { label: string; count: number; color: string }[]

  // 用户分析
  userGrowth: { date: string; count: number }[]
  userRoleDistribution: { name: string; value: number }[]

  // 比较数据
  currentPeriodRevenue: number
  previousPeriodRevenue: number
  currentPeriodOrders: number
  previousPeriodOrders: number
}

// ==================== 报告生成 ====================
async function generateReport(period: string): Promise<ReportData> {
  const now = new Date()
  let startDate: Date
  let prevStartDate: Date
  let prevEndDate: Date

  switch (period) {
    case "7d":
      startDate = subDays(now, 7)
      prevStartDate = subDays(now, 14)
      prevEndDate = subDays(now, 7)
      break
    case "30d":
      startDate = subDays(now, 30)
      prevStartDate = subDays(now, 60)
      prevEndDate = subDays(now, 30)
      break
    case "90d":
      startDate = subDays(now, 90)
      prevStartDate = subDays(now, 180)
      prevEndDate = subDays(now, 90)
      break
    case "month":
      startDate = startOfMonth(now)
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      prevStartDate = prevMonth
      prevEndDate = startOfMonth(now)
      break
    default:
      startDate = subDays(now, 30)
      prevStartDate = subDays(now, 60)
      prevEndDate = subDays(now, 30)
  }

  const [allOrders, allProducts, allUsers, allCategories] = await Promise.all([
    pb.collection(COLLECTIONS.ORDERS).getFullList<Order>({ sort: "-order_date" }),
    pb.collection(COLLECTIONS.PRODUCTS).getFullList<Product>({ sort: "-created", expand: "category_id" }),
    pb.collection(COLLECTIONS.USERS).getFullList<User>({ sort: "-created" }),
    pb.collection(COLLECTIONS.CATEGORY).getFullList<any>({ sort: "name" }),
  ])

  // 当期订单
  const periodOrders = allOrders.filter(
    (o) => o.order_date && new Date(o.order_date) >= startDate
  )
  // 上期订单
  const prevPeriodOrders = allOrders.filter(
    (o) => o.order_date && new Date(o.order_date) >= prevStartDate && new Date(o.order_date) < prevEndDate
  )

  // 总营收
  const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const currentPeriodRevenue = periodOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const previousPeriodRevenue = prevPeriodOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)

  // 平均客单价
  const averageOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0

  // 每日营收趋势
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30
  const dailyRevenue = Array.from({ length: days }, (_, i) => {
    const date = subDays(now, days - 1 - i)
    const dateStr = format(date, "yyyy-MM-dd")
    const dayOrders = allOrders.filter(
      (o) => o.order_date && format(new Date(o.order_date), "yyyy-MM-dd") === dateStr
    )
    return {
      date: format(date, "MM/dd"),
      revenue: dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      orders: dayOrders.length,
    }
  })

  // 周营收
  const weeklyRevenue: { week: string; revenue: number; orders: number }[] = []
  for (let i = 0; i < 8; i++) {
    const weekStart = subDays(now, (7 - i) * 7)
    const weekEnd = subDays(now, (6 - i) * 7)
    const weekOrders = allOrders.filter((o) => {
      if (!o.order_date) return false
      const d = new Date(o.order_date)
      return d >= weekStart && d < weekEnd
    })
    weeklyRevenue.push({
      week: `W${i + 1}`,
      revenue: weekOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      orders: weekOrders.length,
    })
  }

  // 订单状态分布
  const statusCounts: Record<string, number> = {}
  for (const o of allOrders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  }
  const orderStatusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || "#6b7280",
  }))

  // 支付方式分布
  const paymentCounts: Record<string, number> = {}
  for (const o of allOrders) {
    const method = o.payment_method || "unknown"
    paymentCounts[method] = (paymentCounts[method] || 0) + 1
  }
  const paymentMethodDistribution = Object.entries(paymentCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // 分类销售（基于商品与分类关联）
  const childIdSet = new Set<string>()
  for (const cat of allCategories) {
    if (cat.children && cat.children.length > 0) {
      for (const cid of cat.children) childIdSet.add(cid)
    }
  }
  const parentCats = allCategories.filter((c: any) => !childIdSet.has(c.id))
  const topSellingCategories = parentCats.map((cat: any) => {
    const catIds = [cat.id, ...(cat.children || [])]
    const catProducts = allProducts.filter((p) => catIds.includes(p.category_id || ""))
    return {
      name: cat.name,
      count: catProducts.length,
      revenue: catProducts.reduce((sum, p) => sum + (p.price || 0), 0),
    }
  }).sort((a, b) => b.count - a.count)

  // 价格区间
  const priceRanges = [
    { range: "0-100", min: 0, max: 100 },
    { range: "100-500", min: 100, max: 500 },
    { range: "500-1K", min: 500, max: 1000 },
    { range: "1K-3K", min: 1000, max: 3000 },
    { range: "3K-5K", min: 3000, max: 5000 },
    { range: "5K+", min: 5000, max: Infinity },
  ]
  const priceRangeDistribution = priceRanges.map((r) => ({
    range: r.range,
    count: allProducts.filter((p) => (p.price || 0) >= r.min && (p.price || 0) < r.max).length,
  }))

  // 库存状况
  const stockSummary = [
    { label: "库存充足(>50)", count: allProducts.filter((p) => (p.stock ?? 0) > 50).length, color: "#10b981" },
    { label: "库存正常(20-50)", count: allProducts.filter((p) => (p.stock ?? 0) > 20 && (p.stock ?? 0) <= 50).length, color: "#3b82f6" },
    { label: "库存紧张(1-20)", count: allProducts.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 20).length, color: "#f59e0b" },
    { label: "缺货(0)", count: allProducts.filter((p) => (p.stock ?? 0) <= 0).length, color: "#ef4444" },
  ]

  // 用户增长趋势
  const userGrowth = Array.from({ length: days }, (_, i) => {
    const date = subDays(now, days - 1 - i)
    const dateStr = format(date, "yyyy-MM-dd")
    return {
      date: format(date, "MM/dd"),
      count: allUsers.filter((u) => format(new Date(u.created), "yyyy-MM-dd") === dateStr).length,
    }
  })

  // 用户角色分布
  const roleCounts: Record<string, number> = {}
  for (const u of allUsers) {
    const role = u.role || "user"
    roleCounts[role] = (roleCounts[role] || 0) + 1
  }
  const userRoleDistribution = Object.entries(roleCounts).map(([name, value]) => ({ name, value }))

  return {
    totalRevenue,
    totalOrders: allOrders.length,
    totalUsers: allUsers.length,
    totalProducts: allProducts.length,
    averageOrderValue,
    conversionRate: allUsers.length > 0 ? (allOrders.length / allUsers.length) * 100 : 0,
    dailyRevenue,
    weeklyRevenue,
    orderStatusDistribution,
    paymentMethodDistribution,
    topSellingCategories,
    priceRangeDistribution,
    stockSummary,
    userGrowth,
    userRoleDistribution,
    currentPeriodRevenue,
    previousPeriodRevenue,
    currentPeriodOrders: periodOrders.length,
    previousPeriodOrders: prevPeriodOrders.length,
  }
}

// ==================== 变化指标组件 ====================
function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground">--</span>
  const change = previous === 0 ? 100 : ((current - previous) / previous) * 100
  const isUp = change >= 0

  return (
    <span className={`inline-flex items-center text-xs font-medium ${isUp ? "text-green-600" : "text-red-600"}`}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  )
}

// ==================== 导出功能 ====================
function exportReportToCSV(data: ReportData) {
  const lines = [
    "KK Mall 运营报告",
    `生成时间: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
    "",
    "== 总览 ==",
    `总营收,${data.totalRevenue}`,
    `总订单数,${data.totalOrders}`,
    `总用户数,${data.totalUsers}`,
    `总商品数,${data.totalProducts}`,
    `平均客单价,${data.averageOrderValue.toFixed(2)}`,
    `用户下单率,${data.conversionRate.toFixed(1)}%`,
    "",
    "== 每日营收 ==",
    "日期,营收,订单数",
    ...data.dailyRevenue.map((d) => `${d.date},${d.revenue},${d.orders}`),
    "",
    "== 订单状态分布 ==",
    "状态,数量",
    ...data.orderStatusDistribution.map((d) => `${d.name},${d.value}`),
    "",
    "== 分类商品统计 ==",
    "分类,商品数,总价值",
    ...data.topSellingCategories.map((d) => `${d.name},${d.count},${d.revenue}`),
  ]

  const csv = lines.join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `kk_mall_report_${format(new Date(), "yyyyMMdd")}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success("报告导出成功")
}

// ==================== 主页面 ====================
export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30d")

  const loadReport = async () => {
    setLoading(true)
    try {
      const report = await generateReport(period)
      setData(report)
    } catch (err) {
      console.error(err)
      toast.error("报告生成失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [period])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <IconReport className="h-6 w-6 text-primary" />
              运营报告
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              生成时间: {format(new Date(), "yyyy-MM-dd HH:mm")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">最近 7 天</SelectItem>
                <SelectItem value="30d">最近 30 天</SelectItem>
                <SelectItem value="90d">最近 90 天</SelectItem>
                <SelectItem value="month">本月</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadReport} className="gap-1.5">
              <IconRefresh className="h-4 w-4" />
              刷新
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportReportToCSV(data)} className="gap-1.5">
              <IconDownload className="h-4 w-4" />
              导出
            </Button>
          </div>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-card border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <ChangeIndicator current={data.currentPeriodRevenue} previous={data.previousPeriodRevenue} />
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(data.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">总营收</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-card border-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
                <ChangeIndicator current={data.currentPeriodOrders} previous={data.previousPeriodOrders} />
              </div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{data.totalOrders.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">总订单数</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-card border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{data.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">注册用户</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-card border-orange-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{data.totalProducts.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">商品总数</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/20 dark:to-card border-pink-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 text-pink-600" />
              </div>
              <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">{formatCurrency(data.averageOrderValue)}</p>
              <p className="text-xs text-muted-foreground mt-1">平均客单价</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/20 dark:to-card border-cyan-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="h-5 w-5 text-cyan-600" />
              </div>
              <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{data.conversionRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">用户下单率</p>
            </CardContent>
          </Card>
        </div>

        {/* 图表区域 */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="revenue">营收分析</TabsTrigger>
            <TabsTrigger value="orders">订单分析</TabsTrigger>
            <TabsTrigger value="products">商品分析</TabsTrigger>
            <TabsTrigger value="users">用户分析</TabsTrigger>
          </TabsList>

          {/* 营收分析 */}
          <TabsContent value="revenue" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 营收趋势 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    营收趋势
                  </CardTitle>
                  <CardDescription>每日营收和订单量变化</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={data.dailyRevenue}>
                      <defs>
                        <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string) => [
                          name === "revenue" ? formatCurrency(value) : value,
                          name === "revenue" ? "营收" : "订单数",
                        ]}
                      />
                      <Legend formatter={(v) => (v === "revenue" ? "营收" : "订单数")} />
                      <Area yAxisId="left" type="monotone" dataKey="revenue" stroke={COLORS[0]} fill="url(#fillRevenue)" />
                      <Area yAxisId="right" type="monotone" dataKey="orders" stroke={COLORS[1]} fill="url(#fillOrders)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 周营收对比 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    周营收对比
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.weeklyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Bar dataKey="revenue" name="营收" fill={COLORS[0]} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 支付方式分布 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PieChartIcon className="h-4 w-4 text-primary" />
                    支付方式分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={data.paymentMethodDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        dataKey="value"
                      >
                        {data.paymentMethodDistribution.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 订单分析 */}
          <TabsContent value="orders" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 订单状态分布饼图 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    订单状态分布
                  </CardTitle>
                  <CardDescription>全部订单状态占比</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.orderStatusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {data.orderStatusDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 订单状态详细 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    订单状态统计
                  </CardTitle>
                  <CardDescription>各状态订单数量</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.orderStatusDistribution.map((item) => {
                      const total = data.totalOrders || 1
                      const pct = Math.round((item.value / total) * 100)
                      return (
                        <div key={item.name} className="flex items-center gap-3">
                          <div className="w-20 shrink-0">
                            <Badge variant="outline" className="text-xs" style={{ borderColor: item.color, color: item.color }}>
                              {item.name}
                            </Badge>
                          </div>
                          <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: item.color }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{item.value}</span>
                          <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 商品分析 */}
          <TabsContent value="products" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 分类商品数量 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    分类商品数量
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.topSellingCategories} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="商品数" fill={COLORS[0]} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 价格区间分布 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    价格区间分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.priceRangeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" name="商品数" fill={COLORS[2]} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 库存状况 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    库存状况汇总
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {data.stockSummary.map((item) => (
                      <div
                        key={item.label}
                        className="p-4 rounded-lg border text-center"
                        style={{ borderColor: item.color + "40" }}
                      >
                        <p className="text-3xl font-bold" style={{ color: item.color }}>
                          {item.count}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 用户分析 */}
          <TabsContent value="users" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 用户增长趋势 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    用户注册趋势
                  </CardTitle>
                  <CardDescription>每日新注册用户数</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data.userGrowth}>
                      <defs>
                        <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[4]} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={COLORS[4]} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" name="新注册" stroke={COLORS[4]} fill="url(#fillUsers)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 用户角色分布 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PieChartIcon className="h-4 w-4 text-primary" />
                    用户角色分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={data.userRoleDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        dataKey="value"
                      >
                        {data.userRoleDistribution.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 关键用户指标 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    关键用户指标
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm text-muted-foreground">总注册用户</span>
                      <span className="font-bold">{data.totalUsers.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm text-muted-foreground">用户下单率</span>
                      <span className="font-bold">{data.conversionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm text-muted-foreground">平均客单价</span>
                      <span className="font-bold">{formatCurrency(data.averageOrderValue)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm text-muted-foreground">人均订单数</span>
                      <span className="font-bold">
                        {data.totalUsers > 0 ? (data.totalOrders / data.totalUsers).toFixed(1) : "0"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
