"use client"

import { cn } from "@/lib/utils"
import { Zap, Shield, AlertTriangle, Clock, Route, type LucideIcon } from "lucide-react"

interface RouteCardProps {
  type: "fastest" | "safest" | "risk"
  duration: string
  distance: string
  description: string
  isSelected?: boolean
  recommended?: boolean
  onClick?: () => void
}

const routeConfig: Record<
  RouteCardProps["type"],
  {
    label: string
    subtitle: string
    icon: LucideIcon
    accentColor: string
    bgGradient: string
    borderClass: string
    selectedRing: string
    iconBg: string
  }
> = {
  fastest: {
    label: "Fastest Route",
    subtitle: "Medium risk - Optimized for speed",
    icon: Zap,
    accentColor: "text-warning",
    bgGradient: "from-warning/10 to-warning/5",
    borderClass: "border-warning/30 hover:border-warning/60",
    selectedRing: "ring-warning/50 border-warning/60 shadow-warning/10",
    iconBg: "bg-warning/15",
  },
  safest: {
    label: "Safest Route",
    subtitle: "Low risk - Maximum safety priority",
    icon: Shield,
    accentColor: "text-safe",
    bgGradient: "from-safe/10 to-safe/5",
    borderClass: "border-safe/30 hover:border-safe/60",
    selectedRing: "ring-safe/50 border-safe/60 shadow-safe/10",
    iconBg: "bg-safe/15",
  },
  risk: {
    label: "Risk Level",
    subtitle: "High risk - Caution advised",
    icon: AlertTriangle,
    accentColor: "text-danger",
    bgGradient: "from-danger/10 to-danger/5",
    borderClass: "border-danger/30 hover:border-danger/60",
    selectedRing: "ring-danger/50 border-danger/60 shadow-danger/10",
    iconBg: "bg-danger/15",
  },
}

export function RouteCard({
  type,
  duration,
  distance,
  description,
  isSelected,
  recommended,
  onClick,
}: RouteCardProps) {
  const config = routeConfig[type]
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border bg-card p-5 text-left transition-all duration-300 sm:p-6",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        config.borderClass,
        isSelected && `ring-2 shadow-lg ${config.selectedRing}`,
        recommended && "ring-4 ring-offset-2 ring-primary/30 shadow-[0_8px_30px_rgba(34,197,94,0.14)]"
      )}
    >
      {/* Background gradient */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300",
          config.bgGradient,
          isSelected ? "opacity-100" : "group-hover:opacity-50"
        )}
      />

      {/* Content */}
      <div className="relative flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                config.accentColor,
                config.iconBg
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-semibold text-foreground">{config.label}</h3>
              <span className="text-xs text-muted-foreground">{config.subtitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {recommended && (
              <span className="mr-2 inline-flex items-center rounded-full bg-primary-600/90 px-3 py-1 text-xs font-medium text-background">
                Recommended
              </span>
            )}
            {/* Selection indicator */}
          <div
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
              isSelected
                ? "border-primary bg-primary"
                : "border-muted-foreground/30 bg-transparent"
            )}
          >
            {isSelected && (
              <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        </div>
        {/* Description */}
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 border-t border-border/50 pt-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{duration}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{distance}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
