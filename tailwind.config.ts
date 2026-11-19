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
        // Opt-in workspace foundation. Legacy core/brand/landing stay unchanged.
        // Values inherit only inside .workspace-theme; no global light override.
        workspace: {
          bg: "var(--workspace-bg)",
          surface: "var(--workspace-surface)",
          "surface-secondary": "var(--workspace-surface-secondary)",
          brand: "var(--workspace-brand)",
          "on-brand": "var(--workspace-on-brand)",
          primary: "var(--workspace-primary)",
          "primary-hover": "var(--workspace-primary-hover)",
          "on-primary": "var(--workspace-on-primary)",
          link: "var(--workspace-link)",
          text: "var(--workspace-text)",
          "text-secondary": "var(--workspace-text-secondary)",
          border: "var(--workspace-border)",
          "control-border": "var(--workspace-control-border)",
          focus: "var(--workspace-focus)",
          "focus-on-brand": "var(--workspace-focus-on-brand)",
          success: { DEFAULT: "var(--workspace-success)", surface: "var(--workspace-success-surface)" },
          warning: { DEFAULT: "var(--workspace-warning)", surface: "var(--workspace-warning-surface)" },
          danger: { DEFAULT: "var(--workspace-danger)", surface: "var(--workspace-danger-surface)" },
          info: { DEFAULT: "var(--workspace-info)", surface: "var(--workspace-info-surface)" },
        },
        core: {
          bg: "var(--core-bg, #0E2425)",
          surface: "var(--core-surface, #102C2C)",
          card: "var(--core-card, #173434)",
          border: "var(--core-border, #345550)",

          primary: "var(--core-primary, #147D70)",
          accent: "var(--core-accent, #8AE0C9)",
          "primary-hover": "var(--core-primary-hover, #11675D)",

          text: "var(--core-text, #F4F8F5)",
          "text-secondary": "var(--core-text-secondary, #B1C7C0)",
          muted: "var(--core-muted, #A1B7B1)",
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
