import * as React from "react"
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis} from "recharts"
import {useIsMobile} from "@/hooks/use-mobile"
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group"
import {Skeleton} from "@/components/ui/skeleton"
import pb from "@/lib/pocketbase.ts"
import type {RecordModel} from "pocketbase"
import type {Order} from "@/pages/OrderConsolePage.tsx"
import {DollarSign, ShoppingBag, TrendingDown, TrendingUp} from "lucide-react"

interface ChartData {
    date: string
    orders: number
    revenue: number
    revenueFormatted?: string
}

const chartConfig = {
    orders: {
        label: "Orders",
        color: "hsl(var(--chart-1))",
    },
    revenue: {
        label: "Revenue",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig

export function ChartAreaInteractive() {
    const isMobile = useIsMobile()
    const [timeRange, setTimeRange] = React.useState("90d")
    const [chartData, setChartData] = React.useState<ChartData[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [activeMetric, setActiveMetric] = React.useState<"orders" | "revenue">("revenue")

    React.useEffect(() => {
        if (isMobile) {
            setTimeRange("7d")
        }
    }, [isMobile])

    React.useEffect(() => {
        fetchChartData()
    }, [timeRange])

    const fetchChartData = async () => {
        try {
            setIsLoading(true)

            const endDate = new Date()
            const startDate = new Date()

            switch (timeRange) {
                case "7d":
                    startDate.setDate(endDate.getDate() - 7)
                    break
                case "30d":
                    startDate.setDate(endDate.getDate() - 30)
                    break
                case "90d":
                    startDate.setDate(endDate.getDate() - 90)
                    break
                default:
                    startDate.setDate(endDate.getDate() - 90)
            }

            const orders = await fetchOrdersByDateRange(startDate, endDate)
            const aggregatedData = aggregateOrdersByDay(orders, startDate, endDate)

            setChartData(aggregatedData)
        } catch (error) {
            console.error("Error fetching chart data:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchOrdersByDateRange = async (startDate: Date, endDate: Date) => {
        try {
            const startDateStr = startDate.toISOString()
            const endDateStr = endDate.toISOString()

            return await pb.collection('orders').getFullList({
                filter: `order_date >= "${startDateStr}" && order_date <= "${endDateStr}"`,
                fields: 'order_date,total_amount',
                sort: 'order_date',
            })
        } catch (error) {
            console.error("Error fetching orders:", error)
            return []
        }
    }

    const aggregateOrdersByDay = (orders: Array<RecordModel> | Order[], startDate: Date, endDate: Date): ChartData[] => {
        const dateMap: { [key: string]: { orders: number; revenue: number } } = {}

        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
            const dateKey = currentDate.toISOString().split('T')[0]
            dateMap[dateKey] = { orders: 0, revenue: 0 }
            currentDate.setDate(currentDate.getDate() + 1)
        }

        orders.forEach(order => {
            if (order.order_date) {
                const orderDate = new Date(order.order_date)
                const dateKey = orderDate.toISOString().split('T')[0]

                if (dateMap[dateKey]) {
                    dateMap[dateKey].orders += 1
                    dateMap[dateKey].revenue += order.total_amount || 0
                }
            }
        })

        return Object.keys(dateMap)
            .sort()
            .map(date => ({
                date,
                orders: dateMap[date].orders,
                revenue: dateMap[date].revenue,
                revenueFormatted: formatCurrency(dateMap[date].revenue)
            }))
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount)
    }

    const filteredData = chartData.filter((item) => {
        const date = new Date(item.date)
        const endDate = new Date()
        let daysToSubtract = 90

        switch (timeRange) {
            case "30d":
                daysToSubtract = 30
                break
            case "7d":
                daysToSubtract = 7
                break
        }

        const startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - daysToSubtract)
        return date >= startDate
    })

    const totalStats = filteredData.reduce((acc, curr) => ({
        totalOrders: acc.totalOrders + curr.orders,
        totalRevenue: acc.totalRevenue + curr.revenue
    }), { totalOrders: 0, totalRevenue: 0 })

    const calculateTrend = (data: ChartData[]) => {
        if (data.length < 2) return 0

        const firstHalf = data.slice(0, Math.floor(data.length / 2))
        const secondHalf = data.slice(Math.floor(data.length / 2))

        const firstAvg = firstHalf.reduce((sum, item) => sum + (activeMetric === 'orders' ? item.orders : item.revenue), 0) / firstHalf.length
        const secondAvg = secondHalf.reduce((sum, item) => sum + (activeMetric === 'orders' ? item.orders : item.revenue), 0) / secondHalf.length

        return firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : secondAvg > 0 ? 100 : 0
    }

    const trend = calculateTrend(filteredData)

    if (isLoading) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                    <CardAction>
                        <Skeleton className="h-10 w-40" />
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                    <Skeleton className="aspect-auto h-75 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card  shadow-lg">
            <CardHeader className="border-b bg-linear-to-r -mt-6 from-primary/5 via-transparent to-transparent">
                <div className="flex items-center  gap-2 pt-4">
                    {activeMetric === 'revenue' ? (
                        <DollarSign className="h-5 w-5 text-primary" />
                    ) : (
                        <ShoppingBag className="h-5 w-5 text-primary" />
                    )}
                    <CardTitle>
                        {activeMetric === 'revenue' ? 'Revenue Overview' : 'Order Overview'}
                    </CardTitle>
                </div>
                <CardDescription className="flex items-center gap-2 mt-2">
                    <span className="hidden @[540px]/card:block font-medium text-base">
                        {activeMetric === 'revenue'
                            ? `Total revenue: ${formatCurrency(totalStats.totalRevenue)}`
                            : `Total orders: ${totalStats.totalOrders.toLocaleString()}`
                        }
                    </span>
                    <span className="@[540px]/card:hidden">
                        {timeRange === '90d' ? 'Last 3 months' :
                            timeRange === '30d' ? 'Last 30 days' : 'Last 7 days'}
                    </span>
                    {trend >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                </CardDescription>
                <CardAction className={"pt-4"}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <ToggleGroup
                            type="single"
                            value={activeMetric}
                            onValueChange={(value) => value && setActiveMetric(value as "orders" | "revenue")}
                            variant="outline"
                            className="mr-2 border rounded-lg p-1 bg-background/50"
                        >
                            <ToggleGroupItem value="revenue" size="sm" className="gap-1.5">
                                <DollarSign className="h-3.5 w-3.5" />
                                Revenue
                            </ToggleGroupItem>
                            <ToggleGroupItem value="orders" size="sm" className="gap-1.5">
                                <ShoppingBag className="h-3.5 w-3.5" />
                                Orders
                            </ToggleGroupItem>
                        </ToggleGroup>

                        <ToggleGroup
                            type="single"
                            value={timeRange}
                            onValueChange={setTimeRange}
                            variant="outline"
                            className="hidden *:data-[slot=toggle-group-item]:!px-3 @[767px]/card:flex border rounded-lg p-1 bg-background/50"
                        >
                            <ToggleGroupItem value="90d">3M</ToggleGroupItem>
                            <ToggleGroupItem value="30d">30D</ToggleGroupItem>
                            <ToggleGroupItem value="7d">7D</ToggleGroupItem>
                        </ToggleGroup>

                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger
                                className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                                size="sm"
                                aria-label="Select time range"
                            >
                                <SelectValue placeholder="Last 3 months" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="90d" className="rounded-lg">
                                    Last 3 months
                                </SelectItem>
                                <SelectItem value="30d" className="rounded-lg">
                                    Last 30 days
                                </SelectItem>
                                <SelectItem value="7d" className="rounded-lg">
                                    Last 7 days
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[300px] w-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredData}>
                            <defs>
                                <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                        offset="5%"
                                        stopColor="var(--color-orders)"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="var(--color-orders)"
                                        stopOpacity={0.1}
                                    />
                                </linearGradient>
                                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                        offset="5%"
                                        stopColor="var(--color-revenue)"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="var(--color-revenue)"
                                        stopOpacity={0.1}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-muted" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                                tick={{ fill: 'currentColor', className: 'fill-muted-foreground text-xs' }}
                                tickFormatter={(value) => {
                                    const date = new Date(value)
                                    if (timeRange === '7d') {
                                        return date.toLocaleDateString("en-US", {
                                            weekday: "short",
                                        })
                                    }
                                    return date.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                    })
                                }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tick={{ fill: 'currentColor', className: 'fill-muted-foreground text-xs' }}
                                tickFormatter={(value) => {
                                    if (activeMetric === 'revenue') {
                                        return `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
                                    }
                                    return value.toString()
                                }}
                            />
                            <ChartTooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(value) => {
                                            return new Date(value).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric"
                                            })
                                        }}
                                        indicator="dot"
                                        formatter={(value, name) => {
                                            if (name === 'revenue') {
                                                return [formatCurrency(Number(value)), 'Revenue']
                                            }
                                            return [value, 'Orders']
                                        }}
                                    />
                                }
                            />
                            {activeMetric === 'revenue' ? (
                                <Area
                                    dataKey="revenue"
                                    type="monotone"
                                    fill="url(#fillRevenue)"
                                    stroke="var(--color-revenue)"
                                    strokeWidth={2}
                                />
                            ) : (
                                <Area
                                    dataKey="orders"
                                    type="monotone"
                                    fill="url(#fillOrders)"
                                    stroke="var(--color-orders)"
                                    strokeWidth={2}
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>

                {/* 统计信息卡片 */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                        <div>
                            <p className="text-sm text-muted-foreground">Trend</p>
                            <p className={`text-2xl font-bold ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
                            </p>
                        </div>
                        {trend >= 0 ? (
                            <TrendingUp className="h-8 w-8 text-green-600" />
                        ) : (
                            <TrendingDown className="h-8 w-8 text-red-600" />
                        )}
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-card">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Revenue</p>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                {formatCurrency(totalStats.totalRevenue)}
                            </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-blue-600" />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-card">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Orders</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                {totalStats.totalOrders.toLocaleString()}
                            </p>
                        </div>
                        <ShoppingBag className="h-8 w-8 text-green-600" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}