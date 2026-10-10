import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import {
  ANNUAL_PRICE_KES,
  HIRE_FEE,
  PLAN_PRICE_KES,
  addMonth,
  addYear,
  billingConfigured,
  formatKes,
  intervalFromCode,
  isInterval,
  isPaidPlan,
  isRecurring,
  planCode,
  planFromCode,
  priceFor,
} from "@/lib/billing";

const ENV = { ...process.env };

beforeEach(() => {
  process.env.PAYSTACK_SECRET_KEY = "sk_test_x";
  process.env.PAYSTACK_PLAN_STARTER = "PLN_starter_m";
  process.env.PAYSTACK_PLAN_PRO = "PLN_pro_m";
  process.env.PAYSTACK_PLAN_STARTER_ANNUAL = "PLN_starter_y";
  process.env.PAYSTACK_PLAN_PRO_ANNUAL = "PLN_pro_y";
});
afterEach(() => {
  process.env = { ...ENV };
});

describe("plans and prices", () => {
  it("prices match the published pricing (KES)", () => {
    expect(PLAN_PRICE_KES).toEqual({ plus: 499, starter: 13000, pro: 26000 });
    expect(ANNUAL_PRICE_KES).toEqual({ starter: 130000, pro: 260000 });
  });

  it("yearly is 10 months' price (two months free)", () => {
    expect(ANNUAL_PRICE_KES.starter).toBe(PLAN_PRICE_KES.starter * 10);
    expect(ANNUAL_PRICE_KES.pro).toBe(PLAN_PRICE_KES.pro * 10);
  });

  it("priceFor ignores the yearly interval for Plus", () => {
    expect(priceFor("plus", "annual")).toBe(499);
    expect(priceFor("starter", "annual")).toBe(130000);
    expect(priceFor("pro", "monthly")).toBe(26000);
  });

  it("hire fee and network share", () => {
    expect(HIRE_FEE).toEqual({ amountKes: 25000, networkShareKes: 5000 });
    expect(HIRE_FEE.networkShareKes).toBeLessThan(HIRE_FEE.amountKes);
  });

  it("formats KES with thousands separators", () => {
    expect(formatKes(26000)).toBe("KES 26,000");
  });
});

describe("plan guards", () => {
  it("accepts only real paid plans", () => {
    expect(isPaidPlan("plus")).toBe(true);
    expect(isPaidPlan("starter")).toBe(true);
    expect(isPaidPlan("pro")).toBe(true);
    expect(isPaidPlan("free")).toBe(false);
    expect(isPaidPlan("premium")).toBe(false);
    expect(isPaidPlan(undefined)).toBe(false);
  });

  it("only Starter and Pro are recurring", () => {
    expect(isRecurring("plus")).toBe(false);
    expect(isRecurring("starter")).toBe(true);
  });

  it("validates intervals", () => {
    expect(isInterval("monthly")).toBe(true);
    expect(isInterval("annual")).toBe(true);
    expect(isInterval("weekly")).toBe(false);
  });
});

describe("Paystack plan codes", () => {
  it("maps plan and interval to the right code", () => {
    expect(planCode("starter")).toBe("PLN_starter_m");
    expect(planCode("pro", "annual")).toBe("PLN_pro_y");
    expect(planCode("plus")).toBeNull();
  });

  it("maps codes back to plan and interval", () => {
    expect(planFromCode("PLN_pro_y")).toBe("pro");
    expect(intervalFromCode("PLN_pro_y")).toBe("annual");
    expect(intervalFromCode("PLN_starter_m")).toBe("monthly");
    expect(planFromCode("PLN_unknown")).toBeNull();
    expect(planFromCode(null)).toBeNull();
  });

  it("billing is off without a secret key", () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    expect(billingConfigured()).toBe(false);
    expect(billingConfigured("plus")).toBe(false);
  });

  it("Plus needs only the secret key; yearly needs its plan code", () => {
    expect(billingConfigured("plus")).toBe(true);
    delete process.env.PAYSTACK_PLAN_PRO_ANNUAL;
    expect(billingConfigured("pro", "annual")).toBe(false);
    expect(billingConfigured("pro", "monthly")).toBe(true);
  });
});

describe("billing periods", () => {
  it("adds one month and one year", () => {
    const from = new Date("2026-01-15T10:00:00Z");
    expect(addMonth(from)).toBe("2026-02-15T10:00:00.000Z");
    expect(addYear(from)).toBe("2027-01-15T10:00:00.000Z");
  });
});
