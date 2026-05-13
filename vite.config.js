import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(), // Tích hợp TailwindCSS Vite Plugin
    react()
  ],
  build: {
    // 1. BẢO MẬT TỐI ĐA: Tắt hoàn toàn bản đồ mã nguồn (Source Map).
    // Hacker F12 lên sẽ chỉ thấy 1 khối code chữ cái loằng ngoằng, không thể đọc được logic gốc.
    sourcemap: false,
    
    // 2. ÉP XUNG DUNG LƯỢNG: Sử dụng 'esbuild' để băm nát code cực nhanh và nhỏ.
    minify: 'esbuild',

    // 3. CHIA NHỎ FILE (CHUNKING): Giúp web load cực kỳ mượt mà.
    // Việc tách các thư viện nặng ra riêng sẽ giúp trình duyệt của khách hàng dễ dàng lưu cache.
    rollupOptions: {
      output: {
        manualChunks: {
          // Nhóm nhân (Core) của React
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Nhóm Firebase (Gói này rất nặng, tách ra độc lập là chuẩn bài nhất)
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/app-check']
        }
      }
    },
    
    // Nâng giới hạn cảnh báo dung lượng để lúc build Vercel không bị báo lỗi vàng
    chunkSizeWarningLimit: 1600,
  }
});