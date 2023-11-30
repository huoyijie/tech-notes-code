import adminRoutes from './routes/adminRoutes.js'
import authRoutes from './routes/authRoutes.js'
import siteRoutes from './routes/siteRoutes.js'

export default {
  prefixApi(fastify) {
    fastify.register(
      (apiFastify, _, done) => {
        authRoutes(apiFastify)
        this.prefixAdmin(apiFastify)
        done()
        this.prefixSite(apiFastify)
      },
      { prefix: '/api' },
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