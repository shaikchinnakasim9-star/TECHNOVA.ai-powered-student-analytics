import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
})
