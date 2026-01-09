"use client"

import { useEffect, useState } from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import pb from "@/lib/pocketbase.ts";
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

interface DashboardStats {
    totalRevenue: number
    totalRevenueChange: number
    newCustomers: number
    newCustomersChange: number
    activeAccounts: number
    activeAccountsChange: number
    growthRate: number
    orderStats?: {
        today: number
        yesterday: number
        change: number
    }
}

export function SectionCards() {
    const [stats, setStats] = useState<DashboardStats>({
        totalRevenue: 0,
        totalRevenueChange: 0,
        newCustomers: 0,
        newCustomersChange: 0,
        activeAccounts: 0,
        activeAccountsChange: 0,
        growthRate: 0,
    })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchDashboardStats()
    }, [])

    const fetchDashboardStats = async () => {
        try {
            setIsLoading(true)

            // 并行获取多个数据
            const [
                revenueData,
                customersData,
                usersData,
                ordersData
            ] = await Promise.all([
                fetchTotalRevenue(),
                fetchNewCustomers(),
                fetchActiveAccounts(),
                fetchRecentOrders()
            ])

            setStats({
                totalRevenue: revenueData.total,
                totalRevenueChange: revenueData.change,
                newCustomers: customersData.total,
                newCustomersChange: customersData.change,
                activeAccounts: usersData.total,
                activeAccountsChange: usersData.change,
                growthRate: calculateGrowthRate(ordersData),
                orderStats: ordersData
            })
        } catch (error) {
            console.error("Error fetching dashboard stats:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchTotalRevenue = async () => {
        try {
            // 获取今日和昨日的订单总额
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)

            // 获取今日订单
            const todayOrders = await pb.collection('orders').getFullList({
                filter: `order_date >= "${today.toISOString()}"`,
                fields: 'total_amount'
            })

            // 获取昨日订单
            const yesterdayOrders = await pb.collection('orders').getFullList({
                filter: `order_date >= "${yesterday.toISOString()}" && order_date < "${today.toISOString()}"`,
                fields: 'total_amount'
            })

            const todayTotal = todayOrders.reduce((sum, order) => sum + order.total_amount, 0)
            const yesterdayTotal = yesterdayOrders.reduce((sum, order) => sum + order.total_amount, 0)

            const change = yesterdayTotal > 0
                ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
                : todayTotal > 0 ? 100 : 0

            return {
                total: todayTotal,
                change: parseFloat(change.toFixed(1))
            }
        } catch (error) {
            console.error("Error fetching revenue:", error)
            return { total: 0, change: 0 }
        }
    }

    const fetchNewCustomers = async () => {
        try {
            // 获取今日和昨日新增用户
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)

            // 获取今日新增用户
            const todayUsers = await pb.collection('users').getFullList({
                 filter: `created >= "${today.toISOString()}"`,
                fields: 'id'
            })
            // 获取昨日新增用户
            const yesterdayUsers = await pb.collection('users').getFullList({
                filter: `created >= "${yesterday.toISOString()}" && created < "${today.toISOString()}"`,
                fields: 'id'
            })
            const change = yesterdayUsers.length > 0
                ? ((todayUsers.length - yesterdayUsers.length) / yesterdayUsers.length) * 100
                : todayUsers.length > 0 ? 100 : 0
            return {
                total: todayUsers.length,
                change: parseFloat(change.toFixed(1))
            }
        } catch (error) {
            console.error("Error fetching customers:", error)
            return { total: 0, change: 0 }
        }
    }

    const fetchActiveAccounts = async () => {
        try {
            // 获取最近7天活跃用户（有订单的用户）
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

            // 获取最近7天有订单的用户
            const recentOrders = await pb.collection('orders').getFullList({
                filter: `order_date >= "${sevenDaysAgo.toISOString()}"`,
                fields: 'user'
            })

            // 去重获取独立用户
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            const uniqueUsers = [...new Set(recentOrders.map((order: { user: never }) => order.user))]

            // 获取上一周期数据进行比较
            const fourteenDaysAgo = new Date()
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

            const previousOrders = await pb.collection('orders').getFullList({
                filter: `order_date >= "${fourteenDaysAgo.toISOString()}" && order_date < "${sevenDaysAgo.toISOString()}"`,
                fields: 'user'
            })

            const previousUniqueUsers = [...new Set(previousOrders.map(order => order.user))]

            const change = previousUniqueUsers.length > 0
                ? ((uniqueUsers.length - previousUniqueUsers.length) / previousUniqueUsers.length) * 100
                : uniqueUsers.length > 0 ? 100 : 0

            return {
                total: uniqueUsers.length,
                change: parseFloat(change.toFixed(1))
            }
        } catch (error) {
            console.error("Error fetching active accounts:", error)
            return { total: 0, change: 0 }
        }
    }

    const fetchRecentOrders = async () => {
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)

            // 今日订单数
            const todayOrders = await pb.collection('orders').getFullList({
                filter: `order_date >= "${today.toISOString()}"`,
                fields: 'id'
            })

            // 昨日订单数
            const yesterdayOrders = await pb.collection('orders').getFullList({
                filter: `order_date >= "${yesterday.toISOString()}" && order_date < "${today.toISOString()}"`,
                fields: 'id'
            })

            const change = yesterdayOrders.length > 0
                ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100
                : todayOrders.length > 0 ? 100 : 0

            return {
                today: todayOrders.length,
                yesterday: yesterdayOrders.length,
                change: parseFloat(change.toFixed(1))
            }
        } catch (error) {
            console.error("Error fetching recent orders:", error)
            return { today: 0, yesterday: 0, change: 0 }
        }
    }

    const calculateGrowthRate = (orderStats?: { today: number; yesterday: number; change: number }) => {
        if (!orderStats) return 0

        // 这里可以根据业务逻辑计算增长率
        // 比如：平均增长率，或者基于更多历史数据计算
        return orderStats.change
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount)
    }

    if (isLoading) {
        return (
            <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="@container/card">
                        <CardHeader>
                            <CardDescription className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></CardDescription>
                            <CardTitle className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2"></CardTitle>
                            <CardAction>
                                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            </CardAction>
                        </CardHeader>
                        <CardFooter className="flex-col items-start gap-1.5 text-sm">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            {/* 总销售额 */}
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Total Revenue</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {formatCurrency(stats.totalRevenue)}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline" className={stats.totalRevenueChange >= 0 ? "text-green-600" : "text-red-600"}>
                            {stats.totalRevenueChange >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {Math.abs(stats.totalRevenueChange).toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {stats.totalRevenueChange >= 0 ? "Trending up this month" : "Trending down this month"}
                        {stats.totalRevenueChange >= 0 ? (
                            <IconTrendingUp className="size-4" />
                        ) : (
                            <IconTrendingDown className="size-4" />
                        )}
                    </div>
                    <div className="text-muted-foreground">
                        Compared to yesterday
                    </div>
                </CardFooter>
            </Card>

            {/* 新客户 */}
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>New Customers</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {stats.newCustomers.toLocaleString()}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline" className={stats.newCustomersChange >= 0 ? "text-green-600" : "text-red-600"}>
                            {stats.newCustomersChange >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {Math.abs(stats.newCustomersChange).toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {stats.newCustomersChange >= 0 ? "Up from yesterday" : "Down from yesterday"}
                        {stats.newCustomersChange >= 0 ? (
                            <IconTrendingUp className="size-4" />
                        ) : (
                            <IconTrendingDown className="size-4" />
                        )}
                    </div>
                    <div className="text-muted-foreground">
                        {stats.newCustomersChange < 0 ? "Acquisition needs attention" : "Healthy growth"}
                    </div>
                </CardFooter>
            </Card>

            {/* 活跃账户 */}
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Active Accounts</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {stats.activeAccounts.toLocaleString()}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline" className={stats.activeAccountsChange >= 0 ? "text-green-600" : "text-red-600"}>
                            {stats.activeAccountsChange >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {Math.abs(stats.activeAccountsChange).toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {stats.activeAccountsChange >= 0 ? "Strong user retention" : "Retention needs improvement"}
                        {stats.activeAccountsChange >= 0 ? (
                            <IconTrendingUp className="size-4" />
                        ) : (
                            <IconTrendingDown className="size-4" />
                        )}
                    </div>
                    <div className="text-muted-foreground">
                        {stats.activeAccountsChange >= 0 ? "Engagement exceed targets" : "Monitor user activity"}
                    </div>
                </CardFooter>
            </Card>

            {/* 增长率 */}
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>Growth Rate</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {stats.growthRate.toFixed(1)}%
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline" className={stats.growthRate >= 0 ? "text-green-600" : "text-red-600"}>
                            {stats.growthRate >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {Math.abs(stats.growthRate).toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {stats.growthRate >= 0 ? "Steady performance increase" : "Performance decline"}
                        {stats.growthRate >= 0 ? (
                            <IconTrendingUp className="size-4" />
                        ) : (
                            <IconTrendingDown className="size-4" />
                        )}
                    </div>
                    <div className="text-muted-foreground">
                        {stats.growthRate >= 0 ? "Meets growth projections" : "Review growth strategy"}
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}