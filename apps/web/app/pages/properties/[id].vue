<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePropertyStore } from '~/stores/property'
import type { PropertyRow } from '~/types/database.types'

const route = useRoute()
const store = usePropertyStore()

const property = ref<PropertyRow | null>(null)

// 動的タイトル
const pageTitle = computed(() =>
  property.value ? `${property.value.name} | cat-home` : '物件詳細 | cat-home'
)

// 動的OGP説明文
const pageDescription = computed(() => {
  if (!property.value) return '猫と暮らせる賃貸物件の詳細情報'
  const rent = Math.floor(property.value.rent / 10000)
  return `${property.value.prefecture}${property.value.city}の猫飼育可能物件。${property.value.floor_plan} ${rent}万円/月。${property.value.name}の詳細情報。`
})

// 動的OGP画像
const ogImage = computed(() =>
  property.value?.images?.[0] ?? 'https://cat-home.pages.dev/og-image.png'
)

useHead({
  title: pageTitle,
})

useSeoMeta({
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogImage: ogImage,
  ogType: 'article',
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: ogImage,
})

onMounted(async () => {
  const id = route.params.id as string
  property.value = await store.fetchPropertyById(id)
})

/** 賃料を「XX万円」形式にフォーマット */
const formattedRent = computed(() => {
  if (!property.value) return ''
  const man = Math.floor(property.value.rent / 10000)
  return `${man}万円`
})

/** 管理費を「X,XXX円」形式にフォーマット */
const formattedManagementFee = computed(() => {
  if (!property.value) return ''
  return property.value.management_fee.toLocaleString() + '円'
})

/** 敷金を「X,XXX円」または「Xヶ月」形式にフォーマット */
const formattedDeposit = computed(() => {
  if (!property.value?.deposit) return 'なし'
  const man = property.value.deposit / 10000
  if (man >= 1) {
    return `${man.toLocaleString()}万円`
  }
  return property.value.deposit.toLocaleString() + '円'
})

/** 礼金を「X,XXX円」または「Xヶ月」形式にフォーマット */
const formattedKeyMoney = computed(() => {
  if (!property.value?.key_money) return 'なし'
  const man = property.value.key_money / 10000
  if (man >= 1) {
    return `${man.toLocaleString()}万円`
  }
  return property.value.key_money.toLocaleString() + '円'
})

/** 面積を「XX.Xm²」形式にフォーマット */
const formattedArea = computed(() => {
  if (!property.value?.area) return null
  return `${property.value.area}m²`
})

/** 築年数表示 */
const yearBuiltText = computed(() => {
  if (!property.value?.year_built) return null
  return `${property.value.year_built}年築`
})

/** 階数表示 */
const floorText = computed(() => {
  if (!property.value?.floor) return null
  return `${property.value.floor}階`
})

/** 猫飼育可かどうか */
const isCatAllowed = computed(() => {
  return property.value?.pet_conditions?.catAllowed ?? false
})

/** 猫の飼育上限 */
const catLimit = computed(() => {
  return property.value?.pet_conditions?.catLimit
})

/** 最寄り駅情報の表示用テキスト */
const stationInfo = computed(() => {
  const stations = property.value?.nearest_stations
  if (!stations || stations.length === 0) return null

  return stations.map((s) => {
    const walk = s.walkMinutes ? `徒歩${s.walkMinutes}分` : ''
    const bus = s.busMinutes ? `バス${s.busMinutes}分` : ''
    return {
      line: s.line,
      station: `${s.station}駅`,
      access: walk || bus,
    }
  })
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- 戻るボタン -->
    <div class="mb-6">
      <NuxtLink to="/properties">
        <UButton variant="ghost" icon="i-heroicons-arrow-left">
          物件一覧に戻る
        </UButton>
      </NuxtLink>
    </div>

    <!-- ローディング -->
    <div v-if="store.loading" class="flex justify-center py-12" role="status" aria-label="読み込み中">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
      <span class="sr-only">物件情報を読み込み中</span>
    </div>

    <!-- エラー -->
    <UAlert
      v-else-if="store.error"
      color="error"
      icon="i-heroicons-exclamation-triangle"
      :title="store.error"
      class="mb-6"
    />

    <!-- 物件が見つからない -->
    <div v-else-if="!property" class="text-center py-12 text-gray-500">
      <UIcon name="i-heroicons-home" class="w-12 h-12 mx-auto mb-4" aria-hidden="true" />
      <p class="text-lg">物件が見つかりません</p>
      <NuxtLink to="/properties" class="mt-4 inline-block">
        <UButton variant="outline">
          物件一覧に戻る
        </UButton>
      </NuxtLink>
    </div>

    <!-- 物件詳細 -->
    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- 左カラム: 画像ギャラリー -->
        <div>
          <!-- メイン画像 -->
          <div class="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
            <img
              v-if="property.images.length > 0"
              :src="property.images[0]"
              :alt="property.name"
              class="w-full h-full object-cover"
            >
            <div v-else class="flex items-center justify-center h-full text-gray-400">
              No Image
            </div>
          </div>
          <!-- サムネイル -->
          <div v-if="property.images.length > 1" class="grid grid-cols-4 gap-2">
            <div
              v-for="(image, idx) in property.images.slice(0, 4)"
              :key="idx"
              class="aspect-video bg-gray-100 rounded overflow-hidden"
            >
              <img
                :src="image"
                :alt="`${property.name} - ${idx + 1}`"
                class="w-full h-full object-cover"
              >
            </div>
          </div>
        </div>

        <!-- 右カラム: 物件情報 -->
        <div class="space-y-6">
          <!-- 物件名・バッジ -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <UBadge v-if="isCatAllowed" color="success">
                猫OK
              </UBadge>
              <UBadge v-if="catLimit" color="neutral" variant="outline">
                {{ catLimit }}匹まで
              </UBadge>
            </div>
            <h1 class="text-2xl md:text-3xl font-bold">
              {{ property.name }}
            </h1>
          </div>

          <!-- 賃料 -->
          <UCard>
            <div class="flex items-baseline gap-3">
              <span class="text-3xl font-bold text-primary">{{ formattedRent }}</span>
              <span class="text-gray-500">/ 月</span>
            </div>
            <div class="mt-2 text-sm text-gray-600">
              管理費 {{ formattedManagementFee }}
            </div>
          </UCard>

          <!-- 敷金・礼金 -->
          <div class="grid grid-cols-2 gap-4">
            <UCard>
              <div class="text-sm text-gray-500 mb-1">敷金</div>
              <div class="font-bold">{{ formattedDeposit }}</div>
            </UCard>
            <UCard>
              <div class="text-sm text-gray-500 mb-1">礼金</div>
              <div class="font-bold">{{ formattedKeyMoney }}</div>
            </UCard>
          </div>

          <!-- 間取り・面積・築年・階数 -->
          <UCard>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div class="text-sm text-gray-500">間取り</div>
                <div class="font-bold">{{ property.floor_plan }}</div>
              </div>
              <div v-if="formattedArea">
                <div class="text-sm text-gray-500">面積</div>
                <div class="font-bold">{{ formattedArea }}</div>
              </div>
              <div v-if="yearBuiltText">
                <div class="text-sm text-gray-500">築年</div>
                <div class="font-bold">{{ yearBuiltText }}</div>
              </div>
              <div v-if="floorText">
                <div class="text-sm text-gray-500">階数</div>
                <div class="font-bold">{{ floorText }}</div>
              </div>
            </div>
          </UCard>

          <!-- 住所 -->
          <UCard>
            <h3 class="font-bold mb-2 flex items-center gap-2">
              <UIcon name="i-heroicons-map-pin" class="w-5 h-5" aria-hidden="true" />
              住所
            </h3>
            <p>{{ property.address }}</p>
          </UCard>

          <!-- 最寄り駅 -->
          <UCard v-if="stationInfo">
            <h3 class="font-bold mb-2 flex items-center gap-2">
              <UIcon name="i-heroicons-building-office" class="w-5 h-5" aria-hidden="true" />
              最寄り駅
            </h3>
            <ul class="space-y-1">
              <li
                v-for="(station, idx) in stationInfo"
                :key="idx"
                class="flex gap-2"
              >
                <span>{{ station.line }}</span>
                <span>{{ station.station }}</span>
                <span v-if="station.access" class="text-primary font-medium">{{ station.access }}</span>
              </li>
            </ul>
          </UCard>

          <!-- 設備・特徴 -->
          <UCard v-if="property.features && property.features.length > 0">
            <h3 class="font-bold mb-3 flex items-center gap-2">
              <UIcon name="i-heroicons-sparkles" class="w-5 h-5" aria-hidden="true" />
              設備・特徴
            </h3>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="(feature, idx) in property.features"
                :key="idx"
                color="neutral"
                variant="outline"
              >
                {{ feature }}
              </UBadge>
            </div>
          </UCard>

          <!-- 物件元リンク -->
          <div class="pt-4">
            <UButton
              :to="property.source_url"
              external
              target="_blank"
              block
              size="lg"
            >
              物件元サイトで詳細を見る
              <span class="sr-only">（新しいタブで開きます）</span>
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
