import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Dev proxies assume the Docker stack is running:
//   API  -> localhost:3000 (published by compose)
//   static files -> localhost:80 (nginx)
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Reliable HMR on Docker bind mounts from a Windows host.
    watch: { usePolling: process.env.VITE_USE_POLLING === 'true' },
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:80', changeOrigin: true },
      '/models': { target: 'http://localhost:80', changeOrigin: true },
    },
  },
})
