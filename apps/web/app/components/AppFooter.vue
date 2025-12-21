<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-gray-200 bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- ロゴ -->
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-cat" class="w-6 h-6 text-gray-400" aria-hidden="true" />
          <span class="text-gray-500">cat-home</span>
        </div>

        <!-- リンク -->
        <nav class="flex items-center gap-6 text-sm text-gray-500" aria-label="フッターナビゲーション">
          <NuxtLink to="/about" class="hover:text-gray-700">
            サービスについて
          </NuxtLink>
          <NuxtLink to="/terms" class="hover:text-gray-700">
            利用規約
          </NuxtLink>
          <NuxtLink to="/privacy" class="hover:text-gray-700">
            プライバシーポリシー
          </NuxtLink>
        </nav>

        <!-- コピーライト -->
        <p class="text-sm text-gray-400">
          &copy; {{ currentYear }} cat-home
        </p>
      </div>
    </div>
  </footer>
</template>
