import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import PropertyDetailPage from '../../app/pages/properties/[id].vue'
import type { PropertyRow } from '../../app/types/database.types'

// グローバルモック
const mockLoading = ref(false)
const mockError = ref<string | null>(null)
const mockFetchPropertyById = vi.fn()

// usePropertyStoreのモック（getterで定義してリアクティブに）
vi.mock('~/stores/property', () => ({
  usePropertyStore: () => ({
    get loading() {
      return mockLoading.value
    },
    get error() {
      return mockError.value
    },
    fetchPropertyById: mockFetchPropertyById,
  }),
}))

// スタブコンポーネント
const stubs = {
  UCard: defineComponent({
    setup(_, { slots }) {
      return () => h('div', { class: 'u-card' }, [
        slots.header?.(),
        slots.default?.(),
        slots.footer?.(),
      ])
    },
  }),
  UBadge: defineComponent({
    props: ['color', 'variant'],
    setup(_, { slots }) {
      return () => h('span', { class: 'u-badge' }, slots.default?.())
    },
  }),
  UButton: defineComponent({
    props: ['to', 'variant', 'external', 'target', 'block', 'size', 'icon'],
    setup(_, { slots }) {
      return () => h('button', { class: 'u-button' }, slots.default?.())
    },
  }),
  UIcon: defineComponent({
    props: ['name', 'class'],
    setup(props) {
      return () => h('span', { class: `u-icon ${props.class || ''}` })
    },
  }),
  UAlert: defineComponent({
    props: ['color', 'icon', 'title'],
    setup(props) {
      return () => h('div', { class: 'u-alert' }, props.title)
    },
  }),
  NuxtLink: defineComponent({
    props: ['to'],
    setup(_, { slots }) {
      return () => h('a', { class: 'nuxt-link' }, slots.default?.())
    },
  }),
}

// グローバルモック関数
const globalMocks = {
  useRoute: () => ({
    params: { id: 'test-id-123' },
  }),
  useHead: () => {},
}

const sampleProperty: PropertyRow = {
  id: 'test-id-123',
  external_id: 'suumo-456',
  source: 'suumo',
  name: 'サンプルマンション',
  address: '東京都渋谷区恵比寿1-1-1',
  prefecture: '東京都',
  city: '渋谷区',
  rent: 150000,
  management_fee: 10000,
  deposit: 150000,
  key_money: 150000,
  floor_plan: '2LDK',
  area: 55.5,
  building_type: 'mansion',
  floor: 8,
  year_built: 2018,
  pet_conditions: { catAllowed: true, catLimit: 2 },
  features: ['オートロック', 'バス・トイレ別', '宅配ボックス'],
  nearest_stations: [
    { line: 'JR山手線', station: '恵比寿', walkMinutes: 3 },
    { line: '東京メトロ日比谷線', station: '恵比寿', walkMinutes: 5 },
  ],
  images: [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
  ],
  source_url: 'https://suumo.jp/chintai/456',
  is_active: true,
  first_seen_at: '2024-12-01T00:00:00Z',
  last_seen_at: '2024-12-21T00:00:00Z',
  created_at: '2024-12-01T00:00:00Z',
  updated_at: '2024-12-21T00:00:00Z',
}

describe('PropertyDetailPage', () => {
  beforeEach(() => {
    mockLoading.value = false
    mockError.value = null
    mockFetchPropertyById.mockReset()
    mockFetchPropertyById.mockResolvedValue(sampleProperty)
  })

  const mountPage = async () => {
    const wrapper = mount(PropertyDetailPage, {
      global: {
        stubs,
        mocks: globalMocks,
      },
    })
    await flushPromises()
    return wrapper
  }

  it('物件詳細を取得するためにfetchPropertyByIdを呼び出す', async () => {
    await mountPage()
    expect(mockFetchPropertyById).toHaveBeenCalledWith('test-id-123')
  })

  it('ローディング中はスピナーが表示される', async () => {
    mockLoading.value = true
    mockFetchPropertyById.mockImplementation(() => new Promise(() => {}))
    const wrapper = mount(PropertyDetailPage, {
      global: { stubs, mocks: globalMocks },
    })

    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })

  it('エラー時はエラーメッセージが表示される', async () => {
    mockError.value = '物件が見つかりませんでした'
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('物件が見つかりませんでした')
  })

  it('物件名が表示される', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('サンプルマンション')
  })

  it('賃料がフォーマットされて表示される', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('15万円')
  })

  it('管理費が表示される', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('10,000円')
  })

  it('敷金・礼金が表示される', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('敷金')
    expect(wrapper.text()).toContain('礼金')
  })

  it('間取りと面積が表示される', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('2LDK')
    expect(wrapper.text()).toContain('55.5m²')
  })

  it('住所が表示される', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('東京都渋谷区恵比寿1-1-1')
  })

  it('最寄り駅情報が表示される', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('JR山手線')
    expect(wrapper.text()).toContain('恵比寿駅')
    expect(wrapper.text()).toContain('徒歩3分')
  })

  it('築年数が表示される', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('2018年築')
  })

  it('階数が表示される', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('8階')
  })

  it('設備・特徴が表示される', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('オートロック')
    expect(wrapper.text()).toContain('バス・トイレ別')
    expect(wrapper.text()).toContain('宅配ボックス')
  })

  it('猫飼育条件が表示される', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('猫OK')
  })

  it('物件が見つからない場合は404メッセージが表示される', async () => {
    mockFetchPropertyById.mockResolvedValue(null)
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('物件が見つかりません')
  })
})
