<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePropertyStore } from '~/stores/property'

const store = usePropertyStore()

// 賃料の定数
const RENT_MIN = 0
const RENT_MAX = 500000
const RENT_STEP = 5000

// 検索条件
const prefecture = ref('')
const city = ref('')
const rentRange = ref<[number, number]>([RENT_MIN, RENT_MAX])
const floorPlan = ref('')

// 賃料の個別値（computed getter/setter で双方向バインド）
const rentMinValue = computed({
  get: () => rentRange.value[0],
  set: (val: number | null) => {
    const newVal = val ?? RENT_MIN
    rentRange.value = [Math.min(newVal, rentRange.value[1]), rentRange.value[1]]
  }
})

const rentMaxValue = computed({
  get: () => rentRange.value[1],
  set: (val: number | null) => {
    const newVal = val ?? RENT_MAX
    rentRange.value = [rentRange.value[0], Math.max(newVal, rentRange.value[0])]
  }
})

// 都道府県リスト
const prefectureOptions = [
  { label: '北海道', value: '北海道' },
  { label: '東京都', value: '東京都' },
  { label: '神奈川県', value: '神奈川県' },
  { label: '埼玉県', value: '埼玉県' },
  { label: '千葉県', value: '千葉県' },
  { label: '大阪府', value: '大阪府' },
  { label: '京都府', value: '京都府' },
  { label: '愛知県', value: '愛知県' },
  { label: '福岡県', value: '福岡県' },
]

// 間取りリスト
const floorPlanOptions = [
  { label: 'ワンルーム', value: 'ワンルーム' },
  { label: '1K', value: '1K' },
  { label: '1DK', value: '1DK' },
  { label: '1LDK', value: '1LDK' },
  { label: '2K', value: '2K' },
  { label: '2DK', value: '2DK' },
  { label: '2LDK', value: '2LDK' },
  { label: '3K', value: '3K' },
  { label: '3DK', value: '3DK' },
  { label: '3LDK', value: '3LDK' },
  { label: '4LDK以上', value: '4LDK以上' },
]

// 検索中かどうか
const isSearching = computed(() => store.loading)

// 検索実行
const handleSearch = async () => {
  const params: Record<string, string | number | undefined> = {}

  if (prefecture.value) {
    params.prefecture = prefecture.value
  }
  if (city.value) {
    params.city = city.value
  }
  // 初期値と異なる場合のみパラメータに含める
  if (rentRange.value[0] > RENT_MIN) {
    params.rentMin = rentRange.value[0]
  }
  if (rentRange.value[1] < RENT_MAX) {
    params.rentMax = rentRange.value[1]
  }
  if (floorPlan.value) {
    params.floorPlan = floorPlan.value
  }

  params.page = 1

  await store.fetchProperties(params)
}

// 条件リセット
const handleReset = () => {
  prefecture.value = ''
  city.value = ''
  rentRange.value = [RENT_MIN, RENT_MAX]
  floorPlan.value = ''
}

// セレクト変更時に自動で検索を実行
watch([prefecture, floorPlan], () => {
  handleSearch()
})
</script>

<template>
  <UCard class="property-search-form">
    <form role="search" aria-label="物件検索フォーム" @submit.prevent="handleSearch">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- 都道府県 -->
        <UFormField label="都道府県">
          <USelect
            v-model="prefecture"
            :items="prefectureOptions"
            placeholder="選択してください"
          />
        </UFormField>

        <!-- 賃料（スライダー + 数値入力のハイブリッド） -->
        <UFormField label="賃料">
          <!-- 数値入力フィールド -->
          <div class="flex flex-col sm:flex-row gap-2 sm:items-center mb-3">
            <UInputNumber
              v-model="rentMinValue"
              :min="RENT_MIN"
              :max="rentMaxValue"
              :step="RENT_STEP"
              placeholder="下限"
              aria-label="賃料下限"
              class="flex-1"
            />
            <span class="text-center text-muted">〜</span>
            <UInputNumber
              v-model="rentMaxValue"
              :min="rentMinValue"
              :max="RENT_MAX"
              :step="RENT_STEP"
              placeholder="上限"
              aria-label="賃料上限"
              class="flex-1"
            />
          </div>

          <!-- 範囲スライダー -->
          <USlider
            v-model="rentRange"
            :min="RENT_MIN"
            :max="RENT_MAX"
            :step="RENT_STEP"
            aria-label="賃料範囲スライダー"
          />

          <!-- 目盛り -->
          <div class="flex justify-between text-xs text-muted mt-1">
            <span>0</span>
            <span>5</span>
            <span>10</span>
            <span>15</span>
            <span>20</span>
            <span>25</span>
            <span>30</span>
            <span>35</span>
            <span>40</span>
            <span>45</span>
            <span>50</span>
          </div>
        </UFormField>

        <!-- 間取り -->
        <UFormField label="間取り">
          <USelect
            v-model="floorPlan"
            :items="floorPlanOptions"
            placeholder="選択してください"
          />
        </UFormField>
      </div>

      <!-- ボタン -->
      <div class="flex gap-4 mt-6 justify-end">
        <UButton
          type="button"
          variant="outline"
          @click="handleReset"
        >
          条件をリセット
        </UButton>
        <UButton
          type="submit"
          :loading="isSearching"
        >
          検索
        </UButton>
      </div>
    </form>
  </UCard>
</template>
