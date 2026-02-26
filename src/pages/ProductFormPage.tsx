import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { IconPlus, IconTrash, IconUpload } from "@tabler/icons-react"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import pb from "@/lib/pocketbase"
import {
  fetchProduct,
  fetchProductSkus,
  fetchCategories,
  fetchBrands,
  batchCreateSkus,
  batchDeleteSkus,
  getFileUrl,
} from "@/lib/api"
import type { Brand, Category } from "@/types"

interface SkuForm {
  id?: string
  specs: Record<string, string>
  price: number
  stock: number
  status: boolean
  sku_code: string
  _isNew?: boolean
}

interface ProductForm {
  name: string
  description: string
  price: number
  originalPrice: number
  discount: number
  rating: number
  isNew: boolean
  isHot: boolean
  inStock: boolean
  stock: number
  brand: string
  category_id: string
  tags: string
}

const defaultForm: ProductForm = {
  name: "",
  description: "",
  price: 0,
  originalPrice: 0,
  discount: 0,
  rating: 0,
  isNew: false,
  isHot: false,
  inStock: true,
  stock: 0,
  brand: "",
  category_id: "",
  tags: "",
}

export default function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<ProductForm>(defaultForm)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [skus, setSkus] = useState<SkuForm[]>([])
  const [existingSkuIds, setExistingSkuIds] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [mainImageFile, setMainImageFile] = useState<File | null>(null)
  const [existingMainImage, setExistingMainImage] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editRecord, setEditRecord] = useState<any>(null)

  // New spec key input
  const [newSpecKey, setNewSpecKey] = useState("")

  useEffect(() => {
    loadFormData()
  }, [id])

  const loadFormData = async () => {
    setPageLoading(true)
    try {
      const [cats, brs] = await Promise.all([
        fetchCategories().catch(() => []),
        fetchBrands().catch(() => []),
      ])
      setCategories(cats)
      setBrands(brs)

      if (id) {
        const product = await fetchProduct(id)
        setEditRecord(product)
        setForm({
          name: product.name || "",
          description: product.description || "",
          price: product.price || 0,
          originalPrice: product.originalPrice || 0,
          discount: product.discount || 0,
          rating: product.rating || 0,
          isNew: product.isNew || false,
          isHot: product.isHot || false,
          inStock: product.inStock ?? true,
          stock: product.stock || 0,
          brand: product.brand || "",
          category_id: product.category_id || "",
          tags: (product.tags || []).join(", "),
        })

        if (product.image) setExistingMainImage(product.image)
        if (product.images) setExistingImages(product.images)

        const productSkus = await fetchProductSkus(id)
        setSkus(
          productSkus.map((s) => ({
            id: s.id,
            specs: s.specs || {},
            price: s.price,
            stock: s.stock,
            status: s.status,
            sku_code: s.sku_code || "",
          }))
        )
        setExistingSkuIds(productSkus.map((s) => s.id))
      }
    } catch (error) {
      console.error("Failed to load form data:", error)
      toast.error("Failed to load data")
    } finally {
      setPageLoading(false)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = "Product name is required"
    if (form.price <= 0) newErrors.price = "Price must be greater than 0"
    if (!form.category_id) newErrors.category_id = "Category is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please fix form errors")
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("name", form.name)
      formData.append("description", form.description)
      formData.append("price", String(form.price))
      formData.append("originalPrice", String(form.originalPrice))
      formData.append("discount", String(form.discount))
      formData.append("rating", String(form.rating))
      formData.append("isNew", String(form.isNew))
      formData.append("isHot", String(form.isHot))
      formData.append("inStock", String(form.inStock))
      formData.append("stock", String(form.stock))
      if (form.brand) formData.append("brand", form.brand)
      if (form.category_id) formData.append("category_id", form.category_id)

      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
      tags.forEach((tag) => formData.append("tags", tag))

      // Main image
      if (mainImageFile) {
        formData.append("image", mainImageFile)
      }

      // Additional images
      imageFiles.forEach((file) => {
        formData.append("images", file)
      })

      let productId: string

      if (isEdit && id) {
        const result = await pb.collection("products").update(id, formData)
        productId = result.id
        toast.success("Product updated successfully")
      } else {
        const result = await pb.collection("products").create(formData)
        productId = result.id
        toast.success("Product created successfully")
      }

      // Handle SKUs
      if (isEdit) {
        // Delete removed SKUs
        const currentIds = skus.filter((s) => s.id).map((s) => s.id!)
        const toDelete = existingSkuIds.filter((id) => !currentIds.includes(id))
        if (toDelete.length > 0) await batchDeleteSkus(toDelete)

        // Update existing SKUs
        for (const sku of skus) {
          if (sku.id && !sku._isNew) {
            await pb.collection("product_skus").update(sku.id, {
              specs: sku.specs,
              price: sku.price,
              stock: sku.stock,
              status: sku.status,
              sku_code: sku.sku_code,
            })
          }
        }
      }

      // Create new SKUs
      const newSkus = skus
        .filter((s) => !s.id || s._isNew)
        .map((s) => ({
          product_id: productId,
          specs: s.specs,
          price: s.price,
          stock: s.stock,
          status: s.status,
          sku_code: s.sku_code,
        }))

      if (newSkus.length > 0) {
        await batchCreateSkus(newSkus)
      }

      navigate("/products")
    } catch (error) {
      console.error("Failed to save product:", error)
      toast.error("Failed to save product")
    } finally {
      setLoading(false)
    }
  }

  const addSku = () => {
    setSkus([
      ...skus,
      {
        specs: {},
        price: form.price || 0,
        stock: 0,
        status: true,
        sku_code: "",
        _isNew: true,
      },
    ])
  }

  const removeSku = (index: number) => {
    setSkus(skus.filter((_, i) => i !== index))
  }

  const updateSku = (index: number, field: string, value: any) => {
    const newSkus = [...skus]
    ;(newSkus[index] as any)[field] = value
    setSkus(newSkus)
  }

  const addSpecToSku = (index: number, key: string) => {
    if (!key.trim()) return
    const newSkus = [...skus]
    newSkus[index].specs = { ...newSkus[index].specs, [key]: "" }
    setSkus(newSkus)
    setNewSpecKey("")
  }

  const updateSpecValue = (skuIndex: number, key: string, value: string) => {
    const newSkus = [...skus]
    newSkus[skuIndex].specs = { ...newSkus[skuIndex].specs, [key]: value }
    setSkus(newSkus)
  }

  const removeSpec = (skuIndex: number, key: string) => {
    const newSkus = [...skus]
    const { [key]: _, ...rest } = newSkus[skuIndex].specs
    newSkus[skuIndex].specs = rest
    setSkus(newSkus)
  }

  if (pageLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/products")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEdit ? "Edit Product" : "Add Product"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEdit ? "Update product information" : "Create a new product"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Product Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter product name"
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Enter product description"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">
                    Price <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  />
                  {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originalPrice">Original Price</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    value={form.originalPrice}
                    onChange={(e) =>
                      setForm({ ...form, originalPrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    value={form.discount}
                    onChange={(e) =>
                      setForm({ ...form, discount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">Rating</Label>
                  <Input
                    id="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={form.rating}
                    onChange={(e) =>
                      setForm({ ...form, rating: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="e.g., electronics, smartphone, 5G"
                />
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isNew"
                    checked={form.isNew}
                    onCheckedChange={(checked) => setForm({ ...form, isNew: !!checked })}
                  />
                  <Label htmlFor="isNew">New Product</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isHot"
                    checked={form.isHot}
                    onCheckedChange={(checked) => setForm({ ...form, isHot: !!checked })}
                  />
                  <Label htmlFor="isHot">Hot Product</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="inStock"
                    checked={form.inStock}
                    onCheckedChange={(checked) => setForm({ ...form, inStock: !!checked })}
                  />
                  <Label htmlFor="inStock">In Stock</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Main Image</Label>
                <div className="flex items-center gap-4">
                  {(mainImageFile || existingMainImage) && (
                    <div className="relative w-24 h-24 rounded border overflow-hidden">
                      <img
                        src={
                          mainImageFile
                            ? URL.createObjectURL(mainImageFile)
                            : editRecord
                              ? getFileUrl(editRecord, existingMainImage)
                              : ""
                        }
                        alt="Main"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setMainImageFile(null)
                          setExistingMainImage("")
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        x
                      </button>
                    </div>
                  )}
                  <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded cursor-pointer hover:bg-accent/50 transition-colors">
                    <IconUpload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setMainImageFile(file)
                      }}
                    />
                  </label>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Additional Images</Label>
                <div className="flex flex-wrap gap-4">
                  {existingImages.map((img, i) => (
                    <div key={`existing-${i}`} className="relative w-24 h-24 rounded border overflow-hidden">
                      <img
                        src={editRecord ? getFileUrl(editRecord, img) : ""}
                        alt={`Image ${i}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setExistingImages(existingImages.filter((_, j) => j !== i))
                        }
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        x
                      </button>
                    </div>
                  ))}
                  {imageFiles.map((file, i) => (
                    <div key={`new-${i}`} className="relative w-24 h-24 rounded border overflow-hidden">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`New ${i}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImageFiles(imageFiles.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        x
                      </button>
                    </div>
                  ))}
                  <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded cursor-pointer hover:bg-accent/50 transition-colors">
                    <IconUpload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        setImageFiles([...imageFiles, ...files])
                      }}
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SKU Variants */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>SKU Variants</CardTitle>
              <Button variant="outline" size="sm" onClick={addSku} className="gap-1">
                <IconPlus className="h-4 w-4" />
                Add SKU
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {skus.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No SKU variants. Click "Add SKU" to create one.
                </p>
              ) : (
                skus.map((sku, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">
                        SKU #{index + 1}
                        {sku._isNew && (
                          <Badge className="ml-2 text-xs" variant="secondary">
                            New
                          </Badge>
                        )}
                      </h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => removeSku(index)}
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">SKU Code</Label>
                        <Input
                          value={sku.sku_code}
                          onChange={(e) => updateSku(index, "sku_code", e.target.value)}
                          placeholder="e.g., SKU-001"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={sku.price}
                          onChange={(e) =>
                            updateSku(index, "price", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Stock</Label>
                        <Input
                          type="number"
                          value={sku.stock}
                          onChange={(e) =>
                            updateSku(index, "stock", parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>

                    {/* Specs */}
                    <div className="space-y-2">
                      <Label className="text-xs">Specifications</Label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(sku.specs).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-1 border rounded px-2 py-1">
                            <span className="text-xs font-medium">{key}:</span>
                            <Input
                              className="h-6 w-20 text-xs border-0 p-0"
                              value={value}
                              onChange={(e) => updateSpecValue(index, key, e.target.value)}
                              placeholder="value"
                            />
                            <button
                              type="button"
                              onClick={() => removeSpec(index, key)}
                              className="text-red-500 text-xs ml-1"
                            >
                              x
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          className="h-8 w-32 text-xs"
                          placeholder="Spec name (e.g., Color)"
                          value={newSpecKey}
                          onChange={(e) => setNewSpecKey(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addSpecToSku(index, newSpecKey)
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => addSpecToSku(index, newSpecKey)}
                        >
                          Add Spec
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={sku.status}
                        onCheckedChange={(checked) => updateSku(index, "status", !!checked)}
                      />
                      <Label className="text-xs">Active</Label>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Category */}
          <Card>
            <CardHeader>
              <CardTitle>Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.category_id}
                  onValueChange={(value) => setForm({ ...form, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && (
                  <p className="text-xs text-red-500">{errors.category_id}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Brand */}
          <Card>
            <CardHeader>
              <CardTitle>Brand</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select
                  value={form.brand}
                  onValueChange={(value) => setForm({ ...form, brand: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button onClick={handleSubmit} disabled={loading} className="w-full">
                {loading ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/products")}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
