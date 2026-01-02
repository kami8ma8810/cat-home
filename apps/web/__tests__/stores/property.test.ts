import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePropertyStore } from '../../app/stores/property'

// Supabaseクライアントのモック
const mockEq = vi.fn().mockReturnThis()
const mockGte = vi.fn().mockReturnThis()
const mockLte = vi.fn().mockReturnThis()
const mockOrder = vi.fn().mockReturnThis()
const mockRange = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })

const mockSelect = vi.fn(() => ({
  eq: mockEq,
  gte: mockGte,
  lte: mockLte,
  order: mockOrder,
  range: mockRange,
}))

const mockFrom = vi.fn(() => ({
  select: mockSelect,
}))

const mockSupabaseClient = {
  from: mockFrom,
}

vi.stubGlobal('useSupabaseClient', () => mockSupabaseClient)

describe('usePropertyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // モックチェーンをリセット
    mockEq.mockReturnThis()
    mockGte.mockReturnThis()
    mockLte.mockReturnThis()
    mockOrder.mockReturnValue({
      range: mockRange,
    })
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

  describe('fetchProperties フィルタリング', () => {
    it('prefectureパラメータでフィルタリングされる', async () => {
      const store = usePropertyStore()
      await store.fetchProperties({ prefecture: '東京都' })

      // is_activeでの初期フィルタリング + prefectureフィルタリング
      expect(mockEq).toHaveBeenCalledWith('is_active', true)
      expect(mockEq).toHaveBeenCalledWith('prefecture', '東京都')
    })

    it('floorPlanパラメータでフィルタリングされる', async () => {
      const store = usePropertyStore()
      await store.fetchProperties({ floorPlan: '1LDK' })

      // is_activeでの初期フィルタリング + floorPlanフィルタリング
      expect(mockEq).toHaveBeenCalledWith('is_active', true)
      expect(mockEq).toHaveBeenCalledWith('floor_plan', '1LDK')
    })

    it('rentMinパラメータでフィルタリングされる', async () => {
      const store = usePropertyStore()
      await store.fetchProperties({ rentMin: 50000 })

      expect(mockGte).toHaveBeenCalledWith('rent', 50000)
    })

    it('rentMaxパラメータでフィルタリングされる', async () => {
      const store = usePropertyStore()
      await store.fetchProperties({ rentMax: 100000 })

      expect(mockLte).toHaveBeenCalledWith('rent', 100000)
    })
  })
})
