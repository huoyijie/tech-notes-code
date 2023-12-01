import jwt from 'jsonwebtoken'
import env from '#env'
import prisma from '#db'
import util from '#util'
import { ClientError } from '#errors'

export default {
  verifyToken(appId) {
    return async (request, reply) => {
      try {
        const { authorization } = request.headers
        let accessToken
        if (!authorization || !(accessToken = authorization.replace('Bearer ', ''))) {
          throw new Error('Missing access_token')
        }

        const decoded = jwt.verify(accessToken, env.secretKey)

        if (decoded.appId != appId) {
          throw new Error('Invalid accessToken with wrong appId')
        }

        const authToken = await prisma.authToken.findUnique({
          where: { accessToken: util.sha256(accessToken) }
        })
        if (authToken == null) {
          throw new Error('Recalled accessToken')
        }

        const prismaAccount = appId == 1 ? prisma.employee : prisma.user

        const account = await prismaAccount.findUnique({
          where: { id: authToken.accountId }
        })

        if (account == null || !account.active) {
          throw new Error('invalid.account')
        }

        delete account.password
        request.account = account
      } catch (error) {
        throw new ClientError('Unauthorized', 401)
      }
    }
  }
}