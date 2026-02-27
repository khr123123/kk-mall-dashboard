// ==================== PocketBase API Service Layer ====================
// 统一服务层：错误处理、统一返回格式、防止 magic string
// 所有集合名定义为常量，防止拼写错误

import pb from "@/lib/pocketbase"
import type {
  Brand,
  Category,
  CategoryNode,
  DashboardStats,
  Message,
  MessageType,
  Notification,
  NotificationType,
  Order,
  OrderStatus,
  Product,
  ProductSku,
  User,
} from "@/types"

// ==================== 集合名常量（防止 magic string）====================
export const COLLECTIONS = {
  USERS: "users",
  CATEGORY: "category",
  PRODUCTS: "products",
  PRODUCT_SKUS: "product_skus",
  BRANDS: "brands",
  ORDERS: "orders",
  ORDER_ITEMS: "order_items",
  MESSAGES: "messages",
  NOTIFICATIONS: "notifications",
  ADDRESSES: "addresses",
  CART_ITEMS: "cart_items",
  PAYMENTS: "payments",
} as const

// ==================== 工具函数 ====================
function startOfTodayUTC(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function startOfMonthUTC(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

function daysAgoUTC(days: number): Date {
  const d = startOfTodayUTC()
  d.setUTCDate(d.getUTCDate() - days)
  return d
}

/** 安全执行，失败返回默认值 */
async function safeExec<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    console.warn("[API] safeExec failed:", e)
    return fallback
  }
}

// ==================== Category Service ====================
// 正确做法：Category 表有 parent 字段（relation, self-reference）
// children 不存在数据库，由前端通过 buildCategoryTree() 构建

/**
 * 获取全部分类（平铺列表）
 */
export async function fetchCategories(): Promise<Category[]> {
  return pb.collection(COLLECTIONS.CATEGORY).getFullList<Category>({
    sort: "sort_order,name",
    // 可选：expand parent 以获取父分类名称
    expand: "parent",
  })
}

/**
 * 获取某个父级的直接子分类
 * @param parentId 父级 ID，空字符串表示顶级分类
 */
export async function fetchCategoryChildren(parentId: string): Promise<Category[]> {
  const filter = parentId
    ? `parent = "${parentId}"`
    : `parent = "" || parent = null`
  return pb.collection(COLLECTIONS.CATEGORY).getFullList<Category>({
    filter,
    sort: "sort_order,name",
  })
}

/**
 * 将平铺分类列表构建为树状结构
 * 这是正确处理 Category.parent 自引用的方式
 */
export function buildCategoryTree(flatList: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>()

  // 初始化所有节点
  for (const cat of flatList) {
    map.set(cat.id, { ...cat, children: [] })
  }

  const roots: CategoryNode[] = []

  for (const cat of flatList) {
    const node = map.get(cat.id)!
    if (cat.parent && map.has(cat.parent)) {
      map.get(cat.parent)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

/**
 * 获取树状分类结构（推荐使用）
 */
export async function fetchCategoryTree(): Promise<CategoryNode[]> {
  const flat = await fetchCategories()
  return buildCategoryTree(flat)
}

export async function createCategory(data: Partial<Category>): Promise<Category> {
  // 确保空 parent 不传，PocketBase 不接受 "" 作为 relation
  const payload: Record<string, any> = {
    name: data.name,
    icon: data.icon || "",
    sort_order: data.sort_order ?? 0,
  }
  if (data.parent) payload.parent = data.parent
  return pb.collection(COLLECTIONS.CATEGORY).create<Category>(payload)
}

export async function updateCategory(
  id: string,
  data: Partial<Category>
): Promise<Category> {
  const payload: Record<string, any> = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.icon !== undefined) payload.icon = data.icon
  if (data.sort_order !== undefined) payload.sort_order = data.sort_order
  // 允许清空 parent（设为顶级）
  payload.parent = data.parent || null
  return pb.collection(COLLECTIONS.CATEGORY).update<Category>(id, payload)
}

export async function deleteCategory(id: string): Promise<boolean> {
  return pb.collection(COLLECTIONS.CATEGORY).delete(id)
}

// ==================== Dashboard API ====================
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const todayUTC = startOfTodayUTC()
  const yesterdayUTC = daysAgoUTC(1)
  const monthStartUTC = startOfMonthUTC()
  const sevenDaysAgoUTC = daysAgoUTC(7)
  const fourteenDaysAgoUTC = daysAgoUTC(14)

  const todayISO = todayUTC.toISOString()
  const yesterdayISO = yesterdayUTC.toISOString()
  const monthStartISO = monthStartUTC.toISOString()
  const sevenDaysISO = sevenDaysAgoUTC.toISOString()
  const fourteenDaysISO = fourteenDaysAgoUTC.toISOString()

  const [
    todayOrders,
    yesterdayOrders,
    monthOrders,
    todayUsers,
    yesterdayUsers,
    totalUsersResult,
    recentActiveOrders,
    previousActiveOrders,
    allProducts,
    recentOrdersList,
    allOrders,
  ] = await Promise.all([
    // 今日订单
    safeExec(() =>
      pb.collection(COLLECTIONS.ORDERS).getFullList({
        filter: `order_date >= "${todayISO}"`,
        fields: "id,total_amount,status",
      }),
      []
    ),
    // 昨日订单
    safeExec(() =>
      pb.collection(COLLECTIONS.ORDERS).getFullList({
        filter: `order_date >= "${yesterdayISO}" && order_date < "${todayISO}"`,
        fields: "id,total_amount",
      }),
      []
    ),
    // 本月订单
    safeExec(() =>
      pb.collection(COLLECTIONS.ORDERS).getFullList({
        filter: `order_date >= "${monthStartISO}"`,
        fields: "id,total_amount,status",
      }),
      []
    ),
    // 今日新增用户
    safeExec(() =>
      pb.collection(COLLECTIONS.USERS).getFullList({
        filter: `created >= "${todayISO}"`,
        fields: "id",
      }),
      []
    ),
    // 昨日新增用户
    safeExec(() =>
      pb.collection(COLLECTIONS.USERS).getFullList({
        filter: `created >= "${yesterdayISO}" && created < "${todayISO}"`,
        fields: "id",
      }),
      []
    ),
    // 用户总数
    safeExec(() =>
      pb.collection(COLLECTIONS.USERS).getList(1, 1, { fields: "id" }),
      { totalItems: 0, page: 1, perPage: 1, totalPages: 1, items: [] } as any
    ),
    // 近7天活跃用户
    safeExec(() =>
      pb.collection(COLLECTIONS.ORDERS).getFullList({
        filter: `order_date >= "${sevenDaysISO}"`,
        fields: "user",
      }),
      []
    ),
    // 上7-14天活跃用户
    safeExec(() =>
      pb.collection(COLLECTIONS.ORDERS).getFullList({
        filter: `order_date >= "${fourteenDaysISO}" && order_date < "${sevenDaysISO}"`,
        fields: "user",
      }),
      []
    ),
    // 全部商品
    safeExec(() =>
      pb.collection(COLLECTIONS.PRODUCTS).getFullList({
        fields: "id,name,price,stock,inStock,image,isNew,isHot",
        sort: "-created",
      }),
      []
    ),
    // 最近10条订单
    safeExec(() =>
      pb.collection(COLLECTIONS.ORDERS).getList(1, 10, {
        sort: "-order_date",
        expand: "user",
      }),
      { items: [], page: 1, perPage: 10, totalItems: 0, totalPages: 0 } as any
    ),
    // 全部订单（用于状态统计，只取状态字段）
    safeExec(() =>
      pb.collection(COLLECTIONS.ORDERS).getFullList({
        fields: "id,status",
      }),
      []
    ),
  ])

  // 今日营收
  const todayRevenue = (todayOrders as any[]).reduce(
    (sum, o) => sum + (o.total_amount || 0),
    0
  )
  const yesterdayRevenue = (yesterdayOrders as any[]).reduce(
    (sum, o) => sum + (o.total_amount || 0),
    0
  )

  // 本月营收
  const monthRevenue = (monthOrders as any[]).reduce(
    (sum, o) => sum + (o.total_amount || 0),
    0
  )

  // 环比变化
  const calcChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Number(((( current - previous) / previous) * 100).toFixed(1))
  }

  const todayRevenueChange = calcChange(todayRevenue, yesterdayRevenue)
  const todayOrdersChange = calcChange(
    (todayOrders as any[]).length,
    (yesterdayOrders as any[]).length
  )
  const newUsersTodayChange = calcChange(
    (todayUsers as any[]).length,
    (yesterdayUsers as any[]).length
  )

  // 活跃账户
  const activeNow = new Set((recentActiveOrders as any[]).map((o) => o.user)).size
  const activeBefore = new Set((previousActiveOrders as any[]).map((o) => o.user)).size
  const activeChange = calcChange(activeNow, activeBefore)

  // 商品统计
  const outOfStockCount = (allProducts as any[]).filter(
    (p) => !p.inStock || (p.stock ?? 0) <= 0
  ).length

  const lowStockProducts = (allProducts as any[])
    .filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10)
    .slice(0, 8) as Product[]

  // 热门商品（isHot 或库存最多的）
  const topProducts = (allProducts as any[])
    .filter((p) => p.isHot || p.isNew)
    .slice(0, 6) as Product[]

  // 订单状态统计
  const orderStatusStats = (allOrders as any[]).reduce(
    (acc, o) => {
      const s = o.status as OrderStatus
      acc[s] = (acc[s] || 0) + 1
      return acc
    },
    {} as Record<OrderStatus, number>
  )

  // 确保所有状态都有初始值
  const defaultStatuses: OrderStatus[] = [
    "pending", "processing", "paid", "shipped", "delivered", "cancelled", "refunded",
  ]
  for (const s of defaultStatuses) {
    if (!orderStatusStats[s]) orderStatusStats[s] = 0
  }

  return {
    todayRevenue,
    todayOrders: (todayOrders as any[]).length,
    todayRevenueChange,
    todayOrdersChange,
    monthRevenue,
    monthOrders: (monthOrders as any[]).length,
    totalUsers: (totalUsersResult as any).totalItems ?? 0,
    newUsersToday: (todayUsers as any[]).length,
    newUsersTodayChange,
    activeAccounts: activeNow,
    activeAccountsChange: activeChange,
    totalProducts: (allProducts as any[]).length,
    outOfStockCount,
    lowStockProducts,
    orderStatusStats,
    topProducts,
    recentOrders: (recentOrdersList as any).items as Order[],
  }
}

// ==================== Products API ====================
export async function fetchProducts(page = 1, perPage = 20, filter = "") {
  return pb.collection(COLLECTIONS.PRODUCTS).getList<Product>(page, perPage, {
    filter,
    sort: "-created",
    expand: "brand,category_id",
  })
}

export async function fetchProduct(id: string): Promise<Product> {
  return pb.collection(COLLECTIONS.PRODUCTS).getOne<Product>(id, {
    expand: "brand,category_id",
  })
}

export async function createProduct(data: FormData): Promise<Product> {
  return pb.collection(COLLECTIONS.PRODUCTS).create<Product>(data)
}

export async function updateProduct(id: string, data: FormData): Promise<Product> {
  return pb.collection(COLLECTIONS.PRODUCTS).update<Product>(id, data)
}

export async function deleteProduct(id: string): Promise<boolean> {
  return pb.collection(COLLECTIONS.PRODUCTS).delete(id)
}

// ==================== Product SKU API ====================
export async function fetchProductSkus(productId: string): Promise<ProductSku[]> {
  return pb.collection(COLLECTIONS.PRODUCT_SKUS).getFullList<ProductSku>({
    filter: `product_id = "${productId}"`,
    sort: "created",
  })
}

export async function createProductSku(data: Partial<ProductSku>): Promise<ProductSku> {
  return pb.collection(COLLECTIONS.PRODUCT_SKUS).create<ProductSku>(data)
}

export async function updateProductSku(
  id: string,
  data: Partial<ProductSku>
): Promise<ProductSku> {
  return pb.collection(COLLECTIONS.PRODUCT_SKUS).update<ProductSku>(id, data)
}

export async function deleteProductSku(id: string): Promise<boolean> {
  return pb.collection(COLLECTIONS.PRODUCT_SKUS).delete(id)
}

export async function batchCreateSkus(
  skus: Partial<ProductSku>[]
): Promise<ProductSku[]> {
  return Promise.all(skus.map((sku) => createProductSku(sku)))
}

export async function batchDeleteSkus(ids: string[]): Promise<boolean[]> {
  return Promise.all(ids.map((id) => deleteProductSku(id)))
}

// ==================== Brand API ====================
export async function fetchBrands(): Promise<Brand[]> {
  return pb.collection(COLLECTIONS.BRANDS).getFullList<Brand>({ sort: "name" })
}

export async function createBrand(data: Partial<Brand> | FormData): Promise<Brand> {
  return pb.collection(COLLECTIONS.BRANDS).create<Brand>(data)
}

export async function updateBrand(
  id: string,
  data: Partial<Brand> | FormData
): Promise<Brand> {
  return pb.collection(COLLECTIONS.BRANDS).update<Brand>(id, data)
}

export async function deleteBrand(id: string): Promise<boolean> {
  return pb.collection(COLLECTIONS.BRANDS).delete(id)
}

// ==================== Orders API ====================
export async function fetchOrders(
  page = 1,
  perPage = 20,
  filter = "",
  sort = "-created"
) {
  return pb.collection(COLLECTIONS.ORDERS).getList<Order>(page, perPage, {
    filter,
    sort,
    expand: "user",
  })
}

export async function fetchOrder(id: string): Promise<Order> {
  return pb.collection(COLLECTIONS.ORDERS).getOne<Order>(id, {
    expand: "user",
  })
}

/**
 * 更新订单状态，并自动创建消息通知
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  trackingNumber?: string
): Promise<Order> {
  // 先获取旧状态（用于通知内容）
  const oldOrder = await safeExec(
    () => pb.collection(COLLECTIONS.ORDERS).getOne<Order>(orderId),
    null
  )

  const updateData: Record<string, any> = { status: newStatus }
  if (trackingNumber) updateData.tracking_number = trackingNumber

  const updated = await pb.collection(COLLECTIONS.ORDERS).update<Order>(orderId, updateData)

  // 状态变更时创建消息通知（前端侧备用，pb_hook 也会触发）
  // 注意：pb_hooks/main.pb.js 已经处理了这个逻辑
  // 如果没有 pb_hooks，可以在这里手动创建
  if (oldOrder && oldOrder.status !== newStatus) {
    await safeExec(
      () =>
        createMessage({
          user: updated.user,
          title: `订单 #${updated.order_number} 状态更新`,
          content: `您的订单 #${updated.order_number} 状态已从「${oldOrder.status}」变更为「${newStatus}」`,
          type: "order_status",
          link: "/orders",
          order_id: orderId,
          extra: {
            orderId,
            orderNumber: updated.order_number,
            oldStatus: oldOrder.status,
            newStatus,
          },
        }),
      null
    )
  }

  return updated
}

export async function deleteOrder(id: string): Promise<boolean> {
  return pb.collection(COLLECTIONS.ORDERS).delete(id)
}

// ==================== Messages API ====================
/**
 * 创建消息通知
 */
export async function createMessage(data: {
  user: string
  title: string
  content: string
  type: MessageType
  link?: string
  order_id?: string
  extra?: Record<string, any>
}): Promise<Message> {
  return pb.collection(COLLECTIONS.MESSAGES).create<Message>({
    ...data,
    is_read: false,
    extra: data.extra ? JSON.stringify(data.extra) : undefined,
  })
}

/**
 * 获取用户消息列表
 */
export async function fetchMessages(
  userId: string,
  page = 1,
  perPage = 20,
  onlyUnread = false
) {
  const filters = [`user = "${userId}"`]
  if (onlyUnread) filters.push(`is_read = false`)

  return pb.collection(COLLECTIONS.MESSAGES).getList<Message>(page, perPage, {
    filter: filters.join(" && "),
    sort: "-created",
  })
}

/**
 * 标记消息为已读
 */
export async function markMessageRead(id: string): Promise<Message> {
  return pb.collection(COLLECTIONS.MESSAGES).update<Message>(id, { is_read: true })
}

/**
 * 批量标记消息为已读
 */
export async function markAllMessagesRead(userId: string): Promise<void> {
  const unread = await pb.collection(COLLECTIONS.MESSAGES).getFullList<Message>({
    filter: `user = "${userId}" && is_read = false`,
    fields: "id",
  })
  await Promise.all(unread.map((m) => markMessageRead(m.id)))
}

/**
 * 获取未读消息数量
 */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  const result = await pb.collection(COLLECTIONS.MESSAGES).getList(1, 1, {
    filter: `user = "${userId}" && is_read = false`,
  })
  return result.totalItems
}

export async function deleteMessage(id: string): Promise<boolean> {
  return pb.collection(COLLECTIONS.MESSAGES).delete(id)
}

// ==================== Notifications API（向后兼容）====================
export async function fetchNotifications(userId: string, page = 1, perPage = 20) {
  return pb.collection(COLLECTIONS.NOTIFICATIONS).getList<Notification>(page, perPage, {
    filter: `userId = "${userId}"`,
    sort: "-created",
  })
}

export async function createNotification(data: {
  userId: string
  title: string
  content: string
  type: NotificationType
  link?: string
  extra?: Record<string, any>
}): Promise<Notification> {
  return pb.collection(COLLECTIONS.NOTIFICATIONS).create<Notification>({
    ...data,
    isRead: false,
  })
}

export async function markNotificationRead(id: string): Promise<Notification> {
  return pb.collection(COLLECTIONS.NOTIFICATIONS).update<Notification>(id, {
    isRead: true,
  })
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const unread = await pb.collection(COLLECTIONS.NOTIFICATIONS).getFullList<Notification>({
    filter: `userId = "${userId}" && isRead = false`,
    fields: "id",
  })
  await Promise.all(unread.map((n) => markNotificationRead(n.id)))
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const result = await pb.collection(COLLECTIONS.NOTIFICATIONS).getList(1, 1, {
    filter: `userId = "${userId}" && isRead = false`,
  })
  return result.totalItems
}

// ==================== Users API ====================
export async function fetchUsers(page = 1, perPage = 20, filter = "") {
  return pb.collection(COLLECTIONS.USERS).getList<User>(page, perPage, {
    filter,
    sort: "-created",
  })
}

export async function fetchUser(id: string): Promise<User> {
  return pb.collection(COLLECTIONS.USERS).getOne<User>(id)
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  return pb.collection(COLLECTIONS.USERS).update<User>(id, data)
}

export async function deleteUser(id: string): Promise<boolean> {
  return pb.collection(COLLECTIONS.USERS).delete(id)
}

// ==================== File URL Helper ====================
export function getFileUrl(record: any, filename: string): string {
  if (!record || !filename) return ""
  try {
    return pb.files.getURL(record, filename)
  } catch {
    return ""
  }
}

export function getFileUrlById(
  collectionId: string,
  recordId: string,
  filename: string
): string {
  if (!filename) return ""
  return `${pb.baseURL}/api/files/${collectionId}/${recordId}/${filename}`
}
