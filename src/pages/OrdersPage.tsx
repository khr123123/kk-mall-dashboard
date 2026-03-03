/**
 * OrdersPage — Order Management
 *
 * Improvements:
 * - Consistent use of i18n formatters (formatCurrency, formatShortDate)
 * - StatusBadge uses semantic colour + icon (never colour-only)
 * - Accessible table: column headers properly associated
 * - ARIA live regions for loading/error states
 * - Keyboard-friendly action menus
 */

import { useEffect, useRef, useState } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import {
  IconCircleCheckFilled,
  IconClock,
  IconCurrencyDollar,
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconRefresh,
  IconTruck,
  IconX,
  IconBarcode,
} from "@tabler/icons-react"
import { XCircle, Search, BarChart3 as IconBarChart } from "lucide-react"

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
import { PageLayout, PageHeader } from "@/components/layout"
import { formatCurrency, formatDateTime, formatShortDate } from "@/lib/i18n"
import { updateOrderStatus } from "@/lib/api"
import pb from "@/lib/pocketbase"
import type { Order, OrderStatus } from "@/types"

// ── Status display config ─────────────────────────────────────
const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    icon: React.ReactNode
    bgClass: string
    color: string
  }
> = {
  pending: {
    label: "待付款",
    variant: "outline",
    icon: <IconClock className="w-3 h-3" aria-hidden="true" />,
    bgClass: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20",
    color: "text-yellow-700 dark:text-yellow-400",
  },
  processing: {
    label: "处理中",
    variant: "outline",
    icon: <IconBarChart className="w-3 h-3" aria-hidden="true" />,
    bgClass: "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20",
    color: "text-indigo-700 dark:text-indigo-400",
  },
  paid: {
    label: "已付款",
    variant: "outline",
    icon: <IconCurrencyDollar className="w-3 h-3" aria-hidden="true" />,
    bgClass: "bg-blue-50 border-blue-200 dark:bg-blue-950/20",
    color: "text-blue-700 dark:text-blue-400",
  },
  shipped: {
    label: "已发货",
    variant: "outline",
    icon: <IconTruck className="w-3 h-3" aria-hidden="true" />,
    bgClass: "bg-purple-50 border-purple-200 dark:bg-purple-950/20",
    color: "text-purple-700 dark:text-purple-400",
  },
  delivered: {
    label: "已收货",
    variant: "outline",
    icon: <IconCircleCheckFilled className="w-3 h-3" aria-hidden="true" />,
    bgClass: "bg-green-50 border-green-200 dark:bg-green-950/20",
    color: "text-green-700 dark:text-green-400",
  },
  cancelled: {
    label: "已取消",
    variant: "outline",
    icon: <IconX className="w-3 h-3" aria-hidden="true" />,
    bgClass: "bg-red-50 border-red-200 dark:bg-red-950/20",
    color: "text-red-700 dark:text-red-400",
  },
  refunded: {
    label: "已退款",
    variant: "outline",
    icon: <XCircle className="w-3 h-3" aria-hidden="true" />,
    bgClass: "bg-gray-50 border-gray-200 dark:bg-gray-950/20",
    color: "text-gray-700 dark:text-gray-400",
  },
}

const STATUS_OPTIONS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all",        label: "全部状态" },
  { value: "pending",    label: "待付款" },
  { value: "processing", label: "处理中" },
  { value: "paid",       label: "已付款" },
  { value: "shipped",    label: "已发货" },
  { value: "delivered",  label: "已收货" },
  { value: "cancelled",  label: "已取消" },
  { value: "refunded",   label: "已退款" },
]

// ── OrderStatusBadge ──────────────────────────────────────────
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return <StatusBadge config={cfg} />
}

// ── OrderDetailDialog ─────────────────────────────────────────
function OrderDetailDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]" aria-describedby="order-detail-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            订单详情
            <OrderStatusBadge status={order.status} />
          </DialogTitle>
          <DialogDescription id="order-detail-desc">
            订单编号：{order.order_number}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5">
            {/* Basic info */}
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "订单编号",    value: <span className="font-medium font-mono">{order.order_number}</span> },
                { label: "下单时间",    value: formatDateTime(order.order_date) },
                { label: "支付方式",    value: order.payment_method || "—" },
                { label: "支付单号",    value: <span className="font-mono text-xs">{order.payment_id || "—"}</span> },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-muted-foreground mb-1">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
              {order.tracking_number && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground mb-1 flex items-center gap-1">
                    <IconBarcode className="h-4 w-4" aria-hidden="true" />
                    快递单号
                  </dt>
                  <dd className="font-medium font-mono">{order.tracking_number}</dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-muted-foreground mb-1">收货地址</dt>
                <dd className="font-medium">{order.address || "—"}</dd>
              </div>
              {order.notes && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground mb-1">备注</dt>
                  <dd className="font-medium">{order.notes}</dd>
                </div>
              )}
            </dl>

            <Separator aria-hidden="true" />

            {/* Order items */}
            <section aria-label="订单商品">
              <h3 className="font-semibold mb-3">
                订单商品（共 {order.items_count} 件）
              </h3>
              {order.items && order.items.length > 0 ? (
                <ul className="space-y-3">
                  {order.items.map((item, idx) => (
                    <li
                      key={item.id || idx}
                      className="flex gap-4 p-3 border rounded-xl"
                    >
                      <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0" aria-hidden="true">
                        {item.expand?.product?.image ? (
                          <img
                            src={String(item.expand.product.image)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-muted-foreground text-2xl">📦</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">
                          {item.expand?.product?.name ?? "商品"}
                        </h4>
                        {item.specs && Object.keys(item.specs).length > 0 && (
                          <div className="flex gap-1.5 mt-1.5 flex-wrap" aria-label="商品规格">
                            {Object.entries(item.specs).map(([k, v]) => (
                              <Badge key={k} variant="outline" className="text-xs">
                                {k}: {v}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <span className="text-muted-foreground">×{item.quantity}</span>
                          <span className="font-semibold tabular-nums">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">暂无商品明细</p>
              )}
            </section>

            <Separator aria-hidden="true" />

            {/* Total */}
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-muted-foreground mb-1 text-sm">订单总额</p>
                <p className="text-2xl font-bold text-primary tabular-nums">
                  {formatCurrency(order.total_amount || 0)}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ── UpdateOrderDialog ─────────────────────────────────────────
function UpdateOrderDialog({
  order,
  open,
  onOpenChange,
  onSuccess,
}: {
  order: Order
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || "")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setStatus(order.status)
    setTrackingNumber(order.tracking_number || "")
  }, [order])

  const handleSubmit = async () => {
    if (status === "shipped" && !trackingNumber.trim()) {
      toast.error("发货状态需填写快递单号")
      return
    }
    setLoading(true)
    try {
      await updateOrderStatus(
        order.id,
        status,
        status === "shipped" ? trackingNumber.trim() : undefined
      )
      toast.success(`订单状态已更新为「${STATUS_CONFIG[status].label}」`)
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error("Failed to update order:", err)
      toast.error(err?.message || "更新失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  const isUnchanged = status === order.status

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]" aria-describedby="update-order-desc">
        <DialogHeader>
          <DialogTitle>更新订单状态</DialogTitle>
          <DialogDescription id="update-order-desc">
            订单：{order.order_number}
            <span className="ml-2 text-xs">（状态变更时将自动发送消息通知）</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label>当前状态</Label>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="new-order-status">
              新状态 <span className="text-destructive" aria-label="必填">*</span>
            </Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as OrderStatus)}
            >
              <SelectTrigger id="new-order-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["pending","processing","paid","shipped","delivered","cancelled","refunded"] as OrderStatus[]).map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {status === "shipped" && (
            <div className="grid gap-1.5">
              <Label htmlFor="tracking-number">
                快递单号 <span className="text-destructive" aria-label="必填">*</span>
              </Label>
              <Input
                id="tracking-number"
                placeholder="输入快递单号…"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}

          {!isUnchanged && (
            <p className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg" role="note">
              状态变更将自动向用户发送消息通知
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || isUnchanged}
            aria-busy={loading}
          >
            {loading ? "更新中…" : "确认更新"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── OrdersPage ────────────────────────────────────────────────
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchOrdersData = async () => {
    setLoading(true)
    try {
      const filters: string[] = []
      if (statusFilter !== "all") filters.push(`status = "${statusFilter}"`)
      if (searchQuery.trim()) {
        filters.push(`(order_number ~ "${searchQuery}" || payment_id ~ "${searchQuery}")`)
      }
      const result = await pb.collection("orders").getList(1, 100, {
        filter: filters.join(" && "),
        sort: "-created",
        expand: "user",
      })
      setOrders(result.items as unknown as Order[])
    } catch (err) {
      console.error("Failed to fetch orders:", err)
      toast.error("订单加载失败")
    } finally {
      setLoading(false)
    }
  }

  const lastParamsRef = useRef<string>("")
  useEffect(() => {
    const key = `${statusFilter}::${searchQuery}`
    if (lastParamsRef.current === key) return
    lastParamsRef.current = key
    fetchOrdersData()
  }, [statusFilter, searchQuery])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchOrdersData, 30_000)
    return () => clearInterval(interval)
  }, [autoRefresh, statusFilter, searchQuery])

  const handleDelete = async (orderId: string) => {
    if (!confirm("确定删除此订单？此操作不可撤销")) return
    try {
      await pb.collection("orders").delete(orderId)
      toast.success("订单已删除")
      fetchOrdersData()
    } catch {
      toast.error("删除失败")
    }
  }

  // ── Table columns ─────────────────────────────────────────
  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: "order_number",
      header: "订单编号",
      cell: ({ row }) => (
        <button
          className="font-mono text-sm font-medium hover:text-primary hover:underline cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          onClick={() => { setSelectedOrder(row.original); setDetailDialogOpen(true) }}
          aria-label={`查看订单 #${row.original.order_number} 详情`}
        >
          #{row.original.order_number}
        </button>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "items_count",
      header: "商品数",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-muted-foreground tabular-nums">
          {row.original.items_count} 件
        </Badge>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "total_amount",
      header: () => <div className="text-right">总金额</div>,
      cell: ({ row }) => (
        <div className="text-right font-semibold tabular-nums">
          {formatCurrency(row.original.total_amount || 0)}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      enableSorting: true,
    },
    {
      accessorKey: "payment_method",
      header: "支付方式",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize text-xs">
          {row.original.payment_method || "—"}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "order_date",
      header: "下单时间",
      cell: ({ row }) => (
        <time
          className="text-sm text-muted-foreground tabular-nums"
          dateTime={row.original.order_date}
        >
          {formatShortDate(row.original.order_date)}
        </time>
      ),
      enableSorting: true,
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
              aria-label={`订单 #${row.original.order_number} 操作菜单`}
            >
              <IconDotsVertical aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={() => { setSelectedOrder(row.original); setDetailDialogOpen(true) }}
            >
              <IconEye className="mr-2 h-4 w-4" aria-hidden="true" />
              查看详情
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { setSelectedOrder(row.original); setUpdateDialogOpen(true) }}
            >
              <IconEdit className="mr-2 h-4 w-4" aria-hidden="true" />
              更新状态
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => handleDelete(row.original.id)}
            >
              <IconX className="mr-2 h-4 w-4" aria-hidden="true" />
              删除订单
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ]

  // Status counts for filter badges
  const statusCounts = orders.reduce(
    (acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc },
    {} as Record<string, number>
  )

  const toolbar = (
    <div className="toolbar">
      <Select
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}
      >
        <SelectTrigger className="w-36" aria-label="按状态筛选订单">
          <SelectValue placeholder="全部状态" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
              {opt.value !== "all" && statusCounts[opt.value] !== undefined && (
                <span className="ml-2 text-muted-foreground tabular-nums">
                  ({statusCounts[opt.value]})
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="toolbar-search">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <Input
          placeholder="搜索订单号…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
          aria-label="搜索订单"
          type="search"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant={autoRefresh ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoRefresh(!autoRefresh)}
          className="gap-1.5"
          aria-pressed={autoRefresh}
          aria-label={autoRefresh ? "关闭自动刷新" : "开启自动刷新（每 30 秒）"}
        >
          <IconRefresh
            className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {autoRefresh ? "自动刷新中" : "自动刷新"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOrdersData}
          aria-label="手动刷新订单列表"
        >
          刷新
        </Button>
      </div>
    </div>
  )

  return (
    <PageLayout>
      <PageHeader
        title="订单管理"
        description="管理所有订单，状态变更时自动发送消息通知"
      />

      {/* Quick status counters */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        role="group"
        aria-label="订单状态快速统计"
      >
        {(["pending","paid","shipped","delivered"] as OrderStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s]
          const count = statusCounts[s] || 0
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all ${cfg.bgClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left`}
              aria-label={`筛选${cfg.label}订单，共 ${count} 笔`}
              aria-pressed={statusFilter === s}
            >
              <div className={`flex items-center gap-2 ${cfg.color}`}>
                {cfg.icon}
                <span className="text-xs font-medium">{cfg.label}</span>
              </div>
              <p className={`text-2xl font-bold mt-1 tabular-nums ${cfg.color}`} aria-hidden="true">
                {count}
              </p>
            </button>
          )
        })}
      </div>

      <Card>
        <CardContent>
          <DataTableGeneric
            data={orders}
            columns={columns}
            enableRowSelection
            enableDragDrop={false}
            enableColumnVisibility
            enablePagination
            enableSorting
            loading={loading}
            loadingRows={5}
            pageSize={10}
            emptyMessage="暂无订单数据"
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
            onSuccess={fetchOrdersData}
          />
          <OrderDetailDialog
            order={selectedOrder}
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
          />
        </>
      )}
    </PageLayout>
  )
}
