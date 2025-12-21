<script setup lang="ts">
import type { NuxtError } from '#app'

interface Props {
  error: NuxtError
}

const props = defineProps<Props>()

const handleError = () => clearError({ redirect: '/' })

const is404 = computed(() => props.error.statusCode === 404)

const title = computed(() => {
  if (is404.value) return 'ページが見つかりません'
  return 'エラーが発生しました'
})

const description = computed(() => {
  if (is404.value) {
    return 'お探しのページは存在しないか、移動した可能性があります。'
  }
  return 'ご不便をおかけして申し訳ございません。しばらく時間をおいてから再度お試しください。'
})

useHead({
  title: `${title.value} | cat-home`,
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center px-4 py-16 max-w-md">
      <!-- エラーコード -->
      <p class="text-6xl font-bold text-primary mb-4">
        {{ error.statusCode }}
      </p>

      <!-- アイコン -->
      <div class="mb-6">
        <UIcon
          :name="is404 ? 'i-heroicons-map' : 'i-heroicons-exclamation-triangle'"
          class="w-16 h-16 mx-auto text-gray-400"
          aria-hidden="true"
        />
      </div>

      <!-- タイトル -->
      <h1 class="text-2xl font-bold mb-4">
        {{ title }}
      </h1>

      <!-- 説明 -->
      <p class="text-gray-600 mb-8">
        {{ description }}
      </p>

      <!-- ボタン -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <UButton size="lg" @click="handleError">
          トップページへ戻る
        </UButton>
        <NuxtLink to="/properties">
          <UButton size="lg" variant="outline">
            物件を探す
          </UButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
