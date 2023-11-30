import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import env from '../../env.js'
import prisma from '../../db.js'
import util from '../../util.js'

export default async function (appId, account) {
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
}