import prisma from '#db'
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
  const authToken = await tokenUtil.checkToken(request)

  await prisma.authToken.delete({
    where: { id: authToken.id }
  })

  return {}
}

export default {
  opts,
  handler,
}