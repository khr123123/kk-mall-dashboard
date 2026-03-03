/**
 * ProductsPage — Product Management
 *
 * Improvements:
 * - Consistent Chinese UI labels
 * - formatCurrency uses locale-aware formatter
 * - Better empty/error states
 * - Accessible table with ARIA labels
 * - Stock badge uses colour + text (not colour-only)
 */

import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { type ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import {
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DataTableGeneric } from "@/components/data-table-generic"
import { PageLayout, PageHeader } from "@/components/layout"
import { formatCurrency } from "@/lib/i18n"
import { fetchProducts, deleteProduct, getFileUrl, fetchProductSkus } from "@/lib/api"
import type { Product, ProductSku } from "@/types"

// ── Stock status helper ───────────────────────────────────────
function stockBadgeClass(stock: number): string {
  if (stock <= 0)  return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400"
  if (stock <= 10) return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400"
  return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400"
}

function stockLabel(stock: number): string {
  if (stock <= 0)  return "缺货"
  if (stock <= 10) return "紧张"
  return "正常"
}

// ── ProductsPage ──────────────────────────────────────────────
export default function ProductsPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [detailSkus, setDetailSkus] = useState<ProductSku[]>([])
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [searchQuery])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const filter = searchQuery ? `name ~ "${searchQuery}"` : ""
      const result = await fetchProducts(1, 100, filter)
      setProducts(result.items)
    } catch (error) {
      console.error("Failed to fetch products:", error)
      toast.error("商品加载失败")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此商品？此操作不可撤销。")) return
    try {
      await deleteProduct(id)
      toast.success("商品已删除")
      loadProducts()
    } catch {
      toast.error("删除失败")
    }
  }

  const handleViewDetail = async (product: Product) => {
    setDetailProduct(product)
    try {
      const skus = await fetchProductSkus(product.id)
      setDetailSkus(skus)
    } catch {
      setDetailSkus([])
    }
    setDetailOpen(true)
  }

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "image",
      header: () => <span className="sr-only">商品图片</span>,
      cell: ({ row }) => {
        const img = row.original.image
        const url = img ? getFileUrl(row.original, img) : null
        return url ? (
          <img
            src={url}
            alt={`${row.original.name} 商品图`}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center"
            aria-label="暂无图片"
          >
            <span className="text-xl" aria-hidden="true">📦</span>
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: "商品名称",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium truncate max-w-[200px]">{row.original.name}</p>
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "price",
      header: () => <div className="text-right">价格</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          <span className="font-medium">{formatCurrency(row.original.price)}</span>
          {row.original.originalPrice && row.original.originalPrice > row.original.price && (
            <span className="text-xs text-muted-foreground line-through ml-2">
              {formatCurrency(row.original.originalPrice)}
            </span>
          )}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "stock",
      header: "库存",
      cell: ({ row }) => {
        const stock = row.original.stock ?? 0
        return (
          <Badge
            variant="outline"
            className={stockBadgeClass(stock)}
            aria-label={`库存 ${stock} 件，状态：${stockLabel(stock)}`}
          >
            {stock} 件 · {stockLabel(stock)}
          </Badge>
        )
      },
      enableSorting: true,
    },
    {
      accessorKey: "rating",
      header: "评分",
      cell: ({ row }) => (
        <span className="tabular-nums" aria-label={`评分 ${(row.original.rating ?? 0).toFixed(1)}`}>
          ⭐ {(row.original.rating ?? 0).toFixed(1)}
        </span>
      ),
      enableSorting: true,
    },
    {
      id: "flags",
      header: "标签",
      cell: ({ row }) => (
        <div className="flex gap-1 flex-wrap">
          {row.original.isNew && (
            <Badge className="bg-blue-500 text-white text-xs" aria-label="新品">新品</Badge>
          )}
          {row.original.isHot && (
            <Badge className="bg-red-500 text-white text-xs" aria-label="热销">热销</Badge>
          )}
          {!row.original.inStock && (
            <Badge variant="destructive" className="text-xs" aria-label="缺货">缺货</Badge>
          )}
        </div>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">操作</span>,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={`商品「${row.original.name}」操作菜单`}
            >
              <IconDotsVertical aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => handleViewDetail(row.original)}>
              <IconEye className="mr-2 h-4 w-4" aria-hidden="true" />
              查看详情
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/products/edit/${row.original.id}`)}>
              <IconEdit className="mr-2 h-4 w-4" aria-hidden="true" />
              编辑商品
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => handleDelete(row.original.id)}
            >
              <IconTrash className="mr-2 h-4 w-4" aria-hidden="true" />
              删除商品
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ]

  const toolbar = (
    <div className="toolbar">
      <div className="toolbar-search">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <Input
          placeholder="搜索商品名称…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          aria-label="搜索商品"
          type="search"
        />
      </div>
      <Button
        onClick={() => navigate("/products/add")}
        className="ml-auto gap-2"
        aria-label="新建商品"
      >
        <IconPlus className="h-4 w-4" aria-hidden="true" />
        新建商品
      </Button>
    </div>
  )

  return (
    <PageLayout>
      <PageHeader
        title="商品管理"
        description="管理您的商品目录、库存与价格"
      />

      <Card>
        <CardContent>
          <DataTableGeneric
            data={products}
            columns={columns}
            enableRowSelection
            enableDragDrop={false}
            enableColumnVisibility
            enablePagination
            enableSorting
            loading={loading}
            loadingRows={5}
            pageSize={10}
            emptyMessage="暂无商品数据"
            toolbar={toolbar}
          />
        </CardContent>
      </Card>

      {/* Product Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="product-detail-desc">
          <DialogHeader>
            <DialogTitle>商品详情</DialogTitle>
            <DialogDescription id="product-detail-desc">
              {detailProduct?.name}
            </DialogDescription>
          </DialogHeader>
          {detailProduct && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "售价",    value: <span className="tabular-nums">{formatCurrency(detailProduct.price)}</span> },
                  { label: "原价",    value: <span className="tabular-nums">{formatCurrency(detailProduct.originalPrice ?? 0)}</span> },
                  { label: "库存",    value: <span className="tabular-nums">{detailProduct.stock ?? 0} 件</span> },
                  { label: "评分",    value: <span className="tabular-nums">⭐ {(detailProduct.rating ?? 0).toFixed(1)}</span> },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>

              {detailSkus.length > 0 && (
                <section aria-label="SKU 规格">
                  <h4 className="font-semibold mb-2">
                    规格 SKU（共 {detailSkus.length} 个）
                  </h4>
                  <ul className="space-y-2">
                    {detailSkus.map((sku) => (
                      <li
                        key={sku.id}
                        className="p-3 border rounded-xl flex items-center justify-between"
                      >
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(sku.specs || {}).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="text-xs">
                              {k}: {v}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="font-medium tabular-nums">{formatCurrency(sku.price)}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">库存：{sku.stock}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
