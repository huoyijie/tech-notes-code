import Fastify from 'fastify'
import plugins from '#plugins'
import enforcer from '#casbin'

export default function (opts = {}) {
  const fastify = Fastify(opts)

  fastify.addHook('onRequest', (request, reply, done) => {
    request.account = null
    request.enforcer = enforcer
    done()
  })

  plugins.configI18n(fastify)
  plugins.prefixApi(fastify)

  return fastify
}