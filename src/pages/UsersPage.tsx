/**
 * UsersPage — User Management
 *
 * Improvements:
 * - Chinese labels throughout
 * - Role badge with semantic colours
 * - Date formatted with locale-aware formatDate
 * - Accessible dialogs with proper ARIA descriptions
 * - Select for role instead of free-text Input
 */

import { useEffect, useState } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { IconDotsVertical, IconEdit, IconEye, IconTrash } from "@tabler/icons-react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DataTableGeneric } from "@/components/data-table-generic"
import { PageLayout, PageHeader } from "@/components/layout"
import { formatDate, formatDateTime } from "@/lib/i18n"
import { fetchUsers, updateUser, deleteUser, getFileUrl } from "@/lib/api"
import type { User } from "@/types"

// ── Role badge ────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  admin: {
    label: "管理员",
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400",
  },
  staff: {
    label: "员工",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400",
  },
  user: {
    label: "用户",
    className: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400",
  },
}

function RoleBadge({ role }: { role?: string }) {
  const cfg = ROLE_CONFIG[role ?? "user"] ?? ROLE_CONFIG.user
  return (
    <Badge variant="outline" className={cfg.className} aria-label={`角色：${cfg.label}`}>
      {cfg.label}
    </Badge>
  )
}

// ── UsersPage ─────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers]               = useState<User[]>([])
  const [loading, setLoading]           = useState(true)
  const [searchQuery, setSearchQuery]   = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [detailOpen, setDetailOpen]     = useState(false)
  const [editOpen, setEditOpen]         = useState(false)
  const [editForm, setEditForm]         = useState({ name: "", email: "", role: "user" })
  const [editLoading, setEditLoading]   = useState(false)

  useEffect(() => { loadUsers() }, [searchQuery])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const filter = searchQuery
        ? `(name ~ "${searchQuery}" || email ~ "${searchQuery}")`
        : ""
      const result = await fetchUsers(1, 100, filter)
      setUsers(result.items)
    } catch {
      toast.error("用户数据加载失败")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此用户？此操作不可撤销。")) return
    try {
      await deleteUser(id)
      toast.success("用户已删除")
      loadUsers()
    } catch {
      toast.error("删除失败")
    }
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setEditForm({ name: user.name || "", email: user.email || "", role: user.role || "user" })
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return
    setEditLoading(true)
    try {
      await updateUser(selectedUser.id, {
        name: editForm.name,
        role: editForm.role as "admin" | "user" | "staff",
      })
      toast.success("用户信息已更新")
      setEditOpen(false)
      loadUsers()
    } catch {
      toast.error("更新失败")
    } finally {
      setEditLoading(false)
    }
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "avatar",
      header: () => <span className="sr-only">头像</span>,
      cell: ({ row }) => {
        const user = row.original
        const avatarUrl = user.avatar ? getFileUrl(user as any, user.avatar) : undefined
        const initials = (user.name || "U").charAt(0).toUpperCase()
        return (
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={`${user.name} 的头像`} />
            <AvatarFallback aria-hidden="true">{initials}</AvatarFallback>
          </Avatar>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: "姓名",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name || "—"}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "email",
      header: "邮箱",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "role",
      header: "角色",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
      enableSorting: true,
    },
    {
      accessorKey: "created",
      header: "注册时间",
      cell: ({ row }) => (
        <time
          className="text-sm tabular-nums"
          dateTime={row.original.created}
          aria-label={`注册时间：${formatDate(row.original.created)}`}
        >
          {formatDate(row.original.created)}
        </time>
      ),
      enableSorting: true,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">操作</span>,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={`用户「${row.original.name}」操作菜单`}
            >
              <IconDotsVertical aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => { setSelectedUser(row.original); setDetailOpen(true) }}
            >
              <IconEye className="mr-2 h-4 w-4" aria-hidden="true" />
              查看详情
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <IconEdit className="mr-2 h-4 w-4" aria-hidden="true" />
              编辑用户
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => handleDelete(row.original.id)}
            >
              <IconTrash className="mr-2 h-4 w-4" aria-hidden="true" />
              删除用户
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ]

  const toolbar = (
    <div className="toolbar">
      <div className="toolbar-search">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <Input
          placeholder="搜索姓名或邮箱…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          aria-label="搜索用户"
          type="search"
        />
      </div>
    </div>
  )

  return (
    <PageLayout>
      <PageHeader
        title="用户管理"
        description="管理平台用户账号与权限"
      />

      <Card>
        <CardContent>
          <DataTableGeneric
            data={users}
            columns={columns}
            enableRowSelection
            enableDragDrop={false}
            enableColumnVisibility
            enablePagination
            enableSorting
            loading={loading}
            loadingRows={5}
            pageSize={10}
            emptyMessage="暂无用户数据"
            toolbar={toolbar}
          />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent aria-describedby="user-detail-desc">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
            <DialogDescription id="user-detail-desc">
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={
                      selectedUser.avatar
                        ? getFileUrl(selectedUser as any, selectedUser.avatar)
                        : undefined
                    }
                    alt={`${selectedUser.name} 的头像`}
                  />
                  <AvatarFallback className="text-xl" aria-hidden="true">
                    {(selectedUser.name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{selectedUser.name}</h3>
                  <p className="text-muted-foreground text-sm">{selectedUser.email}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">角色</dt>
                  <dd className="font-medium mt-1">
                    <RoleBadge role={selectedUser.role} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">注册时间</dt>
                  <dd className="font-medium mt-1 tabular-nums">
                    {formatDateTime(selectedUser.created)}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent aria-describedby="user-edit-desc">
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription id="user-edit-desc">
              修改用户基本信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">姓名</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="请输入姓名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">邮箱</Label>
              <Input
                id="edit-email"
                value={editForm.email}
                disabled
                aria-disabled="true"
                className="opacity-60"
              />
              <p className="text-xs text-muted-foreground">邮箱地址不可修改</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">角色</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm({ ...editForm, role: v })}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="staff">员工</SelectItem>
                  <SelectItem value="user">普通用户</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={editLoading} aria-busy={editLoading}>
              {editLoading ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
