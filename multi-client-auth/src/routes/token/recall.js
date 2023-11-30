import prisma from '../../db.js'
import { ClientError } from '../../errors.js'
import util from '../../util.js'

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

  await prisma.authToken.delete({
    where: { id: authToken.id }
  })

  return {}
}

export default {
  opts,
  handler,
}