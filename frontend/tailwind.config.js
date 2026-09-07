/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        iot: {
          bg: '#0b0f19',
          card: '#111827',
          cardHover: '#1f293d',
          border: '#1f2937',
          primary: '#3b82f6',
          primaryDark: '#1d4ed8',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          accent: '#8b5cf6',
          textMuted: '#9ca3af',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
