import tokenRoutes from './routes/tokenRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import siteRoutes from './routes/siteRoutes.js'

export default {
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