/**
 * PageLayout — standardized page wrapper with consistent
 * spacing, page header, and title/subtitle pattern.
 *
 * Design principles:
 * - Consistent vertical rhythm across all pages
 * - Single container variant (page-inner) for padding/gap
 * - Page header always at top with title + optional actions
 * - Accessible: main landmark, heading h1, visually focused
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { IconWarning } from "@/lib/icons.tsx"

// ── PageLayout ────────────────────────────────────────────────
interface PageLayoutProps {
  children: React.ReactNode
  className?: string
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <main
      className={cn("page-container", className)}
      // landmark for screen readers
      role="main"
    >
      <div className="page-inner">{children}</div>
    </main>
  )
}

// ── PageHeader ────────────────────────────────────────────────
interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  icon,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("page-header", className)}>
      <div className="min-w-0">
        <h1 className="page-title flex items-center gap-2">
          {icon && (
            <span className="text-primary shrink-0" aria-hidden="true">
              {icon}
            </span>
          )}
          {title}
        </h1>
        {description && (
          <p className="page-subtitle">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  )
}

// ── PageSection ───────────────────────────────────────────────
interface PageSectionProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function PageSection({ title, children, className }: PageSectionProps) {
  return (
    <section className={cn("space-y-3", className)} aria-label={title}>
      {title && (
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      )}
      {children}
    </section>
  )
}

// ── EmptyState ────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn("empty-state", className)}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <span className="empty-state-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="empty-state-title">{title}</p>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── ErrorState ────────────────────────────────────────────────
interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = "加载失败",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn("empty-state", className)}
      role="alert"
      aria-live="assertive"
    >
      <IconWarning
        className="h-12 w-12 mb-3 text-destructive opacity-80"
        aria-hidden="true"
      />
      <p className="empty-state-title text-destructive">{title}</p>
      <p className="empty-state-description">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          重试
        </Button>
      )}
    </div>
  )
}

// ── LoadingRows ───────────────────────────────────────────────
interface LoadingRowsProps {
  rows?: number
  className?: string
}

export function LoadingRows({ rows = 4, className }: LoadingRowsProps) {
  return (
    <div
      className={cn("space-y-3", className)}
      role="status"
      aria-label="Loading content"
      aria-live="polite"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  )
}

// ── StatsGrid ─────────────────────────────────────────────────
interface StatsGridProps {
  children: React.ReactNode
  cols?: 2 | 3 | 4 | 6
  className?: string
}

export function StatsGrid({ children, cols = 4, className }: StatsGridProps) {
  const colClass = {
    2: "grid-cols-1 @xl/main:grid-cols-2",
    3: "grid-cols-1 @md/main:grid-cols-3",
    4: "grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-4",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  }[cols]

  return (
    <div className={cn(`grid gap-4 ${colClass}`, className)}>
      {children}
    </div>
  )
}

// ── ToolbarRow ────────────────────────────────────────────────
interface ToolbarRowProps {
  children: React.ReactNode
  className?: string
}

export function ToolbarRow({ children, className }: ToolbarRowProps) {
  return (
    <div className={cn("toolbar", className)} role="toolbar">
      {children}
    </div>
  )
}
