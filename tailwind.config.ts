import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", ".dark"],

  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        core: {
          bg: "#0E2425",
          surface: "#102C2C",
          card: "#173434",
          border: "#345550",

          primary: "#147D70",
          accent: "#8AE0C9",
          "primary-hover": "#11675D",

          text: "#F4F8F5",
          "text-secondary": "#B1C7C0",
          muted: "#A1B7B1",
        },
        brand: { deep: "#143D3B", accent: "#1FAE9A", warm: "#F7F8F5", ink: "#192B32", muted: "#52635F", line: "#DCE5DE" },
        landing: {
          bg: "#F7F8F5",
          card: "#FFFFFF",
          border: "#DCE5DE",
          primary: "#11675D",
          accent: "#147D70",
          red: "#EF4444",
          gold: "#F59E0B",
        },
      },

      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
      },

      boxShadow: {
        subtle: "0 1px 2px rgba(0,0,0,0.05)",
      },

      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },

  plugins: [],
};

export default config;