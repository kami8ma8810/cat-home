// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-12-21',
  devtools: { enabled: true },

  // Cloudflare Pages 用プリセット
  nitro: {
    preset: 'cloudflare-pages',
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@nuxtjs/sitemap',
  ],

  // サイトマップ設定
  site: {
    url: 'https://cat-home.pages.dev',
  },

  css: ['~/assets/css/main.css'],

  // SEO デフォルト設定
  app: {
    head: {
      htmlAttrs: { lang: 'ja' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'cat-home - 猫と暮らせる賃貸を探そう',
      meta: [
        { name: 'description', content: '日本全国の猫飼育可能な賃貸物件を検索できるサービス。SUUMOなどから毎日自動収集した物件データで、あなたと猫ちゃんにぴったりのお部屋を見つけましょう。' },
        { name: 'format-detection', content: 'telephone=no' },
        // OGP
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'cat-home' },
        { property: 'og:locale', content: 'ja_JP' },
        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/properties', '/properties/*'],
    },
  },
})
