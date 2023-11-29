import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'

const prisma = new PrismaClient()
const fastify = Fastify({
  logger: true
})

fastify.register((app, _, done) => {
  app.get('/', async (request, reply) => {
    return { hello: 'world' }
  })

  done()
}, { prefix: '/api' })

try {
  await fastify.listen({ port: 3000 })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}