/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Original Campus Academy palette — deep savanna-night navy with
        // amber (sunset/achievement) and teal (growth/tech) accents.
        night: {
          DEFAULT: "#0B1420",
          surface: "#121F2E",
          raised: "#1A2C3F",
          border: "#233953",
        },
        amber: {
          DEFAULT: "#E8A33D",
          soft: "#F4C878",
          deep: "#B87A1F",
        },
        teal: {
          DEFAULT: "#2DD4A7",
          soft: "#7EE8C9",
          deep: "#1B9B7A",
        },
        ivory: {
          DEFAULT: "#F3F1EA",
          muted: "#8B9AAE",
        },
        danger: "#E8583D",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Sora'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
