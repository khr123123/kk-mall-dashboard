/**
 * SettingsPage — System Preferences
 *
 * Improvements:
 * - Theme toggle integrated with the ThemeProvider (next-themes)
 * - High-contrast toggle
 * - Language & currency settings persist to localStorage via i18n module
 * - Consistent Chinese labels throughout
 * - Accessible: form labels, checkbox associations, ARIA live feedback
 */

import { useState } from "react"
import { toast } from "sonner"
import { Settings, Bell, Palette, Globe, Database } from "lucide-react"
import { useTheme } from "@/lib/theme"
import {
  IconThemeLight,
  IconThemeDark,
  IconThemeSystem,
} from "@/lib/icons.tsx"
import { setLocale, type SupportedLocale } from "@/lib/i18n"

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
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageLayout, PageHeader } from "@/components/layout"
import pb from "@/lib/pocketbase"

// ── ThemeSelector ─────────────────────────────────────────────
function ThemeSelector() {
  const { theme, setTheme, highContrast, toggleHighContrast } = useTheme()

  const themes = [
    { value: "light",  icon: <IconThemeLight  className="h-8 w-8" />, label: "浅色", desc: "白色背景" },
    { value: "dark",   icon: <IconThemeDark   className="h-8 w-8" />, label: "深色", desc: "黑色背景" },
    { value: "system", icon: <IconThemeSystem className="h-8 w-8" />, label: "跟随系统", desc: "自动切换" },
  ] as const

  return (
    <div className="space-y-6">
      {/* Theme selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">主题模式</Label>
        <div
          className="grid grid-cols-3 gap-4"
          role="radiogroup"
          aria-label="选择主题模式"
        >
          {themes.map((t) => (
            <button
              key={t.value}
              role="radio"
              aria-checked={theme === t.value}
              onClick={() => {
                setTheme(t.value)
                toast.success(`已切换到「${t.label}」模式`)
              }}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                ${
                  theme === t.value
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-accent/30"
                }`}
            >
              <span aria-hidden="true">{t.icon}</span>
              <div className="text-center">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Separator aria-hidden="true" />

      {/* High contrast */}
      <div className="flex items-center justify-between p-4 border rounded-xl">
        <div>
          <p className="font-medium text-sm">高对比度模式</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            提升文字与背景的对比度，改善可读性（符合 WCAG AA/AAA）
          </p>
        </div>
        <Checkbox
          id="high-contrast"
          checked={highContrast}
          onCheckedChange={() => {
            toggleHighContrast()
            toast.success(!highContrast ? "已开启高对比度模式" : "已关闭高对比度模式")
          }}
          aria-label="切换高对比度模式"
        />
      </div>
    </div>
  )
}

// ── SettingsPage ──────────────────────────────────────────────
export default function SettingsPage() {
  const [notifyOrder, setNotifyOrder]     = useState(true)
  const [notifyPromotion, setNotifyPromotion] = useState(true)
  const [notifySystem, setNotifySystem]   = useState(true)
  const [language, setLanguage]           = useState<SupportedLocale>("zh-CN")
  const [currency, setCurrency]           = useState("CNY")
  const [siteName, setSiteName]           = useState("K Mall")
  const [siteDescription, setSiteDescription] = useState("一站式电商管理平台")

  const handleSaveGeneral = () => {
    setLocale(language)
    localStorage.setItem("kmall-currency", currency)
    toast.success("通用设置已保存")
  }

  const handleSaveNotifications = () => {
    toast.success("通知偏好已保存")
  }

  return (
    <PageLayout>
      <PageHeader
        title="系统设置"
        description="管理应用程序偏好与配置"
        icon={<Settings className="h-6 w-6" />}
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[520px]" aria-label="设置分类">
          <TabsTrigger value="general" className="gap-1.5">
            <Globe className="h-4 w-4" aria-hidden="true" />
            通用
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Palette className="h-4 w-4" aria-hidden="true" />
            外观
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-4 w-4" aria-hidden="true" />
            通知
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5">
            <Database className="h-4 w-4" aria-hidden="true" />
            系统
          </TabsTrigger>
        </TabsList>

        {/* ── General ── */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>通用设置</CardTitle>
              <CardDescription>配置站点基本信息与地区偏好</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="site-name">站点名称</Label>
                <Input
                  id="site-name"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="请输入站点名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site-desc">站点描述</Label>
                <Input
                  id="site-desc"
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  placeholder="请输入站点描述"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language-select">界面语言</Label>
                  <Select
                    value={language}
                    onValueChange={(v) => setLanguage(v as SupportedLocale)}
                  >
                    <SelectTrigger id="language-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN">简体中文</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="ja-JP">日本語</SelectItem>
                      <SelectItem value="ko-KR">한국어</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency-select">货币单位</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNY">人民币（CNY）</SelectItem>
                      <SelectItem value="USD">美元（USD）</SelectItem>
                      <SelectItem value="EUR">欧元（EUR）</SelectItem>
                      <SelectItem value="JPY">日元（JPY）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveGeneral}>保存设置</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Appearance ── */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>外观设置</CardTitle>
              <CardDescription>自定义界面主题与视觉效果</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeSelector />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>通知偏好</CardTitle>
              <CardDescription>选择您希望接收的通知类型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {
                  id: "notify-order",
                  label: "订单状态更新",
                  desc: "订单状态变更时收到通知",
                  checked: notifyOrder,
                  onChange: setNotifyOrder,
                },
                {
                  id: "notify-promo",
                  label: "促销活动",
                  desc: "新的促销与优惠通知",
                  checked: notifyPromotion,
                  onChange: setNotifyPromotion,
                },
                {
                  id: "notify-system",
                  label: "系统通知",
                  desc: "重要系统消息与更新",
                  checked: notifySystem,
                  onChange: setNotifySystem,
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-xl"
                >
                  <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                  </Label>
                  <Checkbox
                    id={item.id}
                    checked={item.checked}
                    onCheckedChange={(c) => item.onChange(!!c)}
                  />
                </div>
              ))}
              <Button onClick={handleSaveNotifications}>保存偏好</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── System ── */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>系统信息</CardTitle>
              <CardDescription>PocketBase 后端状态与环境信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="grid grid-cols-2 gap-4"
                role="list"
                aria-label="系统信息列表"
              >
                {[
                  {
                    label: "后端地址",
                    value: pb.baseURL,
                    mono: true,
                  },
                  {
                    label: "认证状态",
                    value: pb.authStore.isValid ? "已认证" : "未认证",
                    valueClass: pb.authStore.isValid
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive",
                  },
                  {
                    label: "应用版本",
                    value: "v0.2.0",
                  },
                  {
                    label: "运行环境",
                    value: import.meta.env.MODE === "production" ? "生产环境" : "开发环境",
                  },
                ].map(({ label, value, mono, valueClass }) => (
                  <div key={label} className="p-4 border rounded-xl" role="listitem">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p
                      className={`font-medium mt-1 break-all text-sm ${mono ? "font-mono" : ""} ${valueClass ?? ""}`}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <Separator aria-hidden="true" />

              <section aria-label="数据库集合">
                <h4 className="font-medium mb-2 text-sm">数据库集合</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    "users",
                    "products",
                    "product_skus",
                    "category",
                    "brands",
                    "orders",
                    "messages",
                    "favorites",
                  ].map((col) => (
                    <Badge key={col} variant="outline" className="font-mono text-xs">
                      {col}
                    </Badge>
                  ))}
                </div>
              </section>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
