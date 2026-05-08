import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/auctions': 'http://localhost:8000',
      '/bids': 'http://localhost:8000',
      '/categories': 'http://localhost:8000',
      '/currency': 'http://localhost:8000',
      '/defender': 'http://localhost:8000',
      '/notifications': 'http://localhost:8000',
      '/roles': 'http://localhost:8000',
      '/watchlist': 'http://localhost:8000',
    },
  },
})
