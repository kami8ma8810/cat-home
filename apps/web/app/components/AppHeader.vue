<script setup lang="ts">
const links = [
  { label: 'ホーム', to: '/' },
  { label: '物件を探す', to: '/properties' },
]
</script>

<template>
  <header class="border-b border-gray-200 bg-white">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- ロゴ -->
        <NuxtLink
          to="/"
          class="flex items-center gap-2"
          aria-label="cat-home ホームへ戻る"
        >
          <UIcon name="i-lucide-cat" class="w-8 h-8 text-primary" aria-hidden="true" />
          <span class="font-bold text-xl">cat-home</span>
        </NuxtLink>

        <!-- ナビゲーション -->
        <nav class="flex items-center gap-6" aria-label="メインナビゲーション">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="text-gray-600 hover:text-primary transition-colors"
            active-class="text-primary font-medium"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
      </div>
    </div>
  </header>
</template>
