import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/erp/',

  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: true,

    proxy: {
      '/erp/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false,
      },

      '/apm-api': {
        target: 'https://apmconnect.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/apm-api/, '/api'),
        secure: true,
      },
    },
  },

  plugins: [react(), tailwindcss()],
})
