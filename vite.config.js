import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost/monitoring-system-app/backend/monitoring_api',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
