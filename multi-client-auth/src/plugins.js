import authRoutes from "./routes/authRoutes.js"

export default function (fastify) {
  fastify.register(
    (apiFastify, _, done) => {
      authRoutes(apiFastify)
      done()
    },
    { prefix: '/api' },
  )
}