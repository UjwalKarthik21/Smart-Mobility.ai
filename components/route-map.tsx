"use client"

import { useEffect, useRef, useState } from "react"
import { X, Navigation, MapPin, Clock, Ruler, Zap, Shield, AlertTriangle, Pencil, Check, Search, ArrowRight, ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const routeColors: Record<string, string> = {
  fastest: "#f59e0b",
  safest: "#10b981",
  risk: "#ef4444",
}

const routeLabels: Record<string, string> = {
  fastest: "Fastest",
  safest: "Safest",
  risk: "Shortest (risky)",
}

const routeIcons = {
  fastest: Zap,
  safest: Shield,
  risk: AlertTriangle,
}

interface RouteMapProps {
  isOpen: boolean
  onClose: () => void
  routeType: "fastest" | "safest" | "risk"
  source: string
  destination: string
  duration: string
  distance: string
  allRoutes: { type: "fastest" | "safest" | "risk"; duration: string; distance: string }[]
  onRouteChange: (type: "fastest" | "safest" | "risk") => void
  onSourceChange: (s: string) => void
  onDestinationChange: (d: string) => void
}
export function RouteMap({
  isOpen,
  onClose,
  routeType,
  source,
  destination,
  duration,
  distance,
  allRoutes,
  onRouteChange,
  onSourceChange,
  onDestinationChange,
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any | null>(null)
  const markersRef = useRef<any[]>([])
  const polylinesRef = useRef<any[]>([])
  const [isEditingSource, setIsEditingSource] = useState(false)
  const [isEditingDestination, setIsEditingDestination] = useState(false)
  const [tempSource, setTempSource] = useState(source)
  const [tempDestination, setTempDestination] = useState(destination)
  const [searchQuery, setSearchQuery] = useState("")
  const [isMapReady, setIsMapReady] = useState(false)

  // Geocode a place name using OpenStreetMap Nominatim. Returns [lat, lon] or null.
  async function getCoordinates(place: string): Promise<[number, number] | null> {
    if (!place || !place.trim()) return null
    try {
      const q = encodeURIComponent(place)
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&addressdetails=0`
      const res = await fetch(url, { headers: { "Accept": "application/json" } })
      if (!res.ok) return null
      const data = await res.json()
      if (!data || data.length === 0) return null
      const item = data[0]
      return [parseFloat(item.lat), parseFloat(item.lon)]
    } catch (e) {
      console.error("Geocoding error", e)
      return null
    }
  }

  useEffect(() => {
    if (!isOpen || !mapRef.current) return

    let cancelled = false

    const createIcon = (L: any, color: string) => {
      return L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            background: ${color};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 10px;
              height: 10px;
              background: white;
              border-radius: 50%;
            "></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
    }

    const fetchOSRMPath = async (points: [number, number][]) => {
      try {
        const coordString = points.map((p) => `${encodeURIComponent(p[1])},${encodeURIComponent(p[0])}`).join(";")
        const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`OSRM ${res.status}`)
        const data = await res.json()
        if (!data || !data.routes || data.routes.length === 0) return null
        const coords: number[][] = data.routes[0].geometry.coordinates
        return coords.map((c) => [c[1], c[0]] as [number, number])
      } catch (e) {
        console.error("OSRM fetch error", e)
        return null
      }
    }

    const updateMap = async (map: any, L: any) => {
      // clear previous markers/polylines
      markersRef.current.forEach((m) => m.remove())
      polylinesRef.current.forEach((p) => p.remove())
      markersRef.current = []
      polylinesRef.current = []

      // geocode source/destination
      const [sCoords, dCoords] = await Promise.all([getCoordinates(source), getCoordinates(destination)])

      // fallback if geocoding fails
      if (!sCoords && !dCoords) {
        const center = [20, 0]
        map.setView(center, 2)
        setIsMapReady(true)
        return
      }

      const start: [number, number] = (sCoords ?? dCoords!) as [number, number]
      const end: [number, number] = (dCoords ?? sCoords!) as [number, number]

      // compute simple midpoints and offsets to use as via points for OSRM routing
      const midLat = (start[0] + end[0]) / 2
      const midLon = (start[1] + end[1]) / 2
      const offsetLat = (end[1] - start[1]) * 0.25
      const offsetLon = -(end[0] - start[0]) * 0.25
      const safestMid: [number, number] = [midLat + offsetLat, midLon + offsetLon]
      const riskMid: [number, number] = [midLat - offsetLat * 0.6, midLon - offsetLon * 0.6]

      const fastestPromise = fetchOSRMPath([start, end])
      const safestPromise = fetchOSRMPath([start, safestMid, end])
      const riskPromise = fetchOSRMPath([start, riskMid, end])

      const [fastestPath, safestPath, riskPath] = await Promise.all([fastestPromise, safestPromise, riskPromise])

      const routePaths: Record<string, [number, number][]> = {
        fastest: fastestPath && fastestPath.length > 0 ? fastestPath : [start, end],
        safest: safestPath && safestPath.length > 0 ? safestPath : [start, safestMid, end],
        risk: riskPath && riskPath.length > 0 ? riskPath : [start, riskMid, end],
      }

      const startMarker = L.marker(start, { icon: createIcon(L, "#22c55e") }).addTo(map)
      startMarker.bindPopup("Start: " + source)
      markersRef.current.push(startMarker)

      const endMarker = L.marker(end, { icon: createIcon(L, routeColors[routeType]) }).addTo(map)
      endMarker.bindPopup("End: " + destination)
      markersRef.current.push(endMarker)

      const path = routePaths[routeType] || routePaths.fastest
      const line = L.polyline(path, {
        color: routeColors[routeType],
        weight: 6,
        opacity: 0.9,
        smoothFactor: 1,
      }).addTo(map)
      polylinesRef.current.push(line)

      const outline = L.polyline(path, {
        color: "white",
        weight: 2,
        opacity: 0.5,
        dashArray: "12, 24",
        smoothFactor: 1,
      }).addTo(map)
      polylinesRef.current.push(outline)

      // Fit map to the actual route geometry bounds for better framing
      try {
        const routeBounds = L.latLngBounds(path)
        map.fitBounds(routeBounds, { padding: [50, 50] })
      } catch (e) {
        const bounds = L.latLngBounds([start, end])
        map.fitBounds(bounds, { padding: [80, 80] })
      }

      setIsMapReady(true)
    }

    const init = async () => {
      const L = await import("leaflet")
      await import("leaflet/dist/leaflet.css")

      // create map if not exists
      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current!, {
          center: [20, 0],
          zoom: 2,
          zoomControl: false,
        })

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 19,
        }).addTo(map)

        L.control.zoom({ position: "bottomright" }).addTo(map)

        mapInstanceRef.current = map
      }

      if (cancelled) return
      await updateMap(mapInstanceRef.current, (await import("leaflet")))
    }

    init()

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        // keep map around between opens, but remove if closing
        if (!isOpen) {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
          markersRef.current = []
          polylinesRef.current = []
          setIsMapReady(false)
        }
      }
    }
  }, [isOpen, routeType, source, destination])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 animate-in fade-in duration-200">
      {/* Full-screen Map Background */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Close Button - Top Left */}
      <button
        onClick={onClose}
        className="absolute left-4 top-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-card/90 border border-border backdrop-blur-md text-foreground shadow-lg hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
        aria-label="Close map"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Search Bar - Top Center */}
      <div className="absolute left-1/2 top-4 z-20 w-full max-w-md -translate-x-1/2 px-16 sm:px-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location..."
            className="h-12 w-full rounded-full border border-border bg-card/90 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground backdrop-blur-md shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Route Selector - Top Right */}
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
        {allRoutes.map((route) => {
          const Icon = routeIcons[route.type]
          const isActive = routeType === route.type
          return (
            <button
              key={route.type}
              onClick={() => onRouteChange(route.type)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium backdrop-blur-md border shadow-lg transition-all duration-200",
                isActive
                  ? "text-background border-transparent"
                  : "bg-card/90 border-border text-foreground hover:bg-secondary"
              )}
              style={isActive ? { backgroundColor: routeColors[route.type] } : {}}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{routeLabels[route.type]}</span>
            </button>
          )
        })}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card/95 backdrop-blur-md p-5 shadow-2xl">
          {/* Location Fields */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            {/* Source */}
            <div className="flex flex-1 items-center gap-3 rounded-xl bg-secondary/50 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20">
                <Navigation className="h-4 w-4 text-green-500" />
              </div>
              {isEditingSource ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={tempSource}
                    onChange={(e) => setTempSource(e.target.value)}
                    className="h-8 flex-1 text-sm bg-background border-border"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      onSourceChange(tempSource)
                      setIsEditingSource(false)
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="truncate text-sm font-medium text-foreground">{source}</p>
                  </div>
                  <button
                    onClick={() => {
                      setTempSource(source)
                      setIsEditingSource(true)
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Destination */}
            <div className="flex flex-1 items-center gap-3 rounded-xl bg-secondary/50 px-4 py-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${routeColors[routeType]}20` }}
              >
                <MapPin className="h-4 w-4" style={{ color: routeColors[routeType] }} />
              </div>
              {isEditingDestination ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={tempDestination}
                    onChange={(e) => setTempDestination(e.target.value)}
                    className="h-8 flex-1 text-sm bg-background border-border"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      onDestinationChange(tempDestination)
                      setIsEditingDestination(false)
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="truncate text-sm font-medium text-foreground">{destination}</p>
                  </div>
                  <button
                    onClick={() => {
                      setTempDestination(destination)
                      setIsEditingDestination(true)
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-4 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xl font-bold text-foreground">{duration}</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <span className="text-xl font-bold text-foreground">{distance}</span>
            </div>
          </div>
          
          
          {/* Close Button */}
          <Button
            className="mt-5 w-full rounded-xl py-6 text-base font-semibold transition-all duration-200 hover:scale-[1.02]"
            style={{
              backgroundColor: routeColors[routeType],
              color: "#0f172a",
            }}
            onClick={() => onClose()}
          >
            <Navigation className="mr-2 h-5 w-5" />
            Close Map
          </Button>
        </div>
      </div>
    </div>
  )
}

