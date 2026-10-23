/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        xs: '480px',
      },
      colors: {
        vlc: {
          orange: '#d4ff00',
          darkOrange: '#c4ec00',
          amber: '#fbbf24',
          lightOrange: '#fef08a',
          cone: '#d4ff00'
        },
        bdstream: {
          dark: 'var(--bg-main)',
          card: 'var(--card-bg)',
          cardHover: 'var(--card-hover)',
          border: 'var(--border-color)',
          surface: 'var(--surface-bg)',
          text: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
          accent: '#d4ff00'
        }
      },
      fontFamily: {
        sans: ['"Lexend"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
