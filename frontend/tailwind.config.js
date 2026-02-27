/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        electric: "#2563eb",
        accent: "#0ea5e9",
      },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "blue-sm": "0 8px 30px rgba(37,99,235,0.35)",
      },
      backgroundImage: {
        "grid-dark":
          "radial-gradient(circle at 1px 1px, rgba(39,39,42,0.6) 1px, transparent 0)",
      },
      backgroundSize: {
        "grid-sm": "24px 24px",
      },
    },
  },
  plugins: [],
};
