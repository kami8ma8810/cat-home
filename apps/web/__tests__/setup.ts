import { vi } from 'vitest'

// Nuxt auto-import されるグローバル関数のモック
vi.stubGlobal('useRoute', () => ({
  params: { id: 'test-id-123' },
}))

vi.stubGlobal('useHead', () => {})

vi.stubGlobal('onMounted', (fn: () => void) => {
  // テスト時は即座に実行
  fn()
})
