import hooks from '#hooks'

function handler(request, reply) {
  return { hello: 'site', email: request.account.email }
}

export default function (fastify) {
  fastify.addHook('preHandler', hooks.verifyToken(2))

  fastify.get(
    '/',
    handler,
  )
}