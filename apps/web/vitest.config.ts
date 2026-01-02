import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app'),
      '@': resolve(__dirname, 'app'),
    },
  },
})
