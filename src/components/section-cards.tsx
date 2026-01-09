import {useEffect, useState} from "react"
import {IconTrendingDown, IconTrendingUp} from "@tabler/icons-react"
import pb from "@/lib/pocketbase"
import {Badge} from "@/components/ui/badge"
import {Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle,} from "@/components/ui/card"
import {Skeleton} from "@/components/ui/skeleton"

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

/* =========================
   UTC 时间工具（唯一来源）
========================= */

function startOfTodayUTC() {
    const now = new Date()
    return new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
    ))
}

function daysAgoUTC(days: number) {
    const d = startOfTodayUTC()
    d.setUTCDate(d.getUTCDate() - days)
    return d
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

    /* =========================
       UTC 边界（全组件共用）
    ========================= */

    const todayUTC = startOfTodayUTC()
    const yesterdayUTC = daysAgoUTC(1)
    const sevenDaysAgoUTC = daysAgoUTC(7)
    const fourteenDaysAgoUTC = daysAgoUTC(14)

    useEffect(() => {
        fetchDashboardStats()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchDashboardStats = async () => {
        try {
            setIsLoading(true)

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
                growthRate: ordersData.change,
                orderStats: ordersData,
            })
        } finally {
            setIsLoading(false)
        }
    }

    /* =========================
       今日 / 昨日收入（UTC）
    ========================= */

    const fetchTotalRevenue = async () => {
        const todayOrders = await pb.collection("orders").getFullList({
            filter: `order_date >= "${todayUTC.toISOString()}"`,
            fields: "total_amount",
        })

        const yesterdayOrders = await pb.collection("orders").getFullList({
            filter: `
        order_date >= "${yesterdayUTC.toISOString()}" &&
        order_date < "${todayUTC.toISOString()}"
      `,
            fields: "total_amount",
        })

        const todayTotal = todayOrders.reduce(
            (sum, o: any) => sum + o.total_amount,
            0
        )

        const yesterdayTotal = yesterdayOrders.reduce(
            (sum, o: any) => sum + o.total_amount,
            0
        )

        const change =
            yesterdayTotal > 0
                ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
                : todayTotal > 0
                    ? 100
                    : 0

        return {
            total: todayTotal,
            change: Number(change.toFixed(1)),
        }
    }

    /* =========================
       新用户（UTC）
    ========================= */

    const fetchNewCustomers = async () => {
        const todayUsers = await pb.collection("users").getFullList({
            filter: `created >= "${todayUTC.toISOString()}"`,
            fields: "id",
        })

        const yesterdayUsers = await pb.collection("users").getFullList({
            filter: `
        created >= "${yesterdayUTC.toISOString()}" &&
        created < "${todayUTC.toISOString()}"
      `,
            fields: "id",
        })

        const change =
            yesterdayUsers.length > 0
                ? ((todayUsers.length - yesterdayUsers.length) / yesterdayUsers.length) * 100
                : todayUsers.length > 0
                    ? 100
                    : 0

        return {
            total: todayUsers.length,
            change: Number(change.toFixed(1)),
        }
    }

    /* =========================
       活跃账户（UTC，7天）
    ========================= */

    const fetchActiveAccounts = async () => {
        const recentOrders = await pb.collection("orders").getFullList({
            filter: `order_date >= "${sevenDaysAgoUTC.toISOString()}"`,
            fields: "user",
        })

        const usersNow = [...new Set(recentOrders.map((o: any) => o.user))]

        const previousOrders = await pb.collection("orders").getFullList({
            filter: `
        order_date >= "${fourteenDaysAgoUTC.toISOString()}" &&
        order_date < "${sevenDaysAgoUTC.toISOString()}"
      `,
            fields: "user",
        })

        const usersBefore = [...new Set(previousOrders.map((o: any) => o.user))]

        const change =
            usersBefore.length > 0
                ? ((usersNow.length - usersBefore.length) / usersBefore.length) * 100
                : usersNow.length > 0
                    ? 100
                    : 0

        return {
            total: usersNow.length,
            change: Number(change.toFixed(1)),
        }
    }

    /* =========================
       今日 / 昨日订单数（UTC）
    ========================= */

    const fetchRecentOrders = async () => {
        const todayOrders = await pb.collection("orders").getFullList({
            filter: `order_date >= "${todayUTC.toISOString()}"`,
            fields: "id",
        })

        const yesterdayOrders = await pb.collection("orders").getFullList({
            filter: `
        order_date >= "${yesterdayUTC.toISOString()}" &&
        order_date < "${todayUTC.toISOString()}"
      `,
            fields: "id",
        })

        const change =
            yesterdayOrders.length > 0
                ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100
                : todayOrders.length > 0
                    ? 100
                    : 0

        return {
            today: todayOrders.length,
            yesterday: yesterdayOrders.length,
            change: Number(change.toFixed(1)),
        }
    }

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount)

    /* =========================
       UI（未动）
    ========================= */

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-4 w-24"/>
                            <Skeleton className="h-8 w-32 mt-2"/>
                        </CardHeader>
                        <CardFooter>
                            <Skeleton className="h-4 w-full"/>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            <Card
                className="@container/card bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-card border-blue-100 dark:border-blue-900">
                <CardHeader>
                    <CardDescription className="text-blue-600 dark:text-blue-400 font-medium">Total
                        Revenue</CardDescription>
                    <CardTitle
                        className="text-3xl font-bold tabular-nums text-blue-700 dark:text-blue-300 @[250px]/card:text-4xl">
                        {formatCurrency(stats.totalRevenue)}
                    </CardTitle>
                    <CardAction>
                        <Badge
                            variant="outline"
                            className={`${stats.totalRevenueChange >= 0 ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400" : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"}`}
                        >
                            {stats.totalRevenueChange >= 0 ? <IconTrendingUp className="w-4 h-4"/> :
                                <IconTrendingDown className="w-4 h-4"/>}
                            {Math.abs(stats.totalRevenueChange).toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="flex gap-2 font-medium text-blue-700 dark:text-blue-300">
                        {stats.totalRevenueChange >= 0 ? "Trending up today" : "Trending down today"}
                        {stats.totalRevenueChange >= 0 ? (
                            <IconTrendingUp className="size-4"/>
                        ) : (
                            <IconTrendingDown className="size-4"/>
                        )}
                    </div>
                    <div className="text-muted-foreground">
                        Compared to yesterday
                    </div>
                </CardFooter>
            </Card>

            <Card
                className="@container/card bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-card border-green-100 dark:border-green-900">
                <CardHeader>
                    <CardDescription className="text-green-600 dark:text-green-400 font-medium">New
                        Customers</CardDescription>
                    <CardTitle
                        className="text-3xl font-bold tabular-nums text-green-700 dark:text-green-300 @[250px]/card:text-4xl">
                        {stats.newCustomers.toLocaleString()}
                    </CardTitle>
                    <CardAction>
                        <Badge
                            variant="outline"
                            className={`${stats.newCustomersChange >= 0 ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400" : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"}`}
                        >
                            {stats.newCustomersChange >= 0 ? <IconTrendingUp className="w-4 h-4"/> :
                                <IconTrendingDown className="w-4 h-4"/>}
                            {Math.abs(stats.newCustomersChange).toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="flex gap-2 font-medium text-green-700 dark:text-green-300">
                        {stats.newCustomersChange >= 0 ? "Up from yesterday" : "Down from yesterday"}
                        {stats.newCustomersChange >= 0 ? (
                            <IconTrendingUp className="size-4"/>
                        ) : (
                            <IconTrendingDown className="size-4"/>
                        )}
                    </div>
                    <div className="text-muted-foreground">
                        {stats.newCustomersChange < 0 ? "Acquisition needs attention" : "Healthy growth"}
                    </div>
                </CardFooter>
            </Card>

            <Card
                className="@container/card bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-card border-purple-100 dark:border-purple-900">
                <CardHeader>
                    <CardDescription className="text-purple-600 dark:text-purple-400 font-medium">Active
                        Accounts</CardDescription>
                    <CardTitle
                        className="text-3xl font-bold tabular-nums text-purple-700 dark:text-purple-300 @[250px]/card:text-4xl">
                        {stats.activeAccounts.toLocaleString()}
                    </CardTitle>
                    <CardAction>
                        <Badge
                            variant="outline"
                            className={`${stats.activeAccountsChange >= 0 ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400" : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"}`}
                        >
                            {stats.activeAccountsChange >= 0 ? <IconTrendingUp className="w-4 h-4"/> :
                                <IconTrendingDown className="w-4 h-4"/>}
                            {Math.abs(stats.activeAccountsChange).toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="flex gap-2 font-medium text-purple-700 dark:text-purple-300">
                        {stats.activeAccountsChange >= 0 ? "Strong retention" : "Retention declining"}
                        {stats.activeAccountsChange >= 0 ? (
                            <IconTrendingUp className="size-4"/>
                        ) : (
                            <IconTrendingDown className="size-4"/>
                        )}
                    </div>
                    <div className="text-muted-foreground">
                        Last 7 days activity
                    </div>
                </CardFooter>
            </Card>

            <Card
                className="@container/card bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-card border-orange-100 dark:border-orange-900">
                <CardHeader>
                    <CardDescription className="text-orange-600 dark:text-orange-400 font-medium">Growth
                        Rate</CardDescription>
                    <CardTitle
                        className="text-3xl font-bold tabular-nums text-orange-700 dark:text-orange-300 @[250px]/card:text-4xl">
                        {stats.growthRate.toFixed(1)}%
                    </CardTitle>
                    <CardAction>
                        <Badge
                            variant="outline"
                            className={`${stats.growthRate >= 0 ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400" : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"}`}
                        >
                            {stats.growthRate >= 0 ? <IconTrendingUp className="w-4 h-4"/> :
                                <IconTrendingDown className="w-4 h-4"/>}
                            {Math.abs(stats.growthRate).toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="flex gap-2 font-medium text-orange-700 dark:text-orange-300">
                        {stats.growthRate >= 0 ? "Steady growth" : "Needs improvement"}
                        {stats.growthRate >= 0 ? (
                            <IconTrendingUp className="size-4"/>
                        ) : (
                            <IconTrendingDown className="size-4"/>
                        )}
                    </div>
                    <div className="text-muted-foreground">
                        {stats.growthRate >= 0 ? "Meeting projections" : "Review strategy"}
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}