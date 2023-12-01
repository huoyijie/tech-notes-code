import Fastify from 'fastify'
import env from '#env'
import prisma from '#db'
import plugins from '#plugins'

async function main() {
  const fastify = Fastify({ logger: env.log })
  fastify.decorateRequest('account', null)

  plugins.prefixApi(fastify)
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