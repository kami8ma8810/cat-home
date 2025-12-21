<script setup lang="ts">
useHead({
  title: 'cat-home - 猫と暮らせる賃貸を探そう',
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- ヒーローセクション -->
    <section class="flex-1 flex items-center justify-center bg-gradient-to-b from-primary-50 to-white">
      <div class="container mx-auto px-4 py-16 text-center">
        <h1 class="text-4xl md:text-6xl font-bold mb-6 flex items-center justify-center gap-3">
          <UIcon name="i-lucide-cat" class="size-12 md:size-16" />
          cat-home
        </h1>
        <p class="text-xl md:text-2xl text-gray-600 mb-8">
          猫と暮らせる賃貸物件を探そう
        </p>
        <p class="text-gray-500 mb-8 max-w-2xl mx-auto">
          日本全国の猫飼育可能な賃貸物件をアーカイブ。
          あなたと猫ちゃんにぴったりのお部屋を見つけましょう。
        </p>
        <NuxtLink to="/properties">
          <UButton size="xl" class="px-8">
            物件を探す
          </UButton>
        </NuxtLink>
      </div>
    </section>

    <!-- フィーチャーセクション -->
    <section class="py-16 bg-gray-50">
      <div class="container mx-auto px-4">
        <h2 class="text-2xl font-bold text-center mb-12">
          cat-home の特徴
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <UCard>
            <template #header>
              <div class="flex justify-center py-4">
              <UIcon name="i-heroicons-home" class="size-10 text-primary" />
            </div>
            </template>
            <h3 class="font-bold text-lg mb-2 text-center">豊富な物件データ</h3>
            <p class="text-gray-600 text-center">
              SUUMO などの大手サイトから猫飼育可能な物件を自動収集
            </p>
          </UCard>
          <UCard>
            <template #header>
              <div class="flex justify-center py-4">
              <UIcon name="i-heroicons-magnifying-glass" class="size-10 text-primary" />
            </div>
            </template>
            <h3 class="font-bold text-lg mb-2 text-center">かんたん検索</h3>
            <p class="text-gray-600 text-center">
              エリア・賃料・間取りなどで絞り込み検索が可能
            </p>
          </UCard>
          <UCard>
            <template #header>
              <div class="flex justify-center py-4">
              <UIcon name="i-heroicons-calendar-days" class="size-10 text-primary" />
            </div>
            </template>
            <h3 class="font-bold text-lg mb-2 text-center">毎日更新</h3>
            <p class="text-gray-600 text-center">
              最新の物件情報を毎日自動で更新
            </p>
          </UCard>
        </div>
      </div>
    </section>

    <!-- フッター -->
    <footer class="py-8 bg-gray-100">
      <div class="container mx-auto px-4 text-center text-gray-500">
        <p>&copy; 2024 cat-home. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>
