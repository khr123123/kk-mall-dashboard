// components/data-table-generic.tsx
import * as React from "react"
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    type UniqueIdentifier,
    useSensor,
    useSensors,
} from "@dnd-kit/core"
import {restrictToVerticalAxis} from "@dnd-kit/modifiers"
import {arrayMove, SortableContext, useSortable, verticalListSortingStrategy,} from "@dnd-kit/sortable"
import {CSS} from "@dnd-kit/utilities"
import {
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconGripVertical,
    IconLayoutColumns,
    IconSelector,
    IconSortAscending,
    IconSortDescending,
} from "@tabler/icons-react"
import {
    type ColumnDef,
    type ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type Row,
    type SortingState,
    useReactTable,
    type VisibilityState,
} from "@tanstack/react-table"

import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {Checkbox} from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table"
import {cn} from "@/lib/utils"

// Drag Handle Component
function DragHandle({id}: { id: string | number }) {
    const {attributes, listeners} = useSortable({
        id,
    })

    return (
        <Button
            {...attributes}
            {...listeners}
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-7 hover:bg-transparent cursor-grab active:cursor-grabbing"
        >
            <IconGripVertical className="text-muted-foreground size-3"/>
            <span className="sr-only">Drag to reorder</span>
        </Button>
    )
}

// Draggable Row Component
function DraggableRow<TData extends { id: string | number }>({
                                                                 row,
                                                                 enableDragDrop,
                                                             }: {
    row: Row<TData>
    enableDragDrop?: boolean
}) {
    const rowData = row.original as { id: string | number }

    if (enableDragDrop) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const {transform, transition, setNodeRef, isDragging} = useSortable({
            id: rowData.id,
        })

        return (
            <TableRow
                data-state={row.getIsSelected() && "selected"}
                data-dragging={isDragging}
                ref={setNodeRef}
                className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
                style={{
                    transform: CSS.Transform.toString(transform),
                    transition: transition,
                }}
            >
                {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                ))}
            </TableRow>
        )
    }

    return (
        <TableRow data-state={row.getIsSelected() && "selected"}>
            {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
            ))}
        </TableRow>
    )
}

// Props Interface
export interface DataTableProps<TData extends { id: string | number }> {
    data: TData[]
    columns: ColumnDef<TData>[]
    enableRowSelection?: boolean
    enableDragDrop?: boolean
    enableColumnVisibility?: boolean
    enablePagination?: boolean
    enableSorting?: boolean
    onDataChange?: (data: TData[]) => void
    pageSize?: number
    emptyMessage?: string
    toolbar?: React.ReactNode
    loading?: boolean
    loadingRows?: number
}

// Main DataTable Component
export function DataTableGeneric<TData extends { id: string | number }>({
                                                                            data: initialData,
                                                                            columns: baseColumns,
                                                                            enableRowSelection = false,
                                                                            enableDragDrop = false,
                                                                            enableColumnVisibility = true,
                                                                            enablePagination = true,
                                                                            enableSorting = true,
                                                                            onDataChange,
                                                                            pageSize = 10,
                                                                            emptyMessage = "No results found.",
                                                                            toolbar,
                                                                            loading = false,
                                                                            loadingRows = 5,
                                                                        }: DataTableProps<TData>) {
    const [data, setData] = React.useState<TData[]>(() => initialData)
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: pageSize,
    })

    const sortableId = React.useId()
    const sensors = useSensors(
        useSensor(MouseSensor, {}),
        useSensor(TouchSensor, {}),
        useSensor(KeyboardSensor, {})
    )

    // Update data when initialData changes
    React.useEffect(() => {
        setData(initialData)
    }, [initialData])

    // Build columns with optional drag handle and selection
    const columns = React.useMemo(() => {
        const cols: ColumnDef<TData>[] = []

        // Add drag handle column
        if (enableDragDrop) {
            cols.push({
                id: "drag",
                header: () => null,
                cell: ({row}) => <DragHandle id={(row.original as { id: string | number }).id}/>,
                size: 40,
                enableSorting: false,
                enableHiding: false,
            })
        }

        // Add selection column
        if (enableRowSelection) {
            cols.push({
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
                size: 40,
            })
        }

        return [...cols, ...baseColumns]
    }, [baseColumns, enableDragDrop, enableRowSelection])

    const dataIds = React.useMemo<UniqueIdentifier[]>(
        () => data?.map((item) => item.id) || [],
        [data]
    )

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
            pagination,
        },
        getRowId: (row) => String(row.id),
        enableRowSelection: enableRowSelection,
        enableSorting: enableSorting,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    })

    function handleDragEnd(event: DragEndEvent) {
        const {active, over} = event
        if (active && over && active.id !== over.id) {
            setData((data) => {
                const oldIndex = dataIds.indexOf(active.id)
                const newIndex = dataIds.indexOf(over.id)
                const newData = arrayMove(data, oldIndex, newIndex)
                onDataChange?.(newData)
                return newData
            })
        }
    }

    const TableContent = () => (
        <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                            const canSort = header.column.getCanSort()
                            const sorted = header.column.getIsSorted()

                            return (
                                <TableHead key={header.id} colSpan={header.colSpan}>
                                    {header.isPlaceholder ? null : (
                                        <div
                                            className={cn(
                                                canSort && "flex items-center gap-2 cursor-pointer select-none",
                                                !canSort && "flex items-center"
                                            )}
                                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                                        >
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {canSort && (
                                                <span className="inline-flex items-center">
                          {sorted === "asc" ? (
                              <IconSortAscending className="h-4 w-4"/>
                          ) : sorted === "desc" ? (
                              <IconSortDescending className="h-4 w-4"/>
                          ) : (
                              <IconSelector className="h-4 w-4 opacity-50"/>
                          )}
                        </span>
                                            )}
                                        </div>
                                    )}
                                </TableHead>
                            )
                        })}
                    </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {loading ? (
                    // Loading skeleton
                    Array.from({length: loadingRows}).map((_, index) => (
                        <TableRow key={`loading-${index}`}>
                            {columns.map((_, colIndex) => (
                                <TableCell key={`loading-cell-${index}-${colIndex}`}>
                                    <div className="h-4 bg-muted animate-pulse rounded"/>
                                </TableCell>
                            ))}
                        </TableRow>
                    ))
                ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                        <DraggableRow key={row.id} row={row} enableDragDrop={enableDragDrop}/>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                            {emptyMessage}
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            {(toolbar || enableColumnVisibility) && (
                <div className="flex items-center justify-between px-4 lg:px-6">
                    <div className="flex-1">{toolbar}</div>
                    {enableColumnVisibility && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <IconLayoutColumns/>
                                    <span className="hidden lg:inline">Columns</span>
                                    <IconChevronDown/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                {table
                                    .getAllColumns()
                                    .filter(
                                        (column) =>
                                            typeof column.accessorFn !== "undefined" && column.getCanHide()
                                    )
                                    .map((column) => (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="overflow-hidden rounded-lg border">
                {enableDragDrop ? (
                    <DndContext
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={handleDragEnd}
                        sensors={sensors}
                        id={sortableId}
                    >
                        <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                            <TableContent/>
                        </SortableContext>
                    </DndContext>
                ) : (
                    <TableContent/>
                )}
            </div>

            {/* Pagination */}
            {enablePagination && (
                <div className="flex items-center justify-between px-4">
                    {enableRowSelection && (
                        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                            {table.getFilteredSelectedRowModel().rows.length} of{" "}
                            {table.getFilteredRowModel().rows.length} row(s) selected.
                        </div>
                    )}
                    <div className="flex w-full items-center gap-8 lg:w-fit lg:ml-auto">
                        <div className="hidden items-center gap-2 lg:flex">
                            <Label htmlFor="rows-per-page" className="text-sm font-medium">
                                Rows per page
                            </Label>
                            <Select
                                value={`${table.getState().pagination.pageSize}`}
                                onValueChange={(value) => table.setPageSize(Number(value))}
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
                            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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
            )}
        </div>
    )
}

// Status Badge Component (reusable)
export interface StatusConfig {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    icon?: React.ReactNode
}

export function StatusBadge({
                                config,
                            }: {
    config: StatusConfig
}) {
    return (
        <Badge variant={config.variant} className="text-muted-foreground px-1.5 gap-1">
            {config.icon}
            {config.label}
        </Badge>
    )
}