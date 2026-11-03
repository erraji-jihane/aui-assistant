/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: "#1F4D3A", dark: "#173B2C", light: "#E6EEE9" },
        gold: { DEFAULT: "#C9A227", light: "#F6EDCF" },
        terracotta: "#B5532E",
        cream: "#FAF7F0",
        line: "#E7E1D3",
        ink: "#1C2421",
        muted: "#6B7570",
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
}
