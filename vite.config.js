import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(), 
    react()
  ],
  build: {
    // 1. Tắt bản đồ mã nguồn để bảo mật
    sourcemap: false,
    
    // ĐÃ XÓA DÒNG minify: 'esbuild' ở đây. Vite sẽ tự nén code bằng công cụ mặc định xịn nhất của nó.

    // 2. Tách file
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'firebase';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor';
            }
          }
        }
      }
    },
    
    chunkSizeWarningLimit: 1600,
  }
});