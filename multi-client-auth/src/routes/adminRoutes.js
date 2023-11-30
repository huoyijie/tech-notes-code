import hooks from '../hooks.js'

function handler(request, reply) {
  return { hello: request.account.email }
}

export default function (fastify) {
  fastify.addHook('preHandler', hooks.verifyToken)

  fastify.get(
    '/',
    handler,
  )
}