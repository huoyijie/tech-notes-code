import prisma from '#db'
import { ClientError } from '#errors'
import util from '#util'
import tokenUtil from './util.js'

const opts = {
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

async function handler(request, reply) {
  const { appId, appSecret, email, password } = request.body
  const app = await prisma.app.findUnique({
    where: {
      id: appId,
    },
  })

  if (app == null) {
    throw new ClientError(...util.errorCode(request, 'InvalidAppId'))
  }

  if (app.secret != util.sha256(appSecret)) {
    throw new ClientError(...util.errorCode(request, 'InvalidAppSecret'))
  }

  const prismaAccount = app.id == 1 ? prisma.employee : prisma.user

  const account = await prismaAccount.findUnique({
    where: { email }
  })

  if (account == null || !account.active || !await util.comparePasswords(password, account.password)) {
    throw new ClientError(...util.errorCode(request, 'InvalidEmailOrPassword'))
  }

  return await tokenUtil.newToken(appId, account)
}

export default {
  opts,
  handler,
}