import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { limitMessage } from "@/lib/network-limits";

describe("network plan limit messages", () => {
  it("explains the member limit from the database trigger", () => {
    expect(limitMessage("ERROR: plan_limit_members")).toMatch(/member limit/i);
  });
  it("explains the role limit", () => {
    expect(limitMessage("plan_limit_roles")).toMatch(/role limit/i);
  });
  it("ignores unrelated errors", () => {
    expect(limitMessage("duplicate key value")).toBeNull();
    expect(limitMessage(null)).toBeNull();
  });
});
