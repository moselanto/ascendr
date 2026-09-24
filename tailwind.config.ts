import type { Config } from "tailwindcss";

/**
 * ASCENDR Tailwind theme.
 *
 * Colour: brand blue #4000F9, sampled from the logo. The `brand` ramp is a
 * mix toward white matching the lighter chevrons in the mark. Use ramp steps
 * rather than introducing new blues in components.
 *
 * Type: a two-face pairing.
 *   font-display -> Manrope       (brand, headings, nav, buttons, numbers)
 *   font-sans    -> Source Sans 3 (body, descriptions, forms, dashboards)
 * Both are loaded in src/app/layout.tsx via next/font and exposed as CSS
 * variables. `sans` is the default, so body copy needs no class.
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
          500: "#4000F9", // logo
          600: "#3700D6",
          700: "#2D00AE",
          DEFAULT: "#4000F9",
        },
        primary: "#4000F9",
        secondary: "#3700D6",
        // Darkened from the previous #10B981 / #F59E0B so status text reaches
        // AA on white; the old values only passed as large text.
        accent: "#0EA47A",
        warning: "#B45309",
        danger: "#DC2626",
        bg: "#F7F8FC",
        card: "#FFFFFF",
        text: { DEFAULT: "#10192F", secondary: "#5A6B8C" },
        border: "#E4E8F0",
        dark: { bg: "#0B1120", card: "#151F38", text: "#F7F8FC" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Headings are Manrope 700. The previous 800 weight read as heavy and
        // slightly generic; 700 with tighter tracking is more editorial.
        display: ["56px", { lineHeight: "1.06", fontWeight: "700", letterSpacing: "-0.03em" }],
        h1: ["40px", { lineHeight: "1.12", fontWeight: "700", letterSpacing: "-0.025em" }],
        h2: ["32px", { lineHeight: "1.18", fontWeight: "700", letterSpacing: "-0.02em" }],
        h3: ["24px", { lineHeight: "1.28", fontWeight: "700", letterSpacing: "-0.015em" }],
        h4: ["20px", { lineHeight: "1.4", fontWeight: "600", letterSpacing: "-0.01em" }],
        body: ["16px", { lineHeight: "1.65" }],
        small: ["14px", { lineHeight: "1.55" }],
        caption: ["12px", { lineHeight: "1.4" }],
      },
      borderRadius: { sm: "8px", md: "12px", lg: "16px", xl: "24px" },
      spacing: {
        "18": "72px",
        "30": "120px",
      },
    },
  },
  plugins: [],
};

export default config;
