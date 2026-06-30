import type { Config } from "tailwindcss";

/**
 * ASCENDR Tailwind theme — driven by the Stage 1 Design System tokens.
 * Source of truth: ASCENDR UI/UX Master Design Specification, Stage 1.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        secondary: "#2563EB",
        accent: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        bg: "#F8FAFC",
        card: "#FFFFFF",
        text: { DEFAULT: "#0F172A", secondary: "#64748B" },
        border: "#E2E8F0",
        dark: { bg: "#0F172A", card: "#1E293B", text: "#F8FAFC" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["56px", { lineHeight: "1.1", fontWeight: "800" }],
        h1: ["40px", { lineHeight: "1.15", fontWeight: "800" }],
        h2: ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        h3: ["24px", { lineHeight: "1.3", fontWeight: "700" }],
        h4: ["20px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["16px", { lineHeight: "1.6" }],
        small: ["14px", { lineHeight: "1.5" }],
        caption: ["12px", { lineHeight: "1.4" }],
      },
      borderRadius: { sm: "8px", md: "12px", lg: "16px", xl: "24px" },
      spacing: {
        // 8px base grid (extends Tailwind's default scale)
        "18": "72px",
        "30": "120px",
      },
    },
  },
  plugins: [],
};

export default config;
