import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  IconEdit,
  IconPlus,
  IconTrash,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react"
import { FolderOpen, FolderClosed, FolderTree, Tag } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  fetchCategories,
  buildCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from "@/lib/api"
import type { Category, CategoryNode, Brand } from "@/types"

// ====================== 分类树节点组件 ======================
interface CategoryTreeNodeProps {
  node: CategoryNode
  allCategories: Category[]
  onEdit: (cat: Category) => void
  onDelete: (id: string) => void
  depth?: number
}

function CategoryTreeNode({
  node,
  allCategories,
  onEdit,
  onDelete,
  depth = 0,
}: CategoryTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth === 0)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div>
      <div
        className={`flex items-center justify-between p-3 rounded-lg border mb-1.5 hover:bg-accent/40 transition-colors ${
          depth > 0 ? "ml-6 bg-muted/30" : "bg-card"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* 展开/折叠按钮 */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              expanded ? (
                <IconChevronDown className="h-4 w-4" />
              ) : (
                <IconChevronRight className="h-4 w-4" />
              )
            ) : (
              <span className="inline-block w-4" />
            )}
          </button>

          {/* 文件夹图标 */}
          {hasChildren ? (
            expanded ? (
              <FolderOpen className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <FolderClosed className="h-4 w-4 text-primary shrink-0" />
            )
          ) : (
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
          )}

          {/* 分类名 + icon */}
          <div className="min-w-0">
            <span className="font-medium text-sm">{node.name}</span>
            {node.icon && (
              <span className="ml-2 text-muted-foreground text-xs">{node.icon}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasChildren && (
            <Badge variant="outline" className="text-xs">
              {node.children.length} 子类
            </Badge>
          )}
          {node.sort_order !== undefined && node.sort_order > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              排序 {node.sort_order}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(node)}
          >
            <IconEdit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(node.id)}
          >
            <IconTrash className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 子节点递归渲染 */}
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              allCategories={allCategories}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ====================== 分类管理 Tab ======================
function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([])
  const [tree, setTree] = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: "", icon: "", parent: "", sort_order: "0" })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchCategories()
      setCategories(data)
      setTree(buildCategoryTree(data))
    } catch {
      toast.error("分类加载失败")
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: "", icon: "", parent: "", sort_order: "0" })
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditItem(cat)
    setForm({
      name: cat.name,
      icon: cat.icon || "",
      parent: cat.parent || "",
      sort_order: String(cat.sort_order ?? 0),
    })
    setErrors({})
    setDialogOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "分类名称不能为空"
    // 防止把自身设为父级
    if (editItem && form.parent === editItem.id) errs.parent = "不能将自身设为父级"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const data: Partial<Category> = {
        name: form.name.trim(),
        icon: form.icon.trim(),
        sort_order: parseInt(form.sort_order) || 0,
        parent: form.parent || undefined,
      }

      if (editItem) {
        await updateCategory(editItem.id, data)
        toast.success("分类已更新")
      } else {
        await createCategory(data)
        toast.success("分类已创建")
      }
      setDialogOpen(false)
      load()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "保存失败，请重试")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    // 检查是否有子分类
    const hasChildren = categories.some((c) => c.parent === id)
    if (hasChildren) {
      toast.error("该分类下有子分类，请先删除子分类")
      return
    }
    if (!confirm("确定删除此分类？此操作不可撤销")) return
    try {
      await deleteCategory(id)
      toast.success("分类已删除")
      load()
    } catch {
      toast.error("删除失败")
    }
  }

  // 顶级分类（用于父级下拉框）
  const topLevelCategories = categories.filter(
    (c) => !c.parent || c.parent === ""
  )

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          共 {categories.length} 个分类，{topLevelCategories.length} 个顶级分类
        </p>
        <Button onClick={openCreate} className="gap-2">
          <IconPlus className="h-4 w-4" />
          新建分类
        </Button>
      </div>

      {/* 树状分类列表 */}
      {tree.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <FolderTree className="h-12 w-12 mb-3 opacity-40" />
          <p>暂无分类数据</p>
          <p className="text-sm mt-1">点击「新建分类」创建第一个分类</p>
        </div>
      ) : (
        <div>
          {tree.map((node) => (
            <CategoryTreeNode
              key={node.id}
              node={node}
              allCategories={categories}
              onEdit={openEdit}
              onDelete={handleDelete}
              depth={0}
            />
          ))}
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editItem ? "编辑分类" : "新建分类"}
            </DialogTitle>
            <DialogDescription>
              {editItem
                ? "修改分类信息后点击保存"
                : "填写分类信息，parent 字段自引用实现树状结构"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 名称 */}
            <div className="space-y-1.5">
              <Label>
                分类名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例：手机 / 笔记本电脑"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* 图标 */}
            <div className="space-y-1.5">
              <Label>图标（emoji 或文本标识）</Label>
              <Input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="例：📱  或  phone"
              />
            </div>

            {/* 父级分类（自引用 parent 字段）*/}
            <div className="space-y-1.5">
              <Label>父级分类</Label>
              <p className="text-xs text-muted-foreground">
                ✅ parent 字段为 Category 表的自引用 relation，留空表示顶级分类
              </p>
              <Select
                value={form.parent || ""}
                onValueChange={(v) => setForm({ ...form, parent: v === "__none__" ? "" : v })}
              >
                <SelectTrigger
                  className={errors.parent ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="无（顶级分类）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无（顶级分类）</SelectItem>
                  {topLevelCategories
                    .filter((c) => c.id !== editItem?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon ? `${c.icon} ` : ""}{c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.parent && (
                <p className="text-xs text-destructive">{errors.parent}</p>
              )}
            </div>

            {/* 排序 */}
            <div className="space-y-1.5">
              <Label>排序权重</Label>
              <Input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">数值越小排越靠前</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====================== 品牌管理 Tab ======================
function BrandsTab() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Brand | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    isPopular: false,
    website: "",
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchBrands()
      setBrands(data)
    } catch {
      toast.error("品牌加载失败")
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: "", description: "", isPopular: false, website: "" })
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (brand: Brand) => {
    setEditItem(brand)
    setForm({
      name: brand.name,
      description: brand.description || "",
      isPopular: brand.isPopular || false,
      website: brand.website || "",
    })
    setErrors({})
    setDialogOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "品牌名称不能为空"
    if (form.website && !/^https?:\/\//.test(form.website)) {
      errs.website = "网址格式不正确，请以 http:// 或 https:// 开头"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editItem) {
        await updateBrand(editItem.id, form)
        toast.success("品牌已更新")
      } else {
        await createBrand(form)
        toast.success("品牌已创建")
      }
      setDialogOpen(false)
      load()
    } catch (err: any) {
      toast.error(err?.message || "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此品牌？")) return
    try {
      await deleteBrand(id)
      toast.success("品牌已删除")
      load()
    } catch {
      toast.error("删除失败")
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">共 {brands.length} 个品牌</p>
        <Button onClick={openCreate} className="gap-2">
          <IconPlus className="h-4 w-4" />
          新建品牌
        </Button>
      </div>

      {brands.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Tag className="h-12 w-12 mb-3 opacity-40" />
          <p>暂无品牌数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <Card
              key={brand.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{brand.name}</h3>
                      {brand.isPopular && (
                        <Badge className="text-xs bg-yellow-500 text-white">
                          热门
                        </Badge>
                      )}
                    </div>
                    {brand.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {brand.description}
                      </p>
                    )}
                    {brand.website && (
                      <a
                        href={brand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-1 block truncate"
                      >
                        {brand.website}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(brand)}
                    >
                      <IconEdit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(brand.id)}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "编辑品牌" : "新建品牌"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                品牌名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="品牌名称"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>品牌描述</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="品牌简介"
              />
            </div>

            <div className="space-y-1.5">
              <Label>官网地址</Label>
              <Input
                value={form.website}
                onChange={(e) =>
                  setForm({ ...form, website: e.target.value })
                }
                placeholder="https://..."
                className={errors.website ? "border-destructive" : ""}
              />
              {errors.website && (
                <p className="text-xs text-destructive">{errors.website}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="brand-popular"
                checked={form.isPopular}
                onCheckedChange={(c) =>
                  setForm({ ...form, isPopular: !!c })
                }
              />
              <Label htmlFor="brand-popular">设为热门品牌</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====================== 主页面 ======================
export default function CatalogPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">商品目录管理</h1>
        <p className="text-muted-foreground mt-1">
          管理分类（树状 parent 自引用结构）与品牌
        </p>
      </div>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" />
            分类管理
          </TabsTrigger>
          <TabsTrigger value="brands" className="gap-2">
            <Tag className="h-4 w-4" />
            品牌管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>分类管理</CardTitle>
              <CardDescription>
                Category 表通过 <code className="text-xs bg-muted px-1 rounded">parent</code> 字段（自引用 relation）实现树状结构。
                前端通过 <code className="text-xs bg-muted px-1 rounded">buildCategoryTree()</code> 自动构建树形显示，
                不在数据库中存储 children。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoriesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands">
          <Card>
            <CardHeader>
              <CardTitle>品牌管理</CardTitle>
              <CardDescription>管理商品品牌信息</CardDescription>
            </CardHeader>
            <CardContent>
              <BrandsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
