import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { LIMITS, type QuotaBucket } from "@/lib/usage";

const ORDER = ["free", "plus", "starter", "pro", "premium"] as const;

describe("daily AI limits", () => {
  for (const bucket of Object.keys(LIMITS) as QuotaBucket[]) {
    it(`${bucket} never decreases as plans go up`, () => {
      const values = ORDER.map((t) => LIMITS[bucket][t]);
      for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    });

    it(`${bucket} limits are positive whole numbers`, () => {
      for (const t of ORDER) {
        expect(Number.isInteger(LIMITS[bucket][t])).toBe(true);
        expect(LIMITS[bucket][t]).toBeGreaterThan(0);
      }
    });
  }

  it("matches the numbers on the pricing page", () => {
    expect(LIMITS["ai:coach"]).toMatchObject({ free: 25, plus: 60, starter: 100, pro: 200 });
    expect(LIMITS["ai:interview"]).toMatchObject({ free: 5, plus: 12, starter: 20, pro: 50 });
  });
});
