import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import {
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
  IconPhoto,
} from "@tabler/icons-react"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import pb from "@/lib/pocketbase"
import {
  fetchProduct,
  fetchProductSkus,
  fetchCategories,
  buildCategoryTree,
  fetchBrands,
  batchCreateSkus,
  batchDeleteSkus,
  getFileUrl,
} from "@/lib/api"
import type { Brand, Category, CategoryNode } from "@/types"

// ==================== 类型定义 ====================
interface SkuForm {
  id?: string
  specs: Record<string, string>
  price: number
  stock: number
  status: boolean
  sku_code: string
  _isNew?: boolean
}

interface ProductFormData {
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
  tags: string          // 逗号分隔
}

const DEFAULT_FORM: ProductFormData = {
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

// ==================== 分类选择器（树状）====================
interface CategorySelectorProps {
  categories: Category[]
  value: string
  onChange: (id: string) => void
  error?: string
}

// 将树形节点拍平为选项列表
function flattenCategoryTree(
  nodes: CategoryNode[],
  depth = 0
): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = []
  for (const node of nodes) {
    const pad = "\u3000".repeat(depth)
    const prefix = depth > 0 ? "\u2514 " : ""
    result.push({
      id: node.id,
      label: `${pad}${prefix}${node.icon ? node.icon + " " : ""}${node.name}`,
    })
    if (node.children.length > 0) {
      result.push(...flattenCategoryTree(node.children, depth + 1))
    }
  }
  return result
}

function CategorySelector({ categories, value, onChange, error }: CategorySelectorProps) {
  const tree = buildCategoryTree(categories)
  const options = flattenCategoryTree(tree)

  return (
    <div className="space-y-1.5">
      <Label>
        分类 <span className="text-destructive">*</span>
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={error ? "border-destructive" : ""}>
          <SelectValue placeholder="选择分类" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ==================== 图片上传组件 ====================
interface ImageUploadProps {
  label: string
  accept?: string
  multiple?: boolean
  files: File[]
  existingUrls: string[]
  onFilesChange: (files: File[]) => void
  onRemoveExisting: (index: number) => void
  maxFiles?: number
}

function ImageUpload({
  label,
  accept = "image/*",
  multiple = false,
  files,
  existingUrls,
  onFilesChange,
  onRemoveExisting,
  maxFiles = 10,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const totalCount = existingUrls.length + files.length

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (totalCount + selected.length > maxFiles) {
      toast.error(`最多上传 ${maxFiles} 张图片`)
      return
    }
    onFilesChange(multiple ? [...files, ...selected] : selected)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {/* 已有图片（编辑时） */}
        {existingUrls.map((url, i) => (
          <div
            key={`existing-${i}`}
            className="relative group w-20 h-20 rounded-lg overflow-hidden border"
          >
            <img
              src={url}
              alt={`图片 ${i + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemoveExisting(i)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <IconX className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* 新上传文件预览 */}
        {files.map((file, i) => (
          <div
            key={`new-${i}`}
            className="relative group w-20 h-20 rounded-lg overflow-hidden border border-dashed border-primary/50"
          >
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] px-1">
              新
            </div>
            <button
              type="button"
              onClick={() => onFilesChange(files.filter((_, fi) => fi !== i))}
              className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <IconX className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* 上传按钮 */}
        {totalCount < maxFiles && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/40 flex flex-col items-center justify-center gap-1 hover:border-primary/60 hover:bg-accent transition-colors text-muted-foreground hover:text-primary"
          >
            <IconPhoto className="h-5 w-5" />
            <span className="text-[10px]">上传</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />
      <p className="text-xs text-muted-foreground">
        {totalCount}/{maxFiles} 张，支持 JPG/PNG/WebP，单张不超过 5MB
      </p>
    </div>
  )
}

// ==================== SKU 规格编辑组件 ====================
interface SkuEditorProps {
  skus: SkuForm[]
  onChange: (skus: SkuForm[]) => void
  defaultPrice?: number
}

function SkuEditor({ skus, onChange, defaultPrice = 0 }: SkuEditorProps) {
  const [newSpecKey, setNewSpecKey] = useState("")

  const addSku = () => {
    onChange([
      ...skus,
      {
        specs: {},
        price: defaultPrice,
        stock: 0,
        status: true,
        sku_code: "",
        _isNew: true,
      },
    ])
  }

  const removeSku = (index: number) => {
    onChange(skus.filter((_, i) => i !== index))
  }

  const updateSku = (index: number, field: keyof SkuForm, value: any) => {
    const next = [...skus]
    ;(next[index] as any)[field] = value
    onChange(next)
  }

  const addSpecKey = (skuIndex: number, key: string) => {
    if (!key.trim()) return
    const next = [...skus]
    next[skuIndex].specs = { ...next[skuIndex].specs, [key.trim()]: "" }
    onChange(next)
    setNewSpecKey("")
  }

  const updateSpecValue = (skuIndex: number, key: string, value: string) => {
    const next = [...skus]
    next[skuIndex].specs = { ...next[skuIndex].specs, [key]: value }
    onChange(next)
  }

  const removeSpec = (skuIndex: number, key: string) => {
    const next = [...skus]
    const { [key]: _, ...rest } = next[skuIndex].specs
    next[skuIndex].specs = rest
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {skus.map((sku, index) => (
        <div
          key={index}
          className="border rounded-lg p-4 space-y-3 bg-muted/20 relative"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">
              SKU #{index + 1}
              {sku._isNew && (
                <Badge className="ml-2 text-xs bg-blue-500 text-white">新增</Badge>
              )}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => removeSku(index)}
            >
              <IconTrash className="h-4 w-4" />
            </Button>
          </div>

          {/* 规格属性 */}
          <div className="space-y-2">
            <Label className="text-xs">规格属性</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sku.specs).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center gap-1 border rounded px-2 py-1 bg-background"
                >
                  <span className="text-xs text-muted-foreground">{key}:</span>
                  <Input
                    value={val}
                    onChange={(e) => updateSpecValue(index, key, e.target.value)}
                    className="h-5 text-xs w-20 border-none p-0 focus-visible:ring-0"
                    placeholder="值"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(index, key)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <IconX className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {/* 添加规格 key */}
              <div className="flex items-center gap-1">
                <Input
                  value={newSpecKey}
                  onChange={(e) => setNewSpecKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addSpecKey(index, newSpecKey)
                    }
                  }}
                  className="h-7 text-xs w-24"
                  placeholder="属性名"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => addSpecKey(index, newSpecKey)}
                >
                  <IconPlus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* SKU 基本信息 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">SKU 价格</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={sku.price}
                onChange={(e) => updateSku(index, "price", parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">库存数量</Label>
              <Input
                type="number"
                min="0"
                value={sku.stock}
                onChange={(e) => updateSku(index, "stock", parseInt(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SKU 编码</Label>
              <Input
                value={sku.sku_code}
                onChange={(e) => updateSku(index, "sku_code", e.target.value)}
                className="h-8 text-sm"
                placeholder="选填"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id={`sku-status-${index}`}
              checked={sku.status}
              onCheckedChange={(c) => updateSku(index, "status", !!c)}
            />
            <Label htmlFor={`sku-status-${index}`} className="text-sm">
              SKU 上架
            </Label>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addSku} className="w-full gap-2">
        <IconPlus className="h-4 w-4" />
        添加 SKU 规格
      </Button>
    </div>
  )
}

// ==================== 标签编辑器 ====================
interface TagEditorProps {
  value: string
  onChange: (val: string) => void
}

function TagEditor({ value, onChange }: TagEditorProps) {
  const [input, setInput] = useState("")
  const tags = value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

  const addTag = (tag: string) => {
    if (!tag.trim() || tags.includes(tag.trim())) return
    onChange([...tags, tag.trim()].join(","))
    setInput("")
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag).join(","))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="gap-1 pl-2 pr-1 py-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-destructive"
            >
              <IconX className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault()
              addTag(input)
            }
          }}
          placeholder="输入标签后按 Enter 添加..."
          className="max-w-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addTag(input)}
          disabled={!input.trim()}
        >
          添加
        </Button>
      </div>
    </div>
  )
}

// ==================== 主页面 ====================
export default function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<ProductFormData>(DEFAULT_FORM)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [skus, setSkus] = useState<SkuForm[]>([])
  const [existingSkuIds, setExistingSkuIds] = useState<string[]>([])

  // 主图
  const [mainImageFiles, setMainImageFiles] = useState<File[]>([])
  const [existingMainImages, setExistingMainImages] = useState<string[]>([])

  // 多图
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadFormData()
  }, [id])

  const loadFormData = async () => {
    setPageLoading(true)
    try {
      const [cats, brs] = await Promise.all([
        fetchCategories().catch(() => [] as Category[]),
        fetchBrands().catch(() => [] as Brand[]),
      ])
      setCategories(cats)
      setBrands(brs)

      if (id) {
        const product = await fetchProduct(id)
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

        // 主图
        if (product.image) {
          setExistingMainImages([getFileUrl(product, product.image)])
        }

        // 多图
        if (product.images?.length) {
          setExistingImages(product.images.map((img: string) => getFileUrl(product, img)))
        }

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
    } catch (err) {
      console.error("Failed to load form data:", err)
      toast.error("数据加载失败")
    } finally {
      setPageLoading(false)
    }
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "商品名称不能为空"
    if (form.price <= 0) errs.price = "价格必须大于 0"
    if (!form.category_id) errs.category_id = "请选择分类"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("请检查表单填写")
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

      // 标签处理
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
      tags.forEach((tag) => formData.append("tags", tag))

      // 主图
      if (mainImageFiles.length > 0) {
        formData.append("image", mainImageFiles[0])
      }

      // 多图
      imageFiles.forEach((file) => formData.append("images", file))

      let productId: string

      if (isEdit && id) {
        const result = await pb.collection("products").update(id, formData)
        productId = result.id
        toast.success("商品已更新")
      } else {
        const result = await pb.collection("products").create(formData)
        productId = result.id
        toast.success("商品已创建")
      }

      // SKU 处理
      if (isEdit) {
        const currentIds = skus.filter((s) => s.id && !s._isNew).map((s) => s.id!)
        const toDelete = existingSkuIds.filter((sid) => !currentIds.includes(sid))
        if (toDelete.length > 0) await batchDeleteSkus(toDelete)

        // 更新现有 SKU
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

      // 创建新 SKU
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
      if (newSkus.length > 0) await batchCreateSkus(newSkus)

      navigate("/products")
    } catch (err: any) {
      console.error("Failed to save product:", err)
      toast.error(err?.message || "保存失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
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
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* 页头 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/products")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "编辑商品" : "新增商品"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isEdit ? "修改商品信息" : "填写信息创建新商品"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 左侧主内容 ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 商品名称 */}
              <div className="space-y-1.5">
                <Label>
                  商品名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="输入商品名称"
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              {/* 商品描述 */}
              <div className="space-y-1.5">
                <Label>商品描述</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="详细描述商品特点、规格等信息..."
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>

              {/* 价格区域 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    售价（元）<span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: parseFloat(e.target.value) || 0 })
                    }
                    className={errors.price ? "border-destructive" : ""}
                  />
                  {errors.price && (
                    <p className="text-xs text-destructive">{errors.price}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>原价（元）</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.originalPrice}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        originalPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>折扣（0-100）</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={form.discount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discount: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>评分（0-5）</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={form.rating}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rating: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              {/* 标签 */}
              <div className="space-y-1.5">
                <Label>商品标签</Label>
                <TagEditor
                  value={form.tags}
                  onChange={(v) => setForm({ ...form, tags: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 图片上传 */}
          <Card>
            <CardHeader>
              <CardTitle>商品图片</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 主图 */}
              <ImageUpload
                label="主图（封面图）"
                multiple={false}
                maxFiles={1}
                files={mainImageFiles}
                existingUrls={existingMainImages}
                onFilesChange={setMainImageFiles}
                onRemoveExisting={(i) =>
                  setExistingMainImages(existingMainImages.filter((_, idx) => idx !== i))
                }
              />
              <Separator />
              {/* 多图 */}
              <ImageUpload
                label="商品轮播图（最多 8 张）"
                multiple
                maxFiles={8}
                files={imageFiles}
                existingUrls={existingImages}
                onFilesChange={setImageFiles}
                onRemoveExisting={(i) =>
                  setExistingImages(existingImages.filter((_, idx) => idx !== i))
                }
              />
            </CardContent>
          </Card>

          {/* SKU 规格 */}
          <Card>
            <CardHeader>
              <CardTitle>SKU 规格变体</CardTitle>
            </CardHeader>
            <CardContent>
              <SkuEditor
                skus={skus}
                onChange={setSkus}
                defaultPrice={form.price}
              />
            </CardContent>
          </Card>
        </div>

        {/* ── 右侧属性面板 ── */}
        <div className="space-y-6">
          {/* 分类与品牌 */}
          <Card>
            <CardHeader>
              <CardTitle>分类与品牌</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 分类（树状选择）*/}
              <CategorySelector
                categories={categories}
                value={form.category_id}
                onChange={(v) => setForm({ ...form, category_id: v })}
                error={errors.category_id}
              />

              {/* 品牌 */}
              <div className="space-y-1.5">
                <Label>品牌</Label>
                <Select
                  value={form.brand}
                  onValueChange={(v) => setForm({ ...form, brand: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择品牌（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无品牌</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 库存管理 */}
          <Card>
            <CardHeader>
              <CardTitle>库存管理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>库存数量</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) =>
                    setForm({ ...form, stock: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="inStock"
                  checked={form.inStock}
                  onCheckedChange={(c) => setForm({ ...form, inStock: !!c })}
                />
                <Label htmlFor="inStock">有货（inStock）</Label>
              </div>
              {form.stock <= 10 && form.stock > 0 && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-yellow-700 dark:text-yellow-400 text-xs">
                  ⚠️ 库存偏低，建议及时补货
                </div>
              )}
              {form.stock === 0 && (
                <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-red-700 dark:text-red-400 text-xs">
                  🚫 库存为零，建议关闭上架
                </div>
              )}
            </CardContent>
          </Card>

          {/* 商品状态 */}
          <Card>
            <CardHeader>
              <CardTitle>商品标记</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Checkbox
                  id="isNew"
                  checked={form.isNew}
                  onCheckedChange={(c) => setForm({ ...form, isNew: !!c })}
                />
                <div>
                  <Label htmlFor="isNew" className="cursor-pointer font-medium">
                    新品
                  </Label>
                  <p className="text-xs text-muted-foreground">标记为新品上市</p>
                </div>
                {form.isNew && (
                  <Badge className="ml-auto bg-blue-500 text-white text-xs">
                    NEW
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Checkbox
                  id="isHot"
                  checked={form.isHot}
                  onCheckedChange={(c) => setForm({ ...form, isHot: !!c })}
                />
                <div>
                  <Label htmlFor="isHot" className="cursor-pointer font-medium">
                    热卖
                  </Label>
                  <p className="text-xs text-muted-foreground">标记为热卖商品</p>
                </div>
                {form.isHot && (
                  <Badge className="ml-auto bg-red-500 text-white text-xs">
                    HOT
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 保存按钮 */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  保存中...
                </>
              ) : (
                <>
                  <IconUpload className="h-4 w-4 mr-2" />
                  {isEdit ? "保存修改" : "创建商品"}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/products")}
              disabled={loading}
            >
              取消
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
