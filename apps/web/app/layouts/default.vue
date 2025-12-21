<template>
  <div class="min-h-screen flex flex-col">
    <!-- スキップリンク -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded"
    >
      メインコンテンツへスキップ
    </a>

    <AppHeader />
    <main id="main-content" class="flex-1" tabindex="-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
