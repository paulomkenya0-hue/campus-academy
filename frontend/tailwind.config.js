/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F1B2D",   // sidebar bg (navy nyeusi)
          soft: "#1C2A40",
        },
        surface: "#FFFFFF",
        canvas: "#F4F6F9",      // background ya content area
        border: "#E7EAF0",
        muted: "#6B7280",
        teal: { DEFAULT: "#14B8A6", soft: "#CCFBF1" },
        amber: { DEFAULT: "#F59E0B", soft: "#FEF3C7" },
        violet: { DEFAULT: "#6366F1", soft: "#E0E7FF" },
        pink: { DEFAULT: "#EC4899", soft: "#FCE7F3" },
        danger: { DEFAULT: "#EF4444", soft: "#FEE2E2" },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" },
      boxShadow: { card: "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.04)" },
    },
  },
  plugins: [],
};
