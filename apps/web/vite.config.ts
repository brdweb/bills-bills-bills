import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tamaguiPlugin } from '@tamagui/vite-plugin'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tamaguiPlugin({
      config: './src/tamagui.config.ts',
      components: ['tamagui'],
    }),
  ],
  define: {
    'process.env.TAMAGUI_TARGET': JSON.stringify('web'),
  },
  resolve: {
    alias: {
      '@billmanager/ui': path.resolve(__dirname, '../../packages/ui/src'),
      // React Native Web aliases for Tamagui
      'react-native': 'react-native-web',
      'react-native-web': path.resolve(__dirname, 'node_modules/react-native-web'),
    },
  },
  optimizeDeps: {
    include: ['react-native-web'],
    esbuildOptions: {
      resolveExtensions: ['.web.js', '.web.jsx', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx'],
    },
  },
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
