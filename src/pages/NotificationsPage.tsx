import { useEffect, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ExternalLink,
  ShoppingCart,
  Tag,
  Settings,
  CreditCard,
  Star,
  User,
} from "lucide-react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import type { Notification, NotificationType } from "@/types"

const typeConfig: Record<
  NotificationType,
  { icon: React.ReactNode; color: string; label: string }
> = {
  order: {
    icon: <ShoppingCart className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    label: "Order",
  },
  promotion: {
    icon: <Tag className="h-4 w-4" />,
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    label: "Promotion",
  },
  system: {
    icon: <Settings className="h-4 w-4" />,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    label: "System",
  },
  payment: {
    icon: <CreditCard className="h-4 w-4" />,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    label: "Payment",
  },
  review: {
    icon: <Star className="h-4 w-4" />,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    label: "Review",
  },
  account: {
    icon: <User className="h-4 w-4" />,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    label: "Account",
  },
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    if (user?.id) loadNotifications()
  }, [user?.id])

  const loadNotifications = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const result = await fetchNotifications(user.id, 1, 100)
      setNotifications(result.items)
    } catch (error) {
      console.error("Failed to load notifications:", error)
      toast.error("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
    } catch {
      toast.error("Failed to mark as read")
    }
  }

  const handleMarkAllRead = async () => {
    if (!user?.id) return
    try {
      await markAllNotificationsRead(user.id)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      toast.success("All notifications marked as read")
    } catch {
      toast.error("Failed to mark all as read")
    }
  }

  const handleClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkRead(notification.id)
    }
    if (notification.link) {
      navigate(notification.link)
    }
  }

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !n.isRead
    return n.type === activeTab
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1">
            All
            <Badge variant="secondary" className="ml-1 text-xs">
              {notifications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-1">
            Unread
            {unreadCount > 0 && (
              <Badge className="ml-1 text-xs bg-red-500">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="order">Orders</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-lg">No notifications</p>
                  <p className="text-muted-foreground text-sm">
                    You're all caught up!
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => {
                    const config = typeConfig[notification.type] || typeConfig.system
                    return (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-4 p-4 hover:bg-accent/50 transition-colors cursor-pointer ${
                          !notification.isRead ? "bg-accent/20" : ""
                        }`}
                        onClick={() => handleClick(notification)}
                      >
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${config.color}`}
                        >
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`font-medium text-sm truncate ${
                                !notification.isRead ? "font-bold" : ""
                              }`}
                            >
                              {notification.title}
                            </h4>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {config.label}
                            </Badge>
                            {!notification.isRead && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.content}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(notification.created), "yyyy-MM-dd HH:mm")}
                            </span>
                            {notification.link && (
                              <span className="text-xs text-primary flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                View Details
                              </span>
                            )}
                            {notification.extra && (
                              <span className="text-xs text-muted-foreground">
                                {notification.extra.oldStatus && (
                                  <>
                                    {notification.extra.oldStatus} &rarr;{" "}
                                    {notification.extra.newStatus}
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkRead(notification.id)
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
