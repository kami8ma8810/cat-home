// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-12-21',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4,
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  modules: [
    '@nuxt/eslint',
    '@nuxtjs/supabase',
  ],

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/properties', '/properties/*'],
    },
  },
})
