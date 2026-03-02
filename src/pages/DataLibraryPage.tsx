import { useEffect, useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  IconDatabase,
  IconDownload,
  IconSearch,
} from "@tabler/icons-react"
import {
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  Tag,
  Star,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import pb from "@/lib/pocketbase"
import { COLLECTIONS, getFileUrl } from "@/lib/api"
import type { Product, Order, User, Category, Brand } from "@/types"

// ==================== 通用分页组件 ====================
function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        第 {page} / {totalPages || 1} 页
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ==================== 商品数据浏览 ====================
function ProductsDataTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [search, setSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const perPage = 12

  const load = async () => {
    setLoading(true)
    try {
      const filter = search.trim() ? `name ~ "${search.trim()}"` : ""
      const result = await pb.collection(COLLECTIONS.PRODUCTS).getList<Product>(page, perPage, {
        filter,
        sort: "-created",
        expand: "brand,category_id",
      })
      setProducts(result.items)
      setTotalPages(result.totalPages)
      setTotalItems(result.totalItems)
    } catch {
      toast.error("商品数据加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page])

  const handleSearch = () => {
    setPage(1)
    load()
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(n)

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索商品名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          搜索
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">
          共 {totalItems} 条记录
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mb-3 opacity-40" />
          <p>没有找到商品数据</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className="group hover:shadow-md transition-all cursor-pointer hover:border-primary/30"
                onClick={() => setSelectedProduct(product)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {/* 图片 */}
                    <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                      {product.image ? (
                        <img
                          src={getFileUrl(product, product.image)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-primary font-bold text-sm">
                          {formatCurrency(product.price)}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatCurrency(product.originalPrice)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {product.isHot && <Badge className="text-[10px] px-1.5 py-0 bg-red-500 text-white">热卖</Badge>}
                        {product.isNew && <Badge className="text-[10px] px-1.5 py-0 bg-blue-500 text-white">新品</Badge>}
                        {product.rating && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-orange-400 text-orange-400" />
                            {product.rating.toFixed(1)}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          库存: {product.stock ?? 0}
                        </span>
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* 商品详情弹窗 */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>商品详情</DialogTitle>
            <DialogDescription>ID: {selectedProduct?.id}</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {selectedProduct.image && (
                  <div className="w-full h-48 rounded-lg bg-muted overflow-hidden">
                    <img
                      src={getFileUrl(selectedProduct, selectedProduct.image)}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">名称</span><p className="font-medium">{selectedProduct.name}</p></div>
                  <div><span className="text-muted-foreground">价格</span><p className="font-medium">{formatCurrency(selectedProduct.price)}</p></div>
                  <div><span className="text-muted-foreground">库存</span><p className="font-medium">{selectedProduct.stock ?? 0}</p></div>
                  <div><span className="text-muted-foreground">评分</span><p className="font-medium">{selectedProduct.rating?.toFixed(1) ?? "N/A"}</p></div>
                  <div><span className="text-muted-foreground">品牌</span><p className="font-medium">{(selectedProduct as any)?.expand?.brand?.name ?? "-"}</p></div>
                  <div><span className="text-muted-foreground">分类</span><p className="font-medium">{(selectedProduct as any)?.expand?.category_id?.name ?? "-"}</p></div>
                  <div><span className="text-muted-foreground">创建时间</span><p className="font-medium">{format(new Date(selectedProduct.created), "yyyy-MM-dd HH:mm")}</p></div>
                  <div><span className="text-muted-foreground">更新时间</span><p className="font-medium">{format(new Date(selectedProduct.updated), "yyyy-MM-dd HH:mm")}</p></div>
                </div>
                {selectedProduct.description && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-muted-foreground text-sm">描述</span>
                      <p className="text-sm mt-1">{selectedProduct.description}</p>
                    </div>
                  </>
                )}
                {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedProduct.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== 订单数据浏览 ====================
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
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-indigo-100 text-indigo-800",
  paid: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
}

function OrdersDataTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const perPage = 15

  const load = async () => {
    setLoading(true)
    try {
      const filters: string[] = []
      if (statusFilter !== "all") filters.push(`status = "${statusFilter}"`)
      if (search.trim()) filters.push(`order_number ~ "${search.trim()}"`)
      const result = await pb.collection(COLLECTIONS.ORDERS).getList<Order>(page, perPage, {
        filter: filters.join(" && "),
        sort: "-order_date",
        expand: "user",
      })
      setOrders(result.items)
      setTotalPages(result.totalPages)
      setTotalItems(result.totalItems)
    } catch {
      toast.error("订单数据加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, statusFilter])

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(n)

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索订单号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load() } }}
            className="pl-8"
          />
        </div>
        <span className="text-sm text-muted-foreground ml-auto">共 {totalItems} 条</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mb-3 opacity-40" />
          <p>没有找到订单数据</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">订单号</th>
                    <th className="text-left p-3 font-medium">用户</th>
                    <th className="text-left p-3 font-medium">状态</th>
                    <th className="text-right p-3 font-medium">金额</th>
                    <th className="text-right p-3 font-medium">商品数</th>
                    <th className="text-left p-3 font-medium">支付方式</th>
                    <th className="text-left p-3 font-medium">下单时间</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs">#{order.order_number}</td>
                      <td className="p-3 text-muted-foreground">
                        {(order.expand as any)?.user?.name || (order.expand as any)?.user?.email || "-"}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || ""}`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(order.total_amount || 0)}</td>
                      <td className="p-3 text-right">{order.items_count}</td>
                      <td className="p-3 capitalize text-muted-foreground">{order.payment_method || "-"}</td>
                      <td className="p-3 text-muted-foreground">
                        {order.order_date ? format(new Date(order.order_date), "MM-dd HH:mm") : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

// ==================== 用户数据浏览 ====================
function UsersDataTab() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [search, setSearch] = useState("")
  const perPage = 15

  const load = async () => {
    setLoading(true)
    try {
      const filter = search.trim()
        ? `(name ~ "${search.trim()}" || email ~ "${search.trim()}")`
        : ""
      const result = await pb.collection(COLLECTIONS.USERS).getList<User>(page, perPage, {
        filter,
        sort: "-created",
      })
      setUsers(result.items)
      setTotalPages(result.totalPages)
      setTotalItems(result.totalItems)
    } catch {
      toast.error("用户数据加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page])

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户名或邮箱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load() } }}
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => { setPage(1); load() }}>搜索</Button>
        <span className="text-sm text-muted-foreground ml-auto">共 {totalItems} 位用户</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-40" />
          <p>没有找到用户数据</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">用户名</th>
                    <th className="text-left p-3 font-medium">邮箱</th>
                    <th className="text-left p-3 font-medium">角色</th>
                    <th className="text-left p-3 font-medium">状态</th>
                    <th className="text-left p-3 font-medium">注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{user.name || "-"}</td>
                      <td className="p-3 text-muted-foreground">{user.email}</td>
                      <td className="p-3">
                        <Badge variant={user.role === "admin" ? "default" : "outline"} className="text-xs">
                          {user.role || "user"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {user.verified ? (
                          <Badge className="text-xs bg-green-100 text-green-800">已验证</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">未验证</Badge>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {format(new Date(user.created), "yyyy-MM-dd HH:mm")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

// ==================== 分类数据浏览 ====================
function CategoriesDataTab() {
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [cats, brs] = await Promise.all([
        pb.collection(COLLECTIONS.CATEGORY).getFullList<Category>({ sort: "name" }),
        pb.collection(COLLECTIONS.BRANDS).getFullList<Brand>({ sort: "name" }),
      ])
      setCategories(cats)
      setBrands(brs)
    } catch {
      toast.error("分类/品牌数据加载失败")
    } finally {
      setLoading(false)
    }
  }

  // 分离父分类和子分类
  const childIdSet = new Set<string>()
  for (const cat of categories) {
    if (cat.children && cat.children.length > 0) {
      for (const cid of cat.children) childIdSet.add(cid)
    }
  }
  const parentCategories = categories.filter((c) => !childIdSet.has(c.id))
  const childCategories = categories.filter((c) => childIdSet.has(c.id))

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 text-center">
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{categories.length}</p>
          <p className="text-xs text-muted-foreground mt-1">总分类数</p>
        </div>
        <div className="p-4 rounded-lg border bg-purple-50/50 dark:bg-purple-950/20 text-center">
          <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{parentCategories.length}</p>
          <p className="text-xs text-muted-foreground mt-1">父分类</p>
        </div>
        <div className="p-4 rounded-lg border bg-green-50/50 dark:bg-green-950/20 text-center">
          <p className="text-3xl font-bold text-green-700 dark:text-green-300">{childCategories.length}</p>
          <p className="text-xs text-muted-foreground mt-1">子分类</p>
        </div>
        <div className="p-4 rounded-lg border bg-orange-50/50 dark:bg-orange-950/20 text-center">
          <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{brands.length}</p>
          <p className="text-xs text-muted-foreground mt-1">品牌总数</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 分类列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderTree className="h-4 w-4 text-primary" />
              分类数据
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {parentCategories.map((cat) => {
                const children = categories.filter((c) => cat.children?.includes(c.id))
                return (
                  <div key={cat.id} className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-primary" />
                      <span className="font-medium">{cat.name}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {children.length} 子分类
                      </Badge>
                    </div>
                    {children.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {children.map((child) => (
                          <Badge key={child.id} variant="outline" className="text-xs">
                            {child.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* 品牌列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4 text-primary" />
              品牌数据
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{brand.name}</span>
                    {brand.isPopular && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-yellow-500 text-white">热门</Badge>
                    )}
                  </div>
                  {brand.website && (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline truncate max-w-[150px]"
                    >
                      {brand.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ==================== 数据导出辅助 ====================
function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    toast.error("没有数据可导出")
    return
  }
  const keys = Object.keys(data[0]).filter(
    (k) => !["expand", "collectionId", "collectionName"].includes(k)
  )
  const header = keys.join(",")
  const rows = data.map((item) =>
    keys
      .map((k) => {
        const val = item[k]
        if (val === null || val === undefined) return ""
        const str = typeof val === "object" ? JSON.stringify(val) : String(val)
        return `"${str.replace(/"/g, '""')}"`
      })
      .join(",")
  )
  const csv = [header, ...rows].join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success("导出成功")
}

// ==================== 主页面 ====================
export default function DataLibraryPage() {
  const [activeTab, setActiveTab] = useState("products")
  const [exportLoading, setExportLoading] = useState(false)

  const handleExport = async () => {
    setExportLoading(true)
    try {
      let data: any[] = []
      let filename = ""

      switch (activeTab) {
        case "products":
          data = await pb.collection(COLLECTIONS.PRODUCTS).getFullList({ sort: "-created" })
          filename = "products"
          break
        case "orders":
          data = await pb.collection(COLLECTIONS.ORDERS).getFullList({ sort: "-order_date" })
          filename = "orders"
          break
        case "users":
          data = await pb.collection(COLLECTIONS.USERS).getFullList({ sort: "-created" })
          filename = "users"
          break
        case "categories":
          data = await pb.collection(COLLECTIONS.CATEGORY).getFullList({ sort: "name" })
          filename = "categories"
          break
      }
      exportToCSV(data, filename)
    } catch {
      toast.error("导出失败")
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <IconDatabase className="h-6 w-6 text-primary" />
              数据中心
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              浏览、搜索和导出所有业务数据
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportLoading}
            className="gap-1.5"
          >
            <IconDownload className="h-4 w-4" />
            {exportLoading ? "导出中..." : "导出 CSV"}
          </Button>
        </div>

        {/* 数据浏览 Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="products" className="gap-1.5">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">商品</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">订单</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">用户</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5">
              <FolderTree className="h-4 w-4" />
              <span className="hidden sm:inline">分类</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  商品数据
                </CardTitle>
                <CardDescription>浏览所有商品数据，支持搜索和分页</CardDescription>
              </CardHeader>
              <CardContent>
                <ProductsDataTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  订单数据
                </CardTitle>
                <CardDescription>浏览所有订单记录，支持状态筛选和搜索</CardDescription>
              </CardHeader>
              <CardContent>
                <OrdersDataTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  用户数据
                </CardTitle>
                <CardDescription>浏览所有注册用户信息</CardDescription>
              </CardHeader>
              <CardContent>
                <UsersDataTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-primary" />
                  分类与品牌数据
                </CardTitle>
                <CardDescription>查看分类结构和品牌数据汇总</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoriesDataTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
