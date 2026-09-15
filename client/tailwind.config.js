/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0c',
        surface: '#121217',
        card: '#181820',
        ruby: {
          DEFAULT: '#ff2a4b',
          hover: '#ff4b66',
          muted: '#8a1728',
          glow: 'rgba(255, 42, 75, 0.3)'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', '"Courier New"', 'monospace']
      },
      boxShadow: {
        'ruby-glow': '0 0 25px rgba(255, 42, 75, 0.35)',
        'ruby-border': '0 0 10px rgba(255, 42, 75, 0.25)'
      }
    },
  },
  plugins: [],
}
