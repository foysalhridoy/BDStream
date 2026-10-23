/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vlc: {
          orange: '#FF8800',
          darkOrange: '#E06D00',
          amber: '#FFA500',
          lightOrange: '#FF9E33',
          cone: '#F47721'
        },
        bdstream: {
          dark: '#0c0e14',
          card: '#141824',
          cardHover: '#1c2234',
          border: '#23293d',
          surface: '#111522',
          text: '#f3f4f6',
          muted: '#9ca3af',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
