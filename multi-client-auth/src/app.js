import Fastify from 'fastify'
import plugins from '#plugins'
import enforcer from '#casbin'

export default function (opts = {}) {
  const fastify = Fastify(opts)

  fastify.decorateRequest('account', null)
  fastify.decorateRequest('enforcer', enforcer)
  plugins.prefixApi(fastify)
  plugins.configI18n(fastify)

  return fastify
}