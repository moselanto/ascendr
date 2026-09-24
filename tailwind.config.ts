import type { Config } from "tailwindcss";

/**
 * ASCENDR Tailwind theme.
 *
 * Type scale is deliberately larger than the previous one. The old scale set
 * body at 16px/1.6 with #5A6B8C secondary text, which rendered thin and grey
 * — the main reason the page read as unclear. Body is now 18px/1.7 and
 * secondary text is darkened to 6.5:1. A geometric sans needs the extra size
 * and leading; do not shrink these back.
 *
 * `font-display` is kept as an alias of the same family so existing classes
 * keep working — there is one typeface now, not a pairing.
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
        brand: {
          50: "#F5F2FF",
          100: "#ECE6FE",
          200: "#D9CCFE",
          300: "#B69EFD",
          400: "#8359FB",
          500: "#4000F9",
          600: "#3700D6",
          700: "#2D00AE",
          DEFAULT: "#4000F9",
        },
        primary: "#4000F9",
        secondary: "#3700D6",
        accent: "#0EA47A",
        warning: "#B45309",
        danger: "#DC2626",
        bg: "#FFFFFF",
        surface: "#F6F7FB",
        card: "#FFFFFF",
        text: { DEFAULT: "#10192F", secondary: "#46587A" },
        border: "#E6E9F2",
        dark: { bg: "#0B1120", card: "#151F38", text: "#F6F7FB" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["60px", { lineHeight: "1.05", fontWeight: "700", letterSpacing: "-0.03em" }],
        h1: ["44px", { lineHeight: "1.1", fontWeight: "700", letterSpacing: "-0.028em" }],
        h2: ["34px", { lineHeight: "1.16", fontWeight: "700", letterSpacing: "-0.024em" }],
        h3: ["24px", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "-0.015em" }],
        h4: ["20px", { lineHeight: "1.4", fontWeight: "600", letterSpacing: "-0.01em" }],
        lead: ["20px", { lineHeight: "1.65" }],
        body: ["18px", { lineHeight: "1.7" }],
        small: ["16px", { lineHeight: "1.65" }],
        caption: ["13px", { lineHeight: "1.5" }],
      },
      borderRadius: { sm: "10px", md: "14px", lg: "18px", xl: "26px" },
      boxShadow: {
        card: "0 1px 2px rgba(16,25,47,0.04), 0 8px 24px -12px rgba(16,25,47,0.10)",
        lift: "0 2px 4px rgba(16,25,47,0.05), 0 18px 40px -16px rgba(64,0,249,0.22)",
      },
      maxWidth: { prose: "38rem" },
      spacing: { "18": "72px", "30": "120px" },
    },
  },
  plugins: [],
};

export default config;
