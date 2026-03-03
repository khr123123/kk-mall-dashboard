/**
 * NotificationsPage — Message Notification Center
 *
 * Improvements:
 * - PageLayout + PageHeader for consistency
 * - ARIA live regions for unread count updates
 * - MessageCard uses semantic icon colours + text (not colour-only)
 * - formatDateTime from i18n module
 * - Accessible tab panel focus management
 */

import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
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
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageLayout, PageHeader, EmptyState } from "@/components/layout"
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchMessages,
  markMessageRead,
  markAllMessagesRead,
  deleteMessage,
} from "@/lib/api"
import { MESSAGE_TYPE_I18N } from "@/lib/i18n"
import { useAuthStore } from "@/stores/authStore"
import type { Message, MessageType, Notification } from "@/types"

// ── Type config ───────────────────────────────────────────────
const TYPE_CONFIG: Record<
  MessageType,
  { icon: React.ReactNode; color: string; label: string; bgColor: string }
> = {
  order_status: {
    icon: <ShoppingCart className="h-4 w-4" aria-hidden="true" />,
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    label: MESSAGE_TYPE_I18N.order_status,
  },
  order_created: {
    icon: <Package className="h-4 w-4" aria-hidden="true" />,
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: MESSAGE_TYPE_I18N.order_created,
  },
  low_stock: {
    icon: <Package className="h-4 w-4" aria-hidden="true" />,
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    label: MESSAGE_TYPE_I18N.low_stock,
  },
  system: {
    icon: <Settings className="h-4 w-4" aria-hidden="true" />,
    color: "text-gray-700 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
    label: MESSAGE_TYPE_I18N.system,
  },
  promotion: {
    icon: <Tag className="h-4 w-4" aria-hidden="true" />,
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: MESSAGE_TYPE_I18N.promotion,
  },
  payment: {
    icon: <CreditCard className="h-4 w-4" aria-hidden="true" />,
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    label: MESSAGE_TYPE_I18N.payment,
  },
  review: {
    icon: <Star className="h-4 w-4" aria-hidden="true" />,
    color: "text-yellow-700 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    label: MESSAGE_TYPE_I18N.review,
  },
  account: {
    icon: <User className="h-4 w-4" aria-hidden="true" />,
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    label: MESSAGE_TYPE_I18N.account,
  },
}

// ── MessageCard ───────────────────────────────────────────────
interface MessageCardProps {
  message: Message
  onRead: (id: string) => void
  onDelete?: (id: string) => void
  onClick?: () => void
}

function MessageCard({ message, onRead, onDelete, onClick }: MessageCardProps) {
  const cfg = TYPE_CONFIG[message.type] ?? TYPE_CONFIG.system
  const timeAgo = formatDistanceToNow(new Date(message.created), {
    locale: zhCN,
    addSuffix: true,
  })

  return (
    <article
      className={`flex gap-3 p-4 rounded-xl border transition-colors cursor-pointer hover:bg-accent/50
        ${!message.is_read ? "bg-blue-50/40 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30" : "border-transparent"}`}
      onClick={() => {
        if (!message.is_read) onRead(message.id)
        onClick?.()
      }}
      aria-label={`${cfg.label}：${message.title}${!message.is_read ? "（未读）" : ""}`}
    >
      {/* Icon */}
      <div
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${cfg.bgColor} ${cfg.color}`}
        aria-hidden="true"
      >
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-semibold ${
                !message.is_read ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {message.title}
            </span>
            <Badge
              variant="outline"
              className={`text-xs ${cfg.bgColor} ${cfg.color} border-0 px-1.5`}
            >
              {cfg.label}
            </Badge>
            {!message.is_read && (
              <span
                className="inline-block w-2 h-2 rounded-full bg-blue-500"
                aria-label="未读"
              />
            )}
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(message.id)
              }}
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              aria-label={`删除消息：${message.title}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {message.content}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <time dateTime={message.created}>{timeAgo}</time>
          {message.link && (
            <span className="flex items-center gap-0.5 text-blue-500">
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              点击查看
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

// ── NotificationsPage ─────────────────────────────────────────
export default function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [messages, setMessages]     = useState<Message[]>([])
  const [msgLoading, setMsgLoading] = useState(true)
  const [activeTab, setActiveTab]   = useState("all")
  const [polling, setPolling]       = useState(true)
  const [lastPolled, setLastPolled] = useState<Date | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadMessages = async () => {
    if (!user?.id) return
    try {
      const result = await fetchMessages(user.id, 1, 100)
      setMessages(result.items)
      setLastPolled(new Date())
    } catch {
      await loadLegacyNotifications()
    } finally {
      setMsgLoading(false)
    }
  }

  const loadLegacyNotifications = async () => {
    if (!user?.id) return
    try {
      const result = await fetchNotifications(user.id, 1, 100)
      const converted: Message[] = result.items.map((n: Notification) => ({
        ...n,
        user: n.userId,
        is_read: n.isRead,
        type: n.type as MessageType,
      }))
      setMessages(converted)
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (user?.id) loadMessages()
  }, [user?.id])

  useEffect(() => {
    if (!polling || !user?.id) return
    pollingRef.current = setInterval(() => loadMessages(), 15_000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [polling, user?.id])

  const handleMarkRead = async (id: string) => {
    try {
      try { await markMessageRead(id) } catch { await markNotificationRead(id) }
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)))
    } catch { /* silent */ }
  }

  const handleMarkAllRead = async () => {
    if (!user?.id) return
    try {
      try { await markAllMessagesRead(user.id) } catch { await markAllNotificationsRead(user.id) }
      setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })))
      toast.success("已全部标记为已读")
    } catch {
      toast.error("操作失败")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMessage(id)
      setMessages((prev) => prev.filter((m) => m.id !== id))
      toast.success("消息已删除")
    } catch {
      toast.error("删除失败")
    }
  }

  const handleMessageClick = (msg: Message) => {
    if (msg.link) navigate(msg.link)
  }

  const filteredMessages = messages.filter((m) => {
    if (activeTab === "all")    return true
    if (activeTab === "unread") return !m.is_read
    return m.type === activeTab
  })

  const unreadCount = messages.filter((m) => !m.is_read).length
  const typeCounts  = messages.reduce(
    (acc, m) => { acc[m.type] = (acc[m.type] || 0) + 1; return acc },
    {} as Record<string, number>
  )

  if (msgLoading) {
    return (
      <PageLayout>
        <div className="space-y-3" role="status" aria-label="加载消息通知…">
          <Skeleton className="h-8 w-48" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="消息通知中心"
        icon={<Bell className="h-6 w-6" />}
        description={
          <span aria-live="polite">
            {unreadCount > 0 ? `您有 ${unreadCount} 条未读消息` : "所有消息均已读"}
            {lastPolled && (
              <span className="ml-2 text-xs">
                · 最后更新 {format(lastPolled, "HH:mm:ss")}
              </span>
            )}
          </span>
        }
        actions={
          <>
            <Button
              variant={polling ? "default" : "outline"}
              size="sm"
              onClick={() => setPolling(!polling)}
              className="gap-1.5"
              aria-pressed={polling}
              aria-label={polling ? "关闭自动轮询" : "开启自动轮询（每 15 秒）"}
            >
              <RefreshCw
                className={`h-4 w-4 ${polling ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              {polling ? "轮询中（15s）" : "开启轮询"}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className="gap-1.5"
                aria-label={`全部标记为已读（共 ${unreadCount} 条未读）`}
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                全部已读
              </Button>
            )}
          </>
        }
      />

      {/* Quick type stats */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        role="group"
        aria-label="消息类型统计"
      >
        {(["order_status","order_created","low_stock","system"] as MessageType[]).map((type) => {
          const cfg   = TYPE_CONFIG[type]
          const count = typeCounts[type] || 0
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all ${cfg.bgColor}
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left`}
              aria-label={`筛选${cfg.label}，共 ${count} 条`}
              aria-pressed={activeTab === type}
            >
              <div className={`flex items-center gap-2 ${cfg.color}`}>
                {cfg.icon}
                <span className="text-xs font-medium">{cfg.label}</span>
              </div>
              <p className={`text-2xl font-bold mt-1 tabular-nums ${cfg.color}`} aria-hidden="true">
                {count}
              </p>
            </button>
          )
        })}
      </div>

      {/* Tabs + message list */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto" aria-label="消息筛选标签">
          {[
            { value: "all",          label: "全部",     count: messages.length },
            { value: "unread",       label: "未读",     count: unreadCount, highlight: true },
            { value: "order_status", label: "订单状态", count: typeCounts.order_status },
            { value: "order_created",label: "新订单",   count: typeCounts.order_created },
            { value: "low_stock",    label: "库存预警", count: typeCounts.low_stock },
            { value: "system",       label: "系统",     count: typeCounts.system },
          ].map(({ value, label, count, highlight }) => (
            <TabsTrigger key={value} value={value} className="gap-1">
              {label}
              {count != null && count > 0 && (
                <Badge
                  className={`text-xs ml-1 ${highlight ? "bg-blue-500 text-white" : ""}`}
                  variant={highlight ? "default" : "secondary"}
                >
                  {count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
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
                    : TYPE_CONFIG[activeTab as MessageType]?.label ?? activeTab}
                  （{filteredMessages.length}）
                </span>
                {filteredMessages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMessages}
                    className="gap-1 text-xs"
                    aria-label="刷新消息列表"
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    刷新
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredMessages.length === 0 ? (
                <EmptyState
                  icon={<BellOff className="h-12 w-12" />}
                  title="暂无消息"
                  description={
                    activeTab === "unread" ? "所有消息都已读完啦！" : "当前分类没有消息"
                  }
                />
              ) : (
                <div
                  className="divide-y"
                  role="list"
                  aria-label={`${filteredMessages.length} 条消息`}
                  aria-live="polite"
                >
                  {filteredMessages.map((msg) => (
                    <div key={msg.id} className="px-4 py-1" role="listitem">
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

      {/* System note */}
      <aside
        className="text-xs text-muted-foreground flex items-start gap-2 p-3 bg-muted/40 rounded-xl"
        aria-label="通知系统说明"
      >
        <RefreshCw className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          通知系统支持
          <strong className="mx-1">前端轮询（每 15 秒自动刷新）</strong>
          与
          <strong className="mx-1">PocketBase Hook 服务端推送</strong>
          两种模式。生产环境可升级为 WebSocket 实时推送。
        </p>
      </aside>
    </PageLayout>
  )
}
