import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Dev server proxy: forward /v1 to Appwrite to avoid CORS during local/dev-tunnel development
  server: {
    proxy: {
      '^/v1': {
        target: 'https://syd.cloud.appwrite.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/v1/, '/v1'),
      },
    },
  },
}) 