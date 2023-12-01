import hooks from '#hooks'

function handler(request, reply) {
  return { hello: 'admin', email: request.account.email }
}

export default function (fastify) {
  fastify.addHook('preHandler', hooks.verifyToken(1))

  fastify.get(
    '/',
    handler,
  )
}