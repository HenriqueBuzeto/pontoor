import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ponto: {
          black: "var(--ponto-black)",
          "black-soft": "var(--ponto-black-soft)",
          orange: "var(--ponto-orange)",
          "orange-hover": "var(--ponto-orange-hover)",
          "orange-muted": "var(--ponto-orange-muted)",
          white: "var(--ponto-white)",
          surface: "var(--ponto-surface)",
          muted: "var(--ponto-muted)",
          "muted-soft": "var(--ponto-muted-soft)",
          border: "var(--ponto-border)",
          "border-soft": "var(--ponto-border-soft)",
          success: "var(--ponto-success)",
          warning: "var(--ponto-warning)",
          error: "var(--ponto-error)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      borderRadius: {
        ponto: "var(--radius-ponto, 0.5rem)",
        lux: "var(--radius-lux, 0.75rem)",
        "lux-xl": "var(--radius-xl, 1rem)",
      },
      boxShadow: {
        ponto: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
        "ponto-md": "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
        lux: "var(--shadow-lux)",
        "lux-md": "var(--shadow-lux-md)",
        "lux-lg": "var(--shadow-lux-lg)",
        "lux-orange": "var(--shadow-orange)",
        "lux-inner": "inset 0 1px 0 0 rgb(255 255 255 / 0.05)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "fade-in-up": "fadeInUp 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
