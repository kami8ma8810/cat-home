<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePropertyStore } from '~/stores/property'

const store = usePropertyStore()

// 検索条件
const prefecture = ref('')
const city = ref('')
const rentMin = ref<string>('')
const rentMax = ref<string>('')
const floorPlan = ref('')

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
  if (rentMin.value) {
    params.rentMin = parseInt(rentMin.value, 10)
  }
  if (rentMax.value) {
    params.rentMax = parseInt(rentMax.value, 10)
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
  rentMin.value = ''
  rentMax.value = ''
  floorPlan.value = ''
}
</script>

<template>
  <UCard class="property-search-form">
    <form @submit.prevent="handleSearch">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 都道府県 -->
        <UFormGroup label="都道府県">
          <USelect
            v-model="prefecture"
            :options="prefectureOptions"
            placeholder="選択してください"
          />
        </UFormGroup>

        <!-- 賃料下限 -->
        <UFormGroup label="賃料（下限）">
          <UInput
            v-model="rentMin"
            type="number"
            placeholder="例: 50000"
          />
        </UFormGroup>

        <!-- 賃料上限 -->
        <UFormGroup label="賃料（上限）">
          <UInput
            v-model="rentMax"
            type="number"
            placeholder="例: 100000"
          />
        </UFormGroup>

        <!-- 間取り -->
        <UFormGroup label="間取り">
          <USelect
            v-model="floorPlan"
            :options="floorPlanOptions"
            placeholder="選択してください"
          />
        </UFormGroup>
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
