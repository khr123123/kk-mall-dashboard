/**
 * Centralized Icon Registry
 *
 * All icons are registered here with semantic names.
 * Consuming components import from this file only — never
 * import icon libraries directly in pages / components.
 *
 * Naming convention:
 *   action:  verb that describes what it does (e.g. IconAdd)
 *   object:  noun for the thing it represents (e.g. IconOrder)
 *   state:   adjective / condition (e.g. IconSuccess)
 *   nav:     navigation landmark (e.g. NavIconDashboard)
 */

// ── Icon library imports ──────────────────────────────────────
export {
  // Navigation
  IconDashboard      as NavIconDashboard,
  IconShoppingCart   as NavIconOrders,
  IconPackage        as NavIconProducts,
  IconTags           as NavIconCatalog,
  IconUsers          as NavIconUsers,
  IconBell           as NavIconNotifications,
  IconSettings       as NavIconSettings,
  IconChartBar       as NavIconAnalytics,
  IconDatabase       as NavIconDataLibrary,
  IconReport         as NavIconReports,

  // Actions
  IconPlus           as IconAdd,
  IconEdit           as IconEdit,
  IconTrash          as IconDelete,
  IconEye            as IconView,
  IconDownload       as IconDownload,
  IconUpload         as IconUpload,
  IconRefresh        as IconRefresh,
  IconSearch         as IconSearch,
  IconFilter         as IconFilter,
  IconX              as IconClose,
  IconCheck          as IconCheck,
  IconCopy           as IconCopy,
  IconExternalLink   as IconExternalLink,
  IconArrowLeft      as IconArrowLeft,
  IconArrowRight     as IconArrowRight,
  IconArrowUp        as IconArrowUp,
  IconArrowDown      as IconArrowDown,
  IconChevronDown    as IconChevronDown,
  IconChevronRight   as IconChevronRight,
  IconChevronLeft    as IconChevronLeft,
  IconChevronUp      as IconChevronUp,
  IconSelector       as IconSelector,
  IconDotsVertical   as IconMoreActions,
  IconGripVertical   as IconDragHandle,
  IconBarcode        as IconBarcode,
  IconLayoutColumns  as IconColumns,

  // Objects / Entities
  IconPackage        as IconProduct,
  IconShoppingCart   as IconOrder,
  IconUsers          as IconUser,
  IconUserCircle     as IconUserProfile,
  IconBell           as IconNotification,
  IconTags           as IconTag,
  IconBuildingStore  as IconStore,
  IconCreditCard     as IconPayment,
  IconTruck          as IconShipping,
  IconStar           as IconStar,
  IconHeart          as IconFavorite,
  IconPhoto          as IconImage,
  IconFile           as IconFile,
  IconFolder         as IconFolder,
  IconDatabase       as IconDatabase,

  // State indicators
  IconCircleCheckFilled  as IconSuccess,
  IconAlertTriangle      as IconWarning,
  IconInfoCircle         as IconInfo,
  IconBan                as IconError,
  IconClock              as IconPending,
  IconCircleDashed       as IconDraft,
  IconLock               as IconLocked,
  IconLockOpen           as IconUnlocked,

  // Trending
  IconTrendingUp    as IconTrendingUp,
  IconTrendingDown  as IconTrendingDown,

  // Theme / Appearance
  IconSun           as IconThemeLight,
  IconMoon          as IconThemeDark,
  IconDeviceDesktop as IconThemeSystem,

  // Misc
  IconLogout        as IconLogout,
  IconNotification  as IconNotificationBell,
  IconReport        as IconReport,
  IconDotsVertical  as IconDotsVertical,
  IconCurrencyDollar as IconCurrency,
  IconSortAscending  as IconSortAsc,
  IconSortDescending as IconSortDesc,
  IconChevronsLeft   as IconFirstPage,
  IconChevronsRight  as IconLastPage,
  IconChevronLeft    as IconPrevPage,
  IconChevronRight   as IconNextPage,
} from "@tabler/icons-react"

// Re-export lucide icons under semantic names
export {
  DollarSign         as IconDollar,
  Package            as IconPackageOutline,
  ShoppingCart       as IconCartOutline,
  Users              as IconUsersOutline,
  TrendingUp         as IconTrendUp,
  Calendar           as IconCalendar,
  CheckCircle2       as IconCheckCircle,
  Clock              as IconClockOutline,
  Truck              as IconTruckOutline,
  XCircle            as IconXCircle,
  BarChart3          as IconBarChart,
  AlertTriangle      as IconAlertTriangle,
  Bell               as IconBellOutline,
  BellOff            as IconBellOff,
  Search             as IconSearchOutline,
  Settings           as IconSettingsOutline,
  Tag                as IconTagOutline,
  Star               as IconStarOutline,
  ExternalLink       as IconLinkExternal,
  CheckCheck         as IconCheckAll,
  RefreshCw          as IconRefreshCw,
  Trash2             as IconTrash2,
  Globe              as IconGlobe,
  Sun                as IconSunOutline,
  Moon               as IconMoonOutline,
  FolderOpen         as IconFolderOpen,
  FolderClosed       as IconFolderClosed,
  FolderTree         as IconFolderTree,
  CreditCard         as IconCreditCardOutline,
  User               as IconUserOutline,
  PieChart           as IconPieChart,
  ArrowUpRight       as IconArrowUpRight,
  ArrowDownRight     as IconArrowDownRight,
} from "lucide-react"

// ── Icon size presets ─────────────────────────────────────────
export const ICON_SIZES = {
  xs:  12,
  sm:  14,
  md:  16,
  lg:  20,
  xl:  24,
  "2xl": 32,
} as const

export type IconSize = keyof typeof ICON_SIZES
