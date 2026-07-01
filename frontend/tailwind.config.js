/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#1A4D8F',
          teal: '#0F7B6C',
          purple: '#7B2D8B',
          green: '#16A34A',
          amber: '#D97706',
          red: '#DC2626',
        },
        sidebar: {
          bg: '#0F172A',
          hover: '#1E2A3B',
          active: '#1A4D8F',
          border: '#1E293B',
        },
        page: {
          bg: '#F8F9FC',
          card: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'ring-fill': 'ringFill 0.8s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'countdown': 'countdown 1s linear',
      },
      keyframes: {
        ringFill: {
          '0%': { strokeDashoffset: '251.2' },
          '100%': { strokeDashoffset: 'var(--offset)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.8)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px -1px rgba(0, 0, 0, 0.07)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'sidebar': '2px 0 8px 0 rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
