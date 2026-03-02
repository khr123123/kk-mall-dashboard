import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  IconEdit,
  IconPlus,
  IconTrash,
  IconChevronDown,
  IconChevronRight,
  IconRefresh,
} from "@tabler/icons-react"
import { FolderOpen, FolderClosed, FolderTree, Tag, Search } from "lucide-react"

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
  onEdit: (cat: CategoryNode) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  depth?: number
}

function CategoryTreeNode({
  node,
  allCategories,
  onEdit,
  onDelete,
  onAddChild,
  depth = 0,
}: CategoryTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth === 0)
  const hasChildren = node.childNodes && node.childNodes.length > 0

  return (
    <div>
      <div
        className={`group flex items-center justify-between p-3 rounded-lg border mb-1.5 hover:bg-accent/40 transition-all ${
          depth > 0 ? "ml-6 bg-muted/20 border-dashed" : "bg-card shadow-sm"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* 展开/折叠按钮 */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
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
              <FolderOpen className="h-4.5 w-4.5 text-primary shrink-0" />
            ) : (
              <FolderClosed className="h-4.5 w-4.5 text-primary shrink-0" />
            )
          ) : (
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
          )}

          {/* 分类名 + icon */}
          <div className="min-w-0 flex items-center gap-2">
            <span className="font-medium text-sm">{node.name}</span>
            {node.icon && (
              <span className="text-muted-foreground text-xs truncate max-w-[150px]">{node.icon}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
          {hasChildren && (
            <Badge variant="secondary" className="text-xs font-normal">
              {node.childNodes.length} 子分类
            </Badge>
          )}
          {/* 只有父分类可添加子分类 */}
          {depth === 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary hover:text-primary"
              onClick={() => onAddChild(node.id)}
              title="添加子分类"
            >
              <IconPlus className="h-3.5 w-3.5" />
            </Button>
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
        <div className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {node.childNodes.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              allCategories={allCategories}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
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
  const [editItem, setEditItem] = useState<CategoryNode | null>(null)
  const [form, setForm] = useState({ name: "", icon: "", parentId: "" })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")

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

  const openCreate = (parentId = "") => {
    setEditItem(null)
    setForm({ name: "", icon: "", parentId })
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (cat: CategoryNode) => {
    setEditItem(cat)
    setForm({
      name: cat.name,
      icon: cat.icon || "",
      parentId: "", // editing doesn't change parent relationship
    })
    setErrors({})
    setDialogOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "分类名称不能为空"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editItem) {
        await updateCategory(editItem.id, {
          name: form.name.trim(),
          icon: form.icon.trim(),
        })
        toast.success("分类已更新")
      } else {
        await createCategory({
          name: form.name.trim(),
          icon: form.icon.trim(),
          parentId: form.parentId || undefined,
        })
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
    const cat = categories.find((c) => c.id === id)
    if (cat && cat.children && cat.children.length > 0) {
      toast.error("该分类下有子分类，请先删除子分类")
      return
    }
    if (!confirm("确定删除此分类？此操作不可撤销")) return
    try {
      await deleteCategory(id, categories)
      toast.success("分类已删除")
      load()
    } catch {
      toast.error("删除失败")
    }
  }

  // 过滤分类树
  const filteredTree = searchQuery.trim()
    ? tree
        .map((node) => {
          const q = searchQuery.toLowerCase()
          const matchedChildren = node.childNodes.filter((c) =>
            c.name.toLowerCase().includes(q)
          )
          const parentMatch = node.name.toLowerCase().includes(q)
          if (parentMatch || matchedChildren.length > 0) {
            return {
              ...node,
              childNodes: parentMatch ? node.childNodes : matchedChildren,
            }
          }
          return null
        })
        .filter(Boolean) as CategoryNode[]
    : tree

  // 父分类列表（用于下拉框）
  const parentCategories = categories.filter(
    (c) => c.children && c.children.length > 0
  )

  // 统计
  const parentCount = parentCategories.length
  const childCount = categories.length - parentCount

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{categories.length}</p>
          <p className="text-xs text-muted-foreground">总分类数</p>
        </div>
        <div className="p-3 rounded-lg border bg-purple-50/50 dark:bg-purple-950/20">
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{parentCount}</p>
          <p className="text-xs text-muted-foreground">父分类</p>
        </div>
        <div className="p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20">
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{childCount}</p>
          <p className="text-xs text-muted-foreground">子分类</p>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索分类..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <IconRefresh className="h-4 w-4" />
            刷新
          </Button>
          <Button onClick={() => openCreate()} className="gap-1.5">
            <IconPlus className="h-4 w-4" />
            新建分类
          </Button>
        </div>
      </div>

      {/* 树状分类列表 */}
      {filteredTree.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <FolderTree className="h-12 w-12 mb-3 opacity-40" />
          <p>{searchQuery ? "没有匹配的分类" : "暂无分类数据"}</p>
          <p className="text-sm mt-1">
            {searchQuery ? "尝试更换关键词" : "点击「新建分类」创建第一个分类"}
          </p>
        </div>
      ) : (
        <div>
          {filteredTree.map((node) => (
            <CategoryTreeNode
              key={node.id}
              node={node}
              allCategories={categories}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAddChild={(parentId) => openCreate(parentId)}
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
                : form.parentId
                ? `为父分类添加子分类`
                : "创建新的分类，可选择归属于某个父分类"}
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
              <Label>图标路径</Label>
              <Input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="例：/categorys/手机数码.svg"
              />
            </div>

            {/* 父级分类（仅新建时显示）*/}
            {!editItem && (
              <div className="space-y-1.5">
                <Label>父级分类</Label>
                <p className="text-xs text-muted-foreground">
                  选择父分类后，新分类将作为其子分类。留空则创建为顶级分类。
                </p>
                <Select
                  value={form.parentId || "__none__"}
                  onValueChange={(v) =>
                    setForm({ ...form, parentId: v === "__none__" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="无（顶级分类）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无（顶级分类）</SelectItem>
                    {tree.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon ? `${c.name}` : c.name}
                        {c.childNodes.length > 0 && ` (${c.childNodes.length})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
  const [searchQuery, setSearchQuery] = useState("")

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

  const filteredBrands = searchQuery.trim()
    ? brands.filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : brands

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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索品牌..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <p className="text-muted-foreground text-sm">
          共 {brands.length} 个品牌
          {brands.filter((b) => b.isPopular).length > 0 &&
            `，${brands.filter((b) => b.isPopular).length} 个热门`}
        </p>
        <Button onClick={openCreate} className="ml-auto gap-1.5">
          <IconPlus className="h-4 w-4" />
          新建品牌
        </Button>
      </div>

      {filteredBrands.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Tag className="h-12 w-12 mb-3 opacity-40" />
          <p>{searchQuery ? "没有匹配的品牌" : "暂无品牌数据"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBrands.map((brand) => (
            <Card
              key={brand.id}
              className="group hover:shadow-md transition-all hover:border-primary/30"
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
                  <div className="flex gap-1 shrink-0 ml-2 opacity-70 group-hover:opacity-100 transition-opacity">
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
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">商品目录管理</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            管理分类与品牌。分类通过 children 字段实现树状结构
          </p>
        </div>

        <Tabs defaultValue="categories" className="space-y-4">
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
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-primary" />
                  分类管理
                </CardTitle>
                <CardDescription>
                  分类表通过 <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">children</code> 字段（relation 数组，自引用）实现树状结构。
                  children 为空数组的是子分类，children 非空的是父分类。
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
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  品牌管理
                </CardTitle>
                <CardDescription>管理商品品牌信息，包括名称、描述、官网等</CardDescription>
              </CardHeader>
              <CardContent>
                <BrandsTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
