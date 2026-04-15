"use client"
"use client"

import { useState } from "react"
import { LocationInput } from "@/components/location-input"
import { RouteCard } from "@/components/route-card"
import { RouteMap } from "@/components/route-map"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight } from "lucide-react"

interface RouteResult {
  type: "fastest" | "safest" | "risk"
  duration: string
  distance: string
  description: string
}
// Generate three realistic routes based on source/destination with a seeded RNG
function generateRoutes(source: string, destination: string): RouteResult[] {
  // create a simple deterministic seed from the input so repeated inputs produce similar results
  let seed = 0
  const combined = `${source}||${destination}`
  for (let i = 0; i < combined.length; i++) seed = (seed * 31 + combined.charCodeAt(i)) >>> 0

  const rng = () => {
    // 32-bit LCG
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0x100000000
  }

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

  // Base distance between 10 and 20 km (realistic urban/intercity distances)
  const baseDistance = Math.round((10 + rng() * 10) * 10) / 10

  // Distances: risk = shortest, fastest = shortest or near-shortest, safest = slightly longer
  const riskDistance = Math.round((baseDistance * (0.9 + rng() * 0.05)) * 10) / 10
  const fastestDistance = Math.round((riskDistance + rng() * 0.8) * 10) / 10
  let safestDistance = Math.round((Math.max(baseDistance * (1.05 + rng() * 0.12), fastestDistance + 0.7)) * 10) / 10

  // Clamp distances to required bounds
  const minDist = 10
  const maxDist = 20
  const dRisk = clamp(riskDistance, minDist, maxDist)
  const dFast = clamp(fastestDistance, minDist, maxDist)
  safestDistance = clamp(safestDistance, minDist, maxDist)

  // Durations must be between 20 and 35 minutes and follow: Fastest < Risk < Safest
  // Generate deterministic durations around sensible ranges
  const fastestTime = Math.round(clamp(20 + rng() * 5, 20, 25))
  const riskTime = Math.round(clamp(fastestTime + (1 + Math.floor(rng() * 5)), 21, 32))
  const safestTime = Math.round(clamp(riskTime + (2 + Math.floor(rng() * 4)), riskTime + 2, 35))

  const trafficStates = ["Light traffic", "Moderate traffic", "Heavy traffic"]
  const pickTraffic = () => trafficStates[Math.floor(rng() * trafficStates.length)]

  return [
    {
      type: "fastest",
      duration: `${fastestTime} min`,
      distance: `${dFast} km`,
      description: `${pickTraffic()}. Uses main arterials and limited turns to minimize travel time. Optimal for time-sensitive trips.`,
    },
    {
      type: "safest",
      duration: `${safestTime} min`,
      distance: `${safestDistance} km`,
      description: `${pickTraffic()}. Avoids highways and known risk zones; prefers well-lit, lower-speed streets for safer travel.`,
    },
    {
      type: "risk",
      duration: `${riskTime} min`,
      distance: `${dRisk} km`,
      description: `${pickTraffic()}. Shorter path that may pass through construction, narrow lanes, or poorly-lit areas — higher incident probability.`,
    },
  ]
}

export default function SmartMobilityPage() {
  const [source, setSource] = useState("")
  const [destination, setDestination] = useState("")
  const [routes, setRoutes] = useState<RouteResult[]>([])
  const [recommendedRoute, setRecommendedRoute] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const handleFindRoute = async () => {
    if (!source || !destination) return
    
    setIsLoading(true)
    setShowResults(false)
    
    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    const generated = generateRoutes(source, destination)
    setRoutes(generated)

    // Compute recommendation
    const parseMin = (s: string) => {
      const m = parseInt(s.replace(/[^0-9]/g, ""), 10)
      return Number.isFinite(m) ? m : 0
    }

    const times = Object.fromEntries(generated.map((r) => [r.type, parseMin(r.duration)])) as Record<string, number>

    // basic risk scores: fastest=0.5, safest=0.2, risk=0.8; bump if description indicates heavy traffic
    const baseRisk: Record<string, number> = { fastest: 0.5, safest: 0.2, risk: 0.8 }
    const riskScores: Record<string, number> = generated.reduce((acc, r) => {
      let score = baseRisk[r.type]
      if (r.description.toLowerCase().includes("heavy")) score += 0.1
      acc[r.type] = Math.min(1, score)
      return acc
    }, {} as Record<string, number>)

    let recommended: string | null = null

    // Rule 1: prefer safest if risk is high
    if ((riskScores as any)["risk"] >= 0.7) {
      recommended = "safest"
    }

    // Rule 2: prefer fastest if it saves more than 5 minutes compared to others
    const otherMin = Math.min(times["risk"], times["safest"])
    if (!recommended && otherMin - times["fastest"] > 5) {
      recommended = "fastest"
    }

    // Rule 3: otherwise pick balanced (median duration)
    if (!recommended) {
      const sorted = [...generated].sort((a, b) => parseMin(a.duration) - parseMin(b.duration))
      // median element
      const mid = sorted[Math.floor(sorted.length / 2)].type
      recommended = mid
    }

    setRecommendedRoute(recommended)

    setIsLoading(false)
    setShowResults(true)
    setSelectedRoute("fastest")
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 py-12 sm:py-20">
      <div className="w-full max-w-xl">
        {/* Header */}
        <header className="flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Navigation</span>
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
            Smart Mobility AI
          </h1>
          <p className="mt-4 max-w-md text-base text-muted-foreground text-pretty sm:text-lg">
            Find the optimal route based on speed, safety, and real-time risk analysis.
          </p>
        </header>

        {/* Input Section */}
        <section className="mt-10 w-full rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-4">
            <LocationInput
              type="source"
              value={source}
              onChange={setSource}
              placeholder="Where are you starting from?"
            />

            <div className="relative flex items-center justify-center py-1">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card">
                <ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground" />
              </div>
            </div>

            <LocationInput
              type="destination"
              value={destination}
              onChange={setDestination}
              placeholder="Where do you want to go?"
            />
          </div>

          <Button
            onClick={handleFindRoute}
            disabled={!source || !destination || isLoading}
            className="mt-8 h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:hover:scale-100 disabled:shadow-none"
            size="lg"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span>Analyzing routes...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <Sparkles className="h-5 w-5" />
                <span>Find Smart Route</span>
              </span>
            )}
          </Button>
        </section>

        {/* Loading State */}
        {isLoading && (
          <section className="mt-12 flex w-full flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-lg font-medium text-foreground">Finding best route...</p>
              <p className="text-sm text-muted-foreground">Analyzing traffic, safety, and risk factors</p>
            </div>
          </section>
        )}

        {/* Results Section */}
        {showResults && (
          <section className="mt-12 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Section Header */}
            <div className="mb-6 flex flex-col items-center text-center">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                AI Analysis Complete
              </span>
              <h2 className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">
                Choose Your Route
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select the option that best fits your needs
              </p>
            </div>

            {/* Route Cards */}
            <div className="flex flex-col gap-4">
              {routes.map((route, index) => (
                <div
                  key={route.type}
                  className="animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: "backwards" }}
                >
                  <RouteCard
                    type={route.type}
                    duration={route.duration}
                    distance={route.distance}
                    description={route.description}
                    isSelected={selectedRoute === route.type}
                    recommended={recommendedRoute === route.type}
                    onClick={() => setSelectedRoute(route.type)}
                  />
                </div>
              ))}
            </div>

            {/* Navigation Button */}
            {selectedRoute && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Button
                  className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
                  size="lg"
                  onClick={() => setShowMap(true)}
                >
                  <span className="flex items-center justify-center gap-3">
                    <span>Start Navigation</span>
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Button>
              </div>
            )}
          </section>
        )}

        {/* Map Modal */}
        {selectedRoute && (
          <RouteMap
            isOpen={showMap}
            onClose={() => setShowMap(false)}
            routeType={selectedRoute as "fastest" | "safest" | "risk"}
            source={source}
            destination={destination}
            duration={routes.find((r) => r.type === selectedRoute)?.duration || ""}
            distance={routes.find((r) => r.type === selectedRoute)?.distance || ""}
            allRoutes={routes.map((r) => ({ type: r.type, duration: r.duration, distance: r.distance }))}
            onRouteChange={(type: "fastest" | "safest" | "risk") => setSelectedRoute(type)}
            onSourceChange={setSource}
            onDestinationChange={setDestination}
            
          />
        )}
      </div>
    </main>
  )
}
