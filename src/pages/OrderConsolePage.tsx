// pages/OrderConsolePage.tsx
import {useEffect, useState} from "react"
import {IconEdit, IconEye, IconPackage} from "@tabler/icons-react"
import {Button} from "@/components/ui/button"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table"
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select"
import {Input} from "@/components/ui/input"
import {Skeleton} from "@/components/ui/skeleton"
import {toast} from "sonner"
import {format} from "date-fns"
import pb from "@/lib/pocketbase"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {ScrollArea} from "@/components/ui/scroll-area"
import {Separator} from "@/components/ui/separator"
import {Badge} from "@/components/ui/badge"
// components/order-status-badge.tsx
import {Label} from "@/components/ui/label.tsx";

const OrderConsolePage = () => {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [perPage] = useState(10)

    // 筛选条件
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")
    const [searchQuery, setSearchQuery] = useState("")

    // 对话框状态
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
    const [detailDialogOpen, setDetailDialogOpen] = useState(false)

    // 获取订单列表
    const fetchOrders = async () => {
        setLoading(true)
        try {
            // 构建过滤条件
            const filters: string[] = []
            if (statusFilter !== "all") {
                filters.push(`status="${statusFilter}"`)
            }
            if (searchQuery.trim()) {
                filters.push(`(order_number~"${searchQuery}" || payment_id~"${searchQuery}")`)
            }

            const filterString = filters.length > 0 ? filters.join(" && ") : ""

            const result: OrderListResponse = await pb.collection("orders").getList(page, perPage, {
                filter: filterString,
                sort: "-created",
            })

            setOrders(result.items)
            setTotalPages(result.totalPages)
            setTotalItems(result.totalItems)
        } catch (error) {
            console.error("获取订单失败:", error)
            toast.error("获取订单失败")
        } finally {
            setLoading(false)
        }
    }

    // 页面加载和筛选条件变化时获取数据
    useEffect(() => {
        fetchOrders()
    }, [page, statusFilter, searchQuery])

    // 打开更新对话框
    const handleOpenUpdateDialog = (order: Order) => {
        setSelectedOrder(order)
        setUpdateDialogOpen(true)
    }

    // 打开详情对话框
    const handleOpenDetailDialog = (order: Order) => {
        setSelectedOrder(order)
        setDetailDialogOpen(true)
    }

    // 更新成功回调
    const handleUpdateSuccess = () => {
        fetchOrders()
    }

    return (
        <div className="p-6 space-y-6">
            {/* 页面标题和统计 */}
            <div>
                <h1 className="text-3xl font-bold mb-2">订单管理</h1>
                <p className="text-muted-foreground">
                    共 {totalItems} 个订单
                </p>
            </div>

            {/* 筛选栏 */}
            <Card>
                <CardHeader>
                    <CardTitle>筛选条件</CardTitle>
                    <CardDescription>根据订单状态和订单号筛选</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <Select
                            value={statusFilter}
                            onValueChange={(value) => {
                                setStatusFilter(value as OrderStatus | "all")
                                setPage(1)
                            }}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="所有状态"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">所有状态</SelectItem>
                                <SelectItem value="pending">待支付</SelectItem>
                                <SelectItem value="processing">处理中</SelectItem>
                                <SelectItem value="shipped">配送中</SelectItem>
                                <SelectItem value="delivered">已送达</SelectItem>
                                <SelectItem value="cancelled">已取消</SelectItem>
                            </SelectContent>
                        </Select>

                        <Input
                            placeholder="搜索订单号或支付ID..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setPage(1)
                            }}
                            className="max-w-sm"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* 订单表格 */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>订单号</TableHead>
                                <TableHead>商品数量</TableHead>
                                <TableHead>总金额</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>支付方式</TableHead>
                                <TableHead>下单时间</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                // 加载骨架屏
                                Array.from({length: 5}).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Skeleton className="h-4 w-32"/></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16"/></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20"/></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16"/></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16"/></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32"/></TableCell>
                                        <TableCell><Skeleton className="h-8 w-24 ml-auto"/></TableCell>
                                    </TableRow>
                                ))
                            ) : orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <IconPackage className="mx-auto mb-4 text-muted-foreground" size={48}/>
                                        <p className="text-muted-foreground">暂无订单数据</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">
                                            {order.order_number}
                                        </TableCell>
                                        <TableCell>{order.items_count} 件</TableCell>
                                        <TableCell className="font-semibold">
                                            ¥{order.total_amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <OrderStatusBadge status={order.status}/>
                                        </TableCell>
                                        <TableCell className="capitalize">
                                            {order.payment_method}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(order.order_date), "yyyy-MM-dd HH:mm")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenDetailDialog(order)}
                                                >
                                                    <IconEye size={16} className="mr-1"/>
                                                    查看
                                                </Button>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleOpenUpdateDialog(order)}
                                                >
                                                    <IconEdit size={16} className="mr-1"/>
                                                    更新
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* 分页 */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        第 {page} 页,共 {totalPages} 页
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            上一页
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            下一页
                        </Button>
                    </div>
                </div>
            )}

            {/* 更新订单对话框 */}
            {selectedOrder && (
                <UpdateOrderDialog
                    order={selectedOrder}
                    open={updateDialogOpen}
                    onOpenChange={setUpdateDialogOpen}
                    onSuccess={handleUpdateSuccess}
                />
            )}

            {/* 订单详情对话框 */}
            <OrderDetailDialog
                order={selectedOrder}
                open={detailDialogOpen}
                onOpenChange={setDetailDialogOpen}
            />
        </div>
    )
}

export default OrderConsolePage


interface OrderDetailDialogProps {
    order: Order | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

function OrderDetailDialog({
                               order,
                               open,
                               onOpenChange,
                           }: OrderDetailDialogProps) {
    if (!order) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>订单详情</span>
                        <OrderStatusBadge status={order.status}/>
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-6">
                        {/* 订单信息 */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">订单号</p>
                                <p className="font-medium">{order.order_number}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">下单时间</p>
                                <p className="font-medium">
                                    {format(new Date(order.order_date), "yyyy-MM-dd HH:mm:ss")}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">支付方式</p>
                                <p className="font-medium">{order.payment_method}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">支付ID</p>
                                <p className="font-medium">{order.payment_id || "-"}</p>
                            </div>
                            {order.tracking_number && (
                                <div className="col-span-2">
                                    <p className="text-muted-foreground">物流单号</p>
                                    <p className="font-medium">{order.tracking_number}</p>
                                </div>
                            )}
                        </div>

                        <Separator/>

                        {/* 商品列表 */}
                        <div>
                            <h3 className="font-semibold mb-4">商品清单 ({order.items_count} 件)</h3>
                            <div className="space-y-4">
                                {order.items.map((item) => (
                                    <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                                        <img
                                            src={item.product.image}
                                            alt={item.product.name}
                                            className="w-20 h-20 object-cover rounded"
                                        />
                                        <div className="flex-1">
                                            <h4 className="font-medium line-clamp-2 mb-2">
                                                {item.product.name}
                                            </h4>

                                            {/* SKU 规格 */}
                                            {item.skuInfo && Object.keys(item.skuInfo.specs).length > 0 && (
                                                <div className="flex gap-2 mb-2">
                                                    {Object.entries(item.skuInfo.specs).map(([key, value]) => (
                                                        <Badge key={key} variant="outline" className="text-xs">
                                                            {key}: {value}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">
                                                    数量: {item.quantity}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {item.product.original_price !== item.product.price && (
                                                        <span className="text-muted-foreground line-through">
                                                            ¥{item.product.original_price}
                                                        </span>
                                                    )}
                                                    <span className="font-semibold text-lg">
                                                        ¥{item.product.price}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator/>

                        {/* 总计 */}
                        <div className="flex justify-end">
                            <div className="text-right">
                                <p className="text-muted-foreground mb-1">订单总额</p>
                                <p className="text-2xl font-bold text-primary">
                                    ¥{order.total_amount.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

// types/order.ts
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface Product {
    id: string
    name: string
    price: number
    original_price: number
    image: string
    tags: string[]
    in_stock: boolean
}

export interface SkuInfo {
    id: string
    price: number
    stock: number
    status: boolean
    specs: Record<string, string>
}

export interface OrderItem {
    id: string
    quantity: number
    selected: boolean
    sku: string
    product: Product
    skuInfo?: SkuInfo
}

export interface Order {
    id: string
    order_number: string
    user: string
    status: OrderStatus
    total_amount: number
    items_count: number
    items: OrderItem[]
    order_date: string
    payment_method: string
    payment_id: string
    address: string
    tracking_number?: string
    created: string
    updated: string
}

export interface OrderListResponse {
    items: Order[]
    page: number
    perPage: number
    totalItems: number
    totalPages: number
}

const statusConfig: Record<OrderStatus, {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline"
}> = {
    pending: {label: "待支付", variant: "outline"},
    processing: {label: "处理中", variant: "secondary"},
    shipped: {label: "配送中", variant: "default"},
    delivered: {label: "已送达", variant: "default"},
    cancelled: {label: "已取消", variant: "destructive"},
}

function OrderStatusBadge({status}: { status: OrderStatus }) {
    const config = statusConfig[status]
    return (
        <Badge variant={config.variant} className="font-medium">
            {config.label}
        </Badge>
    )
}

interface UpdateOrderDialogProps {
    order: Order
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

const statusOptions: { value: OrderStatus; label: string }[] = [
    {value: "pending", label: "待支付"},
    {value: "processing", label: "处理中"},
    {value: "shipped", label: "配送中"},
    {value: "delivered", label: "已送达"},
    {value: "cancelled", label: "已取消"},
]

function UpdateOrderDialog({
                               order,
                               open,
                               onOpenChange,
                               onSuccess,
                           }: UpdateOrderDialogProps) {
    const [status, setStatus] = useState<OrderStatus>(order.status)
    const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || "")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        setLoading(true)

        try {
            // 如果状态是 shipped 但没有填写物流单号
            if (status === "shipped" && !trackingNumber.trim()) {
                toast.error("配送中状态需要填写物流单号")
                setLoading(false)
                return
            }
            const updateData: { status: OrderStatus, tracking_number?: string } = {status}
            // 如果是配送中,添加物流单号
            if (status === "shipped") {
                updateData.tracking_number = trackingNumber.trim()
            }

            await pb.collection("orders").update(order.id, updateData)

            toast.success("订单状态更新成功")
            onOpenChange(false)
            onSuccess()
        } catch (error) {
            console.error("更新订单失败:", error)
            const msg = error instanceof Error ? error.message : "更新订单失败"
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>更新订单状态</DialogTitle>
                    <DialogDescription>
                        订单号: {order.order_number}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="status">订单状态</Label>
                        <Select value={status} onValueChange={(value) => setStatus(value as OrderStatus)}>
                            <SelectTrigger>
                                <SelectValue placeholder="选择状态"/>
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {status === "shipped" && (
                        <div className="grid gap-2">
                            <Label htmlFor="tracking">
                                物流单号 <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="tracking"
                                placeholder="请输入物流单号"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                            />
                        </div>
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
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "更新中..." : "确认更新"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
