import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePropertyStore } from '../../stores/property'

describe('usePropertyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('初期状態', () => {
    it('propertiesは空配列で初期化される', () => {
      const store = usePropertyStore()
      expect(store.properties).toEqual([])
    })

    it('loadingはfalseで初期化される', () => {
      const store = usePropertyStore()
      expect(store.loading).toBe(false)
    })

    it('errorはnullで初期化される', () => {
      const store = usePropertyStore()
      expect(store.error).toBeNull()
    })

    it('totalは0で初期化される', () => {
      const store = usePropertyStore()
      expect(store.total).toBe(0)
    })

    it('pageは1で初期化される', () => {
      const store = usePropertyStore()
      expect(store.page).toBe(1)
    })

    it('perPageは20で初期化される', () => {
      const store = usePropertyStore()
      expect(store.perPage).toBe(20)
    })
  })

  describe('getters', () => {
    it('totalPagesはtotalとperPageから計算される', () => {
      const store = usePropertyStore()
      store.total = 100
      store.perPage = 20
      expect(store.totalPages).toBe(5)
    })

    it('hasPropertiesはpropertiesが空でなければtrue', () => {
      const store = usePropertyStore()
      expect(store.hasProperties).toBe(false)

      store.properties = [{} as never]
      expect(store.hasProperties).toBe(true)
    })
  })

  describe('actions', () => {
    it('resetでストアがリセットされる', () => {
      const store = usePropertyStore()

      // 状態を変更
      store.properties = [{} as never]
      store.loading = true
      store.error = 'test error'
      store.total = 100
      store.page = 5

      // リセット
      store.reset()

      // 検証
      expect(store.properties).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.total).toBe(0)
      expect(store.page).toBe(1)
    })
  })
})
