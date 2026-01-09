// pages/OrderConsolePage.tsx
import {useEffect, useRef, useState} from "react"
import {
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconEdit,
    IconEye,
    IconPackage,
} from "@tabler/icons-react"
import {
    type ColumnDef,
    type ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
    type VisibilityState,
} from "@tanstack/react-table"
import {format} from "date-fns"
import {toast} from "sonner"
import {Button} from "@/components/ui/button"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table"
import {Card, CardContent,} from "@/components/ui/card"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select"
import {Input} from "@/components/ui/input"
import {Skeleton} from "@/components/ui/skeleton"
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
import {Label} from "@/components/ui/label"
import {Checkbox} from "@/components/ui/checkbox"
import pb from "@/lib/pocketbase"

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
const statusConfig: Record<
    OrderStatus,
    {
        label: string
        variant: "default" | "secondary" | "destructive" | "outline"
    }
> = {
    pending: {label: "Pending Payment", variant: "outline"},
    processing: {label: "Processing", variant: "secondary"},
    shipped: {label: "Shipped", variant: "default"},
    delivered: {label: "Delivered", variant: "default"},
    cancelled: {label: "Cancelled", variant: "destructive"},
}

const statusOptions: { value: OrderStatus; label: string }[] = [
    {value: "pending", label: "Pending Payment"},
    {value: "processing", label: "Processing"},
    {value: "shipped", label: "Shipped"},
    {value: "delivered", label: "Delivered"},
    {value: "cancelled", label: "Cancelled"},
]

// Order Status Badge Component
function OrderStatusBadge({status}: { status: OrderStatus }) {
    const config = statusConfig[status]
    return (
        <Badge variant={config.variant} className="font-medium">
            {config.label}
        </Badge>
    )
}

// Order Detail Dialog Component
interface OrderDetailDialogProps {
    order: Order | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

function OrderDetailDialog({order, open, onOpenChange}: OrderDetailDialogProps) {
    if (!order) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <span className={"mr-2"}>Order Details</span>
                        <OrderStatusBadge status={order.status}/>
                    </DialogTitle>
                    <DialogDescription>
                        View complete information for this order
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-6">
                        {/* Order Information */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Order Number</p>
                                <p className="font-medium">{order.order_number}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Order Date</p>
                                <p className="font-medium">
                                    {format(new Date(order.order_date), "yyyy-MM-dd HH:mm:ss")}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Payment Method</p>
                                <p className="font-medium capitalize">{order.payment_method}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Payment ID</p>
                                <p className="font-medium">{order.payment_id || "-"}</p>
                            </div>
                            {order.tracking_number && (
                                <div className="col-span-2">
                                    <p className="text-muted-foreground">Tracking Number</p>
                                    <p className="font-medium">{order.tracking_number}</p>
                                </div>
                            )}
                        </div>

                        <Separator/>

                        {/* Items List */}
                        <div>
                            <h3 className="font-semibold mb-4">
                                Items ({order.items_count} items)
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

                        {/* Total */}
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

// Main Order Console Page
const OrderConsolePage = () => {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [rowSelection, setRowSelection] = useState({})
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [sorting, setSorting] = useState<SortingState>([])
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    })

    // Filters
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")
    const [searchQuery, setSearchQuery] = useState("")

    // Dialogs
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
    const [detailDialogOpen, setDetailDialogOpen] = useState(false)

    // Fetch orders
    const lastQueryKey = useRef<string>("")
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

            const result: OrderListResponse = await pb.collection("orders").getList(
                pagination.pageIndex + 1,
                pagination.pageSize,
                {
                    filter: filterString,
                    sort: "-created",
                }
            )

            setOrders(result.items)
        } catch (error) {
            console.error("Failed to fetch orders:", error)
            toast.error("Failed to fetch orders")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const key = `${pagination.pageIndex}-${statusFilter}-${searchQuery}`
        if (lastQueryKey.current === key) return
        lastQueryKey.current = key
        fetchOrders()
    }, [pagination.pageIndex, statusFilter, searchQuery])

    // Define columns
    const columns: ColumnDef<Order>[] = [
        {
            id: "select",
            header: ({table}) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && "indeterminate")
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                </div>
            ),
            cell: ({row}) => (
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "order_number",
            header: "Order Number",
            cell: ({row}) => (
                <div className="font-medium">{row.original.order_number}</div>
            ),
        },
        {
            accessorKey: "items_count",
            header: "Items",
            cell: ({row}) => <div>{row.original.items_count} items</div>,
        },
        {
            accessorKey: "total_amount",
            header: () => <div className="text-right">Total Amount</div>,
            cell: ({row}) => (
                <div className="text-right font-semibold">
                    ${row.original.total_amount.toLocaleString()}
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({row}) => <OrderStatusBadge status={row.original.status}/>,
        },
        {
            accessorKey: "payment_method",
            header: "Payment Method",
            cell: ({row}) => (
                <div className="capitalize">{row.original.payment_method}</div>
            ),
        },
        {
            accessorKey: "order_date",
            header: "Order Date",
            cell: ({row}) => (
                <div>{format(new Date(row.original.order_date), "yyyy-MM-dd HH:mm")}</div>
            ),
        },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({row}) => (
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setSelectedOrder(row.original)
                            setDetailDialogOpen(true)
                        }}
                    >
                        <IconEye size={16} className="mr-1"/>
                        View
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                            setSelectedOrder(row.original)
                            setUpdateDialogOpen(true)
                        }}
                    >
                        <IconEdit size={16} className="mr-1"/>
                        Update
                    </Button>
                </div>
            ),
        },
    ]

    const table = useReactTable({
        data: orders,
        columns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
            pagination,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true,
        pageCount: Math.ceil(orders.length / pagination.pageSize),
    })

    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardContent>
                    <div className="flex gap-4">
                        <Select
                            value={statusFilter}
                            onValueChange={(value) => {
                                setStatusFilter(value as OrderStatus | "all")
                                setPagination({...pagination, pageIndex: 0})
                            }}
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
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setPagination({...pagination, pageIndex: 0})
                            }}
                            className="max-w-sm"
                        />
                    </div>
                </CardContent>
                <CardContent>
                    <div className="overflow-hidden rounded-lg border">
                        <Table>
                            <TableHeader className="bg-muted sticky top-0 z-10">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id} colSpan={header.colSpan}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({length: 5}).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton className="h-4 w-8"/></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32"/></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16"/></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20"/></TableCell>
                                            <TableCell><Skeleton className="h-6 w-16"/></TableCell>
                                            <TableCell><Skeleton className="h-4 w-16"/></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32"/></TableCell>
                                            <TableCell><Skeleton className="h-8 w-24 ml-auto"/></TableCell>
                                        </TableRow>
                                    ))
                                ) : table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && "selected"}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="text-center py-12">
                                            <IconPackage className="mx-auto mb-4 text-muted-foreground" size={48}/>
                                            <p className="text-muted-foreground">No orders found</p>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4">
                <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="flex w-full items-center gap-8 lg:w-fit">
                    <div className="hidden items-center gap-2 lg:flex">
                        <Label htmlFor="rows-per-page" className="text-sm font-medium">
                            Rows per page
                        </Label>
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => {
                                table.setPageSize(Number(value))
                            }}
                        >
                            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                                <SelectValue placeholder={table.getState().pagination.pageSize}/>
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex w-fit items-center justify-center text-sm font-medium">
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount()}
                    </div>
                    <div className="ml-auto flex items-center gap-2 lg:ml-0">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to first page</span>
                            <IconChevronsLeft/>
                        </Button>
                        <Button
                            variant="outline"
                            className="size-8"
                            size="icon"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to previous page</span>
                            <IconChevronLeft/>
                        </Button>
                        <Button
                            variant="outline"
                            className="size-8"
                            size="icon"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to next page</span>
                            <IconChevronRight/>
                        </Button>
                        <Button
                            variant="outline"
                            className="hidden size-8 lg:flex"
                            size="icon"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to last page</span>
                            <IconChevronsRight/>
                        </Button>
                    </div>
                </div>
            </div>

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

export default OrderConsolePage