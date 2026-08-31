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
        fintech: {
          dark: '#0a0d14',
          card: '#121826',
          cardHover: '#182032',
          border: '#1f293d',
          accent: '#5850ec',
          razorBlue: '#0c2340',
          razorBrand: '#3395ff',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
        spark: {
          bg: '#F4F6F5',
          forestDark: '#051C12',
          forestMed: '#072F1F',
          lime: '#B4F105',
          limeHover: '#c1f824',
          textMain: '#0B130F',
          textMuted: '#6C7E75',
          borderLight: '#E9EFEF',
          card: '#FFFFFF'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        }
      }
    },
  },
  plugins: [],
}
