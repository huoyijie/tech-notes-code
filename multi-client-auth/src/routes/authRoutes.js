import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { ClientError } from '../errors.js'
import prisma from '../db.js'
import util from '../util.js'
import env from '../env.js'

const signinOpts = {
  schema: {
    body: {
      type: 'object',
      required: ['appId', 'appSecret', 'email', 'password'],
      properties: {
        appId: { type: 'number', minimum: 1 },
        appSecret: { type: 'string', minLength: 1 },
        email: {
          type: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
        },
        password: { type: 'string', minLength: 6 }
      },
    }
  }
}

async function signin(request, reply) {
  const { appId, appSecret, email, password } = request.body
  const app = await prisma.app.findUnique({
    where: {
      id: appId,
    },
  })

  if (app == null) {
    throw new ClientError('invalid.appId')
  }

  if (app.secret != util.sha256(appSecret)) {
    throw new ClientError('invalid.appSecret')
  }

  const prismaAccount = app.id == 1 ? prisma.employee : prisma.user

  const account = await prismaAccount.findUnique({
    where: { email }
  })

  if (account == null || !await util.comparePasswords(password, account.password)) {
    throw new ClientError('invalid.emailOrPassword')
  }

  const accessToken = jwt.sign(
    {
      appId,
      accountId: account.id,
      email
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

export default function (fastify) {
  // curl -X POST -d '{"appId":1, "appSecret":"123456", "email":"huoyijie@huoyijie.cn", "password":"12345678"}' -H 'Content-Type: application/json' http://127.0.0.1:3000/api/signin

  // curl -X POST -d '{"appId":2, "appSecret":"654321", "email":"huoyijie@huoyijie.cn", "password":"12345678"}' -H 'Content-Type: application/json' http://127.0.0.1:3000/api/signin
  fastify.post(
    '/signin',
    signinOpts,
    signin,
  )
}