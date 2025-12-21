<script setup lang="ts">
useHead({
  title: 'サービスについて - cat-home',
})
</script>

<template>
  <div class="container mx-auto px-4 py-16">
    <h1 class="text-3xl font-bold mb-8">サービスについて</h1>

    <div class="prose prose-gray max-w-none">
      <section class="mb-12">
        <h2 class="text-2xl font-bold mb-4">cat-home とは</h2>
        <p class="text-gray-600 mb-4">
          cat-home は、日本全国の猫飼育可能な賃貸物件をアーカイブ・検索できるサービスです。
          大手不動産サイトから猫飼育可能な物件情報を自動収集し、あなたと猫ちゃんにぴったりのお部屋探しをサポートします。
        </p>
      </section>

      <section class="mb-12">
        <h2 class="text-2xl font-bold mb-4">特徴</h2>
        <ul class="list-disc list-inside text-gray-600 space-y-2">
          <li>猫飼育可能な物件に特化した検索</li>
          <li>毎日自動更新で最新情報を提供</li>
          <li>エリア・賃料・間取りなど多彩な条件で絞り込み</li>
        </ul>
      </section>

      <section>
        <h2 class="text-2xl font-bold mb-4">お問い合わせ</h2>
        <p class="text-gray-600">
          サービスに関するお問い合わせは、準備中です。
        </p>
      </section>
    </div>
  </div>
</template>
