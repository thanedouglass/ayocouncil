/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        abyss: '#050505',
        void: '#08090E',
        flare: '#FF1493',
        stone: {
          ruby: '#FF415F',
          amber: '#FFC32D',
          violet: '#B955FF',
          cyan: '#00F0FF',
          emerald: '#2DF5A5',
          azure: '#5A96FF'
        },
        ruby: {
          DEFAULT: '#ff2a4b',
          hover: '#ff4b66',
          muted: '#8a1728',
          glow: 'rgba(255, 42, 75, 0.3)'
        },
        aura: {
          violet: '#7c3aed',
          crimson: '#dc2645'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', '"Courier New"', 'monospace']
      },
      boxShadow: {
        'ruby-glow': '0 0 25px rgba(255, 42, 75, 0.35)',
        'ruby-border': '0 0 10px rgba(255, 42, 75, 0.25)',
        'glass-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
        'aura-idle': '0 0 60px -12px rgba(255, 42, 75, 0.12)',
        'emerald-seal': '0 0 18px -4px rgba(16, 185, 129, 0.45)'
      },
      backdropBlur: {
        '3xl': '64px'
      }
    },
  },
  plugins: [],
}
