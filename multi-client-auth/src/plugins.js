import tokenRoutes from './routes/tokenRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import siteRoutes from './routes/siteRoutes.js'
import i18next from 'i18next'
import i18nextMiddleware from 'i18next-http-middleware'
import i18nextFsBackend from 'i18next-fs-backend'
import { fileURLToPath } from 'url'

export default {
  configI18n(fastify) {
    i18next
      .use(i18nextMiddleware.LanguageDetector)
      .use(i18nextFsBackend)
      .init({
        backend: {
          loadPath: fileURLToPath(new URL('./locales/{{lng}}/{{ns}}.json', import.meta.url)),
        },
        lng: 'zh-CN',
        fallbackLng: 'en',
        supportedLngs: ['zh-CN', 'en'],
        preload: ['zh-CN', 'en'],
        saveMissing: true,
      })
    fastify.register(i18nextMiddleware.plugin, { i18next })
  },

  prefixApi(fastify) {
    fastify.register(
      (apiFastify, _, done) => {
        this.prefixToken(apiFastify)
        this.prefixAdmin(apiFastify)
        this.prefixSite(apiFastify)
        done()
      },
      { prefix: '/api' },
    )
  },

  prefixToken(fastify) {
    fastify.register(
      (tokenFastify, _, done) => {
        tokenRoutes(tokenFastify)
        done()
      },
      { prefix: '/token' },
    )
  },

  prefixAdmin(fastify) {
    fastify.register(
      (adminFastify, _, done) => {
        adminRoutes(adminFastify)
        done()
      },
      { prefix: '/admin' },
    )
  },

  prefixSite(fastify) {
    fastify.register(
      (siteFastify, _, done) => {
        siteRoutes(siteFastify)
        done()
      },
      { prefix: '/site' },
    )
  },
}