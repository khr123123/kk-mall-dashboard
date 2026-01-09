// about.jsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    BarChart,
    PieChart,
    LineChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Bar,
    Pie,
    Cell,
    Line
} from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"

export default function ChartPage() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalBrands: 0,
        totalCategories: 0,
        totalOrders: 0,
        totalUsers: 0,
        averageRating: 0,
        outOfStockCount: 0
    })

    const [brandDistribution, setBrandDistribution] = useState([])
    const [categoryDistribution, setCategoryDistribution] = useState([])
    const [salesTrend, setSalesTrend] = useState([])
    const [stockStatus, setStockStatus] = useState([])
    const [priceRangeDistribution, setPriceRangeDistribution] = useState([])
    const [topProducts, setTopProducts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)

            // 并行获取所有数据
            const [
                products,
                brands,
                categories,
                orders,
                users,
                flashSales,
                favorites
            ] = await Promise.all([
                pb.collection('products').getFullList(),
                pb.collection('brands').getFullList(),
                pb.collection('category').getFullList(),
                pb.collection('orders').getFullList(),
                pb.collection('users').getFullList(),
                pb.collection('flash_sales').getFullList(),
                pb.collection('favorites').getFullList()
            ])

            // 计算基本统计数据
            const calculatedStats = {
                totalProducts: products.length,
                totalBrands: brands.length,
                totalCategories: categories.length,
                totalOrders: orders.length,
                totalUsers: users.length,
                averageRating: products.reduce((sum, product) => sum + (product.rating || 0), 0) / products.length || 0,
                outOfStockCount: products.filter(p => !p.inStock || p.stock <= 0).length
            }

            // 品牌分布数据
            const brandData = await calculateBrandDistribution(brands, products)

            // 分类分布数据
            const categoryData = await calculateCategoryDistribution(categories, products)

            // 销售趋势数据
            const salesData = calculateSalesTrend(orders)

            // 库存状态数据
            const stockData = calculateStockStatus(products)

            // 价格分布数据
            const priceData = calculatePriceRangeDistribution(products)

            // 热门商品数据
            const topProductsData = calculateTopProducts(products, favorites)

            setStats(calculatedStats)
            setBrandDistribution(brandData)
            setCategoryDistribution(categoryData)
            setSalesTrend(salesData)
            setStockStatus(stockData)
            setPriceRangeDistribution(priceData)
            setTopProducts(topProductsData)

        } catch (error) {
            console.error("Error fetching dashboard data:", error)
        } finally {
            setLoading(false)
        }
    }

    const calculateBrandDistribution = async (brands, products) => {
        // 统计每个品牌的商品数量
        const brandMap = new Map()

        brands.forEach(brand => {
            const brandProducts = products.filter(p => p.brand === brand.id)
            brandMap.set(brand.id, {
                name: brand.name,
                count: brandProducts.length,
                products: brandProducts
            })
        })

        // 转换为图表数据格式
        return Array.from(brandMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 8) // 只显示前8个品牌
            .map(item => ({
                name: item.name,
                value: item.count,
                logo: brands.find(b => b.name === item.name)?.logo
            }))
    }

    const calculateCategoryDistribution = async (categories, products) => {
        // 这里需要递归处理分类层级，简化版本只统计一级分类
        const topCategories = categories.filter(cat => !cat.parent || cat.parent.length === 0)

        return topCategories.map(category => {
            // 统计该分类下的商品数量（包括子分类）
            const categoryProducts = products.filter(p => {
                // 这里需要根据实际的数据结构来匹配
                // 简化处理：假设每个商品有category_id字段
                return p.category_id === category.id
            })

            return {
                name: category.name,
                value: categoryProducts.length,
                icon: category.icon
            }
        }).sort((a, b) => b.value - a.value)
    }

    const calculateSalesTrend = (orders) => {
        // 统计最近30天的销售趋势
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - (29 - i))
            return {
                date: date.toISOString().split('T')[0],
                orders: 0,
                revenue: 0
            }
        })

        orders.forEach(order => {
            if (order.order_date) {
                const orderDate = new Date(order.order_date).toISOString().split('T')[0]
                const dayData = last30Days.find(d => d.date === orderDate)
                if (dayData) {
                    dayData.orders += 1
                    dayData.revenue += order.total_amount || 0
                }
            }
        })

        return last30Days
    }

    const calculateStockStatus = (products) => {
        const statusCount = {
            "库存充足": products.filter(p => p.stock > 20).length,
            "库存紧张": products.filter(p => p.stock > 0 && p.stock <= 20).length,
            "缺货": products.filter(p => p.stock <= 0).length,
            "新品": products.filter(p => p.isNew).length,
            "热销": products.filter(p => p.isHot).length
        }

        return Object.entries(statusCount).map(([name, value]) => ({ name, value }))
    }

    const calculatePriceRangeDistribution = (products) => {
        const ranges = [
            { range: "¥0-¥100", min: 0, max: 100 },
            { range: "¥100-¥500", min: 100, max: 500 },
            { range: "¥500-¥1000", min: 500, max: 1000 },
            { range: "¥1000-¥2000", min: 1000, max: 2000 },
            { range: "¥2000+", min: 2000, max: Infinity }
        ]

        return ranges.map(range => {
            const count = products.filter(p => {
                const price = p.salePrice || p.price || 0
                return price >= range.min && price < range.max
            }).length

            return {
                name: range.range,
                count
            }
        })
    }

    const calculateTopProducts = (products, favorites) => {
        // 综合评分、收藏数、库存等因素计算热门商品
        return products
            .map(product => {
                const productFavorites = favorites.filter(fav =>
                    fav.product_id && fav.product_id.includes(product.id)
                ).length

                const score = (
                    (product.rating || 0) * 2 + // 评分权重
                    productFavorites * 0.5 +     // 收藏数权重
                    (product.isHot ? 10 : 0) +   // 热销标签权重
                    (product.isNew ? 5 : 0)      // 新品标签权重
                )

                return {
                    id: product.id,
                    name: product.name,
                    rating: product.rating || 0,
                    favorites: productFavorites,
                    stock: product.stock || 0,
                    price: product.price || 0,
                    score
                }
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
    }

    // 图表配置
    const brandChartConfig = {
        brands: {
            label: "商品数量",
            color: "hsl(var(--primary))",
        }
    } satisfies ChartConfig

    const categoryChartConfig = {
        categories: {
            label: "分类商品数",
            color: "hsl(var(--chart-2))",
        }
    } satisfies ChartConfig

    const salesChartConfig = {
        orders: {
            label: "订单数",
            color: "hsl(var(--chart-1))",
        },
        revenue: {
            label: "销售额",
            color: "hsl(var(--chart-3))",
        }
    } satisfies ChartConfig

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

    if (loading) {
        return (
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[...Array(7)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4 mt-2"></div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="h-80">
                            <CardHeader>
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="p-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>商品总数</CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.totalProducts.toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            缺货商品: {stats.outOfStockCount}个
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>品牌数量</CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.totalBrands.toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            分类数量: {stats.totalCategories}个
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>订单总数</CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.totalOrders.toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            用户总数: {stats.totalUsers.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>平均评分</CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            基于所有商品评价
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>闪购活动</CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {(() => {
                                const activeFlashSales = stats.totalProducts // 这里需要实际获取闪购数量
                                return activeFlashSales.toLocaleString()
                            })()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            进行中的促销活动
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>库存状态</CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {((stats.totalProducts - stats.outOfStockCount) / stats.totalProducts * 100).toFixed(0)}%
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            库存充足率
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>商品均价</CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            ¥{(() => {
                            const avgPrice = stats.totalProducts > 0 ?
                                (() => {
                                    // 这里需要实际计算平均价格
                                    const totalPrice = 0 // 需要从数据计算
                                    return Math.round(totalPrice / stats.totalProducts)
                                })() : 0
                            return avgPrice.toLocaleString()
                        })()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            所有商品平均价格
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 图表区域 */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">概览</TabsTrigger>
                    <TabsTrigger value="sales">销售分析</TabsTrigger>
                    <TabsTrigger value="products">商品分析</TabsTrigger>
                    <TabsTrigger value="brands">品牌分析</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 品牌分布柱状图 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>品牌商品分布</CardTitle>
                                <CardDescription>各品牌商品数量统计</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={brandChartConfig} className="h-80">
                                    <BarChart data={brandDistribution}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="name"
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar
                                            dataKey="value"
                                            name="商品数量"
                                            fill="var(--color-brands)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        {/* 分类分布饼图 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>分类商品分布</CardTitle>
                                <CardDescription>各分类商品占比</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80 flex items-center justify-center">
                                    <PieChart width={400} height={300}>
                                        <Pie
                                            data={categoryDistribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {categoryDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 销售趋势图 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>销售趋势</CardTitle>
                            <CardDescription>最近30天销售数据</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={salesChartConfig} className="h-80">
                                <LineChart data={salesTrend}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(date) => {
                                            const d = new Date(date)
                                            return `${d.getMonth()+1}/${d.getDate()}`
                                        }}
                                    />
                                    <YAxis yAxisId="left" />
                                    <YAxis yAxisId="right" orientation="right" />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="orders"
                                        stroke="var(--color-orders)"
                                        name="订单数"
                                        strokeWidth={2}
                                    />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="var(--color-revenue)"
                                        name="销售额"
                                        strokeWidth={2}
                                    />
                                </LineChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sales" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 订单状态分布 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>订单状态分布</CardTitle>
                                <CardDescription>不同状态订单数量</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <BarChart
                                        width={500}
                                        height={300}
                                        data={[]} // 需要从orders数据计算状态分布
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="status" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="count" fill="#82ca9d" />
                                    </BarChart>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 价格分布 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>商品价格分布</CardTitle>
                                <CardDescription>不同价格区间商品数量</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={brandChartConfig} className="h-80">
                                    <BarChart data={priceRangeDistribution}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar
                                            dataKey="count"
                                            fill="var(--color-brands)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="products" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 库存状态 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>库存状态分析</CardTitle>
                                <CardDescription>商品库存分布情况</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <PieChart width={400} height={300}>
                                        <Pie
                                            data={stockStatus}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {stockStatus.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 热门商品 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>热门商品排行</CardTitle>
                                <CardDescription>基于评分、收藏等综合评分</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {topProducts.map((product, index) => (
                                        <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{product.name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        评分: {product.rating} | 收藏: {product.favorites}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-medium">¥{product.price}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    库存: {product.stock}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="brands" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>品牌详细分析</CardTitle>
                            <CardDescription>各品牌商品统计与比较</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-3">品牌</th>
                                        <th className="text-left p-3">商品数量</th>
                                        <th className="text-left p-3">平均价格</th>
                                        <th className="text-left p-3">平均评分</th>
                                        <th className="text-left p-3">缺货商品</th>
                                        <th className="text-left p-3">新品数量</th>
                                        <th className="text-left p-3">热销商品</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {/* 这里可以添加品牌详细数据 */}
                                    {brandDistribution.map((brand, index) => (
                                        <tr key={index} className="border-b hover:bg-muted/50">
                                            <td className="p-3">{brand.name}</td>
                                            <td className="p-3">{brand.value}</td>
                                            <td className="p-3">¥--</td>
                                            <td className="p-3">--</td>
                                            <td className="p-3">--</td>
                                            <td className="p-3">--</td>
                                            <td className="p-3">--</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}