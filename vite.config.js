import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 1. Thêm import này

export default defineConfig({
  plugins: [
    tailwindcss(), // 2. Thêm dòng này vào danh sách plugins
    react()
  ],
})