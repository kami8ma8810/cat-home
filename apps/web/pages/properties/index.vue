<script setup lang="ts">
import { usePropertyStore } from '~/stores/property'

useHead({
  title: '物件一覧 | cat-home',
})

const store = usePropertyStore()

// 初期データ取得
onMounted(async () => {
  await store.fetchProperties()
})

// ページ変更
const handlePageChange = async (page: number) => {
  await store.changePage(page)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- ヘッダー -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">猫と暮らせる賃貸物件</h1>
      <p class="text-gray-600">
        猫飼育可能な賃貸物件を探せます
      </p>
    </div>

    <!-- 検索フォーム -->
    <div class="mb-8">
      <PropertySearchForm />
    </div>

    <!-- ローディング -->
    <div v-if="store.loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- エラー -->
    <UAlert
      v-else-if="store.error"
      color="error"
      icon="i-heroicons-exclamation-triangle"
      :title="store.error"
      class="mb-6"
    />

    <!-- 物件一覧 -->
    <template v-else>
      <!-- 件数表示 -->
      <div class="mb-4 text-gray-600">
        {{ store.total.toLocaleString() }}件の物件が見つかりました
      </div>

      <!-- グリッド -->
      <div
        v-if="store.hasProperties"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <PropertyCard
          v-for="property in store.properties"
          :key="property.id"
          :property="property"
        />
      </div>

      <!-- 物件がない場合 -->
      <div v-else class="text-center py-12 text-gray-500">
        <UIcon name="i-heroicons-home" class="w-12 h-12 mx-auto mb-4" />
        <p>物件が見つかりませんでした</p>
      </div>

      <!-- ページネーション -->
      <div v-if="store.totalPages > 1" class="flex justify-center mt-8">
        <UPagination
          :model-value="store.page"
          :total="store.total"
          :page-count="store.perPage"
          @update:model-value="handlePageChange"
        />
      </div>
    </template>
  </div>
</template>
