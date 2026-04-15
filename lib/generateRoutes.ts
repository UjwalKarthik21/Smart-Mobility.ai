export interface RouteResult {
  type: "fastest" | "safest" | "risk"
  duration: string
  distance: string
  description: string
}

// Generate three realistic routes based on source/destination with a seeded RNG
export function generateRoutes(source: string, destination: string): RouteResult[] {
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
