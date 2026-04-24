/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a0a',
          800: '#171717',
          700: '#262626'
        },
        primary: {
          500: '#00ff88', // Verde neón
          600: '#00cc6a'
        },
        accent: {
          500: '#0088ff' // Azul eléctrico
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
