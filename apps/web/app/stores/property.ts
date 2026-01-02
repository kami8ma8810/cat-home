import { defineStore } from 'pinia'
import type { Database, PropertyRow } from '~/types/database.types'

/** 物件検索パラメータ */
export interface PropertySearchParams {
  keyword?: string
  prefecture?: string
  city?: string
  rentMin?: number
  rentMax?: number
  floorPlan?: string
  page?: number
  perPage?: number
}

/** 物件ストアの状態 */
interface PropertyState {
  properties: PropertyRow[]
  loading: boolean
  error: string | null
  total: number
  page: number
  perPage: number
}

export const usePropertyStore = defineStore('property', {
  state: (): PropertyState => ({
    properties: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
    perPage: 20,
  }),

  getters: {
    /** 総ページ数 */
    totalPages: (state): number => Math.ceil(state.total / state.perPage),

    /** 物件が存在するか */
    hasProperties: (state): boolean => state.properties.length > 0,
  },

  actions: {
    /** 物件一覧を取得 */
    async fetchProperties(params: PropertySearchParams = {}) {
      this.loading = true
      this.error = null

      try {
        const client = useSupabaseClient<Database>()
        const page = params.page ?? this.page
        const perPage = params.perPage ?? this.perPage
        const from = (page - 1) * perPage
        const to = from + perPage - 1

        let query = client
          .from('properties')
          .select('*', { count: 'exact' })
          .eq('is_active', true)

        // 検索条件の適用
        if (params.prefecture) {
          query = query.eq('prefecture', params.prefecture)
        }
        if (params.city) {
          query = query.eq('city', params.city)
        }
        if (params.rentMin) {
          query = query.gte('rent', params.rentMin)
        }
        if (params.rentMax) {
          query = query.lte('rent', params.rentMax)
        }
        if (params.floorPlan) {
          query = query.eq('floor_plan', params.floorPlan)
        }

        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range(from, to)

        if (error) throw error

        this.properties = (data ?? []) as PropertyRow[]
        this.total = count ?? 0
        this.page = page
        this.perPage = perPage
      } catch (e) {
        this.error = e instanceof Error ? e.message : '物件の取得に失敗しました'
        console.error('fetchProperties error:', e)
      } finally {
        this.loading = false
      }
    },

    /** 物件詳細を取得 */
    async fetchPropertyById(id: string): Promise<PropertyRow | null> {
      this.loading = true
      this.error = null

      try {
        const client = useSupabaseClient<Database>()
        const { data, error } = await client
          .from('properties')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error

        return data as PropertyRow
      } catch (e) {
        this.error = e instanceof Error ? e.message : '物件の取得に失敗しました'
        console.error('fetchPropertyById error:', e)
        return null
      } finally {
        this.loading = false
      }
    },

    /** ページを変更 */
    async changePage(page: number) {
      await this.fetchProperties({ page })
    },

    /** ストアをリセット */
    reset() {
      this.properties = []
      this.loading = false
      this.error = null
      this.total = 0
      this.page = 1
    },
  },
})
