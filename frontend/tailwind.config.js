/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vscode: {
          darkest: '#141414',
          bg: '#1e1e1e',
          header: '#181818',
          sidebar: '#252526',
          panel: '#1f1f20',
          hover: '#2a2d2e',
          active: '#37373d',
          border: '#333333',
          borderLight: '#444444',
          blue: '#007acc',
          blueHover: '#1f8ad2',
          textMuted: '#858585',
          text: '#cccccc',
          textBright: '#ffffff',
          statusbar: '#007acc',
          statusbarText: '#ffffff',
          success: '#22c55e',
          error: '#f43f5e',
          warning: '#eab308',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', '"Courier New"', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
