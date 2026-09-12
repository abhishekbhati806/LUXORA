import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true, // the preview proxy reaches us via a *.e2b.app host
    // One origin for browser traffic: Vite proxies /api to Express so the client
    // never needs to know a backend port, in dev or in prod.
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
    watch: { usePolling: true, interval: 400 },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 640,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('motion') || id.includes('framer')) return 'motion';
          if (id.includes('lucide')) return 'icons';
          if (id.includes('react-router')) return 'router';
          if (id.includes('react')) return 'react';
        },
      },
    },
  },
});
