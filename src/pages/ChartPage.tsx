"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
} from "recharts";
import pb from "@/lib/pocketbase.ts";
import {
  AlertTriangle,
  Award,
  DollarSign,
  FolderTree,
  Package,
  ShoppingCart,
  Star,
  Tag,
  TrendingUp,
  Users,
} from "lucide-react";

/** ========= 数据类型定义 ========= */

type ID = string;

interface Product {
  id: ID;
  name: string;
  rating?: number;
  favorites?: number;
  stock?: number;
  price?: number;
  salePrice?: number;
  brand: ID; // 与 brands.id 对应
  category_id: ID; // 与 category.id 对应
  isNew?: boolean;
  isHot?: boolean;
  inStock?: boolean;
}

interface Brand {
  id: ID;
  name: string;
}

interface Category {
  id: ID;
  name: string;
  // 你的代码里既有 !cat.parent，也有 cat.parent.length === 0，这里兼容 string 或 string[]
  parent?: string | string[] | null;
}

interface Order {
  id: ID;
  order_date?: string; // ISO 字符串
  total_amount?: number; // 你代码里读取的是 total_amount
}

interface Favorite {
  id: ID;
  // 你代码里对 product_id 使用了 includes，这里兼容 string 或 string[]
  product_id?: string | string[] | null;
}

/** 统计卡片数据 */
interface Stats {
  totalProducts: number;
  totalBrands: number;
  totalCategories: number;
  totalOrders: number;
  totalUsers: number;
  averageRating: number;
  outOfStockCount: number;
  averagePrice: number;
  stockRate: number;
}

/** 图表数据类型 */
interface BrandDistributionItem {
  name: string;
  value: number; // 计数（用于表格与占比）
  products: number; // 计数（用于柱状图 dataKey="products"）
}

interface CategoryDistributionItem {
  name: string;
  value: number;
}

interface SalesTrendItem {
  date: string; // YYYY-MM-DD
  orders: number;
  revenue: number;
}

interface StockStatusItem {
  name: string;
  value: number;
  color: string;
}

interface PriceRangeItem {
  name: string; // 区间标签
  count: number;
}

interface TopProductItem {
  id: ID;
  name: string;
  rating: number;
  favorites: number;
  stock: number;
  price: number;
  score: number;
}

/** ========== 组件开始 ========== */

export default function ChartPage() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalBrands: 0,
    totalCategories: 0,
    totalOrders: 0,
    totalUsers: 0,
    averageRating: 0,
    outOfStockCount: 0,
    averagePrice: 0,
    stockRate: 0,
  });

  const [brandDistribution, setBrandDistribution] = useState<BrandDistributionItem[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryDistributionItem[]>([]);
  const [salesTrend, setSalesTrend] = useState<SalesTrendItem[]>([]);
  const [stockStatus, setStockStatus] = useState<StockStatusItem[]>([]);
  const [priceRangeDistribution, setPriceRangeDistribution] = useState<PriceRangeItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [products, brands, categories, orders, users, favorites] = await Promise.all([
        pb.collection("products").getFullList() as Promise<Product[]>,
        pb.collection("brands").getFullList() as Promise<Brand[]>,
        pb.collection("category").getFullList() as Promise<Category[]>,
        pb.collection("orders").getFullList() as Promise<Order[]>,
        pb.collection("users").getFullList() as Promise<any[]>, // 未使用具体字段，仅取 length
        pb.collection("favorites").getFullList() as Promise<Favorite[]>,
      ]);

      const totalPrice = products.reduce((sum, p) => sum + (p.price || 0), 0);
      const avgPrice = products.length > 0 ? totalPrice / products.length : 0;

      const calculatedStats: Stats = {
        totalProducts: products.length,
        totalBrands: brands.length,
        totalCategories: categories.length,
        totalOrders: orders.length,
        totalUsers: users.length,
        averageRating:
          products.reduce((sum, product) => sum + (product.rating || 0), 0) / products.length || 0,
        outOfStockCount: products.filter((p) => !p.inStock || (p.stock ?? 0) <= 0).length,
        averagePrice: avgPrice,
        stockRate:
          products.length > 0
            ? ((products.length - products.filter((p) => !p.inStock || (p.stock ?? 0) <= 0).length) /
                products.length) *
              100
            : 0,
      };

      const brandData = await calculateBrandDistribution(brands, products);
      const categoryData = await calculateCategoryDistribution(categories, products);
      const salesData = calculateSalesTrend(orders);
      const stockData = calculateStockStatus(products);
      const priceData = calculatePriceRangeDistribution(products);
      const topProductsData = calculateTopProducts(products, favorites);

      setStats(calculatedStats);
      setBrandDistribution(brandData);
      setCategoryDistribution(categoryData);
      setSalesTrend(salesData);
      setStockStatus(stockData);
      setPriceRangeDistribution(priceData);
      setTopProducts(topProductsData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  /** 品牌分布 */
  const calculateBrandDistribution = async (
    brands: Brand[],
    products: Product[]
  ): Promise<BrandDistributionItem[]> => {
    const brandMap = new Map<ID, { name: string; count: number; products: Product[] }>();

    brands.forEach((brand) => {
      const brandProducts = products.filter((p) => p.brand === brand.id);
      brandMap.set(brand.id, {
        name: brand.name,
        count: brandProducts.length,
        products: brandProducts,
      });
    });

    return Array.from(brandMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item) => ({
        name: item.name,
        value: item.count, // 用于表格与占比
        products: item.count, // 用于柱状图 dataKey="products"
      }));
  };

  /** 分类分布（取顶层分类） */
  const calculateCategoryDistribution = async (
    categories: Category[],
    products: Product[]
  ): Promise<CategoryDistributionItem[]> => {
    const topCategories = categories.filter(
      (cat) => !cat.parent || (Array.isArray(cat.parent) ? cat.parent.length === 0 : String(cat.parent).length === 0)
    );

    return topCategories
      .map((category) => {
        const categoryProducts = products.filter((p) => p.category_id === category.id);
        return {
          name: category.name,
          value: categoryProducts.length,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  /** 最近 30 天销售趋势 */
  const calculateSalesTrend = (orders: Order[]): SalesTrendItem[] => {
    const last30Days: SalesTrendItem[] = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split("T")[0],
        orders: 0,
        revenue: 0,
      };
    });

    orders.forEach((order) => {
      if (order.order_date) {
        const orderDate = new Date(order.order_date).toISOString().split("T")[0];
        const dayData = last30Days.find((d) => d.date === orderDate);
        if (dayData) {
          dayData.orders += 1;
          dayData.revenue += order.total_amount || 0;
        }
      }
    });

    return last30Days;
  };

  /** 库存状态 */
  const calculateStockStatus = (products: Product[]): StockStatusItem[] => {
    return [
      { name: "库存充足", value: products.filter((p) => (p.stock ?? 0) > 20).length, color: "#10b981" },
      {
        name: "库存紧张",
        value: products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 20).length,
        color: "#f59e0b",
      },
      { name: "缺货", value: products.filter((p) => (p.stock ?? 0) <= 0).length, color: "#ef4444" },
      { name: "新品", value: products.filter((p) => !!p.isNew).length, color: "#8b5cf6" },
      { name: "热销", value: products.filter((p) => !!p.isHot).length, color: "#ec4899" },
    ];
  };

  /** 价格区间分布 */
  const calculatePriceRangeDistribution = (products: Product[]): PriceRangeItem[] => {
    const ranges = [
      { range: "¥0-¥100", min: 0, max: 100 },
      { range: "¥100-¥500", min: 100, max: 500 },
      { range: "¥500-¥1000", min: 500, max: 1000 },
      { range: "¥1000-¥2000", min: 1000, max: 2000 },
      { range: "¥2000+", min: 2000, max: Infinity },
    ];

    return ranges.map((range) => {
      const count = products.filter((p) => {
        const price = p.salePrice ?? p.price ?? 0;
        return price >= range.min && price < range.max;
      }).length;

      return {
        name: range.range,
        count,
      };
    });
  };

  /** 热门商品 Top 10 */
  const calculateTopProducts = (products: Product[], favorites: Favorite[]): TopProductItem[] => {
    return products
      .map((product) => {
        const productFavorites = favorites.filter((fav) => {
          const pid = fav.product_id;
          if (!pid) return false;
          // 兼容 string 或 string[]
          return Array.isArray(pid) ? pid.includes(product.id) : String(pid).includes(product.id);
        }).length;

        const score =
          (product.rating || 0) * 2 +
          productFavorites * 0.5 +
          (product.isHot ? 10 : 0) +
          (product.isNew ? 5 : 0);

        return {
          id: product.id,
          name: product.name,
          rating: product.rating || 0,
          favorites: productFavorites,
          stock: product.stock || 0,
          price: product.price || 0,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'] as const;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-3/4 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">数据分析中心</h1>
        <p className="text-muted-foreground mt-1">全面了解您的业务数据和趋势</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-card border-blue-100 dark:border-blue-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-blue-600 dark:text-blue-400">商品总数</CardDescription>
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              {stats.totalProducts.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              缺货商品: {stats.outOfStockCount}个
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-card border-green-100 dark:border-green-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-green-600 dark:text-green-400">品牌数量</CardDescription>
              <Tag className="h-5 w-5 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-green-700 dark:text-green-300">
              {stats.totalBrands.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FolderTree className="h-4 w-4" />
              分类数量: {stats.totalCategories}个
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-card border-purple-100 dark:border-purple-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-purple-600 dark:text-purple-400">订单总数</CardDescription>
              <ShoppingCart className="h-5 w-5 text-purple-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-purple-700 dark:text-purple-300">
              {stats.totalOrders.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              用户总数: {stats.totalUsers.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-card border-orange-100 dark:border-orange-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-orange-600 dark:text-orange-400">平均评分</CardDescription>
              <Star className="h-5 w-5 text-orange-600 fill-orange-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-orange-700 dark:text-orange-300">
              {stats.averageRating.toFixed(1)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">基于所有商品评价</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/20 dark:to-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-pink-600 dark:text-pink-400">库存状态</CardDescription>
              <TrendingUp className="h-5 w-5 text-pink-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-pink-700 dark:text-pink-300">
              {stats.stockRate.toFixed(0)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">库存充足率</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/20 dark:to-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-cyan-600 dark:text-cyan-400">商品均价</CardDescription>
              <DollarSign className="h-5 w-5 text-cyan-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-cyan-700 dark:text-cyan-300">
              ¥{Math.round(stats.averagePrice).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">所有商品平均价格</div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="sales">销售分析</TabsTrigger>
          <TabsTrigger value="products">商品分析</TabsTrigger>
          <TabsTrigger value="brands">品牌分析</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 品牌分布柱状图 */}
            <Card className="shadow-lg">
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  <CardTitle>品牌商品分布</CardTitle>
                </div>
                <CardDescription>Top 10 品牌商品数量统计</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={brandDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="products" name="商品数量" fill={COLORS[0]} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 分类分布饼图 */}
            <Card className="shadow-lg">
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-primary" />
                  <CardTitle>分类商品分布</CardTitle>
                </div>
                <CardDescription>各分类商品占比</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 销售趋势图 */}
          <Card className="shadow-lg">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>销售趋势</CardTitle>
              </div>
              <CardDescription>最近30天销售数据</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date: string) => {
                      const d = new Date(date);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    stroke={COLORS[0]}
                    fillOpacity={1}
                    fill="url(#colorOrders)"
                    name="订单数"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS[1]}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="销售额"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle>商品价格分布</CardTitle>
              </div>
              <CardDescription>不同价格区间商品数量</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={priceRangeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" name="商品数量" fill={COLORS[2]} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 库存状态 */}
            <Card className="shadow-lg">
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <CardTitle>库存状态分析</CardTitle>
                </div>
                <CardDescription>商品库存分布情况</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stockStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      dataKey="value"
                    >
                      {stockStatus.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 热门商品 */}
            <Card className="shadow-lg">
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <CardTitle>热门商品排行</CardTitle>
                </div>
                <CardDescription>基于评分、收藏等综合评分 Top 10</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {topProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:shadow-md transition-shadow bg-gradient-to-r from-background to-accent/5"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Badge className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-base font-bold">
                          {index + 1}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{product.name}</div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-orange-400 text-orange-400" />
                              {product.rating.toFixed(1)}
                            </span>
                            <span>❤️ {product.favorites}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="font-bold text-primary">
                          ¥{product.price.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">库存: {product.stock}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="brands" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <CardTitle>品牌详细分析</CardTitle>
              </div>
              <CardDescription>各品牌商品统计与比较</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left p-4 font-semibold">品牌</th>
                        <th className="text-left p-4 font-semibold">商品数量</th>
                        <th className="text-left p-4 font-semibold">占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brandDistribution.map((brand, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{index + 1}</Badge>
                              <span className="font-medium">{brand.name}</span>
                            </div>
                          </td>
                          <td className="p-4">{brand.value}</td>
                          <td className="p-4">
                            <Badge variant="secondary">
                              {((brand.value / stats.totalProducts) * 100).toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
``