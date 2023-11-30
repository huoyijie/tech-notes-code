import prisma from '../../db.js'
import { ClientError } from '../../errors.js'
import util from '../../util.js'
import newToken from './newToken.js'

const opts = {
  schema: {
    body: {
      type: 'object',
      required: ['accessToken', 'refreshToken'],
      properties: {
        accessToken: { type: 'string', minimum: 1 },
        refreshToken: { type: 'string', minimum: 1 },
      },
    }
  }
}

const handler = async (request, reply) => {
  const { accessToken, refreshToken } = request.body

  const authToken = await prisma.authToken.findUnique({
    where: { refreshToken }
  })

  if (authToken == null) {
    throw new ClientError('invalid.refreshToken')
  }

  if (util.sha256(accessToken) != authToken.accessToken) {
    throw new ClientError('invalid.accessToken')
  }

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

  return await newToken(authToken.appId, account)
}

export default {
  opts,
  handler,
}