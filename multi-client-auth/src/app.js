import Fastify from 'fastify'
import plugins from '#plugins'

export default function (opts = {}) {
  const fastify = Fastify(opts)

  fastify.decorateRequest('account', null)
  plugins.prefixApi(fastify)

  return fastify
}