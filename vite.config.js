import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

const page = (name) => fileURLToPath(new URL(name, import.meta.url))

export default defineConfig({
  plugins: [vue()],
  server: { proxy: { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: false } } },
  build: {
    rollupOptions: {
      input: {
        student: page('index.html'),
        desktop: page('desktop.html'),
      },
    },
  },
})
