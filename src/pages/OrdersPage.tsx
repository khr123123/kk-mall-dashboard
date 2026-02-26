import { useEffect, useRef, useState } from "react"
import {
  IconCircleCheckFilled,
  IconClock,
  IconCopy,
  IconCurrencyDollar,
  IconDotsVertical,
  IconEdit,
  IconEye,

  IconRefresh,
  IconTruck,
  IconX,
} from "@tabler/icons-react"
import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { DataTableGeneric, StatusBadge } from "@/components/data-table-generic"
import pb from "@/lib/pocketbase"
import type { Order, OrderStatus } from "@/types"

// Status Configuration with colors
const statusConfig: Record<
  OrderStatus,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    icon: React.ReactNode
    bgClass: string
  }
> = {
  pending: {
    label: "Pending",
    variant: "outline",
    icon: <IconClock className="w-3 h-3" />,
    bgClass: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20",
  },
  paid: {
    label: "Paid",
    variant: "outline",
    icon: <IconCurrencyDollar className="w-3 h-3 text-blue-500" />,
    bgClass: "bg-blue-50 border-blue-200 dark:bg-blue-950/20",
  },
  shipped: {
    label: "Shipped",
    variant: "outline",
    icon: <IconTruck className="w-3 h-3 text-purple-500" />,
    bgClass: "bg-purple-50 border-purple-200 dark:bg-purple-950/20",
  },
  delivered: {
    label: "Delivered",
    variant: "outline",
    icon: <IconCircleCheckFilled className="w-3 h-3 fill-green-500" />,
    bgClass: "bg-green-50 border-green-200 dark:bg-green-950/20",
  },
  cancelled: {
    label: "Cancelled",
    variant: "outline",
    icon: <IconX className="w-3 h-3 text-red-500" />,
    bgClass: "bg-red-50 border-red-200 dark:bg-red-950/20",
  },
  refunded: {
    label: "Refunded",
    variant: "outline",
    icon: <IconCurrencyDollar className="w-3 h-3 text-gray-500" />,
    bgClass: "bg-gray-50 border-gray-200 dark:bg-gray-950/20",
  },
}

const statusOptions: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
]

const OrderStatusBadge = ({ status }: { status: OrderStatus }) => {
  const config = statusConfig[status] || statusConfig.pending
  return <StatusBadge config={config} />
}

// Order Detail Dialog
const OrderDetailDialog = ({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  if (!order) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Order Details
            <OrderStatusBadge status={order.status} />
          </DialogTitle>
          <DialogDescription>Order #{order.order_number}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Order Number</p>
                <p className="font-medium">{order.order_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Order Date</p>
                <p className="font-medium">
                  {order.order_date
                    ? format(new Date(order.order_date), "yyyy-MM-dd HH:mm:ss")
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Payment Method</p>
                <p className="font-medium capitalize">{order.payment_method}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Payment ID</p>
                <p className="font-medium">{order.payment_id || "-"}</p>
              </div>
              {order.tracking_number && (
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Tracking Number</p>
                  <p className="font-medium">{order.tracking_number}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-muted-foreground mb-1">Shipping Address</p>
                <p className="font-medium">{order.address}</p>
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-4">
                Order Items ({order.items_count} items)
              </h3>
              <div className="space-y-4">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                    <img
                      src={item.product?.image}
                      alt={item.product?.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-2 mb-2">{item.product?.name}</h4>
                      {item.skuInfo &&
                        Object.keys(item.skuInfo.specs || {}).length > 0 && (
                          <div className="flex gap-2 mb-2 flex-wrap">
                            {Object.entries(item.skuInfo.specs).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {value}
                              </Badge>
                            ))}
                          </div>
                        )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Qty: {item.quantity}</span>
                        <span className="font-semibold text-lg">
                          ${item.product?.price}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-muted-foreground mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-primary">
                  ${(order.total_amount || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// Update Order Dialog
const UpdateOrderDialog = ({
  order,
  open,
  onOpenChange,
  onSuccess,
}: {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) => {
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || "")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      if (status === "shipped" && !trackingNumber.trim()) {
        toast.error("Tracking number is required for shipped status")
        setLoading(false)
        return
      }
      const updateData: Record<string, any> = { status }
      if (status === "shipped") updateData.tracking_number = trackingNumber.trim()

      await pb.collection("orders").update(order.id, updateData)
      toast.success("Order status updated successfully")
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Failed to update order:", error)
      toast.error("Failed to update order")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>Order: {order.order_number}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Current Status</Label>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">New Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as OrderStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"] as OrderStatus[]
                ).map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusConfig[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {status === "shipped" && (
            <div className="grid gap-2">
              <Label>
                Tracking Number <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main Page
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const filters: string[] = []
      if (statusFilter !== "all") filters.push(`status="${statusFilter}"`)
      if (searchQuery.trim())
        filters.push(`(order_number~"${searchQuery}" || payment_id~"${searchQuery}")`)
      const filterString = filters.join(" && ")

      const result = await pb.collection("orders").getList(1, 100, {
        filter: filterString,
        sort: "-created",
      })
      setOrders(result.items as unknown as Order[])
    } catch (error) {
      console.error("Failed to fetch orders:", error)
      toast.error("Failed to fetch orders")
    } finally {
      setLoading(false)
    }
  }

  const lastParamsRef = useRef<{ status: string; query: string } | null>(null)
  useEffect(() => {
    const currentParams = { status: statusFilter, query: searchQuery }
    if (
      lastParamsRef.current &&
      lastParamsRef.current.status === currentParams.status &&
      lastParamsRef.current.query === currentParams.query
    ) {
      return
    }
    lastParamsRef.current = currentParams
    fetchOrders()
  }, [statusFilter, searchQuery])

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchOrders()
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, statusFilter, searchQuery])

  const handleDelete = async (orderId: string) => {
    if (!confirm("Are you sure?")) return
    try {
      await pb.collection("orders").delete(orderId)
      toast.success("Order deleted")
      fetchOrders()
    } catch {
      toast.error("Failed to delete order")
    }
  }

  const handleDuplicate = async (order: Order) => {
    try {
      const { id, created, updated, ...data } = order
      await pb.collection("orders").create({
        ...data,
        order_number: `${order.order_number}-COPY`,
        status: "pending",
      })
      toast.success("Order duplicated")
      fetchOrders()
    } catch {
      toast.error("Failed to duplicate order")
    }
  }

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: "order_number",
      header: "Order Number",
      cell: ({ row }) => (
        <Button
          variant="link"
          className="text-foreground px-0 cursor-pointer"
          onClick={() => {
            setSelectedOrder(row.original)
            setDetailDialogOpen(true)
          }}
        >
          {row.original.order_number}
        </Button>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "items_count",
      header: "Items",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.items_count}
        </Badge>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "total_amount",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          ${(row.original.total_amount || 0).toLocaleString()}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      enableSorting: true,
    },
    {
      accessorKey: "payment_method",
      header: "Payment",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.payment_method}
        </Badge>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "order_date",
      header: "Date",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.order_date
            ? format(new Date(row.original.order_date), "yyyy-MM-dd HH:mm")
            : "N/A"}
        </div>
      ),
      enableSorting: true,
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
            <DropdownMenuItem
              onClick={() => {
                setSelectedOrder(row.original)
                setDetailDialogOpen(true)
              }}
            >
              <IconEye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedOrder(row.original)
                setUpdateDialogOpen(true)
              }}
            >
              <IconEdit className="mr-2 h-4 w-4" /> Update Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicate(row.original)}>
              <IconCopy className="mr-2 h-4 w-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => handleDelete(row.original.id)}
            >
              <IconX className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ]

  const toolbar = (
    <div className="flex gap-4 flex-1 items-center">
      <Select
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Search order number..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant={autoRefresh ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoRefresh(!autoRefresh)}
          className="gap-1"
        >
          <IconRefresh className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
          {autoRefresh ? "Auto" : "Manual"}
        </Button>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          Refresh
        </Button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1">Manage and track customer orders</p>
      </div>

      <Card>
        <CardContent>
          <DataTableGeneric
            data={orders}
            columns={columns}
            enableRowSelection={true}
            enableDragDrop={false}
            enableColumnVisibility={true}
            enablePagination={true}
            enableSorting={true}
            loading={loading}
            loadingRows={5}
            pageSize={10}
            emptyMessage="No orders found"
            toolbar={toolbar}
          />
        </CardContent>
      </Card>

      {selectedOrder && (
        <>
          <UpdateOrderDialog
            order={selectedOrder}
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
            onSuccess={fetchOrders}
          />
          <OrderDetailDialog
            order={selectedOrder}
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
          />
        </>
      )}
    </div>
  )
}
