import jwt from 'jsonwebtoken'
import env from './env.js'

export default {
  verifyToken: (request, reply, done) => {
    try {
      const { authorization } = request.headers
      let accessToken
      if (!authorization || !(accessToken = authorization.replace('Bearer ', ''))) {
        throw new Error('Missing access_token')
      }

      request.account = jwt.verify(accessToken, env.secretKey)

      done()
    } catch (error) {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  }
}