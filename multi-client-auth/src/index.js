import Fastify from 'fastify'
import env from './env.js'
import prisma from './db.js'
import hooks from './hooks.js'
import plugins from './plugins.js'

async function main() {
  const fastify = Fastify({ logger: env.log })

  hooks(fastify)
  plugins(fastify)

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