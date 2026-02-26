import { useEffect, useState } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { toast } from "sonner"
import { IconDotsVertical, IconEdit, IconEye, IconTrash } from "@tabler/icons-react"
import { Search, Users } from "lucide-react"

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
import { Label } from "@/components/ui/label"
import { DataTableGeneric } from "@/components/data-table-generic"
import { fetchUsers, updateUser, deleteUser, getFileUrl } from "@/lib/api"
import type { User } from "@/types"

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "" })
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [searchQuery])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const filter = searchQuery
        ? `(name ~ "${searchQuery}" || email ~ "${searchQuery}")`
        : ""
      const result = await fetchUsers(1, 100, filter)
      setUsers(result.items)
    } catch (error) {
      console.error("Failed to fetch users:", error)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    try {
      await deleteUser(id)
      toast.success("User deleted")
      loadUsers()
    } catch {
      toast.error("Failed to delete user")
    }
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "user",
    })
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return
    setEditLoading(true)
    try {
      await updateUser(selectedUser.id, {
        name: editForm.name,
        role: editForm.role,
      })
      toast.success("User updated")
      setEditOpen(false)
      loadUsers()
    } catch {
      toast.error("Failed to update user")
    } finally {
      setEditLoading(false)
    }
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "avatar",
      header: "",
      cell: ({ row }) => {
        const user = row.original
        const avatarUrl = user.avatar ? getFileUrl(user as any, user.avatar) : undefined
        return (
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={user.name} />
            <AvatarFallback>{(user.name || "U").charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span className="font-medium">{row.original.name || "N/A"}</span>,
      enableSorting: true,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
      enableSorting: true,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.role || "user"}
        </Badge>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "created",
      header: "Joined",
      cell: ({ row }) => (
        <span className="text-sm">{format(new Date(row.original.created), "yyyy-MM-dd")}</span>
      ),
      enableSorting: true,
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <IconDotsVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => {
                setSelectedUser(row.original)
                setDetailOpen(true)
              }}
            >
              <IconEye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <IconEdit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => handleDelete(row.original.id)}
            >
              <IconTrash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ]

  const toolbar = (
    <div className="flex gap-4 items-center flex-1">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-8 w-8" />
          Users
        </h1>
        <p className="text-muted-foreground mt-1">Manage user accounts</p>
      </div>

      <Card>
        <CardContent>
          <DataTableGeneric
            data={users}
            columns={columns}
            enableRowSelection={true}
            enableDragDrop={false}
            enableColumnVisibility={true}
            enablePagination={true}
            enableSorting={true}
            loading={loading}
            loadingRows={5}
            pageSize={10}
            emptyMessage="No users found"
            toolbar={toolbar}
          />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>{selectedUser?.email}</DialogDescription>
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
                  />
                  <AvatarFallback className="text-xl">
                    {(selectedUser.name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{selectedUser.name}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{selectedUser.role || "user"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Joined</p>
                  <p className="font-medium">
                    {format(new Date(selectedUser.created), "yyyy-MM-dd HH:mm")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editForm.email} disabled />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                placeholder="user / admin / editor"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
