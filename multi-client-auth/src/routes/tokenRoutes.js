import grant from './token/grant.js'
import recall from './token/recall.js'
import refresh from './token/refresh.js'

export default function (fastify) {
  // curl -X POST -d '{"appId":1, "appSecret":"123456", "email":"huoyijie@huoyijie.cn", "password":"12345678"}' -H 'Content-Type: application/json' http://127.0.0.1:3000/api/token/grant

  // curl -X POST -d '{"appId":2, "appSecret":"654321", "email":"huoyijie@huoyijie.cn", "password":"12345678"}' -H 'Content-Type: application/json' http://127.0.0.1:3000/api/token/grant
  fastify.post(
    '/grant',
    grant.opts,
    grant.handler,
  )

  fastify.post(
    '/refresh',
    refresh.opts,
    refresh.handler,
  )

  fastify.post(
    '/recall',
    recall.opts,
    recall.handler,
  )
}