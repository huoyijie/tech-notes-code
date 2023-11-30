import jwt from 'jsonwebtoken'
import env from './env.js'
import prisma from './db.js'
import util from './util.js'

export default {
  verifyToken(appId) {
    return async (request, reply) => {
      try {
        const { authorization } = request.headers
        let accessToken
        if (!authorization || !(accessToken = authorization.replace('Bearer ', ''))) {
          throw new Error('Missing access_token')
        }

        request.account = jwt.verify(accessToken, env.secretKey)

        if (request.account.appId != appId) {
          throw new Error('Invalid accessToken with wrong appId')
        }

        const authToken = await prisma.authToken.findUnique({
          where: { accessToken: util.sha256(accessToken) }
        })
        if (authToken == null) {
          throw new Error('Recalled accessToken')
        }
      } catch (error) {
        console.log(error)
        reply.code(401).send({ error: 'Unauthorized' })
      }
    }
  }
}