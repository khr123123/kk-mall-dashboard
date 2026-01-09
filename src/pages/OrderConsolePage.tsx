// pages/OrderManagementPage.tsx
import {useEffect, useRef, useState} from "react"
import {
    IconCircleCheckFilled,
    IconClock,
    IconCopy,
    IconDotsVertical,
    IconEdit,
    IconEye,
    IconLoader,
    IconTrash,
    IconTruck,
    IconX,
} from "@tabler/icons-react"
import {type ColumnDef} from "@tanstack/react-table"
import {format} from "date-fns"
import {toast} from "sonner"

import {Button} from "@/components/ui/button"
import {Card, CardContent} from "@/components/ui/card"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select"
import {Input} from "@/components/ui/input"
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
import {ScrollArea} from "@/components/ui/scroll-area"
import {Separator} from "@/components/ui/separator"
import {Badge} from "@/components/ui/badge"
import {Label} from "@/components/ui/label"
import {DataTableGeneric, StatusBadge} from "@/components/data-table-generic"
import pb from "@/lib/pocketbase"

// Types
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled"

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

// Status Configuration
const statusConfig: Record<OrderStatus,
    {
        label: string
        variant: "default" | "secondary" | "destructive" | "outline"
        icon: React.ReactNode
    }
> = {
    pending: {
        label: "Pending",
        variant: "outline",
        icon: <IconClock className="w-3 h-3"/>,
    },
    processing: {
        label: "Processing",
        variant: "outline",
        icon: <IconLoader className="w-3 h-3"/>,
    },
    shipped: {
        label: "Shipped",
        variant: "outline",
        icon: <IconTruck className="w-3 h-3"/>,
    },
    delivered: {
        label: "Done",
        variant: "outline",
        icon: <IconCircleCheckFilled className="w-3 h-3 fill-green-500 dark:fill-green-400"/>,
    },
    cancelled: {
        label: "Cancelled",
        variant: "outline",
        icon: <IconX className="w-3 h-3"/>,
    },
}

const statusOptions: { value: OrderStatus; label: string }[] = [
    {value: "pending", label: "Pending Payment"},
    {value: "processing", label: "Processing"},
    {value: "shipped", label: "Shipped"},
    {value: "delivered", label: "Delivered"},
    {value: "cancelled", label: "Cancelled"},
]

// Order Status Badge Component
const OrderStatusBadge = ({status}: { status: OrderStatus }) => <StatusBadge config={statusConfig[status]}/>


// Order Detail Dialog Component
interface OrderDetailDialogProps {
    order: Order | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

const OrderDetailDialog = ({order, open, onOpenChange}: OrderDetailDialogProps) => {
    if (!order) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>Order Details</span>
                        <OrderStatusBadge status={order.status}/>
                    </DialogTitle>
                    <DialogDescription>
                        Complete information for order #{order.order_number}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-6">
                        {/* Order Information */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground mb-1">Order Number</p>
                                <p className="font-medium">{order.order_number}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground mb-1">Order Date</p>
                                <p className="font-medium">
                                    {format(new Date(order.order_date), "yyyy-MM-dd HH:mm:ss")}
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

                        <Separator/>

                        {/* Items List */}
                        <div>
                            <h3 className="font-semibold mb-4">
                                Order Items ({order.items_count} items)
                            </h3>
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

                                            {/* SKU Specs */}
                                            {item.skuInfo && Object.keys(item.skuInfo.specs).length > 0 && (
                                                <div className="flex gap-2 mb-2 flex-wrap">
                                                    {Object.entries(item.skuInfo.specs).map(([key, value]) => (
                                                        <Badge key={key} variant="outline" className="text-xs">
                                                            {key}: {value}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Quantity: {item.quantity}
                        </span>
                                                <div className="flex items-center gap-2">
                                                    {item.product.original_price !== item.product.price && (
                                                        <span className="text-muted-foreground line-through">
                              ${item.product.original_price}
                            </span>
                                                    )}
                                                    <span className="font-semibold text-lg">
                            ${item.product.price}
                          </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Separator/>
                        <div className="flex justify-end">
                            <div className="text-right">
                                <p className="text-muted-foreground mb-1">Total Amount</p>
                                <p className="text-2xl font-bold text-primary">
                                    ${order.total_amount.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

// Update Order Dialog Component
interface UpdateOrderDialogProps {
    order: Order
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

const UpdateOrderDialog = ({order, open, onOpenChange, onSuccess,}: UpdateOrderDialogProps) => {
    const [status, setStatus] = useState<OrderStatus>(order.status)
    const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || "")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        setLoading(true)

        try {
            // Validate tracking number for shipped status
            if (status === "shipped" && !trackingNumber.trim()) {
                toast.error("Tracking number is required for shipped status")
                setLoading(false)
                return
            }

            const updateData: { status: OrderStatus; tracking_number?: string } = {status}

            // Add tracking number if shipped
            if (status === "shipped") {
                updateData.tracking_number = trackingNumber.trim()
            }

            await pb.collection("orders").update(order.id, updateData)

            toast.success("Order status updated successfully")
            onOpenChange(false)
            onSuccess()
        } catch (error) {
            console.error("Failed to update order:", error)
            const msg = error instanceof Error ? error.message : "Failed to update order"
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>Update Order Status</DialogTitle>
                    <DialogDescription>Order Number: {order.order_number}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="status">Order Status</Label>
                        <Select value={status} onValueChange={(value) => setStatus(value as OrderStatus)}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select status"/>
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
                                Tracking Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="tracking"
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
                        {loading ? "Updating..." : "Confirm Update"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Main Order Management Page
const OrderManagementPage = () => {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")
    const [searchQuery, setSearchQuery] = useState("")

    // Dialogs
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
    const [detailDialogOpen, setDetailDialogOpen] = useState(false)

    // Fetch orders
    const fetchOrders = async () => {
        setLoading(true)
        try {
            const filters: string[] = []
            if (statusFilter !== "all") {
                filters.push(`status="${statusFilter}"`)
            }
            if (searchQuery.trim()) {
                filters.push(`(order_number~"${searchQuery}" || payment_id~"${searchQuery}")`)
            }

            const filterString = filters.length > 0 ? filters.join(" && ") : ""

            const result: OrderListResponse = await pb.collection("orders").getList(1, 100, {
                filter: filterString,
                sort: "-created",
            })

            setOrders(result.items)
        } catch (error) {
            console.error("Failed to fetch orders:", error)
            toast.error("Failed to fetch orders")
        } finally {
            setLoading(false)
        }
    }

    const lastParamsRef = useRef<{ status: string; query: string } | null>(null)
    useEffect(() => {
        const currentParams = {
            status: statusFilter,
            query: searchQuery,
        }
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

    // Handle order deletion
    const handleDelete = async (orderId: string) => {
        try {
            await pb.collection("orders").delete(orderId)
            toast.success("Order deleted successfully")
            await fetchOrders()
        } catch (error) {
            console.error("Failed to delete order:", error)
            toast.error("Failed to delete order")
        }
    }

    // Handle order duplication
    const handleDuplicate = async (order: Order) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {id, created, updated, ...orderData} = order
            const newOrderNumber = `${order.order_number}-COPY`

            await pb.collection("orders").create({
                ...orderData,
                order_number: newOrderNumber,
                status: "pending",
            })

            toast.success("Order duplicated successfully")
            fetchOrders()
        } catch (error) {
            console.error("Failed to duplicate order:", error)
            toast.error("Failed to duplicate order")
        }
    }

    // Define columns for DataTable
    const columns: ColumnDef<Order>[] = [
        {
            accessorKey: "order_number",
            header: "Order Number",
            cell: ({row}) => (
                <Button
                    variant="link"
                    className="text-foreground w-fit px-0 text-left　cursor-pointer"
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
            cell: ({row}) => (
                <Badge variant="outline" className="text-muted-foreground px-1.5 size-6">
                    {row.original.items_count}
                </Badge>
            ),
            enableSorting: true,
        },
        {
            accessorKey: "total_amount",
            header: () => <div className="text-right">Total</div>,
            cell: ({row}) => (
                <div className="text-right font-medium">
                    ${row.original.total_amount.toLocaleString()}
                </div>
            ),
            enableSorting: true,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({row}) => <OrderStatusBadge status={row.original.status}/>,
            enableSorting: true,
        },
        {
            accessorKey: "payment_method",
            header: "Payment",
            cell: ({row}) => (
                <Badge variant="outline" className="text-muted-foreground px-1.5 capitalize">
                    {row.original.payment_method}
                </Badge>
            ),
            enableSorting: true,
        },
        {
            accessorKey: "order_date",
            header: "Date",
            cell: ({row}) => (
                <div className="text-sm">
                    {format(new Date(row.original.order_date), "yyyy-MM-dd HH:mm")}
                </div>
            ),
            enableSorting: true,
        },
        {
            id: "actions",
            header: () => null,
            cell: ({row}) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="data-[state=open]:bg-muted text-muted-foreground flex size-8 cursor-pointer"
                            size="icon"
                        >
                            <IconDotsVertical/>
                            <span className="sr-only">Open menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                            onClick={() => {
                                setSelectedOrder(row.original)
                                setDetailDialogOpen(true)
                            }}
                        >
                            <IconEye className="mr-2 h-4 w-4"/>
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                setSelectedOrder(row.original)
                                setUpdateDialogOpen(true)
                            }}
                        >
                            <IconEdit className="mr-2 h-4 w-4"/>
                            Update Status
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(row.original)}>
                            <IconCopy className="mr-2 h-4 w-4"/>
                            Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(row.original.id)}
                        >
                            <IconTrash className="mr-2 h-4 w-4"/>
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            enableSorting: false,
            enableHiding: false,
        },
    ]

    // Toolbar component
    const toolbar = (
        <div className="flex gap-4 flex-1">
            <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as OrderStatus | "all")}
            >
                <SelectTrigger className="w-50">
                    <SelectValue placeholder="All Status"/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending Payment</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
            </Select>

            <Input
                placeholder="Search order number or payment ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
            />
        </div>
    )

    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardContent>
                    {/* Data Table with toolbar */}
                    <DataTableGeneric
                        data={orders}
                        columns={columns}
                        enableRowSelection={true}
                        enableDragDrop={true}
                        enableColumnVisibility={true}
                        enablePagination={true}
                        enableSorting={true}
                        loading={loading}
                        loadingRows={5}
                        pageSize={10}
                        emptyMessage="No orders found"
                        toolbar={toolbar}
                        onDataChange={(newOrders) => {
                            setOrders(newOrders)
                            // 可选：同步到后端
                            console.log("Orders reordered:", newOrders.map(o => o.order_number))
                        }}
                    />
                </CardContent>
            </Card>

            {/* Dialogs */}
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

export default OrderManagementPage