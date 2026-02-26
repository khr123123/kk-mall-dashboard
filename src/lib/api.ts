// ==================== PocketBase API Service Layer ====================
import pb from "@/lib/pocketbase"
import type {
  Brand,
  Category,
  DashboardStats,
  Notification,
  NotificationType,
  Order,
  OrderStatus,
  Product,
  ProductSku,
  User,
} from "@/types"

// ==================== Utility ====================
function startOfTodayUTC() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
}

function daysAgoUTC(days: number) {
  const d = startOfTodayUTC()
  d.setUTCDate(d.getUTCDate() - days)
  return d
}

// ==================== Dashboard API ====================
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const todayUTC = startOfTodayUTC()
  const yesterdayUTC = daysAgoUTC(1)
  const sevenDaysAgoUTC = daysAgoUTC(7)
  const fourteenDaysAgoUTC = daysAgoUTC(14)

  // Fetch all data in parallel with error handling for each
  const [
    todayOrders,
    yesterdayOrders,
    todayUsers,
    yesterdayUsers,
    recentActiveOrders,
    previousActiveOrders,
    allProducts,
    recentOrdersList,
  ] = await Promise.all([
    pb.collection("orders").getFullList({
      filter: `order_date >= "${todayUTC.toISOString()}"`,
      fields: "id,total_amount",
    }).catch(() => []),
    pb.collection("orders").getFullList({
      filter: `order_date >= "${yesterdayUTC.toISOString()}" && order_date < "${todayUTC.toISOString()}"`,
      fields: "id,total_amount",
    }).catch(() => []),
    pb.collection("users").getFullList({
      filter: `created >= "${todayUTC.toISOString()}"`,
      fields: "id",
    }).catch(() => []),
    pb.collection("users").getFullList({
      filter: `created >= "${yesterdayUTC.toISOString()}" && created < "${todayUTC.toISOString()}"`,
      fields: "id",
    }).catch(() => []),
    pb.collection("orders").getFullList({
      filter: `order_date >= "${sevenDaysAgoUTC.toISOString()}"`,
      fields: "user",
    }).catch(() => []),
    pb.collection("orders").getFullList({
      filter: `order_date >= "${fourteenDaysAgoUTC.toISOString()}" && order_date < "${sevenDaysAgoUTC.toISOString()}"`,
      fields: "user",
    }).catch(() => []),
    pb.collection("products").getFullList({
      fields: "id,name,price,stock,inStock,image",
    }).catch(() => []),
    pb.collection("orders").getList(1, 10, {
      sort: "-order_date",
    }).catch(() => ({ items: [] })),
  ])

  // Revenue calculation
  const todayRevenue = todayOrders.reduce((sum, o: any) => sum + (o.total_amount || 0), 0)
  const yesterdayRevenue = yesterdayOrders.reduce((sum, o: any) => sum + (o.total_amount || 0), 0)
  const revenueChange = yesterdayRevenue > 0
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
    : todayRevenue > 0 ? 100 : 0

  // Customer calculation
  const customerChange = yesterdayUsers.length > 0
    ? ((todayUsers.length - yesterdayUsers.length) / yesterdayUsers.length) * 100
    : todayUsers.length > 0 ? 100 : 0

  // Active accounts
  const activeNow = [...new Set(recentActiveOrders.map((o: any) => o.user))]
  const activeBefore = [...new Set(previousActiveOrders.map((o: any) => o.user))]
  const activeChange = activeBefore.length > 0
    ? ((activeNow.length - activeBefore.length) / activeBefore.length) * 100
    : activeNow.length > 0 ? 100 : 0

  // Orders calculation
  const ordersChange = yesterdayOrders.length > 0
    ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100
    : todayOrders.length > 0 ? 100 : 0

  // Products
  const outOfStockCount = allProducts.filter((p: any) => !p.inStock || (p.stock ?? 0) <= 0).length
  const lowStockProducts = allProducts
    .filter((p: any) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10)
    .slice(0, 10) as unknown as Product[]

  return {
    totalRevenue: todayRevenue,
    totalRevenueChange: Number(revenueChange.toFixed(1)),
    newCustomers: todayUsers.length,
    newCustomersChange: Number(customerChange.toFixed(1)),
    activeAccounts: activeNow.length,
    activeAccountsChange: Number(activeChange.toFixed(1)),
    totalOrders: todayOrders.length,
    totalOrdersChange: Number(ordersChange.toFixed(1)),
    totalProducts: allProducts.length,
    outOfStockCount,
    lowStockProducts,
    recentOrders: (recentOrdersList as any).items as Order[],
  }
}

// ==================== Products API ====================
export async function fetchProducts(page = 1, perPage = 20, filter = "") {
  return pb.collection("products").getList<Product>(page, perPage, {
    filter,
    sort: "-created",
  })
}

export async function fetchProduct(id: string) {
  return pb.collection("products").getOne<Product>(id)
}

export async function createProduct(data: FormData) {
  return pb.collection("products").create<Product>(data)
}

export async function updateProduct(id: string, data: FormData) {
  return pb.collection("products").update<Product>(id, data)
}

export async function deleteProduct(id: string) {
  return pb.collection("products").delete(id)
}

// ==================== Product SKU API ====================
export async function fetchProductSkus(productId: string) {
  return pb.collection("product_skus").getFullList<ProductSku>({
    filter: `product_id = "${productId}"`,
    sort: "-created",
  })
}

export async function createProductSku(data: Partial<ProductSku>) {
  return pb.collection("product_skus").create<ProductSku>(data)
}

export async function updateProductSku(id: string, data: Partial<ProductSku>) {
  return pb.collection("product_skus").update<ProductSku>(id, data)
}

export async function deleteProductSku(id: string) {
  return pb.collection("product_skus").delete(id)
}

export async function batchCreateSkus(skus: Partial<ProductSku>[]) {
  return Promise.all(skus.map((sku) => createProductSku(sku)))
}

export async function batchDeleteSkus(ids: string[]) {
  return Promise.all(ids.map((id) => deleteProductSku(id)))
}

// ==================== Category API ====================
export async function fetchCategories() {
  return pb.collection("category").getFullList<Category>({ sort: "sort_order,name" })
}

export async function createCategory(data: Partial<Category>) {
  return pb.collection("category").create<Category>(data)
}

export async function updateCategory(id: string, data: Partial<Category>) {
  return pb.collection("category").update<Category>(id, data)
}

export async function deleteCategory(id: string) {
  return pb.collection("category").delete(id)
}

// ==================== Brand API ====================
export async function fetchBrands() {
  return pb.collection("brands").getFullList<Brand>({ sort: "name" })
}

export async function createBrand(data: Partial<Brand> | FormData) {
  return pb.collection("brands").create<Brand>(data)
}

export async function updateBrand(id: string, data: Partial<Brand> | FormData) {
  return pb.collection("brands").update<Brand>(id, data)
}

export async function deleteBrand(id: string) {
  return pb.collection("brands").delete(id)
}

// ==================== Orders API ====================
export async function fetchOrders(page = 1, perPage = 20, filter = "", sort = "-created") {
  return pb.collection("orders").getList<Order>(page, perPage, { filter, sort })
}

export async function fetchOrder(id: string) {
  return pb.collection("orders").getOne<Order>(id)
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, trackingNumber?: string) {
  const data: Record<string, any> = { status }
  if (trackingNumber) data.tracking_number = trackingNumber
  return pb.collection("orders").update<Order>(orderId, data)
}

export async function deleteOrder(id: string) {
  return pb.collection("orders").delete(id)
}

// ==================== Notifications API ====================
export async function fetchNotifications(userId: string, page = 1, perPage = 20) {
  return pb.collection("notifications").getList<Notification>(page, perPage, {
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
}) {
  return pb.collection("notifications").create<Notification>({
    ...data,
    isRead: false,
  })
}

export async function markNotificationRead(id: string) {
  return pb.collection("notifications").update<Notification>(id, { isRead: true })
}

export async function markAllNotificationsRead(userId: string) {
  const unread = await pb.collection("notifications").getFullList<Notification>({
    filter: `userId = "${userId}" && isRead = false`,
  })
  return Promise.all(unread.map((n) => markNotificationRead(n.id)))
}

export async function getUnreadNotificationCount(userId: string) {
  const result = await pb.collection("notifications").getList(1, 1, {
    filter: `userId = "${userId}" && isRead = false`,
  })
  return result.totalItems
}

// ==================== Users API ====================
export async function fetchUsers(page = 1, perPage = 20, filter = "") {
  return pb.collection("users").getList<User>(page, perPage, { filter, sort: "-created" })
}

export async function fetchUser(id: string) {
  return pb.collection("users").getOne<User>(id)
}

export async function updateUser(id: string, data: Partial<User>) {
  return pb.collection("users").update<User>(id, data)
}

export async function deleteUser(id: string) {
  return pb.collection("users").delete(id)
}

// ==================== File URL Helper ====================
export function getFileUrl(record: any, filename: string) {
  return pb.files.getURL(record, filename)
}
