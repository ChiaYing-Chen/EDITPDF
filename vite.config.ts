import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, '.', '');
    const isBuild = command === 'build';
    return {
      // Use repo name as base on GitHub Pages to avoid 404 after deploy
      // Keep base as '/' during dev so local paths remain simple
      base: isBuild ? '/EDITPDF/' : '/',
      build: {
        // Relax the noisy warning while we improve chunking
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('pdfjs-dist') || id.includes('pdf-lib')) return 'pdf';
                if (id.includes('dexie')) return 'dexie';
                if (id.includes('react')) return 'react-vendor';
              }
            },
          },
        },
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
