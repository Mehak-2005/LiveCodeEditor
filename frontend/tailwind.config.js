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
          950: '#070a11',
          900: '#0a0e17',
          850: '#0d131f',
          800: '#111827',
          750: '#151d30',
          700: '#1e293b',
          600: '#334155',
        },
        vscode: {
          darkest: '#080c14',
          bg: '#0d121f',
          header: '#0a0e17',
          sidebar: '#111624',
          panel: '#0e1320',
          hover: '#192236',
          active: '#212d47',
          border: 'rgba(255, 255, 255, 0.08)',
          borderLight: 'rgba(255, 255, 255, 0.14)',
          blue: '#3b82f6',
          blueHover: '#60a5fa',
          textMuted: '#94a3b8',
          text: '#cbd5e1',
          textBright: '#f8fafc',
          statusbar: '#080c14',
          statusbarText: '#94a3b8',
          success: '#10b981',
          error: '#f43f5e',
          warning: '#f59e0b',
        }
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(59, 130, 246, 0.15)',
        'glow-md': '0 0 25px -5px rgba(59, 130, 246, 0.25)',
        'glow-lg': '0 0 35px -5px rgba(59, 130, 246, 0.35)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.25)',
        'glow-rose': '0 0 20px -3px rgba(244, 63, 94, 0.25)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', '"Courier New"', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
