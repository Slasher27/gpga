/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: ["emerald", "forest"], // Light mode: emerald, Dark mode: forest
    darkTheme: "forest",
    base: true,
    styled: true,
    utils: true,
  },
}
