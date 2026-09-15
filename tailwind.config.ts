import type { Config } from "tailwindcss";

// StayVista brand tokens — same palette used in the Hearth prototype.
// Bloom/Sky/Shine are identity accents (role-coded); good/warn/bad are
// separate semantic status tints, deliberately not brand-identity colours.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1E1E1E",
        warmwhite: "#FAF7F2",
        panel: "#FFFFFF",
        line: "#E7DFD0",
        hair: "#F1EBDD",
        muted: "#79726A",
        bloom: { DEFAULT: "#E9A0A7", deep: "#C24F63", bg: "rgba(233,160,167,.16)" },
        sky:   { DEFAULT: "#9CCDFB", deep: "#3E7CB1", bg: "rgba(156,205,251,.18)" },
        shine: { DEFAULT: "#FDD5A9", deep: "#B4763A", bg: "rgba(253,213,169,.22)" },
        good: "#4C7A50",
        warn: "#B3812C",
        bad:  "#9A3F2E",
      },
      fontFamily: {
        serif: ["Marcellus", "Cambria", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: { DEFAULT: "6px" },
    },
  },
  plugins: [],
};
export default config;
