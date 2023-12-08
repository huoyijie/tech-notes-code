import tokenUtil from './token/util.js'

export default {
  verifyToken(appId) {
    return async (request, reply) => {
      await tokenUtil.verifyToken(request, appId)
    }
  }
}