import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      },
      manualChunks: {
        // Split vendor code into separate chunk
        vendor: ['react', 'react-dom'],
      },
    },
    base: '/',
    // Enable chunk size warning at 500kb instead of default 300kb
    chunkSizeWarningLimit: 500,
  },
  // Add async loading for images over 10kb
  assetsInclude: ['**/*.png'],
  server: {
    headers: {
      'Cache-Control': 'no-store'
    }
  }
});
