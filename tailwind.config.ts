import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        rook: "0 4px 32px rgba(201, 162, 77, 0.18)",
        "rook-lg": "0 8px 48px rgba(201, 162, 77, 0.22)",
        glow: "0 0 60px rgba(201, 162, 77, 0.12)",
      },
      colors: {
        rook: {
          200: "#f5e6b8",
          300: "#e8c882",
          400: "#d4a853",
          500: "#b8923f",
          600: "#96762e",
        },
        surface: {
          700: "#141a24",
          800: "#0f1419",
          900: "#0a0e14",
        },
        brand: {
          50: "#f0fdf9",
          100: "#ccfbef",
          200: "#99f6df",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        agent: {
          flight: "#6366f1",
          lodging: "#8b5cf6",
          transport: "#06b6d4",
          attractions: "#f59e0b",
          savings: "#10b981",
          group: "#f97316",
          routing: "#84cc16",
          budget: "#ef4444",
          efficiency: "#22d3ee",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
