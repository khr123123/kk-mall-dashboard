import { useEffect, useRef, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { toast } from "sonner"
import {
  Bell,
  BellOff,
  CheckCheck,
  CreditCard,
  ExternalLink,
  Package,
  RefreshCw,
  Settings,
  ShoppingCart,
  Star,
  Tag,
  Trash2,
  User,
} from "lucide-react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  // Message API
  fetchMessages,
  markMessageRead,
  markAllMessagesRead,
  deleteMessage,
} from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"
import type { Message, MessageType, Notification } from "@/types"

// ==================== 通知类型配置 ====================
const TYPE_CONFIG: Record<
  MessageType,
  { icon: React.ReactNode; color: string; label: string; bgColor: string }
> = {
  order_status: {
    icon: <ShoppingCart className="h-4 w-4" />,
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    label: "订单状态",
  },
  order_created: {
    icon: <Package className="h-4 w-4" />,
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: "新订单",
  },
  low_stock: {
    icon: <Package className="h-4 w-4" />,
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    label: "库存预警",
  },
  system: {
    icon: <Settings className="h-4 w-4" />,
    color: "text-gray-700 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
    label: "系统",
  },
  promotion: {
    icon: <Tag className="h-4 w-4" />,
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: "促销",
  },
  payment: {
    icon: <CreditCard className="h-4 w-4" />,
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    label: "支付",
  },
  review: {
    icon: <Star className="h-4 w-4" />,
    color: "text-yellow-700 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    label: "评价",
  },
  account: {
    icon: <User className="h-4 w-4" />,
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    label: "账号",
  },
}

// ==================== 消息卡片 ====================
interface MessageCardProps {
  message: Message
  onRead: (id: string) => void
  onDelete?: (id: string) => void
  onClick?: () => void
}

function MessageCard({ message, onRead, onDelete, onClick }: MessageCardProps) {
  const cfg = TYPE_CONFIG[message.type] || TYPE_CONFIG.system
  const timeAgo = formatDistanceToNow(new Date(message.created), {
    locale: zhCN,
    addSuffix: true,
  })

  return (
    <div
      className={`flex gap-3 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-accent/50 ${
        !message.is_read
          ? "bg-blue-50/40 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30"
          : ""
      }`}
      onClick={() => {
        if (!message.is_read) onRead(message.id)
        onClick?.()
      }}
    >
      {/* 图标 */}
      <div
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${cfg.bgColor} ${cfg.color}`}
      >
        {cfg.icon}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${!message.is_read ? "text-foreground" : "text-muted-foreground"}`}>
              {message.title}
            </span>
            <Badge
              variant="outline"
              className={`text-xs ${cfg.bgColor} ${cfg.color} border-0 px-1.5`}
            >
              {cfg.label}
            </Badge>
            {!message.is_read && (
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
            )}
          </div>
          {/* 删除按钮 */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(message.id)
              }}
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {message.content}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{timeAgo}</span>
          {message.link && (
            <span className="flex items-center gap-0.5 text-blue-500">
              <ExternalLink className="h-3 w-3" />
              点击查看
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== 主页面 ====================
export default function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // messages（新表，推荐使用）
  const [messages, setMessages] = useState<Message[]>([])
  const [msgLoading, setMsgLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [polling, setPolling] = useState(true)
  const [lastPolled, setLastPolled] = useState<Date | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── 加载消息 ──
  const loadMessages = async () => {
    if (!user?.id) return
    try {
      const result = await fetchMessages(user.id, 1, 100)
      setMessages(result.items)
      setLastPolled(new Date())
    } catch (err) {
      console.warn("Failed to load messages:", err)
      // 失败时尝试加载旧 notifications 表
      await loadLegacyNotifications()
    } finally {
      setMsgLoading(false)
    }
  }

  // 兼容旧 notifications 表（如果 messages 表不存在）
  const loadLegacyNotifications = async () => {
    if (!user?.id) return
    try {
      const result = await fetchNotifications(user.id, 1, 100)
      // 将 Notification 格式转为 Message 格式显示
      const converted: Message[] = result.items.map((n: Notification) => ({
        ...n,
        user: n.userId,
        is_read: n.isRead,
        type: n.type as MessageType,
      }))
      setMessages(converted)
    } catch {
      // 两个表都不存在，静默失败
    }
  }

  // 初始加载
  useEffect(() => {
    if (user?.id) {
      loadMessages()
    }
  }, [user?.id])

  // 轮询（每 15 秒拉取一次新消息）
  useEffect(() => {
    if (!polling || !user?.id) return

    pollingRef.current = setInterval(() => {
      loadMessages()
    }, 15_000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [polling, user?.id])

  // ── 标记已读 ──
  const handleMarkRead = async (id: string) => {
    try {
      // 尝试两个表
      try {
        await markMessageRead(id)
      } catch {
        await markNotificationRead(id)
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_read: true } : m))
      )
    } catch {
      // silent
    }
  }

  // ── 全部已读 ──
  const handleMarkAllRead = async () => {
    if (!user?.id) return
    try {
      try {
        await markAllMessagesRead(user.id)
      } catch {
        await markAllNotificationsRead(user.id)
      }
      setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })))
      toast.success("已全部标记为已读")
    } catch {
      toast.error("操作失败")
    }
  }

  // ── 删除消息 ──
  const handleDelete = async (id: string) => {
    try {
      await deleteMessage(id)
      setMessages((prev) => prev.filter((m) => m.id !== id))
      toast.success("消息已删除")
    } catch {
      toast.error("删除失败")
    }
  }

  // ── 点击消息 ──
  const handleMessageClick = (msg: Message) => {
    if (msg.link) {
      navigate(msg.link)
    }
  }

  // ── 过滤消息 ──
  const filteredMessages = messages.filter((m) => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !m.is_read
    return m.type === activeTab
  })

  const unreadCount = messages.filter((m) => !m.is_read).length

  // ── 按类型统计 ──
  const typeCounts = messages.reduce(
    (acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  if (msgLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8" />
            消息通知中心
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {unreadCount > 0
              ? `您有 ${unreadCount} 条未读消息`
              : "所有消息已读"}
            {lastPolled && (
              <span className="ml-2 text-xs">
                · 最后更新 {format(lastPolled, "HH:mm:ss")}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={polling ? "default" : "outline"}
            size="sm"
            onClick={() => setPolling(!polling)}
            className="gap-1.5"
          >
            <RefreshCw
              className={`h-4 w-4 ${polling ? "animate-spin" : ""}`}
            />
            {polling ? "轮询中（15s）" : "开启轮询"}
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              全部已读
            </Button>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["order_status", "order_created", "low_stock", "system"] as MessageType[]).map(
          (type) => {
            const cfg = TYPE_CONFIG[type]
            const count = typeCounts[type] || 0
            return (
              <div
                key={type}
                onClick={() => setActiveTab(type)}
                className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${cfg.bgColor}`}
              >
                <div className={`flex items-center gap-2 ${cfg.color}`}>
                  {cfg.icon}
                  <span className="text-xs font-medium">{cfg.label}</span>
                </div>
                <p className={`text-2xl font-bold mt-1 ${cfg.color}`}>{count}</p>
              </div>
            )
          }
        )}
      </div>

      {/* Tabs + 消息列表 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all" className="gap-1">
            全部
            <Badge variant="secondary" className="text-xs ml-1">
              {messages.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-1">
            未读
            {unreadCount > 0 && (
              <Badge className="text-xs ml-1 bg-blue-500">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="order_status">订单状态</TabsTrigger>
          <TabsTrigger value="order_created">新订单</TabsTrigger>
          <TabsTrigger value="low_stock">库存预警</TabsTrigger>
          <TabsTrigger value="system">系统</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>
                  {activeTab === "all"
                    ? "全部消息"
                    : activeTab === "unread"
                      ? "未读消息"
                      : TYPE_CONFIG[activeTab as MessageType]?.label || activeTab}
                  （{filteredMessages.length}）
                </span>
                {filteredMessages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMessages}
                    className="gap-1 text-xs"
                  >
                    <RefreshCw className="h-3 w-3" />
                    刷新
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <BellOff className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
                  <p className="text-muted-foreground">暂无消息</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {activeTab === "unread"
                      ? "所有消息都已读完啦！"
                      : "当前分类没有消息"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredMessages.map((msg) => (
                    <div key={msg.id} className="px-4 py-1">
                      <MessageCard
                        message={msg}
                        onRead={handleMarkRead}
                        onDelete={handleDelete}
                        onClick={() => handleMessageClick(msg)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 轮询说明 */}
      <div className="text-xs text-muted-foreground flex items-center gap-2 p-3 bg-muted/40 rounded-lg">
        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
        <p>
          通知系统支持两种模式：
          <strong className="mx-1">前端轮询（每 15 秒自动刷新）</strong>
          和
          <strong className="mx-1">PocketBase Hook 自动推送</strong>（订单状态变更时由服务端创建消息记录）。
          生产环境可升级为 WebSocket 实时推送。
        </p>
      </div>
    </div>
  )
}
