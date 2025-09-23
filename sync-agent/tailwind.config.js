/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
        },
        background: {
          DEFAULT: '#0f172a',
          light: '#1e293b',
        }
      }
    },
  },
  plugins: [],
} 