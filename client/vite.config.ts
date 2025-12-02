import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/login': 'http://localhost:5001',
      '/logout': 'http://localhost:5001',
      '/me': 'http://localhost:5001',
      '/change-password': 'http://localhost:5001',
      '/bills': 'http://localhost:5001',
      '/payments': 'http://localhost:5001',
      '/select-db': 'http://localhost:5001',
      '/databases': 'http://localhost:5001',
      '/users': 'http://localhost:5001',
      '/api': 'http://localhost:5001',
      '/debug-db': 'http://localhost:5001',
    },
  },
  build: {
    outDir: 'dist',
  },
})
