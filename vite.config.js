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
    
    // 2. Ép xung thu nhỏ code cực đại
    minify: 'esbuild',

    // 3. Tách file (Dạng Function chuẩn cho Vite 8+)
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Tách riêng cục Firebase nặng chịch ra một file
            if (id.includes('firebase')) {
              return 'firebase';
            }
            // Tách bộ nhân React ra một file
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