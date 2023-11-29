import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import { comparePasswords, sha256 } from './util.js'
import { ClientError } from './errors.js'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

dotenv.config()
const secretKey = sha256(process.env.SECRET_KEY)

const prisma = new PrismaClient()
const fastify = Fastify({
  logger: true
})

fastify.addHook('onError', (request, reply, error, done) => {
  const { statusCode, code, message } = error
  reply.status(statusCode).send({ statusCode, code, error: message })
  done()
})

fastify.register((app, _, done) => {
  // curl -X POST -d '{"appId":1, "appSecret":"123456", "email":"huoyijie@huoyijie.cn", "password":"12345678"}' -H 'Content-Type: application/json' http://127.0.0.1:3000/api/signin
  app.post(
    '/signin',
    {
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
    },
    async (request, reply) => {
      const { appId, appSecret, email, password } = request.body
      const app = await prisma.app.findUnique({
        where: {
          id: appId,
        },
      })

      if (app == null) {
        throw new ClientError('invalid.appId')
      }

      if (app.secret != sha256(appSecret)) {
        throw new ClientError('invalid.appSecret')
      }

      const prismaAccount = app.id == 1 ? prisma.employee : prisma.user

      const account = await prismaAccount.findUnique({
        where: { email }
      })

      if (account == null || !await comparePasswords(password, account.password)) {
        throw new ClientError('invalid.emailOrPassword')
      }

      const accessToken = jwt.sign(
        {
          appId,
          accountId: account.id,
          email
        },
        secretKey,
        { expiresIn: '2h' })

      const refreshToken = crypto.randomBytes(16).toString('base64url')

      await prisma.authToken.create({
        data: {
          accessToken,
          refreshToken,
          appId,
          accountId: account.id,
        }
      })

      return { access_token: accessToken, token_type: 'Bearer', expires_in: 7200, refresh_token: refreshToken }
    })

  done()
}, { prefix: '/api' })

try {
  await fastify.listen({ port: process.env.PORT || 3000 })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}