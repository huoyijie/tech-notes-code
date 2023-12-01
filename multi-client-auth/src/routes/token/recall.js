import prisma from '#db'
import tokenUtil from './util.js'

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

  const authToken = await tokenUtil.checkToken(accessToken, refreshToken)

  await prisma.authToken.delete({
    where: { id: authToken.id }
  })

  return {}
}

export default {
  opts,
  handler,
}