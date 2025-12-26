/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // BillManager theme colors (matching web app)
        background: '#1a1a2e',
        surface: '#16213e',
        border: '#0f3460',
        // Primary now uses billGreen to match web app
        primary: '#10b981',
        primaryDark: '#064e3b',
        // Keep distinct colors for amounts
        success: '#10b981',  // Green for deposits/income
        danger: '#ef4444',   // Red for expenses
        warning: '#f59e0b',
        muted: '#888888',
        // Legacy accent color
        accent: '#e94560',
      },
    },
  },
  plugins: [],
};
