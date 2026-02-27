// ==================== PocketBase 数据类型定义 ====================
// 所有类型严格对应 PocketBase 表结构
// Category.children 不存数据库，由前端通过 parent 字段自动构建树结构

// ---- Base Record ----
export interface BaseRecord {
  id: string
  created: string
  updated: string
}

// ---- Users ----
export interface User extends BaseRecord {
  email: string
  name: string
  avatar?: string
  phone?: string
  role?: "admin" | "user" | "staff"
  verified?: boolean
}

// ---- Category ----
// ⚠️ 重要：children 字段不存在于数据库！
// category 表有 parent 字段（relation, self-reference）
// children 树结构在前端通过 buildCategoryTree() 构建
export interface Category extends BaseRecord {
  name: string
  icon?: string
  parent?: string          // relation → category.id（自引用）
  sort_order?: number
  expand?: {
    parent?: Category      // PocketBase expand 自动填充
  }
}

// 前端树结构（不存库）
export interface CategoryNode extends Category {
  children: CategoryNode[] // 前端构建，非数据库字段
}

// ---- Brands ----
export interface Brand extends BaseRecord {
  name: string
  logo?: string
  description?: string
  isPopular?: boolean
  rating?: number
  website?: string
}

// ---- Products ----
export interface Product extends BaseRecord {
  name: string
  description?: string
  price: number
  originalPrice?: number
  discount?: number
  rating?: number
  image?: string           // 主图文件名
  images?: string[]        // 多图文件名数组
  isNew?: boolean
  isHot?: boolean
  inStock?: boolean
  stock?: number
  brand?: string           // relation → brands.id
  category_id?: string     // relation → category.id
  tags?: string[]          // JSON array
  specs?: Record<string, string>  // JSON object，商品通用规格
}

// ---- Product SKU ----
export interface ProductSku extends BaseRecord {
  product_id: string       // relation → products.id
  specs: Record<string, string>  // JSON: { "颜色": "红色", "尺寸": "XL" }
  price: number
  stock: number
  status: boolean
  sku_code?: string
}

// ---- Address ----
export interface Address extends BaseRecord {
  user: string             // relation → users.id
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  is_default?: boolean
}

// ---- Cart Items ----
export interface CartItem extends BaseRecord {
  user: string             // relation → users.id
  product: string          // relation → products.id
  sku?: string             // relation → product_skus.id
  quantity: number
  selected?: boolean
  expand?: {
    product?: Product
    sku?: ProductSku
  }
}

// ---- Orders ----
export type OrderStatus =
  | "pending"
  | "processing"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "待付款",
  processing: "处理中",
  paid: "已付款",
  shipped: "已发货",
  delivered: "已收货",
  cancelled: "已取消",
  refunded: "已退款",
}

export interface OrderItem extends BaseRecord {
  order: string            // relation → orders.id
  product: string          // relation → products.id
  sku?: string             // relation → product_skus.id
  quantity: number
  price: number
  specs?: Record<string, string>
  expand?: {
    product?: Product
    sku?: ProductSku
  }
}

export interface Order extends BaseRecord {
  order_number: string
  user: string             // relation → users.id
  status: OrderStatus
  total_amount: number
  items_count: number
  items?: OrderItem[]      // 前端 expand 填充
  order_date: string
  payment_method: string
  payment_id?: string
  address: string          // JSON 快照或 relation
  tracking_number?: string
  notes?: string
  expand?: {
    user?: User
  }
}

// ---- Messages（消息通知表）----
export type MessageType =
  | "order_status"         // 订单状态变更
  | "order_created"        // 新订单创建
  | "low_stock"            // 库存预警
  | "system"               // 系统通知
  | "promotion"            // 促销通知
  | "payment"              // 支付通知
  | "review"               // 评论通知
  | "account"              // 账号通知

export interface Message extends BaseRecord {
  user: string             // relation → users.id（消息接收者）
  title: string
  content: string
  type: MessageType
  is_read: boolean
  link?: string            // 前端跳转路径
  extra?: Record<string, any>  // JSON 扩展数据
  order_id?: string        // relation → orders.id（可选关联）
}

// ---- Payments ----
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded"
export type PaymentMethod = "alipay" | "wechat" | "creditcard" | "cod" | "other"

export interface Payment extends BaseRecord {
  order_id: string         // relation → orders.id
  user: string             // relation → users.id
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  transaction_id?: string
  paid_at?: string
  refunded_at?: string
  notes?: string
}

// ---- Dashboard Stats ----
export interface DashboardStats {
  // 今日
  todayRevenue: number
  todayOrders: number
  todayRevenueChange: number  // 环比昨日 %
  todayOrdersChange: number

  // 本月
  monthRevenue: number
  monthOrders: number

  // 用户
  totalUsers: number
  newUsersToday: number
  newUsersTodayChange: number

  // 活跃账户
  activeAccounts: number
  activeAccountsChange: number

  // 商品
  totalProducts: number
  outOfStockCount: number
  lowStockProducts: Product[]

  // 订单状态统计
  orderStatusStats: Record<OrderStatus, number>

  // 热门商品
  topProducts: Product[]

  // 最近订单
  recentOrders: Order[]
}

// ---- API Response ----
export interface ListResponse<T> {
  items: T[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export interface ApiError {
  code: number
  message: string
  data?: Record<string, any>
}

// ---- Notifications (保持向后兼容) ----
export type NotificationType = MessageType

export interface Notification extends BaseRecord {
  userId: string
  title: string
  content: string
  type: NotificationType
  isRead: boolean
  link?: string
  extra?: Record<string, any>
}
