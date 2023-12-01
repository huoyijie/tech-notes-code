import prisma from '#db'
import { ClientError } from '#errors'
import tokenUtil from './util.js'

const opts = {
  schema: {
    body: {
      type: 'object',
      required: ['accessToken', 'refreshToken'],
      properties: {
        accessToken: { type: 'string', minLength: 1 },
        refreshToken: { type: 'string', minLength: 1 },
      },
    }
  }
}

const handler = async (request, reply) => {
  const { accessToken, refreshToken } = request.body

  const authToken = await tokenUtil.checkToken(accessToken, refreshToken)

  const prismaAccount = authToken.appId == 1 ? prisma.employee : prisma.user

  const account = await prismaAccount.findUnique({
    where: { id: authToken.accountId }
  })

  if (account == null) {
    throw new ClientError('invalid.account')
  }

  await prisma.authToken.delete({
    where: { id: authToken.id }
  })

  return await tokenUtil.newToken(authToken.appId, account)
}

export default {
  opts,
  handler,
}