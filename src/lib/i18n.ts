/**
 * Internationalization & Locale Utilities
 *
 * Principles:
 * - All user-visible strings are externalized here (no inline literals
 *   in pages/components — use these helpers instead).
 * - Date / number / currency formatting is locale-aware.
 * - RTL layout: set `dir` attribute on <html> based on locale.
 * - Week start, timezone, and calendar system are configurable.
 */

// ── Locale configuration ──────────────────────────────────────

export type SupportedLocale = "zh-CN" | "en-US" | "ja-JP" | "ko-KR"

export interface LocaleConfig {
  locale: SupportedLocale
  currency: string
  dateFormat: string
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6  // 0 = Sunday, 1 = Monday
  dir: "ltr" | "rtl"
  timezone?: string
}

export const LOCALE_CONFIGS: Record<SupportedLocale, LocaleConfig> = {
  "zh-CN": {
    locale: "zh-CN",
    currency: "CNY",
    dateFormat: "yyyy-MM-dd",
    weekStartsOn: 1,
    dir: "ltr",
  },
  "en-US": {
    locale: "en-US",
    currency: "USD",
    dateFormat: "MM/dd/yyyy",
    weekStartsOn: 0,
    dir: "ltr",
  },
  "ja-JP": {
    locale: "ja-JP",
    currency: "JPY",
    dateFormat: "yyyy/MM/dd",
    weekStartsOn: 0,
    dir: "ltr",
  },
  "ko-KR": {
    locale: "ko-KR",
    currency: "KRW",
    dateFormat: "yyyy.MM.dd",
    weekStartsOn: 0,
    dir: "ltr",
  },
}

/** Active locale — reads from localStorage, falls back to zh-CN */
export function getLocale(): SupportedLocale {
  if (typeof window === "undefined") return "zh-CN"
  const stored = localStorage.getItem("kmall-locale") as SupportedLocale | null
  return stored && LOCALE_CONFIGS[stored] ? stored : "zh-CN"
}

export function setLocale(locale: SupportedLocale) {
  localStorage.setItem("kmall-locale", locale)
  document.documentElement.lang = locale
  document.documentElement.dir = LOCALE_CONFIGS[locale].dir
}

// ── Currency formatter ────────────────────────────────────────

/**
 * formatCurrency(amount, locale?, currency?)
 * Uses Intl.NumberFormat for locale-correct grouping / decimal.
 */
export function formatCurrency(
  amount: number,
  locale?: SupportedLocale,
  currency?: string
): string {
  const l = locale ?? getLocale()
  const cfg = LOCALE_CONFIGS[l]
  return new Intl.NumberFormat(l, {
    style: "currency",
    currency: currency ?? cfg.currency,
    minimumFractionDigits: cfg.currency === "JPY" || cfg.currency === "KRW" ? 0 : 2,
    maximumFractionDigits: cfg.currency === "JPY" || cfg.currency === "KRW" ? 0 : 2,
  }).format(amount)
}

/**
 * formatNumber(n, options?)  — locale-aware number formatting
 */
export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(getLocale(), options).format(n)
}

/**
 * formatPercent(ratio) — e.g. 0.1234 → "12.3%"
 */
export function formatPercent(ratio: number, fractionDigits = 1): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(ratio)
}

// ── Date / Time formatters ────────────────────────────────────

/**
 * formatDate — short date string (e.g. "2026-03-03" for zh-CN)
 */
export function formatDate(date: Date | string | null, locale?: SupportedLocale): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  const l = locale ?? getLocale()
  return new Intl.DateTimeFormat(l, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

/**
 * formatDateTime — date + time (e.g. "2026-03-03 14:32")
 */
export function formatDateTime(date: Date | string | null, locale?: SupportedLocale): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  const l = locale ?? getLocale()
  return new Intl.DateTimeFormat(l, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

/**
 * formatTime — time-only string (e.g. "14:32:05")
 */
export function formatTime(date: Date | string | null): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat(getLocale(), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d)
}

/**
 * formatShortDate — "03-03 14:32"  useful for compact table cells
 */
export function formatShortDate(date: Date | string | null): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat(getLocale(), {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

// ── UI Strings (zh-CN primary, easily extractable to i18n files) ──

export const UI_STRINGS = {
  // Common actions
  save:           "保存",
  cancel:         "取消",
  delete:         "删除",
  edit:           "编辑",
  view:           "查看",
  add:            "新建",
  confirm:        "确认",
  search:         "搜索",
  filter:         "筛选",
  refresh:        "刷新",
  export:         "导出",
  import:         "导入",
  loading:        "加载中…",
  saving:         "保存中…",
  deleting:       "删除中…",
  noData:         "暂无数据",
  retry:          "重试",
  back:           "返回",
  close:          "关闭",
  reset:          "重置",
  submit:         "提交",

  // Status
  active:         "启用",
  inactive:       "禁用",
  enabled:        "已启用",
  disabled:       "已禁用",
  pending:        "待处理",
  completed:      "已完成",
  failed:         "失败",
  success:        "成功",

  // Feedback
  saveSuccess:    "保存成功",
  saveFailed:     "保存失败，请重试",
  deleteSuccess:  "删除成功",
  deleteFailed:   "删除失败",
  loadFailed:     "数据加载失败",
  operationFailed:"操作失败，请重试",
  networkError:   "网络异常，请检查连接",

  // Confirmation dialogs
  deleteConfirm:  "确定要删除吗？此操作不可撤销。",
  unsavedChanges: "您有未保存的更改，确定要离开吗？",

  // Form validation
  required:       "此字段为必填项",
  invalidEmail:   "请输入有效的邮箱地址",
  invalidUrl:     "请输入有效的网址（以 http:// 或 https:// 开头）",
  tooShort:       (min: number) => `最少需要 ${min} 个字符`,
  tooLong:        (max: number) => `最多允许 ${max} 个字符`,

  // Pagination
  page:           "第 {current} 页，共 {total} 页",
  itemsPerPage:   "每页显示",
  totalItems:     (n: number) => `共 ${n} 条`,

  // Table
  selected:       (n: number) => `已选择 ${n} 项`,
  columnVisibility: "显示列",
  sortAsc:        "升序",
  sortDesc:       "降序",
  clearSort:      "清除排序",

  // Empty states
  emptySearch:    "未找到匹配结果",
  emptySearchHint:"尝试调整搜索词或过滤条件",
  emptyList:      "列表为空",
  emptyListHint:  "点击「新建」按钮创建第一条记录",
} as const

// ── Order status labels (single source of truth) ──────────────
export const ORDER_STATUS_I18N = {
  pending:    "待付款",
  processing: "处理中",
  paid:       "已付款",
  shipped:    "已发货",
  delivered:  "已收货",
  cancelled:  "已取消",
  refunded:   "已退款",
} as const

// ── Message type labels ───────────────────────────────────────
export const MESSAGE_TYPE_I18N = {
  order_status:  "订单状态",
  order_created: "新订单",
  low_stock:     "库存预警",
  system:        "系统通知",
  promotion:     "促销活动",
  payment:       "支付通知",
  review:        "评价通知",
  account:       "账号通知",
} as const

// ── User role labels ──────────────────────────────────────────
export const USER_ROLE_I18N = {
  admin: "管理员",
  staff: "员工",
  user:  "用户",
} as const
