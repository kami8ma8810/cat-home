<script setup lang="ts">
import { computed } from 'vue'
import type { PropertyRow } from '~/types/database.types'

interface Props {
  property: PropertyRow
}

const props = defineProps<Props>()

/** 賃料を「XX万円」形式にフォーマット */
const formattedRent = computed(() => {
  const man = Math.floor(props.property.rent / 10000)
  return `${man}万円`
})

/** 管理費を「X,XXX円」形式にフォーマット */
const formattedManagementFee = computed(() => {
  return props.property.management_fee.toLocaleString() + '円'
})

/** 面積を「XX.Xm²」形式にフォーマット */
const formattedArea = computed(() => {
  if (!props.property.area) return null
  return `${props.property.area}m²`
})

/** 猫飼育可かどうか */
const isCatAllowed = computed(() => {
  return props.property.pet_conditions?.catAllowed ?? false
})

/** 最寄り駅情報の表示用テキスト */
const stationInfo = computed(() => {
  const stations = props.property.nearest_stations
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

/** 住所（都道府県+市区町村） */
const shortAddress = computed(() => {
  return `${props.property.prefecture}${props.property.city}`
})
</script>

<template>
  <UCard class="property-card">
    <!-- 画像 -->
    <template #header>
      <div class="aspect-video bg-gray-100 relative overflow-hidden">
        <img
          v-if="property.images.length > 0"
          :src="property.images[0]"
          :alt="property.name"
          class="w-full h-full object-cover"
        >
        <div v-else class="flex items-center justify-center h-full text-gray-400">
          No Image
        </div>
        <!-- 猫OKバッジ -->
        <UBadge
          v-if="isCatAllowed"
          color="success"
          class="absolute top-2 left-2"
        >
          猫OK
        </UBadge>
      </div>
    </template>

    <!-- コンテンツ -->
    <div class="space-y-2">
      <!-- 物件名 -->
      <h3 class="font-bold text-lg line-clamp-1">
        {{ property.name }}
      </h3>

      <!-- 賃料 -->
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-bold text-primary">{{ formattedRent }}</span>
        <span class="text-sm text-gray-500">
          管理費 {{ formattedManagementFee }}
        </span>
      </div>

      <!-- 間取り・面積 -->
      <div class="flex gap-3 text-sm">
        <span v-if="property.floor_plan">{{ property.floor_plan }}</span>
        <span v-if="formattedArea">{{ formattedArea }}</span>
      </div>

      <!-- 最寄り駅 -->
      <div v-if="stationInfo" class="text-sm text-gray-600">
        <div v-for="(station, idx) in stationInfo" :key="idx" class="flex gap-1">
          <span>{{ station.line }}</span>
          <span>{{ station.station }}</span>
          <span v-if="station.access">{{ station.access }}</span>
        </div>
      </div>

      <!-- 住所 -->
      <div class="text-sm text-gray-500">
        {{ shortAddress }}
      </div>
    </div>

    <!-- フッター -->
    <template #footer>
      <NuxtLink
        :to="`/properties/${property.id}`"
        class="block"
      >
        <UButton
          block
          variant="outline"
        >
          詳細を見る
        </UButton>
      </NuxtLink>
    </template>
  </UCard>
</template>

<style scoped>
.property-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.property-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
