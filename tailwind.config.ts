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
          bg: "#0F172A",
          surface: "#111827",
          card: "#1F2937",
          border: "#374151",

          primary: "#6366F1",
          "primary-hover": "#4F46E5",

          text: "#F9FAFB",
          "text-secondary": "#9CA3AF",
          muted: "#6B7280",
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