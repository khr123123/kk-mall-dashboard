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
import { Package, Search } from "lucide-react"

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
import { fetchProducts, deleteProduct, getFileUrl, fetchProductSkus } from "@/lib/api"
import type { Product, ProductSku } from "@/types"

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)

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
      toast.error("Failed to load products")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return
    try {
      await deleteProduct(id)
      toast.success("Product deleted")
      loadProducts()
    } catch (error) {
      toast.error("Failed to delete product")
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
      header: "Image",
      cell: ({ row }) => {
        const img = row.original.image
        const url = img ? getFileUrl(row.original, img) : null
        return url ? (
          <img src={url} alt={row.original.name} className="w-12 h-12 rounded object-cover" />
        ) : (
          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium truncate max-w-[200px]">{row.original.name}</p>
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "price",
      header: () => <div className="text-right">Price</div>,
      cell: ({ row }) => (
        <div className="text-right">
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
      header: "Stock",
      cell: ({ row }) => {
        const stock = row.original.stock ?? 0
        return (
          <Badge
            variant="outline"
            className={
              stock <= 0
                ? "bg-red-100 text-red-800"
                : stock <= 10
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
            }
          >
            {stock}
          </Badge>
        )
      },
      enableSorting: true,
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => <span>{(row.original.rating ?? 0).toFixed(1)}</span>,
      enableSorting: true,
    },
    {
      id: "flags",
      header: "Flags",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.isNew && <Badge className="bg-blue-500 text-white text-xs">New</Badge>}
          {row.original.isHot && <Badge className="bg-red-500 text-white text-xs">Hot</Badge>}
          {!row.original.inStock && <Badge variant="destructive" className="text-xs">OOS</Badge>}
        </div>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <IconDotsVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => handleViewDetail(row.original)}>
              <IconEye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/products/edit/${row.original.id}`)}>
              <IconEdit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(row.original.id)}>
              <IconTrash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ]

  const toolbar = (
    <div className="flex gap-4 items-center flex-1">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <Button onClick={() => navigate("/products/add")} className="ml-auto gap-2">
        <IconPlus className="h-4 w-4" />
        Add Product
      </Button>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-1">Manage your product catalog</p>
      </div>

      <Card>
        <CardContent>
          <DataTableGeneric
            data={products}
            columns={columns}
            enableRowSelection={true}
            enableDragDrop={false}
            enableColumnVisibility={true}
            enablePagination={true}
            enableSorting={true}
            loading={loading}
            loadingRows={5}
            pageSize={10}
            emptyMessage="No products found"
            toolbar={toolbar}
          />
        </CardContent>
      </Card>

      {/* Product Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>{detailProduct?.name}</DialogDescription>
          </DialogHeader>
          {detailProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-medium">{formatCurrency(detailProduct.price)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Original Price</p>
                  <p className="font-medium">{formatCurrency(detailProduct.originalPrice ?? 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stock</p>
                  <p className="font-medium">{detailProduct.stock ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rating</p>
                  <p className="font-medium">{(detailProduct.rating ?? 0).toFixed(1)}</p>
                </div>
              </div>

              {detailSkus.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">SKU Variants ({detailSkus.length})</h4>
                  <div className="space-y-2">
                    {detailSkus.map((sku) => (
                      <div key={sku.id} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          {Object.entries(sku.specs || {}).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="mr-1 text-xs">
                              {k}: {v}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(sku.price)}</p>
                          <p className="text-xs text-muted-foreground">Stock: {sku.stock}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
