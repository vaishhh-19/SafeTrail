/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        accent: {
          50:  "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          500: "#ec4899",
          600: "#db2777",
        },
        danger:   { DEFAULT: "#ef4444", light: "#fef2f2" },
        moderate: { DEFAULT: "#f97316", light: "#fff7ed" },
        safe:     { DEFAULT: "#16a34a", light: "#f0fdf4" },
      },
      boxShadow: {
        soft: "0 2px 10px -2px rgba(15, 23, 42, 0.06), 0 8px 24px -8px rgba(15, 23, 42, 0.08)",
        card: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
        glow: "0 0 0 4px rgba(14, 143, 230, 0.10)",
      },
      backgroundImage: {
        "app-gradient": "radial-gradient(900px circle at 0% 0%, #e0e7ff 0%, transparent 48%), radial-gradient(900px circle at 100% 0%, #fce7f3 0%, transparent 45%), radial-gradient(800px circle at 50% 100%, #cffafe 0%, transparent 42%), linear-gradient(180deg, #fafaff 0%, #f5f7ff 100%)",
        "aurora": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #ec4899 100%)",
      },
    },
  },
  plugins: [],
};
