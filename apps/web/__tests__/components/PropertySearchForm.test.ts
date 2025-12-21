import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import PropertySearchForm from '../../app/components/PropertySearchForm.vue'

// モック
const mockFetchProperties = vi.fn()
vi.mock('~/stores/property', () => ({
  usePropertyStore: () => ({
    fetchProperties: mockFetchProperties,
  }),
}))

// スタブコンポーネント
const stubs = {
  UFormField: defineComponent({
    props: ['label'],
    setup(props, { slots }) {
      return () => h('div', { class: 'u-form-field' }, [
        h('label', props.label),
        slots.default?.(),
      ])
    },
  }),
  UInput: defineComponent({
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      return () => h('input', {
        class: 'u-input',
        value: props.modelValue,
        placeholder: props.placeholder,
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
      })
    },
  }),
  USelect: defineComponent({
    props: ['modelValue', 'options', 'placeholder'],
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      return () => h('select', {
        class: 'u-select',
        value: props.modelValue,
        onChange: (e: Event) => emit('update:modelValue', (e.target as HTMLSelectElement).value),
      }, [
        h('option', { value: '' }, props.placeholder || '選択してください'),
        ...(props.options || []).map((opt: { label: string, value: string }) =>
          h('option', { value: opt.value }, opt.label)
        ),
      ])
    },
  }),
  UButton: defineComponent({
    props: ['type', 'block', 'loading'],
    setup(props, { slots }) {
      return () => h('button', {
        class: 'u-button',
        type: props.type || 'button',
      }, slots.default?.())
    },
  }),
  UCard: defineComponent({
    setup(_, { slots }) {
      return () => h('div', { class: 'u-card' }, slots.default?.())
    },
  }),
}

describe('PropertySearchForm', () => {
  beforeEach(() => {
    mockFetchProperties.mockReset()
  })

  const mountForm = () => {
    return mount(PropertySearchForm, {
      global: { stubs },
    })
  }

  it('検索フォームが表示される', () => {
    const wrapper = mountForm()
    expect(wrapper.find('.u-card').exists()).toBe(true)
  })

  it('都道府県選択が存在する', () => {
    const wrapper = mountForm()
    expect(wrapper.text()).toContain('都道府県')
  })

  it('賃料範囲の入力欄が存在する', () => {
    const wrapper = mountForm()
    expect(wrapper.text()).toContain('賃料')
  })

  it('間取り選択が存在する', () => {
    const wrapper = mountForm()
    expect(wrapper.text()).toContain('間取り')
  })

  it('検索ボタンが存在する', () => {
    const wrapper = mountForm()
    const button = wrapper.find('button[type="submit"]')
    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('検索')
  })

  it('フォーム送信時にfetchPropertiesが呼ばれる', async () => {
    const wrapper = mountForm()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockFetchProperties).toHaveBeenCalled()
  })

  it('都道府県を選択してから検索するとパラメータに含まれる', async () => {
    const wrapper = mountForm()

    // 都道府県を選択
    const prefectureSelect = wrapper.findAll('.u-select').at(0)
    expect(prefectureSelect).toBeDefined()
    await prefectureSelect!.setValue('東京都')

    // 検索実行
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockFetchProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        prefecture: '東京都',
      })
    )
  })

  it('賃料範囲を設定して検索するとパラメータに含まれる', async () => {
    const wrapper = mountForm()

    // 賃料下限を入力
    const rentMinInput = wrapper.findAll('.u-input').at(0)
    expect(rentMinInput).toBeDefined()
    await rentMinInput!.setValue('50000')

    // 賃料上限を入力
    const rentMaxInput = wrapper.findAll('.u-input').at(1)
    expect(rentMaxInput).toBeDefined()
    await rentMaxInput!.setValue('100000')

    // 検索実行
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockFetchProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        rentMin: 50000,
        rentMax: 100000,
      })
    )
  })

  it('条件リセットボタンで入力がクリアされる', async () => {
    const wrapper = mountForm()

    // 都道府県を選択
    const prefectureSelect = wrapper.findAll('.u-select').at(0)
    expect(prefectureSelect).toBeDefined()
    await prefectureSelect!.setValue('東京都')

    // リセットボタンをクリック
    const resetButton = wrapper.find('button[type="button"]')
    await resetButton.trigger('click')

    // 選択がクリアされていることを確認
    expect((prefectureSelect!.element as HTMLSelectElement).value).toBe('')
  })
})
