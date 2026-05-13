/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        royal: {
          900: '#02135e', 
          800: '#0a2491',
          700: '#1e3a8a',
          600: '#2563eb',
          500: '#3b82f6',
          100: '#dbeafe',
          50: '#eff6ff',
        },
        emerald: {
          700: '#047857', 
          600: '#059669',
          500: '#10b981',
          100: '#d1fae5',
          50: '#ecfdf5',
        },
        gold: {
          500: '#fde047', 
          400: '#fef08a',
          100: '#fef9c3',
          50: '#fefce8',
        }
      }
    },
  },
  plugins: [],
};