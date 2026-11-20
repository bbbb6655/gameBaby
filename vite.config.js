import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

const page = (name) => fileURLToPath(new URL(name, import.meta.url))

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        student: page('index.html'),
        desktop: page('desktop.html'),
        bridge: page('mock-bridge.html'),
      },
    },
  },
})
