import Fastify from 'fastify'
import env from './env.js'
import authRoutes from './routes/authRoutes.js'
import prisma from './db.js'

async function main() {
  const fastify = Fastify({ logger: env.log })

  fastify.addHook('onError', (request, reply, error, done) => {
    const { statusCode, code, message } = error
    reply.status(statusCode).send({ statusCode, code, error: message })
    done()
  })

  fastify.register((apiFastify, _, done) => {
    authRoutes(apiFastify)
    done()
  }, { prefix: '/api' })

  await fastify.listen({ port: env.port })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })