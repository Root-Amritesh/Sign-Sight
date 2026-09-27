import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Dev-only: lets the frontend call the Django API same-origin so the
      // Authorization header + CORS dance never gets in the way locally.
      // Django mounts the API at /api/v1/, so rewrite /api/v1 → /api/v1 on target.
      '/api/v1': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        // No manual chunking: Rolldown's automatic splitting already keeps the
        // WebGL bundle out of the entry graph, because GlobeScene is reached
        // only through a dynamic import. Hand-assigning three.js to a named
        // chunk used to merge Vite's preload helper into it, which pulled the
        // whole 900 kB back into the initial load.
      },
    },
  },
})
