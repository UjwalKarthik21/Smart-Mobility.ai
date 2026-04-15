import { describe, it, expect } from "vitest"
import { generateRoutes } from "@/lib/generateRoutes"

describe("generateRoutes", () => {
  it("produces three routes with expected types and deterministic outputs", () => {
    const a = generateRoutes("A", "B")
    const b = generateRoutes("A", "B")

    expect(a).toHaveLength(3)
    expect(b).toHaveLength(3)
    // deterministic for same inputs
    expect(a).toEqual(b)

    const types = a.map((r) => r.type).sort()
    expect(types).toEqual(["fastest", "risk", "safest"].sort())

    // each route should include numeric duration and distance strings
    for (const r of a) {
      expect(r.duration).toMatch(/\d+\s*min/)
      expect(r.distance).toMatch(/\d+(?:\.\d+)?\s*km/)
      expect(typeof r.description).toBe("string")
    }
  })
})
