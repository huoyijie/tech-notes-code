import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import env from '#env'
import prisma from '#db'
import util from '#util'
import { ClientError } from '#errors'

class TokenError extends Error {
  constructor(message) {
    super(message)
  }
}

export default {
  async newToken(appId, account) {
    const accessToken = jwt.sign(
      {
        appId,
        accountId: account.id,
        email: account.email,
        rand: new Date().getMilliseconds(),
      },
      env.secretKey,
      { expiresIn: `${env.accessTokenExpires}h` })

    const refreshToken = crypto.randomBytes(32).toString('base64url')

    await prisma.authToken.create({
      data: {
        accessToken: util.sha256(accessToken),
        refreshToken,
        appId,
        accountId: account.id,
      }
    })

    return {
      access_token: accessToken, token_type: 'Bearer',
      expires_in: env.accessTokenExpires * 60 * 60,
      refresh_token: refreshToken
    }
  },

  async verifyToken(request, appId) {
    try {
      const { authorization } = request.headers
      let accessToken
      if (!authorization || !(accessToken = authorization.replace('Bearer ', ''))) {
        throw new TokenError('TokenMissed')
      }

      const decoded = jwt.verify(accessToken, env.secretKey)

      if (decoded.appId != appId) {
        throw new TokenError('InvalidAppId')
      }

      const authToken = await prisma.authToken.findUnique({
        where: { accessToken: util.sha256(accessToken) }
      })
      if (authToken == null) {
        throw new TokenError('TokenRecalled')
      }

      const prismaAccount = appId == 1 ? prisma.employee : prisma.user

      const account = await prismaAccount.findUnique({
        where: { id: authToken.accountId }
      })

      if (account == null || !account.active) {
        throw new TokenError('InvalidAccount')
      }

      delete account.password
      request.account = account
    } catch (error) {
      if (error instanceof TokenError) {
        const { message } = error
        throw new ClientError(request.t(message), 401)
      } else if (error instanceof jwt.TokenExpiredError) {
        throw new ClientError(request.t('TokenExpired'), 401)
      } else {
        throw new ClientError(request.t('Unauthorized'), 401)
      }
    }
  },

  async checkToken(request) {
    const { accessToken, refreshToken } = request.body

    const authToken = await prisma.authToken.findUnique({
      where: { refreshToken }
    })

    if (authToken == null) {
      throw new ClientError(request.t('InvalidRefreshToken'))
    }

    if (util.sha256(accessToken) != authToken.accessToken) {
      throw new ClientError(request.t('InvalidAccessToken'))
    }

    return authToken
  },
}