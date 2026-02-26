import { useEffect, useState } from "react"
import { toast } from "sonner"
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react"
import { FolderTree, Tag } from "lucide-react"

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
  createCategory,
  updateCategory,
  deleteCategory,
  fetchBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from "@/lib/api"
import type { Category, Brand } from "@/types"

// ====================== Categories Tab ======================
function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: "", icon: "", parent: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchCategories()
      setCategories(data)
    } catch {
      toast.error("Failed to load categories")
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: "", icon: "", parent: "" })
    setDialogOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditItem(cat)
    setForm({
      name: cat.name,
      icon: cat.icon || "",
      parent: cat.parent || "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }
    setSaving(true)
    try {
      const data: any = { name: form.name, icon: form.icon }
      if (form.parent) data.parent = form.parent

      if (editItem) {
        await updateCategory(editItem.id, data)
        toast.success("Category updated")
      } else {
        await createCategory(data)
        toast.success("Category created")
      }
      setDialogOpen(false)
      load()
    } catch {
      toast.error("Failed to save category")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return
    try {
      await deleteCategory(id)
      toast.success("Category deleted")
      load()
    } catch {
      toast.error("Failed to delete category")
    }
  }

  const topLevel = categories.filter(
    (c) =>
      !c.parent ||
      (Array.isArray(c.parent) ? c.parent.length === 0 : String(c.parent).length === 0)
  )

  const getChildren = (parentId: string) =>
    categories.filter((c) => c.parent === parentId)

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">{categories.length} categories total</p>
        <Button onClick={openCreate} className="gap-1">
          <IconPlus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="space-y-2">
        {topLevel.map((cat) => (
          <div key={cat.id} className="border rounded-lg">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FolderTree className="h-5 w-5 text-primary" />
                <div>
                  <span className="font-medium">{cat.name}</span>
                  {cat.icon && (
                    <span className="text-muted-foreground ml-2 text-sm">{cat.icon}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{getChildren(cat.id).length} sub</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                  <IconEdit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500"
                  onClick={() => handleDelete(cat.id)}
                >
                  <IconTrash className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {getChildren(cat.id).length > 0 && (
              <div className="border-t px-4 py-2 bg-muted/30 space-y-1">
                {getChildren(cat.id).map((child) => (
                  <div key={child.id} className="flex items-center justify-between py-2 pl-8">
                    <span className="text-sm">{child.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(child)}
                      >
                        <IconEdit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500"
                        onClick={() => handleDelete(child.id)}
                      >
                        <IconTrash className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon (emoji or text)</Label>
              <Input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="e.g. phone, laptop"
              />
            </div>
            <div className="space-y-2">
              <Label>Parent Category</Label>
              <Select value={form.parent} onValueChange={(v) => setForm({ ...form, parent: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="None (top level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (top level)</SelectItem>
                  {topLevel
                    .filter((c) => c.id !== editItem?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====================== Brands Tab ======================
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

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchBrands()
      setBrands(data)
    } catch {
      toast.error("Failed to load brands")
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: "", description: "", isPopular: false, website: "" })
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
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }
    setSaving(true)
    try {
      if (editItem) {
        await updateBrand(editItem.id, form)
        toast.success("Brand updated")
      } else {
        await createBrand(form)
        toast.success("Brand created")
      }
      setDialogOpen(false)
      load()
    } catch {
      toast.error("Failed to save brand")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this brand?")) return
    try {
      await deleteBrand(id)
      toast.success("Brand deleted")
      load()
    } catch {
      toast.error("Failed to delete brand")
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
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">{brands.length} brands total</p>
        <Button onClick={openCreate} className="gap-1">
          <IconPlus className="h-4 w-4" /> Add Brand
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((brand) => (
          <Card key={brand.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{brand.name}</h3>
                    {brand.isPopular && (
                      <Badge className="text-xs bg-yellow-500">Popular</Badge>
                    )}
                  </div>
                  {brand.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {brand.description}
                    </p>
                  )}
                  {brand.rating !== undefined && brand.rating > 0 && (
                    <p className="text-sm mt-1">Rating: {brand.rating.toFixed(1)}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(brand)}>
                    <IconEdit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Brand" : "New Brand"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Brand name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brand description"
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.isPopular}
                onCheckedChange={(c) => setForm({ ...form, isPopular: !!c })}
              />
              <Label>Popular Brand</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====================== Main Page ======================
export default function CatalogPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Catalog Management</h1>
        <p className="text-muted-foreground mt-1">Manage categories and brands</p>
      </div>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList>
          <TabsTrigger value="categories" className="gap-1">
            <FolderTree className="h-4 w-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="brands" className="gap-1">
            <Tag className="h-4 w-4" /> Brands
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Organize products into categories</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoriesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands">
          <Card>
            <CardHeader>
              <CardTitle>Brands</CardTitle>
              <CardDescription>Manage product brands</CardDescription>
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
