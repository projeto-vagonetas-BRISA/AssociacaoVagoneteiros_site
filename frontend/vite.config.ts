import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    allowedHosts: [
      'vagoneteiros.roberto-openclaw.duckdns.org',
    ],
    proxy: {
      // Proxy all unmatched requests to the backend on port 3000
      '/auth': { target: 'http://localhost:3000', changeOrigin: true },
      '/atribuicoes': { target: 'http://localhost:3000', changeOrigin: true },
      '/passeios': { target: 'http://localhost:3000', changeOrigin: true },
      '/clientes': { target: 'http://localhost:3000', changeOrigin: true },
      '/agendamentos': { target: 'http://localhost:3000', changeOrigin: true },
      '/avaliacoes': { target: 'http://localhost:3000', changeOrigin: true },
      '/usuarios': { target: 'http://localhost:3000', changeOrigin: true },
      '/slots': { target: 'http://localhost:3000', changeOrigin: true },
      '/dashboard': { target: 'http://localhost:3000', changeOrigin: true },
      '/galeria': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})