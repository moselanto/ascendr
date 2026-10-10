import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests for pure server logic (billing, limits, validation, redirects).
// Database permissions (RLS) need a real Postgres and are not covered here.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
