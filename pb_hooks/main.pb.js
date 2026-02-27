// ==========================================
// PocketBase Hooks - 订单状态变更 & 消息通知
// ==========================================
// 文件路径：pb_hooks/main.pb.js
// 将此文件放在 PocketBase 的 pb_hooks 目录下
// PocketBase 启动时会自动加载并执行
//
// 功能：
// 1. 订单状态变更时，自动创建 messages 表记录（通知买家）
// 2. 新订单创建时，通知买家和管理员
// 3. 商品库存降至 5 以下时，通知管理员（低库存预警）
// ==========================================

/// <reference path="../pb_data/types.d.ts" />

// ==================== 常量 ====================
const COLLECTIONS = {
  ORDERS: "orders",
  PRODUCTS: "products",
  USERS: "users",
  MESSAGES: "messages",
  NOTIFICATIONS: "notifications", // 兼容旧表
}

const ORDER_STATUS_LABELS = {
  pending: "待付款",
  processing: "处理中",
  paid: "已付款",
  shipped: "已发货",
  delivered: "已收货",
  cancelled: "已取消",
  refunded: "已退款",
}

// ==================== 工具函数 ====================

/**
 * 安全写入消息（优先写 messages 表，失败则降级到 notifications 表）
 */
function safeCreateMessage(app, data) {
  try {
    const col = app.findCollectionByNameOrId(COLLECTIONS.MESSAGES)
    const record = new Record(col)
    record.set("user", data.user)
    record.set("title", data.title)
    record.set("content", data.content)
    record.set("type", data.type)
    record.set("is_read", false)
    if (data.link) record.set("link", data.link)
    if (data.order_id) record.set("order_id", data.order_id)
    if (data.extra) record.set("extra", JSON.stringify(data.extra))
    app.save(record)
    return record
  } catch (err1) {
    console.log("[Hook] messages 表写入失败，尝试 notifications 表:", err1.message)
    // 降级：写入旧 notifications 表
    try {
      const col = app.findCollectionByNameOrId(COLLECTIONS.NOTIFICATIONS)
      const record = new Record(col)
      record.set("userId", data.user)
      record.set("title", data.title)
      record.set("content", data.content)
      record.set("type", data.type)
      record.set("isRead", false)
      if (data.link) record.set("link", data.link)
      if (data.extra) record.set("extra", JSON.stringify(data.extra))
      app.save(record)
      return record
    } catch (err2) {
      console.error("[Hook] 消息写入全部失败:", err2.message)
      return null
    }
  }
}

/**
 * 获取管理员用户列表（role = 'admin'）
 */
function getAdminUsers(app) {
  try {
    return app.findRecordsByFilter(COLLECTIONS.USERS, "role = 'admin'", "", 10, 0)
  } catch {
    return []
  }
}

// ==================== Hook 1：订单状态变更通知 ====================
onRecordAfterUpdateRequest((e) => {
  const record = e.record
  const oldRecord = record.originalCopy()

  const oldStatus = oldRecord.get("status")
  const newStatus = record.get("status")

  // 仅在状态发生变化时触发
  if (oldStatus === newStatus) {
    return
  }

  const userId = record.get("user")
  const orderNumber = record.get("order_number")
  const orderId = record.id

  const oldLabel = ORDER_STATUS_LABELS[oldStatus] || oldStatus
  const newLabel = ORDER_STATUS_LABELS[newStatus] || newStatus

  const title = `订单 #${orderNumber} 状态已更新`
  const content = `您的订单 #${orderNumber} 状态从「${oldLabel}」变更为「${newLabel}」`

  // 额外信息根据新状态定制
  let extraContent = content
  if (newStatus === "shipped") {
    const trackingNumber = record.get("tracking_number")
    if (trackingNumber) {
      extraContent += `，快递单号：${trackingNumber}`
    }
  } else if (newStatus === "delivered") {
    extraContent += "，如有问题请联系客服"
  } else if (newStatus === "cancelled") {
    extraContent += "，如有疑问请联系客服"
  }

  const result = safeCreateMessage($app, {
    user: userId,
    title: title,
    content: extraContent,
    type: "order_status",
    link: "/orders",
    order_id: orderId,
    extra: {
      orderId: orderId,
      orderNumber: orderNumber,
      oldStatus: oldStatus,
      newStatus: newStatus,
    },
  })

  if (result) {
    console.log(`[Hook] ✅ 订单 #${orderNumber} 状态变更通知已创建：${oldStatus} → ${newStatus}`)
  }
}, COLLECTIONS.ORDERS)

// ==================== Hook 2：新订单创建通知 ====================
onRecordAfterCreateRequest((e) => {
  const record = e.record
  const userId = record.get("user")
  const orderNumber = record.get("order_number")
  const totalAmount = record.get("total_amount")
  const orderId = record.id

  // 通知买家
  if (userId) {
    safeCreateMessage($app, {
      user: userId,
      title: `订单 #${orderNumber} 创建成功`,
      content: `您的订单 #${orderNumber} 已成功提交，总金额 ¥${totalAmount}，请及时完成付款。`,
      type: "order_created",
      link: "/orders",
      order_id: orderId,
      extra: {
        orderId: orderId,
        orderNumber: orderNumber,
        action: "created",
        totalAmount: totalAmount,
      },
    })
    console.log(`[Hook] ✅ 新订单 #${orderNumber} 用户通知已创建`)
  }

  // 通知管理员
  const admins = getAdminUsers($app)
  for (const admin of admins) {
    if (admin.id === userId) continue // 跳过自己
    safeCreateMessage($app, {
      user: admin.id,
      title: `📦 新订单提醒：#${orderNumber}`,
      content: `有新订单 #${orderNumber} 等待处理，总金额 ¥${totalAmount}。`,
      type: "order_created",
      link: "/orders",
      order_id: orderId,
      extra: {
        orderId: orderId,
        orderNumber: orderNumber,
        action: "new_order_admin",
        totalAmount: totalAmount,
      },
    })
  }
}, COLLECTIONS.ORDERS)

// ==================== Hook 3：商品低库存预警 ====================
onRecordAfterUpdateRequest((e) => {
  const record = e.record
  const oldRecord = record.originalCopy()

  const newStock = record.get("stock")
  const oldStock = oldRecord.get("stock")
  const productName = record.get("name")
  const productId = record.id

  // 仅在库存从大于5变为小于等于5时触发（防止频繁通知）
  if (
    newStock === undefined ||
    oldStock === undefined ||
    newStock > 5 ||
    oldStock <= 5 // 已经是低库存，不重复通知
  ) {
    return
  }

  const admins = getAdminUsers($app)
  for (const admin of admins) {
    const level = newStock <= 0 ? "🚫 缺货" : newStock <= 2 ? "⚠️ 严重低库存" : "⚠️ 库存不足"
    safeCreateMessage($app, {
      user: admin.id,
      title: `${level}：${productName}`,
      content: `商品「${productName}」当前库存为 ${newStock} 件，请及时补货。`,
      type: "low_stock",
      link: "/products",
      extra: {
        productId: productId,
        productName: productName,
        oldStock: oldStock,
        newStock: newStock,
        alertType: "low_stock",
      },
    })
  }

  if (admins.length > 0) {
    console.log(`[Hook] ✅ 商品「${productName}」低库存预警已发送（库存：${newStock}）`)
  }
}, COLLECTIONS.PRODUCTS)

// ==================== Hook 4：用户注册欢迎通知 ====================
onRecordAfterCreateRequest((e) => {
  const record = e.record
  const userId = record.id
  const userName = record.get("name") || record.get("email") || "用户"

  safeCreateMessage($app, {
    user: userId,
    title: "欢迎加入 K Mall！",
    content: `亲爱的 ${userName}，欢迎您注册成为 K Mall 会员！开始探索精选商品吧。`,
    type: "account",
    link: "/",
    extra: {
      action: "welcome",
    },
  })

  console.log(`[Hook] ✅ 新用户 ${userName} 欢迎消息已创建`)
}, COLLECTIONS.USERS)
