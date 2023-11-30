import adminRoutes from './routes/adminRoutes.js'
import authRoutes from './routes/authRoutes.js'

export default {
  prefixApi(fastify) {
    fastify.register(
      (apiFastify, _, done) => {
        authRoutes(apiFastify)
        this.prefixAdmin(apiFastify)
        done()
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
  }
}