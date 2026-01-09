"use client"

import * as React from "react"
import {Area, AreaChart, CartesianGrid, XAxis} from "recharts"
import {useIsMobile} from "@/hooks/use-mobile"
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card"
import {type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,} from "@/components/ui/chart"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select"
import {ToggleGroup, ToggleGroupItem,} from "@/components/ui/toggle-group"
import pb from "@/lib/pocketbase.ts";
import type {RecordModel} from "pocketbase";
import type {Order} from "@/pages/OrderConsolePage.tsx";

interface ChartData {
    date: string
    orders: number
    revenue: number
    revenueFormatted?: string
}

const chartConfig = {
    orders: {
        label: "Orders",
        color: "var(--primary)",
    },
    revenue: {
        label: "Revenue",
        color: "var(--chart-1)",
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

            // 根据时间范围计算开始日期
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

            // 获取指定时间范围内的订单数据
            const orders = await fetchOrdersByDateRange(startDate, endDate)

            // 将订单数据按天聚合
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

            // 获取订单数据，包含订单日期和总额
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
        // 创建日期范围内的所有天数
        const dateMap: { [key: string]: { orders: number; revenue: number } } = {}

        // 初始化所有日期为0
        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
            const dateKey = currentDate.toISOString().split('T')[0]
            dateMap[dateKey] = {orders: 0, revenue: 0}
            currentDate.setDate(currentDate.getDate() + 1)
        }

        // 聚合订单数据
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

        // 转换为数组格式并格式化
        const result: ChartData[] = Object.keys(dateMap)
            .sort()
            .map(date => ({
                date,
                orders: dateMap[date].orders,
                revenue: dateMap[date].revenue,
                revenueFormatted: formatCurrency(dateMap[date].revenue)
            }))

        return result
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

    // 计算总统计
    const totalStats = filteredData.reduce((acc, curr) => ({
        totalOrders: acc.totalOrders + curr.orders,
        totalRevenue: acc.totalRevenue + curr.revenue
    }), {totalOrders: 0, totalRevenue: 0})

    // 计算增长趋势
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
                    <CardTitle className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4"></CardTitle>
                    <CardDescription
                        className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></CardDescription>
                    <CardAction>
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-40"></div>
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                    <div
                        className="aspect-auto h-[250px] w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card">
            <CardHeader>
                <CardTitle>
                    {activeMetric === 'revenue' ? 'Revenue Overview' : 'Order Overview'}
                </CardTitle>
                <CardDescription>
          <span className="hidden @[540px]/card:block">
            {activeMetric === 'revenue'
                ? `Total revenue: ${formatCurrency(totalStats.totalRevenue)}`
                : `Total orders: ${totalStats.totalOrders.toLocaleString()}`
            }
          </span>
                    <span className="@[540px]/card:hidden">
            {timeRange === '90d' ? 'Last 3 months' :
                timeRange === '30d' ? 'Last 30 days' : 'Last 7 days'}
          </span>
                </CardDescription>
                <CardAction>
                    <div className="flex items-center gap-2">
                        <ToggleGroup
                            type="single"
                            value={activeMetric}
                            onValueChange={(value) => value && setActiveMetric(value as "orders" | "revenue")}
                            variant="outline"
                            className="mr-2"
                        >
                            <ToggleGroupItem value="revenue" size="sm">
                                Revenue
                            </ToggleGroupItem>
                            <ToggleGroupItem value="orders" size="sm">
                                Orders
                            </ToggleGroupItem>
                        </ToggleGroup>

                        <ToggleGroup
                            type="single"
                            value={timeRange}
                            onValueChange={setTimeRange}
                            variant="outline"
                            className="hidden *:data-[slot=toggle-group-item]:!px-3 @[767px]/card:flex"
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
                                <SelectValue placeholder="Last 3 months"/>
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
                    className="aspect-auto h-[250px] w-full"
                >
                    <AreaChart data={filteredData}>
                        <defs>
                            <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="var(--color-orders)"
                                    stopOpacity={1.0}
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
                        <CartesianGrid vertical={false}/>
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
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
                        <ChartTooltip
                            cursor={false}
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
                </ChartContainer>
                <div className="mt-4 flex items-center justify-between text-sm">
                    <div>
                        <span className="text-muted-foreground">Trend: </span>
                        <span className={trend >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
            </span>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-4 rounded-sm bg-[var(--color-revenue)]"></div>
                            <span className="text-muted-foreground">Revenue</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-4 rounded-sm bg-[var(--color-orders)]"></div>
                            <span className="text-muted-foreground">Orders</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}