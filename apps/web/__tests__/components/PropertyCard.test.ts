import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import PropertyCard from '../../components/PropertyCard.vue'
import type { PropertyRow } from '../../types/database.types'

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
    setup(_, { slots }) {
      return () => h('span', { class: 'u-badge' }, slots.default?.())
    },
  }),
  UButton: defineComponent({
    setup(_, { slots }) {
      return () => h('button', { class: 'u-button' }, slots.default?.())
    },
  }),
  NuxtLink: defineComponent({
    props: ['to'],
    setup(_, { slots }) {
      return () => h('a', { class: 'nuxt-link' }, slots.default?.())
    },
  }),
}

const mockProperty: PropertyRow = {
  id: '1',
  external_id: 'suumo-123',
  source: 'suumo',
  name: 'テスト物件マンション',
  address: '東京都渋谷区1-1-1',
  prefecture: '東京都',
  city: '渋谷区',
  rent: 120000,
  management_fee: 8000,
  deposit: 120000,
  key_money: 120000,
  floor_plan: '1LDK',
  area: 42.5,
  building_type: 'mansion',
  floor: 5,
  year_built: 2020,
  pet_conditions: { catAllowed: true, catLimit: 2 },
  features: ['オートロック', 'バス・トイレ別'],
  nearest_stations: [
    { line: 'JR山手線', station: '渋谷', walkMinutes: 5 },
  ],
  images: ['https://example.com/image1.jpg'],
  source_url: 'https://suumo.jp/chintai/123',
  is_active: true,
  first_seen_at: '2024-12-21T00:00:00Z',
  last_seen_at: '2024-12-21T00:00:00Z',
  created_at: '2024-12-21T00:00:00Z',
  updated_at: '2024-12-21T00:00:00Z',
}

const mountOptions = {
  props: { property: mockProperty },
  global: { stubs },
}

describe('PropertyCard', () => {
  it('物件名が表示される', () => {
    const wrapper = mount(PropertyCard, mountOptions)
    expect(wrapper.text()).toContain('テスト物件マンション')
  })

  it('賃料がフォーマットされて表示される', () => {
    const wrapper = mount(PropertyCard, mountOptions)
    expect(wrapper.text()).toContain('12万円')
  })

  it('管理費が表示される', () => {
    const wrapper = mount(PropertyCard, mountOptions)
    expect(wrapper.text()).toContain('8,000円')
  })

  it('間取りと面積が表示される', () => {
    const wrapper = mount(PropertyCard, mountOptions)
    expect(wrapper.text()).toContain('1LDK')
    expect(wrapper.text()).toContain('42.5m²')
  })

  it('最寄り駅情報が表示される', () => {
    const wrapper = mount(PropertyCard, mountOptions)
    expect(wrapper.text()).toContain('JR山手線')
    expect(wrapper.text()).toContain('渋谷駅')
    expect(wrapper.text()).toContain('徒歩5分')
  })

  it('猫飼育可のバッジが表示される', () => {
    const wrapper = mount(PropertyCard, mountOptions)
    expect(wrapper.text()).toContain('猫OK')
  })

  it('住所が表示される', () => {
    const wrapper = mount(PropertyCard, mountOptions)
    expect(wrapper.text()).toContain('東京都渋谷区')
  })
})
