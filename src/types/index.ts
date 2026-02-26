// ==================== PocketBase Table Types ====================

// ---- Users ----
export interface User {
  id: string
  email: string
  name: string
  avatar: string
  phone?: string
  role?: string
  created: string
  updated: string
}

// ---- Category ----
export interface Category {
  id: string
  name: string
  icon?: string
  parent?: string
  children?: string[]
  sort_order?: number
  created: string
  updated: string
}

// ---- Brands ----
export interface Brand {
  id: string
  name: string
  logo?: string
  description?: string
  isPopular?: boolean
  rating?: number
  website?: string
  created: string
  updated: string
}

// ---- Products ----
export interface Product {
  id: string
  name: string
  description?: string
  price: number
  originalPrice?: number
  discount?: number
  rating?: number
  image?: string
  images?: string[]
  isNew?: boolean
  isHot?: boolean
  inStock?: boolean
  stock?: number
  brand?: string
  category_id?: string
  tags?: string[]
  created: string
  updated: string
}

// ---- Product SKU ----
export interface ProductSku {
  id: string
  product_id: string
  specs: Record<string, string>
  price: number
  stock: number
  status: boolean
  sku_code?: string
  created: string
  updated: string
}

// ---- Orders ----
export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded"

export interface OrderItem {
  id: string
  quantity: number
  selected: boolean
  sku: string
  product: {
    id: string
    name: string
    price: number
    original_price: number
    image: string
    tags: string[]
    in_stock: boolean
  }
  skuInfo?: {
    id: string
    price: number
    stock: number
    status: boolean
    specs: Record<string, string>
  }
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
  notes?: string
  created: string
  updated: string
}

// ---- Notifications ----
export type NotificationType = "order" | "promotion" | "system" | "payment" | "review" | "account"

export interface Notification {
  id: string
  userId: string
  title: string
  content: string
  type: NotificationType
  isRead: boolean
  link?: string
  extra?: Record<string, any>
  created: string
  updated: string
}

// ---- Dashboard Stats ----
export interface DashboardStats {
  totalRevenue: number
  totalRevenueChange: number
  newCustomers: number
  newCustomersChange: number
  activeAccounts: number
  activeAccountsChange: number
  totalOrders: number
  totalOrdersChange: number
  totalProducts: number
  outOfStockCount: number
  lowStockProducts: Product[]
  recentOrders: Order[]
}

// ---- API List Response ----
export interface ListResponse<T> {
  items: T[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}
