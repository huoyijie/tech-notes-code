import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import env from '#env'
import prisma from '#db'
import util from '#util'
import { ClientError } from '#errors'

export default {
  async newToken(appId, account) {
    const accessToken = jwt.sign(
      {
        appId,
        accountId: account.id,
        email: account.email,
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

  async checkToken(accessToken, refreshToken) {
    const authToken = await prisma.authToken.findUnique({
      where: { refreshToken }
    })

    if (authToken == null) {
      throw new ClientError('invalid.refreshToken')
    }

    if (util.sha256(accessToken) != authToken.accessToken) {
      throw new ClientError('invalid.accessToken')
    }

    return authToken
  },
}