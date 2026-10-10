import { describe, expect, it } from "vitest";
import { safeNext } from "@/app/login/safe-next";

describe("post-login redirect guard", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/app/career?tab=gap")).toBe("/app/career?tab=gap");
  });
  it("blocks other sites and protocol-relative URLs", () => {
    expect(safeNext("https://evil.example")).toBe("/app");
    expect(safeNext("//evil.example")).toBe("/app");
    expect(safeNext("/\\evil.example")).toBe("/app");
  });
  it("blocks control characters and junk", () => {
    expect(safeNext("/app\nSet-Cookie:x")).toBe("/app");
    expect(safeNext(undefined)).toBe("/app");
    expect(safeNext("", "/onboarding")).toBe("/onboarding");
  });
});
