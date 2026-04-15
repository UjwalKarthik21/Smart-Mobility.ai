"use client"

import { cn } from "@/lib/utils"
import { MapPin, Navigation } from "lucide-react"

interface LocationInputProps {
  type: "source" | "destination"
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function LocationInput({
  type,
  value,
  onChange,
  placeholder,
}: LocationInputProps) {
  const isSource = type === "source"
  const Icon = isSource ? Navigation : MapPin

  return (
    <div className="relative flex items-center">
      <div
        className={cn(
          "pointer-events-none absolute left-4 flex items-center justify-center",
          isSource ? "text-primary" : "text-destructive"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || (isSource ? "Enter source location" : "Enter destination")}
        className={cn(
          "h-14 w-full rounded-xl border-2 border-border bg-input pl-12 pr-4",
          "text-base text-foreground placeholder:text-muted-foreground",
          "transition-all duration-200",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
        )}
      />
    </div>
  )
}
