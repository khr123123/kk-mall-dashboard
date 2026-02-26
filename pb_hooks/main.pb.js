// ==========================================
// PocketBase Hooks - Order Status Change Notification
// ==========================================
// File: pb_hooks/main.pb.js
// Place this file in your PocketBase `pb_hooks` directory
// PocketBase will automatically load and execute it on startup
//
// This hook listens for order status updates and automatically
// creates a notification record when the status changes.
// ==========================================

/// <reference path="../pb_data/types.d.ts" />

// ---- After Update Hook on "orders" collection ----
onRecordAfterUpdateRequest((e) => {
  const record = e.record
  const oldRecord = record.originalCopy()

  const oldStatus = oldRecord.get("status")
  const newStatus = record.get("status")

  // Only trigger if status actually changed
  if (oldStatus === newStatus) {
    return
  }

  const userId = record.get("user")
  const orderNumber = record.get("order_number")
  const orderId = record.id

  // Status label mapping
  const statusLabels = {
    pending: "Pending",
    paid: "Paid",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
  }

  const oldLabel = statusLabels[oldStatus] || oldStatus
  const newLabel = statusLabels[newStatus] || newStatus

  // Build notification data
  const title = `Order #${orderNumber} status updated`
  const content = `Your order #${orderNumber} status changed from "${oldLabel}" to "${newLabel}".`
  const link = `/orders`
  const extra = JSON.stringify({
    orderId: orderId,
    orderNumber: orderNumber,
    oldStatus: oldStatus,
    newStatus: newStatus,
  })

  // Create notification record
  try {
    const notificationsCollection = $app.findCollectionByNameOrId("notifications")

    const notification = new Record(notificationsCollection)
    notification.set("userId", userId)
    notification.set("title", title)
    notification.set("content", content)
    notification.set("type", "order")
    notification.set("isRead", false)
    notification.set("link", link)
    notification.set("extra", extra)

    $app.save(notification)

    console.log(
      `[Hook] Notification created for order ${orderNumber}: ${oldStatus} -> ${newStatus}`
    )
  } catch (err) {
    console.error(`[Hook] Failed to create notification for order ${orderNumber}:`, err)
  }
}, "orders")


// ---- Optional: After Create Hook on "orders" for new order notification ----
onRecordAfterCreateRequest((e) => {
  const record = e.record
  const userId = record.get("user")
  const orderNumber = record.get("order_number")
  const totalAmount = record.get("total_amount")

  try {
    const notificationsCollection = $app.findCollectionByNameOrId("notifications")

    const notification = new Record(notificationsCollection)
    notification.set("userId", userId)
    notification.set("title", `New order #${orderNumber} placed`)
    notification.set(
      "content",
      `Your order #${orderNumber} has been placed successfully. Total: $${totalAmount}`
    )
    notification.set("type", "order")
    notification.set("isRead", false)
    notification.set("link", `/orders`)
    notification.set(
      "extra",
      JSON.stringify({
        orderId: record.id,
        orderNumber: orderNumber,
        action: "created",
        totalAmount: totalAmount,
      })
    )

    $app.save(notification)

    console.log(`[Hook] New order notification created for order ${orderNumber}`)
  } catch (err) {
    console.error(`[Hook] Failed to create new order notification:`, err)
  }
}, "orders")

// ---- Low Stock Alert Hook ----
onRecordAfterUpdateRequest((e) => {
  const record = e.record
  const stock = record.get("stock")
  const name = record.get("name")

  // Alert when stock drops to 5 or below
  if (stock !== undefined && stock <= 5 && stock >= 0) {
    try {
      const notificationsCollection = $app.findCollectionByNameOrId("notifications")

      // Get all admin users to notify (you can customize this)
      const admins = $app.findRecordsByFilter(
        "users",
        "role = 'admin'",
        "",
        1,
        0
      )

      for (const admin of admins) {
        const notification = new Record(notificationsCollection)
        notification.set("userId", admin.id)
        notification.set("title", `Low stock alert: ${name}`)
        notification.set(
          "content",
          `Product "${name}" has only ${stock} items left in stock.`
        )
        notification.set("type", "system")
        notification.set("isRead", false)
        notification.set("link", `/products`)
        notification.set(
          "extra",
          JSON.stringify({
            productId: record.id,
            productName: name,
            currentStock: stock,
            alertType: "low_stock",
          })
        )

        $app.save(notification)
      }

      console.log(`[Hook] Low stock alert created for product "${name}" (stock: ${stock})`)
    } catch (err) {
      console.error(`[Hook] Failed to create low stock alert:`, err)
    }
  }
}, "products")
